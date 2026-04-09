@echo off
title ArogyaMitra - Starting Servers
color 0A

echo.
echo  ====================================
echo   ArogyaMitra - AI Fitness Platform
echo  ====================================
echo.

:: Kill any existing processes on ports 8000 and 5173
echo [1/4] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
timeout /t 1 >nul

:: Start Backend
echo [2/4] Starting Backend (FastAPI on port 8000)...
cd /d "%~dp0backend"
start "ArogyaMitra-Backend" cmd /k "python -m uvicorn app.main:app --reload --port 8000"

:: Wait for backend to boot
echo [3/4] Waiting for backend to start...
timeout /t 4 >nul

:: Start Frontend
echo [4/4] Starting Frontend (Vite on port 5173)...
cd /d "%~dp0frontend"
start "ArogyaMitra-Frontend" cmd /k "npm run dev"

:: Wait for frontend to boot
timeout /t 3 >nul

:: Open browser
echo.
echo  Opening ArogyaMitra in your browser...
start "" "http://localhost:5173"

echo.
echo  ====================================
echo   All servers started successfully!
echo  ====================================
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo   Cloud Run: https://arogyamitra-yvza2siv3a-el.a.run.app
echo.
echo   Close this window anytime. Servers
echo   run in their own windows.
echo  ====================================
echo.
pause
