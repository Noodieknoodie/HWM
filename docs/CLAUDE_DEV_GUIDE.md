# FRONTEND-DB-GUIDE.md

● WHAT THE FRONTEND SHOWS:

In the Sidebar:
  **COMPONENT: src/components/Sidebar.tsx**
  - Client names: "Acme Corporation", "Beta Industries", "Harbor Medical LLC"
    // FROM: clients_by_provider_view.display_name
    // COMPONENT: src/components/ClientSearch.tsx (renders list items)
  - Status icons: ✓ (green check) or ⚠ (yellow warning)
    // FROM: clients_by_provider_view.compliance_status ('green' or 'yellow')
    // ICON: CheckCircleIcon (green) or ExclamationTriangleIcon (yellow)
  - Provider grouping: Groups like "Fidelity Clients", "Vanguard Clients" when toggled
    // FROM: clients_by_provider_view.provider_name (GROUP BY)
    // TOGGLE: "View by Provider" switch in Sidebar header

Main Client Header:
  **COMPONENT: src/pages/Payments.tsx (top section)**
  - Full Name: "Acme Corporation"
    // FROM: clients.full_name
    // LOCATION: Main content area, h1 tag
  - Display Name: "Acme"
    // FROM: clients.display_name
    // LOCATION: After dash in header "Acme Corporation - Acme"

Contract Details Card:
  **COMPONENT: src/components/dashboard/ContractCard.tsx**
  - Contract Number: "401K-2024" or "HM-401K-2023"
    // FROM: contracts.contract_number
    // FIELD: "Contract Number" label
  - Plan Provider: "Vanguard" or "Fidelity" or "Charles Schwab"
    // FROM: contracts.provider_name
    // FIELD: "Plan Provider" label
  - Payment Frequency: "Monthly" or "Quarterly" or "Annual"
    // FROM: contracts.payment_schedule
    // FIELD: "Payment Frequency" label
  - Fee Structure: "AUM%" or "Flat Fee"
    // FROM: contracts.fee_type ('percentage' or 'flat')
    // FIELD: "Fee Structure" label
  - Fee Amount: "0.25%" (for AUM) or "$2,500" (for flat fee)
    // FROM: contracts.percent_rate * 100 OR contracts.flat_rate
    // FIELD: "Fee Amount" label

Payment Information Card:
  **COMPONENT: src/components/dashboard/PaymentInfoCard.tsx**
  - AUM: "$125,000"
    // FROM: client_metrics_view.last_recorded_assets
    // FIELD: "AUM" label
  - Expected Fee: "$312.50"
    // FROM: client_payment_status.expected_fee
    // FIELD: "Expected Fee" label
  - Last Payment: "12/01/2024"
    // FROM: client_metrics_view.last_payment_date
    // FIELD: "Last Payment" label
  - Last Payment Amount: "$312.50"
    // FROM: client_metrics_view.last_payment_amount
    // FIELD: "Last Payment Amount" label
  - Current Period: "Dec 2024" or "Q4 2024"
    // FROM: client_payment_status.current_period + current_year
    // FIELD: "Current Period" label (blue background)
  - Payment Status: "Paid" (green) or "Due" (yellow)
    // FROM: client_payment_status.payment_status
    // FIELD: "Payment Status" label with badge
  - YTD Payments: "$3,750.00"
    // FROM: client_metrics_view.total_ytd_payments
    // FIELD: "YTD Payments" label

Payment Status Card:
  **COMPONENT: src/components/dashboard/ComplianceCard.tsx**
  - Status: "Up to Date" or "Payment Due"
    // FROM: client_payment_status.payment_status ('Paid' or 'Due')
    // LOCATION: Large icon and text in center
  - Current Period: "Dec 2024" or "Q4 2024"
    // FROM: client_payment_status.current_period + current_year + payment_schedule
    // LOCATION: Below status text
  - Schedule: "Monthly @ 0.25%" or "Quarterly @ $2,500"
    // FROM: contracts.payment_schedule + fee_type + (percent_rate OR flat_rate)
    // LOCATION: Small text below period
  - Fee Reference table:
    // LOCATION: Bottom section of card
    - Monthly: "$312.50"
      // FROM: client_fee_reference.monthly_fee
      // ROW: "Monthly" label
    - Quarterly: "$937.50"
      // FROM: client_fee_reference.quarterly_fee
      // ROW: "Quarterly" label
    - Annual: "$3,750"
      // FROM: client_fee_reference.annual_fee
      // ROW: "Annual" label

