import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from sqlalchemy.pool import StaticPool
from backend.app.main import app
from backend.app.core.database import Base, get_db
from backend.app.fixtures.seed_db import seed_database
from backend.app.models.models import User, CitizenReport, AuditLog

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
    Base.metadata.create_all(bind=test_engine)
    db = TestingSession()
    seed_database(db)
    db.close()
    yield
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
    dept = db.query(User).first()
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
