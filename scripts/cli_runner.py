import sys
import argparse
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.core.database import SessionLocal, Base, engine
from backend.app.fixtures.seed_db import seed_database
from backend.app.grid.service import GridService
from backend.app.grid.scenarios import ScenarioEngine

def main():
    parser = argparse.ArgumentParser(description="CivicGrid Command-Line Operations Tool")
    subparsers = parser.add_subparsers(dest="command", help="Operational commands")

    # Seed command
    subparsers.add_parser("seed", help="Initialize and seed database from versioned fixtures")

    # Topology status command
    subparsers.add_parser("status", help="Display current grid state and metrics")

    # Fault injection command
    fault_parser = subparsers.add_parser("fault", help="Inject line trip fault on edge")
    fault_parser.add_argument("--edge", required=True, help="Edge code to trip (e.g., LINE_BUS_N1_DP_N1)")

    # Reset command
    subparsers.add_parser("reset", help="Reset grid to healthy baseline configuration")

    # Run scenario command
    scenario_parser = subparsers.add_parser("scenario", help="Execute deterministic scenario A-E")
    scenario_parser.add_argument("--code", required=True, choices=["A", "B", "C", "D", "E"], help="Scenario code")

    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if args.command == "seed":
            seed_database(db)
            print("Successfully initialized and seeded database.")

        elif args.command == "status":
            top = GridService.get_topology(db)
            st = top["state"]
            print("\n=== CIVICGRID TOPOLOGY STATUS ===")
            print(f"State: {st.state_enum}")
            print(f"Total Load: {st.total_load_mw:.2f} MW")
            print(f"Affected Load: {st.affected_load_mw:.2f} MW")
            print(f"Restored Load: {st.restored_load_mw:.2f} MW")
            print(f"Restoration %: {st.restoration_pct:.1f}%")
            print(f"Islands Detected: {len(top['islands'])}")
            print("=================================\n")

        elif args.command == "fault":
            print(f"Injecting fault on edge '{args.edge}'...")
            res = GridService.inject_fault(db, args.edge)
            print(f"Fault Verdict: {res.get('verdict')}")
            st = res.get("state")
            print(f"New State: {st.state_enum} | Restored: {st.restored_load_mw:.2f} MW / {st.affected_load_mw:.2f} MW ({st.restoration_pct:.1f}%)")

        elif args.command == "reset":
            st = GridService.reset_to_healthy_baseline(db)
            print(f"Grid reset complete. State: {st.state_enum}")

        elif args.command == "scenario":
            print(f"Executing Scenario {args.code}...")
            res = ScenarioEngine.run_scenario(db, args.code)
            print(f"Scenario Outcome: {res.get('verdict')}")
            st = res.get("state")
            if st:
                print(f"State: {st.state_enum} | Restoration: {st.restoration_pct:.1f}%")
            print(f"Expected: {res['scenario']['expected_outcome']}")

        else:
            parser.print_help()

    finally:
        db.close()

if __name__ == "__main__":
    main()
