import re
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.models.models import InfrastructureAsset, IncidentCluster

EMERGENCY_KEYWORDS = [
    "fire", "explosion", "spark", "hospital", "flood", "collapse", "electrocution", "danger", "urgent"
]

class IncidentPriorityEngine:
    @staticmethod
    def calculate_priority(
        severity: int,
        report_count: int,
        asset: InfrastructureAsset = None,
        description: str = ""
    ) -> Tuple[float, str, Dict[str, Any]]:
        """
        Calculates composite incident priority score in [0, 100] with full factor breakdown.
        Weights:
        - Severity (0.30)
        - Supporting report volume (0.20)
        - Asset risk & criticality (0.25)
        - Emergency keywords boost (0.25)
        """
        # 1. Severity contribution (1-5 mapped to 20-100)
        sev_raw = severity * 20.0
        w_sev = 0.30
        sev_contrib = sev_raw * w_sev

        # 2. Volume contribution (capped at 5 reports = 100)
        vol_raw = min(100.0, report_count * 20.0)
        w_vol = 0.20
        vol_contrib = vol_raw * w_vol

        # 3. Asset Risk & Criticality contribution
        asset_risk = asset.current_risk_score if asset else 30.0
        asset_crit = (asset.criticality * 20.0) if asset else 40.0
        asset_raw = (asset_risk * 0.5) + (asset_crit * 0.5)
        w_asset = 0.25
        asset_contrib = asset_raw * w_asset

        # 4. Emergency keywords boost
        lowered = description.lower()
        matched_keywords = [kw for kw in EMERGENCY_KEYWORDS if re.search(r'\b' + re.escape(kw) + r'\b', lowered)]
        emerg_raw = min(100.0, len(matched_keywords) * 35.0)
        w_emerg = 0.25
        emerg_contrib = emerg_raw * w_emerg

        total = round(sev_contrib + vol_contrib + asset_contrib + emerg_contrib, 1)
        total = min(100.0, max(0.0, total))

        if total < 35.0:
            level = "LOW"
        elif total < 65.0:
            level = "MEDIUM"
        elif total < 85.0:
            level = "HIGH"
        else:
            level = "CRITICAL"

        formula = "Priority = 0.30*Severity + 0.20*Volume + 0.25*AssetRisk + 0.25*EmergencyKeywords"
        breakdown = {
            "severity": {
                "raw_value": severity,
                "score_0_100": sev_raw,
                "weight": w_sev,
                "weighted_contrib": round(sev_contrib, 2),
                "detail": f"Report severity rating {severity}/5"
            },
            "report_volume": {
                "raw_value": report_count,
                "score_0_100": vol_raw,
                "weight": w_vol,
                "weighted_contrib": round(vol_contrib, 2),
                "detail": f"{report_count} clustered citizen reports"
            },
            "asset_risk": {
                "raw_value": round(asset_raw, 1),
                "score_0_100": round(asset_raw, 1),
                "weight": w_asset,
                "weighted_contrib": round(asset_contrib, 2),
                "detail": f"Asset '{asset.name if asset else 'Unlinked'}' risk index"
            },
            "emergency_boost": {
                "raw_value": len(matched_keywords),
                "score_0_100": emerg_raw,
                "weight": w_emerg,
                "weighted_contrib": round(emerg_contrib, 2),
                "detail": f"Matched trigger terms: {', '.join(matched_keywords) if matched_keywords else 'None'}"
            }
        }

        return total, level, {
            "formula": formula,
            "total_score": total,
            "level": level,
            "factors": breakdown
        }
