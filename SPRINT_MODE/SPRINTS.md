# SPRINT MODE - 401k Payment Tracker Migration Sprints

# Check /OLD_CODE_INSPO for the existing app code (two monolithic combo files). The new implementation needs identical UI/UX - same layout, same style, verbatim - but adapted for the updated architecture. The Azure SQL DB simplifications make this migration cleaner, but you're not building from scratch. You're refactoring FRONTEND_COMPLEX.txt to fit the new requirements, with backend adjustments to match. Read every line of the old code before starting - understand what exists, then bridge to what's needed. LEARN WHAT THIS NEW APP CHANGES ARE BY READING CLAUDE_README.md 


# ALL SUBAGENTS MUST READ THE FOLLOWING FILES, IN THIS ORDER, PRIOR TO WRITING ANY CODE OR LOGGING ANY JOURNAL ENTRIES:
1. SPRINT_MODE\subagent_welcome.md
2. SPRINT_MODE\SPRINTS.md
3. CLAUDE_README.md
4. OLD_CODE_INSPO\BACKEND_COMPLEX.txt
5. OLD_CODE_INSPO\FRONTEND_COMPLEX.txt
6. CLAUDE_JOURNAL.md


## 🚨 CRITICAL: DATABASE IS ALREADY CONFIGURED 🚨
**THE AZURE SQL DATABASE HAS BEEN FULLY UPDATED WITH ALL MODIFICATIONS.**
- ✅ All new tables (payment_periods, etc.) are ALREADY CREATED
- ✅ All views (payment_variance_view, clients_by_provider_view, etc.) are ALREADY CREATED  
- ✅ All indexes are ALREADY APPLIED
- ✅ All DATE column conversions are ALREADY COMPLETE
- ✅ All CHECK constraints are ALREADY IN PLACE
- ✅ The payment_periods table is ALREADY POPULATED (2015-2030)

**AGENTS MUST NOT MODIFY THE AZURE SQL DATABASE STRUCTURE IN ANY WAY!**

## Overview
This document contains the comprehensive sprint plan for migrating the 401k Payment Tracker from the complex Teams Toolkit/Azure Functions architecture to a clean React/FastAPI architecture. Each sprint has specific objectives, context from old code, and validation criteria.

**Note:** The database improvements mentioned throughout these sprints are for context only - they have already been implemented. Focus on using the existing database structure, not modifying it.

---

## SPRINT 1: Foundation & Project Setup
**Objective:** Set up project foundation and connect to the EXISTING database structure

### Context from Old Code:
- Backend has complex date string manipulation (parseISO, toISOString().split('T')[0])
- periods/__init__.py has 150+ lines generating periods on-the-fly
- calculations/__init__.py is an entire Azure Function just for variance calculations
- Repetitive JOINs in every client query

### Tasks:
1. Initialize clean project structure:
   - `/frontend` - React with Vite
   - `/backend` - FastAPI
   - `/teams-manifest` - Simple Teams manifest
   - Remove all Teams Toolkit configuration files

2. Connect to EXISTING database (DO NOT MODIFY):
   - Database already has `payment_periods` table (populated 2015-2030)
   - Database already has `payment_variance_view` 
   - Database already has `clients_by_provider_view`
   - Database already has composite index: `idx_payments_period_lookup`
   - All DATE columns are already proper DATE type
   - CHECK constraints are already in place

3. Set up backend foundation:
   - FastAPI app structure with proper routing
   - Database connection using pyodbc + Azure AD auth
   - Pydantic models matching EXISTING schema
   - CORS configuration for Teams
   - Create `.env.example` with template:
     ```
     AZURE_SQL_CONNECTION_STRING=Driver={ODBC Driver 18 for SQL Server};Server=your-server.database.windows.net;Database=your-db;Authentication=ActiveDirectoryDefault;
     ```
   - Standardized error response format:
     ```python
     {"error": {"code": "ERROR_CODE", "message": "Human readable message"}}
     ```

### Validation:
- Can query EXISTING database views successfully
- FastAPI server starts successfully
- Can connect to Azure SQL with proper auth
- Pydantic models match EXISTING database schema

---

## SPRINT 2: Core API Endpoints - Clients & Contracts
**Objective:** Implement essential client and contract endpoints using new database views

### Context from Old Code:
- clients/__init__.py has complex manual JOINs that `clients_by_provider_view` eliminates
- Frontend groups clients by provider in JavaScript - now handled by view
- Contract endpoints duplicate client JOINs

