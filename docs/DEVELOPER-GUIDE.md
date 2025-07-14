# doc/DEVELOPER-GUIDE.md



## Note from the dude who pays for you, Claude Code:
This application is for the operations employees at my company, Hohimer Wealth Management. My company manages the assets within the 401k plans that our clients offer to their employees. This app is a simple tool to help us organize and streamline the entry process, move away from risky Excel sheets, modernize our workflow, and help Dodd, our compliance officer, not have to scramble so much.
These payments are typically paid via checks received from providers (like John Hancock, VOYA, etc.), and sometimes a single check is for multiple clients at once, though that detail doesn't really matter for this project. Regardless, I hope this helps put you in the right state of mind as you spearhead finishing this up. The user is smart enough to be dangerous in coding but is too excited by the advent of agentic coding tools (such as yourself) to dedicate his time to learning. He relies on your judgment, and you can expect to be the one doing all the coding in this project, so please don't suggest things you'll regret having to build yourself.

## 🗄️ DATABASE-TO-UI MAPPING

### 📊 Application Overview

The application tracks advisory fee payments for 401(k) plan clients. Each client has one contract with a provider (John Hancock, Voya, Ascensus, etc.) and pays either monthly or quarterly fees calculated as a percentage of assets under management (AUM) or a flat fee.

---

## 🧭 SIDEBAR NAVIGATION

**COMPONENT:** `src/components/Sidebar.tsx` + `src/components/ClientSearch.tsx`

The sidebar displays all clients with optional subtle status indicators:

```
┌─────────────────────────────┐
│ • AirSea America           │  ← FROM: sidebar_clients_view.display_name
│   Bellmont Cabinets        │  ← STATUS: compliance_status (backend knows 'yellow'/'green')
│   Dakota Creek             │  ← UI: Gray dot (•) for pending entries or no indicator
└─────────────────────────────┘
```

**When "View by Provider" is toggled:**
```
┌─────────────────────────────┐
│ ▼ John Hancock (4 clients) │  ← GROUP BY: provider_name
│   • AirSea America         │  
│     Bellmont Cabinets      │
│ ▼ Voya (3 clients)         │
│     Amplero                │
└─────────────────────────────┘
```

**DATA SOURCE:** `sidebar_clients_view`
- `client_id`: Navigation target
- `display_name`: Client name shown
- `provider_name`: For grouping by provider
- `compliance_status`: 'yellow' (payment due) or 'green' (paid up) - backend data only, UI shows subtle indicators

**UI NOTE:** The redesign removes colored status indicators. Backend still provides status for filtering/logic, but UI displays subtle gray dots or no indicator to reduce visual noise.

---

## 📋 CLIENT DASHBOARD

**COMPONENT:** `src/pages/Payments.tsx`

When a client is selected, the entire dashboard is populated from a single view for maximum efficiency.

**DATA SOURCE:** `dashboard_view` - One query provides all dashboard data!

### Client Header
```
ACME CORPORATION
Acme
└─ full_name ─┘
└─display_name┘
```

### 💳 Dashboard Cards (4 Cards Layout)

#### 1️⃣ PLAN DETAILS CARD
**COMPONENT:** `src/components/dashboard/cards/PlanDetailsCard.tsx`
```
┌─────────────────────────────────┐
│ Plan Details                    │
├─────────────────────────────────┤
│ PROVIDER                        │
│ John Hancock                    │ ← provider_name
├─────────────────────────────────┤
│ Contract #: 134565              │ ← contract_number
│ Participants: 25                │ ← num_people  
│ Client Since: 05/19             │ ← ima_signed_date (MM/YY format)
└─────────────────────────────────┘
```

#### 2️⃣ CURRENT STATUS CARD
**COMPONENT:** `src/components/dashboard/cards/CurrentStatusCard.tsx`
```
┌─────────────────────────────────┐
│ Current Status                  │
├─────────────────────────────────┤
│ June 2025                       │ ← current_period_display
│ Awaiting Entry                  │ ← When payment_status = 'Due'
├─────────────────────────────────┤
│ Expected Payment: $980.16       │ ← expected_fee
│ Last Payment Date: 05/13/25     │ ← last_payment_date (MM/DD/YY)
│ Last Payment Amount: $930.09    │ ← last_payment_amount
└─────────────────────────────────┘
```

