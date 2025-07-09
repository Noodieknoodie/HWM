-- update_dashboard_view.sql
-- Updates the dashboard_view to support new card design with contact info and quarterly progress
-- Run this script in your SQL database to update the view

-- Drop the existing view if it exists
IF EXISTS (SELECT * FROM sys.views WHERE name = 'dashboard_view')
    DROP VIEW [dbo].[dashboard_view];
GO

-- Create the updated dashboard_view
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
),
QuarterlyProgress AS (
    SELECT 
        p.client_id,
        CASE 
            WHEN ct.payment_schedule = 'quarterly' THEN p.applied_period
            WHEN ct.payment_schedule = 'monthly' THEN 
                CEILING(CAST(p.applied_period AS float) / 3)
        END as quarter,
        p.applied_year,
        COUNT(*) as payments_in_quarter
    FROM payments p
    JOIN contracts ct ON p.client_id = ct.client_id
    WHERE p.applied_year = YEAR(GETDATE())
    GROUP BY 
        p.client_id, 
        p.applied_year,
        CASE 
            WHEN ct.payment_schedule = 'quarterly' THEN p.applied_period
            WHEN ct.payment_schedule = 'monthly' THEN 
                CEILING(CAST(p.applied_period AS float) / 3)
        END
)
SELECT 
    -- Client basics
    c.client_id,
    c.display_name,
    c.full_name,
    c.ima_signed_date,
    
    -- Contact info (NEW)
    con.contact_name,
    con.phone,
    con.physical_address,
    
    -- Contract details  
    ct.contract_id,
    ct.contract_number,
    ct.provider_name,
    ct.payment_schedule,
    ct.fee_type,
    ct.percent_rate,
    ct.flat_rate,
    ct.num_people,
    
    -- Payment metrics
    lp.last_payment_date,
    lp.last_payment_amount,
    lp.last_recorded_assets AS aum,
    ytd.total_ytd_payments,
    
    -- Latest payment period info (kept for compatibility)
    lp.applied_period AS last_applied_period,
    lp.applied_year AS last_applied_year,
    lp.applied_period_type AS last_applied_period_type,
    
    -- Current period calculations (BILLING IN ARREARS - ONE PERIOD PRIOR)
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
    
    -- Current quarter (for progress tracking)
    DATEPART(QUARTER, GETDATE()) as current_quarter,
    
    -- Formatted period display (NEW) - e.g., "June 2025" or "Q2 2025"
    CASE 
        WHEN ct.payment_schedule = 'monthly' THEN
            CASE 
                WHEN MONTH(GETDATE()) = 1 THEN 'December ' + CAST(YEAR(GETDATE()) - 1 AS VARCHAR)
                ELSE 
                    CASE MONTH(GETDATE()) - 1
                        WHEN 1 THEN 'January '
                        WHEN 2 THEN 'February '
                        WHEN 3 THEN 'March '
                        WHEN 4 THEN 'April '
                        WHEN 5 THEN 'May '
                        WHEN 6 THEN 'June '
                        WHEN 7 THEN 'July '
                        WHEN 8 THEN 'August '
                        WHEN 9 THEN 'September '
                        WHEN 10 THEN 'October '
                        WHEN 11 THEN 'November '
                        WHEN 12 THEN 'December '
                    END + CAST(YEAR(GETDATE()) AS VARCHAR)
            END
        WHEN ct.payment_schedule = 'quarterly' THEN
            'Q' + CAST(
                CASE WHEN DATEPART(QUARTER, GETDATE()) = 1 THEN 4 ELSE DATEPART(QUARTER, GETDATE()) - 1 END
            AS VARCHAR) + ' ' + CAST(
                CASE WHEN DATEPART(QUARTER, GETDATE()) = 1 THEN YEAR(GETDATE()) - 1 ELSE YEAR(GETDATE()) END 
            AS VARCHAR)
    END AS current_period_display,
    
    -- Quarterly progress info (NEW)
    ISNULL(qp.payments_in_quarter, 0) as current_quarter_payments,
    CASE 
        WHEN ct.payment_schedule = 'monthly' THEN 3
        WHEN ct.payment_schedule = 'quarterly' THEN 1
    END as expected_payments_per_quarter,
    
    -- AUM handling
    CASE 
        WHEN lp.last_recorded_assets IS NOT NULL THEN lp.last_recorded_assets
        WHEN ct.fee_type = 'percentage' AND lp.last_payment_amount IS NOT NULL AND ct.percent_rate > 0 THEN
            lp.last_payment_amount / ct.percent_rate
        ELSE NULL
    END AS aum_estimated,
    
    CASE 
        WHEN lp.last_recorded_assets IS NOT NULL THEN 'recorded'
        WHEN ct.fee_type = 'percentage' AND lp.last_payment_amount IS NOT NULL AND ct.percent_rate > 0 THEN 'estimated'
        ELSE NULL
    END AS aum_source,
    
    -- Expected fee calculation
    CASE
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate
        WHEN ct.fee_type = 'percentage' AND 
             (lp.last_recorded_assets IS NOT NULL OR 
              (lp.last_payment_amount IS NOT NULL AND ct.percent_rate > 0)) THEN 
            ROUND(
                CASE 
                    WHEN lp.last_recorded_assets IS NOT NULL THEN lp.last_recorded_assets
                    ELSE lp.last_payment_amount / ct.percent_rate
                END * ct.percent_rate, 2)
        ELSE NULL
    END AS expected_fee,
    
    -- Payment status (BILLING IN ARREARS)
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
    
    -- Fee rates (kept for compatibility)
    CASE 
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate
        WHEN ct.fee_type = 'percentage' THEN ct.percent_rate * 100
    END as monthly_rate,
    CASE 
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate * 3
        WHEN ct.fee_type = 'percentage' THEN ct.percent_rate * 100 * 3
    END as quarterly_rate,
    CASE 
        WHEN ct.fee_type = 'flat' THEN ct.flat_rate * 12
        WHEN ct.fee_type = 'percentage' THEN ct.percent_rate * 100 * 12
    END as annual_rate
    
