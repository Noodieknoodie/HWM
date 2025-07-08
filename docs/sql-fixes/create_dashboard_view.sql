-- docs/sql-fixes/create_dashboard_view.sql
-- Creates the consolidated dashboard_view that replaces:
-- - client_payment_status
-- - client_metrics_view  
-- - client_fee_reference
-- This single view provides all data needed for the client dashboard

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