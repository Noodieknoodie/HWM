-- docs/sql-fixes/create_all_new_views.sql
-- Creates all new consolidated views for the frontend retrofit
-- Run this script to add the new views to your database

-- 1. Dashboard View - Consolidates client_payment_status, client_metrics_view, and client_fee_reference
IF OBJECT_ID('dbo.dashboard_view', 'V') IS NOT NULL
    DROP VIEW dbo.dashboard_view;
GO

CREATE VIEW [dbo].[dashboard_view] AS
SELECT
    -- Client info
    c.client_id,
    c.display_name,
    c.full_name,
    c.ima_signed_date,
    
    -- Contract info
    ct.contract_id,
    ct.contract_number,
    ct.provider_name,
    ct.payment_schedule,
    ct.fee_type,
    ct.percent_rate,
    ct.flat_rate,
    
    -- AUM and estimation
    cmv.last_recorded_assets as aum,
    -- If no recorded AUM but we have payment data, estimate it
    CASE 
        WHEN cmv.last_recorded_assets IS NOT NULL THEN cmv.last_recorded_assets
        WHEN ct.fee_type = 'percentage' AND cmv.last_payment_amount IS NOT NULL AND ct.percent_rate > 0 THEN
            ROUND(cmv.last_payment_amount / (ct.percent_rate / 100.0), 2)
        ELSE NULL
    END as aum_estimated,
    CASE 
        WHEN cmv.last_recorded_assets IS NOT NULL THEN 'recorded'
        WHEN ct.fee_type = 'percentage' AND cmv.last_payment_amount IS NOT NULL AND ct.percent_rate > 0 THEN 'estimated'
        ELSE NULL
    END as aum_source,
    
    -- Payment info
    cmv.last_payment_date,
    cmv.last_payment_amount,
    cmv.total_ytd_payments,
    
    -- Current period (billing in arrears)
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
    
    -- Fee rates (already scaled for payment frequency in DB)
    ct.percent_rate as monthly_rate,  -- For monthly clients, this is the monthly rate
    ct.percent_rate * 3 as quarterly_rate,  -- For display purposes
    ct.percent_rate * 12 as annual_rate,    -- For display purposes
    
    -- Expected fee calculation (current period)
    CASE
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate
        WHEN ct.fee_type = 'percentage' AND cmv.last_recorded_assets IS NOT NULL THEN 
            ROUND(cmv.last_recorded_assets * (ct.percent_rate / 100.0), 2)
        WHEN ct.fee_type = 'percentage' AND cmv.last_payment_amount IS NOT NULL AND ct.percent_rate > 0 THEN
            -- Use estimated AUM if no recorded AUM
            ROUND((cmv.last_payment_amount / (ct.percent_rate / 100.0)) * (ct.percent_rate / 100.0), 2)
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

-- 2. Sidebar Clients View - Simplified view for client navigation
IF OBJECT_ID('dbo.sidebar_clients_view', 'V') IS NOT NULL
    DROP VIEW dbo.sidebar_clients_view;
GO

CREATE VIEW [dbo].[sidebar_clients_view] AS
SELECT 
    c.client_id,
    c.display_name,
    ct.provider_name,
    -- Simplified compliance status - just green or yellow
    CASE 
        WHEN cps.payment_status = 'Paid' THEN 'green'
        ELSE 'yellow'
    END AS compliance_status
FROM clients c
LEFT JOIN contracts ct ON c.client_id = ct.client_id
LEFT JOIN client_payment_status cps ON c.client_id = cps.client_id;
GO

-- 3. Payment Form Periods View - Unpaid periods for dropdown
IF OBJECT_ID('dbo.payment_form_periods_view', 'V') IS NOT NULL
    DROP VIEW dbo.payment_form_periods_view;
GO

CREATE VIEW [dbo].[payment_form_periods_view] AS
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
-- Use LEFT JOIN to include clients with no payments
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

-- 4. Payment Form Defaults View - Default values for payment form
IF OBJECT_ID('dbo.payment_form_defaults_view', 'V') IS NOT NULL
    DROP VIEW dbo.payment_form_defaults_view;
GO

CREATE VIEW [dbo].[payment_form_defaults_view] AS
SELECT 
    c.client_id,
    -- Suggested AUM: Use last recorded, or estimate from last payment
    CASE 
        WHEN cmv.last_recorded_assets IS NOT NULL THEN cmv.last_recorded_assets
        WHEN ct.fee_type = 'percentage' AND cmv.last_payment_amount IS NOT NULL AND ct.percent_rate > 0 THEN
            ROUND(cmv.last_payment_amount / (ct.percent_rate / 100.0), 2)
        ELSE NULL
    END as suggested_aum,
    -- Current period info for default selection
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
    ct.payment_schedule,
    ct.fee_type,
    ct.percent_rate,
    ct.flat_rate
FROM clients c
JOIN contracts ct ON c.client_id = ct.client_id
LEFT JOIN client_metrics_view cmv ON c.client_id = cmv.client_id;
GO

-- 5. Payment History View - Enhanced payment history with provider info
IF OBJECT_ID('dbo.payment_history_view', 'V') IS NOT NULL
    DROP VIEW dbo.payment_history_view;
GO

CREATE VIEW [dbo].[payment_history_view] AS
SELECT 
    p.payment_id,
    p.contract_id,
    p.client_id,
    p.received_date,
    p.total_assets,
    p.expected_fee,
    p.actual_fee,
    p.method,
    p.notes,
    p.applied_period_type,
    p.applied_period,
    p.applied_year,
    -- Period display
    CASE 
        WHEN p.applied_period_type = 'monthly' THEN 
            DATENAME(MONTH, DATEFROMPARTS(p.applied_year, p.applied_period, 1)) + ' ' + CAST(p.applied_year AS VARCHAR)
        WHEN p.applied_period_type = 'quarterly' THEN 
            'Q' + CAST(p.applied_period AS VARCHAR) + ' ' + CAST(p.applied_year AS VARCHAR)
    END as period_display,
    -- Provider name from contract (no JOIN needed in frontend)
    ct.provider_name,
    -- Variance calculations
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
JOIN contracts ct ON p.contract_id = ct.contract_id;
GO

PRINT 'All new views created successfully!';