Payment Form:
  **COMPONENT: src/components/payment/PaymentForm.tsx**
  - Received Date: Date picker showing "12/15/2024"
    // INPUT: User enters
    // FIELD: <input type="date" name="received_date">
  - Payment Amount: "$312.50"
    // INPUT: User enters (default from client_payment_status.expected_fee)
    // FIELD: <input type="number" name="payment_amount">
  - AUM: "$125,000"
    // INPUT: User enters (optional)
    // FIELD: <input type="number" name="aum">
  - Payment Method: Dropdown with "Check", "ACH", "Wire"
    // HARDCODED: ['Check', 'ACH', 'Wire', 'Auto - Check', 'Auto - ACH', 'Invoice - Check']
    // FIELD: <select name="payment_method">
  - Applied Period: Dropdown with "Dec 2024", "Nov 2024", "Q4 2024"
    // FROM: available_payment_periods WHERE is_paid = 0
    // FIELD: <select name="applied_period">
  - Expected Fee: "$312.50"
    // FROM: client_payment_status.expected_fee
    // FIELD: <input type="text" name="expected_fee" disabled>
  - Notes: "Payment received via ACH transfer"
    // INPUT: User enters
    // FIELD: <textarea name="notes">

Payment History Table:
  **COMPONENT: src/components/payment/PaymentHistory.tsx**
  - Date: "12/01/24"
    // FROM: payment_variance_view.received_date
    // COLUMN: 1st column, formatted MM/DD/YY
  - Provider: "Vanguard"
    // FROM: contracts.provider_name (JOIN on contract_id)
    // COLUMN: 2nd column
  - Applied Period: "Dec 2024" or "Q4 2024"
    // FROM: payment_variance_view.applied_period + applied_year + applied_period_type
    // COLUMN: 3rd column
  - Payment: "$312.50"
    // FROM: payment_variance_view.actual_fee
    // COLUMN: 4th column
  - Expected: "$312.50"
    // FROM: payment_variance_view.expected_fee
    // COLUMN: 5th column
  - Variance: "$0.00" or "-$5.00"
    // FROM: payment_variance_view.variance_amount
    // COLUMN: 6th column (red if negative)
  - AUM: "$125,000"
    // FROM: payment_variance_view.total_assets
    // COLUMN: 7th column
  - Edit/Delete buttons
    // ACTIONS: Per row actions
    // ICONS: PencilIcon, TrashIcon

**Key API Calls Needed:**
1. Sidebar: `SELECT * FROM clients_by_provider_view`
   - HOOK: src/hooks/useClientDashboard.ts
   - API: GET /api/clients
   
2. Dashboard: `SELECT * FROM client_payment_status WHERE client_id = ?` + `client_metrics_view`
   - HOOK: src/hooks/useClientDashboard.ts
   - API: GET /api/dashboard/{client_id}
   
3. Fee Reference: `SELECT * FROM client_fee_reference WHERE client_id = ?`
   - INCLUDED IN: Dashboard API response
   
4. Period Dropdown: `SELECT * FROM available_payment_periods WHERE client_id = ? AND is_paid = 0`
   - HOOK: src/hooks/usePeriods.ts
   - API: GET /api/periods?client_id={client_id}
   
5. Payment History: `SELECT * FROM payment_variance_view WHERE client_id = ?`
   - HOOK: src/hooks/usePayments.ts
   - API: GET /api/payments?client_id={client_id}

**State Management:**
- STORE: src/stores/useAppStore.ts
  - selectedClient: Currently selected client object
  - clients: List of all clients
  - isLoading: Loading states
  - error: Error states


**Business Logic & Data Notes:**

