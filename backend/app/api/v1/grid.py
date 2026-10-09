import asyncio
import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_role, verify_csrf
from backend.app.models.models import User, GridEvent, GridState, GridNode, GridEdge
from backend.app.grid.service import GridService
from backend.app.schemas.schemas import (
    FaultInjectionRequest, GridEventOut, GridStateOut
)

router = APIRouter(prefix="/grid", tags=["Grid Engine"])

@router.get("/topology")
def get_grid_topology(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "DEPARTMENT_OFFICER"))
):
    """
    Returns full digital twin network topology, current electrical loads,
    substation metrics, and detected electrical islands.
    """
    data = GridService.get_topology(db)
    
    # Map edges with src_code and dst_code
    node_map = {n.id: n.node_code for n in data["nodes"]}
    mapped_edges = []
    for e in data["edges"]:
        mapped_edges.append({
            "id": e.id,
            "edge_code": e.edge_code,
            "name": e.name,
            "src_node_id": e.src_node_id,
            "dst_node_id": e.dst_node_id,
            "src_code": node_map.get(e.src_node_id, ""),
            "dst_code": node_map.get(e.dst_node_id, ""),
            "resistance_ohms": e.resistance_ohms,
            "reactance_ohms": e.reactance_ohms,
            "distance_km": e.distance_km,
            "max_capacity_mw": e.max_capacity_mw,
            "current_load_mw": e.current_load_mw,
            "is_tie_switch": e.is_tie_switch,
            "status": e.status
        })

    return {
        "state": data["state"],
        "nodes": data["nodes"],
        "edges": mapped_edges,
        "islands": data["islands"],
        "total_load_mw": data["total_load_mw"]
    }


@router.post("/fault")
def inject_grid_fault(
    payload: FaultInjectionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "DEPARTMENT_OFFICER")),
    _csrf: bool = Depends(verify_csrf)
):
    """
    Injects line trip fault on specified edge. Triggers islanding and self-healing analysis.
    """
    ip = request.client.host if request.client else None
    try:
        result = GridService.inject_fault(
            db=db,
            edge_code=payload.edge_code,
            actor=current_user,
            ip_address=ip
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reset")
def reset_grid(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
    _csrf: bool = Depends(verify_csrf)
):
    """
    Resets grid topology to baseline healthy configuration.
    """
    ip = request.client.host if request.client else None
    state = GridService.reset_to_healthy_baseline(db, actor=current_user, ip_address=ip)
    return {"message": "Grid successfully reset to healthy baseline.", "state": state}


@router.get("/state", response_model=GridStateOut)
def get_grid_state(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "DEPARTMENT_OFFICER"))
):
    return db.query(GridState).order_by(GridState.id.desc()).first()


@router.get("/events", response_model=List[GridEventOut])
def get_grid_events(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "DEPARTMENT_OFFICER"))
):
    return db.query(GridEvent).order_by(GridEvent.id.desc()).limit(limit).all()


@router.get("/why-restoration")
def get_why_restoration(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "DEPARTMENT_OFFICER"))
):
    """
    Returns complete mathematical breakdown of candidate paths evaluated,
    composite costs, thermal capacity margins, and selection rationale.
    """
    latest_state = db.query(GridState).order_by(GridState.id.desc()).first()
    if not latest_state or not latest_state.details_json:
        return {
            "status": "NORMAL",
            "message": "No active or recent restoration analysis in healthy baseline state.",
            "candidates": []
        }
    return {
        "state": latest_state.state_enum,
        "timestamp": latest_state.timestamp,
        "details": latest_state.details_json
    }


@router.get("/stream")
async def grid_event_stream(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "DEPARTMENT_OFFICER"))
):
    """
    Server-Sent Events (SSE) endpoint broadcasting live grid state and events.
    """
    async def event_generator():
        last_event_id = 0
        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                break

            # Poll for new events from DB (isolated query)
            new_events = db.query(GridEvent).filter(GridEvent.id > last_event_id).order_by(GridEvent.id.asc()).all()
            for event in new_events:
                last_event_id = max(last_event_id, event.id)
                data = {
                    "id": event.id,
                    "event_type": event.event_type,
                    "severity": event.severity,
                    "description": event.description,
                    "timestamp": event.timestamp.isoformat()
                }
                yield f"event: grid_event\ndata: {json.dumps(data)}\n\n"

            # Yield heartbeat ping every 3 seconds
            yield f": ping\n\n"
            await asyncio.sleep(2.0)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
