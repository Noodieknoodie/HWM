-- =====================================================
-- STEP 1: Create new dashboard_view alongside existing views
-- This combines client_payment_status + client_metrics_view + client_fee_reference
-- =====================================================
CREATE VIEW [dbo].[dashboard_view] AS
WITH LastPayment AS (
    SELECT 
        client_id,
        received_date as last_payment_date,
        actual_fee as last_payment_amount,
        total_assets as last_recorded_assets,
        applied_period,
        applied_year,
        applied_period_type,
        ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY received_date DESC) as rn
    FROM payments
)
SELECT 
    -- Client basics (for header)
    c.client_id,
    c.display_name,
    c.full_name,
    c.ima_signed_date,
    
    -- Contract details (for ContractCard component)
    ct.contract_id,
    ct.contract_number,
    ct.provider_name,
    ct.payment_schedule,
    ct.fee_type,
    ct.percent_rate,
    ct.flat_rate,
    ct.num_people,
    
    -- Payment metrics (for PaymentInfoCard component)
    lp.last_payment_date,
    lp.last_payment_amount,
    lp.last_recorded_assets AS aum,
    ytd.total_ytd_payments,
    
    -- Latest payment period info
    lp.applied_period AS last_applied_period,
    lp.applied_year AS last_applied_year,
    lp.applied_period_type AS last_applied_period_type,
    
    -- Current period calculations
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
    
    -- Expected fee calculation
    CASE
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate
        WHEN ct.fee_type = 'percentage' AND lp.last_recorded_assets IS NOT NULL THEN 
            ROUND(lp.last_recorded_assets * (ct.percent_rate / 100.0), 2)
        ELSE NULL
    END AS expected_fee,
    
    -- Payment status
    CASE
        WHEN lp.applied_year IS NULL THEN 'Due'
        WHEN lp.applied_year < CASE 
            WHEN (MONTH(GETDATE()) = 1 AND ct.payment_schedule = 'monthly') OR 
                 (DATEPART(QUARTER, GETDATE()) = 1 AND ct.payment_schedule = 'quarterly')
            THEN YEAR(GETDATE()) - 1
            ELSE YEAR(GETDATE()) 
        END THEN 'Due'
        WHEN lp.applied_year = CASE 
            WHEN (MONTH(GETDATE()) = 1 AND ct.payment_schedule = 'monthly') OR 
                 (DATEPART(QUARTER, GETDATE()) = 1 AND ct.payment_schedule = 'quarterly')
            THEN YEAR(GETDATE()) - 1
            ELSE YEAR(GETDATE()) 
        END AND lp.applied_period < CASE
            WHEN ct.payment_schedule = 'monthly' THEN 
                CASE WHEN MONTH(GETDATE()) = 1 THEN 12 ELSE MONTH(GETDATE()) - 1 END
            WHEN ct.payment_schedule = 'quarterly' THEN 
                CASE WHEN DATEPART(QUARTER, GETDATE()) = 1 THEN 4 ELSE DATEPART(QUARTER, GETDATE()) - 1 END
        END THEN 'Due'
        ELSE 'Paid'
    END AS payment_status,
    
    -- Fee reference calculations (for ComplianceCard bottom section)
    CASE 
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate
        WHEN ct.fee_type = 'percentage' AND lp.last_recorded_assets IS NOT NULL 
        THEN ROUND(lp.last_recorded_assets * (ct.percent_rate / 100.0), 2)
        ELSE NULL
    END as monthly_fee,
    CASE 
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate * 3
        WHEN ct.fee_type = 'percentage' AND lp.last_recorded_assets IS NOT NULL 
        THEN ROUND(lp.last_recorded_assets * (ct.percent_rate / 100.0) * 3, 2)
        ELSE NULL
    END as quarterly_fee,
    CASE 
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate * 12
        WHEN ct.fee_type = 'percentage' AND lp.last_recorded_assets IS NOT NULL 
        THEN ROUND(lp.last_recorded_assets * (ct.percent_rate / 100.0) * 12, 2)
        ELSE NULL
    END as annual_fee

FROM clients c
JOIN contracts ct ON c.client_id = ct.client_id
LEFT JOIN LastPayment lp ON c.client_id = lp.client_id AND lp.rn = 1
LEFT JOIN (
    SELECT client_id, SUM(actual_fee) as total_ytd_payments
    FROM payments 
    WHERE applied_year = YEAR(GETDATE())
    GROUP BY client_id
) ytd ON c.client_id = ytd.client_id;
GO
