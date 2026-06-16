"""End-to-end integration tests for the full VigilAI pipeline.

Tests the entire flow from seed data through detection to evidence viewing
using the real FastAPI TestClient with actual model inference. No mocks.

Run with:    python -m pytest backend/tests/test_e2e.py -v --tb=long
Skip slow:   python -m pytest backend/tests/ -v -m "not slow"
Run slow:    python -m pytest backend/tests/ -v -m slow
"""

import io
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Generator

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.db.database import SessionLocal
from backend.app.db.models import (
    FINE_SCHEDULE,
    AuditLogDB,
    ConfidenceTierDB,
    DataSourceDB,
    ViolationRecordDB,
    ViolationStatusDB,
    ViolationTypeDB,
    get_confidence_tier,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed_violation(
    db: Session,
    *,
    violation_id: str,
    violation_type: str = "no_helmet",
    confidence: float = 0.85,
    status: str = "pending",
    camera_id: str = "MGROAD-01",
    junction_name: str = "MG Road - Trinity Circle",
    latitude: float = 12.9758,
    longitude: float = 77.6045,
    evidence_url: str | None = None,
    evidence_hash: str | None = None,
) -> ViolationRecordDB:
    """Insert a single violation record directly into the database.

    Args:
        db: Active SQLAlchemy session.
        violation_id: Unique identifier for the violation.
        violation_type: Violation type string (e.g. 'no_helmet').
        confidence: Detection confidence (0.0–1.0).
        status: Review status ('pending', 'approved', 'rejected').
        camera_id: Camera identifier.
        junction_name: Human-readable junction name.
        latitude: GPS latitude.
        longitude: GPS longitude.
        evidence_url: Optional evidence image URL path.
        evidence_hash: Optional SHA-256 evidence hash.

    Returns:
        The created ViolationRecordDB instance.
    """
    tier = get_confidence_tier(confidence)
    fine_info = FINE_SCHEDULE.get(violation_type, {"section": "177", "amount": 200})

    record = ViolationRecordDB(
        id=violation_id,
        violation_type=violation_type,
        confidence=confidence,
        confidence_tier=tier,
        bbox={"x1": 0.1, "y1": 0.2, "x2": 0.5, "y2": 0.8},
        person_bbox={"x1": 0.1, "y1": 0.15, "x2": 0.5, "y2": 0.75} if violation_type in ("no_helmet", "triple_riding") else None,
        violation_metadata={"source": "e2e_test"},
        mv_act_section=str(fine_info["section"]),
        fine_amount=int(fine_info["amount"]),
        status=status,
        data_source=DataSourceDB.SEEDED.value,
        camera_id=camera_id,
        junction_name=junction_name,
        latitude=latitude,
        longitude=longitude,
        timestamp=datetime.now(timezone.utc),
        evidence_url=evidence_url,
        evidence_hash=evidence_hash,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _create_test_jpeg(width: int = 640, height: int = 480) -> bytes:
    """Create a synthetic JPEG image for detection testing.

    The image contains rectangles to give the detector visual structure.

    Args:
        width: Image width in pixels.
        height: Image height in pixels.

    Returns:
        JPEG-encoded image bytes.
    """
    img = np.full((height, width, 3), 128, dtype=np.uint8)
    cv2.rectangle(img, (100, 50), (300, 400), (200, 200, 200), -1)
    cv2.rectangle(img, (350, 200), (500, 350), (60, 60, 60), -1)
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return buf.tobytes()


def _generate_unique_id(prefix: str = "e2e") -> str:
    """Generate a unique test ID to avoid collisions across runs.

    Args:
        prefix: Optional prefix for the ID.

    Returns:
        Unique string identifier.
    """
    short_uuid = uuid.uuid4().hex[:8]
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    return f"{prefix}_{ts}_{short_uuid}"


# ---------------------------------------------------------------------------
# Module-scoped fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    """Create a TestClient that runs the real FastAPI lifespan.

    Models are loaded into GPU and the database is initialized once
    for all tests in this module. The client is yielded so tests can
    exercise every endpoint with real inference.
    """
    from backend.app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def seed_ids() -> list[str]:
    """Seed a batch of test violations into the database.

    Returns:
        List of violation IDs that were created.
    """
    db = SessionLocal()
    created_ids: list[str] = []
    try:
        # Clean up any leftover e2e seed records from previous runs
        db.query(ViolationRecordDB).filter(
            ViolationRecordDB.id.like("v_e2e_%")
        ).delete(synchronize_session=False)
        db.commit()

        # Create a mix of violation types and statuses
        seeds = [
            {"vtype": "no_helmet", "status": "pending", "camera": "MGROAD-01", "conf": 0.92},
            {"vtype": "triple_riding", "status": "pending", "camera": "MGROAD-01", "conf": 0.78},
            {"vtype": "no_helmet", "status": "approved", "camera": "HEBBAL-01", "conf": 0.88},
            {"vtype": "illegal_parking", "status": "pending", "camera": "SILKBOARD-01", "conf": 0.65},
            {"vtype": "wrong_side_driving", "status": "rejected", "camera": "WHITEFIELD-01", "conf": 0.71},
            {"vtype": "no_seatbelt", "status": "pending", "camera": "MGROAD-01", "conf": 0.83},
            {"vtype": "stop_line_violation", "status": "pending", "camera": "HEBBAL-01", "conf": 0.55},
            {"vtype": "no_helmet", "status": "pending", "camera": "ELECTRONIC-01", "conf": 0.90},
            {"vtype": "triple_riding", "status": "approved", "camera": "MARATHAHALLI-01", "conf": 0.81},
            {"vtype": "license_plate_mismatch", "status": "pending", "camera": "MGROAD-01", "conf": 0.74},
        ]

        camera_locations = {
            "MGROAD-01": ("MG Road - Trinity Circle", 12.9758, 77.6045),
            "HEBBAL-01": ("Hebbal Flyover", 13.0358, 77.5970),
            "SILKBOARD-01": ("Silk Board Junction", 12.9177, 77.6238),
            "WHITEFIELD-01": ("Whitefield Main Road", 12.9698, 77.7500),
            "ELECTRONIC-01": ("Electronic City Phase 1", 12.8456, 77.6603),
            "MARATHAHALLI-01": ("Marathahalli Bridge", 12.9591, 77.6974),
        }

        run_tag = uuid.uuid4().hex[:8]
        for i, s in enumerate(seeds):
            v_id = f"v_e2e_{run_tag}_{i:03d}"
            loc = camera_locations.get(s["camera"], ("Unknown", 0.0, 0.0))
            _seed_violation(
                db,
                violation_id=v_id,
                violation_type=s["vtype"],
                confidence=s["conf"],
                status=s["status"],
                camera_id=s["camera"],
                junction_name=loc[0],
                latitude=loc[1],
                longitude=loc[2],
            )
            created_ids.append(v_id)
    finally:
        db.close()
    return created_ids


@pytest.fixture()
def test_jpeg() -> bytes:
    """Provide a synthetic JPEG image for detection tests.

    Returns:
        JPEG-encoded image bytes.
    """
    return _create_test_jpeg(640, 480)


# ---------------------------------------------------------------------------
# TestE2EHealthAndReadiness
# ---------------------------------------------------------------------------

@pytest.mark.slow
class TestE2EHealthAndReadiness:
    """Verify application health and analytics seeded-data stats."""

    def test_health_models_loaded(self, client: TestClient) -> None:
        """GET /health returns models_loaded=True after lifespan startup."""
        resp = client.get("/health")
        assert resp.status_code == 200

        data = resp.json()
        assert data["status"] == "ok"
        assert data["models_loaded"] is True, "Resident models should be loaded"
        assert isinstance(data["demo_mode"], bool)

    def test_analytics_reflects_seeded_data(
        self, client: TestClient, seed_ids: list[str]
    ) -> None:
        """GET /api/v1/analytics returns stats that include seeded violations."""
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

        # We seeded 10 violations — total must be >= 10
        assert data["total_violations"] >= len(seed_ids), (
            f"Expected at least {len(seed_ids)} violations, got {data['total_violations']}"
        )

        # Verify no_helmet appears in type breakdown
        assert "no_helmet" in data["violations_by_type"], (
            "no_helmet should appear in violations_by_type after seeding"
        )

        # Verify pending status appears
        assert "pending" in data["violations_by_status"], (
            "pending status should appear in violations_by_status after seeding"
        )


# ---------------------------------------------------------------------------
# TestE2EDetectionPipeline
# ---------------------------------------------------------------------------

@pytest.mark.slow
class TestE2EDetectionPipeline:
    """Full detection pipeline with real model inference."""

    def test_detect_returns_valid_response(
        self, client: TestClient, test_jpeg: bytes
    ) -> None:
        """POST /api/v1/detect with a real JPEG returns proper DetectResponse."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.jpg", test_jpeg, "image/jpeg")},
            data={"camera_id": "MGROAD-01"},
        )
        assert resp.status_code == 200

        data = resp.json()
        assert data["success"] is True
        assert isinstance(data["processing_time_ms"], int)
        assert data["processing_time_ms"] > 0
        assert isinstance(data["violations"], list)
        assert isinstance(data["image_dimensions"], dict)

    def test_timing_breakdown_has_all_fields(
        self, client: TestClient, test_jpeg: bytes
    ) -> None:
        """Timing breakdown contains all expected stage fields."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.jpg", test_jpeg, "image/jpeg")},
            data={"camera_id": "MGROAD-01"},
        )
        assert resp.status_code == 200

        tb = resp.json()["timing_breakdown"]
        expected_fields = [
            "preprocess_ms",
            "detect_coco_ms",
            "detect_helmet_ms",
            "violation_logic_ms",
            "detect_plate_ms",
            "ocr_ms",
            "evidence_gen_ms",
        ]
        for field in expected_fields:
            assert field in tb, f"Missing timing field: {field}"
            assert isinstance(tb[field], int), f"{field} should be int"
            assert tb[field] >= 0, f"{field} must be non-negative"

    def test_image_dimensions_match_input(
        self, client: TestClient, test_jpeg: bytes
    ) -> None:
        """Response image_dimensions match the 640x480 input."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.jpg", test_jpeg, "image/jpeg")},
            data={"camera_id": "MGROAD-01"},
        )
        assert resp.status_code == 200

        dims = resp.json()["image_dimensions"]
        assert dims["width"] == 640
        assert dims["height"] == 480

    def test_violations_have_required_fields(
        self, client: TestClient, test_jpeg: bytes
    ) -> None:
        """Each violation in the response includes all required metadata."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.jpg", test_jpeg, "image/jpeg")},
            data={"camera_id": "MGROAD-01"},
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
            assert "camera_id" in v
            assert v["camera_id"] == "MGROAD-01"

    def test_violations_have_location_fields(
        self, client: TestClient, test_jpeg: bytes
    ) -> None:
        """Violations include junction_name, latitude, longitude from camera info."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.jpg", test_jpeg, "image/jpeg")},
            data={"camera_id": "MGROAD-01"},
        )
        assert resp.status_code == 200

        violations = resp.json()["violations"]
        if violations:
            v = violations[0]
            assert "junction_name" in v
            assert "latitude" in v
            assert "longitude" in v
            # MGROAD-01 should map to MG Road - Trinity Circle
            assert v["junction_name"] == "MG Road - Trinity Circle"
            assert abs(v["latitude"] - 12.9758) < 0.01
            assert abs(v["longitude"] - 77.6045) < 0.01

    def test_detect_processing_time_reasonable(
        self, client: TestClient, test_jpeg: bytes
    ) -> None:
        """Total processing time should be under 30 seconds."""
        resp = client.post(
            "/api/v1/detect",
            files={"image": ("test.jpg", test_jpeg, "image/jpeg")},
            data={"camera_id": "MGROAD-01"},
        )
        assert resp.status_code == 200

        total_ms = resp.json()["processing_time_ms"]
        assert total_ms < 30_000, f"Processing took {total_ms}ms — too slow"


