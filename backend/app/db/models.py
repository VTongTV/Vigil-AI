"""SQLAlchemy ORM models for VigilAI database.

Tables:
    violations — All detected violations with metadata, confidence, and review status
    audit_log  — Audit trail for approve/reject actions on violations
"""

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Integer,
    JSON,
    String,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from backend.app.db.database import Base


class ViolationTypeDB(str, PyEnum):
    """Database enum for violation types — must match schemas.ViolationType."""

    NO_HELMET = "no_helmet"
    TRIPLE_RIDING = "triple_riding"
    WRONG_SIDE_DRIVING = "wrong_side_driving"
    ILLEGAL_PARKING = "illegal_parking"
    NO_SEATBELT = "no_seatbelt"
    STOP_LINE_VIOLATION = "stop_line_violation"
    RED_LIGHT_VIOLATION = "red_light_violation"
    LICENSE_PLATE_MISMATCH = "license_plate_mismatch"


class DataSourceDB(str, PyEnum):
    """Database enum for data source."""

    SEEDED = "seeded"
    LIVE = "live"


class ViolationStatusDB(str, PyEnum):
    """Database enum for violation review status."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ConfidenceTierDB(str, PyEnum):
    """Database enum for confidence tier."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ViolationRecordDB(Base):
    """SQLAlchemy model for a detected traffic violation."""

    __tablename__ = "violations"

    id = Column(String, primary_key=True)  # v_20260616_143022_001
    violation_type = Column(SAEnum(ViolationTypeDB), nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    confidence_tier = Column(SAEnum(ConfidenceTierDB), nullable=False)
    bbox = Column(JSON, nullable=False)  # {"x1": 0.1, "y1": 0.2, "x2": 0.3, "y2": 0.4}
    person_bbox = Column(JSON, nullable=True)
    violation_metadata = Column(JSON, nullable=False, default=dict)
    mv_act_section = Column(String, nullable=False)
    fine_amount = Column(Integer, nullable=False)
    license_plate_text = Column(String, nullable=True)
    license_plate_confidence = Column(Float, nullable=True)
    license_plate_bbox = Column(JSON, nullable=True)
    status = Column(
        SAEnum(ViolationStatusDB), nullable=False, default=ViolationStatusDB.PENDING, index=True
    )
    data_source = Column(SAEnum(DataSourceDB), nullable=False, default=DataSourceDB.LIVE)
    camera_id = Column(String, nullable=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    evidence_url = Column(String, nullable=True)
    evidence_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    audit_logs = relationship("AuditLogDB", back_populates="violation", cascade="all, delete-orphan")


class AuditLogDB(Base):
    """SQLAlchemy model for violation review audit trail."""

    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    violation_id = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)  # "approve" | "reject" | "create"
    actor = Column(String, nullable=False, default="system")
    detail = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    violation = relationship("ViolationRecordDB", back_populates="audit_logs")


# Fine schedule mapping — single source of truth for MV Act sections and fine amounts
FINE_SCHEDULE: dict[str, dict[str, str | int]] = {
    "no_helmet": {"section": "129", "amount": 500},
    "triple_riding": {"section": "184", "amount": 1000},
    "wrong_side_driving": {"section": "184", "amount": 1000},
    "illegal_parking": {"section": "122", "amount": 200},
    "no_seatbelt": {"section": "194B", "amount": 1000},
    "stop_line_violation": {"section": "184", "amount": 1000},
    "red_light_violation": {"section": "184", "amount": 1000},
    "license_plate_mismatch": {"section": "177", "amount": 200},
}


def get_confidence_tier(confidence: float) -> str:
    """Assign confidence tier based on detection confidence.

    Args:
        confidence: Detection confidence (0.0 - 1.0).

    Returns:
        Tier string: "high", "medium", or "low".
    """
    if confidence >= 0.80:
        return "high"
    elif confidence >= 0.50:
        return "medium"
    return "low"
