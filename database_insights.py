import pyodbc
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

# Database connection
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

def analyze_database():
    conn = pyodbc.connect(connection_string)
    insights = []
    
    def log(msg):
        insights.append(msg)
        print(msg)
    
    log("=== HohimerPro 401k Database Deep Analysis ===")
    log(f"Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log("")
    
    # 1. Database Timeline Analysis
    log("=== DATABASE TIMELINE ===")
    first_last = pd.read_sql("""
        SELECT 
            MIN(received_date) as first_payment,
            MAX(received_date) as last_payment,
            COUNT(DISTINCT client_id) as total_clients,
            COUNT(*) as total_payments,
            COUNT(DISTINCT YEAR(received_date)) as years_of_data
        FROM payments
    """, conn)
    
    log(f"First Payment: {first_last['first_payment'][0]}")
    log(f"Last Payment: {first_last['last_payment'][0]}")
    log(f"Total Clients with Payments: {first_last['total_clients'][0]}")
    log(f"Total Payment Records: {first_last['total_payments'][0]}")
    log(f"Years of Data: {first_last['years_of_data'][0]}")
    log("")
    
    # 2. Payment Frequency Analysis
    log("=== PAYMENT FREQUENCY PATTERNS ===")
    payment_patterns = pd.read_sql("""
        SELECT 
            c.client_id,
            c.display_name,
            ct.payment_schedule as contract_schedule,
            COUNT(p.payment_id) as total_payments,
            COUNT(DISTINCT CONCAT(p.applied_year, '-', p.applied_period)) as unique_periods,
            MIN(p.received_date) as first_payment,
            MAX(p.received_date) as last_payment,
            DATEDIFF(MONTH, MIN(p.received_date), MAX(p.received_date)) + 1 as months_active,
            AVG(p.actual_fee) as avg_payment,
            STDEV(p.actual_fee) as payment_stddev
        FROM clients c
        JOIN contracts ct ON c.client_id = ct.client_id
        LEFT JOIN payments p ON c.client_id = p.client_id
        GROUP BY c.client_id, c.display_name, ct.payment_schedule
    """, conn)
    
    for schedule in ['monthly', 'quarterly']:
        subset = payment_patterns[payment_patterns['contract_schedule'] == schedule]
        if not subset.empty:
            log(f"\n{schedule.upper()} Contracts:")
            log(f"  Clients: {len(subset)}")
            log(f"  Avg Payments per Client: {subset['total_payments'].mean():.1f}")
            log(f"  Clients with NO payments: {len(subset[subset['total_payments'] == 0])}")
            
            # Check if payment frequency matches contract
            if schedule == 'monthly':
                expected_ratio = 1.0  # Should have ~1 payment per month active
                subset['payment_ratio'] = subset['total_payments'] / subset['months_active']
            else:  # quarterly
                expected_ratio = 0.33  # Should have ~1 payment per 3 months
                subset['payment_ratio'] = subset['total_payments'] / (subset['months_active'] / 3)
            
            subset = subset[subset['months_active'] > 0]
            log(f"  Payment Frequency Ratio (should be ~1.0): {subset['payment_ratio'].mean():.2f}")
            log(f"  Clients paying less than 80% expected: {len(subset[subset['payment_ratio'] < 0.8])}")
    
    log("")
    
    # 3. Rate Analysis
    log("=== RATE CONSISTENCY ANALYSIS ===")
    rate_analysis = pd.read_sql("""
        SELECT 
            c.client_id,
            c.display_name,
            ct.fee_type,
            ct.percent_rate,
            ct.flat_rate,
            p.applied_year,
            p.applied_period,
            p.actual_fee,
            p.total_assets,
            p.expected_fee,
            CASE 
                WHEN ct.fee_type = 'percentage' AND p.total_assets IS NOT NULL AND ct.percent_rate > 0
                THEN p.actual_fee / p.total_assets
                ELSE NULL
            END as implied_rate
        FROM clients c
        JOIN contracts ct ON c.client_id = ct.client_id
        JOIN payments p ON c.client_id = p.client_id
        WHERE p.actual_fee > 0
        ORDER BY c.client_id, p.applied_year, p.applied_period
    """, conn)
    
    # Analyze percentage clients
    pct_clients = rate_analysis[rate_analysis['fee_type'] == 'percentage']
    if not pct_clients.empty:
        log("\nPERCENTAGE FEE CLIENTS:")
        for client_id in pct_clients['client_id'].unique()[:5]:  # Sample 5 clients
            client_data = pct_clients[pct_clients['client_id'] == client_id]
            client_name = client_data['display_name'].iloc[0]
            contract_rate = client_data['percent_rate'].iloc[0]
            
            if client_data['implied_rate'].notna().any():
                implied_rates = client_data['implied_rate'].dropna()
                log(f"\n  {client_name}:")
                log(f"    Contract Rate: {contract_rate:.6f}")
                log(f"    Implied Rate Range: {implied_rates.min():.6f} - {implied_rates.max():.6f}")
                log(f"    Rate Variance: {((implied_rates.max() - implied_rates.min()) / contract_rate * 100):.1f}%")
    
    # Analyze flat fee clients
    flat_clients = rate_analysis[rate_analysis['fee_type'] == 'flat']
    if not flat_clients.empty:
        log("\nFLAT FEE CLIENTS:")
        for client_id in flat_clients['client_id'].unique()[:5]:  # Sample 5 clients
            client_data = flat_clients[flat_clients['client_id'] == client_id]
            client_name = client_data['display_name'].iloc[0]
            contract_rate = client_data['flat_rate'].iloc[0]
            
            log(f"\n  {client_name}:")
            log(f"    Contract Rate: ${contract_rate:.2f}")
            log(f"    Actual Payment Range: ${client_data['actual_fee'].min():.2f} - ${client_data['actual_fee'].max():.2f}")
            log(f"    Payment Variance: {client_data['actual_fee'].std():.2f}")
    
    log("")
    
    # 4. AUM Recording Patterns
    log("=== AUM RECORDING PATTERNS ===")
    aum_patterns = pd.read_sql("""
        SELECT 
            ct.provider_name,
            ct.fee_type,
            COUNT(*) as total_payments,
            COUNT(p.total_assets) as payments_with_aum,
            CAST(COUNT(p.total_assets) AS FLOAT) / COUNT(*) * 100 as aum_recording_rate,
            AVG(p.total_assets) as avg_aum,
            MIN(p.total_assets) as min_aum,
            MAX(p.total_assets) as max_aum
        FROM payments p
        JOIN contracts ct ON p.contract_id = ct.contract_id
        GROUP BY ct.provider_name, ct.fee_type
        ORDER BY ct.provider_name
    """, conn)
    
    for _, row in aum_patterns.iterrows():
        log(f"\n{row['provider_name']} ({row['fee_type']}):")
        log(f"  AUM Recording Rate: {row['aum_recording_rate']:.1f}%")
        if row['payments_with_aum'] > 0:
            log(f"  AUM Range: ${row['min_aum']:,.0f} - ${row['max_aum']:,.0f}")
            log(f"  Average AUM: ${row['avg_aum']:,.0f}")
    
    log("")
    
    # 5. Payment Timing Analysis
    log("=== PAYMENT TIMING ANALYSIS ===")
    timing_analysis = pd.read_sql("""
        SELECT 
            p.applied_period_type,
            p.applied_year,
            p.applied_period,
            p.received_date,
            CASE 
                WHEN p.applied_period_type = 'monthly' THEN 
                    DATEFROMPARTS(p.applied_year, p.applied_period, 1)
                WHEN p.applied_period_type = 'quarterly' THEN
                    DATEFROMPARTS(p.applied_year, (p.applied_period - 1) * 3 + 1, 1)
            END as period_start,
            CASE 
                WHEN p.applied_period_type = 'monthly' THEN 
                    EOMONTH(DATEFROMPARTS(p.applied_year, p.applied_period, 1))
                WHEN p.applied_period_type = 'quarterly' THEN
                    EOMONTH(DATEFROMPARTS(p.applied_year, p.applied_period * 3, 1))
            END as period_end
        FROM payments p
        WHERE p.applied_year >= 2023
    """, conn)
    
    timing_analysis['period_start'] = pd.to_datetime(timing_analysis['period_start'])
    timing_analysis['period_end'] = pd.to_datetime(timing_analysis['period_end'])
    timing_analysis['received_date'] = pd.to_datetime(timing_analysis['received_date'])
    
    # Calculate days after period end (billing in arrears)
    timing_analysis['days_after_period'] = (timing_analysis['received_date'] - timing_analysis['period_end']).dt.days
    
    log("\nBILLING IN ARREARS ANALYSIS:")
    for period_type in ['monthly', 'quarterly']:
        subset = timing_analysis[timing_analysis['applied_period_type'] == period_type]
        if not subset.empty:
            log(f"\n{period_type.upper()}:")
            log(f"  Payments received BEFORE period end: {len(subset[subset['days_after_period'] < 0])}")
            log(f"  Payments received 0-30 days after: {len(subset[(subset['days_after_period'] >= 0) & (subset['days_after_period'] <= 30)])}")
            log(f"  Payments received 31-60 days after: {len(subset[(subset['days_after_period'] > 30) & (subset['days_after_period'] <= 60)])}")
            log(f"  Payments received 60+ days after: {len(subset[subset['days_after_period'] > 60])}")
            log(f"  Average days after period: {subset['days_after_period'].mean():.1f}")
    
    log("")
    
    # 6. Expected Fee Analysis
    log("=== EXPECTED FEE PATTERNS ===")
    expected_fee_analysis = pd.read_sql("""
        SELECT 
            COUNT(*) as total_payments,
            COUNT(expected_fee) as has_expected_fee,
            COUNT(CASE WHEN expected_fee = 0 THEN 1 END) as zero_expected,
            COUNT(CASE WHEN expected_fee IS NULL THEN 1 END) as null_expected,
            COUNT(CASE WHEN ABS(actual_fee - expected_fee) < 0.01 THEN 1 END) as exact_match,
            COUNT(CASE WHEN ABS((actual_fee - expected_fee) / expected_fee) <= 0.05 THEN 1 END) as within_5_percent,
            AVG(ABS((actual_fee - expected_fee) / expected_fee) * 100) as avg_variance_percent
        FROM payments
        WHERE expected_fee > 0 AND actual_fee > 0
    """, conn)
    
    log(f"Total Payments: {expected_fee_analysis['total_payments'][0]}")
    log(f"Has Expected Fee: {expected_fee_analysis['has_expected_fee'][0]} ({expected_fee_analysis['has_expected_fee'][0]/expected_fee_analysis['total_payments'][0]*100:.1f}%)")
    log(f"NULL Expected: {expected_fee_analysis['null_expected'][0]}")
    log(f"Zero Expected: {expected_fee_analysis['zero_expected'][0]}")
    log(f"Exact Matches: {expected_fee_analysis['exact_match'][0]}")
    log(f"Within 5%: {expected_fee_analysis['within_5_percent'][0]}")
    log(f"Average Variance: {expected_fee_analysis['avg_variance_percent'][0]:.1f}%")
    log("")
    
    # 7. Posted Status Usage
    log("=== POSTED STATUS USAGE ===")
    posted_analysis = pd.read_sql("""
        SELECT 
            YEAR(received_date) as year,
            COUNT(*) as total_payments,
            SUM(CAST(posted_to_hwm AS INT)) as posted_count,
            CAST(SUM(CAST(posted_to_hwm AS INT)) AS FLOAT) / COUNT(*) * 100 as posted_rate
        FROM payments
        GROUP BY YEAR(received_date)
        ORDER BY year DESC
    """, conn)
    
    log("Posted to HWM by Year:")
    for _, row in posted_analysis.head(5).iterrows():
        log(f"  {int(row['year'])}: {row['posted_count']}/{row['total_payments']} ({row['posted_rate']:.1f}%)")
    
    log("")
    
    # 8. One-off Payment Detection
    log("=== ANOMALY DETECTION ===")
    
    # Find payments that are significantly different from client's average
    anomalies = pd.read_sql("""
        WITH ClientStats AS (
            SELECT 
                client_id,
                AVG(actual_fee) as avg_fee,
                STDEV(actual_fee) as stddev_fee,
                COUNT(*) as payment_count
            FROM payments
            GROUP BY client_id
            HAVING COUNT(*) >= 5  -- Need enough payments for statistics
        )
        SELECT 
            p.client_id,
            c.display_name,
            p.received_date,
            p.actual_fee,
            cs.avg_fee,
            ABS(p.actual_fee - cs.avg_fee) / cs.stddev_fee as z_score,
            p.notes
        FROM payments p
        JOIN ClientStats cs ON p.client_id = cs.client_id
        JOIN clients c ON p.client_id = c.client_id
        WHERE cs.stddev_fee > 0 
        AND ABS(p.actual_fee - cs.avg_fee) / cs.stddev_fee > 3  -- 3 standard deviations
        ORDER BY z_score DESC
    """, conn)
    
    log(f"Potential One-off Payments (>3 std dev from client average):")
    for _, row in anomalies.head(10).iterrows():
        log(f"  {row['display_name']} on {row['received_date']}: ${row['actual_fee']:.2f} (avg: ${row['avg_fee']:.2f}, z-score: {row['z_score']:.1f})")
        if row['notes']:
            log(f"    Note: {row['notes'][:50]}...")
    
    log("")
    
# 9. Provider Analysis
    log("=== PROVIDER PATTERNS ===")
    provider_analysis = pd.read_sql("""
        SELECT 
            ct.provider_name,
            COUNT(DISTINCT ct.client_id) as client_count,
            COUNT(DISTINCT p.client_id) as clients_with_payments,
            COUNT(p.payment_id) as total_payments,
            MIN(p.received_date) as first_payment,
            MAX(p.received_date) as last_payment,
            SUM(CASE WHEN ct.fee_type = 'percentage' THEN 1 ELSE 0 END) as percentage_clients,
            SUM(CASE WHEN ct.fee_type = 'flat' THEN 1 ELSE 0 END) as flat_fee_clients
        FROM contracts ct
        LEFT JOIN payments p ON ct.contract_id = p.contract_id
        GROUP BY ct.provider_name
        ORDER BY client_count DESC
    """, conn)
    
    for _, row in provider_analysis.iterrows():
        log(f"\n{row['provider_name']}:")
        log(f"  Total Clients: {row['client_count']}")
        log(f"  Clients with Payments: {row['clients_with_payments'] or 0}")
        log(f"  Total Payments: {row['total_payments'] or 0}")
        log(f"  Fee Types: {row['percentage_clients']} percentage, {row['flat_fee_clients']} flat")
        if row['first_payment']:
            log(f"  Payment Range: {row['first_payment']} to {row['last_payment']}")
    
    log("")
    
    # 10. Contract Changes Detection
    log("=== CONTRACT STABILITY ===")
    
    # Look for changes in payment amounts over time
    stability_check = pd.read_sql("""
        WITH PaymentChanges AS (
            SELECT 
                p.client_id,
                c.display_name,
                p.applied_year,
                AVG(p.actual_fee) as avg_yearly_fee,
                COUNT(*) as payment_count,
                LAG(AVG(p.actual_fee)) OVER (PARTITION BY p.client_id ORDER BY p.applied_year) as prev_year_fee
            FROM payments p
            JOIN clients c ON p.client_id = c.client_id
            GROUP BY p.client_id, c.display_name, p.applied_year
            HAVING COUNT(*) >= 3  -- At least 3 payments in the year
        )
        SELECT 
            *,
            CASE 
                WHEN prev_year_fee IS NOT NULL 
                THEN ((avg_yearly_fee - prev_year_fee) / prev_year_fee * 100)
                ELSE NULL 
            END as year_over_year_change
        FROM PaymentChanges
        WHERE prev_year_fee IS NOT NULL
        AND ABS((avg_yearly_fee - prev_year_fee) / prev_year_fee) > 0.1  -- More than 10% change
        ORDER BY ABS((avg_yearly_fee - prev_year_fee) / prev_year_fee) DESC
    """, conn)
    
    log("Significant Year-over-Year Fee Changes (>10%):")
    for _, row in stability_check.head(10).iterrows():
        log(f"  {row['display_name']} ({row['applied_year']-1} to {row['applied_year']}): {row['year_over_year_change']:.1f}% change")
    
    log("")
    
# 11. Data Completeness
    log("=== DATA COMPLETENESS ===")
    
    # Check each entity separately to avoid column name issues
    clients_complete = pd.read_sql("""
        SELECT 
            COUNT(*) as total,
            COUNT(full_name) as has_full_name,
            COUNT(ima_signed_date) as has_ima_date
        FROM clients
    """, conn)
    
    contracts_complete = pd.read_sql("""
        SELECT 
            COUNT(*) as total,
            COUNT(contract_number) as has_contract_number,
            COUNT(contract_start_date) as has_start_date
        FROM contracts
    """, conn)
    
    contacts_complete = pd.read_sql("""
        SELECT 
            COUNT(*) as total,
            COUNT(email) as has_email,
            COUNT(phone) as has_phone
        FROM contacts
    """, conn)
    
    log("\nClients:")
    log(f"  Total Records: {clients_complete['total'][0]}")
    log(f"  Has Full Name: {clients_complete['has_full_name'][0]} ({clients_complete['has_full_name'][0]/clients_complete['total'][0]*100:.1f}%)")
    log(f"  Has IMA Date: {clients_complete['has_ima_date'][0]} ({clients_complete['has_ima_date'][0]/clients_complete['total'][0]*100:.1f}%)")
    
    log("\nContracts:")
    log(f"  Total Records: {contracts_complete['total'][0]}")
    log(f"  Has Contract Number: {contracts_complete['has_contract_number'][0]} ({contracts_complete['has_contract_number'][0]/contracts_complete['total'][0]*100:.1f}%)")
    log(f"  Has Start Date: {contracts_complete['has_start_date'][0]} ({contracts_complete['has_start_date'][0]/contracts_complete['total'][0]*100:.1f}%)")
    
    log("\nContacts:")
    log(f"  Total Records: {contacts_complete['total'][0]}")
    log(f"  Has Email: {contacts_complete['has_email'][0]} ({contacts_complete['has_email'][0]/contacts_complete['total'][0]*100:.1f}%)")
    log(f"  Has Phone: {contacts_complete['has_phone'][0]} ({contacts_complete['has_phone'][0]/contacts_complete['total'][0]*100:.1f}%)")
    
    log("")
    
    # 12. Payment Gap Analysis (continues from here unchanged)
    
    # 12. Payment Gap Analysis
    log("=== PAYMENT GAPS ===")
    gap_analysis = pd.read_sql("""
        WITH PaymentGaps AS (
            SELECT 
                client_id,
                received_date,
                LAG(received_date) OVER (PARTITION BY client_id ORDER BY received_date) as prev_payment_date,
                DATEDIFF(DAY, 
                    LAG(received_date) OVER (PARTITION BY client_id ORDER BY received_date), 
                    received_date
                ) as days_between_payments
            FROM payments
        )
        SELECT 
            c.display_name,
            ct.payment_schedule,
            MAX(pg.days_between_payments) as max_gap_days,
            AVG(pg.days_between_payments) as avg_gap_days,
            COUNT(CASE WHEN pg.days_between_payments > 120 THEN 1 END) as gaps_over_120_days
        FROM PaymentGaps pg
        JOIN clients c ON pg.client_id = c.client_id
        JOIN contracts ct ON c.client_id = ct.client_id
        WHERE pg.days_between_payments IS NOT NULL
        GROUP BY c.display_name, ct.payment_schedule
        HAVING MAX(pg.days_between_payments) > 120
        ORDER BY max_gap_days DESC
    """, conn)
    
    log("Clients with Payment Gaps > 120 days:")
    for _, row in gap_analysis.head(10).iterrows():
        log(f"  {row['display_name']} ({row['payment_schedule']}): Max gap {row['max_gap_days']} days, {row['gaps_over_120_days']} occurrences")
    
    log("")
    
    # 13. Notes Field Usage
    log("=== NOTES FIELD INSIGHTS ===")
    notes_analysis = pd.read_sql("""
        SELECT 
            COUNT(*) as total_payments,
            COUNT(notes) as has_notes,
            AVG(LEN(notes)) as avg_note_length
        FROM payments
        WHERE notes IS NOT NULL AND LEN(notes) > 0
    """, conn)
    
    log(f"Payments with Notes: {notes_analysis['has_notes'][0]} ({notes_analysis['has_notes'][0]/notes_analysis['total_payments'][0]*100:.1f}%)")
    log(f"Average Note Length: {notes_analysis['avg_note_length'][0]:.0f} characters")
    
    # Sample some notes
    sample_notes = pd.read_sql("""
        SELECT TOP 5 notes, received_date, c.display_name
        FROM payments p
        JOIN clients c ON p.client_id = c.client_id
        WHERE notes IS NOT NULL AND LEN(notes) > 10
        ORDER BY LEN(notes) DESC
    """, conn)
    
    log("\nSample Notes:")
    for _, row in sample_notes.iterrows():
        log(f"  {row['display_name']} ({row['received_date']}): {row['notes'][:100]}...")
    
    log("")
    
    # Final Summary
    log("=== KEY INSIGHTS SUMMARY ===")
    log("1. Database appears to be actively maintained through " + str(first_last['last_payment'][0]))
    log("2. Payment timing shows billing in arrears pattern is mostly followed")
    log("3. Posted status is barely used (likely manual process not kept up)")
    log("4. Expected fees are often missing from payment records")
    log("5. Some clients show significant fee changes year-over-year (contract updates?)")
    log("6. AUM recording is inconsistent, especially for percentage-based fees")
    log("7. Several providers have clients with no payment history")
    
    conn.close()
    
    # Write to file
    with open('database_insights.txt', 'w') as f:
        f.write('\n'.join(insights))
    
    print(f"\nAnalysis complete. Results saved to database_insights.txt")

if __name__ == "__main__":
    analyze_database()