**Rate Scaling:**
The rates stored in the database are already scaled to the payment frequency. If a client pays monthly at 2.5% annually, the database stores 0.00208333 (2.5% ÷ 12 months). If they pay quarterly at 2.5% annually, it stores 0.00625 (2.5% ÷ 4 quarters). Don't scale these again - they're ready to use for fee calculations. For annual display: monthly_rate × 12 or quarterly_rate × 4

**Billing in Arrears:**
Payments are always for the previous period. In July 2025, monthly clients are paying for June 2025's services, and quarterly clients are paying for Q2 2025 (April-June). The view calculates "current_period" as one period back from today's date automatically.

**Period Display Formatting:**
The database stores periods as integers. For monthly: applied_period=6 means June. For quarterly: applied_period=2 means Q2. To display these, you need to convert:
- Monthly: Use month names (1=January, 2=February, etc) plus the year
- Quarterly: Format as "Q" + period number + space + year
The `available_payment_periods` view already does this formatting in the `display_text` column.

**NULL Handling:**
- total_assets: Flat fee clients don't need assets recorded, so NULLs are expected
- expected_fee: Will be NULL for percentage-based clients when no assets are recorded
- contract_number: About 30% of contracts have no number entered
- total_ytd_payments: NULL means the client hasn't made any payments in the current year

**Expected Fee Calculations:**
For percentage-based fees, the calculation requires assets under management (AUM). The most recent AUM is stored in `client_metrics_view.last_recorded_assets`. If a user doesn't enter AUM when recording a payment, you can use this historical value.

**Variance Status Logic:**
The `payment_variance_view` calculates how far off the actual payment was from expected:
- 'exact': Payment within 1 cent of expected
- 'acceptable': Payment within 5% of expected  
- 'warning': Payment off by 5-15%
- 'alert': Payment off by more than 15%
- 'unknown': No expected fee to compare against

**Payment Methods:**
There's no payment_methods table. These are the values currently in use: Check, ACH, Wire, Auto - Check, Auto - ACH, Invoice - Check. Keep this list hardcoded.

**Multiple Payments Per Period:**
Clients can make multiple payments for the same period (partial payments, corrections, overpayments). The views automatically SUM these when calculating totals.

**FUTURE PLAN**
will create a quarterly summary page eventually where it shows quarterly totals for each client per year. a view already exists for this (quarterly_totals)


#############
# FULL SCHEMA
#############
SEE 
-- =====================================================
-- HohimerPro-401k Database Schema
-- Final Version - July 2025
-- =====================================================

-- =====================================================
-- TABLES
-- =====================================================

-- Table: clients
CREATE TABLE [dbo].[clients](
    [client_id] [int] IDENTITY(1,1) NOT NULL,
    [display_name] [nvarchar](255) NOT NULL,
    [full_name] [nvarchar](255) NULL,
    [ima_signed_date] [date] NULL,
    CONSTRAINT [PK_clients] PRIMARY KEY CLUSTERED ([client_id])
);

-- Table: contracts
CREATE TABLE [dbo].[contracts](
    [contract_id] [int] IDENTITY(1,1) NOT NULL,
    [client_id] [int] NOT NULL,
    [contract_number] [nvarchar](100) NULL,
    [provider_name] [nvarchar](255) NULL,
    [contract_start_date] [date] NULL,
    [fee_type] [nvarchar](50) NULL,
    [percent_rate] [float] NULL,
    [flat_rate] [float] NULL,
    [payment_schedule] [nvarchar](50) NULL,
    [num_people] [int] NULL,
    [notes] [nvarchar](max) NULL,
    CONSTRAINT [PK_contracts] PRIMARY KEY CLUSTERED ([contract_id])
);

-- Table: contacts
CREATE TABLE [dbo].[contacts](
    [contact_id] [int] IDENTITY(1,1) NOT NULL,
    [client_id] [int] NOT NULL,
    [contact_type] [nvarchar](50) NOT NULL,
    [contact_name] [nvarchar](255) NULL,
    [phone] [nvarchar](50) NULL,
    [email] [nvarchar](255) NULL,
    [fax] [nvarchar](50) NULL,
    [physical_address] [nvarchar](500) NULL,
    [mailing_address] [nvarchar](500) NULL,
    CONSTRAINT [PK_contacts] PRIMARY KEY CLUSTERED ([contact_id])
);

