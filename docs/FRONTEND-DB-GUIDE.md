# FRONTEND-DB-GUIDE.md

## 🗄️ DATABASE-TO-UI MAPPING

### 📊 Dashboard Overview
The application displays payment tracking for financial advisory clients with 401(k) plans. Each client has one active contract with a provider (John Hancock, Voya, Ascensus, etc.) and pays advisory fees either monthly or quarterly, calculated as a percentage of AUM or a flat fee.

---

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

---

### 📋 MAIN CLIENT VIEW
**COMPONENT:** `src/pages/Payments.tsx`

When a client is selected, the header shows:
```
ACME CORPORATION - Acme
└─ full_name ─┘   └display_name┘
```

**DATA SOURCE:** `dashboard_view` (single source for entire dashboard!)

---

### 💼 CONTRACT DETAILS CARD
**COMPONENT:** `src/components/dashboard/ContractCard.tsx`

Displays the client's contract information:
```
┌─────────────────────────────────┐
│ Contract Details                │
├─────────────────────────────────┤
│ Contract Number: 134565         │ ← contract_number (NULL for ~30%)
│ Plan Provider: John Hancock     │ ← provider_name
│ Payment Frequency: Monthly      │ ← payment_schedule
│ Fee Structure: AUM%             │ ← fee_type ('percentage' → 'AUM%', 'flat' → 'Flat Fee')
│ Fee Amount: 0.84%               │ ← annual_rate (% clients) OR flat_rate (flat clients)
└─────────────────────────────────┘
```

**NOTE:** The percent_rate in DB is already scaled for payment frequency!

---

### 💰 PAYMENT INFORMATION CARD
**COMPONENT:** `src/components/dashboard/PaymentInfoCard.tsx`

Shows payment metrics and calculations:
```
┌─────────────────────────────────┐
│ Payment Information             │
├─────────────────────────────────┤
│ AUM: $1,400,234 (recorded)     │ ← aum_estimated + aum_source
│ Expected Fee: $980.16           │ ← expected_fee
│ Last Payment: 05/13/25          │ ← last_payment_date
│ Last Amount: $930.09            │ ← last_payment_amount  
│ Current Period: June 2025 🔵    │ ← current_period + current_year
│ Payment Status: Due 🟡          │ ← payment_status
│ YTD Payments: $2,786.47         │ ← total_ytd_payments
└─────────────────────────────────┘
```

**TODO - UI Enhancement:** 
- [ ] Add indicator for AUM source: "(recorded)" vs "(estimated from payment)" with appropriate icon

**CRITICAL DATA:**
- `contract_id`: Available from dashboard_view for payment creation
- Expected fee auto-calculates: AUM × percent_rate OR flat_rate
- AUM can be estimated from payment ÷ rate when not recorded

---

### ✅ PAYMENT STATUS CARD
**COMPONENT:** `src/components/dashboard/ComplianceCard.tsx`

Large status indicator with fee reference:
```
┌─────────────────────────────────┐
│        ⚠️ PAYMENT DUE          │ ← payment_status
│         June 2025              │ ← current_period formatted
│     Monthly @ 0.07%            │ ← payment_schedule + rate
├─────────────────────────────────┤
│ Fee Reference:                  │
│ Monthly:    0.07%              │ ← monthly_rate
│ Quarterly:  0.21%              │ ← quarterly_rate  
│ Annual:     0.84%              │ ← annual_rate
└─────────────────────────────────┘
```

**TODO - UI Logic:**
- [ ] Display rates as percentages for % clients, dollars for flat fee clients
- [ ] Format percentage rates: multiply by 100 for display (0.0007 → 0.07%)

---

### 📝 PAYMENT FORM
**COMPONENT:** `src/components/payment/PaymentForm.tsx`

