# doc/DEVELOPER-GUIDE.md

!!!!! POTENTIALLY OUTDATED INFORMATION BELOW READ WITH CAUTION !!!!! 
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
```
# Retirement Plan Fee Tracking Database Schema

## Core Business Model
Financial advisory firm tracks quarterly/monthly fees from retirement plan providers (401k/403b). 
Arrears billing model: Always billing for previous period.

## Key Tables & Relationships

### clients (PK: client_id)
- display_name, full_name, ima_signed_date

### contracts (PK: contract_id, FK: client_id)
- provider_name (e.g., 'John Hancock', 'Voya', 'Empower')
- payment_schedule: 'monthly'|'quarterly'
- fee_type: 'percentage'|'flat'
- percent_rate (stored at payment frequency) | flat_rate
- num_people (plan participants)

### payments (PK: payment_id, FKs: contract_id, client_id)
- received_date, total_assets (AUM), actual_fee
- applied_year, applied_period, applied_period_type
- posted_to_hwm (bool)
- method, notes

### Supporting Tables
- contacts (FK: client_id): contact_type='Primary', name, phone, addresses
- payment_periods: period_type, year, period (1-12|1-4), dates
- quarterly_notes (composite PK: client_id, year, quarter)
- client_quarter_markers (composite PK: client_id, year, quarter): is_posted flag

## Critical Business Logic

### Rate Storage Pattern
Rates stored at payment frequency in contracts:
- Monthly clients: rate is monthly (×12 for annual)
- Quarterly clients: rate is quarterly (×4 for annual)

### Expected Fee Calculation (calculate_expected_fee function)
1. Flat: Simply return flat_rate
2. Percentage: Try in order:
   - AUM from specific period payment
   - Most recent AUM before period
   - Last payment amount as fallback

### Variance Thresholds
- exact: <$0.01 difference
- acceptable: ≤5%
- warning: ≤15%
- alert: >15%

### Current Period Logic
Arrears model means "current" = previous completed period:
- Monthly: If Jan, then Dec prior year; else current month -1
- Quarterly: If Q1, then Q4 prior year; else current quarter -1

## Key View Patterns

### Dashboard Views
- dashboard_view: Current status, rates at all frequencies, AUM (recorded/estimated)
- payment_status_base: Core logic for Due/Paid determination
- sidebar_clients_view: Simple compliance status (green/yellow)

### Summary Hierarchy
1. quarterly_summary_aggregated: Base quarterly aggregation
2. quarterly_summary_enhanced: +notes, +rate calculations
3. provider_quarterly_summary: Provider-level rollup
4. quarterly_page_data: Complete quarterly page data

### Annual Views
- annual_summary_by_client: Quarterly breakdown, annual totals
- provider_annual_summary: Provider-level annual rollup
- annual_page_data: Complete annual page with both levels

### Operational Views
- comprehensive_payment_summary: Full payment matrix with variance
- payment_history_view: Individual payments with calculations
- client_period_matrix: All expected periods per client/contract

## Data Patterns & Constraints
- Quarters derived from months: Q1(1-3), Q2(4-6), Q3(7-9), Q4(10-12)
- Period display: Monthly="January 2025", Quarterly="Q1 2025"
- AUM estimation: For percentage fees without recorded assets, derive from payment/rate
- Posted tracking: Both individual payments and quarterly markers

## Notable Implementation Details
- No browser storage in artifacts (React state only)
- Heavy use of CASE statements for period/schedule branching
- Variance calculations respect NULL/zero expected fees
- All monetary amounts ROUND(,2), percentages ROUND(,1 or 4)
```

!!!!! POTENTIALLY OUTDATED INFORMATION ABOVE READ WITH CAUTION !!!!! 