# ---------------------------------------------------------------------------
# TestE2EViolationLifecycle
# ---------------------------------------------------------------------------

@pytest.mark.slow
class TestE2EViolationLifecycle:
    """Full lifecycle: detect → list → get → approve → verify status."""

    def test_full_lifecycle(
        self, client: TestClient, test_jpeg: bytes
    ) -> None:
        """Detect a violation, list it, get details, approve it, verify status."""
        # Step 1: Detect a violation
        detect_resp = client.post(
            "/api/v1/detect",
            files={"image": ("lifecycle_test.jpg", test_jpeg, "image/jpeg")},
            data={"camera_id": "MGROAD-01"},
        )
        assert detect_resp.status_code == 200
        detect_data = detect_resp.json()
        violations = detect_data["violations"]

        # Step 2: If violations were detected, exercise the full lifecycle
        if violations:
            v_id = violations[0]["id"]

            # Step 3: GET /api/v1/violations to list it
            list_resp = client.get("/api/v1/violations")
            assert list_resp.status_code == 200
            list_data = list_resp.json()
            found_in_list = any(v["id"] == v_id for v in list_data["violations"])
            assert found_in_list, f"Violation {v_id} not found in violations list"

            # Step 4: GET /api/v1/violations/{id} to get details
            detail_resp = client.get(f"/api/v1/violations/{v_id}")
            assert detail_resp.status_code == 200
            detail = detail_resp.json()
            assert detail["id"] == v_id
            assert detail["status"] == "pending"

            # Step 5: POST /api/v1/violations/{id}/action with approve
            action_resp = client.post(
                f"/api/v1/violations/{v_id}/action",
                json={"action": "approve", "reason": "E2E test approval"},
            )
            assert action_resp.status_code == 200
            action_data = action_resp.json()
            assert action_data["id"] == v_id
            assert action_data["status"] == "approved"

            # Step 6: GET /api/v1/violations/{id} to verify status changed
            verify_resp = client.get(f"/api/v1/violations/{v_id}")
            assert verify_resp.status_code == 200
            verify_data = verify_resp.json()
            assert verify_data["status"] == "approved", (
                f"Status should be 'approved' after action, got '{verify_data['status']}'"
            )

            # Step 7: GET /api/v1/analytics to verify approved violation shows
            analytics_resp = client.get("/api/v1/analytics")
            assert analytics_resp.status_code == 200
            analytics = analytics_resp.json()
            assert "approved" in analytics["violations_by_status"]
            assert analytics["violations_by_status"]["approved"] >= 1


