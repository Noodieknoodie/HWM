# Teams SSO Token Exchange Implementation

## Problem
App was incorrectly using Teams SSO tokens directly as API bearer tokens. This failed because:
- Teams tokens have audience for Teams, not our API
- DAB expects tokens with audience `api://green-rock.../cc64b230...`
- Result: Authentication failures, HTML error responses instead of JSON

## Solution
Implemented On-Behalf-Of (OBO) flow to exchange Teams tokens for API tokens server-side.

## Changes

### Created Azure Function (`/api/`)
- `src/index.ts` - Entry point
- `src/functions/exchangeToken.ts` - OBO flow implementation
- `package.json`, `tsconfig.json`, `host.json` - Azure Functions v4 config
- `local.settings.json` - Environment config (CLIENT_SECRET added)

### Updated Frontend
- `src/auth/useAuth.ts` - Now exchanges Teams token via Azure Function
- `src/utils/tokenExchange.ts` - New utility with retry logic
- `.env` - Added `AZURE_CLIENT_SECRET` and `VITE_TOKEN_EXCHANGE_URL`

### Updated Azure AD
- Added client secret (expires 1/21/2026)

## Flow
1. Teams provides SSO token
2. Frontend calls `/api/exchangeToken` with Teams token
3. Azure Function uses OBO flow to get API token
4. Frontend uses API token to call DAB
5. DAB validates token and returns data

## Key Fix
**Before**: `Teams Token → DAB` ❌  
**After**: `Teams Token → Exchange Service → API Token → DAB` ✅