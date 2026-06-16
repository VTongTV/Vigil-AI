"""GET /api/v1/analytics — Violation statistics and trends."""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import ViolationRecordDB
from backend.app.schemas import AnalyticsOverview

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/analytics", response_model=AnalyticsOverview)
async def get_analytics(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    camera_id: str | None = Query(None, description="Filter by camera"),
    db: Session = Depends(get_db),
):
    """Get violation analytics overview.

    Returns:
        Statistics by type, tier, status, daily trends, and top cameras.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    query = db.query(ViolationRecordDB).filter(ViolationRecordDB.timestamp >= since)
    if camera_id:
        query = query.filter(ViolationRecordDB.camera_id == camera_id)

    records = query.all()

    # Compute stats
    total = len(records)
    by_type: dict[str, int] = {}
    by_tier: dict[str, int] = {}
    by_status: dict[str, int] = {}
    total_fines = 0
    conf_sum = 0.0
    daily: dict[str, int] = {}
    camera_counts: dict[str, int] = {}

    for r in records:
        v_type = r.violation_type.value if hasattr(r.violation_type, 'value') else str(r.violation_type)
        v_tier = r.confidence_tier.value if hasattr(r.confidence_tier, 'value') else str(r.confidence_tier)
        v_status = r.status.value if hasattr(r.status, 'value') else str(r.status)

        by_type[v_type] = by_type.get(v_type, 0) + 1
        by_tier[v_tier] = by_tier.get(v_tier, 0) + 1
        by_status[v_status] = by_status.get(v_status, 0) + 1
        total_fines += r.fine_amount or 0
        conf_sum += r.confidence or 0.0

        day_key = r.timestamp.strftime("%Y-%m-%d") if r.timestamp else "unknown"
        daily[day_key] = daily.get(day_key, 0) + 1

        if r.camera_id:
            camera_counts[r.camera_id] = camera_counts.get(r.camera_id, 0) + 1

    avg_conf = conf_sum / total if total > 0 else 0.0

    # Daily counts sorted by date
    daily_counts = [
        {"date": d, "count": c}
        for d, c in sorted(daily.items())
    ]

    # Top cameras
    top_cameras = [
        {"camera_id": cid, "count": cnt}
        for cid, cnt in sorted(camera_counts.items(), key=lambda x: -x[1])[:10]
    ]

    return AnalyticsOverview(
        total_violations=total,
        violations_by_type=by_type,
        violations_by_tier=by_tier,
        violations_by_status=by_status,
        avg_confidence=round(avg_conf, 3),
        total_fines=total_fines,
        daily_counts=daily_counts,
        top_cameras=top_cameras,
    )
