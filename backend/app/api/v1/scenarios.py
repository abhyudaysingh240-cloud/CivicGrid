from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import require_role, verify_csrf, get_current_user
from backend.app.models.models import User
from backend.app.grid.scenarios import ScenarioEngine

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.get("")
def list_scenarios(current_user: User = Depends(get_current_user)):
    return ScenarioEngine.get_catalog()

@router.post("/{code}/run")
def run_scenario(
    code: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
    _csrf: bool = Depends(verify_csrf)
):
    ip = request.client.host if request.client else None
    try:
        result = ScenarioEngine.run_scenario(
            db=db,
            scenario_code=code,
            actor=current_user,
            ip_address=ip
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
