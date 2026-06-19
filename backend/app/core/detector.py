"""YOLOv8 detection model wrapper with VRAM lifecycle management.

Manages three YOLOv8n models:
    - COCO model: always resident on GPU
    - Helmet model: always resident on GPU
    - Plate model: on-demand load → infer → unload
    - Seatbelt classifier: on-demand load → classify → unload

VRAM budget: COCO + Helmet resident (~1.5 GB with context),
plate on-demand (~300 MB peak), seatbelt on-demand (~200 MB peak),
leaving ~1.7 GB headroom.
"""

import gc
import logging
import time
from pathlib import Path
from typing import Optional

import numpy as np
import torch
from ultralytics import YOLO

from backend.app.config import get_model_config, settings

logger = logging.getLogger(__name__)


class DetectionModel:
    """Manages a single YOLOv8 model's lifecycle and inference.

    Attributes:
        model: Loaded YOLO model instance.
        model_path: Path to model weights.
        device: Target device ('cuda' or 'cpu').
        is_loaded: Whether model is currently in GPU memory.
    """

    def __init__(self, model_path: str | Path, device: str = "cuda") -> None:
        self.model_path = Path(model_path)
        self.device = device
        self.model: Optional[YOLO] = None
        self.is_loaded = False

    def load(self) -> None:
        """Load model onto device. Pre-warms with dummy inference.

        Raises:
            FileNotFoundError: If model weights file does not exist.
        """
        if self.is_loaded:
            logger.warning("Model %s already loaded", self.model_path.name)
            return

        if not self.model_path.exists():
            raise FileNotFoundError(f"Model weights not found: {self.model_path}")

        if self.device == "cuda" and not torch.cuda.is_available():
            logger.warning(
                "CUDA not available, falling back to CPU for %s",
                self.model_path.name,
            )
            self.device = "cpu"

        if self.device == "cuda":
            free_vram = torch.cuda.mem_get_info()[0] / (1024**3)
            logger.info("Pre-load VRAM: %.2f GB free for %s", free_vram, self.model_path.name)

        self.model = YOLO(str(self.model_path))

        # Pre-warm: one dummy inference to allocate CUDA context and buffers
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        self.model.predict(dummy, verbose=False, device=self.device)

        self.is_loaded = True
        if self.device == "cuda":
            used_vram = torch.cuda.memory_allocated() / (1024**3)
            logger.info(
                "Model %s loaded. VRAM: %.2f GB",
                self.model_path.name,
                used_vram,
            )

    def predict(
        self,
        image: np.ndarray,
        conf_threshold: float = 0.25,
        iou_threshold: float = 0.45,
        classes: Optional[list[int]] = None,
    ) -> list[dict]:
        """Run inference on an image.

        Args:
            image: Input image in BGR format (HWC, uint8).
            conf_threshold: Minimum confidence for detections.
            iou_threshold: NMS IoU threshold.
            classes: Optional filter for specific class IDs.

        Returns:
            List of detection dicts with keys:
                bbox (xyxy pixel coords), confidence, class_id, class_name
        """
        if not self.is_loaded:
            raise RuntimeError(f"Model {self.model_path.name} not loaded")

        predict_kwargs = {
            "verbose": False,
            "conf": conf_threshold,
            "iou": iou_threshold,
            "device": self.device,
        }
        if classes is not None:
            predict_kwargs["classes"] = classes

        results = self.model.predict(image, **predict_kwargs)

        detections = []
        if results and len(results) > 0:
            result = results[0]
            if result.boxes is not None and len(result.boxes) > 0:
                boxes = result.boxes
                for i in range(len(boxes)):
                    bbox_xyxy = boxes.xyxy[i].cpu().numpy().tolist()
                    confidence = float(boxes.conf[i].cpu().numpy())
                    class_id = int(boxes.cls[i].cpu().numpy())
                    class_name = result.names.get(class_id, f"class_{class_id}")

                    detections.append({
                        "bbox": bbox_xyxy,  # [x1, y1, x2, y2] pixel coords
                        "confidence": confidence,
                        "class_id": class_id,
                        "class_name": class_name,
                    })

        return detections

    def unload(self) -> None:
        """Unload model from GPU memory.

        Deletes the model object, runs garbage collection,
        and clears CUDA cache to reclaim VRAM.
        """
        if not self.is_loaded:
            return

        del self.model
        self.model = None
        self.is_loaded = False
        gc.collect()

        if self.device == "cuda":
            torch.cuda.empty_cache()
            logger.info("Model %s unloaded. VRAM reclaimed.", self.model_path.name)


