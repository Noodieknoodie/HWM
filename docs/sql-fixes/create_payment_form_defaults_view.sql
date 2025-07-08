-- docs/sql-fixes/create_payment_form_defaults_view.sql
-- Creates the payment_form_defaults_view for payment form default values
-- Provides suggested AUM and other defaults for the payment form

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