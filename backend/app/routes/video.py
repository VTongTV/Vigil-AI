"""POST /api/v1/video/detect — Upload video and detect traffic violations frame-by-frame.

Processes uploaded video through the detection pipeline at a configurable frame rate.
Extracts frames using OpenCV, processes each through the full pipeline,
and returns per-frame violation results.
"""

import logging
import time
import tempfile
from pathlib import Path
from typing import Optional

import cv2
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from backend.app.config import settings
from backend.app.core.preprocessing import preprocess_image
from backend.app.core.violations import detect_all_violations
from backend.app.core.evidence import generate_evidence_image, save_evidence_image, get_evidence_url
from backend.app.schemas import (
    VideoDetectResponse,
    VideoFrameResult,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Maximum video duration in seconds (to prevent OOM on large files)
MAX_VIDEO_DURATION_S = 120
# Default FPS for frame extraction
DEFAULT_FPS = 1.0


@router.post("/video/detect", response_model=VideoDetectResponse)
async def detect_video_violations(
    request: Request,
    video: UploadFile = File(...),
    camera_id: Optional[str] = Form(None),
    fps: Optional[float] = Form(DEFAULT_FPS),
):
    """Upload a traffic camera video and detect violations frame-by-frame.

    Processes the video at the specified frame rate, running each extracted
    frame through the full detection pipeline (preprocess → COCO → helmet →
    violations). Frames with violations get annotated evidence images.

    Args:
        video: MP4/AVI/MOV video file (max 200MB).
        camera_id: Optional camera identifier for location context.
        fps: Frames per second to extract (default 1.0, max 5.0).

    Returns:
        VideoDetectResponse with per-frame violation details and summary.

    Raises:
        HTTPException: 400 for invalid format/duration, 503 if models not loaded.
    """
    start_time = time.time()

    # Validate file type
    if not video.content_type or video.content_type not in (
        "video/mp4", "video/avi", "video/x-msvideo", "video/quicktime",
        "video/x-matroska", "video/webm",
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid video format: {video.content_type}. Use MP4, AVI, MOV, MKV, or WebM.",
        )

    # Clamp FPS to sane range
    fps = max(0.5, min(5.0, fps or DEFAULT_FPS))

    # Read entire upload into memory (small videos only)
    contents = await video.read()
    if len(contents) > 200 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Video too large. Max 200MB.")

    # Write to temporary file for OpenCV consumption
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        duration_s = total_frames / video_fps if video_fps > 0 else 0

        if duration_s > MAX_VIDEO_DURATION_S:
            cap.release()
            raise HTTPException(
                status_code=400,
                detail=f"Video too long ({duration_s:.0f}s). Max {MAX_VIDEO_DURATION_S}s.",
            )

        # Calculate frame interval from desired FPS
        frame_interval = max(1, int(video_fps / fps)) if video_fps > 0 else 1

        # Verify models are loaded
        mm = request.app.state.model_manager
        if mm is None or not mm.is_ready():
            cap.release()
            raise HTTPException(status_code=503, detail="Models not loaded")

        frame_results: list[VideoFrameResult] = []
        frame_idx = 0
        processed_count = 0
        total_violations = 0
        violation_counts: dict[str, int] = {}

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Process only at the specified FPS interval
            if frame_idx % frame_interval == 0:
                img_h, img_w = frame.shape[:2]

                # Preprocess frame
                preprocessing_config = {}
                preprocessed = preprocess_image(frame, preprocessing_config)

                # COCO + Helmet detection (resident models)
                coco_dets = mm.detect_coco(preprocessed)
                helmet_dets = mm.detect_helmet(preprocessed)

                # Violation logic (no polygon zones for video — simplified)
                violations = detect_all_violations(
                    coco_detections=coco_dets,
                    helmet_detections=helmet_dets,
                    img_w=img_w,
                    img_h=img_h,
                    lane_polygons=[],
                    no_parking_zones=[],
                    stop_line_zones=[],
                    signal_state="unknown",
                    seatbelt_detections=[],
                )

                v_types = [v["type"] for v in violations]
                if v_types:
                    total_violations += len(violations)
                    for vt in v_types:
                        violation_counts[vt] = violation_counts.get(vt, 0) + 1

                    # Generate annotated evidence for frames with violations
                    evidence_url = None
                    try:
                        annotated, filename, _ = generate_evidence_image(
                            frame, violations, [], camera_id,
                        )
                        save_evidence_image(annotated, filename)
                        evidence_url = get_evidence_url(filename)
                    except Exception as e:
                        logger.warning("Failed to generate video evidence: %s", e)

                    frame_results.append(VideoFrameResult(
                        frame_index=frame_idx,
                        timestamp_ms=int((frame_idx / video_fps) * 1000) if video_fps > 0 else 0,
                        violations_count=len(violations),
                        violation_types=v_types,
                        evidence_url=evidence_url,
                    ))

                processed_count += 1

            frame_idx += 1

        cap.release()

    finally:
        # Clean up temp file
        Path(tmp_path).unlink(missing_ok=True)

    total_ms = int((time.time() - start_time) * 1000)

    return VideoDetectResponse(
        success=True,
        total_frames=total_frames,
        frames_processed=processed_count,
        total_violations=total_violations,
        processing_time_ms=total_ms,
        frame_results=frame_results,
        summary={
            "violation_counts": violation_counts,
            "frames_with_violations": len(frame_results),
            "total_frames_processed": processed_count,
        },
    )
