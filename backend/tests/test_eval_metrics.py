"""Unit tests for eval_metrics.py evaluation script.

Tests report formatting, system metrics collection (mocked GPU calls),
and latency measurement logic. Marked as @pytest.mark.slow since they
may trigger GPU operations in integration.

Run with:    python -m pytest backend/tests/test_eval_metrics.py -v -m slow --tb=short
Skip slow:   python -m pytest backend/tests/test_eval_metrics.py -v -m "not slow"
"""

import json
import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

# Ensure project root is on sys.path
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from scripts.eval_metrics import (
    SYNTHETIC_IMAGE_HEIGHT,
    SYNTHETIC_IMAGE_WIDTH,
    build_eval_results_json,
    compute_violation_metrics,
    format_report,
    generate_synthetic_plate_image,
    generate_synthetic_test_images,
    get_vram_info,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def sample_benchmark() -> dict:
    """Return a sample benchmark results dict for report formatting tests."""
    return {
        "num_images": 3,
        "wall_time_s": 1.234,
        "avg_total_ms": 411.3,
        "min_total_ms": 380,
        "max_total_ms": 450,
        "avg_timing_breakdown": {
            "preprocess_ms": 15,
            "detect_coco_ms": 120,
            "detect_helmet_ms": 110,
            "violation_logic_ms": 5,
            "detect_plate_ms": 80,
            "ocr_ms": 60,
            "evidence_gen_ms": 21,
        },
        "inference_fps": 2.43,
        "per_image_results": [],
        "vram_before": {
            "allocated_gb": 1.2,
            "reserved_gb": 1.5,
            "free_gb": 2.3,
            "total_gb": 4.0,
        },
        "vram_after": {
            "allocated_gb": 1.3,
            "reserved_gb": 1.5,
            "free_gb": 2.2,
            "total_gb": 4.0,
        },
    }


@pytest.fixture()
def sample_coco_val() -> dict:
    """Return sample COCO validation results."""
    return {
        "mAP50": 0.7412,
        "mAP50_95": 0.5231,
        "precision": 0.7834,
        "recall": 0.7102,
        "note": "Computed on COCO val split via model.val()",
    }


@pytest.fixture()
def sample_ocr_metrics() -> dict:
    """Return sample OCR accuracy results."""
    return {
        "ground_truth": "KA01AB1234",
        "ocr_raw": "KA0IAB1234",
        "ocr_processed": "KA01AB1234",
        "ocr_confidence": 0.9234,
        "char_accuracy": 0.9000,
        "exact_match": True,
        "ocr_latency_ms": 45,
        "note": "Tested on synthetic plate image. Ground truth: KA01AB1234",
    }


@pytest.fixture()
def sample_vram_info() -> dict:
    """Return sample VRAM utilization info."""
    return {
        "allocated_gb": 1.25,
        "reserved_gb": 1.5,
        "free_gb": 2.25,
        "total_gb": 4.0,
    }


# ---------------------------------------------------------------------------
# Report formatting tests
# ---------------------------------------------------------------------------


class TestFormatReport:
    """Tests for the format_report function."""

    def test_format_report_returns_string(
        self,
        sample_benchmark: dict,
        sample_coco_val: dict,
        sample_ocr_metrics: dict,
        sample_vram_info: dict,
    ) -> None:
        """format_report should return a non-empty string."""
        vm = compute_violation_metrics()
        report = format_report(
            sample_benchmark, sample_coco_val, sample_ocr_metrics, vm, sample_vram_info
        )
        assert isinstance(report, str)
        assert len(report) > 100

    def test_format_report_contains_sections(
        self,
        sample_benchmark: dict,
        sample_ocr_metrics: dict,
        sample_vram_info: dict,
    ) -> None:
        """Report should contain all required metric sections."""
        vm = compute_violation_metrics()
        report = format_report(
            sample_benchmark, None, sample_ocr_metrics, vm, sample_vram_info
        )
        assert "INFERENCE FPS" in report
        assert "END-TO-END LATENCY" in report
        assert "mAP@50" in report
        assert "PER-VIOLATION" in report
        assert "OCR CHARACTER ACCURACY" in report
        assert "VRAM UTILIZATION" in report
        assert "METHODOLOGY NOTES" in report

    def test_format_report_includes_fps_value(
        self,
        sample_benchmark: dict,
        sample_ocr_metrics: dict,
        sample_vram_info: dict,
    ) -> None:
        """Report should display the FPS value from benchmark data."""
        vm = compute_violation_metrics()
        report = format_report(
            sample_benchmark, None, sample_ocr_metrics, vm, sample_vram_info
        )
        assert "2.43" in report

    def test_format_report_with_coco_validation(
        self,
        sample_benchmark: dict,
        sample_coco_val: dict,
        sample_ocr_metrics: dict,
        sample_vram_info: dict,
    ) -> None:
        """When COCO validation data exists, report shows mAP values."""
        vm = compute_violation_metrics()
        report = format_report(
            sample_benchmark, sample_coco_val, sample_ocr_metrics, vm, sample_vram_info
        )
        assert "0.7412" in report

    def test_format_report_without_coco_validation(
        self,
        sample_benchmark: dict,
        sample_ocr_metrics: dict,
        sample_vram_info: dict,
    ) -> None:
        """When COCO validation is None, report shows unavailable status."""
        vm = compute_violation_metrics()
        report = format_report(
            sample_benchmark, None, sample_ocr_metrics, vm, sample_vram_info
        )
        assert "Unavailable" in report or "Skipped" in report

    def test_format_report_contains_violation_types(
        self,
        sample_benchmark: dict,
        sample_ocr_metrics: dict,
        sample_vram_info: dict,
    ) -> None:
        """Report should list all 8 violation types."""
        vm = compute_violation_metrics()
        report = format_report(
            sample_benchmark, None, sample_ocr_metrics, vm, sample_vram_info
        )
        for v_type in [
            "no_helmet", "triple_riding", "wrong_side_driving",
            "illegal_parking", "no_seatbelt", "stop_line_violation",
            "red_light_violation", "license_plate_mismatch",
        ]:
            assert v_type in report

    def test_format_report_timing_breakdown_sums(
        self,
        sample_benchmark: dict,
        sample_ocr_metrics: dict,
        sample_vram_info: dict,
    ) -> None:
        """Total in timing breakdown should equal sum of individual stages."""
        vm = compute_violation_metrics()
        report = format_report(
            sample_benchmark, None, sample_ocr_metrics, vm, sample_vram_info
        )
        # Sum of avg timing breakdown values
        avg_tb = sample_benchmark["avg_timing_breakdown"]
        expected_total = sum(avg_tb.values())
        assert str(expected_total) in report


# ---------------------------------------------------------------------------
# System metrics collection tests (mocked GPU)
# ---------------------------------------------------------------------------


class TestVramInfo:
    """Tests for get_vram_info with mocked CUDA."""

    def test_vram_info_when_cuda_unavailable(self) -> None:
        """Returns zeros when CUDA is not available."""
        with patch("scripts.eval_metrics.torch") as mock_torch:
            mock_torch.cuda.is_available.return_value = False
            result = get_vram_info()
            assert result["allocated_gb"] == 0.0
            assert result["reserved_gb"] == 0.0
            assert result["free_gb"] == 0.0
            assert result["total_gb"] == 0.0

    def test_vram_info_when_cuda_available(self) -> None:
        """Returns GPU memory info when CUDA is available."""
        with patch("scripts.eval_metrics.torch") as mock_torch:
            mock_torch.cuda.is_available.return_value = True
            mock_torch.cuda.memory_allocated.return_value = int(1.5 * 1024 ** 3)
            mock_torch.cuda.memory_reserved.return_value = int(2.0 * 1024 ** 3)
            mock_torch.cuda.mem_get_info.return_value = (
                int(2.5 * 1024 ** 3),  # free
                int(4.0 * 1024 ** 3),  # total
            )
            result = get_vram_info()
            assert abs(result["allocated_gb"] - 1.5) < 0.01
            assert abs(result["reserved_gb"] - 2.0) < 0.01
            assert abs(result["free_gb"] - 2.5) < 0.01
            assert abs(result["total_gb"] - 4.0) < 0.01


# ---------------------------------------------------------------------------
# Synthetic image generation tests
# ---------------------------------------------------------------------------


class TestSyntheticImages:
    """Tests for synthetic image generation functions."""

    def test_generate_synthetic_test_images_count(self) -> None:
        """Should generate the requested number of images."""
        images = generate_synthetic_test_images(count=3)
        assert len(images) == 3

    def test_generate_synthetic_test_images_shape(self) -> None:
        """Each image should be (480, 640, 3) uint8."""
        images = generate_synthetic_test_images(count=2)
        for img in images:
            assert img.shape == (SYNTHETIC_IMAGE_HEIGHT, SYNTHETIC_IMAGE_WIDTH, 3)
            assert img.dtype == np.uint8

    def test_generate_synthetic_test_images_deterministic(self) -> None:
        """Same seed should produce same images."""
        images_a = generate_synthetic_test_images(count=2)
        # Generate again — the function uses np.random.RandomState(42)
        images_b = generate_synthetic_test_images(count=2)
        for a, b in zip(images_a, images_b):
            np.testing.assert_array_equal(a, b)

    def test_generate_synthetic_plate_image_shape(self) -> None:
        """Plate image should have correct dimensions."""
        img = generate_synthetic_plate_image()
        assert img.shape == (480, 640, 3)
        assert img.dtype == np.uint8

    def test_generate_synthetic_plate_image_custom_text(self) -> None:
        """Plate image should be generated with custom text (no crash)."""
        img = generate_synthetic_plate_image(plate_text="KA05MZ9876", width=800, height=600)
        assert img.shape == (600, 800, 3)


# ---------------------------------------------------------------------------
# Violation metrics placeholder tests
# ---------------------------------------------------------------------------


class TestViolationMetrics:
    """Tests for the compute_violation_metrics function."""

    def test_returns_all_violation_types(self) -> None:
        """Should include metrics for all 8 violation types."""
        result = compute_violation_metrics()
        per_v = result["per_violation_metrics"]
        assert len(per_v) == 8
        for v_type in [
            "no_helmet", "triple_riding", "wrong_side_driving",
            "illegal_parking", "no_seatbelt", "stop_line_violation",
            "red_light_violation", "license_plate_mismatch",
        ]:
            assert v_type in per_v

    def test_metrics_are_none_without_test_set(self) -> None:
        """All metric values should be None when no test set is available."""
        result = compute_violation_metrics()
        for v_type, vals in result["per_violation_metrics"].items():
            assert vals["precision"] is None, f"{v_type} precision should be None"
            assert vals["recall"] is None, f"{v_type} recall should be None"
            assert vals["f1_score"] is None, f"{v_type} f1 should be None"
            assert vals["tp"] is None, f"{v_type} tp should be None"
            assert vals["fp"] is None, f"{v_type} fp should be None"
            assert vals["fn"] is None, f"{v_type} fn should be None"

    def test_each_type_has_note(self) -> None:
        """Each violation type should have a note about requiring test set."""
        result = compute_violation_metrics()
        for v_type, vals in result["per_violation_metrics"].items():
            assert "note" in vals
            assert len(vals["note"]) > 0

    def test_accuracy_is_none_without_test_set(self) -> None:
        """Overall accuracy should be None without test set."""
        result = compute_violation_metrics()
        assert result["accuracy"] is None
        assert "accuracy_note" in result


# ---------------------------------------------------------------------------
# JSON output tests
# ---------------------------------------------------------------------------


class TestBuildEvalResultsJson:
    """Tests for the build_eval_results_json function."""

    def test_returns_serializable_dict(
        self,
        sample_benchmark: dict,
        sample_ocr_metrics: dict,
        sample_vram_info: dict,
    ) -> None:
        """Result dict should be JSON-serializable."""
        vm = compute_violation_metrics()
        result = build_eval_results_json(
            sample_benchmark, None, sample_ocr_metrics, vm, sample_vram_info
        )
        # Should not raise
        json_str = json.dumps(result, default=str)
        assert len(json_str) > 0

    def test_contains_required_keys(
        self,
        sample_benchmark: dict,
        sample_ocr_metrics: dict,
        sample_vram_info: dict,
    ) -> None:
        """Result dict should have all required top-level keys."""
        vm = compute_violation_metrics()
        result = build_eval_results_json(
            sample_benchmark, None, sample_ocr_metrics, vm, sample_vram_info
        )
        required_keys = [
            "metadata", "inference_fps", "avg_latency_ms",
            "min_latency_ms", "max_latency_ms", "wall_time_s",
            "num_test_images", "timing_breakdown_avg",
            "coco_validation", "ocr_accuracy", "violation_metrics",
            "vram_utilization",
        ]
        for key in required_keys:
            assert key in result, f"Missing key: {key}"

    def test_metadata_has_timestamp(
        self,
        sample_benchmark: dict,
        sample_ocr_metrics: dict,
        sample_vram_info: dict,
    ) -> None:
        """Metadata should include a generated_at timestamp."""
        vm = compute_violation_metrics()
        result = build_eval_results_json(
            sample_benchmark, None, sample_ocr_metrics, vm, sample_vram_info
        )
        assert "generated_at" in result["metadata"]
        assert "T" in result["metadata"]["generated_at"]  # ISO format


# ---------------------------------------------------------------------------
# Latency measurement logic tests
# ---------------------------------------------------------------------------


class TestLatencyMeasurement:
    """Tests for latency measurement logic."""

    def test_benchmark_single_image_timing_positive(self) -> None:
        """benchmark_pipeline_single_image should return positive timing values."""
        mock_manager = MagicMock()
        mock_manager.detect_coco.return_value = []
        mock_manager.detect_helmet.return_value = []
        mock_manager.detect_plate_on_demand.return_value = []

        from scripts.eval_metrics import benchmark_pipeline_single_image

        img = np.full((480, 640, 3), 128, dtype=np.uint8)
        with (
            patch("scripts.eval_metrics.preprocess_image", return_value=img),
            patch("scripts.eval_metrics.detect_all_violations", return_value=[]),
            patch("scripts.eval_metrics.get_vram_info", return_value={
                "allocated_gb": 1.0, "reserved_gb": 1.5, "free_gb": 2.5, "total_gb": 4.0,
            }),
        ):
            result = benchmark_pipeline_single_image(img, mock_manager)

        assert result["total_ms"] >= 0
        for key in [
            "preprocess_ms", "detect_coco_ms", "detect_helmet_ms",
            "violation_logic_ms", "detect_plate_ms", "ocr_ms", "evidence_gen_ms",
        ]:
            assert key in result["timing_breakdown"]
            assert result["timing_breakdown"][key] >= 0

    def test_benchmark_single_image_returns_violations_list(self) -> None:
        """Result should contain a violations list."""
        mock_manager = MagicMock()
        mock_manager.detect_coco.return_value = []
        mock_manager.detect_helmet.return_value = []

        from scripts.eval_metrics import benchmark_pipeline_single_image

        img = np.full((480, 640, 3), 128, dtype=np.uint8)
        with (
            patch("scripts.eval_metrics.preprocess_image", return_value=img),
            patch("scripts.eval_metrics.detect_all_violations", return_value=[
                {"type": "no_helmet", "bbox": [0.1, 0.1, 0.5, 0.5], "confidence": 0.8},
            ]),
            patch("scripts.eval_metrics.get_vram_info", return_value={
                "allocated_gb": 1.0, "reserved_gb": 1.5, "free_gb": 2.5, "total_gb": 4.0,
            }),
        ):
            result = benchmark_pipeline_single_image(img, mock_manager)

        assert isinstance(result["violations"], list)
        assert len(result["violations"]) == 1

    def test_benchmark_timing_breakdown_keys_complete(self) -> None:
        """Timing breakdown should have all 7 stage keys."""
        mock_manager = MagicMock()
        mock_manager.detect_coco.return_value = []
        mock_manager.detect_helmet.return_value = []

        from scripts.eval_metrics import benchmark_pipeline_single_image

        img = np.full((480, 640, 3), 128, dtype=np.uint8)
        with (
            patch("scripts.eval_metrics.preprocess_image", return_value=img),
            patch("scripts.eval_metrics.detect_all_violations", return_value=[]),
            patch("scripts.eval_metrics.get_vram_info", return_value={
                "allocated_gb": 0.0, "reserved_gb": 0.0, "free_gb": 4.0, "total_gb": 4.0,
            }),
        ):
            result = benchmark_pipeline_single_image(img, mock_manager)

        expected_keys = {
            "preprocess_ms", "detect_coco_ms", "detect_helmet_ms",
            "violation_logic_ms", "detect_plate_ms", "ocr_ms", "evidence_gen_ms",
        }
        assert expected_keys == set(result["timing_breakdown"].keys())


# ---------------------------------------------------------------------------
# Slow integration tests (require GPU models)
# ---------------------------------------------------------------------------


@pytest.mark.slow
class TestSlowIntegration:
    """Slow integration tests that require GPU model loading.

    Run with: pytest -v -m slow
    """

    def test_run_pipeline_benchmark(self) -> None:
        """Full pipeline benchmark on 2 images should complete without error."""
        from scripts.eval_metrics import run_pipeline_benchmark
        from backend.app.core.detector import ModelManager

        mm = ModelManager()
        mm.load_resident_models()

        try:
            result = run_pipeline_benchmark(mm, num_images=2)
            assert result["num_images"] == 2
            assert result["wall_time_s"] > 0
            assert result["inference_fps"] > 0
            assert len(result["per_image_results"]) == 2
        finally:
            if mm.coco_model:
                mm.coco_model.unload()
            if mm.helmet_model:
                mm.helmet_model.unload()

    def test_run_coco_validation(self) -> None:
        """COCO validation should return a result dict (may be None values)."""
        from scripts.eval_metrics import run_coco_validation
        from backend.app.core.detector import ModelManager

        mm = ModelManager()
        mm.load_resident_models()

        try:
            result = run_coco_validation(mm)
            # Result can be None (no COCO val data) or a dict with metrics
            if result is not None:
                assert "mAP50" in result
                assert "note" in result
        finally:
            if mm.coco_model:
                mm.coco_model.unload()
            if mm.helmet_model:
                mm.helmet_model.unload()

    def test_get_vram_info_live(self) -> None:
        """get_vram_info should return valid structure on live GPU."""
        result = get_vram_info()
        assert "allocated_gb" in result
        assert "reserved_gb" in result
        assert "free_gb" in result
        assert "total_gb" in result
        for key in result:
            assert isinstance(result[key], float)
            assert result[key] >= 0.0


# ---------------------------------------------------------------------------
# Real violation metrics computation tests
# ---------------------------------------------------------------------------


class TestViolationMetricsRealComputation:
    """Tests for compute_violation_metrics with real predictions and ground truths."""

    def test_perfect_match(self) -> None:
        """Perfect predictions should yield precision=recall=f1=1."""
        predictions = [
            {"type": "no_helmet", "bbox": [0.1, 0.2, 0.3, 0.4]},
        ]
        ground_truths = [
            {"type": "no_helmet", "bbox": [0.1, 0.2, 0.3, 0.4]},
        ]
        result = compute_violation_metrics(predictions, ground_truths)
        per = result["per_violation_metrics"]["no_helmet"]
        assert per["precision"] == 1.0
        assert per["recall"] == 1.0
        assert per["f1_score"] == 1.0
        assert per["tp"] == 1
        assert per["fp"] == 0
        assert per["fn"] == 0

    def test_false_positive(self) -> None:
        """Prediction with no matching ground truth is a false positive."""
        predictions = [
            {"type": "no_helmet", "bbox": [0.1, 0.2, 0.3, 0.4]},
        ]
        ground_truths: list[dict] = []
        result = compute_violation_metrics(predictions, ground_truths)
        per = result["per_violation_metrics"]["no_helmet"]
        assert per["tp"] == 0
        assert per["fp"] == 1
        assert per["fn"] == 0
        assert per["precision"] == 0.0

    def test_false_negative(self) -> None:
        """Ground truth with no matching prediction is a false negative."""
        predictions: list[dict] = []
        ground_truths = [
            {"type": "no_helmet", "bbox": [0.1, 0.2, 0.3, 0.4]},
        ]
        result = compute_violation_metrics(predictions, ground_truths)
        per = result["per_violation_metrics"]["no_helmet"]
        assert per["tp"] == 0
        assert per["fp"] == 0
        assert per["fn"] == 1
        assert per["recall"] == 0.0

    def test_iou_threshold_filtering(self) -> None:
        """Low-IoU predictions should not match ground truths."""
        predictions = [
            {"type": "no_helmet", "bbox": [0.7, 0.7, 0.9, 0.9]},
        ]
        ground_truths = [
            {"type": "no_helmet", "bbox": [0.1, 0.1, 0.3, 0.3]},
        ]
        result = compute_violation_metrics(predictions, ground_truths, iou_threshold=0.5)
        per = result["per_violation_metrics"]["no_helmet"]
        assert per["tp"] == 0
        assert per["fp"] == 1
        assert per["fn"] == 1

    def test_accuracy_computation(self) -> None:
        """Accuracy should be TP / (TP + FP + FN)."""
        predictions = [
            {"type": "no_helmet", "bbox": [0.1, 0.2, 0.3, 0.4]},  # TP
            {"type": "triple_riding", "bbox": [0.5, 0.5, 0.7, 0.7]},  # FP
        ]
        ground_truths = [
            {"type": "no_helmet", "bbox": [0.1, 0.2, 0.3, 0.4]},  # matched
            {"type": "illegal_parking", "bbox": [0.1, 0.6, 0.3, 0.8]},  # FN
        ]
        result = compute_violation_metrics(predictions, ground_truths)
        # TP=1, FP=1, FN=1 → accuracy = 1/3
        assert result["accuracy"] == round(1 / 3, 4)
