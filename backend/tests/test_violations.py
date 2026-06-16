"""Unit tests for violation detection algorithms."""

import numpy as np
import pytest

from backend.app.core.violations import (
    compute_iou,
    bbox_center,
    point_in_polygon,
    detect_helmet_violations,
    detect_triple_riding,
    detect_wrong_side,
    detect_illegal_parking,
    detect_seatbelt_violations,
    detect_stop_line_violations,
    detect_red_light_violations,
    detect_all_violations,
)


class TestComputeIoU:
    """Tests for IoU computation."""

    def test_perfect_overlap(self) -> None:
        box = [0, 0, 100, 100]
        assert compute_iou(box, box) == pytest.approx(1.0)

    def test_no_overlap(self) -> None:
        a = [0, 0, 50, 50]
        b = [100, 100, 150, 150]
        assert compute_iou(a, b) == 0.0

    def test_partial_overlap(self) -> None:
        a = [0, 0, 100, 100]
        b = [50, 50, 150, 150]
        iou = compute_iou(a, b)
        assert 0.0 < iou < 1.0

    def test_containment(self) -> None:
        outer = [0, 0, 200, 200]
        inner = [25, 25, 75, 75]
        iou = compute_iou(outer, inner)
        expected = (50 * 50) / (200 * 200 + 50 * 50 - 50 * 50)
        assert iou == pytest.approx(expected)

    def test_zero_area_box(self) -> None:
        a = [0, 0, 0, 0]
        b = [0, 0, 100, 100]
        assert compute_iou(a, b) == 0.0


class TestBboxCenter:
    """Tests for bbox center computation."""

    def test_center(self) -> None:
        cx, cy = bbox_center([10, 20, 110, 120])
        assert cx == 60.0
        assert cy == 70.0

    def test_square_center(self) -> None:
        cx, cy = bbox_center([0, 0, 100, 100])
        assert cx == 50.0
        assert cy == 50.0


class TestPointInPolygon:
    """Tests for point-in-polygon ray casting."""

    def test_inside_square(self) -> None:
        polygon = [[0, 0], [1, 0], [1, 1], [0, 1]]
        assert point_in_polygon(0.5, 0.5, polygon) is True

    def test_outside_square(self) -> None:
        polygon = [[0, 0], [1, 0], [1, 1], [0, 1]]
        assert point_in_polygon(1.5, 1.5, polygon) is False

    def test_on_edge_is_inside(self) -> None:
        """Points on edges may be inside or outside depending on implementation."""
        polygon = [[0, 0], [1, 0], [1, 1], [0, 1]]
        # Edge case — just verify no crash
        point_in_polygon(1.0, 0.5, polygon)

    def test_degenerate_polygon(self) -> None:
        assert point_in_polygon(0.5, 0.5, [[0, 0], [1, 1]]) is False

    def test_triangle(self) -> None:
        polygon = [[0, 0], [1, 0], [0.5, 1]]
        assert point_in_polygon(0.5, 0.3, polygon) is True
        assert point_in_polygon(0.9, 0.9, polygon) is False


class TestDetectHelmetViolations:
    """Tests for helmet non-compliance detection."""

    def test_no_helmet_detected(self) -> None:
        """Person near motorcycle with no helmet detection → violation."""
        person = {"bbox": [100, 50, 150, 300], "confidence": 0.9, "class_id": 0, "class_name": "person"}
        tw = {"bbox": [80, 100, 170, 350], "confidence": 0.85, "class_id": 3, "class_name": "motorcycle"}
        no_helmet = {"bbox": [105, 50, 145, 110], "confidence": 0.8, "class_name": "Without Helmet"}

        violations = detect_helmet_violations([person], [no_helmet], [tw], 400, 400)
        assert len(violations) == 1
        assert violations[0]["type"] == "no_helmet"
        assert violations[0]["confidence"] == 0.8

    def test_with_helmet_no_violation(self) -> None:
        """Person near motorcycle with helmet → no violation."""
        person = {"bbox": [100, 50, 150, 300], "confidence": 0.9, "class_id": 0, "class_name": "person"}
        tw = {"bbox": [80, 100, 170, 350], "confidence": 0.85, "class_id": 3, "class_name": "motorcycle"}
        helmet = {"bbox": [105, 50, 145, 110], "confidence": 0.85, "class_name": "With Helmet"}

        violations = detect_helmet_violations([person], [helmet], [tw], 400, 400)
        assert len(violations) == 0

    def test_person_not_near_motorcycle(self) -> None:
        """Person far from any two-wheeler → no violation."""
        person = {"bbox": [300, 50, 350, 300], "confidence": 0.9, "class_id": 0, "class_name": "person"}
        tw = {"bbox": [10, 100, 50, 350], "confidence": 0.85, "class_id": 3, "class_name": "motorcycle"}

        violations = detect_helmet_violations([person], [], [tw], 400, 400)
        assert len(violations) == 0


