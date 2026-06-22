"""GET /api/v1/tracking/overview — Live tracking dashboard.

Returns real-time overview of all camera feeds, violation counts,
and alert status. For demo purposes, returns mock data.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter

from backend.app.schemas import (
    CameraStatus,
    TrackingCamera,
    TrackingOverviewResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Mock camera data for demo
_DEMO_CAMERAS = [
    {
        "camera_id": "MGROAD-01",
        "junction_name": "MG Road — Trinity Circle",
        "status": CameraStatus.ACTIVE,
        "violations_last_hour": 5,
        "last_violation_type": "no_helmet",
        "last_violation_time": datetime.now(timezone.utc).isoformat(),
    },
    {
        "camera_id": "SILKBOARD-01",
        "junction_name": "Silk Board Junction",
        "status": CameraStatus.ACTIVE,
        "violations_last_hour": 4,
        "last_violation_type": "red_light_violation",
        "last_violation_time": datetime.now(timezone.utc).isoformat(),
    },
    {
        "camera_id": "HEBBAL-01",
        "junction_name": "Hebbal Flyover",
        "status": CameraStatus.ACTIVE,
        "violations_last_hour": 3,
        "last_violation_type": "no_helmet",
        "last_violation_time": datetime.now(timezone.utc).isoformat(),
    },
    {
        "camera_id": "WHITEFIELD-01",
        "junction_name": "Whitefield Main Road",
        "status": CameraStatus.ACTIVE,
        "violations_last_hour": 3,
        "last_violation_type": "triple_riding",
        "last_violation_time": datetime.now(timezone.utc).isoformat(),
    },
    {
        "camera_id": "ELECTRONIC-01",
        "junction_name": "Electronic City Phase 1",
        "status": CameraStatus.IDLE,
        "violations_last_hour": 2,
        "last_violation_type": "no_seatbelt",
        "last_violation_time": datetime.now(timezone.utc).isoformat(),
    },
    {
        "camera_id": "MARATHAHALLI-01",
        "junction_name": "Marathahalli Bridge",
        "status": CameraStatus.ACTIVE,
        "violations_last_hour": 3,
        "last_violation_type": "triple_riding",
        "last_violation_time": datetime.now(timezone.utc).isoformat(),
    },
    {
        "camera_id": "KRPURAM-01",
        "junction_name": "KR Puram Railway Junction",
        "status": CameraStatus.OFFLINE,
        "violations_last_hour": 0,
        "last_violation_type": None,
        "last_violation_time": None,
    },
    {
        "camera_id": "KORMANGALA-01",
        "junction_name": "Koramangala 100ft Road",
        "status": CameraStatus.ACTIVE,
        "violations_last_hour": 3,
        "last_violation_type": "illegal_parking",
        "last_violation_time": datetime.now(timezone.utc).isoformat(),
    },
]


@router.get("/tracking/overview", response_model=TrackingOverviewResponse)
async def get_tracking_overview():
    """Get live tracking overview of all cameras and violations.

    Returns:
        Real-time camera status, violation counts, and alert information.
    """
    cameras = [
        TrackingCamera(
            camera_id=c["camera_id"],
            junction_name=c["junction_name"],
            status=c["status"],
            violations_last_hour=c["violations_last_hour"],
            last_violation_type=c["last_violation_type"],
            last_violation_time=c["last_violation_time"],
            feed_url=None,
        )
        for c in _DEMO_CAMERAS
    ]

    active = sum(1 for c in cameras if c.status == CameraStatus.ACTIVE)
    total_violations = sum(c.violations_last_hour for c in cameras)
    alerts = sum(1 for c in cameras if c.violations_last_hour >= 3)

    return TrackingOverviewResponse(
        active_cameras=active,
        total_violations_last_hour=total_violations,
        alerts_active=alerts,
        cameras=cameras,
    )