### Tasks:
1. Implement client endpoints:
   - GET /api/clients - Use `clients_by_provider_view` (no manual JOINs!)
   - GET /api/clients/{id} - Single client with contract info
   - POST/PUT/DELETE /api/clients - CRUD operations

2. Implement contract endpoints:
   - GET /api/contracts/client/{client_id}
   - POST/PUT /api/contracts
   - Ensure soft deletes (valid_to timestamps)

3. Add proper error handling and validation

### Validation:
- Client list includes compliance_status from view
- No manual provider grouping needed
- Contract operations maintain referential integrity
- Soft deletes work correctly

---

## SPRINT 3: Payment Management & Smart Periods
**Objective:** Implement payment CRUD with simplified period logic

### Context from Old Code:
- periods/__init__.py generates periods dynamically (150+ lines)
- Split payment functionality removed - each payment = one period
- payments/__init__.py has complex expected fee calculations

### Tasks:
1. Implement payment endpoints:
   - GET /api/payments?client_id={id} - Use `payment_variance_view` for variance
   - POST /api/payments - Single period only
   - PUT/DELETE /api/payments
   - Remove ANY split payment logic
   - **CRITICAL**: Expected fee calculations MUST use SQL views ONLY
   - **NO** Python calculations for expected fees or variance
   - **NO** JavaScript calculations in frontend

2. Implement smart periods endpoint:
   - GET /api/periods - Simple JOIN against `payment_periods` table
   - Return only unpaid periods
   - No dynamic generation - just query the table!

3. Database triggers ALREADY handle metrics updates automatically

### Validation:
- Variance calculations come from view (not computed)
- Period dropdown loads instantly
- Each payment applies to exactly one period
- Triggers update client_metrics automatically

---

## SPRINT 4: Dashboard & Payment Status
**Objective:** Implement unified dashboard endpoint using optimized views

### Context from Old Code:
- dashboard/__init__.py makes multiple queries
- Complex current period calculations in Python
- Frontend calculates variance for each payment row

### Tasks:
1. Create dashboard endpoint:
   - GET /api/dashboard/{client_id}
   - Single query using views + new index
   - Return complete dashboard data structure

2. Leverage `client_payment_status` view:
   - Current period calculation in SQL
   - Binary status: Paid or Due (no red/overdue)
   - Expected fee from view

3. Remove calculations endpoint entirely:
   - Delete /api/calculations/variance
   - Variance comes from `payment_variance_view`

### Validation:
- Dashboard loads with single API call
- No client-side variance calculations
- Status is binary (green/yellow only)
- Fast query performance with new index

---

## SPRINT 5: Authentication & Teams Integration
**Objective:** Implement Azure AD authentication and Teams SSO

### Context from Old Code:
- Complex Teams Toolkit auth wrappers
- app.ts has Express server for Teams tab hosting

### Tasks:
1. Backend authentication:
   - JWT validation middleware
   - Azure AD token verification
   - Extract user context from Teams

2. Frontend authentication:
   - MSAL.js for Teams SSO
   - Silent token acquisition
   - Auth context/hooks

3. Simple Teams manifest:
   - Static tab configuration
   - No Teams Toolkit complexity
   - Direct URLs to frontend
   - Complete `manifest.json` structure:
     ```json
     {
       "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
       "manifestVersion": "1.16",
       "version": "1.0.0",
       "id": "<unique-guid>",
       "packageName": "com.company.401ktracker",
       "developer": {...},
       "name": {"short": "401k Tracker", "full": "401k Payment Tracker"},
       "description": {...},
       "icons": {...},
       "accentColor": "#0078D4",
       "staticTabs": [{
         "entityId": "401k-tracker-tab",
         "name": "401k Tracker",
         "contentUrl": "https://your-frontend-url.com",
         "scopes": ["personal"]
       }],
       "permissions": ["identity", "messageTeamMembers"],
       "validDomains": ["your-frontend-url.com", "your-api-url.com"]
     }
     ```

### Validation:
- SSO works within Teams
- API endpoints require valid tokens
- User context available in requests
- Clean manifest without toolkit noise

---

## SPRINT 6: Frontend Foundation & Routing
**Objective:** Set up React frontend with clean architecture

### Context from Old Code:
- Components use Zustand for state
- Tailwind CSS with custom design system
- LaunchMenu for module selection
- Document viewer is UI-only placeholder

