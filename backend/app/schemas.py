"""VigilAI Pydantic schemas for API request/response validation.

These schemas define the API contract between backend and frontend.
TypeScript types in frontend/src/types/ must mirror these exactly.
"""

from datetime import datetime
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
    """Review status of a violation."""

    PENDING = "pending"
    APPROVED = "approved"
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
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    evidence_url: Optional[str] = None
    evidence_hash: Optional[str] = None


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


class DetectResponse(BaseModel):
    """Response from POST /api/v1/detect."""

    success: bool
    processing_time_ms: int
    timing_breakdown: TimingBreakdown
    violations: list[ViolationRecord]
    image_dimensions: ImageDimensions


class ViolationListResponse(BaseModel):
    """Response from GET /api/v1/violations."""

    total: int
    page: int
    page_size: int
    violations: list[ViolationRecord]


class ViolationActionRequest(BaseModel):
    """Request to approve or reject a violation."""

    action: str = Field(..., pattern="^(approve|reject)$")
    reason: Optional[str] = None


class ViolationActionResponse(BaseModel):
    """Response after approving or rejecting a violation."""

    id: str
    status: ViolationStatus
    message: str


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


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    version: str = "1.0.0"
    models_loaded: bool = False
    demo_mode: bool = False
