# CivicGrid Technical Defense & Judges Q&A (JUDGES_QA.md)

This document addresses deep architectural, algorithmic, mathematical, and security questions that evaluators and engineering judges may pose regarding CivicGrid.

---

## 1. Electrical & Graph Engineering (P0 Core)

### Q1: How does CivicGrid isolate electrical islands mathematically?
**Answer**:
The distribution grid is modeled as a connected graph $G = (V, E)$ using NetworkX where $V$ represents electrical buses, distribution points, and substations, and $E$ represents feeder cables and tie switches.
1. When a fault occurs on edge $e_{fault}$, its status is transitioned to `FAULTED`.
2. All `FAULTED` edges and normally-open tie switches (`OPEN`) are filtered out to create the operational subgraph $G_{active} = (V, E_{active})$.
3. CivicGrid extracts connected components $C_1, C_2, \dots, C_k$ using breadth-first/depth-first search.
4. For each component $C_i$, the engine checks whether $\exists v \in C_i$ such that $v$ is an energized `SUBSTATION` node ($v \in S_{energized}$).
5. Any component $C_{island}$ lacking an energized substation is flagged as an **Electrical Island**.
6. The engine aggregates the exact lost load: $L_{lost} = \sum_{v \in C_{island}} \text{load\_mw}(v)$ and identifies all unserved critical nodes (criticality $\ge 4$).
- *Source reference*: [islanding.py](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/backend/app/grid/islanding.py)

---

### Q2: Why composite-cost Dijkstra instead of nonlinear AC Optimal Power Flow (Newton-Raphson)?
**Answer**:
In industrial distribution automation (FLISR - Fault Location, Isolation, and Service Restoration), response latency must be sub-second (typically < 100ms) to prevent customer disruption and relay trips. Full AC non-linear power flow (OPF) involves non-convex trigonometric equations with non-deterministic convergence times and potential solver singularities under heavy islanded conditions.
CivicGrid employs a multi-objective composite cost function:
$$\text{Cost}(e) = \alpha \cdot \frac{R_e - R_{min}}{R_{max} - R_{min}} + \beta \cdot \frac{L_{current}(e)}{C_{max}(e)} + \gamma \cdot \frac{D_e - D_{min}}{D_{max} - D_{min}}$$
where $\alpha=0.4$ (electrical impedance), $\beta=0.4$ (thermal headroom utilization), and $\gamma=0.2$ (geographic line length).
This guarantees:
1. $O((|E| + |V|) \log |V|)$ deterministic execution time.
2. Favoring low-impedance, low-utilized feeders over congested or high-loss lines.
3. 100% mathematical reproducibility across runs.
- *Source reference*: [cost.py](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/backend/app/grid/cost.py), [DEC-002](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/DECISIONS.md)

---

### Q3: How do you guarantee the grid never overloads during auto-reconfiguration?
**Answer**:
Finding a topological path is insufficient; the path must be physically feasible. Before any tie switch is instructed to close, CivicGrid validates two physical constraints:
1. **Feeder Line Thermal Capacity**: For every edge $e$ along the path feeding the island:
   $$L_{current}(e) + L_{added} \le C_{max}(e)$$
2. **Substation Reserve Capacity**: For the candidate source substation $S_{src}$:
   $$C_{substation}(S_{src}) - L_{current}(S_{src}) \ge L_{added}$$
If any candidate path fails either check, it is rejected with a documented feasibility rejection reason.
- *Source reference*: [restoration.py](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/backend/app/grid/restoration.py)

---

### Q4: What happens if full restoration is physically impossible? (Scenario C)
**Answer**:
Unlike naive demo apps that blindly report "100% restored" or crash, CivicGrid practices **Truth in Engineering**:
1. When all tie paths exceed thermal limits (as in Scenario C, where 7.2 MW of load requires restoration but the only available tie line has a 2.5 MW bottleneck), the engine transitions to `RECONFIGURATION_FAILED`.
2. It attempts **Priority-Based Partial Restoration**: lower-criticality residential/commercial loads are shed while attempting to feed highest-criticality loads (criticality = 5, e.g., Regional Medical Hub).
3. The remaining unserved load is honestly accounted for in `GridState.unserved_load_mw` and displayed in high-contrast Crimson on the Command Center UI.
- *Source reference*: [restoration.py](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/backend/app/grid/restoration.py), [test_grid_engine.py](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/backend/tests/test_grid_engine.py)

---

## 2. Civic Intelligence & AI Safety (P1 Layer)