#### 3️⃣ ASSETS & FEES CARD
**COMPONENT:** `src/components/dashboard/cards/AssetsAndFeesCard.tsx`
```
┌─────────────────────────────────┐
│ Assets & Fees                   │
├─────────────────────────────────┤
│ AUM                             │
│ $1,400,234*                     │ ← aum (* if aum_source = 'estimated')
├─────────────────────────────────┤
│ Frequency: Monthly              │ ← payment_schedule
│ Fee Type: Percentage            │ ← fee_type
│ Composite Rates:                │ ← monthly_rate / quarterly_rate / annual_rate
│   0.07% / 0.21% / 0.84%         │    (all three displayed as one line)
└─────────────────────────────────┘
```

**NOTE:** Rates in dashboard_view are already display-ready percentages (0.07 not 0.0007) and correctly calculated based on payment_schedule

#### 4️⃣ CONTACT CARD
**COMPONENT:** `src/components/dashboard/cards/ContactCard.tsx`
```
┌─────────────────────────────────┐
│ Contact                         │
├─────────────────────────────────┤
│ PRIMARY CONTACT                 │
│ John Smith                      │ ← contact_name
├─────────────────────────────────┤
│ Phone: (206) 555-1234          │ ← phone (formatted)
│ Address:                        │ ← physical_address (multi-line)
│   123 Main St                   │
│   Seattle, WA 98101             │
└─────────────────────────────────┘
```

---

## 📝 PAYMENT FORM

**COMPONENT:** `src/components/payment/PaymentForm.tsx`

Form for recording new payments:

```
┌─────────────────────────────────┐
│ Record Payment                  │
├─────────────────────────────────┤
│ Received Date: [____-__-__]    │ ← User input
│ Payment Amount: [$_____.__]    │ ← User input (required)
│ AUM: [$1,400,234.25]           │ ← Pre-filled from suggested_aum
│ Payment Method: [Check ▼]      │ ← HARDCODED list
│ Applied Period: [June 2025 ▼]  │ ← FROM: payment_form_periods_view
│ Expected Fee: $980.16          │ ← Live calculation
│ Notes: [___________________]   │ ← User input
│                                │
│ [Cancel] [Save Payment]        │
└─────────────────────────────────┘
```

**PAYMENT METHODS (hardcoded in component):**
- Auto - ACH
- Auto - Check
- Invoice - Check
- Wire Transfer
- Check

**DATA SOURCES:**
- **Form defaults:** `payment_form_defaults_view` → suggested_aum
- **Period dropdown:** `payment_form_periods_view` → Only unpaid periods (is_paid = 0)
- **Contract ID:** `dashboard_view.contract_id` (REQUIRED for submission)

---

## 📜 PAYMENT HISTORY TABLE

**COMPONENT:** `src/components/payment/PaymentHistory.tsx`

Shows all payments with variance analysis:

```
┌──────┬──────────┬────────┬─────────┬──────────┬──────────┬───────────┬─────┐
│ Date │ Provider │ Period │ Payment │ Expected │ Variance │    AUM    │     │
├──────┼──────────┼────────┼─────────┼──────────┼──────────┼───────────┼─────┤
│05/13 │John Han..│Apr 2025│ $930.09 │  $925.00 │  +$5.09  │$1,400,234 │[✏️🗑️]│
│04/21 │John Han..│Mar 2025│ $925.94 │  $920.00 │  +$5.94  │$1,394,055 │[✏️🗑️]│
└──────┴──────────┴────────┴─────────┴──────────┴──────────┴───────────┴─────┘
```

**DATA SOURCE:** `payment_history_view`
- `variance_status`: Used to determine if amber dot indicator is shown (>10% variance)
- `provider_name`: Included in view (no JOIN needed)
- `expected_fee`: Historical value at time of payment

**UI NOTE:** Variance displays as plain numbers with optional amber dot (•) for >10% variance only

---

## 📊 SUMMARY PAGE

