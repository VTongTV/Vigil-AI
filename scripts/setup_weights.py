#!/usr/bin/env python3
"""Download and verify model weights for VigilAI.

Downloads all required model weights to backend/weights/:
    - yolov8n.pt (COCO detection — Ultralytics auto-download)
    - helmet.pt (Helmet detection — manual download)
    - plate.pt (License plate detection — manual download)
    - seatbelt.pt (Seatbelt classification — Hugging Face Hub)

Usage:
    python scripts/setup_weights.py [--force]

Options:
    --force  Re-download even if file already exists.
"""

import argparse
import hashlib
import logging
import sys
from pathlib import Path

# Project root: scripts/setup_weights.py → 1 parent up
PROJECT_ROOT = Path(__file__).resolve().parent.parent
WEIGHTS_DIR = PROJECT_ROOT / "backend" / "weights"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def sha256_file(path: Path, block_size: int = 8192) -> str:
    """Compute SHA-256 hash of a file.

    Args:
        path: Path to the file.
        block_size: Read block size in bytes.

    Returns:
        Hex-encoded SHA-256 digest.
    """
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            block = f.read(block_size)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


def download_seatbelt_from_hub(force: bool = False) -> Path:
    """Download the RISEF/yolov11s-seatbelt classifier from Hugging Face Hub.

    Downloads the best.pt weight file and saves it as seatbelt.pt
    in the weights directory.

    Args:
        force: Re-download even if seatbelt.pt already exists.

    Returns:
        Path to the downloaded seatbelt.pt file.

    Raises:
        RuntimeError: If download fails.
    """
    dest = WEIGHTS_DIR / "seatbelt.pt"
    if dest.exists() and not force:
        logger.info("seatbelt.pt already exists at %s (use --force to re-download)", dest)
        return dest

    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        logger.error(
            "huggingface_hub not installed. Run: pip install huggingface_hub>=0.20.0"
        )
        raise

    logger.info("Downloading RISEF/yolov11s-seatbelt from Hugging Face Hub...")
    try:
        downloaded = hf_hub_download(
            repo_id="RISEF/yolov11s-seatbelt",
            filename="weights/best.pt",
            repo_type="model",
        )
    except Exception as e:
        logger.error("Failed to download seatbelt model: %s", e)
        raise RuntimeError(f"Seatbelt model download failed: {e}") from e

    # Copy to our weights directory
    import shutil
    src = Path(downloaded)
    shutil.copy2(src, dest)
    logger.info("Seatbelt model saved to %s", dest)

    # Verify
    file_hash = sha256_file(dest)
    file_size_mb = dest.stat().st_size / (1024 * 1024)
    logger.info("seatbelt.pt: %.1f MB, SHA-256: %s", file_size_mb, file_hash[:16])

    return dest


def download_coco_model(force: bool = False) -> Path:
    """Download the YOLOv8n COCO model via Ultralytics auto-download.

    Args:
        force: Re-download even if yolov8n.pt already exists.

    Returns:
        Path to yolov8n.pt in the weights directory.
    """
    dest = WEIGHTS_DIR / "yolov8n.pt"
    if dest.exists() and not force:
        logger.info("yolov8n.pt already exists at %s", dest)
        return dest

    logger.info("Downloading YOLOv8n COCO model...")
    try:
        from ultralytics import YOLO
        # Ultralytics auto-downloads to a cache; we just load to trigger download
        # then copy to our weights dir
        model = YOLO("yolov8n.pt")
        # Ultralytics saves to its cache; find and copy
        import shutil
        cache_path = Path(model.ckpt_path) if hasattr(model, "ckpt_path") else None
        if cache_path and cache_path.exists():
            shutil.copy2(cache_path, dest)
        else:
            # Fallback: just save via predict on dummy image
            import numpy as np
            dummy = np.zeros((64, 64, 3), dtype=np.uint8)
            model.predict(dummy, verbose=False)
            # Check if dest was created by the cache
            if not dest.exists():
                # Ultralytics uses a global cache; copy from there
                from ultralytics.utils import SETTINGS as ue_settings
                cache_dir = Path(ue_settings.get("weights_dir", ""))
                cached = cache_dir / "yolov8n.pt"
                if cached.exists():
                    shutil.copy2(cached, dest)
    except Exception as e:
        logger.warning("Could not auto-download yolov8n.pt: %s", e)
        logger.info("You may need to manually place yolov8n.pt in %s", WEIGHTS_DIR)
        return dest

    if dest.exists():
        logger.info("yolov8n.pt saved to %s", dest)
    return dest


def verify_weight(path: Path, description: str) -> bool:
    """Verify a weight file exists and is non-empty.

    Args:
        path: Path to the weight file.
        description: Human-readable description for logging.

    Returns:
        True if the file exists and is non-empty.
    """
    if not path.exists():
        logger.warning("%s: MISSING (%s)", description, path)
        return False
    size_mb = path.stat().st_size / (1024 * 1024)
    if size_mb < 0.001:
        logger.warning("%s: EMPTY FILE (%s)", description, path)
        return False
    logger.info("%s: OK (%.1f MB, %s)", description, size_mb, path.name)
    return True


def main() -> None:
    """Main entry point for weight setup."""
    parser = argparse.ArgumentParser(
        description="Download and verify VigilAI model weights"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if file already exists",
    )
    args = parser.parse_args()

    # Ensure weights directory exists
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    logger.info("=== VigilAI Model Weight Setup ===")
    logger.info("Weights directory: %s", WEIGHTS_DIR)

    # Download seatbelt model from Hugging Face Hub
    try:
        download_seatbelt_from_hub(force=args.force)
    except RuntimeError:
        logger.error("Seatbelt model download failed. Continuing without it.")

    # Attempt COCO auto-download
    download_coco_model(force=args.force)

    # Verify all expected weights
    logger.info("\n=== Verification ===")
    expected_weights = {
        "yolov8n.pt": "COCO detection model",
        "helmet.pt": "Helmet detection model",
        "plate.pt": "License plate detection model",
        "seatbelt.pt": "Seatbelt classifier model",
    }

    all_ok = True
    for filename, description in expected_weights.items():
        path = WEIGHTS_DIR / filename
        if not verify_weight(path, description):
            all_ok = False
            if filename in ("helmet.pt", "plate.pt"):
                logger.info(
                    "  → %s must be manually placed in %s", filename, WEIGHTS_DIR
                )

    if all_ok:
        logger.info("\nAll weights present and verified.")
    else:
        logger.warning(
            "\nSome weights are missing. See above for manual download instructions."
        )
        logger.info(
            "Seatbelt model: auto-downloaded from Hugging Face Hub (RISEF/yolov11s-seatbelt)"
        )
        logger.info("COCO model: auto-downloaded by Ultralytics")
        logger.info("Helmet/Plate models: must be manually placed in %s", WEIGHTS_DIR)

    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
