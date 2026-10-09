import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.database import Base
from backend.app.fixtures.seed_db import seed_database
from backend.app.civic.classifier import CivicClassifier
from backend.app.civic.clustering import compute_tfidf_similarity, CivicClusteringEngine
from backend.app.civic.risk import AssetRiskEngine
from backend.app.civic.priority import IncidentPriorityEngine
from backend.app.models.models import InfrastructureAsset, CitizenReport, User, Department

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    seed_database(db)
    yield db
    db.close()

def test_nlp_text_classification_rules():
    cat, dept, conf, src = CivicClassifier.classify_text("There are dangerous sparks flying from the distribution transformer cable!")
    assert cat == "electrical"
    assert dept == "ELEC"
    assert conf >= 0.75
    assert src == "RULE_BASED_FALLBACK"

    cat2, dept2, conf2, src2 = CivicClassifier.classify_text("Severe water pipe rupture flooding the main street.")
    assert cat2 == "water leakage"
    assert dept2 == "WATER"

def test_tfidf_clustering_similarity():
    text1 = "Transformer vault is smoking and throwing sparks near the hospital entrance."
    text2 = "Sparking transformer vault and heavy smoke outside hospital entrance."
    sim = compute_tfidf_similarity(text1, text2)
    assert sim >= 0.70  # strong semantic overlap

    unrelated = "Water leak in residential bathroom"
    sim_unrelated = compute_tfidf_similarity(text1, unrelated)
    assert sim_unrelated < 0.20

def test_asset_risk_calculation(test_db):
    asset = test_db.query(InfrastructureAsset).filter(InfrastructureAsset.asset_code == "ASSET_DP_N2").first()
    assert asset is not None
    score, level, breakdown = AssetRiskEngine.calculate_risk(test_db, asset)
    assert 0.0 <= score <= 100.0
    assert level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert "failure_history" in breakdown
    assert "asset_age" in breakdown
    assert "criticality" in breakdown
    assert "load_utilization" in breakdown
    assert "incident_density" in breakdown

def test_incident_priority_calculation():
    score, level, breakdown = IncidentPriorityEngine.calculate_priority(
        severity=5,
        report_count=3,
        asset=None,
        description="Urgent hospital blackout risk from fire!"
    )
    assert score > 60.0  # high severity + emergency keywords + multiple reports
    assert "factors" in breakdown
    assert "severity" in breakdown["factors"]
    assert "emergency_boost" in breakdown["factors"]
