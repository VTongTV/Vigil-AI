"""GET /api/v1/cameras — Camera health status and monitoring.

Provides real-time health status for all traffic cameras by combining
static config from default.yaml with dynamic data from the violation DB.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.config import get_demo_cameras
from backend.app.db.database import get_db
from backend.app.db.models import ViolationRecordDB
from backend.app.schemas import CameraHealth, CameraListResponse, CameraStatus

logger = logging.getLogger(__name__)
router = APIRouter()

# Health thresholds
ACTIVE_THRESHOLD_MINUTES = 5
IDLE_THRESHOLD_MINUTES = 60


@router.get("/cameras", response_model=CameraListResponse)
async def list_cameras(
    status: Optional[str] = Query(None, description="Filter by status: active, idle, offline"),
    db: Session = Depends(get_db),
):
    """List all cameras with health status derived from recent violation activity.

    Health rules:
        - active: last violation within 5 minutes
        - idle: last violation within 1 hour
        - offline: no violations in the last hour or no violations ever

    Args:
        status: Optional filter by camera health status.
        db: SQLAlchemy database session.

    Returns:
        CameraListResponse with total count and per-camera health details.
    """
    # Get camera config from YAML
    camera_configs = get_demo_cameras()

    # Query last violation timestamp and 24h count per camera from DB
    now = datetime.now(timezone.utc)
    twenty_four_hours_ago = now - timedelta(hours=24)

    # Last violation per camera
    last_violation_q = (
        db.query(
            ViolationRecordDB.camera_id,
            func.max(ViolationRecordDB.timestamp).label("last_seen"),
        )
        .filter(ViolationRecordDB.camera_id.isnot(None))
        .group_by(ViolationRecordDB.camera_id)
        .all()
    )
    last_seen_map = {row.camera_id: row.last_seen for row in last_violation_q}

    # Violation count in last 24h per camera
    count_24h_q = (
        db.query(
            ViolationRecordDB.camera_id,
            func.count(ViolationRecordDB.id).label("cnt"),
        )
        .filter(
            ViolationRecordDB.camera_id.isnot(None),
            ViolationRecordDB.timestamp >= twenty_four_hours_ago,
        )
        .group_by(ViolationRecordDB.camera_id)
        .all()
    )
    count_24h_map = {row.camera_id: row.cnt for row in count_24h_q}

    # Build camera health list
    cameras = []
    for cam_cfg in camera_configs:
        camera_id = cam_cfg.get("id", "")
        junction_name = cam_cfg.get("name", "")
        latitude = float(cam_cfg.get("lat", 0.0))
        longitude = float(cam_cfg.get("lng", 0.0))

        last_seen = last_seen_map.get(camera_id)
        violation_count_24h = count_24h_map.get(camera_id, 0)

        # Derive health status from last violation timestamp
        if last_seen is not None:
            # Ensure timezone-aware comparison
            if last_seen.tzinfo is None:
                last_seen = last_seen.replace(tzinfo=timezone.utc)
            minutes_since = (now - last_seen).total_seconds() / 60

            if minutes_since <= ACTIVE_THRESHOLD_MINUTES:
                health_status = CameraStatus.ACTIVE
            elif minutes_since <= IDLE_THRESHOLD_MINUTES:
                health_status = CameraStatus.IDLE
            else:
                health_status = CameraStatus.OFFLINE
        else:
            health_status = CameraStatus.OFFLINE
            last_seen = None

        # Apply status filter
        if status and health_status.value != status:
            continue

        cameras.append(CameraHealth(
            camera_id=camera_id,
            junction_name=junction_name,
            latitude=latitude,
            longitude=longitude,
            status=health_status,
            last_seen=last_seen,
            violation_count_24h=violation_count_24h,
        ))

    return CameraListResponse(total=len(cameras), cameras=cameras)
