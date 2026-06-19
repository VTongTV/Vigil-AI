"""GET /api/v1/evidence/{violation_id} — Retrieve evidence image and metadata."""

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.db.database import get_db
from backend.app.db.models import ViolationRecordDB

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/evidence/{violation_id}")
async def get_evidence(
    violation_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve the annotated evidence image for a violation.

    Args:
        violation_id: Unique violation identifier.

    Returns:
        JPEG image file.
    """
    record = db.query(ViolationRecordDB).filter(ViolationRecordDB.id == violation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Violation {violation_id} not found")

    if not record.evidence_url:
        raise HTTPException(status_code=404, detail="No evidence image for this violation")

    # Extract filename from URL: /static/evidence/filename.jpg
    filename = record.evidence_url.split("/")[-1]
    filepath = settings.evidence_dir / filename

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Evidence image file not found on disk")

    return FileResponse(
        str(filepath),
        media_type="image/jpeg",
        filename=filename,
    )


@router.get("/evidence/{violation_id}/metadata")
async def get_evidence_metadata(
    violation_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve evidence metadata for a violation (hash, timestamp, etc.)."""
    record = db.query(ViolationRecordDB).filter(ViolationRecordDB.id == violation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Violation {violation_id} not found")

    return {
        "violation_id": record.id,
        "evidence_url": record.evidence_url,
        "evidence_hash": record.evidence_hash,
        "timestamp": record.timestamp.isoformat() if record.timestamp else None,
        "camera_id": record.camera_id,
    }
