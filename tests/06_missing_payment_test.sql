-- =============================================
-- Test Suite: Missing Payments & Compliance
-- Tests gap detection and compliance rates
-- =============================================

DECLARE @test_suite VARCHAR(50) = 'Missing Payments';
DELETE FROM test_results WHERE test_suite = @test_suite;

PRINT 'Running Missing Payment Tests...';

-- Test 1: Missing payment detection (client 30, 2022)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Missing payment detection',
    30,
    'Feb 2022 should show as missing',
    'no_payment',
    ISNULL(variance_status, 'no_payment'),
    CASE 
        WHEN payment_id IS NULL AND period = 2 THEN 1 
        ELSE 0 
    END
FROM comprehensive_payment_summary
WHERE client_id = 30 
    AND year = 2022 
    AND period = 2;

-- Test 2: Compliance rate calculation (75% for 2022)
WITH ComplianceCalc AS (
    SELECT 
        client_id,
        COUNT(DISTINCT period) as total_periods,  -- Changed to DISTINCT
        COUNT(DISTINCT CASE WHEN payment_id IS NOT NULL THEN period END) as paid_periods  -- Changed to DISTINCT
    FROM comprehensive_payment_summary
    WHERE client_id = 30 
        AND year = 2022
    GROUP BY client_id
)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Compliance rate 2022',
    client_id,
    '9 of 12 months paid',
    '75.00',
    CAST(ROUND(paid_periods * 100.0 / total_periods, 2) AS VARCHAR),
    CASE 
        WHEN ROUND(paid_periods * 100.0 / total_periods, 2) = 75.00 THEN 1 
        ELSE 0 
    END
FROM ComplianceCalc;

-- Test 3: Duplicate payment handling (June 2022)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Duplicate payment count',
    30,
    'June 2022 has 2 payments',
    '2',
    CAST(COUNT(*) AS VARCHAR),
    CASE WHEN COUNT(*) = 2 THEN 1 ELSE 0 END
FROM payments
WHERE client_id = 30 
    AND applied_year = 2022 
    AND applied_period = 6;

-- Test 4: Quarterly summary handles duplicates
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Quarterly sum includes duplicates',
    30,
    'Q2 2022 total includes both June payments',
    '3600.00',  -- Changed from 2400.00
    CAST(actual_total AS VARCHAR),
    CASE WHEN actual_total = 3600.00 THEN 1 ELSE 0 END
FROM quarterly_summary_aggregated
WHERE client_id = 30 
    AND applied_year = 2022 
    AND quarter = 2;

-- Test 5: Near-zero payment (0.01) doesn't break calculations
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Near-zero payment variance',
    32,
    'Apr 2022 $0.01 payment',
    'alert',
    variance_status,
    CASE WHEN variance_status = 'alert' THEN 1 ELSE 0 END
FROM payment_history_view
WHERE client_id = 32 
    AND applied_year = 2022 
    AND applied_period = 4
    AND actual_fee = 0.01;

DECLARE @total INT = (SELECT COUNT(*) FROM test_results WHERE test_suite = @test_suite);
DECLARE @passed INT = (SELECT COUNT(*) FROM test_results WHERE test_suite = @test_suite AND pass_fail = 1);

PRINT 'Missing Payment Tests Complete: ' + CAST(@passed AS VARCHAR) + '/' + CAST(@total AS VARCHAR) + ' passed';
PRINT '';