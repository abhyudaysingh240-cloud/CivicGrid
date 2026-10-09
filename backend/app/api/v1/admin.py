from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import require_role, verify_csrf
from backend.app.core.audit import log_audit_event
from backend.app.models.models import User, AuditLog
from backend.app.schemas.schemas import AuditLogOut, UserOut

router = APIRouter(prefix="/admin", tags=["Administration & Audit"])

class RoleUpdateRequest(BaseModel):
    role: str = Field(..., pattern="^(CITIZEN|FIELD_WORKER|DEPARTMENT_OFFICER|ADMIN)$")

@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    action: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    return query.order_by(AuditLog.timestamp.desc()).limit(limit).all()


@router.get("/users", response_model=List[UserOut])
def list_system_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    return db.query(User).order_by(User.id.asc()).all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    payload: RoleUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
    _csrf: bool = Depends(verify_csrf)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    old_role = user.role
    user.role = payload.role
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        actor=current_user,
        action="ROLE_CHANGE",
        resource_type="user",
        resource_id=str(user.id),
        result="SUCCESS",
        ip_address=request.client.host if request.client else None,
        metadata={"old_role": old_role, "new_role": payload.role}
    )

    return user
