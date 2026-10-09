import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.models import GridNode, GridEdge, GridState, GridEvent, User
from backend.app.grid.graph_model import GridGraph
from backend.app.grid.islanding import detect_islands
from backend.app.grid.restoration import find_restoration_candidates, attempt_partial_restoration
from backend.app.grid.state_machine import GridStateMachine
from backend.app.core.audit import log_audit_event

logger = logging.getLogger("civicgrid.engine")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class GridService:
    @staticmethod
    def get_topology(db: Session) -> Dict[str, Any]:
        grid = GridGraph().build_from_db(db)
        state = GridStateMachine.get_current_state(db)
        islands = detect_islands(grid)

        nodes = db.query(GridNode).all()
        edges = db.query(GridEdge).all()

        return {
            "state": state,
            "nodes": nodes,
            "edges": edges,
            "islands": islands,
            "total_load_mw": grid.total_network_load()
        }

    @staticmethod
    def inject_fault(
        db: Session,
        edge_code: str,
        actor: Optional[User] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes complete fault injection and automated restoration workflow:
        1. Fault line -> FAULTED
        2. Detect islands & isolated loads
        3. Search restoration paths (Dijkstra)
        4. Validate feasibility (thermal & substation reserve)
        5. Reconfigure / Close tie switch or fail honestly
        6. Record state transitions, events, and audit logs.
        """
        edge = db.query(GridEdge).filter(GridEdge.edge_code == edge_code).first()
        if not edge:
            raise ValueError(f"Grid edge with code '{edge_code}' not found.")

        if edge.status == "FAULTED":
            raise ValueError(f"Line '{edge_code}' is already FAULTED.")

        # 1. Fault line
        edge.status = "FAULTED"
        edge.current_load_mw = 0.0
        db.commit()

        src_node = db.query(GridNode).filter(GridNode.id == edge.src_node_id).first()
        dst_node = db.query(GridNode).filter(GridNode.id == edge.dst_node_id).first()
        src_code = src_node.node_code if src_node else "?"
        dst_code = dst_node.node_code if dst_node else "?"

        # Structured log (Section 10)
        logger.info(f"FAULT_INJECTED edge={edge_code} src={src_code} dst={dst_code}")

        log_audit_event(
            db=db,
            actor=actor,
            action="FAULT_INJECTION",
            resource_type="grid_edge",
            resource_id=edge_code,
            result="SUCCESS",
            ip_address=ip_address,
            metadata={"edge_code": edge_code, "src": src_code, "dst": dst_code}
        )

        GridStateMachine.transition_to(
            db=db,
            new_state="FAULT_DETECTED",
            reason=f"Trip detected on line {edge_code} ({src_code} <-> {dst_code})",
            active_fault_edge_id=edge.id
        )

        # 2. Recompute graph & detect islands
        grid = GridGraph().build_from_db(db)
        islands = detect_islands(grid)

        # Update node energization states
        island_node_codes = set()
        for island in islands:
            island_node_codes.update(island["nodes"])

        for n in db.query(GridNode).all():
            if n.node_code in island_node_codes:
                n.is_energized = False
                n.status = "ISOLATED"
            else:
                n.is_energized = True
                n.status = "OPERATIONAL"
        db.commit()

        # If no islands formed (e.g. redundant parallel feeder)
        if not islands:
            logger.info("NO_ISLAND_DETECTED redundant path maintained power supply")
            state = GridStateMachine.transition_to(
                db=db,
                new_state="NORMAL",
                reason=f"Fault on {edge_code} isolated without service loss.",
                affected_load=0.0,
                restored_load=grid.total_network_load(),
                unserved_load=0.0,
                restoration_pct=100.0,
                active_fault_edge_id=edge.id
            )
            return {"status": "FAULT_ISOLATED_NO_ISLAND", "state": state, "islands": []}

        # Island detected!
        primary_island = islands[0]
        lost_load = primary_island["lost_load_mw"]
        logger.info(f"ISLAND_DETECTED nodes={len(primary_island['nodes'])} lost_load={lost_load}MW")

        GridStateMachine.transition_to(
            db=db,
            new_state="ISLANDED",
            reason=f"Electrical island detected: {len(primary_island['nodes'])} nodes isolated, {lost_load} MW unserved.",
            affected_load=lost_load,
            restored_load=0.0,
            unserved_load=lost_load,
            restoration_pct=0.0,
            active_fault_edge_id=edge.id,
            details={"islands": islands}
        )

        # 3. Analyze restoration paths
        GridStateMachine.transition_to(
            db=db,
            new_state="ANALYZING",
            reason="Executing composite cost Dijkstra to evaluate restoration candidates.",
            active_fault_edge_id=edge.id
        )

        candidates = find_restoration_candidates(grid, primary_island, k=5)
        logger.info(f"RESTORATION_SEARCH candidates={len(candidates)}")

        selected_candidate = None
        for c in candidates:
            if c["feasible"]:
                selected_candidate = c
                break

        # 4. Handle Reconfiguration outcome
        if selected_candidate:
            path_str = ">".join(selected_candidate["path_nodes"])
            logger.info(f"RESTORATION_SELECTED path={path_str}")
            logger.info("CAPACITY_CHECK=PASS")

            GridStateMachine.transition_to(
                db=db,
                new_state="RECONFIGURING",
                reason=f"Executing topology switch: closing tie {selected_candidate['tie_edge_code']}.",
                active_fault_edge_id=edge.id
            )

            # Close the tie switch in database
            tie_edge = db.query(GridEdge).filter(GridEdge.edge_code == selected_candidate["tie_edge_code"]).first()
            if tie_edge:
                tie_edge.status = "OPERATIONAL"
                tie_edge.current_load_mw = lost_load
            
            # Re-energize island nodes
            for n in db.query(GridNode).filter(GridNode.node_code.in_(primary_island["nodes"])).all():
                n.is_energized = True
                n.status = "OPERATIONAL"
            db.commit()

            logger.info(f"RESTORATION_COMPLETE restored={lost_load}MW")

            why_details = {
                "affected_nodes": primary_island["nodes"],
                "lost_load_mw": lost_load,
                "candidates_evaluated": candidates,
                "selected_path": selected_candidate,
                "selection_rationale": (
                    f"Selected lowest composite cost ({selected_candidate['composite_cost']}) "
                    f"feasible path via tie switch {selected_candidate['tie_edge_code']}."
                )
            }

            state = GridStateMachine.transition_to(
                db=db,
                new_state="RESTORED",
                reason=f"Restored {lost_load} MW via tie {selected_candidate['tie_edge_code']}.",
                affected_load=lost_load,
                restored_load=lost_load,
                unserved_load=0.0,
                restoration_pct=100.0,
                active_fault_edge_id=edge.id,
                closed_tie_edge_id=tie_edge.id if tie_edge else None,
                details=why_details
            )

            log_audit_event(
                db=db,
                actor=actor,
                action="RESTORATION_SUCCESS",
                resource_type="grid_edge",
                resource_id=selected_candidate["tie_edge_code"],
                result="SUCCESS",
                ip_address=ip_address,
                metadata=why_details
            )

            return {
                "verdict": "RESTORED",
                "state": state,
                "selected_candidate": selected_candidate,
                "candidates": candidates
            }

        else:
            # Capacity check failed or no path!
            logger.info("CAPACITY_CHECK=FAIL")
            
            # Attempt partial restoration if tie switches exist
            partial_result = None
            if primary_island.get("boundary_tie_edges"):
                first_tie = primary_island["boundary_tie_edges"][0]["edge_code"]
                partial_result = attempt_partial_restoration(grid, primary_island, first_tie)

            restored_mw = partial_result["restored_load_mw"] if partial_result else 0.0
            unserved_mw = partial_result["unserved_load_mw"] if partial_result else lost_load
            rest_pct = partial_result["restoration_pct"] if partial_result else 0.0

            why_details = {
                "affected_nodes": primary_island["nodes"],
                "lost_load_mw": lost_load,
                "candidates_evaluated": candidates,
                "selected_path": None,
                "selection_rationale": (
                    "No feasible restoration path available. Candidate paths exceed line thermal "
                    "ratings or substation reserve capacity."
                ),
                "partial_restoration": partial_result
            }

            state = GridStateMachine.transition_to(
                db=db,
                new_state="RECONFIGURATION_FAILED",
                reason="No feasible restoration path available. Thermal limits exceeded.",
                affected_load=lost_load,
                restored_load=restored_mw,
                unserved_load=unserved_mw,
                restoration_pct=rest_pct,
                active_fault_edge_id=edge.id,
                details=why_details
            )

            log_audit_event(
                db=db,
                actor=actor,
                action="RESTORATION_FAILED",
                resource_type="grid_state",
                resource_id=str(state.id),
                result="FAILURE",
                ip_address=ip_address,
                metadata=why_details
            )

            return {
                "verdict": "RECONFIGURATION_FAILED",
                "state": state,
                "candidates": candidates,
                "partial_restoration": partial_result
            }

    @staticmethod
    def reset_to_healthy_baseline(
        db: Session,
        actor: Optional[User] = None,
        ip_address: Optional[str] = None
    ) -> GridState:
        """
        Resets grid to baseline healthy state. Closes all radial lines, opens all tie switches,
        and re-energizes all nodes.
        """
        # Re-energize all nodes
        for node in db.query(GridNode).all():
            node.is_energized = True
            node.status = "OPERATIONAL"

        # Reset edges
        for edge in db.query(GridEdge).all():
            if edge.is_tie_switch:
                edge.status = "OPEN"
                edge.current_load_mw = 0.0
            else:
                edge.status = "OPERATIONAL"

        total_load = sum(n.load_mw for n in db.query(GridNode).all())

        state = GridStateMachine.transition_to(
            db=db,
            new_state="NORMAL",
            reason="Manual grid reset to healthy baseline configuration.",
            total_load=total_load,
            affected_load=0.0,
            restored_load=total_load,
            unserved_load=0.0,
            restoration_pct=100.0,
            active_fault_edge_id=None,
            closed_tie_edge_id=None,
            details={"message": "All radial feeders energized and tie switches open."}
        )

        log_audit_event(
            db=db,
            actor=actor,
            action="GRID_RESET",
            resource_type="grid_state",
            resource_id=str(state.id),
            result="SUCCESS",
            ip_address=ip_address,
            metadata={"status": "NORMAL"}
        )

        return state
