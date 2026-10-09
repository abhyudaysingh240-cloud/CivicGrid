# CivicGrid Specification (SPEC.md)

## 0. Project Overview & Rules
CivicGrid is an intelligent urban infrastructure monitoring and self-healing distribution grid digital twin platform.

### Core Rules (Section 1)
1. **Zero Fake Data**: No mock metrics, Math.random, or synthetic random generators in shipped paths. All metrics represent real DB records and computed graph states.
2. **Deterministic Reproducibility**: Pre-configured scenarios (A-E) execute deterministically and yield exact reproducible results.
3. **Honest Failure Handling**: If restoration is infeasible due to thermal limits or substation capacity, report `RECONFIGURATION_FAILED` with honest unserved load metrics.
4. **Backend-Owned Logic**: Grid calculations, topology graph, pathfinding, and feasibility validation are owned exclusively by the backend. The frontend is a presentation layer.
5. **AI Transparency**: NLP classifications are transparently labeled as `AI_CLASSIFICATION` or `RULE_BASED_FALLBACK`.
6. **Defense-in-Depth**: Strict RBAC (`CITIZEN`, `FIELD_WORKER`, `DEPARTMENT_OFFICER`, `ADMIN`), IDOR protection, HTTP-only JWT cookies, CSRF validation, and immutable audit logs.

---

## 1. Distribution Grid Engine (P0)
- **Graph Representation**: 24-node urban distribution network with NetworkX, 3 substations (`SUB_NORTH`, `SUB_SOUTH`, `SUB_EAST`), radial distribution feeders, and 4 normally-open tie switches (`TIE_N1_S1`, `TIE_N2_S2_BOTTLENECK`, `TIE_S1_E1`, `TIE_N2_E1`).
- **Islanding Detection**: Excludes faulted and open tie switches. Isolates connected components lacking energized substation nodes. Accurately calculates lost load and unserved critical nodes.
- **Composite Dijkstra Restoration**: Evaluates candidate tie paths minimizing:
  $$Cost(e) = \alpha \cdot \frac{R_e - R_{min}}{R_{max} - R_{min}} + \beta \cdot \frac{L_e}{C_e} + \gamma \cdot \frac{D_e - D_{min}}{D_{max} - D_{min}}$$
  ($\alpha=0.4, \beta=0.4, \gamma=0.2$).
- **Thermal & Substation Capacity Feasibility**: Candidate paths must satisfy $L_{curr} + L_{add} \le C_{max}$ on all edges and source substation reserve capacity $\ge L_{add}$.
- **Finite State Machine**: Strict states: `NORMAL`, `FAULT_DETECTED`, `ISLANDED`, `ANALYZING`, `RECONFIGURING`, `RESTORED`, `RECONFIGURATION_FAILED`.
- **Deterministic Scenarios**:
  - Scenario A: Baseline Normal (35.20 MW served, 0 faults, 0 islands).
  - Scenario B: Line Trip `LINE_BUS_N1_DP_N1` $\to$ Island detected $\to$ Auto-restored via `TIE_N1_S1` (100% restored).
  - Scenario C: Line Trip `LINE_BUS_N2_DP_N2` (7.2 MW) $\to$ Tie `TIE_N2_S2_BOTTLENECK` capacity 2.5 MW $\to$ Infeasible $\to$ `RECONFIGURATION_FAILED` (honest unserved load).
  - Scenario D: Multi-Incident Emergency (Substation line trip + clustered reports).
  - Scenario E: Cascading Line Trip (Tie reconfiguration followed by secondary overload trip).

---

## 2. Civic Intelligence Layer (P1)
- **Citizen Report Ingestion**: Multipart form with photo upload (magic bytes, MIME check, 5MB limit).
- **Classification**: Local zero-shot classification with deterministic regex/keyword fallback (`RULE_BASED_FALLBACK`).
- **Clustering**: Co-located within digital-twin distance $\le 50$ units or same asset, plus TF-IDF cosine similarity $\ge 0.85$.
- **Asset Risk Engine**: Weighted risk index based on failure history, age, criticality, load utilization, and open incident density.
- **Incident Priority Scoring**: Weighted formula: $Severity \times 0.3 + Count \times 0.2 + Risk \times 0.25 + LoadImpact \times 0.25 + EmergencyBoost$.
- **Explainability ("Why?" Panels)**: Real-time mathematical breakdown for path selection, asset risk factors, clustering similarity, and priority weights.

---

## 3. Web Command Center (P0/P1)
- **React Flow Topology**: Dark command center aesthetic (`#0f172a`, `#1e293b`, Electric Blue, Emerald, Crimson). Custom Substation, Bus, and Load nodes with energized/faulted styling.
- **Real-Time Synchronization**: Server-Sent Events (SSE) `/api/v1/grid/stream` with polling fallback.
- **Role Dashboards**:
  - Citizen Portal: Report submission, public grid health summary.
  - Field Worker: Work order status updates (`ASSIGNED` $\to$ `EN_ROUTE` $\to$ `ON_SITE` $\to$ `COMPLETED`).
  - Department Officer: Triage, risk analysis, dispatch assignments.
  - Admin: Grid fault injection, scenario runner, audit log browser.
