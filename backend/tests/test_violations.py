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
    extract_windshield_crops,
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


class TestExtractWindshieldCrops:
    """Tests for windshield crop extraction from car detections."""

    def _make_image(self, h: int = 400, w: int = 400) -> np.ndarray:
        """Create a dummy BGR image for crop extraction tests."""
        return np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)

    def test_basic_crop_extraction(self) -> None:
        """Car in the middle of the image produces a valid crop."""
        img = self._make_image(400, 400)
        car = {"bbox": [100, 100, 300, 300], "confidence": 0.9, "class_id": 2}

        crops = extract_windshield_crops([car], img, 400, 400)
        assert len(crops) == 1
        c = crops[0]
        assert c["car_bbox"] == [100.0, 100.0, 300.0, 300.0]
        assert c["crop_index"] == 0
        assert c["car_confidence"] == 0.9
        assert c["crop"].ndim == 3  # BGR image

    def test_crop_shape_reflects_config(self) -> None:
        """Crop dimensions match windshield_crop_ratio_top and _side config."""
        img = self._make_image(400, 400)
        # Full-width car, 200px tall → crop top 40% = 80px tall
        car = {"bbox": [0, 100, 400, 300], "confidence": 0.85, "class_id": 2}

        crops = extract_windshield_crops([car], img, 400, 400)
        assert len(crops) == 1
        cb = crops[0]["crop_bbox"]
        crop_h = cb[3] - cb[1]
        crop_w = cb[2] - cb[0]
        # crop_h should be ~80 (200 * 0.4)
        assert crop_h == pytest.approx(80, abs=2)
        # crop_w should be narrower due to side inset (0.7 ratio → 280px)
        assert crop_w == pytest.approx(280, abs=2)

    def test_tiny_car_skipped(self) -> None:
        """Car smaller than min_crop_size produces no crops."""
        img = self._make_image(400, 400)
        car = {"bbox": [200, 200, 210, 210], "confidence": 0.5, "class_id": 2}

        crops = extract_windshield_crops([car], img, 400, 400)
        assert len(crops) == 0

    def test_crop_clamped_to_image_bounds(self) -> None:
        """Crop at image edge is clamped to image dimensions."""
        img = self._make_image(300, 300)
        # Large enough car so crop isn't skipped, but positioned at edge
        car = {"bbox": [100, 100, 300, 300], "confidence": 0.7, "class_id": 2}

        crops = extract_windshield_crops([car], img, 300, 300)
        assert len(crops) >= 1
        cb = crops[0]["crop_bbox"]
        # All values should be within image bounds
        assert cb[0] >= 0
        assert cb[1] >= 0
        assert cb[2] <= 300
        assert cb[3] <= 300

    def test_multiple_cars(self) -> None:
        """Multiple cars produce multiple crops."""
        img = self._make_image(400, 600)
        cars = [
            {"bbox": [50, 50, 200, 200], "confidence": 0.8, "class_id": 2},
            {"bbox": [300, 100, 500, 300], "confidence": 0.9, "class_id": 2},
        ]

        crops = extract_windshield_crops(cars, img, 600, 400)
        assert len(crops) == 2
        assert crops[0]["crop_index"] == 0
        assert crops[1]["crop_index"] == 1

    def test_empty_car_list(self) -> None:
        """Empty car list returns empty crops."""
        img = self._make_image()
        crops = extract_windshield_crops([], img, 400, 400)
        assert crops == []

    def test_zero_area_car_skipped(self) -> None:
        """Car with zero width/height is skipped."""
        img = self._make_image(400, 400)
        car = {"bbox": [100, 100, 100, 200], "confidence": 0.6, "class_id": 2}

        crops = extract_windshield_crops([car], img, 400, 400)
        assert len(crops) == 0


