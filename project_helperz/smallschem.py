import pyodbc

# Connection
conn = pyodbc.connect(
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=tcp:hohimerpro-db-server.database.windows.net,1433;"
    "Database=HohimerPro-401k;"
    "Uid=CloudSAddb51659;"
    "Pwd=Prunes27$$$$;"
    "Encrypt=yes;"
    "TrustServerCertificate=no;"
    "Connection Timeout=30;"
)

# Tables of interest
tables = [
    "payments",
    "contracts",
    "clients_all",
    "payment_periods",
    "client_quarter_markers"
]

cursor = conn.cursor()

# Output schema and sample data for each
for table in tables:
    print(f"\n=== SCHEMA: {table} ===")

    cursor.execute(f"""
        SELECT 
            COLUMN_NAME, 
            DATA_TYPE, 
            IS_NULLABLE, 
            CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION;
    """, table)

    schema_rows = cursor.fetchall()
    for row in schema_rows:
        print(f" {row.COLUMN_NAME:>15}  {row.DATA_TYPE:<10}  {row.IS_NULLABLE:<6}  {row.CHARACTER_MAXIMUM_LENGTH}")

    print(f"\n--- SAMPLE DATA: {table} ---")
    try:
        cursor.execute(f"SELECT TOP 5 * FROM {table};")
        columns = [column[0] for column in cursor.description]
        print(' '.join(f"{col:>15}" for col in columns))

        for row in cursor.fetchall():
            print(' '.join(f"{str(val)[:15]:>15}" if val is not None else " " * 15 for val in row))
    except Exception as e:
        print(f" Error fetching data: {str(e)}")

cursor.close()
conn.close()