# ---------------------------------------------------------------------------
# TestE2EEvidence
# ---------------------------------------------------------------------------

@pytest.mark.slow
class TestE2EEvidence:
    """Evidence image serving and chain-of-custody metadata."""

    def test_evidence_flow(
        self, client: TestClient, test_jpeg: bytes
    ) -> None:
        """Detect with HEBBAL-01 camera_id, then retrieve evidence and metadata."""
        # Step 1: Detect violations with HEBBAL-01
        detect_resp = client.post(
            "/api/v1/detect",
            files={"image": ("evidence_test.jpg", test_jpeg, "image/jpeg")},
            data={"camera_id": "HEBBAL-01"},
        )
        assert detect_resp.status_code == 200
        violations = detect_resp.json()["violations"]

        if violations:
            v_id = violations[0]["id"]

            # Step 2: GET /api/v1/evidence/{id} — verify image is served
            ev_resp = client.get(f"/api/v1/evidence/{v_id}")
            if ev_resp.status_code == 200:
                # Verify it returns JPEG content
                assert ev_resp.headers["content-type"] == "image/jpeg"
                # Verify the body is non-empty JPEG data
                body = ev_resp.content
                assert len(body) > 0
                # JPEG magic bytes: FF D8 FF
                assert body[:3] == b"\xff\xd8\xff", "Response body is not valid JPEG"

            # Step 3: GET /api/v1/evidence/{id}/metadata — verify chain-of-custody
            meta_resp = client.get(f"/api/v1/evidence/{v_id}/metadata")
            assert meta_resp.status_code == 200
            meta = meta_resp.json()
            assert meta["violation_id"] == v_id
            assert "evidence_url" in meta
            assert "evidence_hash" in meta
            assert "timestamp" in meta
            assert "camera_id" in meta
            assert meta["camera_id"] == "HEBBAL-01"
            # Hash should start with sha256: prefix
            if meta["evidence_hash"]:
                assert meta["evidence_hash"].startswith("sha256:"), (
                    f"Evidence hash should start with sha256:, got: {meta['evidence_hash']}"
                )