class ModelManager:
    """Manages all three YOLOv8 models with VRAM-aware lifecycle.

    COCO + Helmet are always resident. Plate is loaded on-demand
    and immediately unloaded after inference to conserve VRAM.
    """

    def __init__(self) -> None:
        self.coco_model: Optional[DetectionModel] = None
        self.helmet_model: Optional[DetectionModel] = None
        self.plate_model: Optional[DetectionModel] = None

    def load_resident_models(self) -> None:
        """Load COCO and Helmet models into GPU memory at startup.

        These stay resident for the lifetime of the application.
        """
        coco_cfg = get_model_config("coco")
        helmet_cfg = get_model_config("helmet")

        coco_path = settings.weights_dir / Path(coco_cfg["path"]).name
        helmet_path = settings.weights_dir / Path(helmet_cfg["path"]).name

        self.coco_model = DetectionModel(
            coco_path, device=coco_cfg.get("device", "cuda")
        )
        self.helmet_model = DetectionModel(
            helmet_path, device=helmet_cfg.get("device", "cuda")
        )

        logger.info("Loading resident models (COCO + Helmet)...")
        start = time.time()
        self.coco_model.load()
        self.helmet_model.load()
        elapsed = (time.time() - start) * 1000
        logger.info("Resident models loaded in %d ms", elapsed)

    def detect_coco(
        self,
        image: np.ndarray,
        classes: Optional[list[int]] = None,
    ) -> list[dict]:
        """Run COCO detection on the image.

        Args:
            image: BGR image (HWC, uint8).
            classes: Optional class ID filter.

        Returns:
            List of detection dicts.
        """
        if self.coco_model is None:
            raise RuntimeError("COCO model not loaded")

        cfg = get_model_config("coco")
        return self.coco_model.predict(
            image,
            conf_threshold=cfg.get("conf_threshold", 0.25),
            iou_threshold=cfg.get("iou_threshold", 0.45),
            classes=classes,
        )

    def detect_helmet(self, image: np.ndarray) -> list[dict]:
        """Run helmet detection on the image.

        Args:
            image: BGR image (HWC, uint8).

        Returns:
            List of detection dicts with class names 'With Helmet' or 'Without Helmet'.
        """
        if self.helmet_model is None:
            raise RuntimeError("Helmet model not loaded")

        cfg = get_model_config("helmet")
        return self.helmet_model.predict(
            image,
            conf_threshold=cfg.get("conf_threshold", 0.30),
            iou_threshold=cfg.get("iou_threshold", 0.45),
        )

    def detect_plate_on_demand(self, image: np.ndarray) -> list[dict]:
        """Run plate detection on-demand. Loads, infers, then unloads.

        This is VRAM-efficient: the plate model is only in memory
        during inference, then immediately released.

        Args:
            image: BGR image (HWC, uint8).

        Returns:
            List of plate detection dicts.
        """
        cfg = get_model_config("plate")
        plate_path = settings.weights_dir / Path(cfg["path"]).name

        plate_model = DetectionModel(
            plate_path, device=cfg.get("device", "cuda")
        )
        plate_model.load()

        try:
            detections = plate_model.predict(
                image,
                conf_threshold=cfg.get("conf_threshold", 0.25),
                iou_threshold=cfg.get("iou_threshold", 0.45),
            )
        finally:
            plate_model.unload()

        return detections

    def classify_seatbelt_on_demand(
        self,
        crops: list[np.ndarray],
    ) -> list[dict]:
        """Run seatbelt classification on windshield crops. On-demand load/unload.

        Loads the seatbelt classifier, runs classification on each crop,
        then unloads to free VRAM. Uses Ultralytics classification output
        probabilities (probs.top1, probs.top1conf).

        Args:
            crops: List of cropped windshield images (BGR, uint8).

        Returns:
            List of classification dicts with keys:
                class_name: Predicted class label.
                confidence: Top-1 classification probability.
        """
        if not crops:
            return []

        cfg = get_model_config("seatbelt")
        seatbelt_path = settings.weights_dir / Path(cfg["path"]).name

        seatbelt_model = DetectionModel(
            seatbelt_path, device=cfg.get("device", "cuda")
        )
        seatbelt_model.load()

        try:
            results: list[dict] = []
            for crop_img in crops:
                predict_results = seatbelt_model.model.predict(
                    crop_img, verbose=False, device=seatbelt_model.device,
                )
                if predict_results and len(predict_results) > 0:
                    pred = predict_results[0]
                    probs = pred.probs
                    if probs is not None:
                        class_id = int(probs.top1)
                        class_name = pred.names.get(class_id, f"class_{class_id}")
                        confidence = float(probs.top1conf)
                        results.append({
                            "class_name": class_name,
                            "confidence": confidence,
                        })
                    else:
                        results.append({
                            "class_name": "unknown",
                            "confidence": 0.0,
                        })
                else:
                    results.append({
                        "class_name": "unknown",
                        "confidence": 0.0,
                    })
        finally:
            seatbelt_model.unload()

        return results

    def is_ready(self) -> bool:
        """Check if resident models are loaded and ready."""
        return (
            self.coco_model is not None
            and self.coco_model.is_loaded
            and self.helmet_model is not None
            and self.helmet_model.is_loaded
        )
