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

**When "View by Provider" is toggled:**

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
- `compliance_status`: 'yellow' (payment due) or 'green' (paid up)

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
- Shows ALL clients, even those with no payments (critical for compliance tracking)

**Annual View:**
- Same provider/client grouping
- Columns for Q1-Q4 with yearly total
- Payment count indicators per quarter
- Yearly variance calculation

**DATA SOURCES:**

1. **Quarterly Summary Data:** `quarterly_summary_aggregated`
   - Shows EVERY client (even with no payments)
   - Provider grouping with client totals
   - Expected vs actual amounts with accurate variance calculation
   - `payment_count` and `expected_payment_count` for completion tracking
   - Posted status tracking
   - `variance_status` calculated from aggregated amounts

2. **Payment Details:** `comprehensive_payment_summary`
   - Individual period records for expanded view
   - Shows ALL periods (payment_id NULL = missing payment)
   - Intelligently calculated expected fees with 3-tier fallback

3. **Annual Summary Data:** `yearly_summaries_view`
   - Aggregated yearly totals with quarterly breakdown
   - Q1-Q4 actual amounts and payment counts
   - Yearly variance calculation with proper status

4. **Client Notes:** `quarterly_notes`
   - Quarter-specific notes per client
   - Editable via modal dialog

#### Key Features

**Payment Status Display:**
- "2 of 3" format using `payment_count` / `expected_payment_count`
- Red highlight for clients with missing payments
- NULL payment_id indicates period without payment

**Variance Indicators:**
- ✓ Check (green): exact - Within $0.01
- 🟢 Green: acceptable - Within 5% variance
- ⚠️ Warning (amber): warning - 5-15% variance  
- ⚠️ Alert (red): alert - Over 15% variance
- 🚫 No payment: no_payment - Missing payment
- ❓ Unknown: unknown - Cannot calculate expected

**Expansion States:**
- Provider rows toggle to show/hide clients
- Client rows toggle to show payment periods (quarterly view only)
- Missing payments show as distinct rows with "No Payment" status

**Interactive Elements:**
- Client names link to `/Payments?client={id}`
- Posted checkboxes bulk update via `updateQuarterPostedStatus()`
- Note icons open edit modal for quarterly notes

**URL Structure:**
- Quarterly: `/Summary?year=2025&quarter=4&view=quarterly`
- Annual: `/Summary?year=2025&view=annual`

#### Export Functionality

**Export Principle:** "Export = Current View" - What you see is what you export

**Export Options:**
- CSV format (using PapaParse library)
- Excel format (using SheetJS/xlsx library)

**Export Behavior:**
- Quarterly view exports only the selected quarter
- Annual view exports full year with quarterly breakdown
- Provider rows show aggregated totals
- Client rows show individual data with proper indentation

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

**Required Libraries:**
```json
"papaparse": "^5.x.x",    // CSV generation
"xlsx": "^0.x.x"          // Excel generation
```

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

// Quarterly summary
GET /api/quarterly-summary?year={year}&quarter={quarter}
→ SELECT * FROM quarterly_summary_aggregated 
  WHERE applied_year = ? AND quarter = ?
  ORDER BY provider_name, display_name

// Payment details for expansion
GET /api/payment-details?client_id={id}&year={year}&quarter={quarter}
→ SELECT * FROM comprehensive_payment_summary
  WHERE client_id = ? AND year = ? AND quarter = ?
  ORDER BY period

// Annual summary
GET /api/annual-summary?year={year}
→ SELECT * FROM yearly_summaries_view
  WHERE year = ?
  ORDER BY provider_name, display_name

