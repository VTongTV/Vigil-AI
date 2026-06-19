@echo off
title VigilAI Launcher
echo ============================================================
echo   VigilAI - AI-Powered Traffic Violation Detection
echo   Bengaluru Traffic Police Command Center
echo ============================================================
echo.

:: --- Backend ---
echo [1/2] Starting FastAPI backend on http://localhost:8000 ...
start "VigilAI Backend" cmd /k "cd /d "%~dp0" && venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Give uvicorn a few seconds to grab the port before frontend calls /health
timeout /t 5 /nobreak >nul

:: --- Frontend ---
echo [2/2] Starting React frontend on http://localhost:5173 ...
start "VigilAI Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ============================================================
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:5173
echo   API Docs : http://localhost:8000/docs
echo ============================================================
echo.
echo Close the two terminal windows to stop the servers.
pause
