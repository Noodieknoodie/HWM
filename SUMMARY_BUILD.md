
# TASK

## OVERVIEW SUMMARY:

### SUMMARY PAGE BUILD + EXPORT FUNCTIONALITY:

Tracks quarterly and annual payment activity across providers and their clients. This page is the primary interface for reviewing expected vs. actual totals, identifying variance issues, and navigating payment history by period.
At the top of the page:
Show the title "Quarterly Payment Summary" or "Annual Payment Summary" based on the active view
Include quarter/year navigation controls with left/right arrows (e.g., ← Q3 2025 Q4 2025 Q1 2026 →)
Add buttons for toggling between Quarter View and Year View
Include an Export button for data downloads
Directly below, display three horizontally aligned metric cards:
Total Expected
Total Received
Collection Rate (as a percentage)
These provide a high-level snapshot of the selected period’s performance.
The main content is a grouped data table:
Providers act as section headers showing roll-up totals
Clients appear beneath their provider and support expand/collapse for payment detail
Layout and columns adjust depending on view mode: quarterly (one row per client) vs. annual (four quarterly columns + total)
Maintain a clean, scannable layout with locked column widths, consistent formatting, and minimal visual noise. Interactive behaviors, formatting rules, and structural specs are defined below.

Export Functionality In Sprint 2. 


Each sprint is to be carried out by the following subsgents. Each subagent adds a log into doc/CLAUDE_JOURNAL.md upon completion. 

# SPRINT 1

This sprint will be carried out by the following sub-agents, each called upon as needed during the build process:

- **Component Architecture Lead**: Establishes page structure and routing patterns, creates foundational React components, manages component hierarchy and data flow, and ensures proper separation of concerns
- **Data Integration Specialist**: Connects frontend to backend data sources, implements API endpoints and data fetching logic, handles CRUD operations, and manages state synchronization with the database
- **UI/State Manager**: Implements navigation and state management, handles user interactions and UI state changes, coordinates data flow between components, and maintains URL and application state consistency
- **Display Formatter**: Ensures consistent visual presentation, implements formatting rules for different data types, manages icon systems and visual indicators, and maintains layout consistency across components
- **Quality & Documentation Specialist**: Reviews code for consistency and best practices, ensures all requirements are met, validates the user experience flows correctly, performs final cleanup and optimization, and updates project documentation

## Summary Page Build Prompt

Please see the docs/FRONTEND-DB-GUIDE.md and docs/SCHEMA-DB-REFERENCE.sql to understand the database structure and data flow patterns used in this application.

Create a quarterly payment summary as the application's default landing page, accessible via "SUMMARY" in the main navigation bar (positioned first).

**Page Overview:**
Single page with two display modes - Quarterly (default) and Year view. Users toggle between modes while maintaining their current time period.

### Quarterly View (Default)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [401k Payment Tracker]   SUMMARY  PAYMENTS  CONTACTS  CONTRACTS  DOCUMENTS  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Quarterly Payment Summary                                                    │
│                                                                              │
│        [← Q3 2025]      Q4 2025      [Q1 2026 →]    [Year View] [Export]   │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │ Total Expected  │  │ Total Received  │  │ Collection Rate │            │
│  │    $287,453     │  │    $276,890     │  │     96.3%       │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘

Provider / Client              Frequency   Quarterly Rate   Expected    Actual     Variance   Status  Posted  
══════════════════════════════════════════════════════════════════════════════════════════════════════════
▼ JOHN HANCOCK (6 clients)                                 $59,493    $58,359    -$1,134            5/6 ☑   

  ▶ AirSea America            Monthly     0.21%           $2,940     $2,790     -$150 ⚠️    2/3     ☑      
  
  ▼ Auction Edge              Quarterly   0.375%          $39,243    $39,243    $0 ✓        1/1     ☑      
    └─ Q4: $39,243 paid 10/28 via Wire Transfer
  
  ▼ Bellmont Cabinets         Monthly     0.06%           Unknown    $1,826     --          3/3     ☐      
    ├─ Oct: $605 paid 10/12 via Check
    ├─ Nov: $608 paid 11/15 via Check
    └─ Dec: $613 paid 12/18 via Check
    └─ Note: "Missing AUM data - requested from client"
    
  ▶ Dakota Creek              Quarterly   $3,000          $9,000     $9,000     $0 ✓        1/1     ☑
  
  ▶ Edgewater Inn             Monthly     0.225%          $2,430     $0         -$2,430 ⚠️   0/3     ☐
  
  ▶ HWM Holdings              Monthly     $5,880          $5,880     $5,500     -$380 ⚠️     3/3     ☑

