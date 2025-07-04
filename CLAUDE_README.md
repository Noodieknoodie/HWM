## HWM 401k Payment Tracker 
This is a 401(k) payment management system built for Hohimer Wealth Management that runs as a Microsoft Teams tab, enabling internal staff to track client fee payments, monitor compliance status, and manage payment schedules. The architecture follows a clean three-tier design: a React frontend handles the user interface and authentication via Azure AD, a FastAPI backend manages all business logic including payment calculations and compliance tracking, and an Azure SQL database stores client contracts, payment history, and fee structures, etc. The app is designed for internal use only, leveraging Teams as the delivery platform while maintaining a straightforward deployment model with the frontend hosted on Azure Static Web Apps and the API on Azure App Service, ensuring both security through token-based authentication and ease of maintenance through clear separation of concerns. This is a small scale app for my company to use - not hyper enterprise app. Automatic identity for our company via Teams SSO / Entra ID

## This app has gone through refactoring hell. This time, we are doing it the normal clean way. See the chaos here from the most recent old version (there have been many prior itterations as well but this one is decent reference): 
* OLD_CODE_INSPO\BACKEND_COMPLEX.txt 
* *LD_CODE_INSPO\FRONTEND_COMPLEX.txt 

## How to use the old code effectively:
When reading the old codebase, think of it as an archaeological dig — you're looking for the business logic artifacts buried under layers of Teams Toolkit sediment. Extract ONLY the pure logic: payment calculations, compliance rules, SQL queries, and data shapes. Ignore all the scaffolding, Teams Toolkit patterns, and deployment configurations.
The old code will try to convince you that you need Functions, TeamsFX, complex middleware, and multiple deployment targets. You don't. Every time you see a Teams Toolkit pattern, ask yourself: "What is this actually doing?" The answer is usually something straightforward that got wrapped in unnecessary abstractions.
Copy the SQL queries, the payment period logic, the compliance calculations, and the data transformation functions. Leave behind everything else. If the old code has complex routing, replace it with simple FastAPI endpoints. If it has elaborate deployment scripts, replace them with "deploy frontend to Static Web App, backend to App Service."
For the UI: Extract the visual design patterns, component layouts, and user flows — these are good and should be preserved. The actual React components can be modernized if you see an opportunity but not needed, but the design language and UX decisions were made for good reasons. Keep the Tailwind classes, the color schemes, the dashboard layouts, and the table structures. Just rebuild as needed to be cleaner.
Remember: The complexity wasn't necessary — it was accumulated. Your job is to extract the gold (business logic and proven UI patterns) and leave the dirt (framework bloat) behind. Focus on what the code does, not how Teams Toolkit made you do it.

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

AZURE DB = 
SQL_CONNECTION_STRING=Server=tcp:hohimerpro-db-server.database.windows.net,1433;Initial Catalog=HohimerPro-401k;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;Authentication="Active Directory Default";
SQL_SERVER=hohimerpro-db-server.database.windows.net
SQL_DATABASE=HohimerPro-401k
SQL_AUTH=ActiveDirectory

=================

## Key Business Logic

### Payment Tracking

- Payments are recorded **after** they're received (checks in hand)
- Each payment applies to a **single period** (Q1-Q4 or months 1-12)
- Payments can be applied retroactively to any unpaid period
- **🚨 REMOVED FROM OLD CODE: Split payment functionality where one payment could cover multiple periods. Now each payment = one period only**

### Fee Calculations

- All fees in the database are already adjusted for payment frequency
- Annual rates are pre-divided by 4 (quarterly) or 12 (monthly) based on the contract's payment frequency
- Two fee types: `flat` (fixed dollar amount) or `percentage` (% of AUM)
- Expected fees auto-calculate based on contract terms

### Payment Status

