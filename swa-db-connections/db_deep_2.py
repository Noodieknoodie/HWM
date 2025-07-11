import pyodbc
import pandas as pd
from datetime import datetime

connection_string = (
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=tcp:hohimerpro-db-server.database.windows.net,1433;"
    "Database=HohimerPro-401k;"
    "Uid=CloudSAddb51659;"
    "Pwd=Prunes27$$$$;"
    "Encrypt=yes;"
    "TrustServerCertificate=no;"
    "Connection Timeout=30;"
)

def final_diagnosis():
    conn = pyodbc.connect(connection_string)
    insights = []
    
    def log(msg):
        insights.append(msg)
        print(msg)
    
    log("=== FINAL DIAGNOSIS: Root Cause Analysis ===")
    log(f"Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # 1. PSWM Inc Rate Investigation
    log("=== PSWM INC RATE INVESTIGATION ===")
    pswm_check = pd.read_sql("""
        SELECT 
            c.display_name,
            ct.percent_rate,
            ct.payment_schedule,
            p.applied_year,
            p.applied_period,
            p.actual_fee,
            p.expected_fee,
            p.total_assets,
            p.total_assets * ct.percent_rate as should_be_expected,
            p.actual_fee / p.total_assets as implied_rate
        FROM payments p
        JOIN contracts ct ON p.contract_id = ct.contract_id
        JOIN clients c ON p.client_id = c.client_id
        WHERE c.display_name = 'PSWM Inc'
        AND p.total_assets IS NOT NULL
        ORDER BY p.applied_year DESC, p.applied_period DESC
        -- Remove LIMIT for SQL Server
    """, conn)
    
    log("PSWM Inc Payment Analysis:")
    for _, row in pswm_check.iterrows():
        log(f"  {row['applied_year']}-{row['applied_period']}: ")
        log(f"    Actual Fee: ${row['actual_fee']:.2f}")
        expected_str = f"${row['expected_fee']:.2f}" if row['expected_fee'] is not None else "None"
        log(f"    Expected (stored): {expected_str}")
        log(f"    Should Be: ${row['should_be_expected']:.2f}")
        log(f"    Contract Rate: {row['percent_rate']:.6f} ({row['percent_rate']*100:.4f}%)")
        log(f"    Implied Rate: {row['implied_rate']:.6f} ({row['implied_rate']*100:.4f}%)")
    
    # 2. Rate Storage Pattern Check
    log("\n\n=== RATE STORAGE PATTERN CHECK ===")
    rate_patterns = pd.read_sql("""
        SELECT 
            provider_name,
            fee_type,
            COUNT(*) as client_count,
            AVG(percent_rate) as avg_rate,
            MIN(percent_rate) as min_rate,
            MAX(percent_rate) as max_rate,
            AVG(percent_rate * 12) as avg_annual_rate,
            STRING_AGG(CAST(percent_rate AS VARCHAR(20)), ', ') as sample_rates
        FROM contracts
        WHERE fee_type = 'percentage'
        GROUP BY provider_name, fee_type
        ORDER BY provider_name
    """, conn)
    
    for _, row in rate_patterns.iterrows():
        log(f"\n{row['provider_name']}:")
        log(f"  Clients: {row['client_count']}")
        log(f"  Rate Range: {row['min_rate']:.6f} - {row['max_rate']:.6f}")
        log(f"  Average Annual: {row['avg_annual_rate']*100:.2f}%")
        log(f"  Sample Rates: {row['sample_rates']}")
    
    # 3. Dakota Creek Deep Dive
    log("\n\n=== DAKOTA CREEK PATTERN ANALYSIS ===")
    dakota_pattern = pd.read_sql("""
        WITH DakotaPayments AS (
            SELECT 
                p.*,
                ct.percent_rate,
                LAG(p.actual_fee) OVER (ORDER BY p.applied_year, p.applied_period) as prev_fee,
                p.actual_fee / LAG(p.actual_fee) OVER (ORDER BY p.applied_year, p.applied_period) as growth_factor
            FROM payments p
            JOIN contracts ct ON p.contract_id = ct.contract_id
            WHERE p.client_id = 8
        )
        SELECT 
            applied_year,
            applied_period,
            actual_fee,
            prev_fee,
            growth_factor,
            actual_fee / percent_rate as implied_aum,
            notes
        FROM DakotaPayments
        ORDER BY applied_year DESC, applied_period DESC
    """, conn)
    
    log("Dakota Creek Growth Pattern:")
    for _, row in dakota_pattern.iterrows():
        log(f"  {row['applied_year']}-Q{row['applied_period']}: ${row['actual_fee']:.2f}")
        if row['prev_fee']:
            log(f"    Growth from previous: {row['growth_factor']:.2f}x")
        log(f"    Implied AUM: ${row['implied_aum']:,.0f}")
        if row['notes']:
            log(f"    Note: {row['notes'][:50]}...")
    
    # 4. Expected Fee Source Investigation
    log("\n\n=== EXPECTED FEE COLUMN SOURCE ===")
    expected_patterns = pd.read_sql("""
        SELECT 
            ct.fee_type,
            COUNT(*) as total,
            COUNT(p.expected_fee) as has_expected,
            AVG(CASE WHEN p.expected_fee > 0 AND p.actual_fee > 0 
                     THEN ABS(p.expected_fee - p.actual_fee) / p.actual_fee * 100 
                     ELSE NULL END) as avg_variance_pct,
            COUNT(CASE WHEN ABS(p.expected_fee - p.actual_fee) < 1 THEN 1 END) as exact_matches,
            COUNT(CASE WHEN p.expected_fee = ct.flat_rate THEN 1 END) as matches_flat_rate,
            COUNT(CASE WHEN ct.fee_type = 'percentage' AND p.total_assets IS NOT NULL 
                       AND ABS(p.expected_fee - (p.total_assets * ct.percent_rate)) < 1 THEN 1 END) as matches_calculation
        FROM payments p
        JOIN contracts ct ON p.contract_id = ct.contract_id
        WHERE p.expected_fee IS NOT NULL
        GROUP BY ct.fee_type
    """, conn)
    
    log("Expected Fee Pattern Analysis:")
    for _, row in expected_patterns.iterrows():
        log(f"\n{row['fee_type'].upper()} fees:")
        log(f"  Has Expected: {row['has_expected']}/{row['total']} ({row['has_expected']/row['total']*100:.1f}%)")
        log(f"  Exact Match to Actual: {row['exact_matches']}")
        log(f"  Matches Flat Rate: {row['matches_flat_rate']}")
        log(f"  Matches Calculation: {row['matches_calculation']}")
        log(f"  Avg Variance: {row['avg_variance_pct']:.1f}%")
    
    # 5. Missing Data Summary
    log("\n\n=== MISSING DATA SUMMARY ===")
    missing_summary = pd.read_sql("""
        SELECT 
            ct.provider_name,
            COUNT(DISTINCT ct.client_id) as total_clients,
            COUNT(DISTINCT CASE WHEN ct.fee_type = 'percentage' THEN ct.client_id END) as pct_clients,
            COUNT(DISTINCT CASE WHEN p.client_id IS NOT NULL THEN p.client_id END) as clients_with_payments,
            COUNT(DISTINCT CASE WHEN p.total_assets IS NOT NULL THEN p.client_id END) as clients_with_aum,
            COUNT(p.payment_id) as total_payments,
            COUNT(p.total_assets) as payments_with_aum,
            COUNT(p.expected_fee) as payments_with_expected
        FROM contracts ct
        LEFT JOIN payments p ON ct.contract_id = p.contract_id
        GROUP BY ct.provider_name
        ORDER BY ct.provider_name
    """, conn)
    
    for _, row in missing_summary.iterrows():
        if row['pct_clients'] > 0:
            log(f"\n{row['provider_name']}:")
            log(f"  Percentage Clients: {row['pct_clients']}")
            log(f"  Clients with AUM: {row['clients_with_aum']}/{row['pct_clients']} ({row['clients_with_aum']/row['pct_clients']*100:.1f}%)")
            log(f"  Payments with AUM: {row['payments_with_aum']}/{row['total_payments']} ({row['payments_with_aum']/row['total_payments']*100:.1f}%)")
    
    # 6. View Calculation Validation
    log("\n\n=== VIEW CALCULATION VALIDATION ===")
    view_test = pd.read_sql("""
        SELECT TOP 10
            client_id,
            display_name,
            year,
            quarter,
            payment_id,
            actual_fee,
            expected_fee,
            variance_amount,
            variance_percent,
            variance_status
        FROM comprehensive_payment_summary
        WHERE year = 2023 
        AND variance_status IN ('exact', 'alert')
        AND payment_id IS NOT NULL
        ORDER BY ABS(variance_percent) DESC
    """, conn)
    
    log("Sample View Calculations:")
    for _, row in view_test.iterrows():
        log(f"\n{row['display_name']} (2023-Q{row['quarter']}):")
        expected_str = f"${row['expected_fee']:.2f}" if row['expected_fee'] is not None else "None"
        log(f"  Actual: ${row['actual_fee']:.2f}, Expected: {expected_str}")
        log(f"  Variance: ${row['variance_amount']:.2f} ({row['variance_percent']:.1f}%)")
        log(f"  Status: {row['variance_status']}")
    
    # 7. Contract Rate Reasonableness
    log("\n\n=== CONTRACT RATE REASONABLENESS CHECK ===")
    rate_check = pd.read_sql("""
        SELECT 
            c.display_name,
            ct.fee_type,
            ct.percent_rate,
            ct.flat_rate,
            ct.payment_schedule,
            ct.percent_rate * 100 as pct_rate,
            CASE 
                WHEN ct.payment_schedule = 'monthly' THEN ct.percent_rate * 12 * 100
                WHEN ct.payment_schedule = 'quarterly' THEN ct.percent_rate * 4 * 100
            END as annual_pct
        FROM contracts ct
        JOIN clients c ON ct.client_id = c.client_id
        WHERE (ct.fee_type = 'percentage' AND ct.percent_rate > 0.01)  -- More than 1% per period
           OR (ct.fee_type = 'flat' AND ct.flat_rate > 10000)  -- More than $10k per period
        ORDER BY annual_pct DESC
    """, conn)
    
    log("High Rate Contracts:")
    for _, row in rate_check.iterrows():
        log(f"\n{row['display_name']}:")
        if row['fee_type'] == 'percentage':
            log(f"  Rate: {row['pct_rate']:.4f}% per {row['payment_schedule'][:-2]}")
            log(f"  Annual: {row['annual_pct']:.2f}%")
        else:
            log(f"  Flat Fee: ${row['flat_rate']:,.2f} per {row['payment_schedule'][:-2]}")
    
    conn.close()
    
    with open('final_diagnosis.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(insights))
    
    print(f"\nFinal diagnosis complete. Results saved to final_diagnosis.txt")

if __name__ == "__main__":
    final_diagnosis()