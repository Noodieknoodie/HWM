# Script to package Teams app for local testing
$sourcePath = "teams-manifest"
$files = @("manifest.local.json", "color.png", "outline.png")
$zipPath = "401k-tracker-local.zip"

# Remove existing zip if it exists
if (Test-Path $zipPath) {
    Remove-Item $zipPath
}

# Create the zip file
Compress-Archive -Path ($files | ForEach-Object { Join-Path $sourcePath $_ }) -DestinationPath $zipPath

Write-Host "Teams app package created: $zipPath" -ForegroundColor Green
Write-Host ""
Write-Host "To test your app:" -ForegroundColor Yellow
Write-Host "1. Open Microsoft Teams (web or desktop)" -ForegroundColor White
Write-Host "2. Go to Apps > Upload a custom app" -ForegroundColor White
Write-Host "3. Upload the file: $zipPath" -ForegroundColor White
Write-Host "4. Install the app to test it" -ForegroundColor White
Write-Host ""
Write-Host "Note: Make sure 'npm start' is running first!" -ForegroundColor Cyan