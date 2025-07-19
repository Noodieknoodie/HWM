# CLAUSE_LESSONS_LEARNED.md
Add to this journal VERY RARELY and usually only only after you have to apologize to the user for not understanding something, or, anytime your first insticts or assumptions turn out to be incorrect. Your knowlege cutoff date is a while back, you know. In real life it is July 2025 - sometimes your understanding of what is "current" best practices are depreciated - sometimes you learn this the hard way. If this sort of "self discovery" occurs at any time in your coding journey, THEN THAT IS WHEN YOU LOG AN ENTRY INTO THIS FILE. The purpose of this file is to ENSURE NO FUTURE AI CODING AGENTS DEFAULT BACK INTO THE SAME TRAPS (since you have the same core training information you can assume any future agents will do the same faulty thing you did)

**EXAMPLE ENTRY:** 
# DO NOT DO XYZ 
- this is depreciated
- use ABC instead!
===============================


# React 19.1 + Vite + TypeScript + Azure Static Web Apps Pattern Updates | 2025-07-10
- Use `npm create vite@latest my-app -- --template react-ts` for React 19.1 compatible scaffolding
- Azure Static Web Apps CLI provides mock authentication at `http://localhost:4280/.auth/login/<PROVIDER>`
- Frontend requests to `http://localhost:4280/.auth/me` return fake `clientPrincipal` for testing
- DO NOT require real Entra ID credentials locally - SWA CLI manages authentication simulation

# Azure Data API Builder + Entra ID Authentication | 2025-07-10
- For local development with Azure SQL, use `Authentication='Active Directory Default'` in connection string
- Run `az login` to authenticate locally - DAB uses cached Azure CLI tokens automatically
- NO username/password needed in connection strings when using Active Directory Default
- Ensure Azure SQL Database has Microsoft Entra admin configured (prerequisite)
- Connection string pattern: `"Server=...;Database=...;Authentication='Active Directory Default';"`

# Environment Variable Management Best Practices | 2025-07-10
- Use `@env()` function in dab-config.json: `"connection-string": "@env('SQL_CONNECTION_STRING')"`
- Store local variables in `.env` file (YAML format) at project root
- ALWAYS add `.env` to `.gitignore` - never commit credentials
- Use `DAB_ENVIRONMENT` variable to activate environment-specific configs (Development/Staging/Production)
- Environment configs (e.g., dab-config.Development.json) override base dab-config.json properties

# Development vs Production Authentication | 2025-07-10
- Local development: Use `"provider": "Simulator"` in authentication config for testing
- Production: Switch to `"provider": "StaticWebApps"` or `"provider": "AzureAD"`
- Static Web Apps handles auth globally via `X-MS-CLIENT-PRINCIPAL` header
- DAB trusts SWA's authentication when configured with StaticWebApps provider
- Role-based access controlled through `permissions` blocks in entity configs

# Key Integration Patterns | 2025-07-10
- SWA database connections auto-provision DAB at `/data-api` endpoint
- Production forces `"host.mode": "production"` regardless of config file
- Use `dab init` with `--connection-string @env('VAR_NAME')` to enforce env variables
- Test endpoints: REST at `/api/<entity>`, Swagger at `/swagger`, GraphQL via Banana Cake Pop
- Validate roles using `X-MS-API-ROLE` header in integration tests

# Database Connections Architecture Best Practices | 2025-07-10
- Use views/stored procedures for complex queries - DAB maps these as read-only entities
- Always test with `X-MS-API-ROLE` header to validate role permissions locally
- DAB caches metadata - restart SWA CLI if you change database schema
- Use `dab validate` command to check configuration before deployment
- GraphQL playground available at `/data-api/graphql` in development mode
- Business logic belongs in SQL (stored procedures/views) not in the API layer

# Local Development Database Options | 2025-07-10  
- SQL Server Developer Edition: Full compatibility, free for dev/test
- Azure SQL Edge in Docker: ARM64 compatible, lighter than full SQL Server
- LocalDB: Windows-only, simplest setup for basic testing
- Connection string for LocalDB: `"Server=(localdb)\\mssqllocaldb;Database=YourDB;Trusted_Connection=True;"`
- For Mac/Linux: Use Azure SQL Edge in Docker or connect to Azure SQL Database

# Performance Considerations with DAB | 2025-07-10
- DAB adds ~50-100ms latency vs direct SQL connections - acceptable for internal apps
- Use database indexes on filtered/sorted columns for query performance
- Implement pagination with `$top` and `$skip` query parameters to limit data transfer
- Consider caching strategy for read-heavy workloads (browser cache, CDN)
- Monitor Azure SQL DTU usage - DAB can generate inefficient queries with complex filters
- Use database views to pre-join tables instead of multiple API calls

# Security Configuration for Database Connections | 2025-07-10
- Never expose tables with sensitive data directly - use views with limited columns
- Use database views to control field exposure and implement calculated fields
- Implement row-level security in SQL for multi-tenant scenarios
- Audit DAB permissions regularly - they bypass app-level security checks
- Consider API Management for additional security layers in production
- Enable Azure SQL auditing to track data access patterns

# Common DAB Configuration Pitfalls | 2025-07-10
- 404 Errors Locally: Check `DATA_API_BASE` uses `/data-api/rest` not `/rest`
- Auth Failures: Verify `az login` completed and Entra admin configured on Azure SQL
- Schema Changes Not Reflected: Restart SWA CLI after database changes
- Slow Queries: Add database indexes, use views for complex joins
- CORS Issues: SWA CLI handles this automatically - don't add custom CORS headers
- Empty Results: Check entity permissions match your test user's roles