══════════════════════════════════════════════════════════════════════════════════════════════════════════
▼ VOYA (4 clients)                                        $15,234    $14,900    -$334              3/4 ☑

  ▼ Amplero                   Monthly     $2,001          $2,001     $2,001     $0 ✓        3/3     ☑
    ├─ Oct: $667 paid 10/05 via ACH
    ├─ Nov: $667 paid 11/05 via ACH
    └─ Dec: $667 paid 12/05 via ACH
```

Note that the quarterly view has three tiers of expansion: PROVIDER > CLIENT > payment snapshot. Provider rows leave Frequency, Quarterly Rate, Status, and Posted columns blank.

### NOTE -- SEE THE WIREFRAME -- THERE IS A NOTES ICON ADDED WITH A POPUP MODUAL. LET THE WIREFRAME GUIDE YOU. 


### Year View (Toggle Mode)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [401k Payment Tracker]   SUMMARY  PAYMENTS  CONTACTS  CONTRACTS  DOCUMENTS  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Annual Payment Summary                                                       │
│                                                                              │
│            [← 2024]        2025        [2026 →]      [Quarter View] [Export]│
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │ Total Expected  │  │ Total Received  │  │ Collection Rate │            │
│  │  $1,149,812     │  │  $1,107,560     │  │     96.3%       │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘

Provider / Client              Frequency   Annual Rate   Q1 2025    Q2 2025    Q3 2025    Q4 2025    Total    
═══════════════════════════════════════════════════════════════════════════════════════════════════════════
▼ JOHN HANCOCK (6 clients)                              $61,308    $61,313    $60,789    $55,569    $238,979

  AirSea America              Monthly     0.84%         $2,940 ✓   $2,940 ✓   $2,790 ⚠️   $0 ⚠️      $8,670
  Auction Edge                Quarterly   1.5%          $39,243 ✓  $39,243 ✓  $39,243 ✓  $39,243 ✓  $156,972
  Bellmont Cabinets           Monthly     0.24%         $1,815 ✓   $1,820 ✓   $1,826 ✓   $1,826 ✓   $7,287
  Dakota Creek                Quarterly   $12,000       $9,000 ✓   $9,000 ✓   $9,000 ✓   $9,000 ✓   $36,000
  Edgewater Inn               Monthly     0.9%          $2,430 ✓   $2,430 ✓   $2,430 ✓   $0 ⚠️       $7,290
  HWM Holdings                Monthly     $23,520       $5,880 ✓   $5,880 ✓   $5,500 ⚠️   $5,500 ⚠️   $22,760

═══════════════════════════════════════════════════════════════════════════════════════════════════════════
▼ VOYA (4 clients)                                      $15,234    $15,234    $15,100    $14,900    $60,468

  Amplero                     Monthly     $8,004        $2,001 ✓   $2,001 ✓   $2,001 ✓   $2,001 ✓   $8,004
  [Additional clients...]
```

Note that in year view, clients are still grouped by provider but with only two tiers: PROVIDER > CLIENT (no payment detail expansion).

### Database Integration

**Primary Data Sources:**
- `quarterly_summary_by_provider` - Main aggregated data
  - Query: `SELECT * FROM quarterly_summary_by_provider WHERE applied_year = ? AND quarter = ?`
  - Provides: client totals, variance, payment_count, expected_payment_count, posted counts
  
- `quarterly_summary_detail` - Expanded payment details
  - Query: `SELECT * FROM quarterly_summary_detail WHERE client_id = ? AND applied_year = ? AND quarter = ?`
  - Provides: applied_period, applied_period_type, received_date, actual_fee, method for formatting expanded rows

