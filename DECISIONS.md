# CivicGrid Architecture & Engineering Decisions (DECISIONS.md)

This log documents every architectural decision, alternatives considered, trade-offs, and rationale.

---

### DEC-001: Database Abstraction & Dual-Engine Capability
- **Context**: The system must run in containerized environments (`docker-compose up` with PostgreSQL) while also allowing immediate standalone test execution on developer workstations without requiring a background Postgres service.
- **Decision**: Use SQLAlchemy ORM with standard relational constraints (PKs, FKs, CHECK constraints, indexes) and Alembic migrations. Default to PostgreSQL URL when `DATABASE_URL` is set, with seamless fallback to SQLite (`sqlite:///./civicgrid.db`) for lightweight local runs and isolated unit testing.
- **Alternatives Considered**:
  - *PostgreSQL only*: Requires local Docker daemon or manual PostgreSQL server installation, which can block automated testing if Docker is unavailable.
  - *In-memory mock*: Violates Rule 1.1 ("No fake or random data; backend state must be real DB records").
- **Trade-off / Justification**: SQLite provides standard SQL and ACID transactions for automated test runs without external daemons; PostgreSQL is used in Docker Compose for production-grade deployments.

---

### DEC-002: Graph Restoration Algorithm & Composite Cost Formulation
- **Context**: The official core problem requires Smart Grid Islanding Detection & Self-Healing Distribution Topology. After an unplanned line trip, the topology must be reconfigured to minimize unserved load without exceeding thermal limits or substation capacities.
- **Decision**: Model the grid as a NetworkX graph with directed and undirected attributes. Tie lines are modeled as edges with initial status `OPEN`. Restoration uses Dijkstra's / A* shortest path search over non-faulted operational and closable tie edges using the composite impedance/loading cost function:
  $$Cost(e) = \alpha \cdot norm\_resistance + \beta \cdot \frac{current\_load}{max\_capacity} + \gamma \cdot norm\_distance$$
  with default weights $\alpha=0.4, \beta=0.4, \gamma=0.2$. Feasibility checks strictly enforce:
  1. No FAULTED or UNAVAILABLE edges.
  2. Candidate tie switches are closable.
  3. Every edge along the path satisfies: $current\_load + added\_load \le max\_capacity$.
  4. Source substation spare capacity $\ge added\_load$.
- **Alternatives Considered**:
  - *AC Power-Flow Nonlinear Optimization (OPF)*: Computationally heavy, non-deterministic convergence in milliseconds, requires complex commercial solvers (IPOPT/MATPOWER).
  - *Simple BFS hop-count*: Ignores electrical impedance and thermal capacity, causing immediate overloads.
- **Trade-off / Justification**: Composite cost Dijkstra is standard in industrial distribution automation (FLISR - Fault Location, Isolation, and Service Restoration) for sub-second reconfiguration while remaining transparent and mathematically reproducible. Explicitly documented as a composite simulation cost.

---

### DEC-003: AI Transparency & Deterministic Fallback Architecture
- **Context**: Rule 1.5 and 1.7 require that AI results be explicitly labeled ("AI CLASSIFICATION" vs "RULE-BASED FALLBACK"), and AI failures or timeouts must never block the grid or civic core.
- **Decision**: Implement an AI abstraction layer `CivicClassifier`:
  - Primary path: Local distilled model or zero-shot text classification.
  - Fallback path: Deterministic TF-IDF cosine similarity + keyword dictionary matching.
  - Every classification and cluster record stores an `engine_source` tag ("AI_CLASSIFICATION", "RULE_BASED_FALLBACK", "IMAGE_NOT_CLASSIFIED").
- **Alternatives Considered**:
  - *External proprietary LLM API (OpenAI/Anthropic)*: Introduces latency, costs, credential dependencies, and network failure points.
  - *Pure rule engine without AI interfaces*: Fails to meet the ML/AI architectural mandate.
- **Trade-off / Justification**: Ensures 100% offline uptime, zero external credentials needed, sub-50ms deterministic fallbacks, and strict audit compliance.

---

### DEC-004: Real-time Digital Twin State Synchronization (SSE + Polling Fallback)
- **Context**: Grid operators need immediate visual updates when faults trip or restoration paths are reconfigured, without full-page reloads.
- **Decision**: Expose a Server-Sent Events (SSE) endpoint `/api/v1/grid/stream` emitting typed events (`FAULT_INJECTED`, `ISLAND_DETECTED`, `RESTORATION_COMPLETED`, etc.) backed by an in-memory event bus with DB persistence in `grid_events`. Frontend React Flow subscribes to SSE and falls back to 2-second HTTP polling if the SSE stream drops.
- **Alternatives Considered**:
  - *WebSockets*: Bi-directional communication is unnecessary since grid mutations are REST POST actions; WebSockets require more complex reverse proxy handshakes.
  - *Short Polling only*: Introduces network overhead and latency jitter.
- **Trade-off / Justification**: SSE is unidirectional, lightweight, works seamlessly through HTTP/2 and proxies, and provides native browser reconnection.

---

### DEC-005: Authentication, RBAC, and IDOR Prevention
- **Context**: Security mandate P0 requires robust RBAC across CITIZEN, FIELD_WORKER, DEPARTMENT_OFFICER, and ADMIN roles, with CSRF protection, secure cookies, and no IDOR.
- **Decision**:
  - Password hashing via Argon2 (with bcrypt compatibility).
  - JWT tokens stored in HTTP-only, SameSite=Lax (or Strict in prod) cookies with CSRF token header verification.
  - Role checks executed inside FastAPI `Depends(...)` dependency injectors, strictly enforcing server-side authorization.
  - IDOR protection: Citizens can only query and mutate reports where `report.user_id == current_user.id`; Field workers only see assigned work; Officers see department-scoped data; Admins have full audit/simulation control.
- **Alternatives Considered**:
  - *Bearer tokens in localStorage*: Vulnerable to XSS token theft.
  - *Session cookies without JWT*: Requires centralized session storage (Redis), adding infrastructural overhead.
- **Trade-off / Justification**: Cookie-based JWT provides stateless horizontal scaling with strong XSS resistance.

---

### DEC-006: Frontend Technology & Design System
- **Context**: Must provide a dark, mission-critical command center aesthetic without generic styles, toy components, or glassmorphism fluff.
- **Decision**: React + Vite + TypeScript with Tailwind CSS using custom semantic tokens:
  - Surface: Charcoal (`#0f172a`, `#1e293b`)
  - Primary: Electric Blue (`#38bdf8`, `#0284c7`)
  - Success/Restored: Emerald (`#10b981`)
  - Warning/Degraded: Amber (`#f59e0b`)
  - Critical/Fault: Crimson (`#ef4444`)
  - Graph Canvas: React Flow with custom Substation, Bus, and Load nodes, dynamic edge coloring for energized/faulted/tie paths, and interactive inspection drawers.
- **Alternatives Considered**:
  - *Canvas 2D / WebGL manual rendering*: High development cost, harder to make accessible and interactive.
  - *D3.js Force Simulation*: Unstable layout for power distribution single-line diagrams where fixed/spatial topological hierarchy is crucial.
- **Trade-off / Justification**: React Flow offers production-grade zoom/pan, custom SVG node rendering, edge routing, and node selection callbacks.
