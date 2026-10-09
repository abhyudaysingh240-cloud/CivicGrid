import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.database import Base
from backend.app.fixtures.seed_db import seed_database
from backend.app.grid.graph_model import GridGraph
from backend.app.grid.islanding import detect_islands
from backend.app.grid.service import GridService
from backend.app.grid.scenarios import ScenarioEngine
from backend.app.grid.state_machine import GridStateMachine

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    seed_database(db)
    yield db
    db.close()

def test_connectivity_and_graph_build(test_db):
    grid = GridGraph().build_from_db(test_db)
    assert len(grid.graph.nodes) == 24
    assert len(grid.graph.edges) == 25
    assert len(grid.substations) == 3
    assert grid.total_network_load() > 30.0

def test_island_detection_healthy(test_db):
    grid = GridGraph().build_from_db(test_db)
    islands = detect_islands(grid)
    # Healthy grid has no isolated subgraphs
    assert len(islands) == 0

def test_island_detection_after_fault(test_db):
    res = GridService.inject_fault(test_db, "LINE_BUS_N1_DP_N1")
    # Should detect island and self-heal via tie switch TIE_N1_S1
    assert res["verdict"] == "RESTORED"
    assert res["state"].state_enum == "RESTORED"
    assert res["state"].restoration_pct == 100.0
    assert res["state"].restored_load_mw > 0.0

def test_no_feasible_path_scenario_c(test_db):
    res = ScenarioEngine.run_scenario(test_db, "C")
    assert res["verdict"] == "RECONFIGURATION_FAILED"
    st = res["state"]
    st_enum = st["state_enum"] if isinstance(st, dict) else st.state_enum
    unserved = st["unserved_load_mw"] if isinstance(st, dict) else st.unserved_load_mw
    assert st_enum == "RECONFIGURATION_FAILED"
    assert unserved > 0.0

def test_illegal_state_transition(test_db):
    with pytest.raises(ValueError) as excinfo:
        # Cannot transition directly from NORMAL to RESTORED without fault or analyzing
        GridStateMachine.transition_to(test_db, "RESTORED", reason="Invalid jump")
    assert "Illegal state transition" in str(excinfo.value)

def test_scenario_reproducibility(test_db):
    # Running Scenario B twice must yield identical deterministic outputs
    res1 = ScenarioEngine.run_scenario(test_db, "B")
    st1 = res1["state"]
    state1_pct = st1["restoration_pct"] if isinstance(st1, dict) else st1.restoration_pct
    state1_restored = st1["restored_load_mw"] if isinstance(st1, dict) else st1.restored_load_mw

    res2 = ScenarioEngine.run_scenario(test_db, "B")
    st2 = res2["state"]
    state2_pct = st2["restoration_pct"] if isinstance(st2, dict) else st2.restoration_pct
    state2_restored = st2["restored_load_mw"] if isinstance(st2, dict) else st2.restored_load_mw

    assert state1_pct == state2_pct == 100.0
    assert state1_restored == state2_restored

def test_metric_semantics_affected_zero(test_db):
    # Baseline healthy grid has 0 affected load: restoration_pct must be None and status NO_ACTIVE_FAULT
    st = GridStateMachine.get_current_state(test_db)
    assert st.affected_load_mw == 0.0
    assert st.restoration_pct is None
    assert st.restoration_status == "NO_ACTIVE_FAULT"

def test_metric_semantics_partial_full_failed(test_db):
    # Transition to FAULT_DETECTED with 10 MW affected
    st_fault = GridStateMachine.transition_to(
        test_db, "FAULT_DETECTED", reason="Fault injected",
        total_load=33.0, affected_load=10.0, restored_load=0.0, unserved_load=10.0
    )
    assert st_fault.affected_load_mw == 10.0
    assert st_fault.restoration_pct == 0.0
    assert st_fault.restoration_status == "FAILED"

    # Transition through ANALYZING to RECONFIGURING
    GridStateMachine.transition_to(test_db, "ANALYZING", reason="Analyzing paths")
    GridStateMachine.transition_to(test_db, "RECONFIGURING", reason="Closing tie")

    # Partial restoration (5 of 10 MW restored)
    st_part = GridStateMachine.transition_to(
        test_db, "RESTORED", reason="Partial restoration",
        total_load=33.0, affected_load=10.0, restored_load=5.0, unserved_load=5.0
    )
    assert st_part.restoration_pct == 50.0
    assert st_part.restoration_status == "PARTIAL"

    # Reset to normal
    st_norm = GridStateMachine.transition_to(test_db, "NORMAL", reason="Grid reset")
    assert st_norm.affected_load_mw == 0.0
    assert st_norm.restoration_pct is None
    assert st_norm.restoration_status == "NO_ACTIVE_FAULT"