# ---------------------------------------------------------------------------
# TestE2EFilteringAndPagination
# ---------------------------------------------------------------------------

@pytest.mark.slow
class TestE2EFilteringAndPagination:
    """Verify filtering by type/status and pagination parameters."""

    def test_filter_by_violation_type(
        self, client: TestClient, seed_ids: list[str]
    ) -> None:
        """Filtering by violation_type=no_helmet returns only no_helmet records."""
        resp = client.get(
            "/api/v1/violations",
            params={"violation_type": "no_helmet"},
        )
        assert resp.status_code == 200

        data = resp.json()
        assert data["total"] >= 1, "Should have at least 1 no_helmet violation from seeding"
        for v in data["violations"]:
            assert v["violation_type"] == "no_helmet", (
                f"Expected no_helmet, got {v['violation_type']}"
            )

    def test_filter_by_status(
        self, client: TestClient, seed_ids: list[str]
    ) -> None:
        """Filtering by status=pending returns only pending records."""
        resp = client.get(
            "/api/v1/violations",
            params={"status": "pending"},
        )
        assert resp.status_code == 200

        data = resp.json()
        assert data["total"] >= 1, "Should have at least 1 pending violation from seeding"
        for v in data["violations"]:
            assert v["status"] == "pending", (
                f"Expected pending, got {v['status']}"
            )

    def test_pagination_metadata(
        self, client: TestClient, seed_ids: list[str]
    ) -> None:
        """Pagination returns correct page, page_size, and bounded results."""
        resp = client.get(
            "/api/v1/violations",
            params={"page": 1, "page_size": 2},
        )
        assert resp.status_code == 200

        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert len(data["violations"]) <= 2, (
            f"Expected at most 2 violations per page, got {len(data['violations'])}"
        )

    def test_pagination_second_page(
        self, client: TestClient, seed_ids: list[str]
    ) -> None:
        """Page 2 returns different results than page 1."""
        resp1 = client.get(
            "/api/v1/violations",
            params={"page": 1, "page_size": 2},
        )
        resp2 = client.get(
            "/api/v1/violations",
            params={"page": 2, "page_size": 2},
        )
        assert resp1.status_code == 200
        assert resp2.status_code == 200

        ids1 = {v["id"] for v in resp1.json()["violations"]}
        ids2 = {v["id"] for v in resp2.json()["violations"]}
        # No overlap between pages
        assert ids1.isdisjoint(ids2), "Page 1 and page 2 should not share violations"

    def test_combined_filter_and_pagination(
        self, client: TestClient, seed_ids: list[str]
    ) -> None:
        """Filtering + pagination works together."""
        resp = client.get(
            "/api/v1/violations",
            params={
                "violation_type": "no_helmet",
                "page": 1,
                "page_size": 1,
            },
        )
        assert resp.status_code == 200

        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 1
        assert len(data["violations"]) <= 1
        for v in data["violations"]:
            assert v["violation_type"] == "no_helmet"


