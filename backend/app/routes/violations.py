"""GET /api/v1/violations — List, filter, approve, and reject violations.

Provides CRUD operations for violation records with filtering,
pagination, and approve/reject actions.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import (
    AuditLogDB,
    ViolationRecordDB,
    ViolationStatusDB,
)
from backend.app.schemas import (
    ViolationActionRequest,
    ViolationActionResponse,
    ViolationListResponse,
    ViolationRecord,
    ViolationStatus,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/violations", response_model=ViolationListResponse)
async def list_violations(
    violation_type: Optional[str] = Query(None, description="Filter by violation type"),
    status: Optional[str] = Query(None, description="Filter by status: pending, approved, rejected"),
    camera_id: Optional[str] = Query(None, description="Filter by camera ID"),
    confidence_tier: Optional[str] = Query(None, description="Filter by tier: high, medium, low"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """List violations with filtering and pagination."""
    query = db.query(ViolationRecordDB)

    if violation_type:
        query = query.filter(ViolationRecordDB.violation_type == violation_type)
    if status:
        query = query.filter(ViolationRecordDB.status == status)
    if camera_id:
        query = query.filter(ViolationRecordDB.camera_id == camera_id)
    if confidence_tier:
        query = query.filter(ViolationRecordDB.confidence_tier == confidence_tier)

    total = query.count()
    records = (
        query.order_by(desc(ViolationRecordDB.timestamp))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    violation_list = [_db_record_to_schema(r) for r in records]

    return ViolationListResponse(
        total=total,
        page=page,
        page_size=page_size,
        violations=violation_list,
    )


@router.get("/violations/{violation_id}", response_model=ViolationRecord)
async def get_violation(
    violation_id: str,
    db: Session = Depends(get_db),
):
    """Get a single violation by ID."""
    record = db.query(ViolationRecordDB).filter(ViolationRecordDB.id == violation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Violation {violation_id} not found")
    return _db_record_to_schema(record)


@router.post("/violations/{violation_id}/action", response_model=ViolationActionResponse)
async def action_violation(
    violation_id: str,
    request: ViolationActionRequest,
    db: Session = Depends(get_db),
):
    """Approve or reject a violation."""
    record = db.query(ViolationRecordDB).filter(ViolationRecordDB.id == violation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Violation {violation_id} not found")

    new_status = "approved" if request.action == "approve" else "rejected"
    record.status = new_status

    # Create audit log
    audit = AuditLogDB(
        violation_id=violation_id,
        action=request.action,
        actor="officer_001",
        detail={"reason": request.reason},
    )
    db.add(audit)
    db.commit()

    return ViolationActionResponse(
        id=violation_id,
        status=ViolationStatus(new_status),
        message=f"Violation {new_status} successfully",
    )


def _db_record_to_schema(record: ViolationRecordDB) -> ViolationRecord:
    """Convert a SQLAlchemy ViolationRecordDB to a Pydantic ViolationRecord."""
    from backend.app.schemas import Bbox, ConfidenceTier, DataSource, LicensePlateResult

    bbox_data = record.bbox if isinstance(record.bbox, dict) else {}
    person_bbox_data = record.person_bbox if isinstance(record.person_bbox, dict) else None

    plate_result = None
    if record.license_plate_text:
        plate_bbox_data = record.license_plate_bbox if isinstance(record.license_plate_bbox, dict) else {}
        plate_result = LicensePlateResult(
            text=record.license_plate_text,
            confidence=record.license_plate_confidence or 0.0,
            bbox=Bbox(**plate_bbox_data) if plate_bbox_data else Bbox(x1=0, y1=0, x2=0, y2=0),
        )

    return ViolationRecord(
        id=record.id,
        violation_type=record.violation_type.value if hasattr(record.violation_type, 'value') else record.violation_type,
        confidence=record.confidence,
        confidence_tier=record.confidence_tier.value if hasattr(record.confidence_tier, 'value') else record.confidence_tier,
        bbox=Bbox(**bbox_data) if bbox_data else Bbox(x1=0, y1=0, x2=0, y2=0),
        person_bbox=Bbox(**person_bbox_data) if person_bbox_data else None,
        metadata=record.violation_metadata or {},
        mv_act_section=record.mv_act_section,
        fine_amount=record.fine_amount,
        license_plate=plate_result,
        status=ViolationStatus(record.status.value if hasattr(record.status, 'value') else record.status),
        data_source=DataSource(record.data_source.value if hasattr(record.data_source, 'value') else record.data_source),
        camera_id=record.camera_id,
        timestamp=record.timestamp or datetime.now(timezone.utc),
        evidence_url=record.evidence_url,
        evidence_hash=record.evidence_hash,
    )