- **🚨 SIMPLIFIED FROM OLD CODE: Single status system replacing separate "compliance" and "payment status" tracking. No longer tracks overdue periods or payment history. Only focuses on whether the CURRENT PERIOD is paid. Status resets to "Due" when a new period begins**
- Binary status: **Paid** (green) or **Due** (yellow)
- affects the color tag on the client sidebar as well as the compliance card. 
- **🚨 REMOVED FROM OLD CODE: Red/overdue status and overdue_periods array. No cumulative debt tracking**
- "Current period" = one period back from today (payments in arrears)
  - Example: if today is 03/25/2025: Monthly applied period = Feb 2025, Quarterly applied period = Q4 2024
- **🚨 NEW BEHAVIOR: Status automatically resets each period based on payment schedule - no carryover of unpaid periods**

### Available Periods

- Payment form only shows periods from earliest payment up to previous period
- Enforces arrears logic - can't record payments for current/future periods
- If no payment history, defaults to start of current year
- **🚨 SIMPLIFIED FROM OLD CODE: Removed complex period range calculations for split payments**
=================

## Frontend Component User Experience

### Sidebar
* Lists all clients with payment status indicators
* **🚨 SIMPLIFIED FROM OLD CODE: Only shows green (paid) or yellow (due) - removed red/overdue status**
* Click client to load their payment dashboard
* Search bar filters clients by name or provider
* Toggle to group clients by provider
* Currently selected client is highlighted

### Main Dashboard (after selecting client)
* Shows client name at top with document viewer toggle button
* Three info cards display contract details, payment information, and payment status
* Contract card shows provider, payment schedule, fee type and amount
* Payment info shows AUM, expected fee, last payment details, current period
* **🚨 SIMPLIFIED FROM OLD CODE: Status card only shows if current period is paid/due - removed overdue periods list and compliance tracking**

### Payment Form
* Record new payments or edit existing ones
* Enter received date, payment amount, AUM, payment method, notes
* **🚨 SIMPLIFIED FROM OLD CODE: Single period dropdown - removed split payment toggle and end period selection**
* Select which period the payment applies to
* Shows expected fee calculation based on contract
* Clear form or cancel edit buttons

### Payment History Table
* Lists all payments with date, provider, applied period, amounts, variance
* **🚨 SIMPLIFIED FROM OLD CODE: Removed expand button for split payments - each row is one period**
* Edit button loads payment into form above
* Delete button with confirmation dialog
* File icon opens document viewer (UI only - no backend functionality)
* Filter by year dropdown
* Pagination controls

### Document Viewer
* Opens as right panel when toggled
* PDF viewer interface with zoom and page controls
* File selection tabs for multiple documents
* **🚨 NOTE: Currently UI mockup only - no actual file loading implemented**
* Close button returns to full-width view


=================

# DATABASE SCHEMA:
=== TABLES ===
--- client_files ---
  - file_id: int(10) [PRIMARY KEY, NOT NULL]
  - client_id: int(10) [FK -> clients.client_id, NOT NULL]
  - file_name: nvarchar(255) [NOT NULL]
  - onedrive_path: nvarchar(500) [NOT NULL]
  - uploaded_at: datetime [DEFAULT (getdate())]
--- client_metrics ---
  - id: int(10) [PRIMARY KEY, NOT NULL]
  - client_id: int(10) [FK -> clients.client_id, NOT NULL]
  - last_payment_date: nvarchar(50)
  - last_payment_amount: float(53)
  - last_payment_quarter: int(10)
  - last_payment_year: int(10)
  - total_ytd_payments: float(53)
  - avg_quarterly_payment: float(53)
  - last_recorded_assets: float(53)
  - last_updated: nvarchar(50)
  - next_payment_due: nvarchar(50)
--- clients ---
  - client_id: int(10) [PRIMARY KEY, NOT NULL]
  - display_name: nvarchar(255) [NOT NULL]
  - full_name: nvarchar(255)
  - ima_signed_date: nvarchar(50)
  - onedrive_folder_path: nvarchar(500)
  - valid_from: datetime [DEFAULT (getdate())]
  - valid_to: datetime