-- Table: payments
CREATE TABLE [dbo].[payments](
    [payment_id] [int] IDENTITY(1,1) NOT NULL,
    [contract_id] [int] NOT NULL,
    [client_id] [int] NOT NULL,
    [received_date] [date] NULL,
    [total_assets] [float] NULL,
    [expected_fee] [float] NULL,
    [actual_fee] [float] NULL,
    [method] [nvarchar](50) NULL,
    [notes] [nvarchar](max) NULL,
    [applied_period_type] [nvarchar](10) NULL,
    [applied_period] [int] NULL,
    [applied_year] [int] NULL,
    CONSTRAINT [PK_payments] PRIMARY KEY CLUSTERED ([payment_id])
);

-- Table: payment_periods
CREATE TABLE [dbo].[payment_periods](
    [period_type] [nvarchar](10) NOT NULL,
    [year] [int] NOT NULL,
    [period] [int] NOT NULL,
    [period_name] [nvarchar](50) NOT NULL,
    [start_date] [date] NOT NULL,
    [end_date] [date] NOT NULL,
    [is_current] [bit] NOT NULL DEFAULT ((0)),
    PRIMARY KEY CLUSTERED ([period_type], [year], [period])
);

-- =====================================================
-- FOREIGN KEYS
-- =====================================================

ALTER TABLE [dbo].[contacts] ADD CONSTRAINT [FK_contacts_clients] 
    FOREIGN KEY([client_id]) REFERENCES [dbo].[clients] ([client_id]) ON DELETE CASCADE;

ALTER TABLE [dbo].[contracts] ADD CONSTRAINT [FK_contracts_clients] 
    FOREIGN KEY([client_id]) REFERENCES [dbo].[clients] ([client_id]) ON DELETE CASCADE;

ALTER TABLE [dbo].[payments] ADD CONSTRAINT [FK_payments_clients] 
    FOREIGN KEY([client_id]) REFERENCES [dbo].[clients] ([client_id]) ON DELETE CASCADE;

ALTER TABLE [dbo].[payments] ADD CONSTRAINT [FK_payments_contracts] 
    FOREIGN KEY([contract_id]) REFERENCES [dbo].[contracts] ([contract_id]);

-- =====================================================
-- CHECK CONSTRAINTS
-- =====================================================

ALTER TABLE [dbo].[payment_periods] ADD CHECK 
    (([period_type]='quarterly' OR [period_type]='monthly'));

ALTER TABLE [dbo].[payments] ADD CONSTRAINT [chk_applied_period] CHECK 
    (([applied_period_type]='monthly' AND ([applied_period]>=(1) AND [applied_period]<=(12)) 
    OR [applied_period_type]='quarterly' AND ([applied_period]>=(1) AND [applied_period]<=(4))));

-- =====================================================
-- INDEXES
-- =====================================================

CREATE NONCLUSTERED INDEX [idx_contacts_client_id] ON [dbo].[contacts] ([client_id]);
CREATE NONCLUSTERED INDEX [idx_contacts_type] ON [dbo].[contacts] ([client_id], [contact_type]);
CREATE NONCLUSTERED INDEX [idx_contracts_client_id] ON [dbo].[contracts] ([client_id]);
CREATE NONCLUSTERED INDEX [idx_contracts_provider] ON [dbo].[contracts] ([provider_name]);
CREATE NONCLUSTERED INDEX [idx_payment_periods_dates] ON [dbo].[payment_periods] ([period_type], [start_date], [end_date]);
CREATE NONCLUSTERED INDEX [idx_payments_client_id] ON [dbo].[payments] ([client_id]);
CREATE NONCLUSTERED INDEX [idx_payments_contract_id] ON [dbo].[payments] ([contract_id]);
CREATE NONCLUSTERED INDEX [idx_payments_date] ON [dbo].[payments] ([client_id], [received_date]);
CREATE NONCLUSTERED INDEX [idx_payments_period_lookup] ON [dbo].[payments] 
    ([client_id], [applied_year], [applied_period])
    INCLUDE([actual_fee], [expected_fee], [total_assets], [received_date]);

