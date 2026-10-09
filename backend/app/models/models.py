from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, 
    Text, JSON, CheckConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="CITIZEN")  # CITIZEN, FIELD_WORKER, DEPARTMENT_OFFICER, ADMIN
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    department = relationship("Department", back_populates="users")
    reports = relationship("CitizenReport", back_populates="user", cascade="all, delete-orphan")
    assigned_tasks = relationship("Assignment", foreign_keys="Assignment.assigned_to_user_id", back_populates="assigned_to")

    __table_args__ = (
        CheckConstraint("role IN ('CITIZEN', 'FIELD_WORKER', 'DEPARTMENT_OFFICER', 'ADMIN')", name="chk_user_role"),
    )


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)

    users = relationship("User", back_populates="department")
    reports = relationship("CitizenReport", back_populates="department")
    clusters = relationship("IncidentCluster", back_populates="department")


class GridNode(Base):
    __tablename__ = "grid_nodes"

    id = Column(Integer, primary_key=True, index=True)
    node_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    node_type = Column(String(30), nullable=False)  # SUBSTATION, BUS, DISTRIBUTION_POINT, LOAD_POINT
    nominal_voltage_kv = Column(Float, nullable=False, default=11.0)
    load_mw = Column(Float, nullable=False, default=0.0)
    criticality = Column(Integer, nullable=False, default=1)  # 1 to 5
    status = Column(String(30), nullable=False, default="OPERATIONAL")  # OPERATIONAL, DEGRADED, FAULTED, ISOLATED
    x = Column(Float, nullable=False, default=0.0)
    y = Column(Float, nullable=False, default=0.0)
    is_energized = Column(Boolean, nullable=False, default=True)
    max_capacity_mw = Column(Float, nullable=True)  # For substations
    current_supply_mw = Column(Float, nullable=True)

    assets = relationship("InfrastructureAsset", back_populates="grid_node")

    __table_args__ = (
        CheckConstraint("criticality >= 1 AND criticality <= 5", name="chk_node_criticality"),
        CheckConstraint("load_mw >= 0.0", name="chk_node_load_non_negative"),
        CheckConstraint("node_type IN ('SUBSTATION', 'BUS', 'DISTRIBUTION_POINT', 'LOAD_POINT')", name="chk_node_type"),
    )


class GridEdge(Base):
    __tablename__ = "grid_edges"

    id = Column(Integer, primary_key=True, index=True)
    edge_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    src_node_id = Column(Integer, ForeignKey("grid_nodes.id", ondelete="RESTRICT"), nullable=False, index=True)
    dst_node_id = Column(Integer, ForeignKey("grid_nodes.id", ondelete="RESTRICT"), nullable=False, index=True)
    resistance_ohms = Column(Float, nullable=False, default=0.1)
    reactance_ohms = Column(Float, nullable=False, default=0.1)
    distance_km = Column(Float, nullable=False, default=1.0)
    max_capacity_mw = Column(Float, nullable=False, default=10.0)
    current_load_mw = Column(Float, nullable=False, default=0.0)
    is_tie_switch = Column(Boolean, nullable=False, default=False)
    status = Column(String(30), nullable=False, default="OPERATIONAL")  # OPERATIONAL, FAULTED, OPEN, UNAVAILABLE

    src_node = relationship("GridNode", foreign_keys=[src_node_id])
    dst_node = relationship("GridNode", foreign_keys=[dst_node_id])

    __table_args__ = (
        CheckConstraint("status IN ('OPERATIONAL', 'FAULTED', 'OPEN', 'UNAVAILABLE')", name="chk_edge_status"),
        CheckConstraint("max_capacity_mw > 0.0", name="chk_edge_capacity_positive"),
        CheckConstraint("current_load_mw >= 0.0", name="chk_edge_current_load_non_negative"),
        Index("idx_grid_edge_src_dst", "src_node_id", "dst_node_id"),
    )


class GridState(Base):
    __tablename__ = "grid_states"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    state_enum = Column(String(40), nullable=False)  # NORMAL, FAULT_DETECTED, ISLANDED, ANALYZING, RECONFIGURING, RESTORED, RECONFIGURATION_FAILED
    total_load_mw = Column(Float, nullable=False, default=0.0)
    affected_load_mw = Column(Float, nullable=False, default=0.0)
    restored_load_mw = Column(Float, nullable=False, default=0.0)
    unserved_load_mw = Column(Float, nullable=False, default=0.0)
    restoration_pct = Column(Float, nullable=True, default=None)
    restoration_status = Column(String(30), nullable=False, default="NO_ACTIVE_FAULT")  # NO_ACTIVE_FAULT, PARTIAL, FULL, FAILED
    active_fault_edge_id = Column(Integer, ForeignKey("grid_edges.id", ondelete="SET NULL"), nullable=True)
    closed_tie_edge_id = Column(Integer, ForeignKey("grid_edges.id", ondelete="SET NULL"), nullable=True)
    details_json = Column(JSON, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "state_enum IN ('NORMAL', 'FAULT_DETECTED', 'ISLANDED', 'ANALYZING', 'RECONFIGURING', 'RESTORED', 'RECONFIGURATION_FAILED')", 
            name="chk_grid_state_enum"
        ),
        CheckConstraint(
            "restoration_status IN ('NO_ACTIVE_FAULT', 'PARTIAL', 'FULL', 'FAILED')",
            name="chk_restoration_status"
        ),
        CheckConstraint("restoration_pct IS NULL OR (restoration_pct >= 0.0 AND restoration_pct <= 100.0)", name="chk_restoration_pct_range"),
    )


