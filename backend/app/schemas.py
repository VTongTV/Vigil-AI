"""VigilAI Pydantic schemas for API request/response validation.

These schemas define the API contract between backend and frontend.
TypeScript types in frontend/src/types/ must mirror these exactly.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ViolationType(str, Enum):
    """All supported traffic violation types."""

    NO_HELMET = "no_helmet"
    TRIPLE_RIDING = "triple_riding"
    WRONG_SIDE_DRIVING = "wrong_side_driving"
    ILLEGAL_PARKING = "illegal_parking"
    NO_SEATBELT = "no_seatbelt"
    STOP_LINE_VIOLATION = "stop_line_violation"
    RED_LIGHT_VIOLATION = "red_light_violation"
    LICENSE_PLATE_MISMATCH = "license_plate_mismatch"


class DataSource(str, Enum):
    """Origin of the violation record."""

    SEEDED = "seeded"
    LIVE = "live"


class ConfidenceTier(str, Enum):
    """Confidence tier classification."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ViolationStatus(str, Enum):
    """Review status of a violation.

    Flow: pending → under_review → approved → issued
    Any status can transition to rejected.
    """

    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    ISSUED = "issued"
    REJECTED = "rejected"


class Bbox(BaseModel):
    """Normalized bounding box [0, 1] relative to image dimensions."""

    x1: float = Field(..., ge=0.0, le=1.0)
    y1: float = Field(..., ge=0.0, le=1.0)
    x2: float = Field(..., ge=0.0, le=1.0)
    y2: float = Field(..., ge=0.0, le=1.0)


class LicensePlateResult(BaseModel):
    """OCR result for a license plate."""

    text: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: Bbox


class ViolationRecord(BaseModel):
    """A single detected violation with all metadata."""

    id: str
    violation_type: ViolationType
    confidence: float = Field(..., ge=0.0, le=1.0)
    confidence_tier: ConfidenceTier
    bbox: Bbox
    person_bbox: Optional[Bbox] = None
    metadata: dict = Field(default_factory=dict)
    mv_act_section: str
    fine_amount: int
    license_plate: Optional[LicensePlateResult] = None
    status: ViolationStatus = ViolationStatus.PENDING
    data_source: DataSource = DataSource.LIVE
    camera_id: Optional[str] = None
    junction_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    evidence_url: Optional[str] = None
    evidence_hash: Optional[str] = None
    danger_score: int = Field(default=0, ge=0, le=100)
    ai_explanation: Optional[str] = None
    is_duplicate: bool = False
    duplicate_group_id: Optional[str] = None


class ImageDimensions(BaseModel):
    """Image dimensions in pixels."""

    width: int = Field(..., gt=0)
    height: int = Field(..., gt=0)


class TimingBreakdown(BaseModel):
    """Breakdown of processing time by pipeline stage."""

    preprocess_ms: int
    detect_coco_ms: int
    detect_helmet_ms: int
    violation_logic_ms: int
    detect_plate_ms: int = 0
    ocr_ms: int = 0
    evidence_gen_ms: int


class DetectionSummary(BaseModel):
    """Summary of all detected objects by category.

    Provides explicit visibility into vehicle/rider/pedestrian detection
    and vehicle classification for judge evaluation.
    """

    persons: int = 0
    riders: int = 0
    pedestrians: int = 0
    cars: int = 0
    motorcycles: int = 0
    buses: int = 0
    trucks: int = 0
    bicycles: int = 0
    total_objects: int = 0
    vehicle_categories: list[str] = Field(default_factory=list)


class PreprocessingStep(BaseModel):
    """A single preprocessing step with its parameters and status."""

    name: str
    enabled: bool
    parameters: dict = Field(default_factory=dict)


class PreprocessingApplied(BaseModel):
    """Preprocessing steps applied to the input image.

    Shows which image enhancement steps were used to handle
    challenging conditions like low light, shadows, and noise.
    """

    steps: list[PreprocessingStep] = Field(default_factory=list)
    image_brightness: Optional[float] = None
    image_contrast: Optional[float] = None
    condition_flags: list[str] = Field(default_factory=list)


class DetectResponse(BaseModel):
    """Response from POST /api/v1/detect."""

    success: bool
    processing_time_ms: int
    timing_breakdown: TimingBreakdown
    violations: list[ViolationRecord]
    image_dimensions: ImageDimensions
    detection_summary: DetectionSummary = Field(default_factory=DetectionSummary)
    preprocessing_applied: PreprocessingApplied = Field(default_factory=PreprocessingApplied)


class ViolationListResponse(BaseModel):
    """Response from GET /api/v1/violations."""

    total: int
    page: int
    page_size: int
    violations: list[ViolationRecord]


class ViolationActionRequest(BaseModel):
    """Request to action a violation (review, approve, issue, reject)."""

    action: str = Field(..., pattern="^(review|approve|issue|reject)$")
    reason: Optional[str] = None
    officer_id: Optional[str] = None


class ViolationActionResponse(BaseModel):
    """Response after actioning a violation."""

    id: str
    status: ViolationStatus
    message: str


class TrendForecast(BaseModel):
    """7-day trend forecast for a single violation type."""

    violation_type: str
    trend_direction: str  # "up", "down", "stable"
    trend_percentage: float  # e.g. 15.2 means ↑15.2%
    forecast: list[dict]  # [{date, predicted_count}]


class AnalyticsOverview(BaseModel):
    """High-level analytics statistics."""

    total_violations: int
    violations_by_type: dict[str, int]
    violations_by_tier: dict[str, int]
    violations_by_status: dict[str, int]
    avg_confidence: float
    total_fines: int
    daily_counts: list[dict]
    top_cameras: list[dict]
    trend_forecast: list[TrendForecast] = Field(default_factory=list)


class CameraStatus(str, Enum):
    """Camera health status."""

    ACTIVE = "active"
    IDLE = "idle"
    OFFLINE = "offline"


class CameraHealth(BaseModel):
    """Health status of a single traffic camera."""

    camera_id: str
    junction_name: str
    latitude: float
    longitude: float
    status: CameraStatus
    last_seen: Optional[datetime] = None
    violation_count_24h: int = 0
    avg_latency_ms: Optional[float] = None


class CameraListResponse(BaseModel):
    """Response from GET /api/v1/cameras."""

    total: int
    cameras: list[CameraHealth]


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    version: str = "1.0.0"
    models_loaded: bool = False
    demo_mode: bool = False
