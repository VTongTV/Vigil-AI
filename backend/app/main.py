"""VigilAI FastAPI application with lifespan management.

Loads models at startup, initializes database, and registers routes.
"""

import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
from backend.app.core.detector import ModelManager
from backend.app.db.database import init_db

logger = logging.getLogger(__name__)

# Global model manager — initialized during lifespan
model_manager: ModelManager | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events.

    Startup:
        - Set environment variables for OCR threading
        - Initialize database tables
        - Load resident models (COCO + Helmet) into GPU
        - Create evidence directory

    Shutdown:
        - Log shutdown
    """
    # Set OCR thread limits before any ONNX initialization
    os.environ["OMP_NUM_THREADS"] = "4"
    os.environ["ONNX_NUM_THREADS"] = "4"

    logger.info("VigilAI starting up...")

    # Initialize database
    init_db()
    logger.info("Database initialized")

    # Create evidence directory
    if not settings.evidence_dir.exists():
        settings.evidence_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Created evidence directory: %s", settings.evidence_dir)

    # Load models
    global model_manager
    model_manager = ModelManager()

    try:
        model_manager.load_resident_models()
        app.state.model_manager = model_manager
        logger.info("Resident models loaded successfully")
    except Exception as e:
        logger.error("Failed to load models: %s", e)
        app.state.model_manager = None
        if not settings.demo_mode:
            raise

    # Mount evidence static files
    app.mount("/static/evidence", StaticFiles(directory=str(settings.evidence_dir)), name="evidence")

    logger.info("VigilAI ready — demo_mode=%s", settings.demo_mode)

    yield

    logger.info("VigilAI shutting down...")


app = FastAPI(
    title="VigilAI",
    description="AI-Powered Traffic Violation Detection for Bengaluru Traffic Police",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
from backend.app.routes.detect import router as detect_router  # noqa: E402
from backend.app.routes.violations import router as violations_router  # noqa: E402
from backend.app.routes.evidence import router as evidence_router  # noqa: E402
from backend.app.routes.analytics import router as analytics_router  # noqa: E402
from backend.app.routes.cameras import router as cameras_router  # noqa: E402
from backend.app.routes.challan_pdf import router as challan_pdf_router  # noqa: E402
from backend.app.routes.video import router as video_router  # noqa: E402

app.include_router(detect_router, prefix="/api/v1", tags=["detect"])
app.include_router(violations_router, prefix="/api/v1", tags=["violations"])
app.include_router(evidence_router, prefix="/api/v1", tags=["evidence"])
app.include_router(analytics_router, prefix="/api/v1", tags=["analytics"])
app.include_router(cameras_router, prefix="/api/v1", tags=["cameras"])
app.include_router(challan_pdf_router, prefix="/api/v1", tags=["evidence"])
app.include_router(video_router, prefix="/api/v1", tags=["video"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    from backend.app.schemas import HealthResponse

    return HealthResponse(
        models_loaded=model_manager is not None and model_manager.is_ready(),
        demo_mode=settings.demo_mode,
    )
