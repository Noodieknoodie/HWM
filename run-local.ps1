# Kill any existing processes
Write-Host "Stopping any existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*swa*" -or $_.ProcessName -like "*vite*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Start SWA (backend + database) in background
Write-Host "Starting database API..." -ForegroundColor Cyan
$swaCommand = "swa start --data-api-location swa-db-connections --port 4280 --host 0.0.0.0"
Start-Process powershell -ArgumentList "-Command", $swaCommand -WindowStyle Minimized

# Give SWA a moment to start
Start-Sleep -Seconds 3

# Start Vite (frontend) in foreground
Write-Host "Starting frontend..." -ForegroundColor Green
Write-Host ""
Write-Host "App running at: http://localhost:5173" -ForegroundColor Green
Write-Host "Database API at: http://localhost:4280/data-api/graphql" -ForegroundColor Blue
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

npm run dev