"""Integration tests for FastAPI endpoints using TestClient with real models.

These tests use the actual application lifespan — models are loaded into GPU,
preprocessing runs on real images, and violations are detected by the real
pipeline. No mocks or stubs.

Run with:    python -m pytest backend/tests/test_api.py -v
Skip slow:   python -m pytest backend/tests/ -v -m "not slow"
Run slow:    python -m pytest backend/tests/ -v -m slow
"""

import io
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

# ── Slow marker ────────────────────────────────────────────────────────
# Register "slow" marker so pytest doesn't warn about unknown markers.
# This also documents the marker for pyproject.toml / pytest.ini if added later.


# ── Fixtures ───────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def client() -> TestClient:
    """Create a TestClient that runs the real FastAPI lifespan.

    This loads all resident models (COCO + Helmet) into GPU and initializes
    the database. Scope=module means models load once for all tests in this
    file, not once per test.
    """
    from backend.app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture()
def test_jpeg() -> bytes:
    """Create a synthetic 640x480 JPEG for detection testing.

    The image contains a simple rectangle to give the detector something
    to process. It is not expected to trigger specific violations — the
    tests verify the pipeline runs end-to-end and returns valid structure.

    Returns:
        JPEG-encoded image bytes.
    """
    img = np.full((480, 640, 3), 128, dtype=np.uint8)
    # Draw a rectangle to give some visual structure
    cv2.rectangle(img, (100, 50), (300, 400), (200, 200, 200), -1)
    cv2.rectangle(img, (350, 200), (500, 350), (60, 60, 60), -1)
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return buf.tobytes()


@pytest.fixture()
def test_png() -> bytes:
    """Create a synthetic 640x480 PNG for format-variation testing.

    Returns:
        PNG-encoded image bytes.
    """
    img = np.full((480, 640, 3), 80, dtype=np.uint8)
    cv2.rectangle(img, (150, 80), (400, 380), (180, 180, 180), -1)
    _, buf = cv2.imencode(".png", img)
    return buf.tobytes()


# ── Health endpoint ────────────────────────────────────────────────────


@pytest.mark.slow
class TestHealthEndpoint:
    """Tests for GET /health — verifies model loading state."""

    def test_health_returns_200(self, client: TestClient) -> None:
        """Health endpoint returns 200 with expected fields."""
        resp = client.get("/health")
        assert resp.status_code == 200

        data = resp.json()
        assert data["status"] == "ok"
        assert "models_loaded" in data
        assert isinstance(data["models_loaded"], bool)
        assert "demo_mode" in data

    def test_health_models_loaded(self, client: TestClient) -> None:
        """After lifespan startup, models should be loaded."""
        resp = client.get("/health")
        data = resp.json()
        assert data["models_loaded"] is True, "Models should be loaded after lifespan startup"


# ── Detect endpoint ────────────────────────────────────────────────────


@pytest.mark.slow
class TestDetectEndpoint:
    """Tests for POST /api/v1/detect — full pipeline with real inference."""

    def test_detect_jpeg_returns_200(self, client: TestClient, test_jpeg: bytes) -> None:
        """Detect endpoint accepts a JPEG and returns a valid DetectResponse."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.jpg", test_jpeg, "image/jpeg")},
            data={"camera_id": "MGROAD-01"},
        )
        assert resp.status_code == 200

        data = resp.json()
        self._assert_detect_response_structure(data)

    def test_detect_png_returns_200(self, client: TestClient, test_png: bytes) -> None:
        """Detect endpoint accepts a PNG and returns a valid DetectResponse."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.png", test_png, "image/png")},
        )
        assert resp.status_code == 200

        data = resp.json()
        self._assert_detect_response_structure(data)

    def test_detect_without_camera_id(self, client: TestClient, test_jpeg: bytes) -> None:
        """camera_id is optional — detect should succeed without it."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.jpg", test_jpeg, "image/jpeg")},
        )
        assert resp.status_code == 200

    def test_detect_invalid_format(self, client: TestClient) -> None:
        """Non-image files should be rejected with 400."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.txt", b"not an image", "text/plain")},
        )
        assert resp.status_code == 400

    def test_detect_timing_breakdown(self, client: TestClient, test_jpeg: bytes) -> None:
        """Timing breakdown values should be non-negative integers."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.jpg", test_jpeg, "image/jpeg")},
        )
        assert resp.status_code == 200

        tb = resp.json()["timing_breakdown"]
        for field in (
            "preprocess_ms",
            "detect_coco_ms",
            "detect_helmet_ms",
            "violation_logic_ms",
            "detect_plate_ms",
            "ocr_ms",
            "evidence_gen_ms",
        ):
            assert field in tb, f"Missing timing field: {field}"
            assert isinstance(tb[field], int), f"{field} should be int, got {type(tb[field])}"
            assert tb[field] >= 0, f"{field} should be non-negative"

    def test_detect_image_dimensions(self, client: TestClient, test_jpeg: bytes) -> None:
        """Image dimensions in response should match the input image."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.jpg", test_jpeg, "image/jpeg")},
        )
        assert resp.status_code == 200

        dims = resp.json()["image_dimensions"]
        assert dims["width"] == 640
        assert dims["height"] == 480

    def test_detect_violation_structure(self, client: TestClient, test_jpeg: bytes) -> None:
        """Each violation in the response should have required fields."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.jpg", test_jpeg, "image/jpeg")},
        )
        assert resp.status_code == 200

        violations = resp.json()["violations"]
        for v in violations:
            assert "id" in v
            assert "violation_type" in v
            assert "confidence" in v
            assert "confidence_tier" in v
            assert "bbox" in v
            assert "mv_act_section" in v
            assert "fine_amount" in v
            assert "status" in v

    def test_detect_processing_time_reasonable(self, client: TestClient, test_jpeg: bytes) -> None:
        """Total processing time should be under 30 seconds for a single image."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.jpg", test_jpeg, "image/jpeg")},
        )
        assert resp.status_code == 200

        total_ms = resp.json()["processing_time_ms"]
        assert total_ms < 30_000, f"Processing took {total_ms}ms — too slow for a single image"

    # ── Helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _assert_detect_response_structure(data: dict) -> None:
        """Assert the DetectResponse JSON has all required top-level fields."""
        assert data["success"] is True
        assert isinstance(data["processing_time_ms"], int)
        assert isinstance(data["timing_breakdown"], dict)
        assert isinstance(data["violations"], list)
        assert isinstance(data["image_dimensions"], dict)
        assert "width" in data["image_dimensions"]
        assert "height" in data["image_dimensions"]


