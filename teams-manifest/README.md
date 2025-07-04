# Teams Manifest

This folder contains the Microsoft Teams app manifest for the HWM 401k Payment Tracker.

## Setup Instructions

1. Update the manifest.json with your actual values:
   - Replace all `00000000-0000-0000-0000-000000000000` with your Azure AD app registration ID
   - Update `your-frontend-url.azurestaticapps.net` with your actual frontend URL
   - Update `your-api-url.azurewebsites.net` with your actual API URL

2. Add icon files:
   - color.png: 192x192px color icon
   - outline.png: 32x32px outline icon

3. Package the app:
   - Zip the contents of this folder (manifest.json and icon files)
   - Upload to Teams Admin Center or App Studio

## Important Notes

- This is a simplified manifest without Teams Toolkit complexity
- The app uses static tabs only (no bots, messaging extensions, etc.)
- Authentication is handled via Azure AD SSO