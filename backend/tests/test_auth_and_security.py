import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from sqlalchemy.pool import StaticPool
from backend.app.main import app
from backend.app.core.database import Base, get_db
from backend.app.fixtures.seed_db import seed_database
from backend.app.models.models import User, CitizenReport, AuditLog

from backend.app.api.v1.auth import _failed_login_attempts

# In-memory database with StaticPool for security tests
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def init_db():
    _failed_login_attempts.clear()
    Base.metadata.create_all(bind=test_engine)
    db = TestingSession()
    seed_database(db, seed_demo_users=True, user_passwords={
        "admin": "AdminPassword123!",
        "operator1": "OperatorPassword123!",
        "worker1": "WorkerPassword123!",
        "citizen1": "CitizenPassword123!"
    })
    db.close()
    yield
    _failed_login_attempts.clear()
    Base.metadata.drop_all(bind=test_engine)

client = TestClient(app)

def test_user_registration_and_login():
    # Register citizen
    reg_resp = client.post("/api/v1/auth/register", json={
        "username": "newcitizen",
        "email": "newcitizen@example.com",
        "password": "SecurePassword123!"
    })
    assert reg_resp.status_code == 201
    assert reg_resp.json()["username"] == "newcitizen"
    assert reg_resp.json()["role"] == "CITIZEN"

    # Login
    login_resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "newcitizen",
        "password": "SecurePassword123!"
    })
    assert login_resp.status_code == 200
    assert "civicgrid_access_token" in login_resp.cookies

def test_login_wrong_password_generic_error():
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "WrongPassword999!"
    })
    assert resp.status_code == 401
    assert "Invalid username or password" in resp.json()["detail"]

def test_register_role_escalation_ignored():
    # Attempting to supply role: ADMIN in body must still create CITIZEN
    reg_resp = client.post("/api/v1/auth/register", json={
        "username": "sneaky_admin",
        "email": "sneaky@example.com",
        "password": "SecurePassword123!",
        "role": "ADMIN"
    })
    assert reg_resp.status_code == 201
    assert reg_resp.json()["role"] == "CITIZEN"

def test_logout_invalidates_session():
    # Login as citizen1
    login_resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "citizen1",
        "password": "CitizenPassword123!"
    })
    cookies = login_resp.cookies
    assert "civicgrid_access_token" in cookies

    # Verify session is valid
    me_resp = client.get("/api/v1/auth/me", cookies=cookies)
    assert me_resp.status_code == 200

    # Logout
    logout_resp = client.post("/api/v1/auth/logout", cookies=cookies)
    assert logout_resp.status_code == 200

    # Cookie cleared in response
    assert logout_resp.cookies.get("civicgrid_access_token") is None or logout_resp.cookies.get("civicgrid_access_token") == ""

def test_unauthenticated_request_blocked():
    # Request without cookies to protected route
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401

def test_rbac_admin_guard():
    # Citizen login
    client.post("/api/v1/auth/login", json={
        "username_or_email": "citizen1",
        "password": "CitizenPassword123!"
    })

    # Try to access admin audit logs -> Must be 403 Forbidden
    audit_resp = client.get("/api/v1/admin/audit-logs")
    assert audit_resp.status_code == 403
    assert "Access forbidden" in audit_resp.json()["detail"]

def test_idor_protection():
    # Admin creates a report for admin
    db = TestingSession()
    admin_user = db.query(User).filter(User.username == "admin").first()
    admin_report = CitizenReport(
        user_id=admin_user.id,
        department_id=1,
        category="electrical",
        description="Confidential substation security alert",
        severity=5,
        priority_score=90.0,
        priority_level="CRITICAL"
    )
    db.add(admin_report)
    db.commit()
    report_id = admin_report.id
    db.close()

    # Login as citizen1
    client.post("/api/v1/auth/login", json={
        "username_or_email": "citizen1",
        "password": "CitizenPassword123!"
    })

    # Citizen tries to read admin's report -> Must be 403 Forbidden (IDOR prevented)
    resp = client.get(f"/api/v1/civic/reports/{report_id}")
    assert resp.status_code == 403
    assert "Forbidden" in resp.json()["detail"]

