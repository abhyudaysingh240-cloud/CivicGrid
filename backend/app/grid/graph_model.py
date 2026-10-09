import networkx as nx
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models.models import GridNode, GridEdge

class GridGraph:
    """
    In-memory NetworkX digital twin representation of the electrical distribution network.
    Maintains graph topology, electrical node loads, edge impedances, and capacities.
    """
    def __init__(self):
        # Undirected graph for physical electrical connectivity
        self.graph = nx.Graph()
        self.substations: set[str] = set()

    def build_from_db(self, db: Session) -> "GridGraph":
        """
        Populates graph from database records.
        """
        self.graph.clear()
        self.substations.clear()

        nodes = db.query(GridNode).all()
        for node in nodes:
            self.graph.add_node(
                node.node_code,
                id=node.id,
                name=node.name,
                type=node.node_type,
                load_mw=float(node.load_mw),
                criticality=node.criticality,
                nominal_voltage_kv=node.nominal_voltage_kv,
                status=node.status,
                x=node.x,
                y=node.y,
                is_energized=node.is_energized,
                max_capacity_mw=float(node.max_capacity_mw or 0.0),
                current_supply_mw=float(node.current_supply_mw or 0.0)
            )
            if node.node_type == "SUBSTATION":
                self.substations.add(node.node_code)

        edges = db.query(GridEdge).all()
        for edge in edges:
            src_node = db.query(GridNode).filter(GridNode.id == edge.src_node_id).first()
            dst_node = db.query(GridNode).filter(GridNode.id == edge.dst_node_id).first()
            if src_node and dst_node:
                self.graph.add_edge(
                    src_node.node_code,
                    dst_node.node_code,
                    id=edge.id,
                    edge_code=edge.edge_code,
                    name=edge.name,
                    resistance_ohms=float(edge.resistance_ohms),
                    reactance_ohms=float(edge.reactance_ohms),
                    distance_km=float(edge.distance_km),
                    max_capacity_mw=float(edge.max_capacity_mw),
                    current_load_mw=float(edge.current_load_mw),
                    is_tie_switch=edge.is_tie_switch,
                    status=edge.status
                )
        return self

    def get_edge_by_code(self, edge_code: str) -> Optional[tuple[str, str, Dict[str, Any]]]:
        for u, v, data in self.graph.edges(data=True):
            if data.get("edge_code") == edge_code:
                return u, v, data
        return None

    def get_active_substations(self) -> List[str]:
        return [
            s for s in self.substations 
            if self.graph.nodes[s].get("is_energized", True) and self.graph.nodes[s].get("status") == "OPERATIONAL"
        ]

    def total_network_load(self) -> float:
        return sum(data.get("load_mw", 0.0) for _, data in self.graph.nodes(data=True))
