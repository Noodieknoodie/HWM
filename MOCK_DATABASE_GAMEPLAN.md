# Mock Database Export & Sanitization Gameplan

## Overview
Create a Python script to export the entire Azure SQL database into JSON format with sanitized data for demo/testing purposes. The mock data will seamlessly replace the real database when non-organizational users access the app.

## Identified Sensitive Fields

### 1. **clients_all** table
- `display_name` → Replace with "Demo Company 1", "Demo Company 2", etc.
- `full_name` → Replace with "DEMO COMPANY [N] FULL LEGAL NAME"

### 2. **contacts** table  
- `contact_name` → Replace with "Test User 1", "Test User 2", etc.
- `phone` → Replace with "555-0100", "555-0101", etc.
- `email` → Replace with "demo1@example.com", "demo2@example.com"
- `fax` → Replace with "555-9000", "555-9001", etc.
- `physical_address` → Replace with "123 Demo St, Suite [N], Seattle, WA 98101"
- `mailing_address` → Replace with "PO Box [N], Seattle, WA 98101"

### 3. **contracts** table
- `contract_number` → Replace with "TEST-001", "TEST-002", etc.
- `notes` → Replace with "Sample contract notes for testing"
- `provider_name` → KEEP AS-IS (these are service providers, not sensitive)

### 4. **payments** table
- `notes` → Replace with "Test payment note"
- `total_assets` → Round to nearest $10,000 for obfuscation
- `actual_fee` → Round to nearest $100

### 5. **quarterly_notes** table
- `notes` → Replace with "Q[N] [YEAR] test notes for demo purposes"
- `updated_by` → Replace with "demo_user"

## Sanitization Rules

### Systematic Rules (Pattern-Based)
1. **Client IDs**: Keep as-is (needed for relationships)
2. **Dates**: Keep as-is (needed for testing logic)
3. **Financial amounts**: 
   - Assets: Round to nearest $10,000
   - Fees: Round to nearest $100
   - Percentages: Keep as-is (they're rates, not sensitive)
4. **Enum values**: Keep as-is (payment_schedule, fee_type, etc.)

### Manual Replacements (Index-Based)
```python
sanitization_map = {
    'display_names': ['Acme Corp', 'TechStart Inc', 'Global Solutions', 'Innovation Labs', ...],
    'contact_names': ['John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Williams', ...],
    'addresses': ['123 Main St', '456 Oak Ave', '789 Pine Blvd', ...],
    'providers': # Keep original (Voya, John Hancock, etc.)
}
```

## Export Structure

### Option A: Single JSON File (Recommended)
```json
{
  "tables": {
    "clients_all": [...],
    "contacts": [...],
    "contracts": [...],
    "payments": [...],
    "quarterly_notes": [...],
    "payment_periods": [...],
    "variance_thresholds": [...],
    "client_quarter_markers": [...]
  },
  "views": {
    "sidebar_clients_view": [...],
    "dashboard_view": [...],
    "payment_history_view": [...],
    "quarterly_page_data": [...],
    "annual_page_data": [...]
  }
}
```

### Option B: Multiple JSON Files
```
/public/mock-data/
  ├── tables/
  │   ├── clients_all.json
  │   ├── contacts.json
  │   └── ...
  └── views/
      ├── sidebar_clients_view.json
      ├── dashboard_view.json
      └── ...
```

## Mock Client Implementation Strategy

The mock client will:
1. Load JSON data on initialization
2. Parse API endpoint patterns (e.g., `clients?$filter=client_id eq 1`)
3. Apply filters, sorting, and pagination in memory
4. Return data in Azure Data API format: `{ "value": [...] }`

## Script Workflow

1. **Connect to Azure SQL DB** using MCP tools or direct connection
2. **Export all tables** with `SELECT * FROM [table]`
3. **Apply sanitization** based on rules above
4. **Export all views** (already partially sanitized from table data)
5. **Save to JSON** in `/public/mock-data/database.json`
6. **Create MockDataApiClient** class that mimics DataApiClient interface
7. **Switch clients** based on user organization check

## Data Consistency Considerations

- Maintain all foreign key relationships
- Keep date sequences logical (no future payments before past ones)
- Ensure financial calculations still work (fees match percentages * assets)
- Preserve payment schedules (monthly = 12/year, quarterly = 4/year)

## Testing Requirements

After implementation:
1. All existing API endpoints must work with mock data
2. Dashboard calculations must be accurate
3. Summary pages must aggregate correctly
4. Export functionality must produce valid files

## Security Note
The sanitized database will be committed to the repository (public), so we must ensure NO real client data remains, even in derived or calculated fields.

---

## Next Steps
1. ✅ Review this gameplan
2. ⬜ Write Python export/sanitization script
3. ⬜ Create MockDataApiClient class
4. ⬜ Implement org-check switching logic
5. ⬜ Test with real app

**Ready to proceed with implementation?**