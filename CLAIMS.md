# CivicGrid Truth in Engineering Ledger (CLAIMS.md)

This document provides a completely honest audit of all capabilities in CivicGrid. Every feature is categorized as **IMPLEMENTED**, **SIMULATED**, or **FUTURE WORK**. There are zero false claims of live utility interconnects, real municipal sensors, or physical grid actuators.

---

## 1. Core Smart Grid Engine (P0)

| Feature | Classification | Description & Technical Reality |
|---|---|---|
| **Graph Representation** | **IMPLEMENTED** | Distribution grid represented as a graph using NetworkX. Nodes have physical load (MW), criticality (1-5), and status. Edges have electrical parameters (resistance, reactance, length, capacity, current load, status). |
| **Islanding Detection** | **IMPLEMENTED** | Rigorous graph component analysis (BFS/DFS) isolating subgraphs disconnected from any energized substation node after fault injection. Computes lost load and unserved critical nodes. |
| **Composite Restoration Cost** | **IMPLEMENTED** | Multi-objective cost function: $\alpha \cdot R_{norm} + \beta \cdot (L / C) + \gamma \cdot D_{norm}$. Normalized across valid edge domains with configurable weighting. |
| **Dijkstra / A* Reconfiguration** | **IMPLEMENTED** | Pathfinding over operational edges and closable normally-open tie switches to find $k$ candidate restoration paths. |
| **Thermal & Substation Feasibility** | **IMPLEMENTED** | Rejects candidate paths exceeding edge thermal limits ($L_{curr} + L_{add} > L_{max}$) or source substation reserve capacity. Selects lowest cost feasible path. |
| **Partial Restoration** | **IMPLEMENTED** | When full restoration is infeasible, isolates lower priority loads and attempts restoration of highest criticality nodes in descending order. Honest unserved load accounting. |
| **Finite State Machine** | **IMPLEMENTED** | Strict state machine: `NORMAL` $\to$ `FAULT_DETECTED` $\to$ `ISLANDED` $\to$ `ANALYZING` $\to$ `RECONFIGURING` $\to$ `RESTORED` (or `RECONFIGURATION_FAILED`). Validated transitions. |
| **Deterministic Scenarios A-E** | **IMPLEMENTED** | Pre-computed, versioned scenarios with deterministic hand-verified outcomes: Normal, Single Line Fault, Infeasible Capacity, Multi-Incident Emergency, Cascading Isolation. |
| **Physical SCADA / Remote Telemetry** | **SIMULATED** | Telemetry and line trip sensors are simulated within the digital-twin domain; no physical RTU/IED Modbus/DNP3 hardware connection exists. |
| **AC Non-linear Power Flow (Newton-Raphson)** | **FUTURE WORK** | Uses composite resistance-capacity flow constraints; full AC voltage-angle reactive power flow (PF/OPF) is designated as future work. |

---

## 2. Civic Intelligence & Situational Awareness (P1)

| Feature | Classification | Description & Technical Reality |
|---|---|---|
| **Citizen Incident Reporting** | **IMPLEMENTED** | Full citizen submission pipeline with authenticated user, asset link, category, description, severity, and photo upload. |
| **Text NLP Classification** | **IMPLEMENTED** | Multi-class intent categorization using local zero-shot classification with immediate deterministic keyword/regex fallback. Transparently labeled in UI and DB. |
| **Incident Clustering** | **IMPLEMENTED** | Spatial/asset co-location and TF-IDF cosine similarity clustering ($\ge 0.85$). Groups duplicate reports to prevent officer alert fatigue. |
| **Asset Risk Engine** | **IMPLEMENTED** | Multi-factor risk scoring based on failure history, asset age, criticality, current electrical loading, and open incident density. Full factor breakdown provided. |
| **Incident Priority Engine** | **IMPLEMENTED** | Weighted priority algorithm incorporating severity, report volume, asset risk, load impact, and emergency keyword triggers. |
| **Officer Workflow** | **IMPLEMENTED** | Complete lifecycle management: triage, assign field crew, update status, escalate, and resolve with audit trails. |
| **Image Vision Classification** | **SIMULATED** | Image file verification (magic bytes, MIME, size cap) is implemented. Deep vision inference is simulated with heuristic classification or transparently marked "IMAGE NOT CLASSIFIED". |
| **Physical GIS / Real City Maps** | **SIMULATED** | Uses a digital-twin synthetic coordinate space and asset IDs; no external commercial Google Maps/Mapbox APIs or claims of sub-meter GPS precision. |

---

## 3. Security, RBAC & Architecture (P0)

| Feature | Classification | Description & Technical Reality |
|---|---|---|
| **Role-Based Access Control (RBAC)** | **IMPLEMENTED** | Four distinct roles (`CITIZEN`, `FIELD_WORKER`, `DEPARTMENT_OFFICER`, `ADMIN`) strictly enforced in FastAPI server dependencies. |
| **Insecure Direct Object Reference (IDOR) Protection** | **IMPLEMENTED** | Resource-level ownership checks preventing unauthorized access across users and departments. |
| **Authentication & Cookie Security** | **IMPLEMENTED** | Argon2/bcrypt password hashing, JWT in HTTP-only SameSite cookies, CSRF header token defense. |
| **Immutable Audit Logging** | **IMPLEMENTED** | Every grid mutation, scenario trigger, report creation, status update, and role escalation is recorded with actor, action, timestamp, and metadata. |
| **File Upload Hardening** | **IMPLEMENTED** | Magic byte validation, MIME-type enforcement, randomized file storage outside web root, strict size caps (5MB). |
| **Hardware Security Module (HSM)** | **FUTURE WORK** | Enterprise key management via HSM or AWS KMS is planned for production deployments. |

---

## 4. UI Command Center (P0/P1)

| Feature | Classification | Description & Technical Reality |
|---|---|---|
| **React Flow Topology Visualizer** | **IMPLEMENTED** | Real-time interactive distribution diagram with zoom, pan, node status styling, tie-switch indicators, and fault highlighting. |
| **"Why?" Explanation Panels** | **IMPLEMENTED** | Transparent inspectability: shows why a path was chosen vs rejected, why an asset is High Risk, and why reports were clustered. |
| **Real-time SSE Stream** | **IMPLEMENTED** | Unidirectional event stream broadcasting grid state transitions and civic alerts directly to the frontend. |
| **Role-specific Portals** | **IMPLEMENTED** | Custom operational consoles for Citizen, Field Worker, Department Officer, and Grid Operator. |
| **3D Digital Twin City Model** | **FUTURE WORK** | Full 3D WebGL Three.js spatial city model is a future roadmap extension. |
