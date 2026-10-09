from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.models import GridState, GridEvent

VALID_STATES = {
    "NORMAL",
    "FAULT_DETECTED",
    "ISLANDED",
    "ANALYZING",
    "RECONFIGURING",
    "RESTORED",
    "RECONFIGURATION_FAILED"
}

ALLOWED_TRANSITIONS = {
    "NORMAL": {"FAULT_DETECTED", "NORMAL"},
    "FAULT_DETECTED": {"ISLANDED", "NORMAL", "ANALYZING"},
    "ISLANDED": {"ANALYZING", "NORMAL"},
    "ANALYZING": {"RECONFIGURING", "RECONFIGURATION_FAILED", "NORMAL"},
    "RECONFIGURING": {"RESTORED", "RECONFIGURATION_FAILED", "NORMAL"},
    "RESTORED": {"FAULT_DETECTED", "NORMAL"},
    "RECONFIGURATION_FAILED": {"ANALYZING", "NORMAL", "FAULT_DETECTED"}
}

class GridStateMachine:
    """
    Strict finite state machine governing digital twin distribution operations.
    Illegal transitions throw ValueError.
    """
    @staticmethod
    def get_current_state(db: Session) -> GridState:
        state = db.query(GridState).order_by(GridState.id.desc()).first()
        if not state:
            state = GridState(
                state_enum="NORMAL",
                total_load_mw=33.0,
                affected_load_mw=0.0,
                restored_load_mw=33.0,
                unserved_load_mw=0.0,
                restoration_pct=100.0,
                details_json={"message": "System operational, all radial feeders healthy."}
            )
            db.add(state)
            db.commit()
            db.refresh(state)
        return state

    @staticmethod
    def transition_to(
        db: Session,
        new_state: str,
        reason: str,
        total_load: Optional[float] = None,
        affected_load: Optional[float] = None,
        restored_load: Optional[float] = None,
        unserved_load: Optional[float] = None,
        restoration_pct: Optional[float] = None,
        active_fault_edge_id: Optional[int] = None,
        closed_tie_edge_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
        commit: bool = True
    ) -> GridState:
        if new_state not in VALID_STATES:
            raise ValueError(f"Invalid grid state '{new_state}'. Allowed: {VALID_STATES}")

        current = GridStateMachine.get_current_state(db)
        current_state_enum = current.state_enum

        # Check transition validity unless resetting to NORMAL
        if new_state != "NORMAL" and new_state not in ALLOWED_TRANSITIONS.get(current_state_enum, set()):
            raise ValueError(
                f"Illegal state transition from '{current_state_enum}' to '{new_state}'. "
                f"Permitted next states: {ALLOWED_TRANSITIONS.get(current_state_enum, set())}"
            )

        # Inherit previous metrics if not explicitly passed
        tot = total_load if total_load is not None else current.total_load_mw
        aff = affected_load if affected_load is not None else current.affected_load_mw
        res = restored_load if restored_load is not None else current.restored_load_mw
        uns = unserved_load if unserved_load is not None else current.unserved_load_mw
        
        pct = restoration_pct
        if pct is None:
            if aff > 0:
                pct = round((res / aff) * 100.0, 1)
            else:
                pct = 100.0

        new_state_record = GridState(
            timestamp=datetime.now(timezone.utc),
            state_enum=new_state,
            total_load_mw=tot,
            affected_load_mw=aff,
            restored_load_mw=res,
            unserved_load_mw=uns,
            restoration_pct=min(100.0, max(0.0, pct)),
            active_fault_edge_id=active_fault_edge_id or current.active_fault_edge_id,
            closed_tie_edge_id=closed_tie_edge_id or current.closed_tie_edge_id,
            details_json=details or {"reason": reason}
        )
        db.add(new_state_record)

        # Record grid event for this transition
        severity = "INFO"
        if new_state in ["FAULT_DETECTED", "ISLANDED"]:
            severity = "WARNING"
        elif new_state == "RECONFIGURATION_FAILED":
            severity = "CRITICAL"
        elif new_state == "RESTORED":
            severity = "INFO"

        event = GridEvent(
            timestamp=datetime.now(timezone.utc),
            event_type=f"STATE_TRANSITION_{new_state}",
            severity=severity,
            description=f"Grid state transitioned from {current_state_enum} to {new_state}: {reason}",
            related_edge_id=active_fault_edge_id,
            payload_json={
                "previous_state": current_state_enum,
                "new_state": new_state,
                "reason": reason,
                "details": details or {}
            }
        )
        db.add(event)

        if commit:
            db.commit()
            db.refresh(new_state_record)

        return new_state_record