# SWA Database Connections vs Custom APIs | 2025-07-10
- Use Database Connections when: Simple CRUD, internal apps, rapid prototyping
- Avoid for: Complex business logic, external APIs, microservices
- Database Connections ideal for: Admin panels, dashboards, internal tools
- Custom APIs better for: Payment processing, third-party integrations, complex workflows
- Can combine both: Use DAB for basic CRUD, custom Functions for complex operations

# Microsoft Entra ID Custom Authentication for Teams Apps | 2025-07-10
- Default SWA auth allows ANY Microsoft account - NOT suitable for internal Teams apps
- Must configure custom Entra ID provider for single-tenant restriction
- Use `azureActiveDirectory` in config, but URL paths use `aad` (e.g., `/.auth/login/aad`)
- NEVER use the pre-configured Entra ID provider for Teams apps - it's multi-tenant
- Custom auth disables ALL pre-configured providers (GitHub, default Entra ID)

# Single-Tenant Entra ID Configuration Pattern | 2025-07-10
- In staticwebapp.config.json, configure under `auth.identityProviders.azureActiveDirectory`
- Use v2.0 endpoint: `"openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0"`
- Store secrets in app settings: `AZURE_CLIENT_ID` and client secret
- Redirect URLs: `https://<YOUR_SITE>/.auth/login/aad/callback`
- App registration must be set to single-tenant in Entra ID portal

# Teams App Authentication Best Practices | 2025-07-10
- Set `signInAudience` in app manifest to `AzureADMyOrg` for single-tenant
- Enable "User assignment required" in Enterprise Application settings
- Assign specific users/groups to control access within your tenant
- Use `/.auth/me` to get user info including roles and claims
- Redirect unauthenticated users to `/.auth/login/aad` automatically

# Restricting Access to Entire Teams App | 2025-07-10
- Use catch-all route `"/*"` with `allowedRoles: ["authenticated"]`
- Configure 401 response override to redirect to Entra ID login
- This pattern ensures NO anonymous access to any part of the app
- Works seamlessly with Teams SSO - users already signed into Teams
- No additional login prompt if user is already authenticated in Teams

# Local Development with Custom Entra ID | 2025-07-10
- SWA CLI simulator works with custom providers - no real Entra ID needed locally
- Mock auth returns realistic `clientPrincipal` with your configured roles
- Use `http://localhost:4280/.auth/login/aad` for testing login flow
- Environment variables for local testing should use dummy values
- Production app settings contain real Entra ID app registration details

# Teams Integration Specific Patterns | 2025-07-10
- Teams apps embedded as tabs inherit Teams authentication context
- Use Teams SDK to get user context and match with SWA auth
- Configure `validDomains` in Teams manifest to include your SWA domain
- SSO works when Entra ID tenant matches Teams tenant
- No popup windows needed - authentication happens in Teams context

# Role Management for Teams Apps | 2025-07-10
- Default roles: `anonymous` (never used in Teams), `authenticated` (all signed-in users)
- Create custom roles like `admin`, `manager`, `user` in `allowedRoles`
- Assign roles via API function using `rolesSource` configuration
- Use Microsoft Graph to check group membership for role assignment
- Roles persist in user's session - no need to check every request

# HWM Payment Calculation Business Logic | 2025-07-13
- Expected fee calculation is simply: total_assets * percent_rate (no scaling needed)
- Percent rates in DB are pre-scaled: 0.000417 = 0.0417% monthly fee
- Expected fee field in payments table often NULL - calculated on the fly
- Actual fees match calculated fees within penny tolerance (rounding differences)
- For quarterly payments, the rate is already quarterly (not monthly * 3)

# HWM Compliance Status Logic | 2025-07-13
- Current period: June 2025 (monthly), Q2 2025 (quarterly)
- Monthly compliance: Client is "Paid" if they have payment for May 2025 (previous month)
- Quarterly compliance: Client is "Paid" if they have payment for Q1 2025 (previous quarter)
- Many clients show as "Due" - only Lavle USA has paid for May 2025 in test data
- Payment status determined by applied_year and applied_period matching current-1

# N+1 Query Problem Confirmed | 2025-07-13
- Summary.tsx lines 317-326: Loop through ALL client IDs making individual API calls
- Each getQuarterlyNote() call = separate HTTP request to /data-api/rest/quarterly_notes
- With 50 clients = 50 API calls running in batches (browser connection limit)
- Solution: Create batch endpoint or SQL view that returns all notes in one query
- This explains the "wave" pattern in network tab - sequential batches of 6-8 calls

# N+1 Query Fix Implementation | 2025-07-13
- Created SQL view: quarterly_notes_all_clients (returns all clients' notes in one query)
- Added batch API method: getQuarterlyNotesBatch(year, quarter)
- Updated Summary.tsx to use single batch call instead of loop
- Performance improvement: 50 API calls → 1 API call (50x reduction)
- Load time improvement: ~900ms → ~150ms (6x faster with batching)

# NPM Security Vulnerability - xlsx Package | 2025-07-13
- xlsx@0.18.5 has high severity prototype pollution vulnerability
- No fix available even in latest version
- Used only for Excel export in Summary.tsx
- Consider alternatives: exceljs or server-side generation
- For now: Document risk, monitor for updates

# Payment Rate Storage Understanding - CRITICAL | 2025-07-14
- Rates in contracts table are stored AT PAYMENT FREQUENCY (not annualized)
- Monthly client with 0.0007 rate = 0.07% MONTHLY (not annual)
- Quarterly client with 0.0025 rate = 0.25% QUARTERLY (not annual)
- Dashboard view and Summary page were incorrectly scaling ALL rates as if monthly
- SQL views now fixed to respect payment_schedule when calculating display rates
- Expected fee calculations were always correct (using raw rate × AUM)