-- =====================================================
-- VIEWS
-- =====================================================

-- View: client_metrics_view
-- Purpose: Latest payment info and YTD totals for each client
CREATE VIEW [dbo].[client_metrics_view] AS
WITH LastPayment AS (
    SELECT 
        client_id,
        received_date as last_payment_date,
        actual_fee as last_payment_amount,
        total_assets as last_recorded_assets,
        ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY received_date DESC) as rn
    FROM payments
)
SELECT 
    c.client_id,
    lp.last_payment_date,
    lp.last_payment_amount,
    ytd.total_ytd_payments,
    lp.last_recorded_assets,
    GETDATE() as last_updated
FROM clients c
LEFT JOIN LastPayment lp ON c.client_id = lp.client_id AND lp.rn = 1
LEFT JOIN (
    SELECT client_id, SUM(actual_fee) as total_ytd_payments
    FROM payments 
    WHERE applied_year = YEAR(GETDATE())
    GROUP BY client_id
) ytd ON c.client_id = ytd.client_id;
GO

-- View: client_payment_status
-- Purpose: Current payment status and expected fees for each client
CREATE VIEW [dbo].[client_payment_status] AS
SELECT
    c.client_id,
    c.display_name,
    ct.payment_schedule,
    ct.fee_type,
    ct.flat_rate,
    ct.percent_rate,
    cmv.last_payment_date,
    cmv.last_payment_amount,
    latest.applied_period,
    latest.applied_year,
    latest.applied_period_type,
    -- Current billable period (one back from today)
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
    cmv.last_recorded_assets,
    -- Calculate expected fee
    CASE
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate
        WHEN ct.fee_type = 'percentage' AND cmv.last_recorded_assets IS NOT NULL THEN 
            ROUND(cmv.last_recorded_assets * (ct.percent_rate / 100.0), 2)
        ELSE NULL
    END AS expected_fee,
    -- Payment status
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
JOIN contracts ct ON c.client_id = ct.client_id
LEFT JOIN client_metrics_view cmv ON c.client_id = cmv.client_id
LEFT JOIN (
    SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY received_date DESC) as rn
        FROM payments
    ) AS numbered WHERE rn = 1
) latest ON c.client_id = latest.client_id;
GO

-- View: clients_by_provider_view
-- Purpose: Master view for sidebar and client list
CREATE VIEW [dbo].[clients_by_provider_view] AS
SELECT 
    c.client_id,
    c.display_name,
    c.full_name,
    c.ima_signed_date,
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
LEFT JOIN contracts ct ON c.client_id = ct.client_id
LEFT JOIN client_metrics_view cm ON c.client_id = cm.client_id
LEFT JOIN client_payment_status cps ON c.client_id = cps.client_id;
GO

-- View: payment_variance_view
-- Purpose: Payment history with variance calculations
CREATE VIEW [dbo].[payment_variance_view] AS
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
FROM payments p;
GO

-- View: quarterly_totals
-- Purpose: Quarterly payment totals for all clients
CREATE VIEW [dbo].[quarterly_totals] AS
SELECT 
    c.client_id,
    c.display_name,
    p.applied_year as year,
    CASE 
        WHEN p.applied_period_type = 'monthly' THEN 
            CASE 
                WHEN p.applied_period IN (1,2,3) THEN 1
                WHEN p.applied_period IN (4,5,6) THEN 2
                WHEN p.applied_period IN (7,8,9) THEN 3
                WHEN p.applied_period IN (10,11,12) THEN 4
            END
        WHEN p.applied_period_type = 'quarterly' THEN p.applied_period
    END as quarter,
    SUM(p.actual_fee) as total,
    COUNT(*) as payment_count
