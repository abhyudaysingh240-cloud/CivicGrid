# CivicGrid API Reference

All API endpoints are prefixed with `/api/v1`. Authentication uses HTTP-only SameSite cookies containing JWT tokens along with CSRF protection headers (`X-CSRF-Token`).

---

## 1. Authentication & Identity (`/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new citizen user account. |
| `POST` | `/auth/login` | Public | Authenticate user, set secure HTTP-only JWT cookie & CSRF cookie. |
| `POST` | `/auth/logout` | Authenticated | Invalidate auth cookie session and record audit event. |
| `GET` | `/auth/me` | Authenticated | Return authenticated user profile and assigned role. |
| `GET` | `/auth/csrf` | Public | Retrieve CSRF token for request signing. |

---

## 2. Smart Grid Engine (`/grid`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/grid/topology` | Authenticated | Retrieve complete digital-twin topology (nodes, edges, energization, current metrics). |
| `POST` | `/grid/fault` | `ADMIN`, `DEPARTMENT_OFFICER` | Inject a line trip fault on specified edge. Triggers islanding and auto-restoration analysis. |
| `POST` | `/grid/restore` | `ADMIN`, `DEPARTMENT_OFFICER` | Manually execute restoration reconfiguration if in `ISLANDED` or `ANALYZING` state. |
| `POST` | `/grid/reset` | `ADMIN` | Reset grid topology to baseline healthy operational state. |
| `GET` | `/grid/state` | Authenticated | Current finite state machine status and quantitative metrics. |
| `GET` | `/grid/events` | Authenticated | Chronological feed of grid events and trips. |
| `GET` | `/grid/stream` | Authenticated | Server-Sent Events (SSE) stream for real-time state synchronization. |
| `GET` | `/grid/why-restoration` | Authenticated | In-depth breakdown of Dijkstra candidate paths, costs, and feasibility verdicts. |

---

## 3. Pre-Configured Scenarios (`/scenarios`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/scenarios` | Authenticated | List all deterministic scenarios (A, B, C, D, E) and their expected outcomes. |
| `POST` | `/scenarios/{code}/run` | `ADMIN` | Run scenario (A: Normal, B: Single Fault, C: Infeasible, D: Multi-incident, E: Cascading). |

---

## 4. Civic Situational Intelligence (`/civic`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/civic/reports` | `CITIZEN`, `ADMIN` | Submit citizen incident report with optional image attachment. Runs NLP and clustering. |
| `GET` | `/civic/reports` | Authenticated | List incident reports (Citizens see own; Officers/Admin see all). |
| `GET` | `/civic/reports/{id}` | Authenticated | Get detailed report with classification confidence and priority breakdown. |
| `PATCH` | `/civic/reports/{id}/status`| `DEPARTMENT_OFFICER`, `ADMIN` | Update report status (`VERIFIED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`). |
| `GET` | `/civic/clusters` | `DEPARTMENT_OFFICER`, `ADMIN` | View report clusters aggregated by asset/distance and TF-IDF similarity. |
| `GET` | `/civic/why-clustering/{id}`| `DEPARTMENT_OFFICER`, `ADMIN` | Inspect clustering mathematical rationale (text similarity scores, distance). |
| `GET` | `/civic/assets` | Authenticated | List infrastructure assets with dynamic risk scores and maintenance statuses. |
| `GET` | `/civic/why-risk/{asset_id}`| Authenticated | Inspect asset risk breakdown (failure history, age, load util, open incidents). |
| `GET` | `/civic/why-priority/{id}` | Authenticated | Inspect incident priority formula weights and contributing variables. |

---

## 5. Field Assignments & Workflow (`/civic/assignments`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/civic/assignments` | `DEPARTMENT_OFFICER`, `ADMIN` | Dispatch a field worker to an incident or cluster. |
| `GET` | `/civic/assignments/my` | `FIELD_WORKER` | Retrieve tasks assigned to the authenticated field worker. |
| `PATCH`| `/civic/assignments/{id}/status`| `FIELD_WORKER`, `ADMIN` | Update field assignment status (`EN_ROUTE`, `ON_SITE`, `COMPLETED`). |

---

## 6. Audit & Administration (`/admin`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/admin/audit-logs` | `ADMIN` | Filter and view immutable audit logs. |
| `GET` | `/admin/users` | `ADMIN` | List registered system users. |
| `PATCH`| `/admin/users/{id}/role` | `ADMIN` | Modify user role with audit logging. |