# ---------------------------------------------------------------------------
# TestE2EAnalytics
# ---------------------------------------------------------------------------

@pytest.mark.slow
class TestE2EAnalytics:
    """Verify analytics endpoint with time and camera filters."""

    def test_analytics_all_fields(
        self, client: TestClient, seed_ids: list[str]
    ) -> None:
        """GET /api/v1/analytics?days=7 returns all expected fields."""
        resp = client.get("/api/v1/analytics", params={"days": 7})
        assert resp.status_code == 200

        data = resp.json()
        required_fields = [
            "total_violations",
            "violations_by_type",
            "violations_by_tier",
            "violations_by_status",
            "avg_confidence",
            "total_fines",
            "daily_counts",
            "top_cameras",
        ]
        for field in required_fields:
            assert field in data, f"Missing analytics field: {field}"

        # Seed data should produce violations
        assert data["total_violations"] >= len(seed_ids)

        # Verify type breakdown includes seeded types
        assert "no_helmet" in data["violations_by_type"]
        assert data["violations_by_type"]["no_helmet"] >= 1

        # Verify tier breakdown is populated
        assert len(data["violations_by_tier"]) > 0

        # Verify status breakdown
        assert "pending" in data["violations_by_status"]
        assert data["violations_by_status"]["pending"] >= 1

        # Verify total_fines is positive
        assert data["total_fines"] > 0

        # Verify avg_confidence is in valid range
        assert 0.0 <= data["avg_confidence"] <= 1.0

    def test_analytics_camera_filter(
        self, client: TestClient, seed_ids: list[str]
    ) -> None:
        """GET /api/v1/analytics?camera_id=MGROAD-01 filters to that camera."""
        resp = client.get(
            "/api/v1/analytics",
            params={"camera_id": "MGROAD-01"},
        )
        assert resp.status_code == 200

        data = resp.json()
        # We seeded multiple MGROAD-01 violations
        assert data["total_violations"] >= 2, (
            f"Expected >= 2 MGROAD-01 violations, got {data['total_violations']}"
        )

        # Top cameras should only list MGROAD-01
        if data["top_cameras"]:
            camera_ids = {cam["camera_id"] for cam in data["top_cameras"]}
            assert "MGROAD-01" in camera_ids

    def test_analytics_days_filter(
        self, client: TestClient, seed_ids: list[str]
    ) -> None:
        """GET /api/v1/analytics?days=1 returns only today's violations."""
        resp = client.get("/api/v1/analytics", params={"days": 1})
        assert resp.status_code == 200

        data = resp.json()
        # All seeded violations are recent (today), so total should match
        assert data["total_violations"] >= len(seed_ids)

    def test_analytics_combined_filters(
        self, client: TestClient, seed_ids: list[str]
    ) -> None:
        """Analytics with both days and camera_id filters."""
        resp = client.get(
            "/api/v1/analytics",
            params={"days": 7, "camera_id": "HEBBAL-01"},
        )
        assert resp.status_code == 200

        data = resp.json()
        # We seeded at least 1 HEBBAL-01 violation
        assert data["total_violations"] >= 1

    def test_analytics_total_fines_consistent(
        self, client: TestClient, seed_ids: list[str]
    ) -> None:
        """total_fines should equal sum of fine_amounts across all violations."""
        resp = client.get("/api/v1/analytics")
        assert resp.status_code == 200

        analytics = resp.json()

        # Query the DB directly to verify fine_amount sum, since the violations
        # API caps page_size at 100 but analytics covers all rows.
        db = SessionLocal()
        try:
            from sqlalchemy import func

            db_total = db.query(func.sum(ViolationRecordDB.fine_amount)).scalar() or 0
            db_count = db.query(func.count(ViolationRecordDB.id)).scalar() or 0
        finally:
            db.close()

        assert analytics["total_violations"] == db_count, (
            f"Analytics total_violations ({analytics['total_violations']}) != "
            f"DB count ({db_count})"
        )
        assert analytics["total_fines"] == db_total, (
            f"Analytics total_fines ({analytics['total_fines']}) != "
            f"DB sum of fine_amounts ({db_total})"
        )
