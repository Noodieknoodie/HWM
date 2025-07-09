# WORKING SOLUTION
Write-Host "STARTING WORKING SOLUTION" -ForegroundColor Green

# 1. Set environment variable
$env:DATABASE_CONNECTION_STRING = "Server=tcp:hohimerpro-db-server.database.windows.net,1433;Initial Catalog=HohimerPro-401k;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;Authentication=Active Directory Default;"

# 2. Kill everything
Write-Host "Killing all Node processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null

Start-Sleep -Seconds 2

# 3. Start with the local config that has NO AUTH
Write-Host "Starting SWA with NO AUTHENTICATION..." -ForegroundColor Green
swa start http://localhost:5173 --data-api-location swa-db-connections --config ./staticwebapp.config.local.json --run "npm run dev"

Write-Host "WAIT FOR: 'Azure Static Web Apps emulator started at http://localhost:4280'" -ForegroundColor Yellow