Form for recording new payments:
```
┌─────────────────────────────────┐
│ Record Payment                  │
├─────────────────────────────────┤
│ Received Date: [____-__-__]    │ ← User input
│ Payment Amount: [$_____.__]    │ ← User input
│ AUM: [$1,400,234.25]           │ ← Defaults to suggested_aum
│ Payment Method: [Check ▼]      │ ← HARDCODED list
│ Applied Period: [June 2025 ▼]  │ ← FROM: payment_form_periods_view
│ Expected Fee: $980.16          │ ← Live calculation
│ Notes: [___________________]   │ ← User input
│                                │
│ [Cancel] [Save Payment]        │
└─────────────────────────────────┘
```

**PAYMENT METHODS (hardcoded):**
- Check
- ACH  
- Wire
- Auto - Check
- Auto - ACH
- Invoice - Check

**TODO - Form Enhancement:**
- [ ] Implement live expected fee calculation as user types AUM
- [ ] Pre-fill AUM from payment_form_defaults_view.suggested_aum

**CRITICAL FOR SUBMISSION:**
- Must include both `client_id` and `contract_id`
- Period dropdown only shows unpaid periods (is_paid = 0)
- Expected fee is what we calculate NOW (not historical)

---

### 📜 PAYMENT HISTORY TABLE
**COMPONENT:** `src/components/payment/PaymentHistory.tsx`

Shows all payments with variance analysis:
```
┌──────┬──────────┬────────┬─────────┬──────────┬──────────┬───────────┬─────┐
│ Date │ Provider │ Period │ Payment │ Expected │ Variance │    AUM    │     │
├──────┼──────────┼────────┼─────────┼──────────┼──────────┼───────────┼─────┤
│05/13 │John Han..│Apr 2025│ $930.09 │  Unknown │    --    │$1,400,234 │[✏️🗑️]│
│04/21 │John Han..│Mar 2025│ $925.94 │  Unknown │    --    │$1,394,055 │[✏️🗑️]│
│10/26 │John Han..│Sep 2022│ $681.45 │  $697.06 │  -$15.61 │$1,025,920 │[✏️🗑️]│
└──────┴──────────┴────────┴─────────┴──────────┴──────────┴───────────┴─────┘
```

**DATA SOURCE:** `payment_history_view`
- Variance colors: Green (exact/acceptable), Yellow (warning 5-15%), Red (alert >15%)
- Provider comes directly from view (no JOIN needed)
- Shows historical expected fee (what was expected AT THAT TIME)

---

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

---

### 💡 BUSINESS LOGIC & DATA NOTES

**Rate Scaling:**
The rates stored in the database are already scaled to the payment frequency:
- Monthly at 0.84% annual = stored as 0.0007 (0.84% ÷ 12)
- Quarterly at 0.84% annual = stored as 0.0021 (0.84% ÷ 4)
- **Don't scale again!** Just multiply by AUM.

**Billing in Arrears:**
- Current date: July 2025
- Monthly clients: Billing for June 2025
- Quarterly clients: Billing for Q2 2025 (April-June)
- Always one period behind!

**Period Display:**
- Monthly: 6 → "June"
- Quarterly: 2 → "Q2"
- Use period_display from views when available

**AUM Handling:**
- Can be NULL for percentage clients (when not recorded)
- dashboard_view provides both recorded AUM and estimated AUM
- Estimated AUM = last payment ÷ rate (for display purposes)
- Always prefer recorded over estimated

**Expected Fee Context:**
- `payments.expected_fee`: Historical - what was expected when payment was made
- `dashboard_view.expected_fee`: Current - what we expect for current period  
- Form calculation: Live - updates as user types

**Variance Analysis:**
- Based on historical expected_fee stored in payments table
- "Unknown" when no expected fee was recorded
- Percentage variance determines color coding

**Multiple Payments:**
Clients can make multiple payments for the same period (partials, corrections). Views handle SUMming automatically.

---

### 🚀 FUTURE FEATURES

**Quarterly Summary Page** (View exists: `quarterly_totals`)
- Shows total payments by quarter
- Payment counts to identify partial payments
- Year comparisons

**Views to Clean Up:**
- `client_metrics_view` - Replaced by dashboard_view
- Old individual views consolidated into dashboard_view



-- SEE @DB_SCHEMA_REFERENCE.sql