class TestDetectTripleRiding:
    """Tests for triple riding detection."""

    def test_three_riders_violation(self) -> None:
        tw = {"bbox": [100, 50, 170, 350], "confidence": 0.9, "class_id": 3, "class_name": "motorcycle"}
        riders = [
            {"bbox": [110, 60, 140, 300], "confidence": 0.85, "class_id": 0, "class_name": "person"},
            {"bbox": [125, 70, 150, 310], "confidence": 0.80, "class_id": 0, "class_name": "person"},
            {"bbox": [135, 80, 160, 320], "confidence": 0.75, "class_id": 0, "class_name": "person"},
        ]

        violations = detect_triple_riding(riders, [tw], 400, 400)
        assert len(violations) == 1
        assert violations[0]["type"] == "triple_riding"
        assert violations[0]["metadata"]["rider_count"] == 3

    def test_two_riders_no_violation(self) -> None:
        tw = {"bbox": [100, 50, 170, 350], "confidence": 0.9, "class_id": 3, "class_name": "motorcycle"}
        riders = [
            {"bbox": [110, 60, 140, 300], "confidence": 0.85, "class_id": 0, "class_name": "person"},
            {"bbox": [125, 70, 150, 310], "confidence": 0.80, "class_id": 0, "class_name": "person"},
        ]

        violations = detect_triple_riding(riders, [tw], 400, 400)
        assert len(violations) == 0


class TestDetectWrongSide:
    """Tests for wrong-side driving detection."""

    def test_vehicle_in_wrong_side_zone(self) -> None:
        vehicle = {"bbox": [200, 200, 250, 250], "confidence": 0.9, "class_name": "car"}
        lane = {"id": "lane-1", "polygon": [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]]}

        violations = detect_wrong_side([vehicle], [lane], 400, 400)
        assert len(violations) == 1
        assert violations[0]["type"] == "wrong_side_driving"

    def test_vehicle_outside_zone(self) -> None:
        vehicle = {"bbox": [10, 10, 50, 50], "confidence": 0.9, "class_name": "car"}
        lane = {"id": "lane-1", "polygon": [[0.6, 0.6], [0.8, 0.6], [0.8, 0.8], [0.6, 0.8]]}

        violations = detect_wrong_side([vehicle], [lane], 400, 400)
        assert len(violations) == 0


class TestDetectIllegalParking:
    """Tests for illegal parking detection."""

    def test_vehicle_in_no_parking_zone(self) -> None:
        vehicle = {"bbox": [200, 200, 250, 250], "confidence": 0.8, "class_name": "car"}
        zone = {"id": "np-1", "name": "No Parking", "polygon": [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]]}

        violations = detect_illegal_parking([vehicle], [zone], 400, 400)
        assert len(violations) == 1
        assert violations[0]["type"] == "illegal_parking"

    def test_low_confidence_vehicle_skipped(self) -> None:
        vehicle = {"bbox": [200, 200, 250, 250], "confidence": 0.2, "class_name": "car"}
        zone = {"id": "np-1", "name": "No Parking", "polygon": [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]]}

        violations = detect_illegal_parking([vehicle], [zone], 400, 400)
        assert len(violations) == 0