def test_grid_endpoints_role_matrix():
    # 1. Citizen login
    cit_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "citizen1",
        "password": "CitizenPassword123!"
    })
    cit_cookies = cit_login.cookies

    # Citizen accessing grid endpoints -> Must all be 403 Forbidden
    assert client.get("/api/v1/grid/topology", cookies=cit_cookies).status_code == 403
    assert client.get("/api/v1/grid/state", cookies=cit_cookies).status_code == 403
    assert client.get("/api/v1/grid/events", cookies=cit_cookies).status_code == 403
    assert client.get("/api/v1/grid/why-restoration", cookies=cit_cookies).status_code == 403
    assert client.get("/api/v1/scenarios", cookies=cit_cookies).status_code == 403

    # 2. Worker login
    wrk_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "worker1",
        "password": "WorkerPassword123!"
    })
    wrk_cookies = wrk_login.cookies
    assert client.get("/api/v1/grid/topology", cookies=wrk_cookies).status_code == 403
    assert client.get("/api/v1/scenarios", cookies=wrk_cookies).status_code == 403

    # 3. Operator (Department Officer) login
    op_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "operator1",
        "password": "OperatorPassword123!"
    })
    op_cookies = op_login.cookies
    assert client.get("/api/v1/grid/topology", cookies=op_cookies).status_code == 200
    assert client.get("/api/v1/grid/state", cookies=op_cookies).status_code == 200
    assert client.get("/api/v1/scenarios", cookies=op_cookies).status_code == 200

    # 4. Admin login
    adm_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "AdminPassword123!"
    })
    adm_cookies = adm_login.cookies
    assert client.get("/api/v1/grid/topology", cookies=adm_cookies).status_code == 200

def test_login_rate_limiting():
    # Attempt 5 failed logins with invalid password
    for _ in range(5):
        client.post("/api/v1/auth/login", json={
            "username_or_email": "nonexistent_rate_test",
            "password": "InvalidPassword!"
        })

    # The 6th attempt must be rejected with 429 Too Many Requests
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "nonexistent_rate_test",
        "password": "InvalidPassword!"
    })
    assert resp.status_code == 429
    assert "Too many failed login attempts" in resp.json()["detail"]

def test_audit_logging():
    # Login as admin
    client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "AdminPassword123!"
    })

    # Check audit logs exist
    db = TestingSession()
    logs = db.query(AuditLog).all()
    assert len(logs) > 0
    db.close()

def test_field_worker_assignments_and_idor():
    # 1. Login as operator1 (DEPARTMENT_OFFICER)
    op_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "operator1",
        "password": "OperatorPassword123!"
    })
    op_cookies = op_login.cookies
    csrf_token = op_cookies.get("civicgrid_csrf_token", "")

    # Officer lists workers
    workers_resp = client.get("/api/v1/civic/assignments/workers", cookies=op_cookies)
    assert workers_resp.status_code == 200
    workers = workers_resp.json()
    assert any(w["username"] == "worker1" for w in workers)
    worker1_id = next(w["id"] for w in workers if w["username"] == "worker1")

    # Officer creates an assignment
    assign_resp = client.post(
        "/api/v1/civic/assignments",
        json={"assigned_to_user_id": worker1_id, "notes": "Check transformer T-1"},
        cookies=op_cookies,
        headers={"X-CSRF-Token": csrf_token}
    )
    assert assign_resp.status_code == 201
    assignment_id = assign_resp.json()["id"]

    # 2. Login as worker1
    w1_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "worker1",
        "password": "WorkerPassword123!"
    })
    w1_cookies = w1_login.cookies
    w1_csrf = w1_cookies.get("civicgrid_csrf_token", "")

    # Worker1 fetches their assignments
    my_resp = client.get("/api/v1/civic/assignments/my", cookies=w1_cookies)
    assert my_resp.status_code == 200
    my_tasks = my_resp.json()
    assert any(t["id"] == assignment_id for t in my_tasks)

    # Worker1 updates status to EN_ROUTE then COMPLETED
    status_resp = client.patch(
        f"/api/v1/civic/assignments/{assignment_id}/status",
        json={"status": "EN_ROUTE"},
        cookies=w1_cookies,
        headers={"X-CSRF-Token": w1_csrf}
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "EN_ROUTE"

    # 3. Create another worker (worker2) and test IDOR
    db = TestingSession()
    from backend.app.core.security import get_password_hash
    worker2 = User(
        username="worker2",
        email="worker2@example.com",
        hashed_password=get_password_hash("Worker2Password123!"),
        role="FIELD_WORKER",
        is_active=True
    )
    db.add(worker2)
    db.commit()
    db.close()

    w2_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "worker2",
        "password": "Worker2Password123!"
    })
    w2_cookies = w2_login.cookies
    w2_csrf = w2_cookies.get("civicgrid_csrf_token", "")

    # Worker2 attempts to mutate Worker1's assignment -> Must be 403 Forbidden (IDOR)
    idor_resp = client.patch(
        f"/api/v1/civic/assignments/{assignment_id}/status",
        json={"status": "COMPLETED"},
        cookies=w2_cookies,
        headers={"X-CSRF-Token": w2_csrf}
    )
    assert idor_resp.status_code == 403
    assert "Forbidden" in idor_resp.json()["detail"]

    # 4. Citizen attempting to access worker endpoints -> 403
    cit_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "citizen1",
        "password": "CitizenPassword123!"
    })
    assert client.get("/api/v1/civic/assignments/my", cookies=cit_login.cookies).status_code == 403
    assert client.get("/api/v1/civic/assignments/workers", cookies=cit_login.cookies).status_code == 403

