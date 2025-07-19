-- =============================================
-- Test Suite: Dashboard AUM Estimation
-- Tests reverse calculation when AUM missing
-- =============================================

DECLARE @test_suite VARCHAR(50) = 'AUM Estimation';
DECLARE @start_time DATETIME = GETDATE();

DELETE FROM test_results WHERE test_suite = @test_suite;

PRINT 'Running Dashboard AUM Estimation Tests...';

-- Test 1: Dashboard estimates AUM from latest payment (client 32)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'AUM estimation calculation',
    32,
    'Latest payment $6480, rate 0.09%',
    '7200000',
    CAST(CAST(d.aum AS INT) AS VARCHAR),
    CASE 
        WHEN ABS(d.aum - 7200000) < 1 THEN 1 
        ELSE 0 
    END
FROM dashboard_view d
WHERE d.client_id = 32;

-- Test 2: AUM source marked as estimated
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'AUM source flagged correctly',
    32,
    'When AUM calculated from payment',
    'estimated',
    aum_source,
    CASE WHEN aum_source = 'estimated' THEN 1 ELSE 0 END
FROM dashboard_view
WHERE client_id = 32;

-- Test 3: Flat fee clients don't estimate AUM
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Flat fee no AUM estimation',
    30,
    'Flat fee should show recorded AUM only',
    'recorded',
    ISNULL(aum_source, 'null'),
    CASE WHEN aum_source = 'recorded' OR aum_source IS NULL THEN 1 ELSE 0 END
FROM dashboard_view
WHERE client_id = 30;

-- Test 4: Quarterly percent estimation (client 33)
INSERT INTO test_results (test_suite, test_name, client_id, test_context, expected_value, actual_value, pass_fail)
SELECT 
    @test_suite,
    'Quarterly percent AUM estimation',
    33,
    'Q1 2025 payment $32400, rate 0.3%',
    '10800000',
    CAST(CAST(aum AS INT) AS VARCHAR),
    CASE 
        WHEN ABS(aum - 10800000) < 1 THEN 1 
        ELSE 0 
    END
FROM dashboard_view
WHERE client_id = 33;

-- Summary
DECLARE @total INT = (SELECT COUNT(*) FROM test_results WHERE test_suite = @test_suite);
DECLARE @passed INT = (SELECT COUNT(*) FROM test_results WHERE test_suite = @test_suite AND pass_fail = 1);

PRINT 'AUM Estimation Tests Complete: ' + CAST(@passed AS VARCHAR) + '/' + CAST(@total AS VARCHAR) + ' passed';
PRINT '';