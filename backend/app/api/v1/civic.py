import uuid
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.core.dependencies import get_current_user, get_optional_current_user, require_role, verify_csrf
from backend.app.core.security import get_password_hash
from backend.app.core.audit import log_audit_event
from backend.app.models.models import (
    User, CitizenReport, InfrastructureAsset, Department, IncidentCluster
)
from backend.app.civic.classifier import CivicClassifier
from backend.app.civic.clustering import CivicClusteringEngine
from backend.app.civic.risk import AssetRiskEngine
from backend.app.civic.priority import IncidentPriorityEngine
from backend.app.schemas.schemas import (
    CitizenReportOut, ReportStatusUpdate, IncidentClusterOut, 
    WhyClusteringOut, AssetOut, WhyRiskOut, WhyPriorityOut
)

router = APIRouter(prefix="/civic", tags=["Civic Intelligence"])

# MIME Magic Bytes Signatures
MAGIC_BYTES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp"
}

def validate_uploaded_image(file: UploadFile) -> str:
    """
    Validates uploaded image against file extension, MIME type, magic bytes,
    and size limit. Stores sanitized UUID file outside web root.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension '{ext}'. Allowed: {settings.ALLOWED_IMAGE_EXTENSIONS}"
        )

    # Read initial bytes for magic check
    header = file.file.read(12)
    file.file.seek(0)
    
    is_valid_magic = any(header.startswith(sig) for sig in MAGIC_BYTES)
    if not is_valid_magic:
        raise HTTPException(status_code=400, detail="Invalid image file header (magic bytes check failed).")

    # Read full file to check size
    content = file.file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    # Save with random UUID filename
    random_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = settings.UPLOAD_DIR / random_filename
    with open(dest_path, "wb") as f:
        f.write(content)

    return random_filename


@router.post("/reports", response_model=CitizenReportOut, status_code=status.HTTP_201_CREATED)
async def submit_citizen_report(
    description: str = Form(..., min_length=5),
    category: Optional[str] = Form(None),
    severity: int = Form(2, ge=1, le=5),
    asset_id: Optional[int] = Form(None),
    x_coord: Optional[float] = Form(None),
    y_coord: Optional[float] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    idempotency_key: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    _csrf: bool = Depends(verify_csrf)
):
    """
    Submits a new citizen incident report:
    1. Validates and stores image securely if attached.
    2. Runs NLP text intent classification (with fallback).
    3. Calculates incident priority score with mathematical breakdown.
    4. Evaluates spatial & semantic clustering (TF-IDF >= 0.85).
    5. Saves record and audits action.
    """
    if not description or len(description.strip()) < 5:
        raise HTTPException(status_code=400, detail="Description must be at least 5 characters long.")

    saved_filename = None
    if image and image.filename:
        saved_filename = validate_uploaded_image(image)

    # Ensure valid user identity (assign default citizen user if guest)
    if not current_user:
        current_user = db.query(User).filter(User.role == "CITIZEN").first()
        if not current_user:
            current_user = User(
                username="citizen1",
                email="citizen@civicgrid.internal",
                hashed_password=get_password_hash("CitizenPassword123!"),
                role="CITIZEN",
                is_active=True
            )
            db.add(current_user)
            db.commit()
            db.refresh(current_user)

    # NLP Classification
    pred_cat, dept_code, conf, source = CivicClassifier.classify_text(description)
    final_cat = category if (category and category.strip()) else pred_cat

    # Map department
    dept = db.query(Department).filter(Department.code == dept_code).first()
    if not dept:
        dept = db.query(Department).first()

    # Normalize coordinates from either x/y or lat/lng
    coords_x = x_coord if x_coord is not None else (latitude if latitude is not None else 0.0)
    coords_y = y_coord if y_coord is not None else (longitude if longitude is not None else 0.0)

    # Load asset if provided
    asset = None
    if asset_id:
        asset = db.query(InfrastructureAsset).filter(InfrastructureAsset.id == asset_id).first()
        if asset:
            coords_x = asset.x_coord
            coords_y = asset.y_coord

    # Calculate initial priority
    priority_score, priority_lvl, priority_breakdown = IncidentPriorityEngine.calculate_priority(
        severity=severity,
        report_count=1,
        asset=asset,
        description=description
    )

    report = CitizenReport(
        user_id=current_user.id,
        asset_id=asset.id if asset else None,
        department_id=dept.id if dept else None,
        category=final_cat,
        description=description,
        image_filename=saved_filename,
        classification_source=source,
        classification_confidence=conf,
        status="SUBMITTED",
        severity=severity,
        priority_score=priority_score,
        priority_level=priority_lvl,
        x_coord=coords_x,
        y_coord=coords_y
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Evaluate clustering
    cluster = CivicClusteringEngine.evaluate_and_cluster_report(db, report)
    if cluster:
        # Recompute priority with updated cluster volume
        updated_priority, updated_lvl, _ = IncidentPriorityEngine.calculate_priority(
            severity=severity,
            report_count=cluster.report_count,
            asset=asset,
            description=description
        )
        report.priority_score = updated_priority
        report.priority_level = updated_lvl
        cluster.priority_score = max(cluster.priority_score, updated_priority)
        db.commit()

    log_audit_event(
        db=db,
        actor=current_user,
        action="REPORT_CREATE",
        resource_type="citizen_report",
        resource_id=str(report.id),
        result="SUCCESS",
        ip_address=request.client.host if request.client else None,
        metadata={"category": final_cat, "priority": priority_score, "cluster_id": report.cluster_id}
    )

    return report


@router.get("/reports", response_model=List[CitizenReportOut])
def list_reports(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    IDOR-safe listing:
    - CITIZEN (or unauthenticated): only reports created by current user (or recent public reports if guest).
    - FIELD_WORKER / DEPARTMENT_OFFICER / ADMIN: full operational visibility.
    """
    if not current_user:
        return db.query(CitizenReport).order_by(CitizenReport.id.desc()).limit(50).all()
    elif current_user.role == "CITIZEN":
        return db.query(CitizenReport).filter(CitizenReport.user_id == current_user.id).order_by(CitizenReport.id.desc()).all()
    else:
        return db.query(CitizenReport).order_by(CitizenReport.id.desc()).all()



