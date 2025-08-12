#!/usr/bin/env python3
"""
Create a simple mock database JSON with representative data
Since DB connection isn't working, this creates a minimal but functional mock dataset
"""

import json
import os
from datetime import datetime, timedelta
import random

# Create output directory
os.makedirs("public/mock-data", exist_ok=True)

# Sample companies and providers
COMPANIES = [
    "Acme Corporation", "TechStart Inc", "Global Solutions", "Innovation Labs",
    "Summit Enterprises", "Pacific Holdings", "Mountain View Corp", "River Valley Inc",
    "Harbor Solutions", "Vista Corporation", "Horizon Tech", "Apex Solutions"
]

PROVIDERS = ["John Hancock", "Voya", "Empower", "Principal", "Capital Group / American Funds", "Ascensus"]

# Generate mock data
mock_db = {
    "metadata": {
        "exported_at": datetime.now().isoformat(),
        "version": "1.0",
        "description": "Sanitized mock database for demo/testing"
    },
    "tables": {
        "clients_all": [],
        "contacts": [],
        "contracts": [],
        "payments": [],
        "quarterly_notes": [],
        "payment_periods": [],
        "client_quarter_markers": []
    },
    "views": {}
}

# Generate clients
for i in range(1, 13):
    mock_db["tables"]["clients_all"].append({
        "client_id": i,
        "display_name": COMPANIES[i-1],
        "full_name": f"{COMPANIES[i-1].upper()} 401K PLAN AND TRUST",
        "ima_signed_date": (datetime.now() - timedelta(days=random.randint(100, 1000))).isoformat(),
        "is_deleted": False,
        "deleted_date": None
    })

# Generate contacts (primary for each client)
for i in range(1, 13):
    mock_db["tables"]["contacts"].append({
        "contact_id": i,
        "client_id": i,
        "contact_type": "Primary",
        "contact_name": f"Test User {i}",
        "phone": f"555-{1000 + i:04d}",
        "email": f"demo{i}@example.com",
        "fax": None,
        "physical_address": f"123 Demo Street, Suite {i}, Seattle, WA 98101",
        "mailing_address": f"PO Box {1000 + i}, Seattle, WA 98101"
    })

# Generate contracts
for i in range(1, 13):
    is_percentage = i % 2 == 0
    mock_db["tables"]["contracts"].append({
        "contract_id": i,
        "client_id": i,
        "contract_number": f"TEST-{1000 + i:04d}",
        "provider_name": PROVIDERS[i % len(PROVIDERS)],
        "contract_start_date": "2023-01-01",
        "fee_type": "percentage" if is_percentage else "flat",
        "percent_rate": 0.0025 if is_percentage else None,
        "flat_rate": None if is_percentage else 1000.0,
        "payment_schedule": "monthly" if i % 3 == 0 else "quarterly",
        "num_people": random.randint(10, 200),
        "notes": "Sample contract for demo",
        "is_active": True
    })

# Generate payment periods for 2024
for month in range(1, 13):
    mock_db["tables"]["payment_periods"].append({
        "period_type": "monthly",
        "year": 2024,
        "period": month,
        "period_name": f"{datetime(2024, month, 1).strftime('%B')} 2024",
        "start_date": f"2024-{month:02d}-01",
        "end_date": f"2024-{month:02d}-{28 if month == 2 else 30 if month in [4,6,9,11] else 31}",
        "is_current": False
    })

for quarter in range(1, 5):
    mock_db["tables"]["payment_periods"].append({
        "period_type": "quarterly",
        "year": 2024,
        "period": quarter,
        "period_name": f"Q{quarter} 2024",
        "start_date": f"2024-{(quarter-1)*3+1:02d}-01",
        "end_date": f"2024-{quarter*3:02d}-{31 if quarter in [1,3] else 30}",
        "is_current": False
    })

# Generate some payments for 2024
payment_id = 1
for client_id in range(1, 13):
    contract = next(c for c in mock_db["tables"]["contracts"] if c["client_id"] == client_id)
    
    # Generate payments based on schedule
    if contract["payment_schedule"] == "monthly":
        periods = range(1, 11)  # Jan through Oct 2024
        period_type = "monthly"
    else:
        periods = range(1, 4)  # Q1 through Q3 2024
        period_type = "quarterly"
    
    for period in periods:
        if random.random() > 0.2:  # 80% chance of payment
            base_amount = contract["flat_rate"] if contract["fee_type"] == "flat" else random.randint(500, 5000)
            mock_db["tables"]["payments"].append({
                "payment_id": payment_id,
                "contract_id": contract["contract_id"],
                "client_id": client_id,
                "received_date": f"2024-{period if period_type == 'monthly' else period*3:02d}-15",
                "total_assets": random.randint(500000, 5000000) if contract["fee_type"] == "percentage" else None,
                "actual_fee": base_amount,
                "method": "Check",
                "notes": "Test payment",
                "applied_period_type": period_type,
                "applied_period": period,
                "applied_year": 2024
            })
            payment_id += 1

# Generate quarterly notes
for client_id in range(1, 13):
    for quarter in range(1, 4):
        if random.random() > 0.5:
            mock_db["tables"]["quarterly_notes"].append({
                "client_id": client_id,
                "year": 2024,
                "quarter": quarter,
                "notes": f"Q{quarter} 2024 test notes for demo",
                "last_updated": datetime.now().isoformat(),
                "updated_by": "demo_user"
            })

# Generate simple views (subset of data for quick loading)
mock_db["views"]["sidebar_clients_view"] = [
    {
        "client_id": c["client_id"],
        "display_name": c["display_name"],
        "full_name": c["full_name"],
        "provider_name": next(ct["provider_name"] for ct in mock_db["tables"]["contracts"] if ct["client_id"] == c["client_id"]),
        "payment_status": "Due" if c["client_id"] % 3 == 0 else "Paid"
    }
    for c in mock_db["tables"]["clients_all"]
]

# Save to JSON
output_file = "public/mock-data/database.json"
with open(output_file, 'w') as f:
    json.dump(mock_db, f, indent=2)

print(f"✅ Mock database created: {output_file}")
print(f"   - {len(mock_db['tables']['clients_all'])} clients")
print(f"   - {len(mock_db['tables']['payments'])} payments")
print(f"   - {len(mock_db['tables']['contracts'])} contracts")
print(f"   Size: {os.path.getsize(output_file) / 1024:.1f} KB")