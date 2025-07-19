-- =============================================
-- Test Suite: Quarter Boundaries
-- Tests Dec 31 payments stay in Q4
-- =============================================

DECLARE @test_suite VARCHAR(50) = 'Quarter Boundaries';
DELETE FROM test_results WHERE test_suite = @test_suite;

PRINT 'Running Quarter Boundary Tests...';

-- Test 1: Dec 31 payment stays in Q4 (monthly client)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT DISTINCT
    @test_suite,
    'Dec 31 monthly payment quarter',
    client_id,
    'Dec 31, 2023 payment',
    '4',
    CAST(quarter AS VARCHAR),
    CASE WHEN quarter = 4 THEN 1 ELSE 0 END
FROM comprehensive_payment_summary
WHERE client_id = 30 
    AND year = 2023 
    AND period = 12
    AND payment_id IS NOT NULL;

-- Test 2: Dec 31 payment stays in Q4 (quarterly client)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT DISTINCT
    @test_suite,
    'Dec 31 quarterly payment quarter',
    client_id,
    'Dec 31, 2023 payment',
    '4',
    CAST(quarter AS VARCHAR),
    CASE WHEN quarter = 4 THEN 1 ELSE 0 END
FROM comprehensive_payment_summary
WHERE client_id = 31 
    AND year = 2023 
    AND period = 4
    AND payment_id IS NOT NULL;

-- Test 3: Monthly quarter mapping (Jan-Mar = Q1)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Monthly Q1 mapping',
    NULL,
    'Months 1-3 map to Q1',
    '3',
    CAST(COUNT(DISTINCT period) AS VARCHAR),
    CASE WHEN COUNT(DISTINCT period) = 3 THEN 1 ELSE 0 END
FROM comprehensive_payment_summary
WHERE client_id = 30 
    AND year = 2023 
    AND quarter = 1
    AND period IN (1, 2, 3);

-- Test 4: Monthly quarter mapping (Oct-Dec = Q4)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Monthly Q4 mapping',
    NULL,
    'Months 10-12 map to Q4',
    '3',
    CAST(COUNT(DISTINCT period) AS VARCHAR),
    CASE WHEN COUNT(DISTINCT period) = 3 THEN 1 ELSE 0 END
FROM comprehensive_payment_summary
WHERE client_id = 30 
    AND year = 2023 
    AND quarter = 4
    AND period IN (10, 11, 12);

-- Test 5: No payments appear in wrong year
INSERT INTO test_results (test_suite, test_name, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'No year boundary crossing',
    'Dec 31 payments stay in same year',
    '0',
    CAST(COUNT(*) AS VARCHAR),
    CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END
FROM payments
WHERE received_date = '2023-12-31'
    AND applied_year != 2023;

DECLARE @total INT = (SELECT COUNT(*) FROM test_results WHERE test_suite = @test_suite);
DECLARE @passed INT = (SELECT COUNT(*) FROM test_results WHERE test_suite = @test_suite AND pass_fail = 1);

PRINT 'Quarter Boundary Tests Complete: ' + CAST(@passed AS VARCHAR) + '/' + CAST(@total AS VARCHAR) + ' passed';
PRINT '';