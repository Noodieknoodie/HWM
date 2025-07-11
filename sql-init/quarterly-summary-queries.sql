-- sql-init/quarterly-summary-queries.sql
-- Example queries for the application to use with the fixed views

-- Query 1: Get quarterly summary including ALL clients for accurate collection rate
-- This should be used in the Summary page's main query
WITH quarterly_data AS (
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
        payment_count,
        actual_total,
        expected_total,
        posted_count,
        last_aum,
        expected_payment_count,
        variance,
        variance_percent,
        fully_posted
    FROM quarterly_summary_by_provider
    WHERE 
        (applied_year = @year AND quarter = @quarter)  -- Clients with payments in this quarter
        OR (payment_count = 0)  -- Include ALL clients without any payments
),
-- For clients without payments in the target quarter, we need their expected fees
expected_fees AS (
    SELECT 
        c.client_id,
        ct.provider_name,
        c.display_name,
        ct.payment_schedule,
        ct.fee_type,
        ct.percent_rate,
        ct.flat_rate,
        qef.quarterly_expected_fee
    FROM clients c
    INNER JOIN contracts ct ON c.client_id = ct.client_id AND ct.is_active = 1
    LEFT JOIN quarterly_expected_fees qef ON c.client_id = qef.client_id
    WHERE c.client_id NOT IN (
        SELECT DISTINCT client_id 
        FROM quarterly_summary_by_provider 
        WHERE applied_year = @year AND quarter = @quarter
    )
)
-- Combine clients with payments and those without
SELECT 
    COALESCE(qd.provider_name, ef.provider_name) as provider_name,
    COALESCE(qd.client_id, ef.client_id) as client_id,
    COALESCE(qd.display_name, ef.display_name) as display_name,
    COALESCE(qd.payment_schedule, ef.payment_schedule) as payment_schedule,
    COALESCE(qd.fee_type, ef.fee_type) as fee_type,
    COALESCE(qd.percent_rate, ef.percent_rate) as percent_rate,
    COALESCE(qd.flat_rate, ef.flat_rate) as flat_rate,
    @year as applied_year,
    @quarter as quarter,
    COALESCE(qd.payment_count, 0) as payment_count,
    COALESCE(qd.actual_total, 0) as actual_total,
    COALESCE(qd.expected_total, ef.quarterly_expected_fee, 0) as expected_total,
    COALESCE(qd.posted_count, 0) as posted_count,
    qd.last_aum,
    CASE 
        WHEN COALESCE(qd.payment_schedule, ef.payment_schedule) = 'monthly' THEN 3
        WHEN COALESCE(qd.payment_schedule, ef.payment_schedule) = 'quarterly' THEN 1
        ELSE 0
    END as expected_payment_count,
    COALESCE(qd.actual_total, 0) - COALESCE(qd.expected_total, ef.quarterly_expected_fee, 0) as variance,
    CASE 
        WHEN COALESCE(qd.expected_total, ef.quarterly_expected_fee, 0) = 0 THEN NULL
        ELSE ((COALESCE(qd.actual_total, 0) - COALESCE(qd.expected_total, ef.quarterly_expected_fee, 0)) / ABS(COALESCE(qd.expected_total, ef.quarterly_expected_fee, 0))) * 100
    END as variance_percent,
    COALESCE(qd.fully_posted, 0) as fully_posted
FROM quarterly_data qd
FULL OUTER JOIN expected_fees ef ON qd.client_id = ef.client_id
ORDER BY 
    provider_name,
    display_name;

-- Query 2: Get accurate collection rate for ALL clients
-- This gives the true collection rate including clients who haven't paid
SELECT 
    SUM(actual_total) as total_received,
    SUM(expected_total) as total_expected,
    CASE 
        WHEN SUM(expected_total) = 0 THEN 0
        ELSE (SUM(actual_total) / SUM(expected_total)) * 100
    END as collection_rate
FROM (
    -- Use the combined query from above
    -- This ensures we count expected fees for ALL clients
);

-- Query 3: Annual summary data
-- For annual view, we need to aggregate all quarters
WITH annual_data AS (
    SELECT 
        provider_name,
        client_id,
        display_name,
        payment_schedule,
        fee_type,
        percent_rate,
        flat_rate,
        applied_year,
        SUM(CASE WHEN quarter = 1 THEN actual_total ELSE 0 END) as q1_actual,
        SUM(CASE WHEN quarter = 2 THEN actual_total ELSE 0 END) as q2_actual,
        SUM(CASE WHEN quarter = 3 THEN actual_total ELSE 0 END) as q3_actual,
        SUM(CASE WHEN quarter = 4 THEN actual_total ELSE 0 END) as q4_actual,
        SUM(CASE WHEN quarter = 1 THEN payment_count ELSE 0 END) as q1_payments,
        SUM(CASE WHEN quarter = 2 THEN payment_count ELSE 0 END) as q2_payments,
        SUM(CASE WHEN quarter = 3 THEN payment_count ELSE 0 END) as q3_payments,
        SUM(CASE WHEN quarter = 4 THEN payment_count ELSE 0 END) as q4_payments,
        SUM(actual_total) as total_actual,
        SUM(expected_total) as total_expected,
        MAX(last_aum) as last_aum
    FROM quarterly_summary_by_provider
    WHERE applied_year = @year
    GROUP BY 
        provider_name,
        client_id,
        display_name,
        payment_schedule,
        fee_type,
        percent_rate,
        flat_rate,
        applied_year
)
SELECT * FROM annual_data
ORDER BY provider_name, display_name;

-- Note: The application should handle NULL expected_total values
-- For percentage-based clients without any payments, we can't calculate expected fees
-- The UI should display these as "--" or "N/A" rather than $0