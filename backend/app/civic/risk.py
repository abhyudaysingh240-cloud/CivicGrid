from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.models.models import InfrastructureAsset, CitizenReport, GridNode, GridEdge

# Risk model weights: failure history (0.25), age (0.15), criticality (0.25), load (0.20), incident density (0.15)
WEIGHT_FAILURE_HIST = 0.25
WEIGHT_ASSET_AGE = 0.15
WEIGHT_CRITICALITY = 0.25
WEIGHT_LOAD_UTIL = 0.20
WEIGHT_INCIDENT_DENSITY = 0.15

class AssetRiskEngine:
    @staticmethod
    def calculate_risk(
        db: Session,
        asset: InfrastructureAsset
    ) -> Tuple[float, str, Dict[str, Any]]:
        """
        Calculates composite risk score in [0, 100] and maps to
        LOW, MEDIUM, HIGH, or CRITICAL.
        Returns: (total_score, risk_level, factor_breakdown)
        """
        current_year = 2026
        asset_age = max(0, current_year - asset.installation_year)
        
        # 1. Age Factor (0 - 100): assets > 30 years reach max risk
        age_score = min(100.0, (asset_age / 30.0) * 100.0)

        # 2. Criticality Factor (0 - 100): 1=20, 2=40, 3=60, 4=80, 5=100
        criticality_score = asset.criticality * 20.0

        # 3. Load Utilization Factor (0 - 100): from linked grid node if applicable
        load_util_score = 30.0  # default baseline
        if asset.grid_node_id:
            node = db.query(GridNode).filter(GridNode.id == asset.grid_node_id).first()
            if node and node.max_capacity_mw and node.max_capacity_mw > 0:
                util_ratio = (node.current_supply_mw or node.load_mw) / node.max_capacity_mw
                load_util_score = min(100.0, max(0.0, util_ratio * 100.0))

        # 4. Open Incident Density (0 - 100): number of active reports on this asset
        open_reports_count = db.query(CitizenReport).filter(
            CitizenReport.asset_id == asset.id,
            CitizenReport.status.in_(["SUBMITTED", "VERIFIED", "IN_PROGRESS"])
        ).count()
        incident_density_score = min(100.0, open_reports_count * 25.0)

        # 5. Failure History Score (0 - 100): based on previous status/incidents
        failure_hist_score = 15.0 if asset.status == "OPERATIONAL" else 85.0

        total_risk = (
            (failure_hist_score * WEIGHT_FAILURE_HIST) +
            (age_score * WEIGHT_ASSET_AGE) +
            (criticality_score * WEIGHT_CRITICALITY) +
            (load_util_score * WEIGHT_LOAD_UTIL) +
            (incident_density_score * WEIGHT_INCIDENT_DENSITY)
        )
        total_risk = round(min(100.0, max(0.0, total_risk)), 1)

        if total_risk < 30.0:
            level = "LOW"
        elif total_risk < 60.0:
            level = "MEDIUM"
        elif total_risk < 80.0:
            level = "HIGH"
        else:
            level = "CRITICAL"

        breakdown = {
            "failure_history": {
                "raw_score": failure_hist_score,
                "weight": WEIGHT_FAILURE_HIST,
                "weighted_contrib": round(failure_hist_score * WEIGHT_FAILURE_HIST, 2),
                "description": f"Asset operational status: {asset.status}"
            },
            "asset_age": {
                "raw_score": round(age_score, 1),
                "weight": WEIGHT_ASSET_AGE,
                "weighted_contrib": round(age_score * WEIGHT_ASSET_AGE, 2),
                "description": f"Installed in {asset.installation_year} ({asset_age} years in service)"
            },
            "criticality": {
                "raw_score": criticality_score,
                "weight": WEIGHT_CRITICALITY,
                "weighted_contrib": round(criticality_score * WEIGHT_CRITICALITY, 2),
                "description": f"Tier {asset.criticality}/5 asset criticality rating"
            },
            "load_utilization": {
                "raw_score": round(load_util_score, 1),
                "weight": WEIGHT_LOAD_UTIL,
                "weighted_contrib": round(load_util_score * WEIGHT_LOAD_UTIL, 2),
                "description": f"Transformer/feeder loading index: {round(load_util_score, 1)}%"
            },
            "incident_density": {
                "raw_score": incident_density_score,
                "weight": WEIGHT_INCIDENT_DENSITY,
                "weighted_contrib": round(incident_density_score * WEIGHT_INCIDENT_DENSITY, 2),
                "description": f"{open_reports_count} open reports targeting this infrastructure asset"
            }
        }

        return total_risk, level, breakdown
