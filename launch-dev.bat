@echo off
echo Starting HWM Development Server...
echo.
echo Starting Vite and SWA CLI...
start /B npm run dev
timeout /t 3 /nobreak > nul
npm start