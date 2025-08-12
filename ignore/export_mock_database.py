#!/usr/bin/env python3
"""
Export and sanitize database to JSON for mock/demo purposes
Run: python export_mock_database.py
"""

import json
import os
import random
from datetime import datetime
from decimal import Decimal

# Database connection details from generate_schema.py
DB_CONFIG = {
    'server': 'tcp:hohimerpro-db-server.database.windows.net,1433',
    'database': 'HohimerPro-401k',
    'username': 'CloudSAddb51659',
    'password': 'Peaches27$$$$',
    'driver': '{ODBC Driver 18 for SQL Server}'
}

# Tables to export
TABLES = [
    'clients_all',
    'contacts', 
    'contracts',
    'payments',
    'quarterly_notes',
    'payment_periods',
    'variance_thresholds',
    'client_quarter_markers'
]

# Views to export
VIEWS = [
    'sidebar_clients_view',
    'dashboard_view',
    'payment_history_view',
    'payment_form_defaults_view',
    'payment_form_periods_view',
    'quarterly_page_data',
    'annual_page_data',
    'quarterly_summary_aggregated',
    'annual_summary_by_client'
]

# Sample data for sanitization
DEMO_COMPANIES = [
    "Acme Corporation", "TechStart Inc", "Global Solutions LLC", "Innovation Labs",
    "Pioneer Industries", "Summit Enterprises", "Cascade Ventures", "Pacific Holdings",
    "Mountain View Corp", "River Valley Inc", "Sunset Industries", "Harbor Solutions",
    "Bridge Partners", "Vista Corporation", "Horizon Tech", "Meridian Group",
    "Apex Solutions", "Prime Industries", "Elite Enterprises", "Premier Corp",
    "Quantum Dynamics", "Nexus Solutions", "Vertex Industries", "Matrix Corp",
    "Synergy Partners", "Momentum Inc", "Catalyst Group", "Pinnacle LLC"
]

DEMO_NAMES = [
    "John Smith", "Jane Doe", "Robert Johnson", "Maria Garcia", "Michael Brown",
    "Jennifer Davis", "William Miller", "Linda Wilson", "David Moore", "Barbara Taylor",
    "James Anderson", "Patricia Thomas", "Christopher Jackson", "Susan White", "Joseph Harris",
    "Margaret Martin", "Thomas Thompson", "Dorothy Garcia", "Charles Martinez", "Lisa Robinson"
]

DEMO_STREETS = [
    "123 Main Street", "456 Oak Avenue", "789 Pine Boulevard", "321 Elm Street",
    "654 Maple Drive", "987 Cedar Lane", "147 Birch Road", "258 Spruce Way",
    "369 Willow Court", "741 Ash Place", "852 Cherry Circle", "963 Poplar Path"
]

def get_connection():
    """Create database connection using pyodbc"""
    import pyodbc
    # Using the exact format from Azure portal
    conn_str = (
        "Driver={ODBC Driver 18 for SQL Server};"
        "Server=tcp:hohimerpro-db-server.database.windows.net,1433;"
        "Database=HohimerPro-401k;"
        "Uid=CloudSAddb51659;"
        "Pwd=Peaches27$$$$;"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=30;"
    )
    return pyodbc.connect(conn_str)