**COMPONENT:** `src/pages/Summary.tsx`

The Summary page provides quarterly and annual payment overviews grouped by provider.

### Navigation & View Modes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Quarterly Payment Summary                                                    │
│ ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│    [← Q3 2025]    Q4 2025    [Q1 2026 →]    [Year View] [Export]          │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Quarterly View (default):** Shows one quarter at a time with payment details
- **Annual View:** Shows all four quarters side-by-side for year overview
- **Navigation:** Quarter/Year arrows update URL params for bookmarking

### Metric Cards

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Total Expected  │  │ Total Received  │  │ Collection Rate │
│    $287,453     │  │    $276,890     │  │     96.3%       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Data Table Structure

**Quarterly View:**
- Providers as section headers with aggregated totals
- Clients grouped under their provider  
- Shows ALL clients, even those with no payments (critical for compliance tracking)
- Single query provides everything including notes!

**Annual View:**
- Same provider/client grouping
- Columns for Q1-Q4 with yearly total
- Payment count indicators per quarter
- Yearly variance calculation

**DATA SOURCES:**

1. **Quarterly Page Data:** `quarterly_page_data`
   - Complete data in ONE query (no more N+1!)
   - Includes provider aggregations
   - Includes client details with notes
   - Pre-calculated rate displays based on payment_schedule
   - Shows EVERY client (even with no payments)

2. **Annual Page Data:** `annual_page_data`
   - Complete annual view in ONE query
   - Quarterly breakdowns (Q1-Q4)
   - Provider and client totals
   - Yearly variance calculations

### Key Features

**Payment Status Display:**
- "2 of 3" format using `payment_count` / `expected_payment_count`
- Missing entries shown as expected amount in gray
- Recorded payments show actual amount

**Variance Indicators (Subtle):**
- Numbers displayed in standard text
- Amber dot (•) appears inline only when variance exceeds 10%
- No colored text or backgrounds

**Interactive Elements:**
- Client names link to `/Payments?client={id}`
- Posted checkboxes for compliance tracking
- Note icons open edit modal for quarterly notes

**URL Structure:**
- Quarterly: `/Summary?year=2025&quarter=4&view=quarterly`
- Annual: `/Summary?year=2025&view=annual`

### Export Functionality

**Export Options:**
- CSV format (using PapaParse library)
- Excel format (using SheetJS/xlsx library)

**Data Formatting:**
- Numbers: Fixed 2 decimal places, no currency symbols
- Rates: Percentage format (X.XX%) or plain number for flat fees
- Status: "X/Y" format showing payments made/expected
- Posted: "Y" or "N" for posted status
- Provider names: ALL CAPS
- Client names: Two-space indent

**File Naming Convention:**
- Quarterly: `summary-2025-Q4.csv` or `.xlsx`
- Annual: `summary-2025-annual.csv` or `.xlsx`

---

## 📐 RATE STORAGE CONVENTION

The contract rates in the database are **STANDARDIZED TO THE PAYMENT FREQUENCY**:
- For monthly clients: The rate represents the monthly rate
- For quarterly clients: The rate represents the quarterly rate
- They are NOT annualized rates that need to be divided by 12 or 4

This means:
- A monthly client with 0.07% pays 0.07% of AUM each month (0.84% annually)
- A quarterly client with 0.25% pays 0.25% of AUM each quarter (1% annually)
- A monthly client with $666.66 flat pays that amount monthly ($8,000 annually)
- A quarterly client with $3,000 flat pays that amount quarterly ($12,000 annually)

**The views handle all rate calculations correctly based on payment_schedule!**

---

## 🔄 KEY API ENDPOINTS