- `quarterly_notes` - Client notes
  - Query: `SELECT notes FROM quarterly_notes WHERE client_id = ? AND year = ? AND quarter = ?`
  - Update: `UPDATE quarterly_notes SET notes = ? WHERE client_id = ? AND year = ? AND quarter = ?`

- `dashboard_view` - Rate information
  - Provides: monthly_rate, quarterly_rate, annual_rate (all pre-calculated and scaled)

**Expanded Row Formatting:**
Format payment details in the frontend using data from `quarterly_summary_detail`:
```javascript
// Monthly: "Oct: $605 paid 10/12 via Check"
// Quarterly: "Q4: $39,243 paid 10/28 via Wire Transfer"

const formatPaymentLine = (payment) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const period = payment.applied_period_type === 'monthly' 
    ? months[payment.applied_period - 1]
    : `Q${payment.applied_period}`;
    
  const amount = Math.round(payment.actual_fee); // No decimals for display
  const date = new Date(payment.received_date).toLocaleDateString('en-US', 
    { month: '2-digit', day: '2-digit' }); // MM/DD format
  
  return `${period}: $${amount.toLocaleString()} paid ${date} via ${payment.method}`;
};
```

**API Endpoints:**
```typescript
// Quarterly view data
GET /api/summary/quarterly?year=2025&quarter=4

// Year view data (multiple quarters)
GET /api/summary/annual?year=2025

// Update posted status (simple checkbox tracking)
PATCH /api/payments/{payment_id}
{ posted_to_hwm: true }

// Update quarterly notes
PUT /api/quarterly-notes/{client_id}/{year}/{quarter}
{ notes: "Updated note text" }
```

### Navigation & Routing

- Set Summary as default route ("/")
- Reorder navigation: SUMMARY | PAYMENTS | CONTACTS | CONTRACTS | DOCUMENTS | EXPORT
- Quarter navigation updates URL params: `/summary?year=2025&quarter=4`
- Year navigation: `/summary?year=2025&view=annual`
- No sidebar on this page - full width content

### Design Specifications

**Column Structure:**
- Client name (no payment schedule appended)
- Frequency (Monthly/Quarterly) - blank for provider rows
- Rate column header: "Quarterly Rate" for Q view, "Annual Rate" for year view
- Rate (quarterly_rate in Q view, annual_rate in year view) - blank for provider rows
- Expected, Actual, Variance columns
- Status shows payment completeness (e.g., "2/3" for monthly, "1/1" for quarterly) - blank for provider rows
- Posted checkbox for each client - blank for provider rows

**Rate Display:**
- Quarterly view: Use `quarterly_rate` from dashboard_view
- Annual view: Use `annual_rate` from dashboard_view
- Format: X.XX% for percentage, dollar amount for flat (no $ symbol for cleaner display)

**Layout:**
- Each provider section has subtle background (`bg-gray-50`) with 8px vertical spacing
- Fixed column widths to prevent shifting during expand/collapse
- Numbers right-aligned within their columns
- Display amounts with $ and commas, no decimals (e.g., $2,940)

**Interactive Elements:**

// NOTE the varience icons must NOT shift the numbers or data in the cell. its important that the numbers appear verically aligned within a column, as a foundation. if this means moving the icons or finding a different approach, then so be it. 
- Client names are clickable links (text-blue-600) → navigate to `/payments?client={id}`
- Posted checkboxes use lucide-react `CheckSquare`/`Square` icons (internal tracking only)
- Expand/collapse uses lucide-react `ChevronRight`/`ChevronDown`
- Variance indicators using lucide-react icons inline with amounts:
  - `Check` for on target (green-600)
  - `AlertTriangle` for warning variance 1-15% (amber-600)
  - `AlertCircle` for alert >15% (red-600)
- Export button uses lucide-react `Download` icon

Note: DO NOT DO ANY COLORED NUMBERS. THE ONLY COLORS SHOULD BE THE SUBTLE ICONS NEAR VARIENCE. NOT THE NUMBERS THEMSELVES


