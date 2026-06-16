"""Unit tests for evidence image generation and hashing."""

import numpy as np
import pytest

from backend.app.core.evidence import (
    VIOLATION_COLORS,
    VIOLATION_INFO,
    generate_evidence_image,
)


def _make_test_image(h: int = 480, w: int = 640) -> np.ndarray:
    """Create a random BGR test image."""
    return np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)


class TestViolationColors:
    """Tests for violation color mapping completeness."""

    def test_all_types_have_colors(self) -> None:
        assert "no_helmet" in VIOLATION_COLORS
        assert "triple_riding" in VIOLATION_COLORS
        assert "wrong_side_driving" in VIOLATION_COLORS
        assert "illegal_parking" in VIOLATION_COLORS
        assert "no_seatbelt" in VIOLATION_COLORS
        assert "stop_line_violation" in VIOLATION_COLORS
        assert "red_light_violation" in VIOLATION_COLORS

    def test_all_colors_are_bgr_tuples(self) -> None:
        for vtype, color in VIOLATION_COLORS.items():
            assert len(color) == 3, f"{vtype} color should be 3-tuple"
            assert all(isinstance(c, int) for c in color), f"{vtype} color should be ints"


class TestViolationInfo:
    """Tests for violation info mapping completeness."""

    def test_all_types_have_info(self) -> None:
        for vtype in [
            "no_helmet", "triple_riding", "wrong_side_driving",
            "illegal_parking", "no_seatbelt", "stop_line_violation",
            "red_light_violation", "license_plate_mismatch",
        ]:
            assert vtype in VIOLATION_INFO, f"Missing info for {vtype}"

    def test_info_has_required_keys(self) -> None:
        for vtype, info in VIOLATION_INFO.items():
            assert "section" in info, f"{vtype} missing section"
            assert "amount" in info, f"{vtype} missing amount"
            assert "label" in info, f"{vtype} missing label"


class TestGenerateEvidenceImage:
    """Tests for evidence image generation."""

    def test_no_violations_returns_original(self) -> None:
        img = _make_test_image()
        annotated, filename, hash_val = generate_evidence_image(img, [])
        assert annotated.shape == img.shape
        assert filename.startswith("img_")
        assert hash_val.startswith("sha256:")

    def test_single_violation_draws_bbox(self) -> None:
        img = _make_test_image()
        violations = [{
            "type": "no_helmet",
            "bbox": [0.1, 0.1, 0.3, 0.5],
            "confidence": 0.85,
        }]
        annotated, filename, hash_val = generate_evidence_image(img, violations)
        assert annotated.shape == img.shape
        # Annotated image should differ from original (bbox drawn)
        assert not np.array_equal(annotated, img)

    def test_multiple_violations(self) -> None:
        img = _make_test_image()
        violations = [
            {"type": "no_helmet", "bbox": [0.1, 0.1, 0.3, 0.5], "confidence": 0.9},
            {"type": "triple_riding", "bbox": [0.4, 0.2, 0.6, 0.6], "confidence": 0.7},
        ]
        annotated, filename, hash_val = generate_evidence_image(img, violations)
        assert annotated.shape == img.shape

    def test_hash_is_sha256_format(self) -> None:
        img = _make_test_image()
        _, _, hash_val = generate_evidence_image(img, [])
        assert hash_val.startswith("sha256:")
        hash_hex = hash_val[7:]
        assert len(hash_hex) == 64  # SHA-256 hex digest length
        assert all(c in "0123456789abcdef" for c in hash_hex)

    def test_with_camera_id(self) -> None:
        img = _make_test_image()
        annotated, _, _ = generate_evidence_image(
            img, [], camera_id="MGROAD-01"
        )
        assert annotated.shape == img.shape

    def test_with_plate_results(self) -> None:
        img = _make_test_image()
        violations = [{"type": "no_helmet", "bbox": [0.1, 0.1, 0.3, 0.5], "confidence": 0.9}]
        plates = [{"text": "KA01AB1234", "confidence": 0.8, "bbox": [0.5, 0.5, 0.7, 0.6]}]
        annotated, _, _ = generate_evidence_image(img, violations, plates)
        assert annotated.shape == img.shape

    def test_filename_format(self) -> None:
        img = _make_test_image()
        _, filename, _ = generate_evidence_image(img, [])
        # Format: img_YYYYMMDD_HHMMSS_abcd.jpg
        assert filename.startswith("img_")
        assert filename.endswith(".jpg")
