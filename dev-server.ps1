# Quick dev server script
Write-Host "Starting development servers..." -ForegroundColor Green

# Set environment variable
$env:DATABASE_CONNECTION_STRING = "Server=tcp:hohimerpro-db-server.database.windows.net,1433;Initial Catalog=HohimerPro-401k;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;Authentication=Active Directory Default;"

# Start Vite in background
Write-Host "Starting Vite on http://localhost:5173" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

# Give Vite time to start
Start-Sleep -Seconds 5

# Start SWA without auth config
Write-Host "Starting SWA emulator on http://localhost:4280" -ForegroundColor Yellow
swa start http://localhost:5173 --data-api-location swa-db-connections --config staticwebapp.config.local.json

Write-Host "`nServers started! Open http://localhost:4280 in your browser" -ForegroundColor Green