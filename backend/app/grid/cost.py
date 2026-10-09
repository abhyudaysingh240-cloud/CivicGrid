from typing import List, Dict, Any
from backend.app.core.config import settings

def compute_composite_cost(
    resistance: float,
    current_load: float,
    max_capacity: float,
    distance_km: float,
    r_min: float,
    r_max: float,
    d_min: float,
    d_max: float,
    alpha: float = settings.GRID_ALPHA_RESISTANCE,
    beta: float = settings.GRID_BETA_LOAD_RATIO,
    gamma: float = settings.GRID_GAMMA_DISTANCE
) -> tuple[float, Dict[str, float]]:
    """
    Computes composite restoration edge cost:
    Cost(e) = alpha * norm_resistance + beta * (current_load / max_capacity) + gamma * norm_distance
    
    NOTE: As required by Rule 1.1 and Section 4.4, this is a composite SIMULATION cost,
    not full AC power-flow nonlinear physics.
    """
    # Min-max normalization with division-by-zero protection
    norm_r = (resistance - r_min) / (r_max - r_min) if (r_max > r_min) else 0.5
    norm_r = max(0.0, min(1.0, norm_r))

    loading_ratio = current_load / max_capacity if max_capacity > 0 else 1.0
    loading_ratio = max(0.0, min(2.0, loading_ratio))

    norm_d = (distance_km - d_min) / (d_max - d_min) if (d_max > d_min) else 0.5
    norm_d = max(0.0, min(1.0, norm_d))

    cost = (alpha * norm_r) + (beta * loading_ratio) + (gamma * norm_d)
    
    breakdown = {
        "norm_resistance": round(norm_r, 4),
        "loading_ratio": round(loading_ratio, 4),
        "norm_distance": round(norm_d, 4),
        "weighted_r": round(alpha * norm_r, 4),
        "weighted_loading": round(beta * loading_ratio, 4),
        "weighted_d": round(gamma * norm_d, 4),
        "total_cost": round(cost, 4)
    }
    return cost, breakdown