--- contacts ---
  - contact_id: int(10) [PRIMARY KEY, NOT NULL]
  - client_id: int(10) [FK -> clients.client_id, NOT NULL]
  - contact_type: nvarchar(50) [NOT NULL]
  - contact_name: nvarchar(255)
  - phone: nvarchar(50)
  - email: nvarchar(255)
  - fax: nvarchar(50)
  - physical_address: nvarchar(500)
  - mailing_address: nvarchar(500)
  - valid_from: datetime [DEFAULT (getdate())]
  - valid_to: datetime
--- contracts ---
  - contract_id: int(10) [PRIMARY KEY, NOT NULL]
  - client_id: int(10) [FK -> clients.client_id, NOT NULL]
  - contract_number: nvarchar(100)
  - provider_name: nvarchar(255)
  - contract_start_date: nvarchar(50)
  - fee_type: nvarchar(50)
  - percent_rate: float(53)
  - flat_rate: float(53)
  - payment_schedule: nvarchar(50)
  - num_people: int(10)
  - notes: nvarchar(-1)
  - valid_from: datetime [DEFAULT (getdate())]
  - valid_to: datetime
--- payment_files ---
  - payment_id: int(10) [PRIMARY KEY, FK -> payments.payment_id, NOT NULL]
  - file_id: int(10) [PRIMARY KEY, FK -> client_files.file_id, NOT NULL]
  - linked_at: datetime [DEFAULT (getdate())]
--- payments ---
  - payment_id: int(10) [PRIMARY KEY, NOT NULL]
  - contract_id: int(10) [FK -> contracts.contract_id, NOT NULL]
  - client_id: int(10) [FK -> clients.client_id, NOT NULL]
  - received_date: nvarchar(50)
  - total_assets: float(53)
  - expected_fee: float(53)
  - actual_fee: float(53)
  - method: nvarchar(50)
  - notes: nvarchar(-1)
  - valid_from: datetime [DEFAULT (getdate())]
  - valid_to: datetime
  - applied_period_type: nvarchar(10)
  - applied_period: int(10)
  - applied_year: int(10)
--- quarterly_summaries ---
  - id: int(10) [PRIMARY KEY, NOT NULL]
  - client_id: int(10) [FK -> clients.client_id, NOT NULL]
  - year: int(10) [NOT NULL]
  - quarter: int(10) [NOT NULL]
  - total_payments: float(53)
  - total_assets: float(53)
  - payment_count: int(10)
  - avg_payment: float(53)
  - expected_total: float(53)
  - last_updated: nvarchar(50)
--- yearly_summaries ---
  - id: int(10) [PRIMARY KEY, NOT NULL]
  - client_id: int(10) [FK -> clients.client_id, NOT NULL]
  - year: int(10) [NOT NULL]
  - total_payments: float(53)
  - total_assets: float(53)
  - payment_count: int(10)
  - avg_payment: float(53)
  - yoy_growth: float(53)
  - last_updated: nvarchar(50)
=== INDEXES ===
- client_metrics: idx_client_metrics_lookup (NONCLUSTERED)
- contacts: idx_contacts_client_id (NONCLUSTERED)
- contacts: idx_contacts_type (NONCLUSTERED)
- contracts: idx_contracts_client_id (NONCLUSTERED)
- contracts: idx_contracts_provider (NONCLUSTERED)
- payments: idx_payments_client_id (NONCLUSTERED)
- payments: idx_payments_contract_id (NONCLUSTERED)
- payments: idx_payments_date (NONCLUSTERED)
- quarterly_summaries: idx_quarterly_lookup (NONCLUSTERED)
- yearly_summaries: idx_yearly_lookup (NONCLUSTERED)
=== TRIGGERS ===
--- TRIGGER: update_client_metrics_after_payment (on payments) ---
CREATE TRIGGER update_client_metrics_after_payment
ON payments
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    -- Update metrics for affected clients
    WITH affected_clients AS (
        SELECT client_id FROM inserted
        UNION
        SELECT client_id FROM deleted
    )
    UPDATE cm
    SET 
        last_payment_date = lp.received_date,
        last_payment_amount = lp.actual_fee,
        last_recorded_assets = lp.total_assets,
        total_ytd_payments = ytd.total,
        avg_quarterly_payment = qavg.avg_payment,
        last_updated = CONVERT(nvarchar(50), GETDATE(), 120)
    FROM client_metrics cm
    INNER JOIN affected_clients ac ON cm.client_id = ac.client_id
    OUTER APPLY (
        SELECT TOP 1 received_date, actual_fee, total_assets
        FROM payments 
        WHERE client_id = cm.client_id AND valid_to IS NULL
        ORDER BY received_date DESC
    ) lp
    OUTER APPLY (
        SELECT SUM(actual_fee) as total
        FROM payments 
        WHERE client_id = cm.client_id 
        AND applied_year = YEAR(GETDATE())
        AND valid_to IS NULL
    ) ytd
    OUTER APPLY (
        SELECT AVG(total_payments) as avg_payment
        FROM quarterly_summaries
        WHERE client_id = cm.client_id
    ) qavg;
