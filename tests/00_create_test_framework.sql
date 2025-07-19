-- =============================================
-- HWM 401k Test Framework Setup
-- Run this FIRST before any other test scripts
-- =============================================

-- Drop existing test results if needed
IF OBJECT_ID('dbo.test_results', 'U') IS NOT NULL 
    DROP TABLE dbo.test_results;

-- Create test results tracking table
CREATE TABLE dbo.test_results (
    result_id INT IDENTITY(1,1) PRIMARY KEY,
    test_suite VARCHAR(50) NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    client_id INT NULL,
    test_context VARCHAR(200) NULL,
    expected_value VARCHAR(500) NULL,
    actual_value VARCHAR(500) NULL,
    pass_fail BIT NOT NULL,
    error_message VARCHAR(1000) NULL,
    execution_time_ms INT NULL,
    test_timestamp DATETIME NOT NULL DEFAULT GETDATE()
);

-- Create summary view for quick status check
CREATE OR ALTER VIEW test_summary AS
SELECT 
    test_suite,
    COUNT(*) as total_tests,
    SUM(CAST(pass_fail AS INT)) as passed,
    COUNT(*) - SUM(CAST(pass_fail AS INT)) as failed,
    CAST(SUM(CAST(pass_fail AS INT)) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as pass_rate,
    MAX(test_timestamp) as last_run
FROM test_results
GROUP BY test_suite;

-- Helper function to format test output
CREATE OR ALTER PROCEDURE sp_test_summary
AS
BEGIN
    PRINT '========================================='
    PRINT 'HWM 401k TEST SUMMARY'
    PRINT 'Run Date: ' + CONVERT(VARCHAR, GETDATE(), 120)
    PRINT '========================================='
    
    SELECT 
        test_suite as [Test Suite],
        CAST(passed AS VARCHAR) + '/' + CAST(total_tests AS VARCHAR) as [Pass/Total],
        CAST(pass_rate AS VARCHAR) + '%' as [Pass Rate],
        CASE 
            WHEN pass_rate = 100 THEN '✓ PERFECT'
            WHEN pass_rate >= 90 THEN '✓ GOOD'
            WHEN pass_rate >= 75 THEN '⚠ WARNING'
            ELSE '✗ FAILED'
        END as Status
    FROM test_summary
    ORDER BY 
        CASE WHEN pass_rate < 100 THEN 0 ELSE 1 END,
        pass_rate;
        
    -- Show failures if any
    IF EXISTS (SELECT 1 FROM test_results WHERE pass_fail = 0)
    BEGIN
        PRINT ''
        PRINT 'FAILED TESTS:'
        PRINT '-------------'
        SELECT 
            test_suite + ' - ' + test_name as [Failed Test],
            'Expected: ' + ISNULL(expected_value, 'NULL') + ' | Actual: ' + ISNULL(actual_value, 'NULL') as [Details]
        FROM test_results 
        WHERE pass_fail = 0
        ORDER BY test_suite, test_name;
    END
END;

PRINT 'Test framework created successfully!'
PRINT 'Run test scripts 01-08 in order, then run: EXEC sp_test_summary'