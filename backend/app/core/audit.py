from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy.orm import Session
from fastapi import Request
from backend.app.models.models import AuditLog, User

def log_audit_event(
    db: Session,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    actor: Optional[User] = None,
    result: str = "SUCCESS",
    ip_address: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
    commit: bool = True
) -> AuditLog:
    """
    Records an immutable audit log entry according to Section 6.
    """
    actor_id = actor.id if actor else None
    actor_username = actor.username if actor else "SYSTEM"
    
    audit_entry = AuditLog(
        timestamp=datetime.now(timezone.utc),
        actor_user_id=actor_id,
        actor_username=actor_username,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        result=result,
        ip_address=ip_address,
        metadata_json=metadata or {}
    )
    db.add(audit_entry)
    if commit:
        db.commit()
        db.refresh(audit_entry)
    return audit_entry
