"""Unit tests for Pydantic API schemas."""

import pytest
from datetime import datetime, timezone
from pydantic import ValidationError

from backend.app.schemas import (
    ViolationType,
    DataSource,
    ConfidenceTier,
    ViolationStatus,
    Bbox,
    LicensePlateResult,
    ViolationRecord,
    DetectResponse,
    TimingBreakdown,
    ImageDimensions,
    ViolationListResponse,
    ViolationActionRequest,
    AnalyticsOverview,
    HealthResponse,
)


class TestViolationTypeEnum:
    """Tests for ViolationType enum completeness."""

    def test_all_8_types_exist(self) -> None:
        assert len(ViolationType) == 8

    def test_values(self) -> None:
        assert ViolationType.NO_HELMET.value == "no_helmet"
        assert ViolationType.TRIPLE_RIDING.value == "triple_riding"
        assert ViolationType.LICENSE_PLATE_MISMATCH.value == "license_plate_mismatch"


class TestBbox:
    """Tests for Bbox validation."""

    def test_valid_bbox(self) -> None:
        b = Bbox(x1=0.1, y1=0.2, x2=0.5, y2=0.8)
        assert b.x1 == 0.1

    def test_bbox_bounds_validation(self) -> None:
        with pytest.raises(ValidationError):
            Bbox(x1=-0.1, y1=0.0, x2=0.5, y2=0.5)

        with pytest.raises(ValidationError):
            Bbox(x1=0.0, y1=0.0, x2=1.5, y2=0.5)


class TestViolationRecord:
    """Tests for ViolationRecord schema construction."""

    def _make_record(self, **overrides) -> dict:
        base = {
            "id": "v_20260616_143022_000",
            "violation_type": "no_helmet",
            "confidence": 0.85,
            "confidence_tier": "high",
            "bbox": {"x1": 0.1, "y1": 0.2, "x2": 0.3, "y2": 0.5},
            "mv_act_section": "129",
            "fine_amount": 500,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        base.update(overrides)
        return base

    def test_minimal_record(self) -> None:
        record = ViolationRecord(**self._make_record())
        assert record.id == "v_20260616_143022_000"
        assert record.violation_type == ViolationType.NO_HELMET

    def test_with_license_plate(self) -> None:
        data = self._make_record(
            license_plate={
                "text": "KA01AB1234",
                "confidence": 0.9,
                "bbox": {"x1": 0.5, "y1": 0.6, "x2": 0.7, "y2": 0.7},
            }
        )
        record = ViolationRecord(**data)
        assert record.license_plate is not None
        assert record.license_plate.text == "KA01AB1234"

    def test_defaults(self) -> None:
        record = ViolationRecord(**self._make_record())
        assert record.status == ViolationStatus.PENDING
        assert record.data_source == DataSource.LIVE
        assert record.person_bbox is None
        assert record.license_plate is None
        assert record.camera_id is None


class TestDetectResponse:
    """Tests for DetectResponse schema."""

    def test_valid_response(self) -> None:
        resp = DetectResponse(
            success=True,
            processing_time_ms=450,
            timing_breakdown=TimingBreakdown(
                preprocess_ms=10,
                detect_coco_ms=50,
                detect_helmet_ms=40,
                violation_logic_ms=5,
                detect_plate_ms=100,
                ocr_ms=200,
                evidence_gen_ms=45,
            ),
            violations=[],
            image_dimensions=ImageDimensions(width=640, height=480),
        )
        assert resp.success is True
        assert resp.processing_time_ms == 450

    def test_timing_breakdown_partial(self) -> None:
        tb = TimingBreakdown(
            preprocess_ms=10,
            detect_coco_ms=50,
            detect_helmet_ms=40,
            violation_logic_ms=5,
            evidence_gen_ms=45,
        )
        assert tb.detect_plate_ms == 0
        assert tb.ocr_ms == 0


class TestViolationActionRequest:
    """Tests for action request validation."""

    def test_approve(self) -> None:
        req = ViolationActionRequest(action="approve")
        assert req.action == "approve"

    def test_reject(self) -> None:
        req = ViolationActionRequest(action="reject", reason="False positive")
        assert req.reason == "False positive"

    def test_invalid_action(self) -> None:
        with pytest.raises(ValidationError):
            ViolationActionRequest(action="delete")


class TestHealthResponse:
    """Tests for health check response."""

    def test_defaults(self) -> None:
        resp = HealthResponse()
        assert resp.status == "ok"
        assert resp.models_loaded is False
        assert resp.demo_mode is False
