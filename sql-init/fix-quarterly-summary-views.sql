-- sql-init/fix-quarterly-summary-views.sql
-- Fix quarterly summary views to include ALL clients regardless of payment status
-- This ensures accurate collection rate calculations and complete client listings
-- For Azure SQL Database

-- Drop existing views in correct order (dependencies first)
IF OBJECT_ID('dbo.quarterly_summary_by_provider', 'V') IS NOT NULL
    DROP VIEW quarterly_summary_by_provider;
GO

IF OBJECT_ID('dbo.quarterly_summary_detail', 'V') IS NOT NULL
    DROP VIEW quarterly_summary_detail;
GO

IF OBJECT_ID('dbo.quarterly_expected_fees', 'V') IS NOT NULL
    DROP VIEW quarterly_expected_fees;
GO

-- Recreate quarterly_summary_detail starting from clients table with LEFT JOINs
-- This ensures ALL clients are included, even those without payments
CREATE VIEW quarterly_summary_detail AS
SELECT 
    c.client_id,
    c.display_name,
    ct.contract_id,
    ct.provider_name,
    ct.payment_schedule,
    ct.fee_type,
    ct.percent_rate,
    ct.flat_rate,
    -- Payment data (will be NULL for clients without payments)
    p.payment_id,
    p.received_date,
    p.actual_fee,
    p.expected_fee,
    p.total_assets,
    p.method,
    p.posted_to_hwm,
    p.applied_period,
    p.applied_period_type,
    p.applied_year,
    -- Calculate quarter from period
    CASE 
        WHEN p.applied_period_type = 'monthly' THEN 
            CASE 
                WHEN p.applied_period IN (1, 2, 3) THEN 1
                WHEN p.applied_period IN (4, 5, 6) THEN 2
                WHEN p.applied_period IN (7, 8, 9) THEN 3
                WHEN p.applied_period IN (10, 11, 12) THEN 4
            END
        WHEN p.applied_period_type = 'quarterly' THEN p.applied_period
        ELSE NULL
    END as quarter,
    -- Calculate expected fee based on contract terms (for clients without payments)
    CASE 
        WHEN p.payment_id IS NULL THEN
            CASE
                WHEN ct.fee_type = 'percentage' AND ct.percent_rate IS NOT NULL THEN
                    -- For percentage fees, we'd need AUM which we don't have without payments
                    -- So we'll leave this as NULL
                    NULL
                WHEN ct.fee_type = 'flat' AND ct.flat_rate IS NOT NULL THEN
                    -- For flat fees, we can calculate expected
                    CASE
                        WHEN ct.payment_schedule = 'monthly' THEN ct.flat_rate
                        WHEN ct.payment_schedule = 'quarterly' THEN ct.flat_rate
                        ELSE NULL
                    END
                ELSE NULL
            END
        ELSE p.expected_fee
    END as calculated_expected_fee
FROM clients c
INNER JOIN contracts ct ON c.client_id = ct.client_id
LEFT JOIN payments p ON c.client_id = p.client_id 
    AND p.contract_id = ct.contract_id
    -- Add year/quarter filtering in the application query, not here
ORDER BY ct.provider_name, c.display_name, p.applied_year DESC, p.applied_period DESC;
GO