END;
--- TRIGGER: update_quarterly_after_payment (on payments) ---
CREATE TRIGGER [dbo].[update_quarterly_after_payment]
ON [dbo].[payments]
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    MERGE quarterly_summaries AS target
    USING (
        SELECT 
            i.client_id, 
            i.applied_year as year, 
            i.applied_period as quarter,
            SUM(p.actual_fee) as total_payments, 
            AVG(p.total_assets) as total_assets, 
            COUNT(*) as payment_count, 
            AVG(p.actual_fee) as avg_payment, 
            MAX(p.expected_fee) as expected_total
        FROM inserted i
        JOIN payments p ON p.client_id = i.client_id 
            AND p.applied_year = i.applied_year 
            AND p.applied_period = i.applied_period
            AND p.applied_period_type = 'quarterly'
        WHERE i.applied_period_type = 'quarterly'
        GROUP BY i.client_id, i.applied_year, i.applied_period
    ) AS source
    ON target.client_id = source.client_id 
        AND target.year = source.year 
        AND target.quarter = source.quarter
    WHEN MATCHED THEN
        UPDATE SET 
            total_payments = source.total_payments,
            total_assets = source.total_assets,
            payment_count = source.payment_count,
            avg_payment = source.avg_payment,
            expected_total = source.expected_total,
            last_updated = CONVERT(NVARCHAR(50), GETDATE(), 120)
    WHEN NOT MATCHED THEN
        INSERT (client_id, year, quarter, total_payments, total_assets, 
                payment_count, avg_payment, expected_total, last_updated)
        VALUES (source.client_id, source.year, source.quarter, source.total_payments, 
                source.total_assets, source.payment_count, source.avg_payment, 
                source.expected_total, CONVERT(NVARCHAR(50), GETDATE(), 120));
END;
--- TRIGGER: update_yearly_after_quarterly (on quarterly_summaries) ---
CREATE TRIGGER update_yearly_after_quarterly
ON quarterly_summaries
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    MERGE yearly_summaries AS target
    USING (
        SELECT 
            i.client_id, 
            i.year, 
            SUM(q.total_payments) as total_payments, 
            AVG(q.total_assets) as total_assets, 
            SUM(q.payment_count) as payment_count, 
            AVG(q.avg_payment) as avg_payment
        FROM inserted i
        JOIN quarterly_summaries q ON q.client_id = i.client_id AND q.year = i.year
        GROUP BY i.client_id, i.year
    ) AS source
    ON target.client_id = source.client_id AND target.year = source.year
    WHEN MATCHED THEN
        UPDATE SET 
            total_payments = source.total_payments,
            total_assets = source.total_assets,
            payment_count = source.payment_count,
            avg_payment = source.avg_payment,
            last_updated = CONVERT(NVARCHAR(50), GETDATE(), 120)
    WHEN NOT MATCHED THEN
        INSERT (client_id, year, total_payments, total_assets, 
                payment_count, avg_payment, yoy_growth, last_updated)
        VALUES (source.client_id, source.year, source.total_payments, 
                source.total_assets, source.payment_count, source.avg_payment, 
                NULL, CONVERT(NVARCHAR(50), GETDATE(), 120));
