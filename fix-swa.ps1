# FIX SWA - Two terminal approach
Write-Host "FIXING SWA - You need TWO PowerShell windows!" -ForegroundColor Yellow

Write-Host "`nTERMINAL 1:" -ForegroundColor Green
Write-Host "Keep Vite running (it's already running now at http://localhost:5173)"

Write-Host "`nTERMINAL 2 (open a NEW PowerShell):" -ForegroundColor Green
Write-Host "cd C:\Users\erikl\TeamsApps\HWM"
Write-Host '$env:DATABASE_CONNECTION_STRING = "Server=tcp:hohimerpro-db-server.database.windows.net,1433;Initial Catalog=HohimerPro-401k;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;Authentication=Active Directory Default;"'
Write-Host "swa start http://localhost:5173 --data-api-location swa-db-connections"

Write-Host "`nDO NOT use the config file - it's causing the authentication issue!" -ForegroundColor Red