// Update posted status for entire quarter
PUT /api/payments/quarter-posted
{
  client_id: number,
  year: number,
  quarter: number,
  posted: boolean
}
→ Updates all payments in the quarter
```

-----

### 💡 BUSINESS LOGIC & DATA NOTES

**Dashboard View Magic:**
The `dashboard_view` consolidates everything needed for the dashboard into one efficient query:

- Client info + Contract details + Payment status + Contact info
- AUM with source indicator (recorded vs estimated from payment)
- Pre-calculated display values (current_period_display, formatted rates)
- Expected fee for current period

**Expected Fee Calculation:**
The `calculate_expected_fee` function uses intelligent 3-tier fallback:

1. Try current period's AUM (if available)
2. Fall back to most recent AUM from any prior payment
3. Fall back to last payment amount (assumes stable AUM)

This ensures percentage-based clients always have expected fees calculated, even when providers like Ascensus or Principal don't record AUM.

**Rate Display:**
Database stores raw rates (0.0007) but views provide display-ready percentages:

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

- `payments.expected_fee`: DO NOT USE - unreliable historical data
- `dashboard_view.expected_fee`: Current - what we expect for current period
- `comprehensive_payment_summary.expected_fee`: Calculated fresh using fallback logic
- Form calculation: Live - updates as user types

**Payment Status Logic:**
Simple binary in `sidebar_clients_view`:

- `compliance_status = 'green'`: All caught up
- `compliance_status = 'yellow'`: Payment due

**Period Selection:**
`payment_form_periods_view` provides:

- Only periods where client was active
- Only unpaid periods (is_paid = 0)
- Formatted display text (e.g., "June 2025" or "Q2 2025")

**Variance Thresholds:**

- `exact`: < $0.01 difference (green check)
- `acceptable`: ≤ 5% variance (green)
- `warning`: 5-15% variance (yellow)
- `alert`: > 15% variance (red)
- `no_payment`: Missing payment (red)
- `unknown`: Cannot calculate expected (gray)

**Summary Page Completeness:**
The new views ensure ALL clients appear in summaries:

- `quarterly_summary_aggregated`: Shows every client, even with 0 payments
- `comprehensive_payment_summary`: Shows every period, NULL payment_id = missing
- `expected_payment_count`: Enables "2 of 3" style tracking

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

quarterly_summary_aggregated
    └── Summary page quarterly data (ALL clients)
    
comprehensive_payment_summary
    └── Payment period details (ALL periods)
    
yearly_summaries_view
    └── Annual summary with quarterly breakdown
    
quarterly_notes
    └── Client notes by quarter

calculate_expected_fee (function)
    └── Intelligent 3-tier fallback for expected fees


# FRONTEND-DB-GUIDE.md (CONTINUED)

## 🔧 IMPLEMENTATION DETAILS

### 📍 Component-to-Data Mappings

#### Contract Details Card
**COMPONENT:** `src/components/dashboard/ContractCard.tsx`

```javascript
// Data mapping
{
  contractNumber: data.contract_number,
  planProvider: data.provider_name,
  paymentFrequency: data.payment_schedule,
  feeStructure: data.fee_type === 'percentage' ? 'AUM%' : 'Flat Fee',
  feeAmount: data.fee_type === 'percentage' 
    ? `${data.percent_rate * 100}%` 
    : `$${data.flat_rate.toLocaleString()}`
}
```

#### Payment Information Card
**COMPONENT:** `src/components/dashboard/PaymentInfoCard.tsx`

```javascript
// Combines data from multiple views
{
  aum: metricsData.last_recorded_assets,
  expectedFee: statusData.expected_fee,
  lastPayment: formatDate(metricsData.last_payment_date, 'MM/DD/YYYY'),
  lastPaymentAmount: metricsData.last_payment_amount,
  currentPeriod: `${statusData.current_period} ${statusData.current_year}`,
  paymentStatus: statusData.payment_status,
  ytdPayments: metricsData.total_ytd_payments
}
```

#### Compliance Card (Payment Status)
**COMPONENT:** `src/components/dashboard/ComplianceCard.tsx`

```javascript
// Status display logic
const statusDisplay = {
  'Paid': { text: 'Up to Date', icon: CheckCircleIcon, color: 'green' },
  'Due': { text: 'Payment Due', icon: ExclamationTriangleIcon, color: 'yellow' }
};

