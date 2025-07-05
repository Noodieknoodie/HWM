# Deployment Checklist for HWM 401k Payment Tracker

## Pre-Deployment Requirements

### Azure Resources
- [ ] Azure SQL Database (existing, no changes needed)
- [ ] Azure App Service for backend API (Python 3.12 runtime)
- [ ] Azure Static Web App for frontend
- [ ] Azure AD App Registration for authentication

### Azure AD App Registration Setup
- [ ] Create app registration in Azure Portal
- [ ] Configure redirect URIs:
  - `https://your-frontend-url.azurestaticapps.net`
  - `https://teams.microsoft.com/`
- [ ] Set API permissions:
  - Microsoft Graph: `User.Read`
  - Expose an API with scope: `access_as_user`
- [ ] Note down:
  - Tenant ID
  - Client ID
  - Application ID URI

## Backend Deployment

### 1. Environment Configuration
- [ ] Set up environment variables in App Service:
  ```
  AZURE_SQL_CONNECTION_STRING=Driver={ODBC Driver 18 for SQL Server};Server=hohimerpro-db-server.database.windows.net;Database=HohimerPro-401k;Authentication=ActiveDirectoryDefault;
  AZURE_TENANT_ID=your-tenant-id
  AZURE_CLIENT_ID=your-client-id
  API_HOST=0.0.0.0
  API_PORT=8000
  CORS_ORIGINS=https://your-frontend-url.azurestaticapps.net,https://teams.microsoft.com
  ```

### 2. App Service Configuration
- [ ] Enable system-assigned managed identity
- [ ] Grant managed identity access to SQL Database
- [ ] Configure startup command: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app`
- [ ] Enable HTTPS only
- [ ] Configure deployment method (ZIP deploy recommended)

### 3. Deploy Backend Code
- [ ] From backend directory: `zip -r backend.zip . -x "venv/*" -x "__pycache__/*" -x "*.pyc" -x ".env*"`
- [ ] Deploy using Azure CLI: `az webapp deploy --resource-group HWM_401k --name your-app-service --src-path backend.zip`

## Frontend Deployment

### 1. Update Configuration
- [ ] Create `.env.production` file:
  ```
  VITE_API_URL=https://your-backend-api.azurewebsites.net
  ```

### 2. Build Frontend
- [ ] Run build command:
  ```bash
  cd frontend
  npm install
  npm run build
  ```

### 3. Deploy to Static Web App
- [ ] Configure Static Web App:
  - App location: `/frontend`
  - Output location: `dist`
  - Build command: `npm run build`
- [ ] Set environment variable:
  - `VITE_API_URL`: Your backend API URL
- [ ] Deploy via Azure CLI or GitHub Actions

## Teams App Deployment

### 1. Update Manifest
- [ ] Edit `teams-manifest/manifest.json`:
  - Replace `{APP_ID}` with new GUID
  - Replace `{FRONTEND_URL}` with Static Web App URL
  - Replace `{FRONTEND_DOMAIN}` with domain only
  - Replace `{API_DOMAIN}` with API domain
  - Replace `{AZURE_CLIENT_ID}` with your client ID

### 2. Add Icons
- [ ] Add `color.png` (192x192px) to teams-manifest/
- [ ] Add `outline.png` (32x32px) to teams-manifest/

### 3. Package and Deploy
- [ ] Create package:
  ```bash
  cd teams-manifest
  zip -r ../teams-app.zip manifest.json color.png outline.png
  ```
- [ ] Upload to Teams Admin Center
- [ ] Publish to organization app catalog
- [ ] Set appropriate permissions and policies

## Post-Deployment Verification

### Backend API
- [ ] Test health endpoint: `GET https://api-url/health`
- [ ] Verify auth config: `GET https://api-url/auth/config`
- [ ] Check CORS headers are working

### Frontend
- [ ] Verify app loads in browser
- [ ] Check Teams SSO authentication works
- [ ] Confirm API connection is successful

### Teams Integration
- [ ] Install app in Teams
- [ ] Verify SSO login works automatically
- [ ] Test all major features:
  - [ ] Client list loads
  - [ ] Dashboard displays correctly
  - [ ] Payment form works
  - [ ] Payment history shows

### Performance Verification
- [ ] Period dropdown loads quickly (< 100ms)
- [ ] Dashboard loads with single API call
- [ ] No client-side calculations for variance
- [ ] Binary status indicators work (green/yellow only)

## Security Checklist
- [ ] All environment variables set (no hardcoded values)
- [ ] HTTPS enforced on all endpoints
- [ ] Authentication required for all API endpoints
- [ ] Database connection uses managed identity
- [ ] No sensitive data in logs

## Rollback Plan
- [ ] Document current working versions
- [ ] Keep previous deployment packages
- [ ] Test rollback procedure
- [ ] Have database backup available (if needed)

## Notes
- The database already has all required views, indexes, and triggers
- No database migrations needed
- Document viewer is UI-only placeholder
- All dates handled as proper DATE type (no string manipulation)