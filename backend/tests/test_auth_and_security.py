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