```typescript
// Sidebar - all clients with status
GET /api/clients
→ SELECT * FROM sidebar_clients_view ORDER BY display_name

// Dashboard - everything for one client  
GET /api/dashboard/{client_id}
→ SELECT * FROM dashboard_view WHERE client_id = ?

// Payment form - unpaid periods
GET /api/periods?client_id={id}
→ SELECT * FROM payment_form_periods_view 
  WHERE client_id = ? AND is_paid = 0
  ORDER BY year DESC, period DESC

// Payment form - default values
GET /api/payment-defaults/{client_id}  
→ SELECT * FROM payment_form_defaults_view WHERE client_id = ?

// Payment history
GET /api/payments?client_id={id}
→ SELECT * FROM payment_history_view 
  WHERE client_id = ? 
  ORDER BY received_date DESC

// Create payment
POST /api/payments
{
  contract_id: number,      // REQUIRED from dashboard_view
  client_id: number,        
  received_date: string,
  actual_fee: number,
  total_assets: number?,    // Optional for flat fee
  expected_fee: number,     // Current calculation
  method: string,
  applied_period_type: string,
  applied_period: number,
  applied_year: number,
  notes: string?
}

// Quarterly summary - COMPLETE DATA IN ONE QUERY
GET /api/quarterly-page-data?year={year}&quarter={quarter}
→ SELECT * FROM quarterly_page_data 
  WHERE applied_year = ? AND quarter = ?
  ORDER BY provider_name, display_name

// Annual summary - COMPLETE DATA IN ONE QUERY  
GET /api/annual-page-data?year={year}
→ SELECT * FROM annual_page_data
  WHERE applied_year = ?
  ORDER BY provider_name, display_name

// Quarterly notes update
PUT /api/quarterly-notes/{client_id}/{year}/{quarter}
→ UPDATE quarterly_notes SET notes = ?, last_updated = GETDATE(), updated_by = ?
  WHERE client_id = ? AND year = ? AND quarter = ?

// Update posted status for entire quarter
PUT /api/payments/quarter-posted
{
  client_id: number,
  year: number,
  quarter: number,
  posted: boolean
}
→ UPDATE payments 
  SET posted_to_hwm = ?
  WHERE client_id = ? 
    AND applied_year = ?
    AND applied_period IN (quarter months)
```

---

## 💡 BUSINESS LOGIC & DATA NOTES

### Dashboard View Magic
The `dashboard_view` consolidates everything needed for the dashboard into one efficient query:
- Client info + Contract details + Payment status + Contact info
- AUM with source indicator (recorded vs estimated from payment)
- Pre-calculated display values (current_period_display, formatted rates)
- Expected fee for current period
- Rates correctly calculated based on payment_schedule

### Expected Fee Calculation
The `calculate_expected_fee` function uses intelligent 3-tier fallback:
1. Try current period's AUM (if available)
2. Fall back to most recent AUM from any prior payment
3. Fall back to last payment amount (assumes stable AUM)

This ensures percentage-based clients always have expected fees calculated, even when providers like Ascensus or Principal don't record AUM.

### Rate Display
Database stores raw rates at payment frequency:
- Monthly client: 0.0007 (0.07% monthly)
- Quarterly client: 0.0025 (0.25% quarterly)

Views provide display-ready rates with proper scaling:
- `monthly_rate`: Shows monthly equivalent for all clients
- `quarterly_rate`: Shows quarterly equivalent for all clients  
- `annual_rate`: Shows annual equivalent for all clients
- Frontend just adds % symbol or formats as currency

### Billing in Arrears
- Current date: July 2025
- Monthly clients: Billing for June 2025
- Quarterly clients: Billing for Q2 2025 (April-June)
- The `current_period_display` field handles this automatically

### AUM Source Indicator
- `aum_source = 'recorded'`: Actual AUM was entered
- `aum_source = 'estimated'`: Calculated from payment ÷ rate
- UI shows asterisk (*) for estimated values

### Payment Status Logic
Backend provides status in `sidebar_clients_view`:
- `compliance_status = 'green'`: All caught up
- `compliance_status = 'yellow'`: Payment due

UI displays this subtly (gray dot or no indicator) rather than colored circles.

### Period Selection
`payment_form_periods_view` provides:
- Only periods where client was active
- Only unpaid periods (is_paid = 0)
- Formatted display text (e.g., "June 2025" or "Q2 2025")

### Variance Thresholds
Backend calculates variance_status but UI displays subtly:
- All variance amounts shown as plain text
- Amber dot (•) added only when variance exceeds 10%
- No colored backgrounds or text