**Data Behavior:**
- Posted checkbox updates `payments.posted_to_hwm` immediately on click
- Status shows `payment_count/expected_payment_count` from view
- Year view aggregates quarterly data with provider totals
- Missing AUM shows "Unknown" for expected amount
- All monetary values formatted as currency with commas

### After Build

Add entry to docs/FRONTEND-DB-GUIDE.md documenting:
- Summary page data flow and view usage
- Quarter vs Year view toggle logic
- How posted status aggregates from payments to provider level
- Navigation parameter handling
- Rate display logic (quarterly vs annual)
- Expanded row formatting logic

# SPRINT 2

This sprint will be carried out by the following sub-agents, each called upon as needed during the build process:

- **Data Transform Specialist**: Handles data transformation between different formats, manages data structure conversions, ensures data integrity during transformations, and applies appropriate formatting rules
- **File Generation Expert**: Implements file creation and download functionality, integrates necessary libraries for different file formats, manages file naming and metadata, and handles browser download behaviors
- **Integration Validator**: Ensures feature integration with existing functionality, validates data consistency across different states, confirms expected behaviors are maintained, and verifies edge cases are handled
- **Export Quality Specialist**: Tests functionality across different scenarios, ensures output consistency and correctness, validates error handling and user feedback, performs final quality checks, and updates relevant documentation

## Export Feature Implementation

Implement the export functionality for the Summary page following the "Export = Current View" principle.

**Core Behavior:**
- Viewing Q4 2025 → Export Q4 2025 data only
- Viewing Year 2025 → Export full year 2025 data
- Single sheet/file output - no tabs or hidden data
- What you see on screen is exactly what exports

**Libraries:**
- Use PapaParse (already installed) for CSV generation and data transformation
- Use SheetJS (xlsx) for Excel generation
- Both libraries use the same formatted data structure

**User Interface:**
When Export button is clicked, show a dropdown menu:
```
[Export ↓]
  📄 Download as CSV
  📊 Download as Excel
```
No modal or popup - immediate download after selection.

**Export Template - Quarterly View:**

```
Q4 2025 Payment Summary

Client                  Frequency   Quarterly Rate  Expected    Actual      Variance    Status  Posted  Notes
JOHN HANCOCK                                        59493.00    58359.00    -1134.00    5/6     N       
  AirSea America       Monthly     0.21%           2940.00     2790.00     -150.00     2/3     Y       
  Auction Edge         Quarterly   0.375%          39243.00    39243.00    0.00        1/1     Y       
  Bellmont Cabinets    Monthly     0.06%                       1826.00                 3/3     N       Missing AUM data - requested from client
  Dakota Creek         Quarterly   3000.00         9000.00     9000.00     0.00        1/1     Y       
  Edgewater Inn        Monthly     0.225%          2430.00     0.00        -2430.00    0/3     N       Client on payment hold
  HWM Holdings         Monthly     5880.00         5880.00     5500.00     -380.00     3/3     Y       
```

**Export Template - Annual View:**

```
2025 Annual Payment Summary

Client                  Frequency   Annual Rate   Q1 2025     Q2 2025     Q3 2025     Q4 2025     Total
JOHN HANCOCK                                      61308.00    61313.00    60789.00    55569.00    238979.00
  AirSea America       Monthly     0.84%         2940.00     2940.00     2790.00     0.00        8670.00
  Auction Edge         Quarterly   1.5%          39243.00    39243.00    39243.00    39243.00    156972.00
  Bellmont Cabinets    Monthly     0.24%         1815.00     1820.00     1826.00     1826.00     7287.00
  Dakota Creek         Quarterly   12000.00      9000.00     9000.00     9000.00     9000.00     36000.00
```

**Column Specifications:**

1. **Client**
   - Provider rows: All caps (e.g., "JOHN HANCOCK")
   - Client rows: Two-space indent + name (e.g., "  AirSea America")
   - Source: `provider_name` or `display_name`

2. **Frequency**
   - Values: "Monthly" or "Quarterly"
   - Blank for provider rows
   - Source: `payment_schedule`

