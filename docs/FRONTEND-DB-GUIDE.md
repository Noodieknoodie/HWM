# FRONTEND-DB-GUIDE.md

# FRONTEND-DB-GUIDE.md

## 🗄️ DATABASE-TO-UI MAPPING

### 📊 Dashboard Overview

The application displays payment tracking for financial advisory clients with 401(k) plans. Each client has one active contract with a provider (John Hancock, Voya, Ascensus, etc.) and pays advisory fees either monthly or quarterly, calculated as a percentage of AUM or a flat fee.

-----

### 🧭 SIDEBAR NAVIGATION

**COMPONENT:** `src/components/Sidebar.tsx` + `src/components/ClientSearch.tsx`

The sidebar shows all clients with their current payment status:

```
┌─────────────────────────────┐
│ 🟡 AirSea America          │  ← FROM: sidebar_clients_view.display_name
│ 🟡 Bellmont Cabinets       │  ← STATUS: compliance_status ('yellow' = Due, 'green' = Paid)
│ 🟢 Dakota Creek            │  ← ICON: Yellow circle (🟡) or Green check (🟢)
└─────────────────────────────┘
```

**When “View by Provider” is toggled:**

```
┌─────────────────────────────┐
│ ▼ John Hancock (4 clients) │  ← GROUP BY: provider_name
│   🟡 AirSea America        │  
│   🟡 Bellmont Cabinets     │
│ ▼ Voya (3 clients)         │
│   🟡 Amplero               │
└─────────────────────────────┘
```

**DATA SOURCE:** `sidebar_clients_view`

- `client_id`: Navigation target
- `display_name`: What users see
- `provider_name`: For grouping
- `compliance_status`: ‘yellow’ (payment due) or ‘green’ (paid up)

-----

### 📋 MAIN CLIENT VIEW

**COMPONENT:** `src/pages/Payments.tsx`

When a client is selected, the header shows:

```
ACME CORPORATION
Acme
└─ full_name ─┘
└─display_name┘
```

**DATA SOURCE:** `dashboard_view` (single source for entire dashboard!)

-----

### 💳 DASHBOARD CARDS (4 Cards Layout)

All four cards receive data from the same `dashboard_view` - one query, maximum efficiency!

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
│ Payment Due for June 2025 🟡    │ ← payment_status + current_period_display
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

**NOTE:** Rates in dashboard_view are already display-ready percentages (0.07 not 0.0007)

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

-----

### 📝 PAYMENT FORM

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

-----

### 📜 PAYMENT HISTORY TABLE

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

- `variance_status`: Colors variance (exact, acceptable, warning, alert)
- `provider_name`: Included in view (no JOIN needed)
- `expected_fee`: Historical value (what was expected THEN, not now)

-----

### 🔄 KEY API ENDPOINTS

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
```

-----

### 💡 BUSINESS LOGIC & DATA NOTES

**Dashboard View Magic:**
The `dashboard_view` consolidates everything needed for the dashboard into one efficient query:

- Client info + Contract details + Payment status + Contact info
- AUM with source indicator (recorded vs estimated from payment)
- Pre-calculated display values (current_period_display, formatted rates)
- Expected fee for current period

**Rate Display:**
Database stores raw rates (0.0007) but `dashboard_view` provides display-ready percentages:

- `monthly_rate`: 0.07 (for 0.07% display)
- `quarterly_rate`: 0.21 (for 0.21% display)
- `annual_rate`: 0.84 (for 0.84% display)
- Frontend just adds % symbol for percentage clients or formats as currency for flat fee

**Billing in Arrears:**

- Current date: July 2025
- Monthly clients: Billing for June 2025
- Quarterly clients: Billing for Q2 2025 (April-June)
- The `current_period_display` field handles this automatically

**AUM Source Indicator:**

- `aum_source = 'recorded'`: Actual AUM was entered
- `aum_source = 'estimated'`: Calculated from payment ÷ rate
- UI shows asterisk (*) for estimated values

**Expected Fee Context:**

- `payments.expected_fee`: Historical - what was expected when payment was made
- `dashboard_view.expected_fee`: Current - what we expect for current period
- Form calculation: Live - updates as user types

**Payment Status Logic:**
Simple binary in `sidebar_clients_view`:

- `compliance_status = 'green'`: All caught up
- `compliance_status = 'yellow'`: Payment due

**Period Selection:**
`payment_form_periods_view` provides:

- Only periods where client was active
- Only unpaid periods (is_paid = 0)
- Formatted display text (e.g., “June 2025” or “Q2 2025”)

**Variance Thresholds:**

- exact: < $0.01 difference
- acceptable: ≤ 5% variance (green)
- warning: 5-15% variance (yellow)
- alert: > 15% variance (red)

-----

### 📊 SUMMARY PAGE

**COMPONENT:** `src/pages/Summary.tsx`

The Summary page provides quarterly and annual payment overviews grouped by provider.

#### Navigation & View Modes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Quarterly Payment Summary                                                    │
│                                                                             │
│    [← Q3 2025]    Q4 2025    [Q1 2026 →]    [Year View] [Export]          │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Quarterly View (default):** Shows one quarter at a time with payment details
- **Annual View:** Shows all four quarters side-by-side for year overview
- **Navigation:** Quarter/Year arrows update URL params for bookmarking

#### Metric Cards

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Total Expected  │  │ Total Received  │  │ Collection Rate │
│    $287,453     │  │    $276,890     │  │     96.3%       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

#### Data Table Structure

**Quarterly View:**
- Providers as section headers with aggregated totals
- Clients grouped under their provider
- Three levels of expansion: Provider → Client → Payment Details

**Annual View:**
- Same provider/client grouping
- Columns for Q1-Q4 with yearly total
- Payment status icons per quarter

**DATA SOURCES:**

1. **Main Summary Data:** `quarterly_summary_by_provider`
   - Provider grouping with client totals
   - Expected vs actual amounts with variance
   - Payment counts for status display
   - Posted status tracking

2. **Payment Details:** `quarterly_summary_detail`
   - Individual payment records for expanded view
   - Used to show payment dates, methods, amounts

3. **Rate Information:** `dashboard_view`
   - Quarterly/annual rates for display
   - Loaded per client for accurate rate formatting

4. **Client Notes:** `quarterly_notes`
   - Quarter-specific notes per client
   - Editable via modal dialog

#### Key Features

**Variance Indicators:**
- ✓ Check (green): On target (< 1% variance)
- ⚠️ Warning (amber): 1-15% variance
- ⚠️ Alert (red): >15% variance

**Expansion States:**
- Provider rows toggle to show/hide clients
- Client rows toggle to show payment details (quarterly view only)
- Payment details show as indented list with dates and methods

**Interactive Elements:**
- Client names link to `/Payments?client={id}`
- Posted checkboxes update `payments.posted_to_hwm`
- Note icons open edit modal for quarterly notes

**URL Structure:**
- Quarterly: `/Summary?year=2025&quarter=4&view=quarterly`
- Annual: `/Summary?year=2025&view=annual`

-----

### 🚀 VIEW RELATIONSHIPS

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

quarterly_summary_by_provider
    └── Summary page main data
    
quarterly_summary_detail
    └── Payment expansion details
    
quarterly_notes
    └── Client notes by quarter
```
