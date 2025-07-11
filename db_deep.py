
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

def deep_dive_analysis():
    conn = pyodbc.connect(connection_string)
    insights = []
    
    def log(msg):
        insights.append(msg)
        print(msg)
    
    log("=== DEEP DIVE: Expected Fee vs AUM Analysis ===")
    log(f"Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # 1. Expected Fee Column Analysis
    log("=== EXPECTED FEE COLUMN RELIABILITY ===")
    expected_analysis = pd.read_sql("""
        SELECT 
            ct.fee_type,
            ct.provider_name,
            COUNT(*) as total_payments,
            COUNT(p.expected_fee) as has_expected,
            COUNT(p.total_assets) as has_aum,
            COUNT(CASE WHEN p.expected_fee > 0 AND p.total_assets IS NULL THEN 1 END) as expected_without_aum,
            COUNT(CASE WHEN ct.fee_type = 'percentage' AND p.total_assets IS NOT NULL 
                       AND ABS(p.expected_fee - (p.total_assets * ct.percent_rate)) > 0.01 THEN 1 END) as mismatched_calc,
            AVG(CASE WHEN ct.fee_type = 'percentage' AND p.total_assets IS NOT NULL 
                     THEN ABS(p.expected_fee - (p.total_assets * ct.percent_rate)) END) as avg_mismatch
        FROM payments p
        JOIN contracts ct ON p.contract_id = ct.contract_id
        GROUP BY ct.fee_type, ct.provider_name
        ORDER BY ct.provider_name, ct.fee_type
    """, conn)
    
    for _, row in expected_analysis.iterrows():
        if row['total_payments'] > 0:
            log(f"\n{row['provider_name']} - {row['fee_type']}:")
            log(f"  Total Payments: {row['total_payments']}")
            log(f"  Has Expected Fee: {row['has_expected']} ({row['has_expected']/row['total_payments']*100:.1f}%)")
            log(f"  Has AUM: {row['has_aum']} ({row['has_aum']/row['total_payments']*100:.1f}%)")
            log(f"  Expected without AUM: {row['expected_without_aum']}")
            if row['fee_type'] == 'percentage' and row['mismatched_calc'] > 0:
                log(f"  Mismatched Calculations: {row['mismatched_calc']} (avg diff: ${row['avg_mismatch']:.2f})")
    
    # 2. Sample Expected Fee Issues
    log("\n\n=== SAMPLE EXPECTED FEE ISSUES ===")
    sample_issues = pd.read_sql("""
        SELECT TOP 20
            c.display_name,
            ct.fee_type,
            ct.percent_rate,
            ct.flat_rate,
            p.applied_year,
            p.applied_period,
            p.expected_fee,
            p.actual_fee,
            p.total_assets,
            CASE 
                WHEN ct.fee_type = 'percentage' AND p.total_assets IS NOT NULL 
                THEN p.total_assets * ct.percent_rate 
                ELSE NULL 
            END as calculated_expected,
            CASE 
                WHEN ct.fee_type = 'percentage' AND p.total_assets IS NOT NULL 
                THEN ABS(p.expected_fee - (p.total_assets * ct.percent_rate))
                ELSE NULL 
            END as calc_difference
        FROM payments p
        JOIN contracts ct ON p.contract_id = ct.contract_id
        JOIN clients c ON p.client_id = c.client_id
        WHERE ct.fee_type = 'percentage' 
        AND p.total_assets IS NOT NULL
        AND ABS(p.expected_fee - (p.total_assets * ct.percent_rate)) > 1
        ORDER BY ABS(p.expected_fee - (p.total_assets * ct.percent_rate)) DESC
    """, conn)
    
    for _, row in sample_issues.iterrows():
        log(f"\n{row['display_name']} ({row['applied_year']}-{row['applied_period']}):")
        log(f"  Expected Fee (stored): ${row['expected_fee']:.2f}")
        log(f"  Calculated (AUM * rate): ${row['calculated_expected']:.2f}")
        log(f"  Difference: ${row['calc_difference']:.2f}")
        log(f"  AUM: ${row['total_assets']:,.0f}, Rate: {row['percent_rate']:.6f}")
    
    # 3. Missing AUM Pattern Analysis
    log("\n\n=== MISSING AUM PATTERNS ===")
    missing_aum = pd.read_sql("""
        WITH ClientAUMPattern AS (
            SELECT 
                p.client_id,
                c.display_name,
                ct.provider_name,
                ct.fee_type,
                COUNT(*) as total_payments,
                COUNT(p.total_assets) as payments_with_aum,
                MIN(CASE WHEN p.total_assets IS NOT NULL THEN p.received_date END) as first_aum_date,
                MAX(CASE WHEN p.total_assets IS NOT NULL THEN p.received_date END) as last_aum_date,
                MIN(p.received_date) as first_payment,
                MAX(p.received_date) as last_payment
            FROM payments p
            JOIN clients c ON p.client_id = c.client_id
            JOIN contracts ct ON p.contract_id = ct.contract_id
            WHERE ct.fee_type = 'percentage'
            GROUP BY p.client_id, c.display_name, ct.provider_name, ct.fee_type
        )
        SELECT * FROM ClientAUMPattern
        WHERE payments_with_aum < total_payments * 0.5  -- Less than 50% have AUM
        ORDER BY provider_name, display_name
    """, conn)
    
    for _, row in missing_aum.iterrows():
        log(f"\n{row['display_name']} ({row['provider_name']}):")
        log(f"  AUM Recording: {row['payments_with_aum']}/{row['total_payments']} ({row['payments_with_aum']/row['total_payments']*100:.1f}%)")
        if row['first_aum_date']:
            log(f"  AUM Period: {row['first_aum_date']} to {row['last_aum_date']}")
        else:
            log(f"  NO AUM EVER RECORDED")
    
    # 4. Year-over-Year Fee Change Investigation
    log("\n\n=== FEE CHANGE INVESTIGATION ===")
    fee_changes = pd.read_sql("""
        WITH YearlyAnalysis AS (
            SELECT 
                p.client_id,
                c.display_name,
                ct.fee_type,
                ct.percent_rate,
                ct.flat_rate,
                p.applied_year,
                AVG(p.actual_fee) as avg_fee,
                AVG(p.total_assets) as avg_aum,
                COUNT(*) as payment_count,
                MIN(p.actual_fee) as min_fee,
                MAX(p.actual_fee) as max_fee
            FROM payments p
            JOIN clients c ON p.client_id = c.client_id
            JOIN contracts ct ON p.contract_id = ct.contract_id
            GROUP BY p.client_id, c.display_name, ct.fee_type, ct.percent_rate, ct.flat_rate, p.applied_year
        )
        SELECT 
            y1.*,
            y2.avg_fee as prev_year_fee,
            y2.avg_aum as prev_year_aum,
            ((y1.avg_fee - y2.avg_fee) / y2.avg_fee * 100) as fee_change_pct,
            CASE 
                WHEN y1.avg_aum IS NOT NULL AND y2.avg_aum IS NOT NULL 
                THEN ((y1.avg_aum - y2.avg_aum) / y2.avg_aum * 100)
                ELSE NULL 
            END as aum_change_pct
        FROM YearlyAnalysis y1
        JOIN YearlyAnalysis y2 ON y1.client_id = y2.client_id AND y1.applied_year = y2.applied_year + 1
        WHERE ABS((y1.avg_fee - y2.avg_fee) / y2.avg_fee) > 0.15  -- >15% change
        ORDER BY ABS((y1.avg_fee - y2.avg_fee) / y2.avg_fee) DESC
    """, conn)
    
    for _, row in fee_changes.head(10).iterrows():
        log(f"\n{row['display_name']} ({row['applied_year']-1} → {row['applied_year']}):")
        log(f"  Fee Change: ${row['prev_year_fee']:.2f} → ${row['avg_fee']:.2f} ({row['fee_change_pct']:+.1f}%)")
        if row['fee_type'] == 'percentage' and row['aum_change_pct'] is not None:
            log(f"  AUM Change: ${row['prev_year_aum']:,.0f} → ${row['avg_aum']:,.0f} ({row['aum_change_pct']:+.1f}%)")
            log(f"  Rate: {row['percent_rate']:.6f} (should explain fee change if AUM-based)")
        else:
            log(f"  Type: {row['fee_type']} (rate: ${row['flat_rate']:.2f})")
    
    # 5. Expected Fee Calculation Test
    log("\n\n=== TESTING OUR CALCULATION LOGIC ===")
    calc_test = pd.read_sql("""
        -- Test our fallback logic scenarios
        WITH TestCases AS (
            SELECT 
                p.client_id,
                c.display_name,
                p.applied_year,
                p.applied_period,
                p.total_assets as current_aum,
                p.actual_fee,
                p.expected_fee as stored_expected,
                -- Simulate our function's logic
                CASE 
                    WHEN ct.fee_type = 'flat' THEN ct.flat_rate
                    WHEN ct.fee_type = 'percentage' AND p.total_assets IS NOT NULL THEN ROUND(p.total_assets * ct.percent_rate, 2)
                    ELSE NULL
                END as scenario_1_current_aum,
                -- Previous payment lookup
                prev.total_assets as prev_aum,
                prev.actual_fee as prev_fee,
                CASE 
                    WHEN ct.fee_type = 'percentage' AND p.total_assets IS NULL AND prev.total_assets IS NOT NULL 
                    THEN ROUND(prev.total_assets * ct.percent_rate, 2)
                    ELSE NULL
                END as scenario_2_prev_aum,
                -- Fallback to previous fee
                CASE 
                    WHEN ct.fee_type = 'percentage' AND p.total_assets IS NULL AND prev.total_assets IS NULL AND prev.actual_fee IS NOT NULL
                    THEN ROUND(prev.actual_fee, 2)
                    ELSE NULL
                END as scenario_3_prev_fee
            FROM payments p
            JOIN clients c ON p.client_id = c.client_id
            JOIN contracts ct ON p.contract_id = ct.contract_id
            OUTER APPLY (
                SELECT TOP 1 total_assets, actual_fee
                FROM payments p2
                WHERE p2.client_id = p.client_id
                AND (p2.applied_year < p.applied_year OR (p2.applied_year = p.applied_year AND p2.applied_period < p.applied_period))
                ORDER BY p2.applied_year DESC, p2.applied_period DESC
            ) prev
            WHERE p.applied_year = 2025 AND p.applied_period IN (4,5,6) AND ct.payment_schedule = 'monthly'
        )
        SELECT TOP 20 * FROM TestCases
        WHERE current_aum IS NULL  -- Focus on problem cases
        ORDER BY client_id, applied_year, applied_period
    """, conn)
    
    for _, row in calc_test.iterrows():
        log(f"\n{row['display_name']} ({row['applied_year']}-{row['applied_period']}):")
        log(f"  Actual Fee: ${row['actual_fee']:.2f}")
        log(f"  Stored Expected: ${row['stored_expected']:.2f}")
        log(f"  Current AUM: {row['current_aum']}")
        log(f"  Scenario 1 (current AUM): {row['scenario_1_current_aum']}")
        log(f"  Scenario 2 (prev AUM): {row['scenario_2_prev_aum']}")
        log(f"  Scenario 3 (prev fee): {row['scenario_3_prev_fee']}")
    
    # 6. Dakota Creek Special Investigation
    log("\n\n=== DAKOTA CREEK INVESTIGATION ===")
    dakota = pd.read_sql("""
        SELECT 
            p.applied_year,
            p.applied_period,
            p.actual_fee,
            p.expected_fee,
            p.total_assets,
            ct.percent_rate,
            ct.fee_type,
            p.notes
        FROM payments p
        JOIN contracts ct ON p.contract_id = ct.contract_id
        WHERE p.client_id = 8  -- Dakota Creek
        ORDER BY p.applied_year DESC, p.applied_period DESC
    """, conn)
    
    log("Dakota Creek Payment History:")
    for _, row in dakota.iterrows():
        expected_str = f"${row['expected_fee']:.2f}" if row['expected_fee'] is not None else "None"
        log(f"  {row['applied_year']}-Q{row['applied_period']}: Fee=${row['actual_fee']:.2f}, Expected={expected_str}, AUM={row['total_assets']}, Rate={row['percent_rate']}")
    
    conn.close()
    
    with open('deep_dive_insights.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(insights))
    
    print(f"\nDeep dive complete. Results saved to deep_dive_insights.txt")

if __name__ == "__main__":
    deep_dive_analysis()
