from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_role, verify_csrf
from backend.app.core.audit import log_audit_event
from backend.app.models.models import User, Assignment, CitizenReport, IncidentCluster
from backend.app.schemas.schemas import AssignmentCreate, AssignmentOut, AssignmentStatusUpdate, UserOut

router = APIRouter(prefix="/civic/assignments", tags=["Field Assignments"])

@router.get("/workers", response_model=List[UserOut])
def list_field_workers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "ADMIN"))
):
    return db.query(User).filter(User.role == "FIELD_WORKER", User.is_active == True).all()


@router.post("", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "ADMIN")),
    _csrf: bool = Depends(verify_csrf)
):
    # Verify worker exists and is FIELD_WORKER
    worker = db.query(User).filter(User.id == payload.assigned_to_user_id).first()
    if not worker or worker.role != "FIELD_WORKER":
        raise HTTPException(status_code=400, detail="Assigned user must be an active FIELD_WORKER.")

    assignment = Assignment(
        report_id=payload.report_id,
        cluster_id=payload.cluster_id,
        assigned_to_user_id=payload.assigned_to_user_id,
        assigned_by_user_id=current_user.id,
        status="ASSIGNED",
        notes=payload.notes,
        assigned_at=datetime.now(timezone.utc)
    )
    db.add(assignment)

    # Update linked report status if applicable
    if payload.report_id:
        rep = db.query(CitizenReport).filter(CitizenReport.id == payload.report_id).first()
        if rep:
            rep.status = "IN_PROGRESS"

    db.commit()
    db.refresh(assignment)

    log_audit_event(
        db=db,
        actor=current_user,
        action="ASSIGNMENT_CREATE",
        resource_type="assignment",
        resource_id=str(assignment.id),
        result="SUCCESS",
        ip_address=request.client.host if request.client else None,
        metadata={"assigned_to": worker.username, "report_id": payload.report_id}
    )

    return assignment


@router.get("/my", response_model=List[AssignmentOut])
def get_my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("FIELD_WORKER", "ADMIN"))
):
    return db.query(Assignment).filter(
        Assignment.assigned_to_user_id == current_user.id
    ).order_by(Assignment.id.desc()).all()


@router.patch("/{assignment_id}/status", response_model=AssignmentOut)
def update_assignment_status(
    assignment_id: int,
    payload: AssignmentStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("FIELD_WORKER", "DEPARTMENT_OFFICER", "ADMIN")),
    _csrf: bool = Depends(verify_csrf)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    # IDOR check: Field worker can only update their own assignment
    if current_user.role == "FIELD_WORKER" and assignment.assigned_to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only update your own work assignments.")

    assignment.status = payload.status
    if payload.notes:
        assignment.notes = payload.notes

    if payload.status == "COMPLETED":
        assignment.completed_at = datetime.now(timezone.utc)
        if assignment.report:
            assignment.report.status = "RESOLVED"

    db.commit()
    db.refresh(assignment)

    log_audit_event(
        db=db,
        actor=current_user,
        action="ASSIGNMENT_STATUS_UPDATE",
        resource_type="assignment",
        resource_id=str(assignment.id),
        result="SUCCESS",
        ip_address=request.client.host if request.client else None,
        metadata={"status": payload.status}
    )

    return assignment