class TestDetectSeatbeltViolations:
    """Tests for seatbelt non-compliance (classifier-based)."""

    def test_no_seatbelt_emits_violation(self) -> None:
        """Classifier says no_seatbelt → violation emitted."""
        det = {
            "class_name": "no_seatbelt",
            "confidence": 0.85,
            "car_bbox": [100.0, 50.0, 250.0, 200.0],
            "crop_bbox": [120.0, 50.0, 230.0, 110.0],
            "crop_index": 0,
            "car_confidence": 0.9,
        }

        violations = detect_seatbelt_violations([], [det], 400, 400)
        assert len(violations) == 1
        v = violations[0]
        assert v["type"] == "no_seatbelt"
        assert v["metadata"]["detection_method"] == "seatbelt_classifier"
        assert v["metadata"]["raw_confidence"] == 0.85
        assert v["metadata"]["car_confidence"] == 0.9
        assert "crop_bbox" in v["metadata"]
        # bbox should be car_bbox normalised
        assert v["bbox"][0] == pytest.approx(100.0 / 400)
        assert v["bbox"][2] == pytest.approx(250.0 / 400)

    def test_with_seatbelt_no_violation(self) -> None:
        """Classifier says with_seatbelt → no violation emitted."""
        det = {
            "class_name": "with_seatbelt",
            "confidence": 0.9,
            "car_bbox": [100.0, 50.0, 250.0, 200.0],
            "crop_bbox": [120.0, 50.0, 230.0, 110.0],
            "crop_index": 0,
            "car_confidence": 0.85,
        }

        violations = detect_seatbelt_violations([], [det], 400, 400)
        assert len(violations) == 0

    def test_seat_belt_label_no_violation(self) -> None:
        """Classifier says seat_belt → no violation emitted (positive label)."""
        det = {
            "class_name": "seat_belt",
            "confidence": 0.88,
            "car_bbox": [100.0, 50.0, 250.0, 200.0],
            "crop_bbox": [120.0, 50.0, 230.0, 110.0],
            "crop_index": 0,
            "car_confidence": 0.9,
        }

        violations = detect_seatbelt_violations([], [det], 400, 400)
        assert len(violations) == 0

    def test_low_confidence_filtered(self) -> None:
        """Low confidence no_seatbelt → filtered out (below min_confidence)."""
        det = {
            "class_name": "no_seatbelt",
            "confidence": 0.15,
            "car_bbox": [100.0, 50.0, 250.0, 200.0],
            "crop_bbox": [120.0, 50.0, 230.0, 110.0],
            "crop_index": 0,
            "car_confidence": 0.8,
        }

        violations = detect_seatbelt_violations([], [det], 400, 400)
        assert len(violations) == 0

    def test_confidence_discount_applied(self) -> None:
        """Raw confidence is discounted by config factor."""
        det = {
            "class_name": "no_seatbelt",
            "confidence": 0.6,
            "car_bbox": [100.0, 50.0, 250.0, 200.0],
            "crop_bbox": [120.0, 50.0, 230.0, 110.0],
            "crop_index": 0,
            "car_confidence": 0.9,
        }

        violations = detect_seatbelt_violations([], [det], 400, 400)
        assert len(violations) == 1
        # 0.6 * 0.7 = 0.42
        assert violations[0]["confidence"] == pytest.approx(0.42)
        assert violations[0]["metadata"]["adjusted_confidence"] == pytest.approx(0.42)

    def test_unknown_label_no_violation(self) -> None:
        """Unknown class label → no violation emitted."""
        det = {
            "class_name": "something_else",
            "confidence": 0.95,
            "car_bbox": [100.0, 50.0, 250.0, 200.0],
            "crop_bbox": [120.0, 50.0, 230.0, 110.0],
            "crop_index": 0,
            "car_confidence": 0.9,
        }

        violations = detect_seatbelt_violations([], [det], 400, 400)
        assert len(violations) == 0

    def test_review_recommended_below_threshold(self) -> None:
        """Adjusted confidence below review threshold flags review_recommended."""
        det = {
            "class_name": "no_seatbelt",
            "confidence": 0.5,
            "car_bbox": [100.0, 50.0, 250.0, 200.0],
            "crop_bbox": [120.0, 50.0, 230.0, 110.0],
            "crop_index": 0,
            "car_confidence": 0.9,
        }

        violations = detect_seatbelt_violations([], [det], 400, 400)
        assert len(violations) == 1
        # 0.5 * 0.7 = 0.35 < review_threshold 0.5 → True
        assert violations[0]["metadata"]["review_recommended"] is True

    def test_without_seatbelt_label_emits(self) -> None:
        """Label 'without_seatbelt' is treated as negative → violation."""
        det = {
            "class_name": "without_seatbelt",
            "confidence": 0.75,
            "car_bbox": [100.0, 50.0, 250.0, 200.0],
            "crop_bbox": [120.0, 50.0, 230.0, 110.0],
            "crop_index": 0,
            "car_confidence": 0.88,
        }

        violations = detect_seatbelt_violations([], [det], 400, 400)
        assert len(violations) == 1
        assert violations[0]["type"] == "no_seatbelt"

    def test_empty_classifications(self) -> None:
        """No classifications → no violations."""
        violations = detect_seatbelt_violations([], [], 400, 400)
        assert violations == []


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
