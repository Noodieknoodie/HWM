@echo off
cd /d "%~dp0"

REM Activate backend virtual environment and run Uvicorn
start "Backend" cmd /k "cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload"

REM Start frontend dev server
start "Frontend" cmd /k "cd frontend && npm run dev"