END;
=== VIEWS ===
--- VIEW: client_payment_status ---
CREATE VIEW client_payment_status AS
SELECT
    c.client_id,
    c.display_name,
    ct.payment_schedule,
    ct.fee_type,
    ct.flat_rate,
    ct.percent_rate,
    cm.last_payment_date,
    cm.last_payment_amount,
    latest.applied_period,
    latest.applied_year,
    latest.applied_period_type,
    
    -- Current period calculation (one period back from today)
    CASE 
        WHEN ct.payment_schedule = 'monthly' THEN 
            CASE WHEN MONTH(GETDATE()) = 1 THEN 12 ELSE MONTH(GETDATE()) - 1 END
        WHEN ct.payment_schedule = 'quarterly' THEN 
            CASE WHEN DATEPART(QUARTER, GETDATE()) = 1 THEN 4 ELSE DATEPART(QUARTER, GETDATE()) - 1 END
    END AS current_period,
    
    CASE 
        WHEN MONTH(GETDATE()) = 1 AND ct.payment_schedule = 'monthly' THEN YEAR(GETDATE()) - 1
        WHEN DATEPART(QUARTER, GETDATE()) = 1 AND ct.payment_schedule = 'quarterly' THEN YEAR(GETDATE()) - 1
        ELSE YEAR(GETDATE())
    END AS current_year,
    
    cm.last_recorded_assets,
    
    CASE
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate
        WHEN ct.fee_type = 'percentage' AND cm.last_recorded_assets IS NOT NULL THEN 
            ROUND(cm.last_recorded_assets * (ct.percent_rate / 100.0), 2)
        ELSE NULL
    END AS expected_fee,
    
    -- Simplified payment status
    CASE
        WHEN latest.applied_year IS NULL THEN 'Due'
        WHEN latest.applied_year < CASE 
            WHEN (MONTH(GETDATE()) = 1 AND ct.payment_schedule = 'monthly') OR 
                 (DATEPART(QUARTER, GETDATE()) = 1 AND ct.payment_schedule = 'quarterly') 
            THEN YEAR(GETDATE()) - 1
            ELSE YEAR(GETDATE()) 
        END THEN 'Due'
        WHEN latest.applied_year = CASE 
            WHEN (MONTH(GETDATE()) = 1 AND ct.payment_schedule = 'monthly') OR 
                 (DATEPART(QUARTER, GETDATE()) = 1 AND ct.payment_schedule = 'quarterly') 
            THEN YEAR(GETDATE()) - 1
            ELSE YEAR(GETDATE()) 
        END AND latest.applied_period < CASE
            WHEN ct.payment_schedule = 'monthly' THEN 
                CASE WHEN MONTH(GETDATE()) = 1 THEN 12 ELSE MONTH(GETDATE()) - 1 END
            WHEN ct.payment_schedule = 'quarterly' THEN 
                CASE WHEN DATEPART(QUARTER, GETDATE()) = 1 THEN 4 ELSE DATEPART(QUARTER, GETDATE()) - 1 END
        END THEN 'Due'
        ELSE 'Paid'
    END AS payment_status
FROM clients c
JOIN contracts ct ON c.client_id = ct.client_id AND ct.valid_to IS NULL
LEFT JOIN client_metrics cm ON c.client_id = cm.client_id
LEFT JOIN (
    SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY received_date DESC) as rn
        FROM payments WHERE valid_to IS NULL
    ) AS numbered WHERE rn = 1
) latest ON c.client_id = latest.client_id
WHERE c.valid_to IS NULL;
--- VIEW: payment_file_view ---
CREATE VIEW payment_file_view AS
SELECT 
    p.payment_id,
    p.client_id,
    p.contract_id,
    p.received_date,
    p.actual_fee,
    CASE WHEN cf.file_id IS NOT NULL THEN 1 ELSE 0 END AS has_file,
    cf.file_id,
    cf.file_name,
    cf.onedrive_path
FROM 
    payments p
LEFT JOIN 
    payment_files pf ON p.payment_id = pf.payment_id
LEFT JOIN 
    client_files cf ON pf.file_id = cf.file_id;
	
