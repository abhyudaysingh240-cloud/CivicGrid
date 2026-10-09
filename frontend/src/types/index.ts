export type Role = 'CITIZEN' | 'FIELD_WORKER' | 'DEPARTMENT_OFFICER' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  department_id?: number;
  is_active: boolean;
  created_at: string;
}

export type GridStateEnum =
  | 'NORMAL'
  | 'FAULT_DETECTED'
  | 'ISLANDED'
  | 'ANALYZING'
  | 'RECONFIGURING'
  | 'RESTORED'
  | 'RECONFIGURATION_FAILED';

export interface GridState {
  id: number;
  timestamp: string;
  state_enum: GridStateEnum;
  total_load_mw: number;
  affected_load_mw: number;
  restored_load_mw: number;
  unserved_load_mw: number;
  restoration_pct: number | null;
  restoration_status?: 'NO_ACTIVE_FAULT' | 'PARTIAL' | 'FULL' | 'FAILED';
  active_fault_edge_id?: number;
  closed_tie_edge_id?: number;
  details_json?: any;
}

export interface GridNode {
  id: number;
  node_code: string;
  name: string;
  node_type: 'SUBSTATION' | 'BUS' | 'DISTRIBUTION_POINT' | 'LOAD_POINT';
  nominal_voltage_kv: number;
  load_mw: number;
  criticality: number;
  status: 'OPERATIONAL' | 'DEGRADED' | 'FAULTED' | 'ISOLATED';
  x: number;
  y: number;
  is_energized: boolean;
  max_capacity_mw?: number;
  current_supply_mw?: number;
}

export interface GridEdge {
  id: number;
  edge_code: string;
  name: string;
  src_node_id: number;
  dst_node_id: number;
  src_code?: string;
  dst_code?: string;
  resistance_ohms: number;
  reactance_ohms: number;
  distance_km: number;
  max_capacity_mw: number;
  current_load_mw: number;
  is_tie_switch: boolean;
  status: 'OPERATIONAL' | 'FAULTED' | 'OPEN' | 'UNAVAILABLE';
}

export interface GridIsland {
  island_id: string;
  nodes: string[];
  node_count: number;
  lost_load_mw: number;
  critical_nodes: string[];
  critical_count: number;
  boundary_tie_edges: any[];
  restorable: boolean;
}

export interface GridTopologyData {
  state: GridState;
  nodes: GridNode[];
  edges: GridEdge[];
  islands: GridIsland[];
  total_load_mw: number;
}

export interface GridEvent {
  id: number;
  timestamp: string;
  event_type: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  description: string;
  related_node_id?: number;
  related_edge_id?: number;
  payload_json?: any;
}

export interface InfrastructureAsset {
  id: number;
  asset_code: string;
  name: string;
  asset_type: string;
  grid_node_id?: number;
  x_coord: number;
  y_coord: number;
  criticality: number;
  installation_year: number;
  last_serviced_at: string;
  current_risk_score: number;
  current_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
}

export interface CitizenReport {
  id: number;
  user_id: number;
  username?: string;
  asset_id?: number;
  asset_name?: string;
  department_id: number;
  department_code?: string;
  cluster_id?: number;
  category: string;
  description: string;
  image_filename?: string;
  classification_source: string;
  classification_confidence: number;
  status: 'SUBMITTED' | 'VERIFIED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  severity: number;
  priority_score: number;
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  x_coord: number;
  y_coord: number;
  created_at: string;
  updated_at: string;
}

export interface IncidentCluster {
  id: number;
  asset_id?: number;
  department_id: number;
  title: string;
  report_count: number;
  status: string;
  priority_score: number;
  explanation_json?: any;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: number;
  report_id?: number;
  cluster_id?: number;
  assigned_to_user_id: number;
  assigned_to_username?: string;
  assigned_by_user_id: number;
  status: 'ASSIGNED' | 'EN_ROUTE' | 'ON_SITE' | 'COMPLETED';
  notes?: string;
  assigned_at: string;
  completed_at?: string;
}

export interface Scenario {
  id: number;
  scenario_code: string;
  name: string;
  description: string;
  is_active: boolean;
  initial_fault_edges_json: string[];
  expected_outcome: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor_user_id?: number;
  actor_username: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  result: string;
  ip_address?: string;
  metadata_json?: any;
}

export interface Department {
  id: number;
  code: string;
  name: string;
}

export interface SystemHealth {
  status: string;
  db_connected: boolean;
  total_users: number;
  total_reports: number;
  total_assets: number;
  active_grid_state: string;
  timestamp: string;
}

