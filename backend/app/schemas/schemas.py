from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr

# --- Auth Schemas ---
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    department_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Grid Schemas ---
class GridNodeOut(BaseModel):
    id: int
    node_code: str
    name: str
    node_type: str
    nominal_voltage_kv: float
    load_mw: float
    criticality: int
    status: str
    x: float
    y: float
    is_energized: bool
    max_capacity_mw: Optional[float] = None
    current_supply_mw: Optional[float] = None

    class Config:
        from_attributes = True

class GridEdgeOut(BaseModel):
    id: int
    edge_code: str
    name: str
    src_node_id: int
    dst_node_id: int
    src_code: Optional[str] = None
    dst_code: Optional[str] = None
    resistance_ohms: float
    reactance_ohms: float
    distance_km: float
    max_capacity_mw: float
    current_load_mw: float
    is_tie_switch: bool
    status: str

    class Config:
        from_attributes = True

class GridStateOut(BaseModel):
    id: int
    timestamp: datetime
    state_enum: str
    total_load_mw: float
    affected_load_mw: float
    restored_load_mw: float
    unserved_load_mw: float
    restoration_pct: float
    active_fault_edge_id: Optional[int] = None
    closed_tie_edge_id: Optional[int] = None
    details_json: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class GridTopologyOut(BaseModel):
    state: GridStateOut
    nodes: List[GridNodeOut]
    edges: List[GridEdgeOut]
    islands: List[Dict[str, Any]]

class FaultInjectionRequest(BaseModel):
    edge_code: str

class RestorationCandidate(BaseModel):
    path_nodes: List[str]
    path_edges: List[str]
    tie_edge_code: str
    composite_cost: float
    feasible: bool
    rejection_reason: Optional[str] = None
    capacity_margin_mw: float
    cost_breakdown: Dict[str, float]

class WhyRestorationOut(BaseModel):
    state: str
    timestamp: datetime
    affected_nodes: List[str]
    lost_load_mw: float
    candidates_evaluated: List[RestorationCandidate]
    selected_path: Optional[RestorationCandidate] = None
    selection_rationale: str

class GridEventOut(BaseModel):
    id: int
    timestamp: datetime
    event_type: str
    severity: str
    description: str
    related_node_id: Optional[int] = None
    related_edge_id: Optional[int] = None
    payload_json: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# --- Civic Schemas ---
class CitizenReportCreate(BaseModel):
    asset_id: Optional[int] = None
    category: Optional[str] = None  # If not provided, NLP categorizes
    description: str = Field(..., min_length=5)
    severity: int = Field(default=2, ge=1, le=5)
    x_coord: Optional[float] = None
    y_coord: Optional[float] = None

class CitizenReportOut(BaseModel):
    id: int
    user_id: int
    username: Optional[str] = None
    asset_id: Optional[int] = None
    asset_name: Optional[str] = None
    department_id: int
    department_code: Optional[str] = None
    cluster_id: Optional[int] = None
    category: str
    description: str
    image_filename: Optional[str] = None
    classification_source: str
    classification_confidence: float
    status: str
    severity: int
    priority_score: float
    priority_level: str
    x_coord: float
    y_coord: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ReportStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(SUBMITTED|VERIFIED|IN_PROGRESS|RESOLVED|REJECTED)$")

class IncidentClusterOut(BaseModel):
    id: int
    asset_id: Optional[int] = None
    department_id: int
    title: str
    report_count: int
    status: str
    priority_score: float
    explanation_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    reports: Optional[List[CitizenReportOut]] = None

    class Config:
        from_attributes = True

class WhyClusteringOut(BaseModel):
    cluster_id: int
    title: str
    asset_id: Optional[int] = None
    report_count: int
    pairwise_similarities: List[Dict[str, Any]]
    spatial_distances: List[Dict[str, Any]]
    clustering_rule_applied: str

class AssetOut(BaseModel):
    id: int
    asset_code: str
    name: str
    asset_type: str
    grid_node_id: Optional[int] = None
    x_coord: float
    y_coord: float
    criticality: int
    installation_year: int
    last_serviced_at: datetime
    current_risk_score: float
    current_risk_level: str
    status: str

    class Config:
        from_attributes = True

class WhyRiskOut(BaseModel):
    asset_id: int
    asset_code: str
    name: str
    total_risk_score: float
    risk_level: str
    factors: Dict[str, Any]
    formula: str

class WhyPriorityOut(BaseModel):
    report_id: int
    priority_score: float
    priority_level: str
    factors: Dict[str, Any]
    formula: str

# --- Assignment Schemas ---
class AssignmentCreate(BaseModel):
    report_id: Optional[int] = None
    cluster_id: Optional[int] = None
    assigned_to_user_id: int
    notes: Optional[str] = None

class AssignmentStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(ASSIGNED|EN_ROUTE|ON_SITE|COMPLETED)$")
    notes: Optional[str] = None

class AssignmentOut(BaseModel):
    id: int
    report_id: Optional[int] = None
    cluster_id: Optional[int] = None
    assigned_to_user_id: int
    assigned_to_username: Optional[str] = None
    assigned_by_user_id: int
    status: str
    notes: Optional[str] = None
    assigned_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Scenario Schemas ---
class ScenarioOut(BaseModel):
    id: int
    scenario_code: str
    name: str
    description: str
    is_active: bool
    initial_fault_edges_json: List[str]
    expected_outcome: str

    class Config:
        from_attributes = True

# --- Audit Schemas ---
class AuditLogOut(BaseModel):
    id: int
    timestamp: datetime
    actor_user_id: Optional[int] = None
    actor_username: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    result: str
    ip_address: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