// Schedule formatting
const scheduleText = `${contract.payment_schedule} @ ${
  contract.fee_type === 'percentage' 
    ? `${contract.percent_rate * 100}%` 
    : `$${contract.flat_rate}`
}`;
```

### 🔌 API Endpoints & Hooks

#### Dashboard Data Loading
**HOOK:** `src/hooks/useClientDashboard.ts`

```typescript
const useClientDashboard = (clientId: number) => {
  // Fetches dashboard_view + related data
  const { data, error, isLoading } = useSWR(
    `/api/dashboard/${clientId}`,
    fetcher
  );
  
  return {
    dashboardData: data?.dashboard,      // dashboard_view
    metricsData: data?.metrics,          // client_metrics_view
    feeReference: data?.feeReference,    // client_fee_reference
    isLoading,
    error
  };
};
```

#### Period Selection
**HOOK:** `src/hooks/usePeriods.ts`

```typescript
const usePeriods = (clientId: number) => {
  const { data } = useSWR(
    `/api/periods?client_id=${clientId}`,
    fetcher
  );
  
  // Returns only unpaid periods
  return data?.filter(p => p.is_paid === 0) || [];
};
```

#### Payment Operations
**HOOK:** `src/hooks/usePayments.ts`

```typescript
const usePayments = (clientId: number) => {
  const { data, mutate } = useSWR(
    `/api/payments?client_id=${clientId}`,
    fetcher
  );
  
  const createPayment = async (payment) => {
    await fetch('/api/payments', {
      method: 'POST',
      body: JSON.stringify(payment)
    });
    mutate(); // Refresh list
  };
  
  const updatePayment = async (id, updates) => {
    await fetch(`/api/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    mutate();
  };
  
  return { payments: data, createPayment, updatePayment };
};
```

### 🗃️ State Management

**STORE:** `src/stores/useAppStore.ts`

```typescript
interface AppStore {
  // Client Selection
  selectedClient: Client | null;
  setSelectedClient: (client: Client) => void;
  
  // Client List
  clients: Client[];
  isLoadingClients: boolean;
  loadClients: () => Promise<void>;
  
  // View State
  viewByProvider: boolean;
  toggleViewByProvider: () => void;
  
  // Summary Page State
  summaryYear: number;
  summaryQuarter: number;
  summaryView: 'quarterly' | 'annual';
  setSummaryPeriod: (year: number, quarter?: number) => void;
}
```

### 🎯 Business Logic Implementation

#### Rate Conversion Logic
```typescript
// DO NOT SCALE RATES - They're pre-scaled in the database!
const calculateExpectedFee = (contract, aum) => {
  if (contract.fee_type === 'flat') {
    return contract.flat_rate;
  }
  
  if (contract.fee_type === 'percentage' && aum) {
    // Rate is already scaled to payment frequency
    return aum * contract.percent_rate;
  }
  
  return null;
};

// For annual display only
const getAnnualRate = (contract) => {
  if (contract.payment_schedule === 'monthly') {
    return contract.percent_rate * 12;
  }
  if (contract.payment_schedule === 'quarterly') {
    return contract.percent_rate * 4;
  }
  return contract.percent_rate; // Annual
};
```

#### Period Formatting
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
  
  return `${year}`; // Annual
};
```

#### Variance Status Styling
```typescript
const getVarianceStyle = (status: string) => {
  switch(status) {
    case 'exact':
      return { color: 'green', icon: '✓' };
    case 'acceptable':
      return { color: 'green', icon: '✓' };
    case 'warning':
      return { color: 'amber', icon: '⚠️' };
    case 'alert':
      return { color: 'red', icon: '⚠️' };
    case 'no_payment':
      return { color: 'red', icon: '🚫' };
    case 'unknown':
      return { color: 'gray', icon: '❓' };
    default:
      return { color: 'gray', icon: '-' };
  }
};
```

### 🛠️ Form Handling

#### Payment Form Validation
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
  
  // Date cannot be future
  if (new Date(payment.received_date) > new Date()) {
    errors.received_date = 'Cannot be in the future';
  }
  
  return errors;
};
```

#### Expected Fee Live Calculation
```typescript
const PaymentForm = ({ contract, defaultAUM }) => {
  const [aum, setAUM] = useState(defaultAUM);
  const [expectedFee, setExpectedFee] = useState(null);
  
  useEffect(() => {
    if (contract.fee_type === 'flat') {
      setExpectedFee(contract.flat_rate);
    } else if (contract.fee_type === 'percentage' && aum) {
      setExpectedFee(aum * contract.percent_rate);
    } else {
      setExpectedFee(null);
    }
  }, [aum, contract]);
  
  // ... rest of form
};
```

### 📊 Summary Page Data Handling

#### Quarterly Data Processing
```typescript
const processQuarterlyData = (data: QuarterlySummary[]) => {
  // Group by provider
  const byProvider = data.reduce((acc, row) => {
    if (!acc[row.provider_name]) {
      acc[row.provider_name] = {
        provider: row.provider_name,
        clients: [],
        totals: {
          expected: 0,
          actual: 0,
          payment_count: 0,
          expected_count: 0
        }
      };
    }
    
    acc[row.provider_name].clients.push(row);
    acc[row.provider_name].totals.expected += row.expected_total;
    acc[row.provider_name].totals.actual += row.actual_total;
    acc[row.provider_name].totals.payment_count += row.payment_count;
    acc[row.provider_name].totals.expected_count += row.expected_payment_count;
    
    return acc;
  }, {});
  
  return Object.values(byProvider);
};
```

#### Missing Payment Highlighting
```typescript
const ClientRow = ({ client }) => {
  const hasMissingPayments = client.payment_count < client.expected_payment_count;
  
  return (
    <tr className={hasMissingPayments ? 'bg-red-50' : ''}>
      <td>{client.display_name}</td>
      <td>{client.payment_count} of {client.expected_payment_count}</td>
      <td className={getVarianceStyle(client.variance_status).color}>
        ${client.actual_total.toLocaleString()}
      </td>
    </tr>
  );
};
```

### 🔄 Data Refresh Patterns

```typescript
// After payment creation/update
const handlePaymentSave = async (payment) => {
  await createPayment(payment);
  
  // Refresh affected data
  mutate(`/api/dashboard/${clientId}`);        // Update dashboard
  mutate(`/api/payments?client_id=${clientId}`); // Update history
  mutate('/api/clients');                       // Update sidebar status
};

// Periodic refresh for current period changes
useEffect(() => {
  const checkPeriodChange = () => {
    const now = new Date();
    const isNewMonth = now.getDate() === 1;
    const isNewQuarter = now.getDate() === 1 && [1, 4, 7, 10].includes(now.getMonth() + 1);
    
    if (isNewMonth || isNewQuarter) {
      // Refresh all data
      mutate();
    }
  };
  
  const interval = setInterval(checkPeriodChange, 1000 * 60 * 60); // Check hourly
  return () => clearInterval(interval);
}, []);
```

### 🔐 Data Integrity Checks

```typescript
// Verify contract exists before payment
const canCreatePayment = (dashboardData) => {
  return dashboardData?.contract_id != null;
};

// Validate period selection
const isValidPeriod = (period, availablePeriods) => {
  return availablePeriods.some(p => 
    p.year === period.year && 
    p.period === period.period && 
    p.is_paid === 0
  );
};

// Prevent duplicate payments
const checkDuplicatePayment = async (clientId, period) => {
  const existing = await fetch(
    `/api/payments?client_id=${clientId}&year=${period.year}&period=${period.period}`
  );
  return existing.length > 0;
};
```