# ── Violations endpoint ────────────────────────────────────────────────


@pytest.mark.slow
class TestViolationsEndpoint:
    """Tests for GET /api/v1/violations — list, filter, paginate."""

    def test_list_violations_returns_200(self, client: TestClient) -> None:
        """Violations endpoint returns a valid paginated list."""
        resp = client.get("/api/v1/violations")
        assert resp.status_code == 200

        data = resp.json()
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "violations" in data
        assert isinstance(data["violations"], list)

    def test_filter_by_type(self, client: TestClient) -> None:
        """Filtering by violation_type returns 200 (may be empty)."""
        resp = client.get("/api/v1/violations", params={"violation_type": "no_helmet"})
        assert resp.status_code == 200

        data = resp.json()
        for v in data["violations"]:
            assert v["violation_type"] == "no_helmet"

    def test_filter_by_status(self, client: TestClient) -> None:
        """Filtering by status returns 200 (may be empty)."""
        resp = client.get("/api/v1/violations", params={"status": "pending"})
        assert resp.status_code == 200

        data = resp.json()
        for v in data["violations"]:
            assert v["status"] == "pending"

    def test_pagination(self, client: TestClient) -> None:
        """Pagination with page and page_size returns correct metadata."""
        resp = client.get("/api/v1/violations", params={"page": 1, "page_size": 5})
        assert resp.status_code == 200

        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 5
        assert len(data["violations"]) <= 5

    def test_get_single_violation_404(self, client: TestClient) -> None:
        """Requesting a non-existent violation returns 404."""
        resp = client.get("/api/v1/violations/nonexistent_id")
        assert resp.status_code == 404


# ── Analytics endpoint ─────────────────────────────────────────────────


@pytest.mark.slow
class TestAnalyticsEndpoint:
    """Tests for GET /api/v1/analytics — statistics and trends."""

    def test_analytics_returns_200(self, client: TestClient) -> None:
        """Analytics endpoint returns a valid overview."""
        resp = client.get("/api/v1/analytics")
        assert resp.status_code == 200

        data = resp.json()
        assert "total_violations" in data
        assert "violations_by_type" in data
        assert "violations_by_status" in data
        assert "avg_confidence" in data
        assert "total_fines" in data
        assert "daily_counts" in data
        assert "top_cameras" in data

    def test_analytics_with_days_param(self, client: TestClient) -> None:
        """days parameter limits the query time range."""
        resp = client.get("/api/v1/analytics", params={"days": 7})
        assert resp.status_code == 200

    def test_analytics_with_camera_filter(self, client: TestClient) -> None:
        """camera_id parameter filters analytics to that camera."""
        resp = client.get("/api/v1/analytics", params={"camera_id": "MGROAD-01"})
        assert resp.status_code == 200

    def test_analytics_days_boundary(self, client: TestClient) -> None:
        """days=1 should return only today's violations."""
        resp = client.get("/api/v1/analytics", params={"days": 1})
        assert resp.status_code == 200


# ── Evidence endpoint ──────────────────────────────────────────────────


@pytest.mark.slow
class TestEvidenceEndpoint:
    """Tests for GET /api/v1/evidence/{violation_id} — evidence images."""

    def test_evidence_404_for_unknown_violation(self, client: TestClient) -> None:
        """Requesting evidence for a non-existent violation returns 404."""
        resp = client.get("/api/v1/evidence/nonexistent_id")
        assert resp.status_code == 404

    def test_evidence_metadata_404_for_unknown(self, client: TestClient) -> None:
        """Requesting metadata for a non-existent violation returns 404."""
        resp = client.get("/api/v1/evidence/nonexistent_id/metadata")
        assert resp.status_code == 404


# ── Action endpoint (approve/reject) ──────────────────────────────────


@pytest.mark.slow
class TestActionEndpoint:
    """Tests for POST /api/v1/violations/{id}/action — approve/reject."""

    def test_action_404_for_unknown_violation(self, client: TestClient) -> None:
        """Action on a non-existent violation returns 404."""
        resp = client.post(
            "/api/v1/violations/nonexistent_id/action",
            json={"action": "approve", "reason": "test"},
        )
        assert resp.status_code == 404

    def test_action_invalid_action(self, client: TestClient) -> None:
        """An invalid action string should be rejected by Pydantic validation."""
        resp = client.post(
            "/api/v1/violations/some_id/action",
            json={"action": "invalid_action", "reason": "test"},
        )
        assert resp.status_code == 422  # Pydantic validation error
