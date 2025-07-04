This is a 401(k) payment management system built for Hohimer Wealth Management that runs as a Microsoft Teams tab, enabling internal staff to track client fee payments, monitor compliance status, and manage payment schedules. The architecture follows a clean three-tier design: a React frontend handles the user interface and authentication via Azure AD, a FastAPI backend manages all business logic including payment calculations and compliance tracking, and an Azure SQL database stores client contracts, payment history, and fee structures, etc. The app is designed for internal use only, leveraging Teams as the delivery platform while maintaining a straightforward deployment model with the frontend hosted on Azure Static Web Apps and the API on Azure App Service, ensuring both security through token-based authentication and ease of maintenance through clear separation of concerns. This is a small scale app for my company to use - not hyper enterprise app. Automatic identity for our company via Teams SSO / Entra ID

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

DATABASE SCHEMA:
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