# DIAGNOSTIC SCRIPT
Write-Host "=== DIAGNOSTICS ===" -ForegroundColor Yellow

# 1. Check if ports are open
Write-Host "`n1. Checking ports..." -ForegroundColor Green
netstat -an | findstr "4280 5173 5000"

# 2. Check Windows Firewall
Write-Host "`n2. Checking Windows Defender Firewall..." -ForegroundColor Green
Get-NetFirewallRule -DisplayName "*node*" -ErrorAction SilentlyContinue | Select DisplayName, Enabled, Action

# 3. Test localhost vs 127.0.0.1
Write-Host "`n3. Testing connections..." -ForegroundColor Green
try { 
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:5173" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✓ Vite is accessible at 127.0.0.1:5173" -ForegroundColor Green
} catch {
    Write-Host "✗ Cannot reach Vite at 127.0.0.1:5173" -ForegroundColor Red
}

try { 
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✓ Vite is accessible at localhost:5173" -ForegroundColor Green
} catch {
    Write-Host "✗ Cannot reach Vite at localhost:5173" -ForegroundColor Red
}

# 4. Check hosts file
Write-Host "`n4. Checking hosts file..." -ForegroundColor Green
Get-Content C:\Windows\System32\drivers\etc\hosts | Select-String "localhost"

Write-Host "`n=== END DIAGNOSTICS ===" -ForegroundColor Yellow
