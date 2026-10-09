# CivicGrid Entity Relationship Model (ERD)

## 1. Schema Diagram (Mermaid)

```mermaid
erDiagram
    users ||--o{ citizen_reports : "submits"
    users ||--o{ assignments : "assigned to/by"
    users ||--o{ audit_logs : "triggers"
    departments ||--o{ citizen_reports : "handles"
    departments ||--o{ incident_clusters : "assigned"
    
    grid_nodes ||--o{ grid_edges : "src/dst"
    grid_nodes ||--o{ infrastructure_assets : "maps to"
    grid_nodes ||--o{ grid_events : "involves"
    
    grid_edges ||--o{ grid_events : "involves"
    grid_edges ||--o{ grid_states : "fault/tie"
    
    infrastructure_assets ||--o{ citizen_reports : "targets"
    infrastructure_assets ||--o{ incident_clusters : "locates"
    
    incident_clusters ||--o{ citizen_reports : "aggregates"
    incident_clusters ||--o{ assignments : "triggers"
    citizen_reports ||--o{ assignments : "assigns"

    users {
        int id PK
        string username UK
        string email UK
        string hashed_password
        string role "CITIZEN | FIELD_WORKER | DEPARTMENT_OFFICER | ADMIN"
        boolean is_active
        datetime created_at
    }

    departments {
        int id PK
        string code UK
        string name
    }

    grid_nodes {
        int id PK
        string node_code UK
        string name
        string node_type "SUBSTATION | BUS | DISTRIBUTION_POINT | LOAD_POINT"
        float nominal_voltage_kv
        float load_mw
        int criticality "1..5"
        string status "OPERATIONAL | DEGRADED | FAULTED | ISOLATED"
        float x
        float y
        boolean is_energized
    }

    grid_edges {
        int id PK
        string edge_code UK
        string name
        int src_node_id FK
        int dst_node_id FK
        float resistance_ohms
        float reactance_ohms
        float distance_km
        float max_capacity_mw
        float current_load_mw
        boolean is_tie_switch
        string status "OPERATIONAL | FAULTED | OPEN | UNAVAILABLE"
    }

    infrastructure_assets {
        int id PK
        string asset_code UK
        string name
        string asset_type "SUBSTATION | TRANSFORMER | FEEDER_PILLAR | POLE | CABLE_JUNCTION"
        int grid_node_id FK
        float x_coord
        float y_coord
        int criticality "1..5"
        int installation_year
        float current_risk_score
        string current_risk_level "LOW | MEDIUM | HIGH | CRITICAL"
        string status
    }

    grid_states {
        int id PK
        datetime timestamp
        string state_enum "NORMAL | FAULT_DETECTED | ISLANDED | ANALYZING | RECONFIGURING | RESTORED | RECONFIGURATION_FAILED"
        float total_load_mw
        float affected_load_mw
        float restored_load_mw
        float unserved_load_mw
        float restoration_pct
        int active_fault_edge_id FK
        int closed_tie_edge_id FK
        json details_json
    }

    grid_events {
        int id PK
        datetime timestamp
        string event_type
        string severity "INFO | WARNING | ERROR | CRITICAL"
        string description
        int related_node_id FK
        int related_edge_id FK
        json payload_json
    }

    citizen_reports {
        int id PK
        int user_id FK
        int asset_id FK
        int department_id FK
        int cluster_id FK
        string category
        text description
        string image_filename
        string classification_source "AI_CLASSIFICATION | RULE_BASED_FALLBACK"
        float classification_confidence
        string status "SUBMITTED | VERIFIED | IN_PROGRESS | RESOLVED | REJECTED"
        int severity "1..5"
        float priority_score
        string priority_level "LOW | MEDIUM | HIGH | CRITICAL"
        float x_coord
        float y_coord
        datetime created_at
    }

    incident_clusters {
        int id PK
        int asset_id FK
        int department_id FK
        string title
        int report_count
        string status "OPEN | INVESTIGATING | RESOLVED"
        float priority_score
        json explanation_json
        datetime created_at
        datetime updated_at
    }

    assignments {
        int id PK
        int report_id FK
        int cluster_id FK
        int assigned_to_user_id FK
        int assigned_by_user_id FK
        string status "ASSIGNED | EN_ROUTE | ON_SITE | COMPLETED"
        text notes
        datetime assigned_at
        datetime completed_at
    }

    scenarios {
        int id PK
        string scenario_code UK "A | B | C | D | E"
        string name
        text description
        boolean is_active
        json initial_fault_edges_json
        text expected_outcome
    }

    audit_logs {
        int id PK
        datetime timestamp
        int actor_user_id FK
        string actor_username
        string action
        string resource_type
        string resource_id
        string result "SUCCESS | FAILURE | DENIED"
        string ip_address
        json metadata_json
    }
```

---

## 2. Integrity Constraints & Rules

1. **Foreign Key Cascades**:
   - `grid_edges.src_node_id` & `dst_node_id` reference `grid_nodes.id` (RESTRICT on delete).
   - `infrastructure_assets.grid_node_id` references `grid_nodes.id` (SET NULL on delete).
   - `citizen_reports.user_id` references `users.id` (RESTRICT on delete).
2. **Check Constraints**:
   - `grid_nodes.criticality` BETWEEN 1 AND 5.
   - `grid_nodes.load_mw` >= 0.0.
   - `grid_edges.max_capacity_mw` > 0.0.
   - `grid_edges.current_load_mw` >= 0.0.
   - `citizen_reports.severity` BETWEEN 1 AND 5.
   - `citizen_reports.priority_score` BETWEEN 0.0 AND 100.0.
   - `grid_states.restoration_pct` BETWEEN 0.0 AND 100.0.
3. **Indexes**:
   - `grid_edges`: `(src_node_id, dst_node_id)`, `status`, `is_tie_switch`
   - `citizen_reports`: `user_id`, `asset_id`, `department_id`, `cluster_id`, `created_at`
   - `audit_logs`: `timestamp`, `actor_user_id`, `action`
   - `incident_clusters`: `asset_id`, `department_id`, `status`
