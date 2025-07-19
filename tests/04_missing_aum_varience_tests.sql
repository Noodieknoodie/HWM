-- =============================================
-- Test Suite: Missing AUM Variance Handling
-- Tests variance blocking when AUM is estimated
-- =============================================

DECLARE @test_suite VARCHAR(50) = 'Missing AUM Variance';
DELETE FROM test_results WHERE test_suite = @test_suite;

PRINT 'Running Missing AUM Variance Tests...';

-- Test 1: Percentage client with missing AUM shows is_aum_estimated flag
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'AUM estimation flag set',
    client_id,
    'Jan 2024 - no AUM provided',
    '1',
    CAST(is_aum_estimated AS VARCHAR),
    CASE WHEN is_aum_estimated = 1 THEN 1 ELSE 0 END
FROM payment_history_view
WHERE client_id = 32 
    AND applied_year = 2024 
    AND applied_period = 1;

-- Test 2: Estimated AUM blocks variance calculation
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Variance blocked for estimated AUM',
    client_id,
    'Feb 2024 - variance should be unknown',
    'unknown',
    variance_status,
    CASE WHEN variance_status = 'unknown' THEN 1 ELSE 0 END
FROM payment_history_view
WHERE client_id = 32 
    AND applied_year = 2024 
    AND applied_period = 2
    AND is_aum_estimated = 1;

-- Test 3: Actual AUM allows variance calculation
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Variance calculated with actual AUM',
    client_id,
    'Mar 2024 - AUM provided',
    'not_unknown',
    variance_status,
    CASE WHEN variance_status != 'unknown' AND variance_status IS NOT NULL THEN 1 ELSE 0 END
FROM payment_history_view
WHERE client_id = 32 
    AND applied_year = 2024 
    AND applied_period = 3
    AND is_aum_estimated = 0;

-- Test 4: Flat fee always calculates variance (even without AUM)
WITH FlatFeeVarianceCount AS (
    SELECT COUNT(*) as variance_count
    FROM payment_history_view
    WHERE client_id = 30 
        AND applied_year = 2024
        AND variance_status != 'unknown'
)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Flat fee variance without AUM',
    30,
    'All 2024 - variance should calculate',
    '12',
    CAST(variance_count AS VARCHAR),
    CASE WHEN variance_count = 12 THEN 1 ELSE 0 END
FROM FlatFeeVarianceCount;

-- Test 5: Quarterly percentage with missing AUM
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Quarterly percentage estimation',
    client_id,
    'Q2 2024 - no AUM, estimated from payment',
    '10500000',
    CAST(CAST(display_aum AS INT) AS VARCHAR),
    CASE 
        WHEN ABS(display_aum - 10500000) < 1000 THEN 1 
        ELSE 0 
    END
FROM payment_history_view
WHERE client_id = 33 
    AND applied_year = 2024 
    AND applied_period = 2;

DECLARE @total INT = (SELECT COUNT(*) FROM test_results WHERE test_suite = @test_suite);
DECLARE @passed INT = (SELECT COUNT(*) FROM test_results WHERE test_suite = @test_suite AND pass_fail = 1);

PRINT 'Missing AUM Variance Tests Complete: ' + CAST(@passed AS VARCHAR) + '/' + CAST(@total AS VARCHAR) + ' passed';
PRINT '';