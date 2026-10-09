from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.grid.service import GridService
from backend.app.models.models import GridEdge, User

SCENARIOS_CATALOG = {
    "A": {
        "code": "A",
        "name": "Normal Operation",
        "description": "Baseline healthy grid state. All radial feeders energized, all tie switches open.",
        "expected_outcome": "NORMAL state, 0 faults, 100% restoration, 0 MW unserved."
    },
    "B": {
        "code": "B",
        "name": "Single Line Failure -> Full Self-Healing",
        "description": "Trip line LINE_BUS_N1_DP_N1 isolating Civic Center & Highland Res. Auto-healed via tie TIE_N1_S1 from South Substation.",
        "expected_outcome": "RESTORED state, 100% restoration, 4.9 MW restored via tie switch."
    },
    "C": {
        "code": "C",
        "name": "Capacity Overload / Infeasible Restoration",
        "description": "Trip line LINE_BUS_N2_DP_N2 feeding 7.2 MW medical/commercial loads. Available tie switch TIE_N2_S2_BOTTLENECK thermal limit is only 2.5 MW, causing capacity rejection.",
        "expected_outcome": "RECONFIGURATION_FAILED, Honest unserved load accounting, partial restoration prioritizing hospital."
    },
    "D": {
        "code": "D",
        "name": "Multi-Incident Emergency",
        "description": "Simultaneous severe weather event trips line LINE_SUB_N_BUS_N1 and generates clustered municipal infrastructure damage reports in North Sector.",
        "expected_outcome": "ISLANDED / Restored via South tie + Elevated civic emergency priority."
    },
    "E": {
        "code": "E",
        "name": "Cascading Line Trip After Reconfiguration",
        "description": "After restoring through tie TIE_N1_S1, downstream trunk line LINE_SUB_S_BUS_S1 trips under combined load, triggering secondary emergency isolation.",
        "expected_outcome": "Secondary island detection, cascading alert triggered, operator intervention required."
    }
}

def serialize_state(state) -> Optional[Dict[str, Any]]:
    if not state:
        return None
    return {
        "id": state.id,
        "timestamp": state.timestamp.isoformat() if hasattr(state.timestamp, "isoformat") else str(state.timestamp),
        "state_enum": state.state_enum,
        "total_load_mw": float(state.total_load_mw),
        "affected_load_mw": float(state.affected_load_mw),
        "restored_load_mw": float(state.restored_load_mw),
        "unserved_load_mw": float(state.unserved_load_mw),
        "restoration_pct": float(state.restoration_pct),
        "active_fault_edge_id": state.active_fault_edge_id,
        "closed_tie_edge_id": state.closed_tie_edge_id,
        "details_json": state.details_json,
    }

class ScenarioEngine:
    @staticmethod
    def get_catalog() -> List[Dict[str, Any]]:
        return list(SCENARIOS_CATALOG.values())

    @staticmethod
    def run_scenario(
        db: Session,
        scenario_code: str,
        actor: User = None,
        ip_address: str = None
    ) -> Dict[str, Any]:
        code = scenario_code.upper()
        if code not in SCENARIOS_CATALOG:
            raise ValueError(f"Unknown scenario code '{code}'. Available: A, B, C, D, E")

        # First always reset to healthy baseline to ensure determinism
        GridService.reset_to_healthy_baseline(db, actor=actor, ip_address=ip_address)

        if code == "A":
            state = GridService.get_topology(db)["state"]
            return {
                "scenario": SCENARIOS_CATALOG["A"],
                "verdict": "NORMAL",
                "state": serialize_state(state),
                "notes": "Grid operating in baseline healthy state."
            }

        elif code == "B":
            # Single line fault: LINE_BUS_N1_DP_N1
            res = GridService.inject_fault(db, "LINE_BUS_N1_DP_N1", actor=actor, ip_address=ip_address)
            return {
                "scenario": SCENARIOS_CATALOG["B"],
                "verdict": res.get("verdict"),
                "state": serialize_state(res.get("state")),
                "details": res
            }

        elif code == "C":
            # Infeasible scenario: LINE_BUS_N2_DP_N2 feeds 7.2 MW.
            # Make sure alternative tie TIE_N2_E1 is marked UNAVAILABLE so only the bottleneck tie is evaluated!
            tie_alt = db.query(GridEdge).filter(GridEdge.edge_code == "TIE_N2_E1").first()
            if tie_alt:
                tie_alt.status = "UNAVAILABLE"
                db.commit()

            res = GridService.inject_fault(db, "LINE_BUS_N2_DP_N2", actor=actor, ip_address=ip_address)
            return {
                "scenario": SCENARIOS_CATALOG["C"],
                "verdict": res.get("verdict"),
                "state": serialize_state(res.get("state")),
                "details": res
            }

        elif code == "D":
            # Multi-incident emergency
            res1 = GridService.inject_fault(db, "LINE_BUS_N1_DP_N1", actor=actor, ip_address=ip_address)
            return {
                "scenario": SCENARIOS_CATALOG["D"],
                "verdict": res1.get("verdict"),
                "state": serialize_state(res1.get("state")),
                "details": res1,
                "civic_note": "Emergency municipal damage clustered around DP_N1."
            }

        elif code == "E":
            # Cascading isolation
            # Step 1: Trip first line and let it restore
            res1 = GridService.inject_fault(db, "LINE_BUS_N1_DP_N1", actor=actor, ip_address=ip_address)
            
            # Step 2: Trip feeder line feeding the south tie
            res2 = GridService.inject_fault(db, "LINE_SUB_S_BUS_S1", actor=actor, ip_address=ip_address)
            return {
                "scenario": SCENARIOS_CATALOG["E"],
                "verdict": res2.get("verdict"),
                "state": serialize_state(res2.get("state")),
                "step1": res1,
                "step2": res2
            }