### Tasks:
1. Initialize React with Vite:
   - TypeScript configuration
   - Path aliases (@/*)
   - Tailwind CSS setup

2. Core routing and layout:
   - React Router setup
   - PageLayout component
   - Header navigation
   - LaunchMenu (only Payments enabled)

3. Global state with Zustand:
   - Selected client state
   - Document viewer toggle
   - API base configuration

### Validation:
- Vite dev server runs
- Routing works correctly
- Tailwind styles apply
- State management functional

---

## SPRINT 7: Client Management UI
**Objective:** Implement sidebar and client selection

### Context from Old Code:
- Sidebar groups by provider (toggle feature)
- Binary status indicators (green/yellow)
- Client search with dropdown
- Selected client highlighting

### Tasks:
1. Implement Sidebar component:
   - Client list from API
   - Provider grouping toggle
   - Status indicators (no red!)
   - Search functionality

2. Client state management:
   - Selected client in Zustand
   - Client data fetching hooks
   - Loading states

3. Responsive design:
   - Mobile-friendly sidebar
   - Proper overflow handling

### Validation:
- Clients load and display correctly
- Search filters work
- Provider grouping toggles
- Status shows green/yellow only

---

## SPRINT 8: Dashboard Cards Implementation
**Objective:** Build the three dashboard cards using new data structure

### Context from Old Code:
- ContractCard shows fee details
- PaymentInfoCard shows metrics
- ComplianceCard simplified (no overdue tracking)
- Cards responsive to document viewer

### Tasks:
1. Implement dashboard cards:
   - ContractCard with fee display
   - PaymentInfoCard with YTD/metrics
   - ComplianceCard (binary status)

2. Use dashboard API data:
   - Single API call for all cards
   - No client-side calculations
   - Fee reference display

3. Responsive layout:
   - Adjust grid when document viewer open
   - Loading skeletons
   - Error states

### Validation:
- Cards display correct data
- Layout adjusts with document viewer
- No variance calculations in frontend
- Binary compliance status only

---

## SPRINT 9: Payment Form & History
**Objective:** Implement payment recording and history display

### Context from Old Code:
- PaymentForm has complex state management
- Split payment UI removed completely
- Payment history shows variance from API
- Edit/delete functionality

### Tasks:
1. Payment form implementation:
   - Single period dropdown (from periods API)
   - Form validation
   - Edit mode for existing payments
   - NO split payment UI elements

2. Payment history table:
   - Variance from API (not calculated)
   - Edit/delete buttons
   - Year filter
   - Pagination

3. Form state management:
   - Dirty form detection
   - Validation errors
   - Submit handling

### Validation:
- Can create new payments
- Period dropdown shows correct options
- Variance displays without calculation
- Edit/update works correctly

---

## SPRINT 10: Final Integration & Cleanup
**Objective:** Complete integration, remove old code artifacts, and validate migration

### Context from Old Code:
- Document viewer stays as placeholder
- Remove all Teams Toolkit artifacts
- Ensure no Azure Functions dependencies
- Clean up any split payment remnants

### Tasks:
1. Final cleanup:
   - Remove all Teams Toolkit config
   - Delete Azure Functions folders
   - Remove split payment code/UI
   - Clean package.json dependencies

2. Integration testing:
   - Full user flow testing
   - Performance validation
   - Error handling verification

3. Deployment preparation:
   - Environment variables
   - Build configuration
   - Deployment scripts (simple!)

4. Documentation updates:
   - Update README with new architecture
   - Deployment instructions
   - Remove old code references

### Validation:
- No Teams Toolkit dependencies remain
- All features work end-to-end
- Performance improved (especially periods)
- Clean, maintainable codebase

---

## Key Migration Principles (Reference for All Sprints)

1. **Simplification First**: Remove complexity, don't port it
2. **Trust the Database**: Use views, indexes, and proper data types
3. **Single Source of Truth**: Calculate once (in SQL), display everywhere
4. **Binary Status**: Only green (paid) or yellow (due) - no red/overdue
5. **No Split Payments**: One payment = one period, always
6. **Clean Architecture**: React + FastAPI + SQL, no middleware magic
7. **Performance**: Leverage new indexes and views for speed
8. **Maintainability**: Clear file structure, obvious patterns
9. **Date Handling**: 
   - Database columns are proper DATE type (not strings)
   - API communication uses ISO format (YYYY-MM-DD)
   - NO string manipulation for dates (no split('T')[0])
   - Let database handle date comparisons and calculations

## Success Metrics

- Period dropdown loads in <100ms (was 1-2 seconds)
- Dashboard loads with 1 API call (was 3-4)
- No client-side variance calculations
- No string date manipulation
- Codebase 50% smaller
- Zero Teams Toolkit dependencies