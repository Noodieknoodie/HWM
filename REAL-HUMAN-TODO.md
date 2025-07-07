# REAL-HUMAN-TODO.md

## ISSUE: Frontend sends wrong parameter name to periods endpoint
**Files Affected:** backend/app/api/periods.py, frontend/src/hooks/usePeriods.ts  
**Reason It Matters:** The periods endpoint expects `payment_schedule` but frontend sends `contract_id`, causing immediate 422 validation errors whenever the app tries to load billing periods  
**Evidence:** Backend periods.py line 13-15 defines `payment_schedule: str = Query(...)` but frontend usePeriods.ts line 34 sends `contract_id` parameter  
**Solution (Summary Only):** Either update backend to accept contract_id parameter or update frontend to send payment_schedule  
**Expected Result if Fixed:** Periods will load correctly, enabling payment creation workflow  
**Importance:** High  
**Difficulty to Implement:** Easy  

## ISSUE: Authentication headers never sent by frontend
**Files Affected:** backend/app/auth.py, frontend/src/auth/useAuth.ts, frontend/src/api/client.ts  
**Reason It Matters:** Backend requires X-MS-CLIENT-PRINCIPAL header for all authenticated requests, but frontend never sets this header, causing all API calls to fail with 401 in production  
**Evidence:** Backend auth.py expects X-MS-CLIENT-PRINCIPAL header (line 26) but frontend API client never sets any auth headers  
**Solution (Summary Only):** Update frontend API client to include X-MS-CLIENT-PRINCIPAL header from Azure auth response  
**Expected Result if Fixed:** API calls will authenticate successfully in production  
**Importance:** High  
**Difficulty to Implement:** Medium  

## ISSUE: API calls use double /api prefix
**Files Affected:** frontend/src/api/client.ts, backend/app/main.py  
**Reason It Matters:** Frontend calls /api/api/clients instead of /api/clients, causing all API requests to fail with 404 errors  
**Evidence:** Frontend client.ts defaults to '/api' base URL but backend already mounts all routes under /api prefix (main.py lines 141-145)  
**Solution (Summary Only):** Remove /api prefix from frontend base URL or from backend route mounting  
**Expected Result if Fixed:** API endpoints will be reachable at correct URLs  
**Importance:** High  
**Difficulty to Implement:** Easy  

## ISSUE: Dashboard creates new database connection per request
**Files Affected:** backend/app/api/dashboard.py  
**Reason It Matters:** Creating new Database() instances per request exhausts connection pool and Azure AD token limits, causing 500 errors under load  
**Evidence:** dashboard.py line 33 creates `db = Database()` instead of using the global instance from app.database  
**Solution (Summary Only):** Import and use the global db instance from app.database  
**Expected Result if Fixed:** Connection reuse will prevent resource exhaustion  
**Importance:** High  
**Difficulty to Implement:** Easy  

## ISSUE: Payment API returns incomplete data missing date fields
**Files Affected:** backend/app/api/payments.py  
**Reason It Matters:** Missing valid_from/valid_to fields in API responses can cause TypeScript errors and data inconsistencies in frontend  
**Evidence:** PaymentWithVariance model inherits fields from Payment model but SQL query (lines 20-39) doesn't select valid_from/valid_to columns  
**Solution (Summary Only):** Add valid_from and valid_to to the SELECT statement in payments query  
**Expected Result if Fixed:** Payment responses will include all expected fields  
**Importance:** Medium  
**Difficulty to Implement:** Easy  

## ISSUE: JSON syntax error breaks Azure deployment
**Files Affected:** frontend/staticwebapp.config.json  
**Reason It Matters:** Extra closing brace causes JSON parse error, preventing Azure Static Web Apps from deploying successfully  
**Evidence:** Line 28 has an extra `}` making the JSON invalid  
**Solution (Summary Only):** Remove the extra closing brace  
**Expected Result if Fixed:** Azure deployments will succeed  
**Importance:** High  
**Difficulty to Implement:** Easy  

## ISSUE: React hooks missing dependencies cause stale closures
**Files Affected:** frontend/src/hooks/usePeriods.ts, frontend/src/hooks/useClientDashboard.ts  
**Reason It Matters:** Missing apiClient in useEffect dependencies can cause API calls to use outdated client instances, leading to wrong endpoints or auth failures  
**Evidence:** useEffect hooks use apiClient but don't include it in dependency arrays (usePeriods.ts line 45, useClientDashboard.ts line 119)  
**Solution (Summary Only):** Add apiClient to the dependency arrays of affected useEffect hooks  
**Expected Result if Fixed:** API calls will always use current client configuration  
**Importance:** Medium  
**Difficulty to Implement:** Easy  

## ISSUE: No database connection pooling or retry logic
**Files Affected:** backend/app/database.py  
**Reason It Matters:** Creating fresh connections and tokens for every request causes performance issues and transient 500 errors during Azure SQL connectivity blips  
**Evidence:** Database class creates new pyodbc connections without pooling and acquires new Azure AD tokens on every connection  
**Solution (Summary Only):** Implement connection pooling and token caching with retry logic for transient failures  
**Expected Result if Fixed:** Better performance and resilience to transient network issues  
**Importance:** High  
**Difficulty to Implement:** Hard