import pyodbc
import pandas as pd

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

conn = pyodbc.connect(connection_string)

# Fix PSWM Inc rate
print("=== GAMEPLAN ===")
print("\n1. FIX PSWM INC RATE:")
print("UPDATE contracts SET percent_rate = 0.000417 WHERE client_id = 22")
print("-- Currently 0.125 (12.5% monthly = 150% annual), should be 0.000417 (0.5% annual)")

# Check for other suspicious rates
print("\n2. CHECK OTHER SUSPICIOUS RATES:")
suspicious = pd.read_sql("""
    SELECT c.display_name, ct.percent_rate, ct.percent_rate * 12 * 100 as annual_pct
    FROM contracts ct
    JOIN clients c ON ct.client_id = c.client_id  
    WHERE ct.fee_type = 'percentage' AND ct.percent_rate * 12 > 0.10  -- >10% annual
""", conn)
print(suspicious.to_string(index=False))

print("\n3. DAKOTA CREEK IS FINE - IT'S A STARTUP WITH RAPID GROWTH")
print("   - Started Q4 2023 with $120k AUM")
print("   - Now at $1.5M AUM in Q1 2025") 
print("   - No data issue here")

print("\n4. EXPECTED FEE COLUMN IN PAYMENTS TABLE IS UNRELIABLE")
print("   - Sometimes calculated correctly")
print("   - Sometimes just copied from actual fee")
print("   - Our views should ignore it and calculate fresh")

print("\n5. VARIANCE STATUS CALCULATION NEEDS FIXING IN VIEWS")
print("   - Currently showing 'exact' for -50% variance")
print("   - Need to recalculate status from aggregated amounts")

print("\n=== SQL FIXES NEEDED ===")
print("""
-- 1. Fix PSWM Inc rate
UPDATE contracts SET percent_rate = 0.000417 WHERE client_id = 22;

-- 2. Fix variance status in quarterly_summary_aggregated
-- 3. Fix variance status in yearly_summaries_view  
-- Both need to calculate status from aggregated amounts, not aggregate the statuses
""")

conn.close()