### Q5: How is citizen reporting decoupled from mission-critical grid safety?
**Answer**:
A primary architectural principle is that **the civic reporting layer is read-only situational awareness with respect to electrical grid actuation**.
- Citizens can report incidents and upload photos.
- Reports inform asset risk scores and officer dispatch queues.
- However, **citizen reports can never directly trigger tie switch closures, breaker trips, or grid topology state transitions**.
- Grid mutations require administrative authority (`ADMIN` role) and pass through strict server-side state machine validators (`state_machine.py`).
- *Source reference*: [ARCHITECTURE.md](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/docs/ARCHITECTURE.md), [dependencies.py](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/backend/app/core/dependencies.py)

---

### Q6: How does the NLP classification handle ambiguous or adversarial citizen inputs?
**Answer**:
We adhere to **DEC-003: AI Transparency & Deterministic Fallback**:
1. Every report passes through `CivicClassifier`:
   - If an ML model is offline or confidence is low, it executes deterministic keyword/regex matching against domain dictionaries (`electrical`, `structural`, `vegetation`, `water`).
2. Every report record in the database explicitly saves its provenance: `classification_source` = `AI_CLASSIFICATION` or `RULE_BASED_FALLBACK`.
3. If an input is unclassifiable, it defaults to category `general` with low severity and is flagged for manual officer triage.
- *Source reference*: [classifier.py](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/backend/app/civic/classifier.py)

---

### Q7: How does duplicate incident clustering prevent operator fatigue?
**Answer**:
During an outage, dozens of citizens in the same neighborhood report the same event within minutes. CivicGrid uses dual-condition clustering:
1. **Spatial Co-location**: Reports within Euclidean distance $\le 50$ units in digital-twin space or targeting the same infrastructure asset ID.
2. **Semantic Similarity**: TF-IDF vectorization with cosine similarity $\ge 0.85$.
When both criteria are met, the report joins an existing `IncidentCluster`. The cluster's `report_count` increments, but only a single master work ticket appears on the Officer's dashboard.
- *Source reference*: [clustering.py](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/backend/app/civic/clustering.py)

---

## 3. Security, RBAC & Architecture (P0 Mandate)

### Q8: How is security, authentication, and IDOR enforced across the 4 roles?
**Answer**:
1. **Authentication**: Passwords are encrypted with Argon2/bcrypt. Sessions use HTTP-only, SameSite=Lax cookies with randomized CSRF token validation.
2. **Strict RBAC**: Routes are protected by FastAPI dependency injectors (`require_role([...])`):
   - `CITIZEN`: Can submit reports and view public grid health.
   - `FIELD_WORKER`: Can view assigned tasks and update work order states.
   - `DEPARTMENT_OFFICER`: Can triage reports, view risk panels, and assign field workers.
   - `ADMIN`: Has full scenario injection, manual topology restoration, and audit log access.
3. **IDOR Protection**: When a citizen queries `/civic/reports/{id}`, the backend checks `report.user_id == current_user.id`. Citizens querying other users' reports receive `HTTP 403 Forbidden`.
- *Source reference*: [dependencies.py](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/backend/app/core/dependencies.py), [test_auth_and_security.py](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/backend/tests/test_auth_and_security.py)

---

### Q9: Why Server-Sent Events (SSE) instead of WebSockets or polling?
**Answer**:
1. **Unidirectional Efficiency**: Grid state transitions (fault trips, restoration completions) flow from server to client. WebSockets add bi-directional handshake complexity without necessity since user actions are standard REST POST requests.
2. **HTTP/2 Compatibility**: SSE works transparently through standard HTTP/2 reverse proxies, firewalls, and enterprise networks with automatic reconnection.
3. **Resilience**: The frontend React client automatically falls back to 3-second HTTP polling if the SSE stream disconnects.
- *Source reference*: [DEC-004](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/DECISIONS.md), [App.tsx](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/frontend/src/App.tsx)

---

### Q10: How are audit logs protected against tampering?
**Answer**:
1. The `audit_logs` table has NO update or delete endpoints exposed in the API.
2. Every security-critical action (fault injection, tie switch closure, role elevation, incident status change) triggers synchronous insertion into `audit_logs`.
3. Audit log records capture timestamp, actor user ID, actor username, IP address, action string, target resource, outcome (`SUCCESS`, `FAILURE`, `DENIED`), and full JSON diff metadata.
- *Source reference*: [audit.py](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/backend/app/core/audit.py), [admin.py](file:///c:/Users/HP-PC/OneDrive/Desktop/CivicGrid/backend/app/api/v1/admin.py)
