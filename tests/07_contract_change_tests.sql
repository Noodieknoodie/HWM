-- =============================================
-- Test Suite: Contract Changes
-- Tests historical rate preservation
-- =============================================

DECLARE @test_suite VARCHAR(50) = 'Contract Changes';
DELETE FROM test_results WHERE test_suite = @test_suite;

PRINT 'Running Contract Change Tests...';

-- Test 1: First half 2021 uses original rate (client 30)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Original rate H1 2021',
    30,
    'Jan-Jun 2021 flat rate',
    '1000.00',
    CAST(expected_fee AS VARCHAR),
    CASE WHEN expected_fee = 1000.00 THEN 1 ELSE 0 END
FROM payment_history_view
WHERE client_id = 30 
    AND applied_year = 2021 
    AND applied_period = 3; -- March

-- Test 2: Second half 2021 uses new rate (client 30)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'New rate H2 2021',
    30,
    'Jul-Dec 2021 flat rate (+20%)',
    '1200.00',
    CAST(expected_fee AS VARCHAR),
    CASE WHEN expected_fee = 1200.00 THEN 1 ELSE 0 END
FROM payment_history_view
WHERE client_id = 30 
    AND applied_year = 2021 
    AND applied_period = 9; -- September

-- Test 3: Percentage rate change (client 32)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Percentage rate change',
    32,
    'July 2021: 5.3M * 0.09% = 4770',
    '4770.00',
    CAST(expected_fee AS VARCHAR),
    CASE WHEN ABS(expected_fee - 4770.00) < 1 THEN 1 ELSE 0 END
FROM payment_history_view
WHERE client_id = 32 
    AND applied_year = 2021 
    AND applied_period = 7;

-- Test 4: Contract count verification
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Multiple contracts preserved',
    client_id,
    'Client should have 2 contracts',
    '2',
    CAST(COUNT(*) AS VARCHAR),
    CASE WHEN COUNT(*) = 2 THEN 1 ELSE 0 END
FROM contracts
WHERE client_id = 30
GROUP BY client_id;

-- Test 5: Only one active contract
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Single active contract',
    client_id,
    'Only 1 contract should be active',
    '1',
    CAST(SUM(CAST(is_active AS INT)) AS VARCHAR),
    CASE WHEN SUM(CAST(is_active AS INT)) = 1 THEN 1 ELSE 0 END
FROM contracts
WHERE client_id = 30
GROUP BY client_id;

DECLARE @total INT = (SELECT COUNT(*) FROM test_results WHERE test_suite = @test_suite);
DECLARE @passed INT = (SELECT COUNT(*) FROM test_results WHERE test_suite = @test_suite AND pass_fail = 1);

PRINT 'Contract Change Tests Complete: ' + CAST(@passed AS VARCHAR) + '/' + CAST(@total AS VARCHAR) + ' passed';
PRINT '';