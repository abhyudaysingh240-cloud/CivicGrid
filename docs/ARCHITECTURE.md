# CivicGrid System Architecture

## 1. System Vision & Overview
**CivicGrid** is a dual-layer digital twin platform:
1. **Core Distribution Grid Engine (P0)**: Rigorous graph-theoretic model of an electrical distribution network capable of real-time islanding detection, fault isolation, composite impedance-cost pathfinding via Dijkstra/A*, physical thermal capacity feasibility validation, and automated self-healing topology reconfiguration.
2. **Civic Situational Awareness Layer (P1)**: Multi-source urban incident reporting, NLP classification, spatial & semantic report clustering, predictive asset risk scoring, and dynamic incident prioritization that feeds contextual awareness to grid operators without ever compromising or blocking grid safety.

```
                      +---------------------------------------+
                      |       CivicGrid Web Command Center    |
                      |   (React 18 + Vite + TS + React Flow) |
                      +-------------------+-------------------+
                                          |
                        HTTPS (REST + JWT Cookies + SSE)
                                          |
                      +-------------------v-------------------+
                      |      CivicGrid Backend (FastAPI)       |
                      |   RBAC Guards | Audit Interceptors     |
                      +---------+-------------------+---------+
                                |                   |
                 +--------------v-----+       +-----v---------------+
                 |  Smart Grid Engine |       |   Civic Engine      |
                 |  - NetworkX Graph  |       |  - Classifier (NLP) |
                 |  - Island Detector |       |  - Clustering (TF-IDF)|
                 |  - Cost Dijkstra   |       |  - Risk Assessor    |
                 |  - Feasibility Chk |       |  - Priority Scorer  |
                 |  - State Machine   |       |  - Officer Workflow |
                 +--------------+-----+       +-----+---------------+
                                |                   |
                      +---------v-------------------v---------+
                      |         Data & Persistence Layer       |
                      |   SQLAlchemy 2.0 + PostgreSQL / SQLite|
                      |   Strict Foreign Keys & Check Tables  |
                      +---------------------------------------+
```

---

## 2. Core Smart Grid Engine Pipeline

When an edge trip event occurs (e.g., branch fault, physical collision, or overload):
1. **Fault Injection**: Edge status becomes `FAULTED`.
2. **Islanding Detection**: Exclude all `FAULTED` and `OPEN` tie edges. Compute connected components across the graph. Any component lacking an energized `SUBSTATION` node is flagged as an **Electrical Island**.
3. **Loss Accounting**: Aggregate sum of `load_mw` for all nodes in isolated components, marking critical nodes (criticality $\ge 4$).
4. **Restoration Search**:
   - Locate boundary open tie switches connecting energized subgraphs to the islanded subgraph.
   - Run multi-source Dijkstra from energized substations across operational lines and candidate closable tie switches.
   - Edge cost formulation:
     $$Cost(e) = \alpha \cdot \frac{R_e - R_{min}}{R_{max} - R_{min}} + \beta \cdot \frac{L_e}{C_e} + \gamma \cdot \frac{D_e - D_{min}}{D_{max} - D_{min}}$$
     (defaults: $\alpha=0.4, \beta=0.4, \gamma=0.2$).
5. **Feasibility Validation**:
   - Check tie switch status: must be closable.
   - Check line capacity along the entire feeding chain: $L_{current} + L_{added} \le C_{max}$.
   - Check source substation reserve capacity: $S_{capacity} - S_{current\_load} \ge L_{added}$.
   - If full load infeasible: attempt partial restoration in descending criticality order.
   - If no candidate path satisfies capacity: transition to `RECONFIGURATION_FAILED`.
6. **Topology Reconfiguration**:
   - Close approved tie switch(es).
   - Recompute network flow and node energization states.
   - Transition state machine to `RESTORED`.
   - Persist event in `grid_events` and log in `audit_logs`.
   - Broadcast state snapshot via Server-Sent Events (SSE).

---

## 3. Civic Intelligence & Situational Awareness Pipeline

1. **Incident Ingestion**: Citizens or field personnel submit incident reports specifying an infrastructure asset or digital-twin coordinates, category, severity, and photo.
2. **Classification**:
   - Primary: Zero-shot transformer text categorization.
   - Fallback: Deterministic keyword dictionary mapping with explicit label `RULE_BASED_FALLBACK`.
3. **Deduplication & Clustering**:
   - Spatial condition: same infrastructure asset ID or digital-twin euclidean distance $\le 50$ units.
   - Semantic condition: TF-IDF cosine similarity $\ge 0.85$.
   - Linked reports join an `IncidentCluster`, incrementing evidence count without clogging operator dashboards.
4. **Asset Risk Assessment**:
   - Calculates dynamic risk index $\in [0, 100]$:
     $$Risk = w_f \cdot HistFail + w_a \cdot Age + w_c \cdot Crit + w_l \cdot LoadUtil + w_i \cdot Incidents$$
   - Maps to categorical states: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
5. **Incident Priority Scoring**:
   - Multi-attribute score:
     $$Priority = S_{severity} \times 0.3 + C_{count} \times 0.2 + A_{risk} \times 0.25 + L_{impact} \times 0.25 + E_{boost}$$
   - Provides full mathematical factor explanation in the UI.

---

## 4. Security Architecture

1. **Defense in Depth**:
   - Role-Based Access Control enforced on backend route dependencies:
     - `CITIZEN`: Create reports, read own reports, view public grid health summary.
     - `FIELD_WORKER`: Read assigned tasks, update work order status.
     - `DEPARTMENT_OFFICER`: Triage department reports, view risk panels, assign tasks, escalate.
     - `ADMIN`: Trigger grid fault scenarios, reconfigure network, view full audit logs.
   - Cookie-based session storage: `HttpOnly`, `SameSite=Lax`, `Secure` in production, with CSRF token verification.
   - IDOR prevention: All database queries filter by authenticated entity ownership unless caller possesses elevated officer/admin roles.
2. **File Upload Security**:
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
   - Magic byte header inspection before file write.
   - Maximum upload size: 5 MB.
   - Files stored with UUID-generated names outside web-accessible directory.
3. **Auditing**:
   - Immutable audit trail capturing: timestamp, actor ID, IP address, action, target resource, outcome, and diff payload.
