## HWM 401k Payment Tracker 
This is a 401(k) payment management system built for Hohimer Wealth Management that runs as a Microsoft Teams tab, enabling internal staff to track client fee payments, monitor compliance status, and manage payment schedules. The architecture follows a clean three-tier design: a React frontend handles the user interface and authentication via Azure AD, a FastAPI backend manages all business logic including payment calculations and compliance tracking, and an Azure SQL database stores client contracts, payment history, and fee structures, etc. The app is designed for internal use only, leveraging Teams as the delivery platform while maintaining a straightforward deployment model with the frontend hosted on Azure Static Web Apps and the API on Azure App Service, ensuring both security through token-based authentication and ease of maintenance through clear separation of concerns. This is a small scale app for my company to use - not hyper enterprise app. Automatic identity for our company via Teams SSO / Entra ID

## This app has gone through refactoring hell. This time, we are doing it the normal clean way. See the chaos here from the most recent old version (there have been many prior itterations as well but this one is decent reference): 
* OLD_CODE_INSPO\BACKEND_COMPLEX.txt 
* OLD_CODE_INSPO\FRONTEND_COMPLEX.txt 

## How to use the old code effectively:
When reading the old codebase, think of it as an archaeological dig — you're looking for the business logic artifacts buried under layers of Teams Toolkit sediment. Extract ONLY the pure logic: payment calculations, compliance rules, SQL queries, and data shapes. Ignore all the scaffolding, Teams Toolkit patterns, and deployment configurations.
The old code will try to convince you that you need Functions, TeamsFX, complex middleware, and multiple deployment targets. You don't. Every time you see a Teams Toolkit pattern, ask yourself: "What is this actually doing?" The answer is usually something straightforward that got wrapped in unnecessary abstractions.
Copy the SQL queries, the payment period logic, the compliance calculations, and the data transformation functions. Leave behind everything else. If the old code has complex routing, replace it with simple FastAPI endpoints. If it has elaborate deployment scripts, replace them with "deploy frontend to Static Web App, backend to App Service."
For the UI: Extract the visual design patterns, component layouts, and user flows — these are good and should be preserved. The actual React components can be modernized if you see an opportunity but not needed, but the design language and UX decisions were made for good reasons. Keep the Tailwind classes, the color schemes, the dashboard layouts, and the table structures. Just rebuild as needed to be cleaner.
Remember: The complexity wasn't necessary — it was accumulated. Your job is to extract the gold (business logic and proven UI patterns) and leave the dirt (framework bloat) behind. Focus on what the code does, not how Teams Toolkit made you do it.

**🚨 NEW WITH DATABASE CHANGES: The old code has tons of date string manipulation (parseISO, date formatting, string splitting) because dates were stored as nvarchar(50). Now with proper DATE columns, all that string handling can be deleted. SQL can now use DATEPART and DATEDIFF directly, and the frontend receives proper ISO dates automatically.**

**🚨 NEW WITH DATABASE CHANGES: The old code has an entire Azure Function folder (`calculations`) just for variance calculations. With the new `payment_variance_view`, that entire function and its endpoint can be deleted. The frontend's `calculateVariance()` function also becomes obsolete.**

**🚨 NEW WITH DATABASE CHANGES: The old code repeatedly JOINs clients with contracts and metrics in every query. The new `clients_by_provider_view` eliminates these redundant JOINs. The frontend's client-side provider grouping logic can also be removed.**

**🚨 NEW WITH DATABASE CHANGES: All file handling code can be deleted - no more OneDrive integration, file upload endpoints, document management UI, file-to-payment linking logic, or file path validation. The entire `files` Azure Function folder and related frontend components are obsolete.**

**🚨 NEW WITH DATABASE CHANGES: The 150+ lines of period generation code (calculating quarter boundaries, month names, date ranges) can be deleted. The `payment_periods` table has all periods pre-populated through 2030. The frontend's `generatePeriods()` and related date math functions are no longer needed.**

**🚨 NEW WITH DATABASE CHANGES: Manual client metrics updates throughout the codebase can be removed. The `update_client_metrics_after_payment` trigger automatically maintains last payment info, YTD totals, and quarterly averages. No more scattered UPDATE statements after payment inserts.**

**🚨 NEW WITH DATABASE CHANGES: The CHECK constraint on `payments.applied_period` enforces valid ranges at the database level. All frontend and backend validation for period ranges (1-12 for monthly, 1-4 for quarterly) can be removed. Invalid data is now impossible to insert.**

