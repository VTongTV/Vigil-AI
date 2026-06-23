"""VigilAI FastAPI application with lifespan management.

Loads models at startup, initializes database, and registers routes.
On cloud deployments (Railway), models load in the background so the
/health endpoint responds immediately — required for Serverless cold-boot.
"""

import asyncio
import logging
import os
import threading
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
_models_loading: bool = False


def _load_models_background(app: FastAPI) -> None:
    """Load YOLO models in a background thread.

    This keeps the app responsive to /health checks during model loading,
    which is critical for Railway Serverless cold-boot scenarios where
    the healthcheck must pass within the timeout window.

    Args:
        app: FastAPI application instance to set model_manager on.
    """
    global model_manager, _models_loading
    _models_loading = True
    try:
        model_manager = ModelManager()
        model_manager.load_resident_models()
        app.state.model_manager = model_manager
        logger.info("Resident models loaded successfully (background)")
    except Exception as e:
        logger.error("Failed to load models: %s", e)
        app.state.model_manager = None
        if not settings.demo_mode:
            logger.error("FATAL: demo_mode is off and models failed to load")
    finally:
        _models_loading = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events.

    Startup:
        - Set environment variables for OCR threading
        - Initialize database tables
        - Create evidence directory
        - Start model loading in background thread

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

    # Load models in background thread so /health responds immediately
    # This is critical for Railway Serverless — healthcheck must pass
    # before models finish loading (30-60s on CPU)
    load_thread = threading.Thread(
        target=_load_models_background,
        args=(app,),
        daemon=True,
        name="model-loader",
    )
    load_thread.start()
    logger.info("Model loading started in background thread")

    # Mount evidence static files
    app.mount("/static/evidence", StaticFiles(directory=str(settings.evidence_dir)), name="evidence")

    logger.info("VigilAI ready (models loading in background) — demo_mode=%s", settings.demo_mode)

    yield

    logger.info("VigilAI shutting down...")


app = FastAPI(
    title="VigilAI",
    description="AI-Powered Traffic Violation Detection for Bengaluru Traffic Police",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — in demo/production mode, allow all origins since the frontend
# runs on a different Railway domain. In local dev, restrict to localhost.
import os as _os

_cors_origins = settings.cors_origins
if _os.environ.get("RAILWAY_ENVIRONMENT") or _os.environ.get("VIGILAI_CORS_ALL") == "1":
    _cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True if _cors_origins != ["*"] else False,
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
from backend.app.routes.citizen import router as citizen_router  # noqa: E402
from backend.app.routes.tracking import router as tracking_router  # noqa: E402
from backend.app.routes.deepfake import router as deepfake_router  # noqa: E402
from backend.app.routes.scraper import router as scraper_router  # noqa: E402

app.include_router(detect_router, prefix="/api/v1", tags=["detect"])
app.include_router(violations_router, prefix="/api/v1", tags=["violations"])
app.include_router(evidence_router, prefix="/api/v1", tags=["evidence"])
app.include_router(analytics_router, prefix="/api/v1", tags=["analytics"])
app.include_router(cameras_router, prefix="/api/v1", tags=["cameras"])
app.include_router(challan_pdf_router, prefix="/api/v1", tags=["evidence"])
app.include_router(video_router, prefix="/api/v1", tags=["video"])
app.include_router(citizen_router, prefix="/api/v1", tags=["citizen"])
app.include_router(tracking_router, prefix="/api/v1", tags=["tracking"])
app.include_router(deepfake_router, prefix="/api/v1", tags=["deepfake"])
app.include_router(scraper_router, prefix="/api/v1", tags=["scraper"])


@app.get("/health")
async def health_check():
    """Health check endpoint.

    Returns immediately even during model loading — critical for
    Railway Serverless which requires the app to accept connections
    within a timeout window. Models load in a background thread and
    will be available once is_ready() returns True.
    """
    from backend.app.schemas import HealthResponse

    return HealthResponse(
        models_loaded=model_manager is not None and model_manager.is_ready(),
        demo_mode=settings.demo_mode,
    )


@app.get("/ready")
async def readiness_check():
    """Readiness check — returns 503 until models are loaded.

    Useful for more sophisticated health probes. The /health endpoint
    always returns 200 (app is alive); /ready returns 200 only when
    the app can actually process detection requests.
    """
    from fastapi.responses import JSONResponse

    if model_manager is not None and model_manager.is_ready():
        return {"status": "ready", "demo_mode": settings.demo_mode}
    return JSONResponse(
        status_code=503,
        content={"status": "loading", "demo_mode": settings.demo_mode},
    )
