-- docs/sql-fixes/create_payment_history_view.sql
-- Creates the payment_history_view with enhanced information
-- Replaces payment_variance_view with provider info included

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