FROM clients c
LEFT JOIN payments p ON c.client_id = p.client_id
WHERE p.payment_id IS NOT NULL
GROUP BY 
    c.client_id, 
    c.display_name, 
    p.applied_year,
    CASE 
        WHEN p.applied_period_type = 'monthly' THEN 
            CASE 
                WHEN p.applied_period IN (1,2,3) THEN 1
                WHEN p.applied_period IN (4,5,6) THEN 2
                WHEN p.applied_period IN (7,8,9) THEN 3
                WHEN p.applied_period IN (10,11,12) THEN 4
            END
        WHEN p.applied_period_type = 'quarterly' THEN p.applied_period
    END;
GO

-- View: yearly_summaries
-- Purpose: Annual totals with YoY growth calculations
CREATE VIEW [dbo].[yearly_summaries] AS
WITH yearly_data AS (
    SELECT 
        client_id,
        applied_year as [year],
        SUM(actual_fee) as total_payments,
        AVG(total_assets) as total_assets,
        COUNT(*) as payment_count,
        AVG(actual_fee) as avg_payment
    FROM payments 
    GROUP BY client_id, applied_year
)
SELECT 
    y1.*,
    CASE 
        WHEN y2.total_payments > 0 
        THEN ((y1.total_payments - y2.total_payments) / y2.total_payments * 100) 
        ELSE NULL 
    END as yoy_growth,
    GETDATE() as last_updated
FROM yearly_data y1
LEFT JOIN yearly_data y2 ON y1.client_id = y2.client_id 
    AND y1.[year] = y2.[year] + 1;
GO

-- View: available_payment_periods
-- Purpose: Payment form dropdown showing available periods
CREATE VIEW [dbo].[available_payment_periods] AS
SELECT 
    c.client_id,
    pp.year,
    pp.period,
    CASE 
        WHEN ct.payment_schedule = 'monthly' THEN pp.period_name
        WHEN ct.payment_schedule = 'quarterly' THEN 'Q' + CAST(pp.period AS VARCHAR) + ' ' + CAST(pp.year AS VARCHAR)
    END as display_text,
    CASE WHEN p.payment_id IS NOT NULL THEN 1 ELSE 0 END as is_paid
FROM clients c
JOIN contracts ct ON c.client_id = ct.client_id
JOIN payment_periods pp ON pp.period_type = ct.payment_schedule
LEFT JOIN payments p ON p.client_id = c.client_id 
    AND p.applied_year = pp.year 
    AND p.applied_period = pp.period
    AND p.applied_period_type = pp.period_type
INNER JOIN (
    SELECT client_id, 
           MIN(DATEFROMPARTS(applied_year, applied_period, 1)) as first_payment_date
    FROM payments
    GROUP BY client_id
) first_payment ON c.client_id = first_payment.client_id
WHERE pp.end_date <= GETDATE()
  AND pp.start_date >= first_payment.first_payment_date;
GO

-- View: client_fee_reference
-- Purpose: Fee calculations at different frequencies
CREATE VIEW [dbo].[client_fee_reference] AS
SELECT 
    ct.client_id,
    ct.fee_type,
    ct.percent_rate,
    ct.flat_rate,
    cm.last_recorded_assets,
    CASE 
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate
        WHEN ct.fee_type = 'percentage' AND cm.last_recorded_assets IS NOT NULL 
        THEN ROUND(cm.last_recorded_assets * (ct.percent_rate / 100.0), 2)
        ELSE NULL
    END as monthly_fee,
    CASE 
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate * 3
        WHEN ct.fee_type = 'percentage' AND cm.last_recorded_assets IS NOT NULL 
        THEN ROUND(cm.last_recorded_assets * (ct.percent_rate / 100.0) * 3, 2)
        ELSE NULL
    END as quarterly_fee,
    CASE 
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate * 12
        WHEN ct.fee_type = 'percentage' AND cm.last_recorded_assets IS NOT NULL 
        THEN ROUND(cm.last_recorded_assets * (ct.percent_rate / 100.0) * 12, 2)
        ELSE NULL
    END as annual_fee
FROM contracts ct
LEFT JOIN client_metrics_view cm ON ct.client_id = cm.client_id;
GO