# Local Development Setup Debug Journal
Date: 2025-08-06

## STEP 1-2: Config Files Hierarchy and Current State

### File Structure
```
HWM/
├── .env                                  # Production env vars (AAD auth)
├── .env.local                           # Local env vars (SQL auth)
├── staticwebapp.config.json             # SWA routing config (production)
├── staticwebapp.config.local.json       # SWA routing config (local - minimal)
├── start-local.sh                       # Local startup script
├── package.json                         # Node scripts
├── vite.config.ts                       # Vite config (proxy removed)
└── swa-db-connections/
    ├── staticwebapp.database.config.json      # Currently has ANONYMOUS permissions (was swapped)
    └── staticwebapp.database.config.prod.json # Has AUTHENTICATED permissions (original)
```

### Key Configuration Details

#### .env (Production)
- DATABASE_CONNECTION_STRING: Uses `Authentication="Active Directory Default"`
- AZURE_TENANT_ID: e621abc4-3baa-4b93-badc-3b99e8609963
- AZURE_CLIENT_ID: cc64b230-1e3b-49e3-9a1e-4bb95b55ddb0

#### .env.local (Local Dev)
- DATABASE_CONNECTION_STRING: Uses SQL auth with `User ID=local_dev_user;Password=Prunes27$$$$`

#### staticwebapp.config.json (Production)
- Route `/data-api/*` requires `authenticated` role
- AAD configured with tenant and client IDs

#### staticwebapp.config.local.json (Local)
- Minimal config, just navigation fallback
- **MISSING**: No auth overrides for local development

#### swa-db-connections/staticwebapp.database.config.json (Currently swapped to local version)
- All entities have `role: "anonymous"` permissions
- Host mode: "development"
- Authentication provider: "StaticWebApps"

#### swa-db-connections/staticwebapp.database.config.prod.json (Original production)
- All entities have `role: "authenticated"` permissions
- Host mode: "production"

## STEP 3: What the Current Setup is Trying to Do

The current setup attempts to:
1. Swap database config files to use anonymous permissions locally
2. Start Vite dev server on port 5173
3. Start SWA CLI on port 4280, proxying to Vite and starting DAB
4. DAB reads the swapped config with anonymous permissions
5. SWA proxies `/data-api/*` requests to DAB on port 5000

**THE PROBLEM**: Despite having anonymous permissions in the DAB config, requests still get 401 errors.

## STEP 4: External Research via Perplexity

Research completed - findings indicate that SWA/DAB authentication integration is complex and requires specific configurations for local development bypass.

## STEP 5: Azure Official Documentation Research

### Key Findings from Azure Docs:

1. **Authentication Provider Mismatch**: 
   - DAB config uses `provider: "StaticWebApps"` which expects X-MS-CLIENT-PRINCIPAL headers
   - In local dev, SWA CLI emulates this but the routing layer still enforces role requirements

2. **The Core Issue - Two-Layer Authentication**:
   - **Layer 1 (SWA Routing)**: `staticwebapp.config.json` has `/data-api/*` requiring `authenticated` role
   - **Layer 2 (DAB Permissions)**: DAB config has entities with `anonymous` role
   - Even if DAB allows anonymous, SWA routing blocks it first!

3. **Official Solutions from Docs**:
   - For local development, DAB supports `Simulator` provider that bypasses auth entirely
   - Alternative: Use `StaticWebApps` provider with manual X-MS-CLIENT-PRINCIPAL headers
   - SWA CLI provides auth emulation at `/.auth/login/{provider}` for local testing

4. **Why Current Setup Fails**:
   - `staticwebapp.config.local.json` only has navigation fallback, NO route overrides
   - The script doesn't swap `staticwebapp.config.json` files, only database configs
   - SWA CLI still uses production `staticwebapp.config.json` with auth requirements

## STEP 6: Research Summary

The root cause is clear: Azure Static Web Apps routing configuration (`staticwebapp.config.json`) blocks all `/data-api/*` requests that don't have the `authenticated` role, happening BEFORE Data API Builder even sees the request. This is why changing DAB permissions to `anonymous` had no effect.

## STEP 7: A/B Comparison - Current vs Correct Setup

### Current Setup (BROKEN):
- ✅ Database config swapped (anonymous permissions in DAB)
- ✅ SQL auth connection string
- ❌ SWA config NOT swapped (still requires authentication)
- ❌ DAB provider is "StaticWebApps" (expects auth headers)
- ❌ No way to bypass SWA routing authentication requirement

### Correct Setup (WILL WORK):
- ✅ Database config with anonymous permissions
- ✅ SQL auth connection string  
- ✅ SWA config swapped OR use --swa-config-location flag
- ✅ DAB provider changed to "Simulator" for local dev
- ✅ Remove `/data-api/*` auth requirement from local SWA config

## STEP 8: Simple Implementation Plan

### Solution A: Quick Fix (Recommended - Simplest)
1. Update `staticwebapp.config.local.json` to remove auth requirements
2. Change DAB authentication provider to "Simulator" in local config
3. Use `--swa-config-location` flag to point to local config

### Solution B: Manual Auth Bypass (Alternative)
1. Keep current configs but manually authenticate in browser
2. Navigate to `http://localhost:4280/.auth/login/aad`
3. Create fake user with "authenticated" role
4. Requests will work after login

### Solution C: Complete Config Swap (Most Complex)
1. Create full local versions of both SWA and DAB configs
2. Swap both config files in start-local.sh
3. Ensure all paths and references are updated

I recommend Solution A as it's the simplest and won't affect production.