**🚨 NEW WITH DATABASE CHANGES: The new composite index on payments `(client_id, applied_year, applied_period)` with INCLUDE columns makes payment lookups instant. All the manual query optimization, caching logic, and workarounds for slow payment queries can be deleted.**

=================

**Languages & Frameworks**
- TypeScript
- React 19.1
- Vite 6.3.5
- Python 3.12
- FastAPI
**Styling & UI**
- Tailwind CSS 3.5
**Authentication**
- @azure/msal-browser
**Backend Dependencies**
- uvicorn[standard]
- pyodbc
- pydantic
- python-jose (JWT token validation)
**Build & Deployment**
- Frontend: Azure Static Web App (Vite build → dist/)
- Backend: Azure App Service
- Database: Azure SQL Database
**Project Structure**
```
/hohimer-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── auth/
│   │   └── api/
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   ├── models/
│   │   ├── database.py
│   │   └── main.py
│   └── requirements.txt
└── teams-manifest/
    └── manifest.json
```
**TypeScript Config**
- Vite path aliases (@/* → ./src/*)

=================

## Key Business Logic

### Payment Tracking

- Payments are recorded **after** they're received (checks in hand)
- Each payment applies to a **single period** (Q1-Q4 or months 1-12)
- Payments can be applied retroactively to any unpaid period
- **🚨 REMOVED FROM OLD CODE: Split payment functionality where one payment could cover multiple periods. Now each payment = one period only**
- **🚨 NEW WITH DATABASE CHANGES: The database now enforces period validation with CHECK constraints (1-12 for monthly, 1-4 for quarterly). The old code had to validate this in Python/JavaScript - now it's guaranteed at the database level.**

### Fee Calculations

- All fees in the database are already adjusted for payment frequency
- Annual rates are pre-divided by 4 (quarterly) or 12 (monthly) based on the contract's payment frequency
- Two fee types: `flat` (fixed dollar amount) or `percentage` (% of AUM)
- Expected fees auto-calculate based on contract terms
- **🚨 NEW WITH DATABASE CHANGES: The old code recalculates expected fees in multiple places (backend payments endpoint, frontend payment form). With proper database views, this calculation happens once in SQL and is consistent everywhere.**

### Payment Status

- **🚨 SIMPLIFIED FROM OLD CODE: Single status system replacing separate "compliance" and "payment status" tracking. No longer tracks overdue periods or payment history. Only focuses on whether the CURRENT PERIOD is paid. Status resets to "Due" when a new period begins**
- Binary status: **Paid** (green) or **Due** (yellow)
- affects the color tag on the client sidebar as well as the compliance card. 
- **🚨 REMOVED FROM OLD CODE: Red/overdue status and overdue_periods array. No cumulative debt tracking**
- "Current period" = one period back from today (payments in arrears)
  - Example: if today is 03/25/2025: Monthly applied period = Feb 2025, Quarterly applied period = Q4 2024
- **🚨 NEW BEHAVIOR: Status automatically resets each period based on payment schedule - no carryover of unpaid periods**
- **🚨 NEW WITH DATABASE CHANGES: The `client_payment_status` view now calculates this in SQL using proper date math instead of string manipulation. The old code had complex Python logic to determine current periods - now it's a simple view query.**

### Available Periods

- Payment form only shows periods from earliest payment up to previous period
- Enforces arrears logic - can't record payments for current/future periods
- If no payment history, defaults to start of current year
- **🚨 SIMPLIFIED FROM OLD CODE: Removed complex period range calculations for split payments**
- **🚨 NEW WITH DATABASE CHANGES: The old code generates periods on-the-fly with 150+ lines of Python. With the new `payment_periods` table (pre-populated 2015-2030), it's a simple JOIN to find unpaid periods. The period generation logic can be deleted.**

=================

## Frontend Component User Experience

### Sidebar
* Lists all clients with payment status indicators
* **🚨 SIMPLIFIED FROM OLD CODE: Only shows green (paid) or yellow (due) - removed red/overdue status**
* Click client to load their payment dashboard
* Search bar filters clients by name or provider
* Toggle to group clients by provider
* Currently selected client is highlighted
* **🚨 NEW WITH DATABASE CHANGES: The old code groups clients by provider in JavaScript. The new `clients_by_provider_view` provides this grouping from SQL, so the frontend grouping logic can be simplified to just display pre-grouped data.**

### Main Dashboard (after selecting client)
* Shows client name at top with document viewer toggle button
* Three info cards display contract details, payment information, and payment status
* Contract card shows provider, payment schedule, fee type and amount
* Payment info shows AUM, expected fee, last payment details, current period
* **🚨 SIMPLIFIED FROM OLD CODE: Status card only shows if current period is paid/due - removed overdue periods list and compliance tracking**
* **🚨 NEW WITH DATABASE CHANGES: The old code makes multiple API calls to gather dashboard data. With improved views and the new index, this can be a single efficient query.**

### Payment Form
* Record new payments or edit existing ones
* Enter received date, payment amount, AUM, payment method, notes
* **🚨 SIMPLIFIED FROM OLD CODE: Single period dropdown - removed split payment toggle and end period selection**
* Select which period the payment applies to
* Shows expected fee calculation based on contract
* Clear form or cancel edit buttons
* **🚨 NEW WITH DATABASE CHANGES: Date picker no longer needs string manipulation (`toISOString().split('T')[0]`). The date field accepts and returns proper dates. Period dropdown loads instantly from the `payment_periods` table instead of expensive generation.**

### Payment History Table
* Lists all payments with date, provider, applied period, amounts, variance
* **🚨 SIMPLIFIED FROM OLD CODE: Removed expand button for split payments - each row is one period**
* Edit button loads payment into form above
* Delete button with confirmation dialog
* File icon opens document viewer (UI only - no backend functionality)
* Filter by year dropdown
* Pagination controls
* **🚨 NEW WITH DATABASE CHANGES: The old code calculates variance client-side for every row. The new `payment_variance_view` provides variance_amount, variance_percent, and variance_status directly from SQL. No more JavaScript variance calculations.**
* **🚨 NEW WITH DATABASE CHANGES: With the new composite index on (client_id, applied_year, applied_period), payment history queries are 10-100x faster, especially when filtering by year.**

### Document Viewer
* Opens as right panel when toggled
* PDF viewer interface with zoom and page controls
* File selection tabs for multiple documents
* **🚨 NOTE: Currently UI mockup only - no actual file loading implemented**
* Close button returns to full-width view

=================

AZURE DB = 
SQL_CONNECTION_STRING=Server=tcp:hohimerpro-db-server.database.windows.net,1433;Initial Catalog=HohimerPro-401k;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;Authentication="Active Directory Default";
SQL_SERVER=hohimerpro-db-server.database.windows.net
SQL_DATABASE=HohimerPro-401k
SQL_AUTH=ActiveDirectory

# DATABASE SCHEMA:

[See DB_SCHEMA_REFERENCE.txt for full schema]
-- TABLES
-- **🚨 REMOVED: client_files table (entire table removed)**
-- **🚨 REMOVED: payment_files table (entire table removed)**
-- client_metrics: id(int IDENTITY PK), client_id(int FK->clients UNIQUE), last_payment_date(date), last_payment_amount(float), total_ytd_payments(float), avg_quarterly_payment(float), last_recorded_assets(float), last_updated(datetime), next_payment_due(date)
-- clients: client_id(int IDENTITY PK), display_name(nvarchar255), full_name(nvarchar255), ima_signed_date(date), valid_from(datetime def:getdate()), valid_to(datetime)
-- **🚨 REMOVED: onedrive_folder_path column from clients table**
-- contacts: contact_id(int IDENTITY PK), client_id(int FK->clients), contact_type(nvarchar50), contact_name(nvarchar255), phone(nvarchar50), email(nvarchar255), fax(nvarchar50), physical_address(nvarchar500), mailing_address(nvarchar500), valid_from(datetime def:getdate()), valid_to(datetime)
-- contracts: contract_id(int IDENTITY PK), client_id(int FK->clients), contract_number(nvarchar100), provider_name(nvarchar255), contract_start_date(date), fee_type(nvarchar50), percent_rate(float), flat_rate(float), payment_schedule(nvarchar50), num_people(int), notes(nvarcharMAX), valid_from(datetime def:getdate()), valid_to(datetime)
-- payment_periods: period_type(nvarchar10 CHK:quarterly|monthly), year(int), period(int), period_name(nvarchar50), start_date(date), end_date(date), is_current(bit def:0), PK(period_type,year,period)
-- **🚨 Pre-populated with all periods 2015-2030. Replaces 150+ lines of period generation code.**
-- payments: payment_id(int IDENTITY PK), contract_id(int FK->contracts), client_id(int FK->clients), received_date(date), total_assets(float), expected_fee(float), actual_fee(float), method(nvarchar50), notes(nvarcharMAX), valid_from(datetime def:getdate()), valid_to(datetime), applied_period_type(nvarchar10), applied_period(int), applied_year(int), CHK(applied_period ranges)
-- **🚨 CHECK constraint enforces valid period ranges (monthly 1-12, quarterly 1-4).**
-- quarterly_summaries: id(int IDENTITY PK), client_id(int FK->clients), year(int), quarter(int), total_payments(float), total_assets(float), payment_count(int), avg_payment(float), expected_total(float), last_updated(datetime)
-- yearly_summaries: id(int IDENTITY PK), client_id(int FK->clients), year(int), total_payments(float), total_assets(float), payment_count(int), avg_payment(float), yoy_growth(float), last_updated(datetime)

[See DB_SCHEMA_REFERENCE.txt for full schema]
-- VIEWS
-- **🚨 REMOVED: payment_file_view (entire view removed - was showing payment-to-file relationships)**
-- client_payment_status: Shows payment status (Due/Paid) based on current period, includes expected fees calc, joins clients+contracts+metrics
-- clients_by_provider_view: Joins clients+contracts+metrics+payment_status, adds compliance_status(green/yellow)
-- **🚨 This view eliminates repetitive JOINs in every client query**
-- **🚨 UPDATED: Removed onedrive_folder_path from view definition**
-- payment_variance_view: Calculates variance_amount/percent, variance_status(exact/acceptable/warning/alert)
-- **🚨 This view replaces complex variance calculation logic in application code**

[See DB_SCHEMA_REFERENCE.txt for full schema]
-- INDEXES
-- client_metrics: lookup(client_id), UQ(client_id)
-- contacts: client_id, type(client_id,contact_type)
-- contracts: client_id, provider(provider_name)
-- payment_periods: dates(period_type,start_date,end_date)
-- payments: client_id, contract_id, date(client_id,received_date), period_lookup(client_id,applied_year,applied_period INCLUDE actual_fee,expected_fee,total_assets,received_date)
-- **🚨 The composite index with INCLUDE columns makes payment period lookups 10-100x faster**
-- quarterly_summaries: lookup(client_id,year,quarter), UQ(client_id,year,quarter)
-- yearly_summaries: lookup(client_id,year), UQ(client_id,year)

[See DB_SCHEMA_REFERENCE.txt for full schema]
-- TRIGGERS
-- update_client_metrics_after_payment: ON payments AFTER INSERT/UPDATE/DELETE -> Updates client_metrics (last payment info, YTD totals, quarterly avg)
-- update_quarterly_after_payment: ON payments AFTER INSERT -> MERGE quarterly_summaries (aggregates by quarter for quarterly payments only)
-- update_yearly_after_quarterly: ON quarterly_summaries AFTER INSERT -> MERGE yearly_summaries (aggregates by year)


=================

The frontend expects:

**Client Information**
- Identification details including display names, full legal entity names, service provider associations, agreement signing dates, and active/inactive status periods
- **🚨 NEW WITH DATABASE CHANGES: The `clients_by_provider_view` now provides all client data with provider info pre-joined, eliminating multiple API calls**
**Contract Details**
- Contract identification with associated client relationships, provider company names, fee structure types (flat amount vs percentage-based), payment frequency schedules (monthly vs quarterly), contract reference numbers, and active contract periods
**Payment Records**
- Payment tracking information including identification, received dates, total assets under management values, actual vs expected payment amounts, payment methods used (ACH, check, wire, etc.), applicable time periods (specific month/quarter and year), associated notes, and document attachment indicators
- **🚨 NEW WITH DATABASE CHANGES: The `payment_variance_view` adds variance calculations directly to payment records, no frontend math needed**
**Dashboard Summary Information**
- Current payment status (paid or due), compliance status with color indicators, recent payment history, year-to-date payment totals, average payment metrics, most recent asset values, and current billing period details
- **🚨 NEW WITH DATABASE CHANGES: With proper date columns and the improved index, dashboard queries that aggregate payment data are significantly faster**
**Available Periods**
- Selectable payment periods with formatted labels and payment schedule context
- **🚨 NEW WITH DATABASE CHANGES: Instead of generating periods on-the-fly, a simple query against `payment_periods` LEFT JOIN existing payments provides instant results**
**Variance Calculations**
- Comparison results between expected and actual payments, status categorizations for payment differences, and percentage/dollar variance amounts
- **🚨 NEW WITH DATABASE CHANGES: All variance logic moves from application code to the `payment_variance_view`, ensuring consistency and eliminating the `/api/calculations/variance` endpoint entirely**
This information supports displaying client lists with status indicators, recording payments, viewing payment histories, monitoring compliance, calculating fee references, and providing search/filter capabilities across the financial data.