FROM clients c
JOIN contracts ct ON c.client_id = ct.client_id
LEFT JOIN contacts con ON c.client_id = con.client_id 
    AND con.contact_type = 'Primary'  -- Get primary contact
LEFT JOIN LastPayment lp ON c.client_id = lp.client_id AND lp.rn = 1
LEFT JOIN QuarterlyProgress qp ON c.client_id = qp.client_id 
    AND qp.quarter = DATEPART(QUARTER, GETDATE())
    AND qp.applied_year = YEAR(GETDATE())
LEFT JOIN (
    SELECT client_id, SUM(actual_fee) as total_ytd_payments
    FROM payments 
    WHERE applied_year = YEAR(GETDATE())
    GROUP BY client_id
) ytd ON c.client_id = ytd.client_id;
GO

-- Verify the view was created successfully
SELECT TOP 5 
    client_id,
    display_name,
    contact_name,
    phone,
    physical_address,
    current_period_display,
    payment_status,
    current_quarter_payments,
    expected_payments_per_quarter,
    aum,
    expected_fee
FROM [dbo].[dashboard_view]
ORDER BY client_id;
GO

PRINT 'Dashboard view updated successfully!';
PRINT '';
PRINT 'New fields added:';
PRINT '- contact_name: Primary contact name';
PRINT '- phone: Contact phone number';
PRINT '- physical_address: Contact address';
PRINT '- current_period_display: Formatted period like "June 2025" or "Q2 2025"';
PRINT '- current_quarter: Current calendar quarter';
PRINT '- current_quarter_payments: Number of payments made in current quarter';
PRINT '- expected_payments_per_quarter: Expected payments per quarter (3 for monthly, 1 for quarterly)';
PRINT '';
PRINT 'Note: Billing remains in arrears (current_period is one period prior)';