def datetime_handler(obj):
    """JSON serializer for datetime objects"""
    import datetime as dt
    if isinstance(obj, (datetime, dt.date, dt.time)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def sanitize_clients(rows):
    """Sanitize client data"""
    sanitized = []
    for i, row in enumerate(rows):
        row = dict(row)
        row['display_name'] = DEMO_COMPANIES[i % len(DEMO_COMPANIES)]
        row['full_name'] = f"{row['display_name'].upper()} 401K PLAN AND TRUST"
        sanitized.append(row)
    return sanitized

def sanitize_contacts(rows):
    """Sanitize contact data"""
    sanitized = []
    for i, row in enumerate(rows):
        row = dict(row)
        row['contact_name'] = DEMO_NAMES[i % len(DEMO_NAMES)]
        row['phone'] = f"555-{1000 + i:04d}"
        row['email'] = f"demo{i+1}@example.com"
        if row.get('fax'):
            row['fax'] = f"555-{9000 + i:04d}"
        if row.get('physical_address'):
            row['physical_address'] = f"{DEMO_STREETS[i % len(DEMO_STREETS)]}, Suite {100 + i}, Seattle, WA 98101"
        if row.get('mailing_address'):
            row['mailing_address'] = f"PO Box {1000 + i}, Seattle, WA 98101"
        sanitized.append(row)
    return sanitized

def sanitize_contracts(rows):
    """Sanitize contract data"""
    sanitized = []
    for i, row in enumerate(rows):
        row = dict(row)
        if row.get('contract_number'):
            row['contract_number'] = f"TEST-{1000 + i:04d}"
        if row.get('notes'):
            row['notes'] = f"Sample contract notes for testing - Contract #{i+1}"
        sanitized.append(row)
    return sanitized

def sanitize_payments(rows):
    """Sanitize payment data"""
    sanitized = []
    for row in rows:
        row = dict(row)
        if row.get('notes'):
            row['notes'] = "Test payment note"
        if row.get('total_assets'):
            # Round to nearest 10k
            row['total_assets'] = round(row['total_assets'] / 10000) * 10000
        if row.get('actual_fee'):
            # Round to nearest 100
            row['actual_fee'] = round(row['actual_fee'] / 100) * 100
        sanitized.append(row)
    return sanitized

def sanitize_quarterly_notes(rows):
    """Sanitize quarterly notes"""
    sanitized = []
    for row in rows:
        row = dict(row)
        if row.get('notes'):
            q = row.get('quarter', 1)
            y = row.get('year', 2024)
            row['notes'] = f"Q{q} {y} test notes for demo purposes"
        if row.get('updated_by'):
            row['updated_by'] = "demo_user"
        sanitized.append(row)
    return sanitized

def export_table(cursor, table_name):
    """Export and sanitize a single table"""
    print(f"Exporting {table_name}...")
    
    # Build sanitized query based on table
    if table_name == 'clients_all':
        query = """
        SELECT 
            client_id,
            CASE 
                WHEN client_id % 28 = 1 THEN 'TechStart Inc'
                WHEN client_id % 28 = 2 THEN 'Global Solutions LLC'
                WHEN client_id % 28 = 3 THEN 'Innovation Labs'
                WHEN client_id % 28 = 4 THEN 'Pioneer Industries'
                WHEN client_id % 28 = 5 THEN 'Summit Enterprises'
                WHEN client_id % 28 = 6 THEN 'Cascade Ventures'
                WHEN client_id % 28 = 7 THEN 'Pacific Holdings'
                WHEN client_id % 28 = 8 THEN 'Mountain View Corp'
                WHEN client_id % 28 = 9 THEN 'River Valley Inc'
                WHEN client_id % 28 = 10 THEN 'Sunset Industries'
                WHEN client_id % 28 = 11 THEN 'Harbor Solutions'
                WHEN client_id % 28 = 12 THEN 'Bridge Partners'
                WHEN client_id % 28 = 13 THEN 'Vista Corporation'
                WHEN client_id % 28 = 14 THEN 'Horizon Tech'
                WHEN client_id % 28 = 15 THEN 'Meridian Group'
                WHEN client_id % 28 = 16 THEN 'Apex Solutions'
                WHEN client_id % 28 = 17 THEN 'Prime Industries'
                WHEN client_id % 28 = 18 THEN 'Elite Enterprises'
                WHEN client_id % 28 = 19 THEN 'Premier Corp'
                WHEN client_id % 28 = 20 THEN 'Quantum Dynamics'
                WHEN client_id % 28 = 21 THEN 'Nexus Solutions'
                WHEN client_id % 28 = 22 THEN 'Vertex Industries'
                WHEN client_id % 28 = 23 THEN 'Matrix Corp'
                WHEN client_id % 28 = 24 THEN 'Synergy Partners'
                WHEN client_id % 28 = 25 THEN 'Momentum Inc'
                WHEN client_id % 28 = 26 THEN 'Catalyst Group'
                WHEN client_id % 28 = 27 THEN 'Pinnacle LLC'
                ELSE 'Acme Corporation'
            END as display_name,
            CONCAT('DEMO COMPANY ', client_id, ' 401K PLAN AND TRUST') as full_name,
            ima_signed_date,
            is_deleted,
            deleted_date
        FROM clients_all
        """
    elif table_name == 'contacts':
        query = """
        SELECT 
            contact_id,
            client_id,
            contact_type,
            CONCAT('Test User ', contact_id) as contact_name,
            CONCAT('555-', FORMAT(1000 + contact_id, '0000')) as phone,
            CONCAT('demo', contact_id, '@example.com') as email,
            CASE WHEN fax IS NOT NULL THEN CONCAT('555-', FORMAT(9000 + contact_id, '0000')) ELSE NULL END as fax,
            CASE WHEN physical_address IS NOT NULL THEN CONCAT('123 Demo Street, Suite ', contact_id, ', Seattle, WA 98101') ELSE NULL END as physical_address,
            CASE WHEN mailing_address IS NOT NULL THEN CONCAT('PO Box ', 1000 + contact_id, ', Seattle, WA 98101') ELSE NULL END as mailing_address
        FROM contacts
        """
    elif table_name == 'contracts':
        query = """
        SELECT 
            contract_id,
            client_id,
            CASE WHEN contract_number IS NOT NULL THEN CONCAT('TEST-', FORMAT(1000 + contract_id, '0000')) ELSE NULL END as contract_number,
            provider_name,
            contract_start_date,
            fee_type,
            percent_rate,
            flat_rate,
            payment_schedule,
            num_people,
            CASE WHEN notes IS NOT NULL THEN CONCAT('Sample contract notes for testing - Contract #', contract_id) ELSE NULL END as notes,
            is_active
        FROM contracts
        """
    elif table_name == 'payments':
        query = """
        SELECT 
            payment_id,
            contract_id,
            client_id,
            received_date,
            ROUND(total_assets / 10000, 0) * 10000 as total_assets,
            ROUND(actual_fee / 100, 0) * 100 as actual_fee,
            method,
            CASE WHEN notes IS NOT NULL THEN 'Test payment note' ELSE NULL END as notes,
            applied_period_type,
            applied_period,
            applied_year
        FROM payments
        """
    elif table_name == 'quarterly_notes':
        query = """
        SELECT 
            client_id,
            year,
            quarter,
            CONCAT('Q', quarter, ' ', year, ' test notes for demo purposes') as notes,
            last_updated,
            'demo_user' as updated_by
        FROM quarterly_notes
        """
    else:
        # For other tables, just select all
        query = f"SELECT * FROM {table_name}"
    
    cursor.execute(query)
    columns = [desc[0] for desc in cursor.description]
    rows = []
    for row in cursor.fetchall():
        row_dict = dict(zip(columns, row))
        rows.append(row_dict)
    
    return rows

def export_view(cursor, view_name):
    """Export a view with sanitized data"""
    print(f"Exporting view {view_name}...")
    
    # For views that contain sensitive data, we need to rebuild them with sanitized values
    if view_name in ['sidebar_clients_view', 'dashboard_view', 'quarterly_page_data', 'annual_page_data']:
        # These views contain display_name and full_name that need sanitization
        # We'll just skip them and rebuild from the sanitized tables in the mock client
        return []
    
    # For other views, export normally but with limited rows for performance
    if view_name == 'payment_history_view':
        query = f"SELECT TOP 1000 * FROM {view_name} ORDER BY payment_id DESC"
    elif view_name == 'payment_form_periods_view':
        query = f"SELECT TOP 1000 * FROM {view_name} WHERE year >= 2023"
    elif view_name in ['quarterly_summary_aggregated', 'annual_summary_by_client']:
        query = f"SELECT * FROM {view_name} WHERE applied_year >= 2023"
    else:
        query = f"SELECT * FROM {view_name}"
    
    cursor.execute(query)
    columns = [desc[0] for desc in cursor.description]
    rows = []
    for row in cursor.fetchall():
        row_dict = dict(zip(columns, row))
        # Additional sanitization for any remaining sensitive fields in views
        if 'display_name' in row_dict and row_dict['display_name']:
            client_id = row_dict.get('client_id', 0)
            if client_id:
                row_dict['display_name'] = DEMO_COMPANIES[client_id % len(DEMO_COMPANIES)]
        if 'full_name' in row_dict and row_dict['full_name']:
            client_id = row_dict.get('client_id', 0)
            if client_id:
                row_dict['full_name'] = f"DEMO COMPANY {client_id} 401K PLAN AND TRUST"
        if 'contact_name' in row_dict and row_dict['contact_name']:
            row_dict['contact_name'] = f"Test User"
        if 'phone' in row_dict and row_dict['phone']:
            row_dict['phone'] = "555-0100"
        if 'email' in row_dict and row_dict['email']:
            row_dict['email'] = "demo@example.com"
        if 'physical_address' in row_dict and row_dict['physical_address']:
            row_dict['physical_address'] = "123 Demo Street, Seattle, WA 98101"
        if 'notes' in row_dict and row_dict['notes']:
            row_dict['notes'] = "Test note"
        if 'quarterly_notes' in row_dict and row_dict['quarterly_notes']:
            row_dict['quarterly_notes'] = "Test quarterly note"
        rows.append(row_dict)
    return rows

def main():
    """Main export function"""
    print("Starting database export and sanitization...")
    
    try:
        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()
        
        # Export structure
        export_data = {
            "metadata": {
                "exported_at": datetime.now().isoformat(),
                "version": "1.0",
                "description": "Sanitized mock database for demo/testing"
            },
            "tables": {},
            "views": {}
        }
        
        # Export tables
        for table in TABLES:
            export_data["tables"][table] = export_table(cursor, table)
            print(f"  Exported {len(export_data['tables'][table])} rows from {table}")
        
        # Export views
        for view in VIEWS:
            try:
                export_data["views"][view] = export_view(cursor, view)
                print(f"  Exported {len(export_data['views'][view])} rows from {view}")
            except Exception as e:
                print(f"  Warning: Could not export view {view}: {e}")
                export_data["views"][view] = []
        
        # Close connection
        cursor.close()
        conn.close()
        
        # Create output directory if it doesn't exist
        output_dir = "public/mock-data"
        os.makedirs(output_dir, exist_ok=True)
        
        # Save to JSON
        output_file = os.path.join(output_dir, "database.json")
        with open(output_file, 'w') as f:
            json.dump(export_data, f, indent=2, default=datetime_handler)
        
        print(f"\n✅ Successfully exported mock database to {output_file}")
        print(f"   Total size: {os.path.getsize(output_file) / 1024 / 1024:.2f} MB")
        
    except Exception as e:
        print(f"\n❌ Error during export: {e}")
        print("\nPlease check:")
        print("1. Update DB_CONFIG with your actual credentials")
        print("2. Install required packages: pip install pyodbc")
        print("3. Ensure you have network access to Azure SQL")
        raise

if __name__ == "__main__":
    main()