class TestDetectSeatbeltViolations:
    """Tests for seatbelt non-compliance (best-effort)."""

    def test_no_seatbelt_detection(self) -> None:
        det = {"bbox": [100, 50, 200, 150], "confidence": 0.7, "class_name": "no_seatbelt"}

        violations = detect_seatbelt_violations([], [det], 400, 400)
        assert len(violations) == 1
        assert violations[0]["type"] == "no_seatbelt"
        assert violations[0]["confidence"] == pytest.approx(0.7 * 0.7)

    def test_low_confidence_filtered(self) -> None:
        det = {"bbox": [100, 50, 200, 150], "confidence": 0.2, "class_name": "no_seatbelt"}

        violations = detect_seatbelt_violations([], [det], 400, 400)
        assert len(violations) == 0


class TestDetectStopLineViolations:
    """Tests for stop-line violation detection."""

    def test_vehicle_past_stop_line(self) -> None:
        vehicle = {"bbox": [200, 250, 250, 380], "confidence": 0.9, "class_name": "car"}
        zone = {"id": "sl-1", "polygon": [[0.4, 0.8], [0.6, 0.8], [0.6, 1.0], [0.4, 1.0]]}

        violations = detect_stop_line_violations([vehicle], [zone], 400, 400)
        assert len(violations) == 1
        assert violations[0]["type"] == "stop_line_violation"


class TestDetectRedLightViolations:
    """Tests for red-light violation detection."""

    def test_red_signal_vehicle_in_zone(self) -> None:
        vehicle = {"bbox": [200, 250, 250, 380], "confidence": 0.9, "class_name": "car"}
        zone = {"id": "sl-1", "polygon": [[0.4, 0.8], [0.6, 0.8], [0.6, 1.0], [0.4, 1.0]]}

        violations = detect_red_light_violations([vehicle], [zone], "red", 400, 400)
        assert len(violations) == 1
        assert violations[0]["type"] == "red_light_violation"

    def test_green_signal_no_violation(self) -> None:
        vehicle = {"bbox": [200, 250, 250, 380], "confidence": 0.9, "class_name": "car"}
        zone = {"id": "sl-1", "polygon": [[0.4, 0.8], [0.6, 0.8], [0.6, 1.0], [0.4, 1.0]]}

        violations = detect_red_light_violations([vehicle], [zone], "green", 400, 400)
        assert len(violations) == 0

    def test_unknown_signal_no_violation(self) -> None:
        vehicle = {"bbox": [200, 250, 250, 380], "confidence": 0.9, "class_name": "car"}
        zone = {"id": "sl-1", "polygon": [[0.4, 0.8], [0.6, 0.8], [0.6, 1.0], [0.4, 1.0]]}

        violations = detect_red_light_violations([vehicle], [zone], "unknown", 400, 400)
        assert len(violations) == 0


class TestDetectAllViolations:
    """Tests for the master detection function."""

    def test_empty_detections(self) -> None:
        """No detections → no violations."""
        violations = detect_all_violations([], [], 400, 400)
        assert violations == []

    def test_helmet_and_triple_violation(self) -> None:
        """Person on motorcycle without helmet and 3 riders → 2 violations."""
        persons = [
            {"bbox": [110, 60, 140, 300], "confidence": 0.9, "class_id": 0, "class_name": "person"},
            {"bbox": [125, 70, 150, 310], "confidence": 0.8, "class_id": 0, "class_name": "person"},
            {"bbox": [135, 80, 160, 320], "confidence": 0.7, "class_id": 0, "class_name": "person"},
        ]
        motorcycles = [{"bbox": [80, 100, 170, 350], "confidence": 0.85, "class_id": 3, "class_name": "motorcycle"}]
        no_helmet = {"bbox": [105, 50, 145, 110], "confidence": 0.8, "class_name": "Without Helmet"}

        all_dets = persons + motorcycles
        violations = detect_all_violations(all_dets, [no_helmet], 400, 400)

        types = {v["type"] for v in violations}
        assert "no_helmet" in types
        assert "triple_riding" in types
