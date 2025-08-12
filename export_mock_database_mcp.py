#!/usr/bin/env python3
"""
Export and sanitize database to JSON using MCP SQL queries
This script uses a series of SQL queries that you'll run via MCP tools
"""

import json
import os
from datetime import datetime
from decimal import Decimal

# Output structure
output = {
    "metadata": {
        "exported_at": datetime.now().isoformat(),
        "version": "1.0",
        "description": "Sanitized mock database for demo/testing"
    },
    "tables": {},
    "views": {}
}

# Tables to export with their queries
EXPORT_QUERIES = {
    "tables": {
        "clients_all": """
            SELECT 
                client_id,
                CASE 
                    WHEN client_id % 28 = 0 THEN 'Acme Corporation'
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
                    ELSE 'Pinnacle LLC'
                END as display_name,
                CONCAT('DEMO COMPANY ', client_id, ' 401K PLAN AND TRUST') as full_name,
                ima_signed_date,
                is_deleted,
                deleted_date
            FROM clients_all
        """,
        
        "contacts": """
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
        """,
        
        "contracts": """
            SELECT 
                contract_id,
                client_id,
                CONCAT('TEST-', FORMAT(1000 + contract_id, '0000')) as contract_number,
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
        """,
        
        "payments": """
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
        """,
        
        "quarterly_notes": """
            SELECT 
                client_id,
                year,
                quarter,
                CONCAT('Q', quarter, ' ', year, ' test notes for demo purposes') as notes,
                last_updated,
                'demo_user' as updated_by
            FROM quarterly_notes
        """,
        
        "payment_periods": """
            SELECT * FROM payment_periods
        """,
        
        "variance_thresholds": """
            SELECT * FROM variance_thresholds
        """,
        
        "client_quarter_markers": """
            SELECT * FROM client_quarter_markers
        """
    },
    "views": {
        "sidebar_clients_view": "SELECT * FROM sidebar_clients_view",
        "dashboard_view": "SELECT * FROM dashboard_view",
        "payment_history_view": "SELECT TOP 1000 * FROM payment_history_view ORDER BY payment_id DESC",
        "payment_form_defaults_view": "SELECT * FROM payment_form_defaults_view",
        "payment_form_periods_view": "SELECT TOP 1000 * FROM payment_form_periods_view WHERE year >= 2023",
        "quarterly_page_data": "SELECT * FROM quarterly_page_data WHERE applied_year >= 2023",
        "annual_page_data": "SELECT * FROM annual_page_data WHERE applied_year >= 2023"
    }
}

print("""
MANUAL EXPORT INSTRUCTIONS
==========================

Since direct DB connection isn't working, let's use the MCP tools you already have.

Copy and run each query below using the MCP SQL tool, then paste the results 
into the corresponding section of the script.

Step-by-step:
1. Run each query using: mcp__MSSQL_MCP__read_data
2. Copy the 'data' array from each result
3. Create the final JSON structure

Here are the queries to run:
""")

# Print all queries for manual execution
for category, queries in EXPORT_QUERIES.items():
    print(f"\n### {category.upper()} ###")
    for name, query in queries.items():
        print(f"\n-- {name}:")
        print(query.strip())
        print()

# Create directory structure
os.makedirs("public/mock-data", exist_ok=True)

print("""
After running all queries, combine the results into a single JSON file at:
public/mock-data/database.json

Structure:
{
  "metadata": { ... },
  "tables": {
    "clients_all": [...results from query...],
    "contacts": [...results from query...],
    etc.
  },
  "views": {
    "sidebar_clients_view": [...results from query...],
    etc.
  }
}
""")