3. **Rate**
   - Header: "Quarterly Rate" for Q view, "Annual Rate" for year view
   - Format: Percentage as X.XX% or flat fee as number (no $ symbol)
   - Blank for provider rows
   - Source: `quarterly_rate` or `annual_rate` from dashboard_view

4. **Expected**
   - Format: Fixed 2 decimals, no currency symbol
   - Blank for null values (percentage clients without AUM)
   - Source: `expected_total` from `quarterly_summary_by_provider`

5. **Actual**
   - Format: Fixed 2 decimals, no currency symbol
   - Source: `actual_total`

6. **Variance**
   - Format: Fixed 2 decimals, preserve negative sign
   - Blank when expected is null
   - Source: `variance` (calculated in view)

7. **Status** (Quarterly view only)
   - Format: "X/Y" where X is payments made, Y is expected
   - Source: `payment_count` / `expected_payment_count`

8. **Posted** (Quarterly view only)
   - Format: "Y" or "N"
   - Provider rows: "Y" only if all clients posted
   - Source: `fully_posted` for clients, calculated for providers

9. **Notes** (Quarterly view only)
   - Client-specific quarterly notes
   - Blank if no note exists
   - Source: `quarterly_notes` table

**Data Flow & Formatting:**

```javascript
// Get current view data (already displayed on screen)
const currentData = getCurrentViewData();

// Transform for export - different formatting than display
const exportRows = [];

// Add title row
const title = viewMode === 'quarterly' 
  ? `Q${quarter} ${year} Payment Summary`
  : `${year} Annual Payment Summary`;

currentData.forEach(provider => {
  // Provider row
  const providerRow = {
    Client: provider.provider_name.toUpperCase(),
    Frequency: '',
    [rateColumnName]: '', // "Quarterly Rate" or "Annual Rate"
    ...formatProviderNumbers(provider)
  };
  exportRows.push(providerRow);
  
  // Client rows
  provider.clients.forEach(client => {
    const clientRow = {
      Client: `  ${client.display_name}`,
      Frequency: client.payment_schedule === 'monthly' ? 'Monthly' : 'Quarterly',
      [rateColumnName]: formatRate(client),
      ...formatClientNumbers(client)
    };
    exportRows.push(clientRow);
  });
});

// Format helpers
const formatRate = (client) => {
  const rate = viewMode === 'quarterly' ? client.quarterly_rate : client.annual_rate;
  if (client.fee_type === 'percentage') {
    return rate + '%'; // Already scaled in DB
  } else {
    return rate.toFixed(2); // No $ symbol
  }
};

const formatClientNumbers = (client) => {
  const base = {
    Expected: client.expected_total?.toFixed(2) || '',
    Actual: client.actual_total.toFixed(2),
    Variance: client.variance?.toFixed(2) || ''
  };
  
  if (viewMode === 'quarterly') {
    base.Status = `${client.payment_count}/${client.expected_payment_count}`;
    base.Posted = client.fully_posted ? 'Y' : 'N';
    base.Notes = client.quarterly_note || '';
  }
  
  return base;
};

// Generate file
if (format === 'csv') {
  const csv = Papa.unparse(exportRows, { header: true });
  downloadFile(`summary-${year}-${viewMode === 'quarterly' ? `Q${quarter}` : 'annual'}.csv`, csv);
} else {
  const ws = XLSX.utils.json_to_sheet(exportRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Summary");
  XLSX.writeFile(wb, `summary-${year}-${viewMode === 'quarterly' ? `Q${quarter}` : 'annual'}.xlsx`);
}
```

**Key Differences from Display:**
- Numbers use 2 decimals (not rounded to whole dollars like display)
- No currency symbols (for Excel compatibility)
- No icons or visual indicators
- Flat structure (no expanded payment details)
- Rate column header changes based on view mode
- Provider rows include quarterly/annual totals in year view

**File Naming:**
- Quarterly: `summary-2025-Q4.csv` or `.xlsx`
- Annual: `summary-2025-annual.csv` or `.xlsx`