#!/usr/bin/env python3
"""Railway startup script: download weights, then start FastAPI app."""

import os
import subprocess
import sys
from pathlib import Path

# Ensure we're in the project root
PROJECT_ROOT = Path(__file__).resolve().parent
os.chdir(PROJECT_ROOT)

def run_cmd(cmd: list[str], description: str) -> bool:
    """Run a command and return success status."""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        if result.stdout:
            print(result.stdout[-500:])  # Last 500 chars
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(e.stdout[-500:] if e.stdout else "")
        print(e.stderr[-500:] if e.stderr else "")
        return False

def main():
    print("🚀 VigilAI Railway Startup")
    print(f"📁 Working directory: {PROJECT_ROOT}")
    print(f"🐍 Python: {sys.version}")
    
    # 1. Download weights
    if not run_cmd([sys.executable, "scripts/setup_weights.py"], "Downloading model weights"):
        print("⚠️  Weight download had issues, but continuing...")
    
    # 2. Verify critical weights exist
    weights_dir = PROJECT_ROOT / "backend" / "weights"
    critical_weights = ["yolov8n.pt", "helmet.pt", "plate.pt"]
    missing = [w for w in critical_weights if not (weights_dir / w).exists()]
    
    if missing:
        print(f"⚠️  Missing critical weights: {missing}")
        print("   App may run in demo_mode or fail on detection.")
        print("   Ensure helmet.pt and plate.pt are available.")
    else:
        print("✅ All critical weights present")
    
    # 3. Initialize database
    print("🗄️  Initializing database...")
    try:
        from backend.app.db.database import init_db
        init_db()
        print("✅ Database initialized")
    except Exception as e:
        print(f"⚠️  Database init warning: {e}")
    
    # 4. Start the app
    port = os.environ.get("PORT", "8000")
    print(f"🌐 Starting server on port {port}...")
    
    # Use exec to replace process (proper signal handling)
    os.execvpe(
        sys.executable,
        [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", port],
        os.environ
    )

if __name__ == "__main__":
    main()