### Summary Page Efficiency
The new views eliminate N+1 queries:
- `quarterly_page_data`: Everything for quarterly view
- `annual_page_data`: Everything for annual view
- Notes included in main query
- Provider aggregations pre-calculated
- All clients shown (even with 0 payments)

---

## 🚀 VIEW RELATIONSHIPS

```
dashboard_view (master view)
    ├── All 4 dashboard cards
    ├── Client header info
    └── Contract ID for payments

sidebar_clients_view
    └── Client list with status

payment_form_periods_view
    └── Dropdown options

payment_form_defaults_view
    └── Suggested AUM

payment_history_view
    └── Payment table with variance

quarterly_page_data ← NEW!
    └── Complete quarterly summary (providers + clients + notes)
    
annual_page_data ← NEW!
    └── Complete annual summary with quarterly breakdown
    
quarterly_notes
    └── Client notes by quarter (included in page data views)

calculate_expected_fee (function)
    └── Intelligent 3-tier fallback for expected fees
```

---

## 🛠️ IMPLEMENTATION PATTERNS

### Form Handling

**Payment Form Validation**
```typescript
const validatePayment = (payment) => {
  const errors = {};
  
  // Required fields
  if (!payment.received_date) errors.received_date = 'Required';
  if (!payment.actual_fee) errors.actual_fee = 'Required';
  if (!payment.method) errors.method = 'Required';
  if (!payment.applied_period) errors.applied_period = 'Required';
  
  // AUM required for percentage-based fees
  if (contract.fee_type === 'percentage' && !payment.total_assets) {
    errors.total_assets = 'AUM required for percentage-based fees';
  }
  
  return errors;
};
```

### Rate Display
```typescript
// Rates are already correctly calculated in the views
// based on payment_schedule - just display them!
const formatRateDisplay = (contract) => {
  if (contract.fee_type === 'percentage') {
    return `${contract.monthly_rate}% / ${contract.quarterly_rate}% / ${contract.annual_rate}%`;
  }
  return `$${contract.flat_rate.toLocaleString()}`;
};
```

### Period Formatting
```typescript
const formatPeriod = (period: number, type: string, year: number) => {
  if (type === 'monthly') {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[period - 1]} ${year}`;
  }
  
  if (type === 'quarterly') {
    return `Q${period} ${year}`;
  }
  
  return `${year}`;
};
```

### Variance Display (Subtle)
```typescript
const getVarianceDisplay = (amount: number, variancePercent: number | null) => {
  const showDot = variancePercent && Math.abs(variancePercent) > 10;
  return (
    <span className="text-gray-900">
      {formatCurrency(amount)}
      {showDot && <span className="text-amber-500 ml-1">•</span>}
    </span>
  );
};
```

---

## 🎨 Style Guidelines

The application follows a minimalist, professional design approach suitable for financial software. Key principles:

### Color Scheme
- **Primary Blue**: `bg-blue-600` / `hover:bg-blue-700` for all primary actions
- **Text Hierarchy**: `text-gray-900` (primary), `text-gray-600` (secondary), `text-gray-500` (muted)
- **Borders**: Consistent `border-gray-200` throughout
- **No color-based status indicators** - Status is conveyed through text and subtle indicators

### Spacing Standards
- Cards: `p-6`
- Table cells: `px-6 py-4`
- Buttons: `px-4 py-2 rounded-md`
- Page containers: `px-4 sm:px-6 lg:px-8 py-8`

### Typography
- Page headers: `text-2xl font-bold text-gray-900` with gradient underline
- Section headers: `text-lg font-semibold text-gray-900`
- Card headers: `text-sm font-semibold text-gray-600`

### Status Display Philosophy
- **Recording Status, Not Payment Problems**: The UI reflects whether payments have been recorded in our system, not whether clients have payment issues
- **Minimal Visual Noise**: Gray dots for pending entries, no indicator for completed
- **Subtle Variance Indicators**: Numbers in gray with optional amber dot for >10% variance

### Component Patterns
See `src/styles/reference.tsx` for standardized component patterns and reusable style classes.

This approach creates a calm, professional interface that lets the data speak for itself without unnecessary visual urgency.