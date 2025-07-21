# SQL Authentication Debug Log

## Environment Details
- Static Web App URL: https://green-rock-024c27f1e.1.azurestaticapps.net
- App ID: cc64b230-1e3b-49e3-9a1e-4bb95b55ddb0
- Tenant ID: e621abc4-3baa-4b93-badc-3b99e8609963
- Database: hohimerpro-db-server
- Subscription: e2ed8f3b-7c6a-46b9-a829-65aad1898d3e

## Current Issue
- 400 Bad Request errors on Data API endpoints
- Works locally with `npm start` (SWA CLI emulator)
- Fails in both browser and Teams environments

## Initial Findings

### 1. Database Configuration Location
**CONFIRMED:** Azure Data API expects `staticwebapp.database.config.json` in root directory
- Local SWA CLI uses `--data-api-location swa-db-connections` flag
- Production Azure doesn't support custom locations
- **Status:** Fixed - copied config to root in commit 57ed82d

### 2. Authentication Configuration
**CONFIRMED:** Data API was in development mode with Simulator auth
- Changed to production mode with StaticWebApps provider
- **Status:** Fixed in commit d19f0a5

### 3. Database Views Exist
**CONFIRMED:** Views exist in production database
- `sidebar_clients_view` ✓
- `quarterly_page_data` ✓

## Active Investigation

### Error Details
- Response: `{"Message":"Response status code does not indicate success: 400 (Bad Request)","ActivityId":"..."}`
- Endpoints failing:
  - `/data-api/rest/sidebar_clients_view`
  - `/data-api/rest/quarterly_page_data?$filter=applied_year eq 2025...`

---

## Debug Steps

### Step 1: Azure Configuration Check

**Static Web App Details (CONFIRMED):**
- Name: HWM-401k
- Resource Group: HWM_401k
- Default hostname: green-rock-024c27f1e.1.azurestaticapps.net
- Database connection: Configured with SystemAssigned identity
- Managed Identity Principal ID: 9feea94f-fa22-4788-aa40-5d9cc3697e7e

**SQL Server Firewall (CONFIRMED):**
- AllowAllWindowsAzureIps: ✓ (0.0.0.0 - 0.0.0.0)
- Azure services can connect

**Environment Variables (ISSUE FOUND):**
- DATABASE_CONNECTION_STRING uses "Active Directory Managed Identity"
- This requires the Static Web App's managed identity to have SQL access

### Step 2: Connection String Analysis

**Current Connection String:**
```
Server=tcp:hohimerpro-db-server.database.windows.net,1433;
Initial Catalog=HohimerPro-401k;
Encrypt=True;
TrustServerCertificate=False;
Connection Timeout=30;
Authentication=Active Directory Managed Identity;
```

**Potential Issue:** The managed identity (9feea94f-fa22-4788-aa40-5d9cc3697e7e) may not have access to the SQL database.

### Step 3: Authentication Method Comparison

**Local .env (WORKS):**
```
Authentication="Active Directory Default"
```
- Uses Azure CLI credentials or VS Code authentication
- Works with your personal Azure AD account

**Production Azure (FAILS):**
```
Authentication=Active Directory Managed Identity
```
- Requires Static Web App's managed identity to be granted SQL access
- Managed Identity: HWM-401k (9feea94f-fa22-4788-aa40-5d9cc3697e7e)

**ROOT CAUSE HYPOTHESIS:** The Static Web App's managed identity doesn't have SQL database access.

### Step 4: Direct API Testing Results

**Finding:** Data API is running but returning 403 Authorization errors
- `/data-api/rest` → 404 (normal, needs entity name)
- `/data-api/rest/sidebar_clients_view` → 403 Authorization Failure

**Issue:** Data API requires authenticated requests but is getting anonymous ones.

### Step 5: Root Cause Identified

**CONFIRMED:** The Data API is working correctly, but fetch requests aren't including authentication
- Manual login to `/.auth/login/aad` → App works
- Problem: Frontend API calls missing credentials

**Solution Needed:** Add credentials to fetch calls

### Step 6: Fix Implementation

**Current fetch code (line 26):**
```javascript
const response = await fetch(url, {
  ...options,
  headers: {
    'Content-Type': 'application/json',
    ...options.headers,
  },
});
```

**Missing:** `credentials: 'include'` to send auth cookies

### Step 7: Fix Applied

**Fixed in commit:** Added `credentials: 'include'` to:
1. `src/api/client.ts` line 28 - All Data API requests
2. `src/auth/useAuth.ts` line 48 - Auth check request

This ensures authentication cookies are sent with every request.

### Step 8: Teams vs Browser Issue Analysis

**Corrected Understanding:**
- Data API uses SWA's managed identity for SQL access (not frontend tokens)
- Frontend auth only gates access to SWA endpoints
- Browser works = managed identity and networking are correct

**Teams-specific issue possibilities:**
1. CORS/origin restrictions 
2. Teams iframe sandbox blocking requests
3. Network routing differences when embedded in Teams

### Step 9: Teams Error Analysis

**Error Found:** 403 Forbidden on Data API calls in Teams
- Browser: Works (origin matches)
- Teams: Fails (runs from SharePoint domain)

**Root Cause:** CORS configuration only allows `https://teams.microsoft.com` but Teams apps actually run from SharePoint domains (*.sharepoint.com)

### Step 10: Expert Analysis - It's Not CORS!

**Real Issue:** Azure SQL firewall is blocking Teams traffic
- Browser works: Your IP is whitelisted
- Teams fails: Runs from Azure infrastructure (different IP)

**Key Insight:** Teams requests come from Azure's IP ranges, not your local IP
