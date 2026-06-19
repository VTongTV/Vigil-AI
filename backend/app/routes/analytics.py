"""GET /api/v1/analytics — Violation statistics, trends, and forecasting."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import ViolationRecordDB
from backend.app.schemas import AnalyticsOverview, TrendForecast

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/analytics", response_model=AnalyticsOverview)
async def get_analytics(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    camera_id: Optional[str] = Query(None, description="Filter by camera"),
    db: Session = Depends(get_db),
):
    """Get violation analytics overview with trend forecasting.

    Returns:
        Statistics by type, tier, status, daily trends, top cameras,
        and 7-day trend forecast per violation type.
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
    # Per-type daily counts for trend forecasting
    type_daily: dict[str, dict[str, int]] = {}

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

        # Track per-type daily counts
        if v_type not in type_daily:
            type_daily[v_type] = {}
        type_daily[v_type][day_key] = type_daily[v_type].get(day_key, 0) + 1

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

    # Trend forecasting (F8): 7-day moving average per violation type
    trend_forecast = _compute_trend_forecast(type_daily, by_type)

    return AnalyticsOverview(
        total_violations=total,
        violations_by_type=by_type,
        violations_by_tier=by_tier,
        violations_by_status=by_status,
        avg_confidence=round(avg_conf, 3),
        total_fines=total_fines,
        daily_counts=daily_counts,
        top_cameras=top_cameras,
        trend_forecast=trend_forecast,
    )


def _compute_trend_forecast(
    type_daily: dict[str, dict[str, int]],
    by_type: dict[str, int],
) -> list[TrendForecast]:
    """Compute 7-day trend forecast for each violation type.

    Uses simple moving average of last 7 days of data. Compares the
    most recent 3-day average to the prior 4-day average to determine
    trend direction and percentage.

    Args:
        type_daily: Per-type daily counts {type: {date: count}}.
        by_type: Total counts per type.

    Returns:
        List of TrendForecast objects.
    """
    forecasts = []

    for v_type, daily_counts_dict in type_daily.items():
        sorted_days = sorted(daily_counts_dict.items())
        if len(sorted_days) < 2:
            forecasts.append(TrendForecast(
                violation_type=v_type,
                trend_direction="stable",
                trend_percentage=0.0,
                forecast=[],
            ))
            continue

        # Get last 7 days of actual data
        recent = sorted_days[-7:]
        counts = [c for _, c in recent]
        avg_count = sum(counts) / len(counts)

        # Compare recent 3 days vs prior days for trend
        if len(counts) >= 3:
            recent_avg = sum(counts[-3:]) / 3
            prior_avg = sum(counts[:-3]) / max(1, len(counts) - 3)
        else:
            recent_avg = counts[-1]
            prior_avg = counts[0]

        if prior_avg == 0:
            trend_direction = "up" if recent_avg > 0 else "stable"
            trend_percentage = 100.0 if recent_avg > 0 else 0.0
        else:
            change_pct = ((recent_avg - prior_avg) / prior_avg) * 100
            if change_pct > 10:
                trend_direction = "up"
            elif change_pct < -10:
                trend_direction = "down"
            else:
                trend_direction = "stable"
            trend_percentage = round(abs(change_pct), 1)

        # Generate 7-day forecast using moving average
        from datetime import date, timedelta
        last_date = date.fromisoformat(recent[-1][0])
        forecast = []
        for day_offset in range(1, 8):
            forecast_date = last_date + timedelta(days=day_offset)
            predicted = max(0, round(avg_count))
            forecast.append({
                "date": forecast_date.isoformat(),
                "predicted_count": predicted,
            })

        forecasts.append(TrendForecast(
            violation_type=v_type,
            trend_direction=trend_direction,
            trend_percentage=trend_percentage,
            forecast=forecast,
        ))

    return forecasts