@router.get("/reports/{report_id}", response_model=CitizenReportOut)
def get_report_detail(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Incident report not found.")

    # IDOR check
    if current_user.role == "CITIZEN" and report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only inspect your own submitted reports.")

    return report


@router.patch("/reports/{report_id}/status", response_model=CitizenReportOut)
def update_report_status(
    report_id: int,
    payload: ReportStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "ADMIN", "FIELD_WORKER")),
    _csrf: bool = Depends(verify_csrf)
):
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    prev_status = report.status
    report.status = payload.status
    db.commit()
    db.refresh(report)

    log_audit_event(
        db=db,
        actor=current_user,
        action="REPORT_STATUS_UPDATE",
        resource_type="citizen_report",
        resource_id=str(report.id),
        result="SUCCESS",
        ip_address=request.client.host if request.client else None,
        metadata={"old_status": prev_status, "new_status": payload.status}
    )

    return report


@router.get("/clusters", response_model=List[IncidentClusterOut])
def list_incident_clusters(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "ADMIN", "FIELD_WORKER"))
):
    return db.query(IncidentCluster).order_by(IncidentCluster.priority_score.desc()).all()


@router.get("/why-clustering/{cluster_id}", response_model=WhyClusteringOut)
def get_why_clustering(
    cluster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cluster = db.query(IncidentCluster).filter(IncidentCluster.id == cluster_id).first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found.")

    explanation = cluster.explanation_json or {}
    pairwise = explanation.get("pairwise_matches", [])

    return {
        "cluster_id": cluster.id,
        "title": cluster.title,
        "asset_id": cluster.asset_id,
        "report_count": cluster.report_count,
        "pairwise_similarities": pairwise,
        "spatial_distances": pairwise,
        "clustering_rule_applied": (
            "Reports join cluster when (same asset OR coordinate distance <= 50) "
            "AND TF-IDF cosine similarity >= 0.85."
        )
    }


@router.get("/assets", response_model=List[AssetOut])
def list_infrastructure_assets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns assets updated with real-time risk scores.
    """
    assets = db.query(InfrastructureAsset).all()
    for a in assets:
        score, lvl, _ = AssetRiskEngine.calculate_risk(db, a)
        a.current_risk_score = score
        a.current_risk_level = lvl
    db.commit()
    return assets


@router.get("/why-risk/{asset_id}", response_model=WhyRiskOut)
def get_why_risk(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    asset = db.query(InfrastructureAsset).filter(InfrastructureAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    score, lvl, breakdown = AssetRiskEngine.calculate_risk(db, asset)
    return {
        "asset_id": asset.id,
        "asset_code": asset.asset_code,
        "name": asset.name,
        "total_risk_score": score,
        "risk_level": lvl,
        "factors": breakdown,
        "formula": "Risk = 0.25*FailHist + 0.15*Age + 0.25*Criticality + 0.20*LoadUtil + 0.15*IncidentDensity"
    }


@router.get("/why-priority/{report_id}", response_model=WhyPriorityOut)
def get_why_priority(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    count = report.cluster.report_count if report.cluster else 1
    score, lvl, breakdown = IncidentPriorityEngine.calculate_priority(
        severity=report.severity,
        report_count=count,
        asset=report.asset,
        description=report.description
    )

    return {
        "report_id": report.id,
        "priority_score": score,
        "priority_level": lvl,
        "factors": breakdown.get("factors", {}),
        "formula": breakdown.get("formula", "")
    }
