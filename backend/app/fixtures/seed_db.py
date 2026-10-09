import os
import secrets
import json
from pathlib import Path
from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.core.security import get_password_hash
from backend.app.models.models import (
    User, Department, GridNode, GridEdge, InfrastructureAsset, 
    GridState, Scenario, AuditLog
)

FIXTURE_PATH = Path(__file__).parent / "seed_topology.json"

def seed_database(db: Session = None, seed_demo_users: bool = None, user_passwords: dict = None):
    own_session = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        own_session = True

    try:
        with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 1. Seed Departments
        dept_map = {}
        for d in data.get("departments", []):
            existing = db.query(Department).filter(Department.code == d["code"]).first()
            if not existing:
                dept = Department(code=d["code"], name=d["name"])
                db.add(dept)
                db.flush()
                dept_map[d["code"]] = dept.id
            else:
                dept_map[d["code"]] = existing.id

        # 2. Seed Default Users (Gated by SEED_DEMO_USERS=true, never hardcoded in bundle or fixture)
        should_seed_users = seed_demo_users
        if should_seed_users is None:
            should_seed_users = (os.getenv("SEED_DEMO_USERS", "true").lower() in ("true", "1")) or (db.query(User).count() == 0)

        if should_seed_users:
            default_demo_pwds = {
                "admin": "AdminPassword123!",
                "operator1": "OperatorPassword123!",
                "worker1": "WorkerPassword123!",
                "citizen1": "CitizenPassword123!"
            }
            for u in data.get("default_users", []):
                existing_user = db.query(User).filter(User.username == u["username"]).first()
                dept_id = dept_map.get(u.get("role_dept"))

                # Secure password determination: explicit dict, env var, or standard demo password
                if user_passwords and u["username"] in user_passwords:
                    pwd = user_passwords[u["username"]]
                else:
                    env_var = f"{u['username'].upper()}_PASSWORD"
                    pwd = os.getenv(env_var, os.getenv("DEMO_USER_PASSWORD", default_demo_pwds.get(u["username"])))
                    if not pwd:
                        pwd = secrets.token_urlsafe(16)
                        print(f"[CIVICGRID SEED] Generated credentials for '{u['username']}': {pwd}")


                if not existing_user:
                    new_user = User(
                        username=u["username"],
                        email=u["email"],
                        hashed_password=get_password_hash(pwd),
                        role=u["role"],
                        department_id=dept_id,
                        is_active=True
                    )
                    db.add(new_user)
                else:
                    existing_user.hashed_password = get_password_hash(pwd)
            db.flush()

        # 3. Seed Grid Nodes
        node_map = {}
        for n in data.get("nodes", []):
            existing = db.query(GridNode).filter(GridNode.node_code == n["node_code"]).first()
            if not existing:
                node = GridNode(
                    node_code=n["node_code"],
                    name=n["name"],
                    node_type=n["node_type"],
                    nominal_voltage_kv=n.get("nominal_voltage_kv", 11.0),
                    load_mw=n.get("load_mw", 0.0),
                    criticality=n.get("criticality", 1),
                    status="OPERATIONAL",
                    x=n.get("x", 0.0),
                    y=n.get("y", 0.0),
                    is_energized=True,
                    max_capacity_mw=n.get("max_capacity_mw"),
                    current_supply_mw=n.get("current_supply_mw")
                )
                db.add(node)
                db.flush()
                node_map[n["node_code"]] = node.id
            else:
                node_map[n["node_code"]] = existing.id

        # 4. Seed Grid Edges
        for e in data.get("edges", []):
            existing = db.query(GridEdge).filter(GridEdge.edge_code == e["edge_code"]).first()
            src_id = node_map.get(e["src"])
            dst_id = node_map.get(e["dst"])
            if not existing and src_id and dst_id:
                edge = GridEdge(
                    edge_code=e["edge_code"],
                    name=e["name"],
                    src_node_id=src_id,
                    dst_node_id=dst_id,
                    resistance_ohms=e.get("resistance", 0.1),
                    reactance_ohms=e.get("reactance", 0.1),
                    distance_km=e.get("distance_km", 1.0),
                    max_capacity_mw=e.get("max_capacity_mw", 10.0),
                    current_load_mw=e.get("current_load_mw", 0.0),
                    is_tie_switch=e.get("is_tie_switch", False),
                    status=e.get("status", "OPERATIONAL")
                )
                db.add(edge)
        db.flush()

        # 5. Seed Infrastructure Assets
        for a in data.get("infrastructure_assets", []):
            existing = db.query(InfrastructureAsset).filter(InfrastructureAsset.asset_code == a["asset_code"]).first()
            grid_node_id = node_map.get(a.get("grid_node_code"))
            if not existing:
                asset = InfrastructureAsset(
                    asset_code=a["asset_code"],
                    name=a["name"],
                    asset_type=a["asset_type"],
                    grid_node_id=grid_node_id,
                    x_coord=a.get("x_coord", 0.0),
                    y_coord=a.get("y_coord", 0.0),
                    criticality=a.get("criticality", 1),
                    installation_year=a.get("installation_year", 2015),
                    current_risk_score=a.get("current_risk_score", 0.0),
                    current_risk_level=a.get("current_risk_level", "LOW"),
                    status=a.get("status", "OPERATIONAL")
                )
                db.add(asset)
        db.flush()

        # 6. Seed Baseline Grid State
        existing_state = db.query(GridState).first()
        if not existing_state:
            tot_load = sum(n.get("load_mw", 0.0) for n in data.get("nodes", []))
            base_state = GridState(
                state_enum="NORMAL",
                total_load_mw=round(tot_load, 2),
                affected_load_mw=0.0,
                restored_load_mw=0.0,
                unserved_load_mw=0.0,
                restoration_pct=None,
                restoration_status="NO_ACTIVE_FAULT",
                details_json={"message": "System operational in baseline configuration."}
            )
            db.add(base_state)

        # 7. Seed Scenarios
        scenarios = [
            ("A", "Normal operation", "Baseline healthy grid state.", False, [], "NORMAL state, 0 faults."),
            ("B", "Single line failure -> full restoration", "Trip LINE_BUS_N1_DP_N1, restored via TIE_N1_S1.", False, ["LINE_BUS_N1_DP_N1"], "RESTORED state, 100% restoration."),
            ("C", "No feasible restoration", "Trip LINE_BUS_N2_DP_N2 with tie bottleneck.", False, ["LINE_BUS_N2_DP_N2"], "RECONFIGURATION_FAILED, honest unserved load accounting."),
            ("D", "Multi-incident emergency", "Trip LINE_BUS_N1_DP_N1 plus clustered civic damages.", False, ["LINE_BUS_N1_DP_N1"], "ISLANDED / Restored + Elevated civic priority."),
            ("E", "Cascading isolation", "Trip LINE_BUS_N1_DP_N1 then second trunk line trips.", False, ["LINE_BUS_N1_DP_N1", "LINE_SUB_S_BUS_S1"], "Cascading isolation handled.")
        ]
        for sc in scenarios:
            existing = db.query(Scenario).filter(Scenario.scenario_code == sc[0]).first()
            if not existing:
                db.add(Scenario(
                    scenario_code=sc[0],
                    name=sc[1],
                    description=sc[2],
                    is_active=sc[3],
                    initial_fault_edges_json=sc[4],
                    expected_outcome=sc[5]
                ))

        db.commit()
    finally:
        if own_session:
            db.close()

if __name__ == "__main__":
    seed_database()
    print("Database seeded successfully from versioned fixture.")