def test_admin_system_health_and_role_management():
    # 1. Login as admin
    adm_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "AdminPassword123!"
    })
    adm_cookies = adm_login.cookies
    adm_csrf = adm_cookies.get("civicgrid_csrf_token", "")

    # Admin fetches system health
    health_resp = client.get("/api/v1/admin/system-health", cookies=adm_cookies)
    assert health_resp.status_code == 200
    health_data = health_resp.json()
    assert health_data["db_connected"] is True
    assert health_data["total_users"] > 0
    assert "active_grid_state" in health_data

    # Admin fetches departments
    depts_resp = client.get("/api/v1/admin/departments", cookies=adm_cookies)
    assert depts_resp.status_code == 200
    assert len(depts_resp.json()) > 0

    # Admin lists users
    users_resp = client.get("/api/v1/admin/users", cookies=adm_cookies)
    assert users_resp.status_code == 200
    users = users_resp.json()
    target_user = next(u for u in users if u["username"] == "citizen1")

    # Admin updates user role
    role_resp = client.patch(
        f"/api/v1/admin/users/{target_user['id']}/role",
        json={"role": "FIELD_WORKER"},
        cookies=adm_cookies,
        headers={"X-CSRF-Token": adm_csrf}
    )
    assert role_resp.status_code == 200
    assert role_resp.json()["role"] == "FIELD_WORKER"

    # 2. Non-admin access control
    cit_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "operator1",
        "password": "OperatorPassword123!"
    })
    assert client.get("/api/v1/admin/system-health", cookies=cit_login.cookies).status_code == 403
    assert client.get("/api/v1/admin/users", cookies=cit_login.cookies).status_code == 403

def test_citizen_report_submission_and_isolation():
    # 1. Login as citizen1
    c1_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "citizen1",
        "password": "CitizenPassword123!"
    })
    c1_cookies = c1_login.cookies
    c1_csrf = c1_cookies.get("civicgrid_csrf_token", "")

    # Submit a citizen report
    rep_resp = client.post(
        "/api/v1/civic/reports",
        data={"description": "Large water leak near Main St pump station", "severity": "3"},
        cookies=c1_cookies,
        headers={"X-CSRF-Token": c1_csrf}
    )
    assert rep_resp.status_code == 201
    c1_report_id = rep_resp.json()["id"]

    # Citizen1 sees own report in list
    c1_list = client.get("/api/v1/civic/reports", cookies=c1_cookies).json()
    assert any(r["id"] == c1_report_id for r in c1_list)

    # 2. Register new citizen2
    client.post("/api/v1/auth/register", json={
        "username": "citizen2",
        "email": "citizen2@example.com",
        "password": "Citizen2Password123!"
    })
    c2_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "citizen2",
        "password": "Citizen2Password123!"
    })
    c2_cookies = c2_login.cookies

    # Citizen2 list reports -> Should NOT contain citizen1's report
    c2_list = client.get("/api/v1/civic/reports", cookies=c2_cookies).json()
    assert not any(r["id"] == c1_report_id for r in c2_list)

    # Citizen2 direct fetch of Citizen1's report -> 403 Forbidden (IDOR)
    idor_rep = client.get(f"/api/v1/civic/reports/{c1_report_id}", cookies=c2_cookies)
    assert idor_rep.status_code == 403
    assert "Forbidden" in idor_rep.json()["detail"]

    # 3. Officer has full operational visibility
    op_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "operator1",
        "password": "OperatorPassword123!"
    })
    op_rep = client.get(f"/api/v1/civic/reports/{c1_report_id}", cookies=op_login.cookies)
    assert op_rep.status_code == 200
    assert op_rep.json()["id"] == c1_report_id

