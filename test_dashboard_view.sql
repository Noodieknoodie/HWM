-- test_dashboard_view.sql
-- Test query to verify the dashboard_view has all fields needed for the three cards

SELECT TOP 5
    -- Card 1: Client Quick Reference
    display_name,
    provider_name,
    contract_number,
    contact_name,
    phone,
    physical_address,
    
    -- Card 2: Fee Structure  
    payment_schedule,
    fee_type,
    CASE 
        WHEN fee_type = 'percentage' THEN 
            payment_schedule + ' @ ' + CAST(monthly_rate AS VARCHAR) + '% of AUM'
        ELSE 
            payment_schedule + ' @ $' + CAST(monthly_rate AS VARCHAR)
    END AS fee_structure_display,
    aum,
    aum_source,
    CASE 
        WHEN fee_type = 'percentage' THEN
            '• Monthly: ' + CAST(monthly_rate AS VARCHAR) + '%' + CHAR(13) + CHAR(10) +
            '• Quarterly: ' + CAST(quarterly_rate AS VARCHAR) + '%' + CHAR(13) + CHAR(10) +
            '• Annual: ' + CAST(annual_rate AS VARCHAR) + '%'
        ELSE
            '• Monthly: $' + CAST(monthly_rate AS VARCHAR) + CHAR(13) + CHAR(10) +
            '• Quarterly: $' + CAST(quarterly_rate AS VARCHAR) + CHAR(13) + CHAR(10) +
            '• Annual: $' + CAST(annual_rate AS VARCHAR)
    END AS fee_reference,
    
    -- Card 3: Payment Status
    current_period_display + ' - ' + payment_status AS payment_status_display,
    expected_fee,
    last_payment_date,
    last_payment_amount,
    'Q' + CAST(current_quarter AS VARCHAR) + ' Progress: ' + 
        CAST(current_quarter_payments AS VARCHAR) + ' of ' + 
        CAST(expected_payments_per_quarter AS VARCHAR) + ' paid' AS quarterly_progress

FROM [dbo].[dashboard_view]
ORDER BY client_id;

-- Alternative simpler view showing raw data
PRINT '';
PRINT 'RAW DATA VIEW:';
PRINT '==============';

SELECT TOP 5
    client_id,
    display_name,
    provider_name,
    contract_number,
    contact_name,
    phone,
    physical_address,
    payment_schedule,
    fee_type,
    monthly_rate,
    quarterly_rate,
    annual_rate,
    aum,
    current_period_display,
    payment_status,
    expected_fee,
    last_payment_date,
    last_payment_amount,
    current_quarter,
    current_quarter_payments,
    expected_payments_per_quarter
FROM [dbo].[dashboard_view]
ORDER BY client_id;