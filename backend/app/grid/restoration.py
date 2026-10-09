import networkx as nx
from typing import Dict, Any, List, Optional
from backend.app.grid.graph_model import GridGraph
from backend.app.grid.cost import compute_composite_cost
from backend.app.core.config import settings

def find_restoration_candidates(
    grid: GridGraph,
    island: Dict[str, Any],
    k: int = 5,
    alpha: float = settings.GRID_ALPHA_RESISTANCE,
    beta: float = settings.GRID_BETA_LOAD_RATIO,
    gamma: float = settings.GRID_GAMMA_DISTANCE
) -> List[Dict[str, Any]]:
    """
    Evaluates restoration paths from energized substations to an electrical island
    using Dijkstra's shortest path algorithm over the composite impedance/loading cost function.
    
    Produces up to k candidate paths and validates thermal/substation feasibility.
    """
    g = grid.graph
    island_nodes = set(island["nodes"])
    total_added_load = island["lost_load_mw"]
    active_substations = grid.get_active_substations()

    # Precompute min/max bounds for normalization across operational/tie edges
    resistances = []
    distances = []
    for _, _, d in g.edges(data=True):
        if d.get("status") in ["OPERATIONAL", "OPEN"]:
            resistances.append(d.get("resistance_ohms", 0.1))
            distances.append(d.get("distance_km", 1.0))
            
    r_min = min(resistances) if resistances else 0.01
    r_max = max(resistances) if resistances else 1.0
    d_min = min(distances) if distances else 0.1
    d_max = max(distances) if distances else 5.0

    # Build routing graph where:
    # 1. Faulted & unavailable lines are strictly excluded
    # 2. Operational lines are traversable
    # 3. Normally-open tie switches are traversable (with their composite cost)
    routing_graph = nx.Graph()
    for n, data in g.nodes(data=True):
        routing_graph.add_node(n, **data)

    cost_breakdowns: Dict[tuple[str, str], Dict[str, float]] = {}

    for u, v, data in g.edges(data=True):
        status = data.get("status")
        if status not in ["OPERATIONAL", "OPEN"]:
            continue  # Exclude FAULTED and UNAVAILABLE
            
        edge_cost, breakdown = compute_composite_cost(
            resistance=data.get("resistance_ohms", 0.1),
            current_load=data.get("current_load_mw", 0.0),
            max_capacity=data.get("max_capacity_mw", 10.0),
            distance_km=data.get("distance_km", 1.0),
            r_min=r_min,
            r_max=r_max,
            d_min=d_min,
            d_max=d_max,
            alpha=alpha,
            beta=beta,
            gamma=gamma
        )
        cost_breakdowns[(u, v)] = breakdown
        cost_breakdowns[(v, u)] = breakdown
        routing_graph.add_edge(u, v, weight=edge_cost, **data)

    boundary_ties = island.get("boundary_tie_edges", [])
    raw_candidates = []

    # Explore paths from each active substation through each boundary tie switch
    for tie in boundary_ties:
        tie_code = tie["edge_code"]
        energized_entry = tie["energized_side_node"]
        island_entry = tie["island_node"]

        # Only evaluate tie switches that are OPEN (closable) and present in routing graph
        if tie.get("status") != "OPEN" or not routing_graph.has_edge(energized_entry, island_entry):
            continue

        for sub in active_substations:
            if not nx.has_path(routing_graph, sub, energized_entry):
                continue
                
            try:
                # Find shortest path from energized substation to boundary node
                sub_to_entry = nx.dijkstra_path(routing_graph, sub, energized_entry, weight="weight")
                # Combine path: Substation -> ... -> Boundary Node -> (Tie Switch) -> Island Entry
                full_path = sub_to_entry + [island_entry]
                
                # Deduplicate consecutive nodes
                dedup_path = []
                for n in full_path:
                    if not dedup_path or dedup_path[-1] != n:
                        dedup_path.append(n)
                        
                raw_candidates.append({
                    "substation": sub,
                    "tie_edge_code": tie_code,
                    "path_nodes": dedup_path
                })
            except nx.NetworkXNoPath:
                continue

    # Deduplicate candidates by path nodes
    unique_candidates = []
    seen_paths = set()
    for c in raw_candidates:
        path_key = tuple(c["path_nodes"])
        if path_key not in seen_paths:
            seen_paths.add(path_key)
            unique_candidates.append(c)

    # Evaluate each candidate's feasibility & calculate exact composite path cost
    evaluated_candidates = []
    for cand in unique_candidates[:k]:
        path = cand["path_nodes"]
        tie_edge_code = cand["tie_edge_code"]
        sub_code = cand["substation"]

        path_edges = []
        path_cost = 0.0
        edge_margins = []
        is_feasible = True
        rejection_reason = None
        composite_breakdowns = []

        # 1. Check Substation reserve capacity
        sub_node = g.nodes[sub_code]
        sub_max_cap = sub_node.get("max_capacity_mw", 40.0)
        sub_curr_supply = sub_node.get("current_supply_mw", 0.0)
        sub_spare_cap = sub_max_cap - sub_curr_supply
        
        if sub_spare_cap < total_added_load:
            is_feasible = False
            rejection_reason = (
                f"Substation '{sub_code}' reserve capacity ({round(sub_spare_cap, 2)} MW) "
                f"is insufficient for island load ({round(total_added_load, 2)} MW)."
            )

        # 2. Check each edge along the feeding chain
        for i in range(len(path) - 1):
            u, v = path[i], path[i+1]
            edge_data = g.get_edge_data(u, v)
            if not edge_data:
                is_feasible = False
                rejection_reason = f"Missing topological edge between {u} and {v}."
                break
                
            e_code = edge_data.get("edge_code")
            path_edges.append(e_code)
            
            # Sum cost safely from routing_graph
            routing_edge = routing_graph.get_edge_data(u, v, {})
            e_cost = routing_edge.get("weight", 1.0)
            path_cost += e_cost
            composite_breakdowns.append(cost_breakdowns.get((u, v), {}))

            # Capacity margin check
            max_c = edge_data.get("max_capacity_mw", 10.0)
            curr_l = edge_data.get("current_load_mw", 0.0)
            margin = max_c - (curr_l + total_added_load)
            edge_margins.append(margin)

            if is_feasible and margin < 0:
                is_feasible = False
                rejection_reason = (
                    f"Thermal overload on line '{e_code}': current {round(curr_l, 2)} MW + "
                    f"added {round(total_added_load, 2)} MW exceeds max capacity {round(max_c, 2)} MW "
                    f"(margin: {round(margin, 2)} MW)."
                )

        # Aggregate cost breakdown
        avg_breakdown = {
            "norm_resistance": round(sum(b.get("norm_resistance", 0) for b in composite_breakdowns) / max(1, len(composite_breakdowns)), 4),
            "loading_ratio": round(sum(b.get("loading_ratio", 0) for b in composite_breakdowns) / max(1, len(composite_breakdowns)), 4),
            "norm_distance": round(sum(b.get("norm_distance", 0) for b in composite_breakdowns) / max(1, len(composite_breakdowns)), 4),
            "weighted_r": round(sum(b.get("weighted_r", 0) for b in composite_breakdowns), 4),
            "weighted_loading": round(sum(b.get("weighted_loading", 0) for b in composite_breakdowns), 4),
            "weighted_d": round(sum(b.get("weighted_d", 0) for b in composite_breakdowns), 4),
            "total_cost": round(path_cost, 4)
        }

        min_margin = min(edge_margins) if edge_margins else 0.0

        evaluated_candidates.append({
            "path_nodes": path,
            "path_edges": path_edges,
            "tie_edge_code": tie_edge_code,
            "source_substation": sub_code,
            "composite_cost": round(path_cost, 4),
            "feasible": is_feasible,
            "rejection_reason": rejection_reason,
            "capacity_margin_mw": round(min_margin, 3),
            "cost_breakdown": avg_breakdown
        })

    # Sort candidates by feasibility (feasible first), then lowest composite cost
    evaluated_candidates.sort(key=lambda c: (not c["feasible"], c["composite_cost"]))
    return evaluated_candidates


