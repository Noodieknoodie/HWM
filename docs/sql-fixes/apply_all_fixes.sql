-- docs/sql-fixes/apply_all_fixes.sql
-- Apply all critical fixes to make the application functional
-- Run this script against your Azure SQL database

-- =====================================================
-- FIX 1: Update client_payment_status view to include contract_id
-- =====================================================
DROP VIEW IF EXISTS [dbo].[client_payment_status];
GO

CREATE VIEW [dbo].[client_payment_status] AS
SELECT
    c.client_id,
    c.display_name,
    ct.contract_id,  -- ADDED: Include contract_id for payment creation
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

-- =====================================================
-- FIX 2: Update available_payment_periods view to support new clients
-- =====================================================
DROP VIEW IF EXISTS [dbo].[available_payment_periods];
GO

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
-- Changed from INNER JOIN to LEFT JOIN to include clients with no payments
LEFT JOIN (
    SELECT client_id, 
           MIN(DATEFROMPARTS(applied_year, applied_period, 1)) as first_payment_date
    FROM payments
    GROUP BY client_id
) first_payment ON c.client_id = first_payment.client_id
WHERE pp.end_date <= GETDATE()
  -- Use contract start date, IMA signed date, or beginning of current year as fallback
  AND pp.start_date >= COALESCE(
      first_payment.first_payment_date,
      ct.contract_start_date,
      c.ima_signed_date,
      DATEFROMPARTS(YEAR(GETDATE()), 1, 1)
  );
GO

-- =====================================================
-- FIX 3: Update clients_by_provider_view to include contract_id
-- This view is used by the sidebar and needs contract_id too
-- =====================================================
DROP VIEW IF EXISTS [dbo].[clients_by_provider_view];
GO

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

PRINT 'All fixes applied successfully!';
PRINT '';
PRINT 'Summary of changes:';
PRINT '1. client_payment_status view now includes contract_id';
PRINT '2. available_payment_periods view now supports new clients with no payment history';
PRINT '3. clients_by_provider_view continues to work with the updated views';
PRINT '';
PRINT 'Note: The API path fix is handled in staticwebapp.database.config.json';