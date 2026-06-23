#!/bin/bash
set -e

cd /app

# Install CPU-only PyTorch if not already installed
if ! python -c "import torch" 2>/dev/null; then
    echo "Installing CPU-only PyTorch..."
    pip install --no-cache-dir --progress-bar off \
        torch torchvision \
        --extra-index-url https://download.pytorch.org/whl/cpu
fi

# Install other requirements if not already installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "Installing requirements..."
    pip install --no-cache-dir --progress-bar off -r requirements.txt
fi

echo "Starting VigilAI backend..."
exec python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 7860 --workers 1
