# CivicGrid: Intelligent Urban Infrastructure Monitoring & Self-Healing Grid

CivicGrid is a mission-critical digital twin platform pairing a graph-theoretic distribution grid engine (islanding detection, Dijkstra/A* composite cost restoration, thermal & capacity feasibility) with a civic intelligence awareness layer (citizen report ingestion, zero-shot/fallback NLP, spatial & TF-IDF duplicate clustering, asset risk and incident prioritization).

---

## 1. Quick Start & Environment Bring-Up

### Prerequisites
- Python 3.10+ (installed on system)
- Node.js 18+ & npm (portable or system installed)
- Optional: Docker / Docker Compose for PostgreSQL (`docker-compose up -d db`)

### A. Backend Setup
```powershell
# 1. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r backend\requirements.txt

# 3. Initialize environment file (local SQLite default)
Copy-Item .env.example .env

# 4. Run database migrations and seed fixtures
alembic upgrade head
python scripts\cli_runner.py seed

# 5. Start FastAPI Backend (Port 8000)
uvicorn backend.app.main:app --reload --port 8000
```

### B. Frontend Setup
```powershell
# 1. Build and verify frontend
npm run build --prefix frontend

# 2. Start Vite Development Server (Port 5173)
npm run dev --prefix frontend
```

---

## 2. Verification & Test Commands

### Pytest Unit & Integration Suite
```powershell
.\.venv\Scripts\pytest.exe -v
```
*Executes all 14 unit and integration tests across auth/security, civic intelligence, and smart grid graph algorithms.*

### End-to-End Acceptance Pipeline (Section 12 Criteria)
```powershell
.\.venv\Scripts\python.exe scripts\run_acceptance.py
```
*Validates the full vertical stack: Registration, JWT cookies, RBAC, NLP classification, TF-IDF clustering, IDOR defense, Fault injection, Island detection, Dijkstra restoration, Infeasible overload handling (Scenario C), and Immutable audit logs.*

### CLI Runner Operations
```powershell
# Check current grid topology and metrics
.\.venv\Scripts\python.exe scripts\cli_runner.py status

# Reset grid to healthy baseline configuration
.\.venv\Scripts\python.exe scripts\cli_runner.py reset

# Inject a manual branch trip fault
.\.venv\Scripts\python.exe scripts\cli_runner.py fault --edge LINE_BUS_N1_DP_N1

# Run deterministic scenarios (A, B, C, D, E)
.\.venv\Scripts\python.exe scripts\cli_runner.py scenario --code B
.\.venv\Scripts\python.exe scripts\cli_runner.py scenario --code C
```

---

## 3. Seeded Test Credentials

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **Admin** | `admin` | `AdminPassword123!` | System configuration, scenario injections, audit logs |
| **Department Officer** | `operator1` | `OperatorPassword123!` | Grid topology control, triage, work order assignment |
| **Field Worker** | `worker1` | `WorkerPassword123!` | Assigned maintenance orders, status progression |
| **Citizen** | `citizen1` | `CitizenPassword123!` | Incident reporting, public grid health monitoring |

---

## 4. Architecture & Engineering References
- [Architecture Specifications](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Entity-Relationship Diagram & Constraints](docs/ERD.md)
- [Architectural Decisions Log (DECISIONS.md)](DECISIONS.md)
- [Truth in Engineering Ledger (CLAIMS.md)](CLAIMS.md)
- [Phase Progress Tracker (PROGRESS.md)](PROGRESS.md)
