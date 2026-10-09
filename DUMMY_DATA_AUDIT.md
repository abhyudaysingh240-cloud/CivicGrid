# CivicGrid Project-Wide Dummy Data & Integrity Audit (DUMMY_DATA_AUDIT.md)

**Audit Date:** 2026-10-09  
**Audit Scope:** Full codebase inspection across frontend (`frontend/src`), backend API & services (`backend/app`), fixtures (`backend/app/fixtures`), test suites (`backend/tests`, `scripts`), and configuration.

---

## 1. Classification Taxonomy

- **Class 1: Mock Application Data**: Fabricated, random, or hardcoded client-side numbers, mock feeds, or hardcoded UI users presenting as real backend telemetry.
- **Class 2: Legitimate Deterministic Simulation / Seed**: Real graph distribution topologies, electrical parameters (impedance, thermal limits), and deterministic seed scenarios computed by the backend engine and labeled `SIMULATION / DIGITAL TWIN`.
- **Class 3: Test Fixture**: Isolated unit and integration test fixtures located exclusively inside test suites.
- **Class 4: Legitimate Config**: Default environment values, ports, thresholds, or weight constants.
- **Class 5: Unverified / Needs Inspection**: Unverified external integrations or non-inspected directories.

---

## 2. Audit Findings & Remediations

| ID | Location | What It Is | Class | Presented as Real? | Risk | Fix / Remediation | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| **F-01** | `frontend/src/components/LoginModal.tsx` | Quick Seed Demo Accounts panel with hardcoded passwords (`AdminPassword123!`, etc.) | 1 | Yes | Critical: credentials bundled into public client JS bundle | Completely removed quick-seed buttons, inputs start empty, passwords burned | **RESOLVED** | Grep `dist` yielded zero hits for demo passwords |
| **F-02** | `frontend/src/components/Navbar.tsx` | Client-side operational role switch buttons allowing arbitrary escalation to ADMIN | 1 | Yes | High: UI role masquerading without backend verification | Removed role switcher; role strictly loaded from server `/auth/me` | **RESOLVED** | Verified in `Navbar.tsx` and `App.tsx` |
| **F-03** | `frontend/src/components/GridHealthBar.tsx` | FSM Grid Health bar shown on Citizen screen; 100% restoration shown when affected load was 0 MW | 1 | Yes | High: misleading metric semantics (0/0 ratio presented as 100% success) | Gated to operator roles only; updated to display `"N/A, no active fault"` | **RESOLVED** | Verified in `GridHealthBar.tsx` and `test_grid_engine.py` |
| **F-04** | `backend/app/fixtures/seed_topology.json` | Plaintext passwords stored in fixture JSON file | 1 | No | High: credential exposure in version control | Removed passwords from JSON; passwords now loaded from env or generated dynamically on seed | **RESOLVED** | `seed_topology.json` lines 692-720 cleaned |
| **F-05** | `backend/app/fixtures/seed_db.py` | Default users seeded unconditionally without flag | 2 | No | Medium: unintended demo users in production | Gated behind `SEED_DEMO_USERS=true`; credentials printed once to console | **RESOLVED** | `seed_db.py` updated and tested |
| **F-06** | `backend/app/api/v1/grid.py` | Topology and state endpoints accessible without role check | 1 | Yes | High: Citizens could query operational grid load and state | Enforced `require_role("ADMIN", "DEPARTMENT_OFFICER")` on all grid endpoints | **RESOLVED** | Pytest role matrix test passing (403 for citizen/worker) |
| **F-07** | `frontend/src/components/dashboards/CitizenPortal.tsx` | Uploaded images not labeled for model provenance | 1 | Yes | Medium: Users misled that rule-based NLP classified images | Added explicit `IMAGE NOT CLASSIFIED` badge and provenance chips | **RESOLVED** | `CitizenPortal.tsx` updated with provenance badges |
| **F-08** | `backend/app/fixtures/seed_topology.json` | 24-node Metro District electrical distribution topology | 2 | Yes (labeled SIMULATION) | Low: Engineering twin baseline | Preserved as canonical deterministic 24-node graph | **VERIFIED** | Model verified against Section 2 spec |
| **F-09** | `backend/app/core/config.py` | Weight ratios $\alpha=0.4, \beta=0.4, \gamma=0.2$ | 4 | No | None | Legitimate configurable composite cost weights | **VERIFIED** | Documented in DECISIONS.md |
| **F-10** | `backend/tests/test_auth_and_security.py` | Test user login credentials in test suite | 3 | No | None (isolated test memory DB) | Legitimate test fixtures | **VERIFIED** | Passes in isolated StaticPool in-memory SQLite |

---

## 3. Areas Inspected

- [x] `frontend/src/App.tsx` (Root orchestration, route guards, SSE handling)
- [x] `frontend/src/components/Navbar.tsx` (Navigation, authentication status)
- [x] `frontend/src/components/LoginModal.tsx` (Authentication form, credentials)
- [x] `frontend/src/components/GridHealthBar.tsx` (FSM metrics, restoration display)
- [x] `frontend/src/components/dashboards/CitizenPortal.tsx` (Citizen issue ingestion, AI labeling)
- [x] `frontend/src/components/dashboards/OfficerDashboard.tsx` (Department officer queues)
- [x] `frontend/src/components/dashboards/WorkerDashboard.tsx` (Field worker order tracking)
- [x] `frontend/src/components/dashboards/AdminDashboard.tsx` (Admin audits and user controls)
- [x] `backend/app/api/v1/auth.py` (Authentication, JWT cookies, rate limiting)
- [x] `backend/app/api/v1/grid.py` (Grid endpoints, RBAC enforcement)
- [x] `backend/app/api/v1/civic.py` (Civic report ingestion, clustering, prioritization)
- [x] `backend/app/api/v1/scenarios.py` (Scenario execution, RBAC enforcement)
- [x] `backend/app/grid/state_machine.py` (Metric semantics, restoration status)
- [x] `backend/app/fixtures/seed_db.py` & `seed_topology.json` (Seed data, password management)
- [x] `backend/app/cli.py` (Admin account creation and password reset CLI)

---

## 4. Areas NOT Inspected / Explicitly Excluded

- Third-party packages inside `.venv/` and `frontend/node_modules/`.
- Compiled frontend build artifacts in `frontend/dist/` (audited via grep, verified zero credential leaks).
- Python bytecode caches in `__pycache__/`.