def attempt_partial_restoration(
    grid: GridGraph,
    island: Dict[str, Any],
    candidate_tie_edge_code: str
) -> Dict[str, Any]:
    """
    When full island cannot be energized due to capacity limits,
    attempts partial restoration in descending order of node criticality (5 -> 1).
    Calculates restored vs unserved load honestly.
    """
    g = grid.graph
    island_nodes = island["nodes"]
    
    # Sort nodes by criticality descending, then load ascending
    sorted_nodes = sorted(
        island_nodes,
        key=lambda n: (-g.nodes[n].get("criticality", 1), g.nodes[n].get("load_mw", 0.0))
    )

    tie_data = None
    for _, _, d in g.edges(data=True):
        if d.get("edge_code") == candidate_tie_edge_code:
            tie_data = d
            break

    tie_cap = tie_data.get("max_capacity_mw", 5.0) if tie_data else 5.0
    accumulated_load = 0.0
    restored_nodes = []
    unserved_nodes = []

    for n in sorted_nodes:
        n_load = g.nodes[n].get("load_mw", 0.0)
        if accumulated_load + n_load <= tie_cap:
            accumulated_load += n_load
            restored_nodes.append(n)
        else:
            unserved_nodes.append(n)

    total_island_load = island["lost_load_mw"]
    unserved_load = total_island_load - accumulated_load

    return {
        "restored_nodes": restored_nodes,
        "unserved_nodes": unserved_nodes,
        "restored_load_mw": round(accumulated_load, 3),
        "unserved_load_mw": round(unserved_load, 3),
        "restoration_pct": round((accumulated_load / total_island_load * 100.0) if total_island_load > 0 else 100.0, 1),
        "restored_critical": [n for n in restored_nodes if g.nodes[n].get("criticality", 1) >= 4],
        "unserved_critical": [n for n in unserved_nodes if g.nodes[n].get("criticality", 1) >= 4]
    }
