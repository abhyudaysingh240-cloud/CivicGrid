import networkx as nx
from typing import Dict, Any, List
from backend.app.grid.graph_model import GridGraph

def detect_islands(grid: GridGraph) -> List[Dict[str, Any]]:
    """
    Computes electrical islanding across the distribution network.
    
    Excludes FAULTED, UNAVAILABLE, and OPEN (normally-open tie switch) edges.
    Calculates connected components. Any component lacking an energized
    operational SUBSTATION is classified as an unenergized electrical island.
    """
    g = grid.graph
    
    # Build active operational subgraph
    active_graph = nx.Graph()
    for n, data in g.nodes(data=True):
        active_graph.add_node(n, **data)

    for u, v, data in g.edges(data=True):
        # Exclude faulted, unavailable, and currently open tie switches
        if data.get("status") == "OPERATIONAL":
            active_graph.add_edge(u, v, **data)

    components = list(nx.connected_components(active_graph))
    active_substations = set(grid.get_active_substations())
    
    islands = []
    
    # Find all closable tie switches in the full graph
    tie_edges = []
    for u, v, data in g.edges(data=True):
        if data.get("is_tie_switch", False) and data.get("status") == "OPEN":
            tie_edges.append((u, v, data))

    for idx, comp in enumerate(components):
        # Check if component contains at least one energized substation
        substations_in_comp = comp.intersection(active_substations)
        
        if not substations_in_comp:
            # This component is an electrical island!
            island_nodes = list(comp)
            lost_load = sum(g.nodes[n].get("load_mw", 0.0) for n in island_nodes)
            critical_nodes = [
                n for n in island_nodes 
                if g.nodes[n].get("criticality", 1) >= 4
            ]
            
            # Find candidate boundary tie switches touching this island
            boundary_ties = []
            for u, v, data in tie_edges:
                if (u in comp and v not in comp) or (v in comp and u not in comp):
                    boundary_ties.append({
                        "edge_code": data.get("edge_code"),
                        "name": data.get("name"),
                        "src": u,
                        "dst": v,
                        "status": data.get("status"),
                        "max_capacity_mw": data.get("max_capacity_mw"),
                        "island_node": u if u in comp else v,
                        "energized_side_node": v if u in comp else u
                    })

            islands.append({
                "island_id": f"ISLAND_{idx + 1}",
                "nodes": island_nodes,
                "node_count": len(island_nodes),
                "lost_load_mw": round(lost_load, 3),
                "critical_nodes": critical_nodes,
                "critical_count": len(critical_nodes),
                "boundary_tie_edges": boundary_ties,
                "restorable": len(boundary_ties) > 0
            })
            
    return islands