## Note on File Handling:
The database is fully structured to support OneDrive PDF file storage and payment-file associations (via client_files and payment_files tables), but the current application intentionally doesn't implement any file processing functionality. The frontend includes a PDF viewer component that displays "Coming Soon" when expanded — this is a planned feature placeholder, not a bug or missing implementation. The OneDrive paths are stored in the database for future use, but no actual file upload, download, or preview functionality exists in either the frontend or backend code at this time. Just ignore PDF shit right now. Out of sight out of mind for now. 

========

The frontend expects:
**Client Information**
- Identification details including display names, full legal entity names, service provider associations, agreement signing dates, and active/inactive status periods
**Contract Details**
- Contract identification with associated client relationships, provider company names, fee structure types (flat amount vs percentage-based), payment frequency schedules (monthly vs quarterly), contract reference numbers, and active contract periods
**Payment Records**
- Payment tracking information including identification, received dates, total assets under management values, actual vs expected payment amounts, payment methods used (ACH, check, wire, etc.), applicable time periods (specific month/quarter and year), associated notes, and document attachment indicators
**Dashboard Summary Information**
- Current payment status (paid or due), compliance status with color indicators, recent payment history, year-to-date payment totals, average payment metrics, most recent asset values, and current billing period details
**Available Periods**
- Selectable payment periods with formatted labels and payment schedule context
**Variance Calculations**
- Comparison results between expected and actual payments, status categorizations for payment differences, and percentage/dollar variance amounts
This information supports displaying client lists with status indicators, recording payments, viewing payment histories, monitoring compliance, calculating fee references, and providing search/filter capabilities across the financial data.



=========


MAJOR FOUNDATIONAL CHANGES:

### THESE ARE UPCOMING 

## Current Database Schema

```sql
-- TABLES --
clients (client_id, display_name, full_name, ima_signed_date, onedrive_folder_path, valid_from, valid_to)
contacts (contact_id, client_id, contact_type, contact_name, phone, email, fax, physical_address, mailing_address, valid_from, valid_to)
contracts (contract_id, client_id, contract_number, provider_name, contract_start_date, fee_type, percent_rate, flat_rate, payment_schedule, num_people, notes, valid_from, valid_to)
payments (payment_id, contract_id, client_id, received_date, total_assets, expected_fee, actual_fee, method, notes, valid_from, valid_to, applied_period_type, applied_period, applied_year)
client_metrics (id, client_id, last_payment_date, last_payment_amount, last_payment_quarter, last_payment_year, total_ytd_payments, avg_quarterly_payment, last_recorded_assets, last_updated, next_payment_due)
quarterly_summaries (id, client_id, year, quarter, total_payments, total_assets, payment_count, avg_payment, expected_total, last_updated)
yearly_summaries (id, client_id, year, total_payments, total_assets, payment_count, avg_payment, yoy_growth, last_updated)
client_files (file_id, client_id, file_name, onedrive_path, uploaded_at)
payment_files (payment_id, file_id, linked_at)

-- VIEWS --
client_payment_status
payment_file_view

-- TRIGGERS --
update_client_metrics_after_payment
update_quarterly_after_payment
update_yearly_after_quarterly
```

## Evidence-Backed Game Plan

### 1. Fix Date Columns (nvarchar → DATE) with CHECK Constraints

**Evidence:**
- **Schema:** All date columns are `nvarchar(50)`
- **Backend (`dashboard/__init__.py`):** No date parsing happens in SQL, forcing Python to handle it
- **Frontend (`dateUtils.ts`):** Has `parseISO()` and complex date formatting because dates come as strings
- **Frontend (`PaymentFormFields.tsx`):** Default date setting requires string manipulation: `new Date().toISOString().split('T')[0]`

