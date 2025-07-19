-- =============================================
-- Test Suite: Variance Thresholds
-- Tests exact/acceptable/warning/alert statuses
-- =============================================

DECLARE @test_suite VARCHAR(50) = 'Variance Thresholds';
DELETE FROM test_results WHERE test_suite = @test_suite;

PRINT 'Running Variance Threshold Tests...';

-- Test 1: $0.01 threshold (exact status) - Small payment
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Exact threshold - small payment',
    payment_id,
    'Jan 2023: $1200 expected, $1199.99 actual',
    'exact',
    variance_status,
    CASE WHEN variance_status = 'exact' THEN 1 ELSE 0 END
FROM payment_history_view
WHERE client_id = 30 
    AND applied_year = 2023 
    AND applied_period = 1;

-- Test 2: $0.01 threshold (exact status) - Large payment
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Exact threshold - large payment',
    payment_id,
    'Q1 2023: $3600 expected, $3599.99 actual',
    'exact',
    variance_status,
    CASE WHEN variance_status = 'exact' THEN 1 ELSE 0 END
FROM payment_history_view
WHERE client_id = 31 
    AND applied_year = 2023 
    AND applied_period = 1;

-- Test 3: 5% variance (acceptable status)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    '5% over - acceptable status',
    payment_id,
    'Q2 2023: ' + CAST(variance_percent AS VARCHAR) + '% variance',
    'acceptable',
    variance_status,
    CASE WHEN variance_status = 'acceptable' THEN 1 ELSE 0 END
FROM payment_history_view
WHERE client_id = 31 
    AND applied_year = 2023 
    AND applied_period = 2;

-- Test 4: 12% variance (warning status)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    '12% under - warning status',
    payment_id,
    'Q3 2023: ' + CAST(ABS(variance_percent) AS VARCHAR) + '% under',
    'warning',
    variance_status,
    CASE WHEN variance_status = 'warning' THEN 1 ELSE 0 END
FROM payment_history_view
WHERE client_id = 31 
    AND applied_year = 2023 
    AND applied_period = 3;

-- Test 5: 22% variance (alert status)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    '22% over - alert status',
    payment_id,
    'Q4 2023: ' + CAST(variance_percent AS VARCHAR) + '% over',
    'alert',
    variance_status,
    CASE WHEN variance_status = 'alert' THEN 1 ELSE 0 END
FROM payment_history_view
WHERE client_id = 31 
    AND applied_year = 2023 
    AND applied_period = 4;

-- Test 6: Verify variance percentages calculate correctly
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Variance percentage calculation',
    payment_id,
    'July 2023: $1056 actual / $1200 expected',
    '-12.00',
    CAST(ROUND(variance_percent, 2) AS VARCHAR),
    CASE 
        WHEN ABS(variance_percent - (-12.0)) < 0.01 THEN 1 
        ELSE 0 
    END
FROM payment_history_view
WHERE client_id = 30 
    AND applied_year = 2023 
    AND applied_period = 7;

DECLARE @total INT = (SELECT COUNT(*) FROM test_results WHERE test_suite = @test_suite);
DECLARE @passed INT = (SELECT COUNT(*) FROM test_results WHERE test_suite = @test_suite AND pass_fail = 1);

PRINT 'Variance Threshold Tests Complete: ' + CAST(@passed AS VARCHAR) + '/' + CAST(@total AS VARCHAR) + ' passed';
PRINT '';