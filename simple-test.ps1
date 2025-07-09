# SIMPLEST POSSIBLE TEST
Write-Host "SIMPLE TEST - Just Vite, no SWA" -ForegroundColor Green

# Kill everything
taskkill /F /IM node.exe 2>$null

# Just run Vite
Write-Host "Starting ONLY Vite..." -ForegroundColor Yellow
npm run dev

# This should work at http://localhost:5173