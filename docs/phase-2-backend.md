# Phase 2: Backend — Detailed Specification

> Phase 2 Duration: 6 hours
> Module: `src/api/`, `src/db/`, `scripts/`
> Exit Criteria: API returns seeded violations, detect route works end-to-end

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [FastAPI Application Setup](#2-fastapi-application-setup)
3. [Route Contracts](#3-route-contracts)
4. [SQLite Schema](#4-sqlite-schema)
5. [Seed Data Specification](#5-seed-data-specification)
6. [Audit Trail](#6-audit-trail)
7. [Demo Mode API](#7-demo-mode-api)

---

## 1. Project Structure

```
src/
├── api/
│   ├── __init__.py
│   ├── main.py          # FastAPI app, lifespan, CORS, static files
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── detect.py    # POST /api/v1/detect
│   │   ├── violations.py  # GET /api/v1/violations
│   │   ├── evidence.py  # GET /api/v1/evidence/{id}
│   │   └── analytics.py # GET /api/v1/analytics
│   └── deps.py          # Dependencies (pipeline, db session)
├── db/
│   ├── __init__.py
│   ├── models.py        # SQLAlchemy models
│   ├── session.py       # Session factory
│   └── seed.py          # Seed data generation
├── cv/                  # (Phase 1 module)
└── config.py            # Configuration from YAML / env
scripts/
├── seed_db.py           # CLI seed script
└── download_weights.sh  # Weight download script
```

---

## 2. FastAPI Application Setup

### Lifespan Events

```python
from contextlib import asynccontextmanager
from pathlib import Path
import logging

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.cv.pipeline import CVPipeline
from src.db.session import create_tables, get_session_factory

logger = logging.getLogger(__name__)

EVIDENCE_DIR = Path("outputs/evidence")
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: load models at startup, cleanup at shutdown."""
    # Startup
    logger.info("Starting VigilAI backend...")

    # Initialize database
    create_tables()
    session_factory = get_session_factory()
    app.state.db_session = session_factory

    # Load CV pipeline
    pipeline = CVPipeline(
        coco_helmet_model_path="weights/coco_helmet.pt",
        plate_model_path="weights/plate.pt",
    )
    pipeline.load()
    app.state.pipeline = pipeline

    # Verify VRAM
    if torch.cuda.is_available():
        vram_used = torch.cuda.memory_allocated() / (1024**3)
        logger.info("VRAM used after model loading: %.2f GB", vram_used)

    # Verify OCR
    from rapidocr_onnxruntime import RapidOCR
    ocr = RapidOCR()
    import numpy as np
    dummy = np.zeros((100, 300, 3), dtype=np.uint8)
    ocr(dummy)  # Pre-warm ONNX session
    app.state.ocr = ocr

    logger.info("VigilAI backend ready. Models loaded, OCR pre-warmed.")

    yield

    # Shutdown
    logger.info("Shutting down VigilAI backend...")
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    logger.info("Cleanup complete.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="VigilAI",
        description="AI-Powered Traffic Violation Detection for Bengaluru Traffic Police",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS (allow all for development)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Static files for evidence images
    app.mount("/evidence", StaticFiles(directory=str(EVIDENCE_DIR)), name="evidence")

    # Register routes
    from src.api.routes import detect, violations, analytics
    app.include_router(detect.router, prefix="/api/v1", tags=["detection"])
    app.include_router(violations.router, prefix="/api/v1", tags=["violations"])
    app.include_router(analytics.router, prefix="/api/v1", tags=["analytics"])

    # Health check
    @app.get("/health")
    async def health_check():
        pipeline_ready = hasattr(app.state, "pipeline")
        return {
            "status": "healthy" if pipeline_ready else "loading",
            "models_loaded": pipeline_ready,
        }

    return app


app = create_app()
```

### Startup Command

```bash
cd "D:\Web Project\Flipkart\Round 2"
"D:\Web Project\Flipkart\venv\Scripts\python.exe" -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 3. Route Contracts

### 3.1 POST /api/v1/detect

```python
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class PlateResult(BaseModel):
    text: str
    confidence: float
    bbox: list[float]

class ViolationResult(BaseModel):
    violation_id: str
    type: str                          # "no_helmet" | "triple_riding" | "license_plate_mismatch"
    confidence: float
    confidence_tier: str               # "high" | "medium" | "low"
    bbox: list[float]                  # [x1, y1, x2, y2] normalized
    person_bbox: Optional[list[float]] = None
    head_bbox: Optional[list[float]] = None
    rider_count: Optional[int] = None
    rider_bboxes: Optional[list[list[float]]] = None
    vehicle_bbox: Optional[list[float]] = None
    license_plate: Optional[PlateResult] = None
    mv_act_section: str
    fine_amount: int
    metadata: dict = {}

class PipelineTiming(BaseModel):
    preprocessing_ms: float
    detection_ms: float
    violation_ms: float
    plate_ms: float
    ocr_ms: float
    evidence_ms: float
    total_ms: float

class DetectResponse(BaseModel):
    success: bool
    image_id: str
    violations: list[ViolationResult]
    pipeline_timing: PipelineTiming
    detection_counts: dict[str, int]

@router.post("/detect", response_model=DetectResponse)
async def detect_violations(
    file: UploadFile = File(..., description="Image file (JPEG, PNG, or WebP)"),
):
    """Detect traffic violations in an uploaded image.

    Accepts an image file, runs the full CV pipeline, and returns
    detected violations with evidence.

    Returns:
        DetectResponse with violations, evidence URLs, and timing.
    """
    # Validate file type
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Supported: JPEG, PNG, WebP.",
        )

    # Read image
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(status_code=413, detail="Image exceeds 10MB limit.")

    import cv2
    import numpy as np

    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    # Run pipeline
    pipeline = request.app.state.pipeline
    if not pipeline or not pipeline.coco_helmet_model.is_loaded:
        raise HTTPException(status_code=503, detail="Models not ready. Retry in 5 seconds.")

    result = pipeline.process(image)

    # Build response
    violations = []
    for v in result.violations:
        confidence_tier = "high" if v["confidence"] >= 0.8 else ("medium" if v["confidence"] >= 0.5 else "low")
        violations.append(ViolationResult(
            violation_id=f"v_{result.image_id}_{len(violations):03d}",
            type=v["type"],
            confidence=v["confidence"],
            confidence_tier=confidence_tier,
            bbox=v["bbox"],
            person_bbox=v.get("person_bbox"),
            head_bbox=v.get("head_bbox"),
            rider_count=v.get("rider_count"),
            rider_bboxes=v.get("rider_bboxes"),
            vehicle_bbox=v.get("vehicle_bbox"),
            license_plate=v.get("license_plate"),
            mv_act_section=v["mv_act_section"],
            fine_amount=v["fine_amount"],
            metadata=v.get("metadata", {}),
        ))

    return DetectResponse(
        success=True,
        image_id=result.image_id,
        violations=violations,
        pipeline_timing=PipelineTiming(**result.pipeline_timing),
        detection_counts=result.detection_counts,
    )
```

### 3.2 GET /api/v1/violations

```python
from fastapi import Query
from typing import Optional

class ViolationListResponse(BaseModel):
    violations: list[dict]
    total: int
    page: int
    page_size: int

@router.get("/violations", response_model=ViolationListResponse)
async def list_violations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    violation_type: Optional[str] = Query(None, enum=["no_helmet", "triple_riding", "license_plate_mismatch"]),
    status: Optional[str] = Query(None, enum=["pending", "approved", "rejected"]),
    junction: Optional[str] = Query(None),
    data_source: Optional[str] = Query(None, enum=["seeded", "live"]),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """List violations with pagination and filtering.

    Supports filtering by type, status, junction, source, and date range.
    Results are ordered by timestamp descending (most recent first).
    """
    session = request.app.state.db_session()
    try:
        query = session.query(ViolationRecord)

        if violation_type:
            query = query.filter(ViolationRecord.violation_type == violation_type)
        if status:
            query = query.filter(ViolationRecord.status == status)
        if junction:
            query = query.filter(ViolationRecord.junction_name == junction)
        if data_source:
            query = query.filter(ViolationRecord.data_source == data_source)
        if date_from:
            query = query.filter(ViolationRecord.timestamp >= date_from)
        if date_to:
            query = query.filter(ViolationRecord.timestamp <= date_to)

        total = query.count()
        results = query.order_by(ViolationRecord.timestamp.desc()) \
                      .offset((page - 1) * page_size) \
                      .limit(page_size) \
                      .all()

        return ViolationListResponse(
            violations=[v.to_dict() for v in results],
            total=total,
            page=page,
            page_size=page_size,
        )
    finally:
        session.close()
```

### 3.3 PATCH /api/v1/violations/{violation_id}/status

```python
class StatusUpdateRequest(BaseModel):
    status: str  # "approved" | "rejected"
    officer_id: str = "demo_officer"

class StatusUpdateResponse(BaseModel):
    success: bool
    violation_id: str
    new_status: str

@router.patch("/violations/{violation_id}/status", response_model=StatusUpdateResponse)
async def update_violation_status(
    violation_id: str,
    update: StatusUpdateRequest,
):
    """Approve or reject a violation.

    Updates the violation status and creates an audit event.
    Only pending violations can be approved/rejected.

    Args:
        violation_id: Unique violation identifier.
        update: Status update with new status and officer ID.

    Returns:
        StatusUpdateResponse confirming the update.

    Raises:
        404: Violation not found.
        400: Violation is not pending (already approved/rejected).
    """
    session = request.app.state.db_session()
    try:
        violation = session.query(ViolationRecord).filter(
            ViolationRecord.id == violation_id
        ).first()

        if not violation:
            raise HTTPException(status_code=404, detail="Violation not found.")

        if violation.status != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"Violation is already {violation.status}. Only pending violations can be updated."
            )

        violation.status = update.status
        violation.reviewed_by = update.officer_id
        violation.reviewed_at = datetime.utcnow()

        # Create audit event
        audit = AuditEvent(
            id=f"ae_{uuid4().hex[:16]}",
            violation_id=violation_id,
            action=update.status,
            actor=update.officer_id,
            detail={"previous_status": "pending", "new_status": update.status},
        )
        session.add(audit)
        session.commit()

        return StatusUpdateResponse(
            success=True,
            violation_id=violation_id,
            new_status=update.status,
        )
    finally:
        session.close()
```

### 3.4 GET /api/v1/analytics

```python
class AnalyticsResponse(BaseModel):
    total_violations: int
    by_type: dict[str, int]
    by_status: dict[str, int]
    by_junction: dict[str, int]
    by_tier: dict[str, int]
    total_potential_fine: int
    total_approved_fine: int
    recent_trend: list[dict]  # Last 7 days, violations per day

@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics():
    """Get violation analytics summary.

    Returns:
        AnalyticsResponse with counts, distributions, and trends.
    """
    session = request.app.state.db_session()
    try:
        total = session.query(ViolationRecord).count()

        # By type
        by_type = {}
        for vtype in ["no_helmet", "triple_riding", "license_plate_mismatch"]:
            by_type[vtype] = session.query(ViolationRecord).filter(
                ViolationRecord.violation_type == vtype
            ).count()

        # By status
        by_status = {}
        for status in ["pending", "approved", "rejected"]:
            by_status[status] = session.query(ViolationRecord).filter(
                ViolationRecord.status == status
            ).count()

        # By junction
        junctions = session.query(
            ViolationRecord.junction_name,
            func.count(ViolationRecord.id)
        ).group_by(ViolationRecord.junction_name).all()
        by_junction = {j: c for j, c in junctions}

        # By confidence tier
        by_tier = {"high": 0, "medium": 0, "low": 0}
        all_violations = session.query(ViolationRecord).all()
        for v in all_violations:
            tier = "high" if v.confidence >= 0.8 else ("medium" if v.confidence >= 0.5 else "low")
            by_tier[tier] += 1

        # Fines
        total_potential = sum(v.fine_amount for v in all_violations)
        total_approved = sum(v.fine_amount for v in all_violations if v.status == "approved")

        # Trend (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent = session.query(ViolationRecord).filter(
            ViolationRecord.timestamp >= seven_days_ago
        ).all()
        trend = {}
        for v in recent:
            day = v.timestamp.strftime("%Y-%m-%d")
            trend[day] = trend.get(day, 0) + 1
        recent_trend = [{"date": d, "count": c} for d, c in sorted(trend.items())]

        return AnalyticsResponse(
            total_violations=total,
            by_type=by_type,
            by_status=by_status,
            by_junction=by_junction,
            by_tier=by_tier,
            total_potential_fine=total_potential,
            total_approved_fine=total_approved,
            recent_trend=recent_trend,
        )
    finally:
        session.close()
```

---

## 4. SQLite Schema

### violations table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | TEXT | NO | PK | `v_20260616_143022_001` |
| violation_type | TEXT | NO | | `"no_helmet"`, `"triple_riding"`, `"license_plate_mismatch"` |
| status | TEXT | NO | `"pending"` | `"pending"`, `"approved"`, `"rejected"` |
| confidence | REAL | NO | | 0.0-1.0 |
| confidence_tier | TEXT | NO | | `"high"`, `"medium"`, `"low"` |
| bbox | TEXT | NO | | JSON `[x1, y1, x2, y2]` normalized |
| person_bbox | TEXT | YES | | JSON `[x1, y1, x2, y2]` or null |
| head_bbox | TEXT | YES | | JSON `[x1, y1, x2, y2]` or null |
| vehicle_bbox | TEXT | YES | | JSON `[x1, y1, x2, y2]` or null |
| rider_count | INTEGER | YES | | For triple riding |
| rider_bboxes | TEXT | YES | | JSON `[[x1,y1,x2,y2], ...]` or null |
| license_plate_text | TEXT | YES | | OCR result |
| license_plate_confidence | REAL | YES | | OCR confidence |
| license_plate_bbox | TEXT | YES | | JSON `[x1, y1, x2, y2]` or null |
| mv_act_section | TEXT | NO | | `"129"`, `"184"`, `"177"` |
| fine_amount | INTEGER | NO | | 500, 1000, 200 |
| evidence_image_path | TEXT | NO | | `/evidence/filename.jpg` |
| evidence_hash | TEXT | NO | | `sha256:hex...` |
| original_image_id | TEXT | YES | | Source image identifier |
| junction_name | TEXT | NO | | `"MG Road - Trinity Circle"` |
| latitude | REAL | NO | | 12.9757 |
| longitude | REAL | NO | | 77.6063 |
| timestamp | DATETIME | NO | | Detection/seeded timestamp |
| reviewed_at | DATETIME | YES | | When approved/rejected |
| reviewed_by | TEXT | YES | | Officer identifier |
| data_source | TEXT | NO | `"live"` | `"seeded"` or `"live"` |
| created_at | DATETIME | NO | `NOW()` | Record creation time |
| updated_at | DATETIME | NO | `NOW()` | Last update time |

### audit_events table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | TEXT | NO | PK | `ae_20260616_143022_001` |
| violation_id | TEXT | NO | FK | References violations.id |
| action | TEXT | NO | | `"created"`, `"approved"`, `"rejected"`, `"evidence_viewed"` |
| actor | TEXT | NO | `"system"` | Who performed the action |
| detail | TEXT | YES | | JSON blob with action-specific metadata |
| timestamp | DATETIME | NO | `NOW()` | When the action occurred |

### Indexes

```sql
CREATE INDEX idx_violations_type ON violations(violation_type);
CREATE INDEX idx_violations_status ON violations(status);
CREATE INDEX idx_violations_junction ON violations(junction_name);
CREATE INDEX idx_violations_timestamp ON violations(timestamp);
CREATE INDEX idx_violations_source ON violations(data_source);
CREATE INDEX idx_audit_violation_id ON audit_events(violation_id);
```

---

## 5. Seed Data Specification

### Junction Data

| Junction | Lat | Lon | Weight | No Helmet % | Triple % | Plate % |
|----------|-----|-----|--------|-----------|----------|---------|
| MG Road - Trinity Circle | 12.9757 | 77.6063 | 0.15 | 65 | 20 | 15 |
| Silk Board Junction | 12.9177 | 77.6238 | 0.20 | 55 | 30 | 15 |
| Hebbal Flyover | 13.0358 | 77.5970 | 0.12 | 70 | 15 | 15 |
| Whitefield Main Road | 12.9698 | 77.7500 | 0.13 | 60 | 25 | 15 |
| Electronic City Phase 1 | 12.8456 | 77.6603 | 0.18 | 50 | 35 | 15 |
| Marathahalli Bridge | 12.9591 | 77.6974 | 0.15 | 58 | 28 | 14 |
| KR Puram Railway Junction | 12.9970 | 77.6844 | 0.12 | 62 | 22 | 16 |
| Yelahanka New Town | 13.1007 | 77.5963 | 0.08 | 72 | 12 | 16 |
| Bannerghatta Road | 12.9135 | 77.5985 | 0.14 | 56 | 26 | 18 |
| Koramangala 100ft Road | 12.9352 | 77.6245 | 0.11 | 68 | 18 | 14 |

### Seed Script

```python
"""scripts/seed_db.py — Generate realistic violation seed data for Bengaluru."""

import random
import uuid
from datetime import datetime, timedelta

JUNCTIONS = [
    {"name": "MG Road - Trinity Circle", "lat": 12.9757, "lon": 77.6063, "weight": 0.15},
    {"name": "Silk Board Junction", "lat": 12.9177, "lon": 77.6238, "weight": 0.20},
    {"name": "Hebbal Flyover", "lat": 13.0358, "lon": 77.5970, "weight": 0.12},
    {"name": "Whitefield Main Road", "lat": 12.9698, "lon": 77.7500, "weight": 0.13},
    {"name": "Electronic City Phase 1", "lat": 12.8456, "lon": 77.6603, "weight": 0.18},
    {"name": "Marathahalli Bridge", "lat": 12.9591, "lon": 77.6974, "weight": 0.15},
    {"name": "KR Puram Railway Junction", "lat": 12.9970, "lon": 77.6844, "weight": 0.12},
    {"name": "Yelahanka New Town", "lat": 13.1007, "lon": 77.5963, "weight": 0.08},
    {"name": "Bannerghatta Road - Jayadeva", "lat": 12.9135, "lon": 77.5985, "weight": 0.14},
    {"name": "Koramangala 100ft Road", "lat": 12.9352, "lon": 77.6245, "weight": 0.11},
]

VIOLATION_DISTRIBUTION = {
    "no_helmet": 0.60,
    "triple_riding": 0.25,
    "license_plate_mismatch": 0.15,
}

MV_ACT = {
    "no_helmet": {"section": "129", "fine": 500},
    "triple_riding": {"section": "184", "fine": 1000},
    "license_plate_mismatch": {"section": "177", "fine": 200},
}

KA_DISTRICTS = list(range(1, 60))  # KA01 through KA59
KA_SERIES = [f"{a}{b}" for a in "ABCDEFGHIJKLMNOPQRSTUVWXYZ" for b in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"]


def generate_plate() -> str:
    """Generate a random KA-format license plate."""
    district = random.choice(KA_DISTRICTS)
    series = random.choice(KA_SERIES)
    number = random.randint(1000, 9999)
    return f"KA{district:02d}{series}{number}"


def generate_timestamp(days_back: int = 7) -> datetime:
    """Generate a random timestamp within the last N days.

    Follows realistic time patterns:
    - Peak: 06-09 and 17-21 (rush hours)
    - Low: 21-06 (night)
    """
    now = datetime.utcnow()
    random_days = random.randint(0, days_back - 1)

    # Weighted hour selection (rush hours more likely)
    hour_weights = {
        range(6, 9): 0.25,    # Morning rush
        range(9, 12): 0.15,   # Mid-morning
        range(12, 14): 0.10,  # Lunch
        range(14, 17): 0.15,  # Afternoon
        range(17, 21): 0.25,  # Evening rush
        range(21, 24): 0.05,  # Night
        range(0, 6): 0.05,    # Late night
    }

    r = random.random()
    cumulative = 0.0
    selected_hour = 12  # Default
    for hour_range, weight in hour_weights.items():
        cumulative += weight
        if r <= cumulative:
            selected_hour = random.choice(list(hour_range))
            break

    minute = random.randint(0, 59)
    second = random.randint(0, 59)

    return now.replace(
        hour=selected_hour, minute=minute, second=second,
        microsecond=0
    ) - timedelta(days=random_days)


def generate_confidence(violation_type: str) -> tuple[float, str]:
    """Generate a realistic confidence score and tier."""
    if violation_type == "no_helmet":
        conf = random.gauss(0.82, 0.12)
    elif violation_type == "triple_riding":
        conf = random.gauss(0.72, 0.15)
    else:
        conf = random.gauss(0.75, 0.10)

    conf = max(0.2, min(0.99, conf))
    tier = "high" if conf >= 0.8 else ("medium" if conf >= 0.5 else "low")
    return round(conf, 4), tier


def generate_bbox() -> list[float]:
    """Generate a random normalized bbox."""
    x1 = random.uniform(0.05, 0.70)
    y1 = random.uniform(0.05, 0.70)
    x2 = x1 + random.uniform(0.08, 0.25)
    y2 = y1 + random.uniform(0.10, 0.30)
    return [round(x1, 4), round(y1, 4), round(min(x2, 0.95), 4), round(min(y2, 0.95), 4)]


def seed_violations(count: int = 250) -> list[dict]:
    """Generate seed violation records.

    Args:
        count: Total number of violations to generate.

    Returns:
        List of violation dicts ready for database insertion.
    """
    violations = []

    # Distribute violations across junctions by weight
    junction_counts = {}
    for j in JUNCTIONS:
        junction_counts[j["name"]] = max(1, int(count * j["weight"]))

    # Adjust to match total count
    actual_total = sum(junction_counts.values())
    diff = count - actual_total
    if diff > 0:
        busiest = max(junction_counts, key=junction_counts.get)
        junction_counts[busiest] += diff

    for junction in JUNCTIONS:
        j_count = junction_counts[junction["name"]]

        for _ in range(j_count):
            # Pick violation type
            r = random.random()
            cumulative = 0.0
            vtype = "no_helmet"
            for vtype_key, prob in VIOLATION_DISTRIBUTION.items():
                cumulative += prob
                if r <= cumulative:
                    vtype = vtype_key
                    break

            confidence, tier = generate_confidence(vtype)
            timestamp = generate_timestamp()
            bbox = generate_bbox()

            plate_text = generate_plate() if random.random() < 0.7 else None
            plate_conf = round(random.uniform(0.6, 0.98), 4) if plate_text else None

            # Add small GPS jitter
            lat_jitter = random.uniform(-0.001, 0.001)
            lon_jitter = random.uniform(-0.001, 0.001)

            violation_id = f"v_{timestamp.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:4]}"

            violations.append({
                "id": violation_id,
                "violation_type": vtype,
                "status": random.choices(
                    ["pending", "approved", "rejected"],
                    weights=[0.70, 0.25, 0.05]
                )[0],
                "confidence": confidence,
                "confidence_tier": tier,
                "bbox": bbox,
                "person_bbox": bbox if vtype == "no_helmet" else None,
                "head_bbox": None,
                "vehicle_bbox": bbox if vtype == "triple_riding" else None,
                "rider_count": random.randint(3, 4) if vtype == "triple_riding" else None,
                "rider_bboxes": [generate_bbox() for _ in range(3)] if vtype == "triple_riding" else None,
                "license_plate_text": plate_text,
                "license_plate_confidence": plate_conf,
                "license_plate_bbox": generate_bbox() if plate_text else None,
                "mv_act_section": MV_ACT[vtype]["section"],
                "fine_amount": MV_ACT[vtype]["fine"],
                "evidence_image_path": f"/evidence/{violation_id}.jpg",
                "evidence_hash": f"sha256:{uuid.uuid4().hex}",
                "original_image_id": f"img_{timestamp.strftime('%Y%m%d_%H%M%S')}",
                "junction_name": junction["name"],
                "latitude": round(junction["lat"] + lat_jitter, 6),
                "longitude": round(junction["lon"] + lon_jitter, 6),
                "timestamp": timestamp.isoformat(),
                "reviewed_at": timestamp.isoformat() if random.random() > 0.7 else None,
                "reviewed_by": "officer_001" if random.random() > 0.7 else None,
                "data_source": "seeded",
            })

    return violations


if __name__ == "__main__":
    import json
    data = seed_violations(250)
    with open("data/processed/seed_data.json", "w") as f:
        json.dump(data, f, indent=2)
    print(f"Generated {len(data)} seed violations.")
```

---

## 6. Audit Trail

### Audit Events

Every state change on a violation creates an audit event:

| Action | Trigger | Detail |
|--------|---------|--------|
| `created` | New violation detected | Detection metadata, pipeline timing |
| `approved` | Officer approves | Officer ID, timestamp |
| `rejected` | Officer rejects | Officer ID, timestamp, reason |
| `evidence_viewed` | Evidence image requested | Viewer info |

### Audit Query API

```python
@router.get("/violations/{violation_id}/audit")
async def get_audit_trail(violation_id: str):
    """Get audit trail for a specific violation."""
    session = request.app.state.db_session()
    try:
        events = session.query(AuditEvent).filter(
            AuditEvent.violation_id == violation_id
        ).order_by(AuditEvent.timestamp.asc()).all()

        return {
            "violation_id": violation_id,
            "events": [
                {
                    "id": e.id,
                    "action": e.action,
                    "actor": e.actor,
                    "timestamp": e.timestamp.isoformat(),
                    "detail": e.detail,
                }
                for e in events
            ]
        }
    finally:
        session.close()
```

---

## 7. Demo Mode API

### How Demo Mode Works

Demo mode is primarily a **frontend concept** — the Zustand store flag `demoMode` controls whether the frontend makes real API calls or returns hardcoded data.

### API Behavior in Demo Mode

The backend doesn't need a "demo mode" — it always serves real data. The demo mode affects only the frontend:

| Scenario | Live Mode | Demo Mode |
|----------|-----------|-----------|
| Dashboard stats | `GET /api/v1/analytics` | Hardcoded JSON from `src/mocks/analytics.json` |
| Violation list | `GET /api/v1/violations` | Hardcoded JSON from `src/mocks/violations.json` |
| Image upload | `POST /api/v1/detect` | Returns predefined response from `src/mocks/detect-response.json` |
| Evidence image | `/evidence/{id}.jpg` | Bundled sample in `/public/demo/` |
| Analytics | `GET /api/v1/analytics` | Hardcoded JSON from `src/mocks/analytics.json` |

### Frontend Demo Mode Implementation

```typescript
// src/mocks/detect-response.json — Predefined response for demo upload
{
  "success": true,
  "image_id": "demo_20260616_143022",
  "violations": [
    {
      "violation_id": "demo_v_001",
      "type": "no_helmet",
      "confidence": 0.87,
      "confidence_tier": "high",
      "bbox": [0.42, 0.15, 0.58, 0.35],
      "mv_act_section": "129",
      "fine_amount": 500,
      "license_plate": {
        "text": "KA01AB1234",
        "confidence": 0.91,
        "bbox": [0.10, 0.85, 0.30, 0.95]
      }
    },
    {
      "violation_id": "demo_v_002",
      "type": "triple_riding",
      "confidence": 0.72,
      "confidence_tier": "medium",
      "bbox": [0.20, 0.30, 0.80, 0.90],
      "rider_count": 3,
      "mv_act_section": "184",
      "fine_amount": 1000,
      "license_plate": null
    }
  ],
  "pipeline_timing": {
    "preprocessing_ms": 45,
    "detection_ms": 187,
    "violation_ms": 12,
    "plate_ms": 95,
    "ocr_ms": 234,
    "evidence_ms": 89,
    "total_ms": 662
  }
}
```

---

## Exit Criteria Checklist

- [ ] FastAPI app starts with model loading
- [ ] POST /api/v1/detect accepts image and returns violations
- [ ] GET /api/v1/violations returns paginated list
- [ ] PATCH /api/v1/violations/{id}/status updates status
- [ ] GET /api/v1/analytics returns summary stats
- [ ] SQLite database created with correct schema
- [ ] 250 seeded violations at 10 Bengaluru junctions
- [ ] Evidence images served via StaticFiles
- [ ] Audit events created on status changes
- [ ] Health check endpoint returns model status