-- Recreate quarterly_summary_by_provider to aggregate ALL clients
CREATE VIEW quarterly_summary_by_provider AS
SELECT 
    provider_name,
    client_id,
    display_name,
    payment_schedule,
    fee_type,
    percent_rate,
    flat_rate,
    applied_year,
    quarter,
    -- Count actual payments made
    COUNT(payment_id) as payment_count,
    -- Sum actual payments
    COALESCE(SUM(actual_fee), 0) as actual_total,
    -- For expected total, use the calculated expected fee
    -- For percentage-based fees without payments, this will be NULL
    COALESCE(SUM(calculated_expected_fee), 0) as expected_total,
    -- Count posted payments
    SUM(CASE WHEN posted_to_hwm = 1 THEN 1 ELSE 0 END) as posted_count,
    -- Get last AUM from most recent payment
    MAX(total_assets) as last_aum,
    -- Calculate expected payment count based on schedule
    CASE 
        WHEN payment_schedule = 'monthly' THEN 3  -- 3 payments per quarter
        WHEN payment_schedule = 'quarterly' THEN 1  -- 1 payment per quarter
        ELSE 0
    END as expected_payment_count,
    -- Variance calculation
    COALESCE(SUM(actual_fee), 0) - COALESCE(SUM(calculated_expected_fee), 0) as variance,
    -- Variance percentage (handle division by zero)
    CASE 
        WHEN COALESCE(SUM(calculated_expected_fee), 0) = 0 THEN NULL
        ELSE ((COALESCE(SUM(actual_fee), 0) - COALESCE(SUM(calculated_expected_fee), 0)) / ABS(COALESCE(SUM(calculated_expected_fee), 0))) * 100
    END as variance_percent,
    -- Check if all expected payments are posted
    CASE 
        WHEN COUNT(payment_id) = 0 THEN 0  -- No payments made
        WHEN SUM(CASE WHEN posted_to_hwm = 1 THEN 1 ELSE 0 END) = COUNT(payment_id) THEN 1
        ELSE 0
    END as fully_posted
FROM quarterly_summary_detail
GROUP BY 
    provider_name,
    client_id,
    display_name,
    payment_schedule,
    fee_type,
    percent_rate,
    flat_rate,
    applied_year,
    quarter
ORDER BY 
    provider_name,
    display_name;
GO

-- Add a helper view to get expected fees for clients without payments
-- This view calculates expected quarterly fees based on contract terms and recent AUM
CREATE VIEW quarterly_expected_fees AS
SELECT 
    c.client_id,
    ct.payment_schedule,
    ct.fee_type,
    ct.percent_rate,
    ct.flat_rate,
    -- Get most recent AUM from any payment
    (SELECT MAX(total_assets) 
     FROM payments p2 
     WHERE p2.client_id = c.client_id 
     AND p2.total_assets IS NOT NULL) as recent_aum,
    -- Calculate quarterly expected fee
    CASE
        WHEN ct.fee_type = 'flat' THEN
            CASE
                WHEN ct.payment_schedule = 'monthly' THEN ct.flat_rate * 3  -- 3 months per quarter
                WHEN ct.payment_schedule = 'quarterly' THEN ct.flat_rate
                ELSE NULL
            END
        WHEN ct.fee_type = 'percentage' AND ct.percent_rate IS NOT NULL THEN
            -- Use recent AUM if available
            CASE
                WHEN ct.payment_schedule = 'monthly' THEN 
                    (SELECT MAX(total_assets) FROM payments p2 WHERE p2.client_id = c.client_id AND p2.total_assets IS NOT NULL) * (ct.percent_rate / 100) * 3
                WHEN ct.payment_schedule = 'quarterly' THEN 
                    (SELECT MAX(total_assets) FROM payments p2 WHERE p2.client_id = c.client_id AND p2.total_assets IS NOT NULL) * (ct.percent_rate / 100)
                ELSE NULL
            END
        ELSE NULL
    END as quarterly_expected_fee
FROM clients c
INNER JOIN contracts ct ON c.client_id = ct.client_id;
GO

-- Note: The application should now filter these views by year and quarter
-- Example query:
-- SELECT * FROM quarterly_summary_by_provider 
-- WHERE applied_year = 2025 AND quarter = 2
-- OR (applied_year IS NULL AND quarter IS NULL)  -- Include clients with no payments

-- The collection rate can now be calculated accurately as:
-- SUM(actual_total) / SUM(expected_total) * 100
-- Where expected_total includes ALL clients, not just those with payments