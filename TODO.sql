## I Understand
the Mission

**Current State**:
- PSWM Inc has wrong rate
(0.125 should be 0.000417)
- `expected_fee` column in payments table is unreliable garbage
- Our views correctly ignore it and calculate fresh
- Variance status aggregation is broken
(showing "exact" for huge variances)
- Everything else in our approach is sound

**
End Goal**:
- ALL clients show in summaries
(even
with no payments)
- Expected fees calculated
with 3-tier fallback for missing AUM
- Variance status calculated correctly from aggregated amounts
- Clean quarterly and yearly rollups

## Complete Surgical Fix Script

```sql
-- ========================================
-- STEP 1: FIX DATA ISSUES
-- ========================================
-- Fix PSWM Inc rate (was 12.5% monthly, should be 0.0417% monthly)
UPDATE contracts 
SET percent_rate = 0.000417 
WHERE client_id = 22;

-- Add a note about the expected_fee column being unreliable
-- (No SQL needed, just a dev note: DO NOT TRUST payments.expected_fee)

-- ========================================
-- STEP 2: DROP ALL VIEWS IN REVERSE DEPENDENCY ORDER
-- ========================================
DROP VIEW IF EXISTS [dbo].[yearly_summaries_view];
DROP VIEW IF EXISTS [dbo].[quarterly_summary_aggregated];
DROP VIEW IF EXISTS [dbo].[comprehensive_payment_summary];
DROP FUNCTION IF EXISTS [dbo].[calculate_expected_fee];
DROP VIEW IF EXISTS [dbo].[client_period_matrix];
GO

-- ========================================
-- STEP 3: RECREATE VIEWS WITH FIXED VARIANCE STATUS
-- ========================================

-- 3A: Client Period Matrix (unchanged)
CREATE VIEW [dbo].[client_period_matrix]
AS
    WITH
        CurrentPeriodInfo
        AS
        (
            SELECT
                CASE WHEN MONTH(GETDATE()) = 1 THEN YEAR(GETDATE()) - 1 ELSE YEAR(GETDATE()) END as current_year,
                CASE WHEN MONTH(GETDATE()) = 1 THEN 12 ELSE MONTH(GETDATE()) - 1 END as current_month,
                CASE WHEN DATEPART(QUARTER, GETDATE()) = 1 THEN YEAR(GETDATE()) - 1 ELSE YEAR(GETDATE()) END as current_quarter_year,
                CASE WHEN DATEPART(QUARTER, GETDATE()) = 1 THEN 4 ELSE DATEPART(QUARTER, GETDATE()) - 1 END as current_quarter
        )
    SELECT
        c.client_id,
        c.display_name,
        c.full_name,
        ct.contract_id,
        ct.provider_name,
        ct.payment_schedule,
        ct.fee_type,
        ct.percent_rate,
        ct.flat_rate,
        ct.contract_start_date,
        pp.year,
        pp.period,
        pp.period_type,
        CASE 
        WHEN pp.period_type = 'monthly' THEN 
            CASE 
                WHEN pp.period IN (1, 2, 3) THEN 1
                WHEN pp.period IN (4, 5, 6) THEN 2
                WHEN pp.period IN (7, 8, 9) THEN 3
                WHEN pp.period IN (10, 11, 12) THEN 4
            END
        WHEN pp.period_type = 'quarterly' THEN pp.period
    END as quarter,
        CASE 
        WHEN pp.period_type = 'monthly' THEN pp.period_name
        WHEN pp.period_type = 'quarterly' THEN 'Q' + CAST(pp.period AS VARCHAR) + ' ' + CAST(pp.year AS VARCHAR)
    END as period_display,
        cpi.current_year,
        cpi.current_month,
        cpi.current_quarter_year,
        cpi.current_quarter
    FROM clients c
        INNER JOIN contracts ct ON c.client_id = ct.client_id
CROSS JOIN payment_periods pp
CROSS JOIN CurrentPeriodInfo cpi
    WHERE pp.period_type = ct.payment_schedule
        AND pp.start_date >= ISNULL(ct.contract_start_date, '2019-01-01')
        AND pp.end_date <= GETDATE();
GO

-- 3B: Calculate Expected Fee Function (unchanged)
CREATE FUNCTION [dbo].[calculate_expected_fee](
    @client_id INT,
    @fee_type NVARCHAR(50),
    @percent_rate FLOAT,
    @flat_rate FLOAT,
    @period_type NVARCHAR(10),
    @year INT,
    @period INT
)
RETURNS FLOAT
AS
BEGIN
    DECLARE @expected_fee FLOAT = NULL;

    IF @fee_type = 'flat'
    BEGIN
        SET @expected_fee = @flat_rate;
    END
    ELSE IF @fee_type = 'percentage' AND @percent_rate IS NOT NULL
    BEGIN
        -- First try: Get AUM from the specific period payment
        SELECT @expected_fee = ROUND(total_assets * @percent_rate, 2)
        FROM payments
        WHERE client_id = @client_id
            AND applied_year = @year
            AND applied_period = @period
            AND applied_period_type = @period_type
            AND total_assets IS NOT NULL;

        -- Second try: Get most recent AUM before this period
        IF @expected_fee IS NULL
        BEGIN
            SELECT TOP 1
                @expected_fee = ROUND(total_assets * @percent_rate, 2)
            FROM payments
            WHERE client_id = @client_id
                AND total_assets IS NOT NULL
                AND (applied_year < @year OR
                (applied_year = @year AND applied_period < @period))
            ORDER BY applied_year DESC, applied_period DESC;
        END

        -- Third try: Use last payment amount as fallback
        IF @expected_fee IS NULL
        BEGIN
            DECLARE @last_payment FLOAT;
            SELECT TOP 1
                @last_payment = actual_fee
            FROM payments
            WHERE client_id = @client_id
                AND actual_fee IS NOT NULL
                AND (applied_year < @year OR
                (applied_year = @year AND applied_period < @period))
            ORDER BY applied_year DESC, applied_period DESC;

            IF @last_payment IS NOT NULL AND @percent_rate > 0
            BEGIN
                SET @expected_fee = ROUND(@last_payment, 2);
            END
        END
    END

    RETURN @expected_fee;
END;
GO

-- 3C: Comprehensive Payment Summary (unchanged)
CREATE VIEW [dbo].[comprehensive_payment_summary]
AS
    SELECT
        cpm.client_id,
        cpm.display_name,
        cpm.contract_id,
        cpm.provider_name,
        cpm.payment_schedule,
        cpm.fee_type,
        cpm.percent_rate,
        cpm.flat_rate,
        cpm.year,
        cpm.period,
        cpm.period_type,
        cpm.quarter,
        cpm.period_display,
        p.payment_id,
        p.received_date,
        p.actual_fee,
        p.total_assets,
        p.method,
        p.notes,
        p.posted_to_hwm,
        dbo.calculate_expected_fee(
        cpm.client_id,
        cpm.fee_type,
        cpm.percent_rate,
        cpm.flat_rate,
        cpm.period_type,
        cpm.year,
        cpm.period
    ) as expected_fee,
        ROUND(
        CASE 
            WHEN p.payment_id IS NOT NULL THEN
                p.actual_fee - dbo.calculate_expected_fee(
                    cpm.client_id,
                    cpm.fee_type,
                    cpm.percent_rate,
                    cpm.flat_rate,
                    cpm.period_type,
                    cpm.year,
                    cpm.period
                )
            ELSE NULL
        END, 
        2
    ) as variance_amount,
        ROUND(
        CASE 
            WHEN p.payment_id IS NOT NULL AND dbo.calculate_expected_fee(cpm.client_id, cpm.fee_type, cpm.percent_rate, cpm.flat_rate, cpm.period_type, cpm.year, cpm.period) > 0 THEN
                ((p.actual_fee - dbo.calculate_expected_fee(cpm.client_id, cpm.fee_type, cpm.percent_rate, cpm.flat_rate, cpm.period_type, cpm.year, cpm.period)) / 
                 dbo.calculate_expected_fee(cpm.client_id, cpm.fee_type, cpm.percent_rate, cpm.flat_rate, cpm.period_type, cpm.year, cpm.period)) * 100
            ELSE NULL
        END,
        1
    ) as variance_percent,
        CASE 
        WHEN p.payment_id IS NULL THEN 'no_payment'
        WHEN dbo.calculate_expected_fee(cpm.client_id, cpm.fee_type, cpm.percent_rate, cpm.flat_rate, cpm.period_type, cpm.year, cpm.period) IS NULL THEN 'unknown'
        WHEN ABS(p.actual_fee - dbo.calculate_expected_fee(cpm.client_id, cpm.fee_type, cpm.percent_rate, cpm.flat_rate, cpm.period_type, cpm.year, cpm.period)) < 0.01 THEN 'exact'
        WHEN ABS(((p.actual_fee - dbo.calculate_expected_fee(cpm.client_id, cpm.fee_type, cpm.percent_rate, cpm.flat_rate, cpm.period_type, cpm.year, cpm.period)) / 
                  dbo.calculate_expected_fee(cpm.client_id, cpm.fee_type, cpm.percent_rate, cpm.flat_rate, cpm.period_type, cpm.year, cpm.period)) * 100) <= 5 THEN 'acceptable'
        WHEN ABS(((p.actual_fee - dbo.calculate_expected_fee(cpm.client_id, cpm.fee_type, cpm.percent_rate, cpm.flat_rate, cpm.period_type, cpm.year, cpm.period)) / 
                  dbo.calculate_expected_fee(cpm.client_id, cpm.fee_type, cpm.percent_rate, cpm.flat_rate, cpm.period_type, cpm.year, cpm.period)) * 100) <= 15 THEN 'warning'
        ELSE 'alert'
    END as variance_status
    FROM client_period_matrix cpm
        LEFT JOIN payments p ON 
    p.client_id = cpm.client_id
            AND p.applied_year = cpm.year
            AND p.applied_period = cpm.period
            AND p.applied_period_type = cpm.period_type;
GO

-- 3D: Quarterly Summary Aggregated (FIXED VARIANCE STATUS)
CREATE VIEW [dbo].[quarterly_summary_aggregated]
AS
    SELECT
        provider_name,
        client_id,
        display_name,
        payment_schedule,
        fee_type,
        percent_rate,
        flat_rate,
        year as applied_year,
        quarter,
        COUNT(CASE WHEN payment_id IS NOT NULL THEN 1 END) as payment_count,
        CASE 
        WHEN payment_schedule = 'monthly' THEN 3
        WHEN payment_schedule = 'quarterly' THEN 1
    END as expected_payment_count,
        ROUND(COALESCE(SUM(actual_fee), 0), 2) as actual_total,
        ROUND(COALESCE(SUM(expected_fee), 0), 2) as expected_total,
        ROUND(COALESCE(SUM(actual_fee), 0) - COALESCE(SUM(expected_fee), 0), 2) as variance,
        CASE 
        WHEN COALESCE(SUM(expected_fee), 0) = 0 THEN NULL
        ELSE ROUND(((COALESCE(SUM(actual_fee), 0) - COALESCE(SUM(expected_fee), 0)) / ABS(COALESCE(SUM(expected_fee), 0))) * 100, 1)
    END as variance_percent,
        -- FIXED: Calculate status from aggregated amounts, not aggregate the statuses
        CASE 
        WHEN COUNT(payment_id) = 0 THEN 'no_payment'
        WHEN COALESCE(SUM(expected_fee), 0) = 0 THEN 'unknown'
        WHEN ABS(COALESCE(SUM(actual_fee), 0) - COALESCE(SUM(expected_fee), 0)) < 0.01 THEN 'exact'
        WHEN ABS(((COALESCE(SUM(actual_fee), 0) - COALESCE(SUM(expected_fee), 0)) / COALESCE(SUM(expected_fee), 0)) * 100) <= 5 THEN 'acceptable'
        WHEN ABS(((COALESCE(SUM(actual_fee), 0) - COALESCE(SUM(expected_fee), 0)) / COALESCE(SUM(expected_fee), 0)) * 100) <= 15 THEN 'warning'
        ELSE 'alert'
    END as variance_status,
        COUNT(CASE WHEN posted_to_hwm = 1 THEN 1 END) as posted_count,
        CASE 
        WHEN COUNT(payment_id) = 0 THEN 0
        WHEN COUNT(CASE WHEN posted_to_hwm = 1 THEN 1 END) = COUNT(payment_id) THEN 1
        ELSE 0
    END as fully_posted,
        MAX(total_assets) as last_aum
    FROM comprehensive_payment_summary
    GROUP BY 
    provider_name,
    client_id,
    display_name,
    payment_schedule,
    fee_type,
    percent_rate,
    flat_rate,
    year,
    quarter;
GO

-- 3E: Yearly Summary View (FIXED VARIANCE STATUS)
CREATE VIEW [dbo].[yearly_summaries_view]
AS
    SELECT
        provider_name,
        client_id,
        display_name,
        payment_schedule,
        fee_type,
        percent_rate,
        flat_rate,
        applied_year as year,
        SUM(payment_count) as payment_count,
        SUM(expected_payment_count) as expected_payment_count,
        ROUND(SUM(actual_total), 2) as actual_total,
        ROUND(SUM(expected_total), 2) as expected_total,
        ROUND(SUM(actual_total) - SUM(expected_total), 2) as variance,
        CASE 
        WHEN SUM(expected_total) = 0 THEN NULL
        ELSE ROUND(((SUM(actual_total) - SUM(expected_total)) / ABS(SUM(expected_total))) * 100, 1)
    END as variance_percent,
        -- FIXED: Calculate status from yearly totals
        CASE 
        WHEN SUM(payment_count) = 0 THEN 'no_payment'
        WHEN SUM(expected_total) = 0 THEN 'unknown'
        WHEN ABS(SUM(actual_total) - SUM(expected_total)) < 0.01 THEN 'exact'
        WHEN ABS(((SUM(actual_total) - SUM(expected_total)) / SUM(expected_total)) * 100) <= 5 THEN 'acceptable'
        WHEN ABS(((SUM(actual_total) - SUM(expected_total)) / SUM(expected_total)) * 100) <= 15 THEN 'warning'
        ELSE 'alert'
    END as variance_status,
        SUM(posted_count) as posted_count,
        CASE 
        WHEN SUM(payment_count) = 0 THEN 0
        WHEN SUM(posted_count) = SUM(payment_count) THEN 1
        ELSE 0
    END as fully_posted,
        MAX(CASE WHEN quarter = 1 THEN actual_total ELSE 0 END) as q1_actual,
        MAX(CASE WHEN quarter = 2 THEN actual_total ELSE 0 END) as q2_actual,
        MAX(CASE WHEN quarter = 3 THEN actual_total ELSE 0 END) as q3_actual,
        MAX(CASE WHEN quarter = 4 THEN actual_total ELSE 0 END) as q4_actual,
        MAX(CASE WHEN quarter = 1 THEN payment_count ELSE 0 END) as q1_payments,
        MAX(CASE WHEN quarter = 2 THEN payment_count ELSE 0 END) as q2_payments,
        MAX(CASE WHEN quarter = 3 THEN payment_count ELSE 0 END) as q3_payments,
        MAX(CASE WHEN quarter = 4 THEN payment_count ELSE 0 END) as q4_payments
    FROM quarterly_summary_aggregated
    GROUP BY 
    provider_name,
    client_id,
    display_name,
    payment_schedule,
    fee_type,
    percent_rate,
    flat_rate,
    applied_year;
GO

-- ========================================
-- STEP 4: VERIFY EVERYTHING WORKS
-- ========================================
-- Test PSWM Inc fix
SELECT
    display_name,
    expected_fee,
    variance_status
FROM comprehensive_payment_summary
WHERE client_id = 22 AND year = 2025 AND quarter = 2;

-- Test variance status aggregation
SELECT
    display_name,
    payment_count,
    expected_payment_count,
    actual_total,
    expected_total,
    variance_percent,
    variance_status
FROM quarterly_summary_aggregated
WHERE applied_year = 2025 AND quarter = 2
    AND display_name IN ('Dakota Creek', 'PSWM Inc', 'Opportunity Interactive');

-- Test yearly view
SELECT
    display_name,
    payment_count,
    expected_payment_count,
    variance_percent,
    variance_status
FROM yearly_summaries_view
WHERE year = 2025;
```

## What Can't Be Done in SQL

**Nothing!** This script handles everything:
- Fixes the data issue (PSWM rate)
- Drops and recreates all views in correct order
- Fixes the variance status calculation
- Tests the results

Just run this entire script and we're done. The `expected_fee` column in payments table remains unreliable, but our views properly ignore it and calculate fresh.