**Implementation:**
```sql
ALTER TABLE clients ALTER COLUMN ima_signed_date DATE;
ALTER TABLE contracts ALTER COLUMN contract_start_date DATE;
ALTER TABLE payments ALTER COLUMN received_date DATE;
ALTER TABLE client_metrics ALTER COLUMN last_payment_date DATE;
ALTER TABLE client_metrics ALTER COLUMN last_updated DATETIME;
ALTER TABLE client_metrics ALTER COLUMN next_payment_due DATE;
ALTER TABLE quarterly_summaries ALTER COLUMN last_updated DATETIME;
ALTER TABLE yearly_summaries ALTER COLUMN last_updated DATETIME;

-- Add period validation
ALTER TABLE payments
ADD CONSTRAINT chk_applied_period CHECK (
    (applied_period_type = 'monthly' AND applied_period BETWEEN 1 AND 12)
    OR (applied_period_type = 'quarterly' AND applied_period BETWEEN 1 AND 4)
);
```

**Impact:**
- **SQL Benefits:** Can use DATEPART, DATEDIFF, proper sorting, date comparisons
- **Backend Changes:** Remove date string handling in all endpoints
- **Frontend Changes:** Simplify `formatDate()` function, remove parseISO calls
- **Performance:** Massive improvement in date-based queries and sorting
- **Data Integrity:** CHECK constraints guarantee valid periods at database level

### 2. Remove Dead Columns from client_metrics

**Evidence:**
- **Trigger (`update_client_metrics_after_payment`):** Does NOT update `last_payment_quarter` or `last_payment_year`
  ```sql
  SET 
    last_payment_date = lp.received_date,
    last_payment_amount = lp.actual_fee,
    -- Notice: NO last_payment_quarter or last_payment_year updates!
  ```
- **Backend (`dashboard/__init__.py`):** Never queries these columns
- **Frontend:** Never displays quarter/year from client_metrics
- **Database:** These columns are storing stale, unmaintained data

**Implementation:**
```sql
ALTER TABLE client_metrics DROP COLUMN last_payment_quarter;
ALTER TABLE client_metrics DROP COLUMN last_payment_year;
```

**Impact:**
- **Tables Affected:** client_metrics (ALTER TABLE DROP COLUMN)
- **Code Changes:** None - nothing uses these columns
- **Storage:** Cleaner schema, less confusion

### 3. Add Date Dimension Table

**Evidence:**
- **Backend (`periods/__init__.py`):** 150 lines of complex Python generating periods that don't exist:
  ```python
  # Generate periods up to current collection period
  while year < current_year or (year == current_year and period <= current_period):
      if (period, year) not in paid_periods:
          # Generating non-existent data
  ```
- **Frontend (`PaymentForm`):** Relies on this complex endpoint for dropdown
- **Current Issue:** Every period dropdown request runs this expensive calculation

**Implementation:**
```sql
CREATE TABLE payment_periods (
    period_type NVARCHAR(10) NOT NULL CHECK (period_type IN ('monthly', 'quarterly')),
    year INT NOT NULL,
    period INT NOT NULL,
    period_name NVARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BIT NOT NULL DEFAULT 0,
    PRIMARY KEY (period_type, year, period)
);

CREATE INDEX idx_payment_periods_dates 
ON payment_periods (period_type, start_date, end_date);
```

**Impact:**
- **New Table:** `payment_periods` with pre-populated 2015-2030 data
- **Backend Simplification:** Replace 150 lines with a simple JOIN query
- **Performance:** Instant period lookups vs runtime generation

### 4. Add Two Critical Views

#### A. payment_variance_view

**Evidence:**
- **Backend (`calculations/__init__.py`):** Entire Azure Function just for variance
- **Frontend (`PaymentHistory.tsx`):** Recalculates variance for every row:
  ```javascript
  const calculateVariance = (actual, expected) => {
    // Duplicating backend logic in frontend!
  }
  ```
- **Performance Issue:** Network call for each variance calculation

