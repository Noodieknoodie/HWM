@echo off
echo Starting Backend...
start cmd /k "cd /d %~dp0backend && .venv-linux\Scripts\activate && python -m uvicorn app.main:app --reload"


echo Starting Frontend...
cd frontend
npm run dev