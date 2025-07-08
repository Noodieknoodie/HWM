# Teams Manifest

This directory contains the Microsoft Teams app manifest for the HWM 401k Payment Tracker.

## Prerequisites

1. Azure AD App Registration
   - Create an app registration in Azure Portal
   - Set redirect URIs for Teams authentication
   - Configure API permissions for Microsoft Graph (User.Read)
   - Expose an API with scope (e.g., access_as_user)

2. Azure Static Web App
   - Deployed with database connections configured
   - Authentication enabled

## Configuration

Replace placeholder values in `manifest.json`:

| Placeholder | Description | Example |
|------------|-------------|---------|
| `{APP_ID}` | Unique GUID for Teams app | Generate new GUID |
| `{FRONTEND_URL}` | Full Static Web App URL | https://hwm401k.azurestaticapps.net |
| `{FRONTEND_DOMAIN}` | Static Web App domain only | hwm401k.azurestaticapps.net |
| `{AZURE_CLIENT_ID}` | Azure AD app client ID | Your app registration client ID |

## Icon Requirements

Add the following icon files to this directory:

1. **color.png**
   - Size: 192x192 pixels
   - Full color icon
   - Transparent background recommended

2. **outline.png**
   - Size: 32x32 pixels
   - Monochrome outline icon
   - Used in Teams sidebar

## Deployment Steps

1. Configure all placeholder values in `manifest.json`
2. Add both icon files to this directory
3. Create a zip file containing:
   - `manifest.json`
   - `color.png`
   - `outline.png`
4. Upload the zip file:
   - **For organization-wide deployment**: Teams Admin Center
   - **For testing**: Teams > Apps > Upload custom app

## Important Notes

- This is a simplified manifest without Teams Toolkit complexity
- The app uses static tabs only (no bots, messaging extensions, etc.)
- Authentication is handled via Azure AD SSO
- No Teams Toolkit dependencies or configuration required