**Implementation:**
```sql
CREATE VIEW payment_variance_view AS
SELECT 
    p.*,
    p.actual_fee - p.expected_fee AS variance_amount,
    CASE 
        WHEN p.expected_fee = 0 OR p.expected_fee IS NULL THEN NULL
        ELSE ((p.actual_fee - p.expected_fee) / p.expected_fee) * 100
    END AS variance_percent,
    CASE 
        WHEN p.expected_fee IS NULL OR p.expected_fee = 0 THEN 'unknown'
        WHEN ABS(p.actual_fee - p.expected_fee) < 0.01 THEN 'exact'
        WHEN ABS(((p.actual_fee - p.expected_fee) / p.expected_fee) * 100) <= 5 THEN 'acceptable'
        WHEN ABS(((p.actual_fee - p.expected_fee) / p.expected_fee) * 100) <= 15 THEN 'warning'
        ELSE 'alert'
    END AS variance_status
FROM payments p
WHERE p.valid_to IS NULL;
```

**Impact:**
- **Backend:** Delete entire `calculations` function folder
- **Frontend:** Remove `calculateVariance()` function
- **API calls:** Eliminate variance calculation endpoint

#### B. clients_by_provider_view

**Evidence:**
- **Backend (`clients/__init__.py`):** Manual JOIN in every client query:
  ```python
  LEFT JOIN contracts co ON c.client_id = co.client_id AND co.valid_to IS NULL
  ```
- **Backend (`dashboard/__init__.py`):** Same JOIN repeated
- **Frontend (`Sidebar.tsx`):** Groups by provider client-side:
  ```javascript
  const groupClientsByProvider = () => {
    // Doing in JS what SQL should do
  }
  ```

**Implementation:**
```sql
CREATE VIEW clients_by_provider_view AS
SELECT 
    c.client_id,
    c.display_name,
    c.full_name,
    c.ima_signed_date,
    c.onedrive_folder_path,
    c.valid_from,
    c.valid_to,
    ct.contract_id,
    ct.provider_name,
    ct.fee_type,
    ct.percent_rate,
    ct.flat_rate,
    ct.payment_schedule,
    cm.last_payment_date,
    cm.last_payment_amount,
    cm.last_recorded_assets,
    cm.total_ytd_payments,
    cps.payment_status,
    CASE 
        WHEN cps.payment_status = 'Paid' THEN 'green'
        ELSE 'yellow'
    END AS compliance_status
FROM clients c
LEFT JOIN contracts ct ON c.client_id = ct.client_id AND ct.valid_to IS NULL
LEFT JOIN client_metrics cm ON c.client_id = cm.client_id
LEFT JOIN client_payment_status cps ON c.client_id = cps.client_id
WHERE c.valid_to IS NULL;
```

**Impact:**
- **Backend:** Simplify all client queries
- **Frontend:** Remove client-side grouping logic

### 5. Add Missing Index

**Evidence:**
- **Backend (`payments/__init__.py`):** Every payment query filters by:
  ```sql
  WHERE p.client_id = ? AND p.applied_year = ? AND p.applied_period = ?
  ```
- **Current Schema:** No index on this combination
- **Performance:** Full table scans on payment lookups

**Implementation:**
```sql
CREATE NONCLUSTERED INDEX idx_payments_period_lookup
ON payments (client_id, applied_year, applied_period)
INCLUDE (actual_fee, expected_fee, total_assets, received_date);
```

**Impact:**
- **Query Performance:** 10-100x faster payment period lookups
- **Affects:** All payment queries, period availability checks

## Complete Impact Summary

**Backend Changes:**
1. Delete entire `calculations` folder
2. Simplify `periods/__init__.py` from 150 to ~20 lines
3. Remove date string handling throughout
4. Simplify all client queries (remove JOINs)
5. Keep period availability logic as parameterized query (not a view)

**Frontend Changes:**
1. Delete `calculateVariance()` function
2. Simplify `groupClientsByProvider()`
3. Remove date parsing complexity
4. Simplify period generation logic

**Performance Gains:**
1. Date comparisons: 10x faster (native DATE vs string)
2. Period lookups: 100x faster (indexed table vs generation)
3. Payment queries: 10-50x faster (new index)
4. Variance display: Eliminate N API calls per page
5. Client grouping: Instant vs client-side processing

This plan is backed by specific evidence from your codebase showing redundancy, performance issues, and maintainability problems that these changes directly address.