class GridEvent(Base):
    __tablename__ = "grid_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    event_type = Column(String(50), nullable=False)  # FAULT_INJECTED, ISLAND_DETECTED, PATH_SEARCH, RESTORATION_COMPLETED, etc.
    severity = Column(String(20), nullable=False, default="INFO")  # INFO, WARNING, ERROR, CRITICAL
    description = Column(Text, nullable=False)
    related_node_id = Column(Integer, ForeignKey("grid_nodes.id", ondelete="SET NULL"), nullable=True)
    related_edge_id = Column(Integer, ForeignKey("grid_edges.id", ondelete="SET NULL"), nullable=True)
    payload_json = Column(JSON, nullable=True)


class InfrastructureAsset(Base):
    __tablename__ = "infrastructure_assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    asset_type = Column(String(40), nullable=False)  # SUBSTATION, TRANSFORMER, FEEDER_PILLAR, POLE, CABLE_JUNCTION
    grid_node_id = Column(Integer, ForeignKey("grid_nodes.id", ondelete="SET NULL"), nullable=True)
    x_coord = Column(Float, nullable=False, default=0.0)
    y_coord = Column(Float, nullable=False, default=0.0)
    criticality = Column(Integer, nullable=False, default=1)
    installation_year = Column(Integer, nullable=False, default=2015)
    last_serviced_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    current_risk_score = Column(Float, nullable=False, default=0.0)
    current_risk_level = Column(String(20), nullable=False, default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(30), nullable=False, default="OPERATIONAL")

    grid_node = relationship("GridNode", back_populates="assets")
    reports = relationship("CitizenReport", back_populates="asset")
    clusters = relationship("IncidentCluster", back_populates="asset")

    __table_args__ = (
        CheckConstraint("criticality >= 1 AND criticality <= 5", name="chk_asset_criticality"),
        CheckConstraint("current_risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')", name="chk_asset_risk_level"),
    )


class IncidentCluster(Base):
    __tablename__ = "incident_clusters"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("infrastructure_assets.id", ondelete="SET NULL"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    title = Column(String(150), nullable=False)
    report_count = Column(Integer, nullable=False, default=1)
    status = Column(String(30), nullable=False, default="OPEN")  # OPEN, INVESTIGATING, RESOLVED
    priority_score = Column(Float, nullable=False, default=0.0)
    explanation_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    asset = relationship("InfrastructureAsset", back_populates="clusters")
    department = relationship("Department", back_populates="clusters")
    reports = relationship("CitizenReport", back_populates="cluster")
    assignments = relationship("Assignment", back_populates="cluster")


class CitizenReport(Base):
    __tablename__ = "citizen_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("infrastructure_assets.id", ondelete="SET NULL"), nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False, index=True)
    cluster_id = Column(Integer, ForeignKey("incident_clusters.id", ondelete="SET NULL"), nullable=True, index=True)
    category = Column(String(50), nullable=False)  # electrical, road damage, pothole, water leakage, etc.
    description = Column(Text, nullable=False)
    image_filename = Column(String(255), nullable=True)
    classification_source = Column(String(40), nullable=False, default="RULE_BASED_FALLBACK")  # AI_CLASSIFICATION, RULE_BASED_FALLBACK, IMAGE_NOT_CLASSIFIED
    classification_confidence = Column(Float, nullable=False, default=1.0)
    status = Column(String(30), nullable=False, default="SUBMITTED")  # SUBMITTED, VERIFIED, IN_PROGRESS, RESOLVED, REJECTED
    severity = Column(Integer, nullable=False, default=1)  # 1 to 5
    priority_score = Column(Float, nullable=False, default=0.0)
    priority_level = Column(String(20), nullable=False, default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    x_coord = Column(Float, nullable=False, default=0.0)
    y_coord = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="reports")
    asset = relationship("InfrastructureAsset", back_populates="reports")
    department = relationship("Department", back_populates="reports")
    cluster = relationship("IncidentCluster", back_populates="reports")
    assignments = relationship("Assignment", back_populates="report")

    __table_args__ = (
        CheckConstraint("severity >= 1 AND severity <= 5", name="chk_report_severity"),
        CheckConstraint("priority_score >= 0.0 AND priority_score <= 100.0", name="chk_report_priority_score"),
        CheckConstraint("status IN ('SUBMITTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')", name="chk_report_status"),
    )


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("citizen_reports.id", ondelete="CASCADE"), nullable=True)
    cluster_id = Column(Integer, ForeignKey("incident_clusters.id", ondelete="CASCADE"), nullable=True)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    assigned_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(30), nullable=False, default="ASSIGNED")  # ASSIGNED, EN_ROUTE, ON_SITE, COMPLETED
    notes = Column(Text, nullable=True)
    assigned_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    report = relationship("CitizenReport", back_populates="assignments")
    cluster = relationship("IncidentCluster", back_populates="assignments")
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id], back_populates="assigned_tasks")
    assigned_by = relationship("User", foreign_keys=[assigned_by_user_id])

    __table_args__ = (
        CheckConstraint("status IN ('ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED')", name="chk_assignment_status"),
    )


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    scenario_code = Column(String(10), unique=True, index=True, nullable=False)  # A, B, C, D, E
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    initial_fault_edges_json = Column(JSON, nullable=False)
    expected_outcome = Column(Text, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_username = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True)  # LOGIN, FAULT_INJECTION, RESTORATION, REPORT_CREATE, etc.
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(100), nullable=True)
    result = Column(String(20), nullable=False, default="SUCCESS")  # SUCCESS, FAILURE, DENIED
    ip_address = Column(String(50), nullable=True)
    metadata_json = Column(JSON, nullable=True)

    __table_args__ = (
        CheckConstraint("result IN ('SUCCESS', 'FAILURE', 'DENIED')", name="chk_audit_result"),
        Index("idx_audit_logs_actor_action", "actor_user_id", "action"),
    )
