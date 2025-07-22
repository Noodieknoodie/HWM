# TODO: Migrate Business Logic from SQL to TypeScript in HWM 401k Tracker
## Context
The system currently uses SQL functions and views to calculate expected fees, variances, and rate conversions. We're moving these calculations to TypeScript to make the database a pure data store. This affects 11 views, 2 functions, and most frontend components.
---  a
## HIGH LEVEL EXECUTION PLAN
### Phase 1: Build TypeScript Calculation Layer
1. Create `/utils/calculations/` directory structure
2. Implement core calculation functions:
   - Period calculations (current period, arrears logic, quarter mapping)
   - Fee calculations (expected fee with AUM handling)
   - Rate conversions (payment frequency to display rates)
   - Variance calculations (with estimation detection)
   - Payment status determination
3. Add comprehensive tests for edge cases
4. **Checkpoint**: All calculations available in TypeScript
### Phase 2: Create New SQL Views (Don't Drop Old Yet)
1. Create `payment_facts` view - raw payment data with joins
2. Create `dashboard_facts` view - includes payment status
3. Keep these existing views:
   - `payment_form_periods_view`
   - `payment_form_defaults_view`
   - `payment_status_base`
   - `sidebar_clients_view`
4. Update database connection config
5. **Checkpoint**: New views accessible via API
### Phase 3: Migrate One Component End-to-End
1. Pick `CurrentStatusCard` as proof of concept
2. Update to use `dashboard_facts` + calculations
3. Verify all functionality preserved
4. **Checkpoint**: One component fully migrated
### Phase 4: Migrate Remaining Components
1. Dashboard cards (3 remaining)
2. Payment form (expected fee calculation)
3. Payment history (variance display)
4. Summary page (the big one - provider grouping, totals)
5. **Checkpoint**: All components using new approach
### Phase 5: Clean Up Database
1. Drop old views in dependency order
2. Drop calculation functions
3. Remove old entities from config
4. **Checkpoint**: Database simplified
### Phase 6: Optimize & Polish
1. Add caching for repeated calculations
2. Ensure proper null handling throughout
3. Performance test Summary page with large datasets
4. Update types for better safety
---
## Success Criteria
- [ ] Database contains zero business logic
- [ ] All calculations happen in TypeScript
- [ ] No breaking changes for users
- [ ] Summary page loads as fast or faster
- [ ] Variance display properly handles estimated AUM
## Implementation Order Rationale
1. **Calculations first** - Can't remove SQL until replacements exist
2. **New views parallel** - Test without breaking existing code
3. **One component proof** - Validate approach before mass migration
4. **Summary page last** - Most complex, needs working foundation
TODO: Build TypeScript Calculation Layer for 401k Payment Tracker
Context
This system tracks management fee payments from 401k providers to HWM. Currently, SQL views calculate expected fees, variances, and rate conversions. We're moving these calculations to TypeScript. The system bills in arrears (July bills for June) and handles both percentage-based fees (% of assets) and flat fees. This phase creates the calculation functions - nothing breaks yet since we're not removing SQL.
ISSUE 1: Period Calculations
The Issue
The system needs to determine "what period should we bill for right now?" Since we bill in arrears, if today is July 2024, we're billing for June 2024 (monthly) or Q2 2024 (quarterly). SQL currently handles this, but inconsistently across views.
Why This Matters
Payment Entry: Users need to know which period they're recording
Dashboard: Shows "June 2024 - Awaiting Entry"
Consistency: Different views calculate this differently
Expected Solution
Function that returns current billable period based on date and schedule
Handles year rollover (January 2025 bills for December 2024)
Quarter mapping for monthly payments (Jan/Feb/Mar = Q1)
Period display formatting ("June 2024" or "Q2 2024")
Dependencies & Files Touched
New file: src/utils/calculations/periodCalculations.ts
Implementation
typescript// src/utils/calculations/periodCalculations.ts
export interface BillablePeriod {
  period: number;
  year: number;
  periodType: 'monthly' | 'quarterly';
}
export function getCurrentBillablePeriod(
  currentDate: Date,
  paymentSchedule: 'monthly' | 'quarterly'
): BillablePeriod {
  // Arrears logic: bill for previous period
  // If monthly and current month is January, return December of previous year
  // If quarterly and current quarter is Q1, return Q4 of previous year
}
export function getQuarterFromMonth(month: number): number {
  // 1-3 = Q1, 4-6 = Q2, 7-9 = Q3, 10-12 = Q4
}
export function formatPeriodDisplay(
  period: number,
  year: number,
  periodType: 'monthly' | 'quarterly'
): string {
  // Monthly: "June 2024"
  // Quarterly: "Q2 2024"
}
export function isPaymentCurrent(
  paymentYear: number | null,
  paymentPeriod: number | null,
  paymentSchedule: 'monthly' | 'quarterly'
): boolean {
  // Compare payment period to current billable period
  // Return true if payment exists for current period
}
Test:
July 15, 2024 + monthly → period: 6, year: 2024
January 10, 2025 + quarterly → period: 4, year: 2024
ISSUE 2: Fee Calculations
The Issue
Expected fees depend on fee type. Percentage fees need AUM (assets under management) to calculate. When AUM is missing, we estimate it from the payment BUT must never calculate variance from estimates (it would always be zero).
Why This Matters
Variance Analysis: Can't spot payment errors without expected fees
Estimation Clarity: Users must know when data is estimated
Data Quality: Historical records often lack AUM
Expected Solution
Calculate expected fee when possible
Return null when calculation impossible
Never use historical AUM (it's too stale)
Clear indication when using estimated values
Dependencies & Files Touched
New file: src/utils/calculations/feeCalculations.ts
Implementation
typescript// src/utils/calculations/feeCalculations.ts
export function calculateExpectedFee(
  feeType: 'percentage' | 'flat',
  percentRate: number | null,
  flatRate: number | null,
  currentAum: number | null
): number | null {
  // Flat fee: return flatRate directly
  // Percentage: return AUM * percentRate (or null if no AUM)
  // DO NOT look up historical AUM
}
export function estimateAum(
  actualFee: number,
  percentRate: number
): number {
  // Return actualFee / percentRate
  // Used ONLY for display, never for variance
}
export function isAumEstimated(
  feeType: 'percentage' | 'flat',
  totalAssets: number | null
): boolean {
  // True if percentage-based AND totalAssets is null
}
Test:
Flat $1000 → expected: $1000
0.001 rate + $1M AUM → expected: $1000
0.001 rate + null AUM → expected: null
ISSUE 3: Rate Conversions
The Issue
Rates are stored at payment frequency (monthly rate for monthly clients). But dashboard shows all three rates (monthly/quarterly/annual) regardless of payment schedule. A monthly client paying $1000/month shows: M: $1,000, Q: $3,000, A: $12,000.
Why This Matters
Dashboard Display: Shows comparison rates
Confusion: Storage format vs display format
Consistency: Every card needs same conversion
Expected Solution
Convert stored rate to all display frequencies
Handle both percentage and flat fees
Preserve precision for percentages
Dependencies & Files Touched
New file: src/utils/calculations/rateConversions.ts
Implementation
typescript// src/utils/calculations/rateConversions.ts
export interface DisplayRates {
  monthly: number;
  quarterly: number;
  annual: number;
}
export function convertRates(
  storedRate: number,
  storageFrequency: 'monthly' | 'quarterly',
  feeType: 'percentage' | 'flat'
): DisplayRates {
  // Monthly $1000 → {monthly: 1000, quarterly: 3000, annual: 12000}
  // Quarterly 0.003 → {monthly: 0.001, quarterly: 0.003, annual: 0.012}
}
export function formatRateForDisplay(
  rate: number,
  feeType: 'percentage' | 'flat'
): string {
  // 0.001 + percentage → "0.10%"
  // 1000 + flat → "$1,000"
}
Test:
Monthly $500 flat → Q: $1,500, A: $6,000
Quarterly 0.4% → M: 0.133%, A: 1.6%
ISSUE 4: Variance Calculations
The Issue
Variance = actual - expected, but with rules. Must not calculate variance when AUM is estimated (would always be zero). Need severity levels: exact (<$2), acceptable (<5%), warning (<15%), alert (>15%).
Why This Matters
Compliance: Dodd needs to spot payment discrepancies
False Positives: Estimated AUM creates fake "perfect" variances
Severity: Not all variances are equal concern
Expected Solution
Calculate variance only with real data
Return special status for estimated scenarios
Apply consistent thresholds
Handle missing payment case
Dependencies & Files Touched
New file: src/utils/calculations/varianceCalculations.ts
Implementation
typescript// src/utils/calculations/varianceCalculations.ts
export type VarianceStatus =
  | 'no_payment'   // No payment recorded
  | 'exact'        // Within $2
  | 'acceptable'   // Within 5%
  | 'warning'      // Within 15%
  | 'alert'        // Over 15%
  | 'unknown';     // Can't calculate (estimated AUM)
export function getVarianceStatus(
  actualFee: number,
  expectedFee: number | null,
  hasPayment: boolean,
  isEstimated: boolean
): VarianceStatus {
  // If no payment: 'no_payment'
  // If estimated: 'unknown'
  // Otherwise calculate percentage and map to status
}
export function calculateVariance(
  actualFee: number,
  expectedFee: number | null,
  isEstimated: boolean
): { amount: number | null; percent: number | null } {
  // Return nulls if estimated or missing expected
  // Otherwise return difference and percentage
}
Test:
No payment → 'no_payment'
Estimated AUM → 'unknown'
$1000 actual, $1000 expected → 'exact'
$1000 actual, $900 expected → 'alert' (11% variance)
ISSUE 5: Comprehensive Test Suite
The Issue
These calculations have edge cases. Year boundaries, null values, zero amounts. Need confidence before removing SQL.
Why This Matters
Trust: Can't delete SQL functions without proof
Edge Cases: January rollover, Q1 rollback, missing data
Regression: Ensure calculations match current SQL exactly
Expected Solution
Test every function with production-like scenarios
Cover null/undefined/zero cases
Verify matches current SQL results
Document business rule assumptions
Dependencies & Files Touched
New file: src/utils/calculations/__tests__/calculations.test.ts
Implementation
typescript// Create test file with comprehensive scenarios
// Test period calculations across year boundaries
// Test fee calculations with missing AUM
// Test rate conversions both directions
// Test variance with all status outcomes
// Include real data examples from production
Validation Checklist
 Period calculations: getCurrentBillablePeriod(new Date('2024-01-15'), 'monthly') returns December 2023
 Fee calculations: Percentage fee with null AUM returns null (not error)
 Rate conversions: Monthly $1000 converts to annual $12,000
 Variance status: Estimated AUM always returns 'unknown' status
 All calculations pure functions with no side effects
Implementation Order
Period calculations - Needed by everything
Fee calculations - Core business logic
Rate conversions - Display logic
Variance calculations - Depends on fees
Test suite - Proves everything works
====
# TODO: Create New SQL Views Without Calculations in HWM 401k Tracker
## Context
The system has 11 views doing calculations in SQL. We've built TypeScript functions to replace these calculations (Phase 1 complete). Now we create simplified views that return raw data only. We're NOT dropping old views yet - running parallel to test. The goal: database becomes dumb storage, TypeScript becomes smart calculator.
---
## ISSUE 1: Create payment_facts View
### The Issue
Currently, payment data is scattered across multiple calculating views. We need one clean view with all payment facts - no calculations, just joins. This replaces the complex dependency chain starting with comprehensive_payment_summary.
### Why This Matters
- **Single Source**: One view for all payment queries
- **Performance**: No nested view dependencies
- **Clarity**: Raw data = predictable results
### Expected Solution
- All payment records with related data
- Contract rates AS STORED (no conversion)
- Real posted status from client_quarter_markers
- Quarter mapping for structure only
### Dependencies & Files Touched
**Database:** Create new view `payment_facts`
**Replaces:** `comprehensive_payment_summary`, `payment_history_view`, and partially others
### Implementation
**Phase 1: Create the view**
```sql
CREATE VIEW payment_facts AS
SELECT
  -- Payment core
  p.payment_id,
  p.contract_id,
  p.client_id,
  p.received_date,
  p.total_assets,    -- NULL when missing (no estimation)
  p.actual_fee,
  p.method,
  p.notes,
  p.applied_period_type,
  p.applied_period,
  p.applied_year,

  -- Client context
  c.display_name,
  c.full_name,
  c.ima_signed_date,

  -- Contract details (RAW RATES)
  ct.provider_name,
  ct.contract_number,
  ct.payment_schedule,
  ct.fee_type,
  ct.percent_rate,     -- AS STORED: 0.001 for 0.1%
  ct.flat_rate,        -- AS STORED: 1000 for monthly $1000
  ct.num_people,

  -- Structural mapping only
  CASE
    WHEN p.applied_period_type = 'monthly' THEN
      CASE
        WHEN p.applied_period IN (1,2,3) THEN 1
        WHEN p.applied_period IN (4,5,6) THEN 2
        WHEN p.applied_period IN (7,8,9) THEN 3
        WHEN p.applied_period IN (10,11,12) THEN 4
      END
    ELSE p.applied_period
  END as quarter,

  -- Real posted status
  CASE
    WHEN cqm.is_posted = 1 THEN 1
    ELSE 0
  END as is_posted
FROM payments p
INNER JOIN contracts ct ON p.contract_id = ct.contract_id
INNER JOIN clients c ON p.client_id = c.client_id
LEFT JOIN client_quarter_markers cqm
  ON cqm.client_id = p.client_id
  AND cqm.year = p.applied_year
  AND cqm.quarter = CASE
    WHEN p.applied_period_type = 'monthly' THEN
      CASE
        WHEN p.applied_period IN (1,2,3) THEN 1
        WHEN p.applied_period IN (4,5,6) THEN 2
        WHEN p.applied_period IN (7,8,9) THEN 3
        WHEN p.applied_period IN (10,11,12) THEN 4
      END
    ELSE p.applied_period
  END;
```
**Test:** Query should return raw payment data with no calculated fields
---
## ISSUE 2: Create dashboard_facts View
### The Issue
Dashboard needs current client state - last payment, contract details, payment status. Current dashboard_view calculates rates and expected fees. New view returns facts only, INCLUDING payment status to avoid double API calls.
### Why This Matters
- **Dashboard Performance**: One API call not two
- **Payment Status**: Critical for UI state
- **Clean Data**: No calculated rates
### Expected Solution
- Client and contract facts
- Last payment information
- Payment status from payment_status_base
- Primary contact info
- NO rate conversions or calculations
### Dependencies & Files Touched
**Database:** Create new view `dashboard_facts`
**Includes:** JOIN to payment_status_base for status
**Replaces:** `dashboard_view`
### Implementation
**Phase 1: Create the view**
```sql
CREATE VIEW dashboard_facts AS
WITH LastPayment AS (
  SELECT
    client_id,
    payment_id,
    received_date,
    actual_fee,
    total_assets,
    applied_period,
    applied_year,
    applied_period_type,
    ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY received_date DESC, payment_id DESC) as rn
  FROM payments
)
SELECT
  -- Client base
  c.client_id,
  c.display_name,
  c.full_name,
  c.ima_signed_date,

  -- Contract (RAW RATES)
  ct.contract_id,
  ct.provider_name,
  ct.contract_number,
  ct.payment_schedule,
  ct.fee_type,
  ct.percent_rate,     -- RAW: 0.001
  ct.flat_rate,        -- RAW: 1000
  ct.num_people,

  -- Last payment facts
  lp.payment_id as last_payment_id,
  lp.received_date as last_payment_date,
  lp.actual_fee as last_payment_amount,
  lp.total_assets as last_recorded_assets,  -- NULL when missing
  lp.applied_period as last_applied_period,
  lp.applied_year as last_applied_year,
  lp.applied_period_type as last_applied_period_type,

  -- Payment status (FROM payment_status_base)
  ps.payment_status,   -- 'Due' or 'Paid'
  ps.current_period,
  ps.current_year,

  -- Primary contact
  con.contact_name,
  con.phone,
  con.email,
  con.physical_address
FROM clients c
INNER JOIN contracts ct ON c.client_id = ct.client_id
LEFT JOIN LastPayment lp ON c.client_id = lp.client_id AND lp.rn = 1
LEFT JOIN payment_status_base ps ON c.client_id = ps.client_id
LEFT JOIN contacts con ON c.client_id = con.client_id AND con.contact_type = 'Primary';
```
**Test:** Should include payment_status field directly
---
## ISSUE 3: Keep Essential Helper Views
### The Issue
Some views aren't calculations - they're lookups. Payment form needs available periods. These lightweight views should stay.
### Why This Matters
- **Form Dropdowns**: Need list of unpaid periods
- **Suggested Values**: Pre-populate forms
- **Not Business Logic**: Just filtering
### Expected Solution
- Keep payment_form_periods_view AS IS
- Keep payment_form_defaults_view AS IS
- Keep payment_status_base AS IS
- Keep sidebar_clients_view AS IS
- Document why they stay
### Dependencies & Files Touched
**No changes:** These views remain untouched
### Implementation
```sql
-- KEEP THESE VIEWS UNCHANGED:
-- 1. payment_form_periods_view - Lists unpaid periods for dropdown
-- 2. payment_form_defaults_view - Suggests AUM from history
-- 3. payment_status_base - Core Due/Paid logic
-- 4. sidebar_clients_view - Client list with status
-- These are lookups/filters, not calculations
```
---
## ISSUE 4: Add Views to Data API Configuration
### The Issue
New views need REST endpoints. Azure Static Web Apps database connections auto-generates APIs from config.
### Why This Matters
- **API Access**: Frontend can't query without config
- **Security**: Proper role-based permissions
- **Key Fields**: Enable single-record lookups
### Expected Solution
- Add payment_facts entity
- Add dashboard_facts entity
- Proper key fields for REST
- Don't remove old entities yet
### Dependencies & Files Touched
**Config:** `swa-db-connections/staticwebapp.database.config.json`
### Implementation
**Phase 1: Add new entities (keep old ones)**
```json
{
  "entities": {
    // ... existing entities stay ...

    "payment_facts": {
      "source": {
        "object": "dbo.payment_facts",
        "type": "view",
        "key-fields": ["payment_id"]
      },
      "permissions": [
        {
          "role": "authenticated",
          "actions": ["read"]
        }
      ]
    },

    "dashboard_facts": {
      "source": {
        "object": "dbo.dashboard_facts",
        "type": "view",
        "key-fields": ["client_id"]
      },
      "permissions": [
        {
          "role": "authenticated",
          "actions": ["read"]
        }
      ]
    }
  }
}
```
**Test:**
- `/data-api/rest/payment_facts?$filter=client_id eq 1`
- `/data-api/rest/dashboard_facts?$filter=client_id eq 1`
---
## ISSUE 5: Verify Parallel Operation
### The Issue
Both old and new views must work simultaneously. Can't break production while testing.
### Why This Matters
- **Zero Downtime**: Business continues
- **Testing Safety**: Compare old vs new
- **Rollback Option**: Easy retreat if needed
### Expected Solution
- Old views continue working
- New views accessible at different endpoints
- No foreign key or dependency conflicts
- Document which views are staging
### Dependencies & Files Touched
**None:** This is verification only
### Implementation
```sql
-- Run these checks after creating views:
-- 1. Verify row counts match
SELECT 'Old' as source, COUNT(*) as payment_count
FROM comprehensive_payment_summary
UNION ALL
SELECT 'New' as source, COUNT(*) as payment_count
FROM payment_facts;
-- 2. Verify client coverage
SELECT COUNT(DISTINCT client_id) as clients_in_old FROM dashboard_view
UNION ALL
SELECT COUNT(DISTINCT client_id) as clients_in_new FROM dashboard_facts;
-- 3. Test a known client
SELECT percent_rate, flat_rate FROM dashboard_view WHERE client_id = 1
UNION ALL
SELECT percent_rate, flat_rate FROM dashboard_facts WHERE client_id = 1;
```
---
## Validation Checklist
- [ ] payment_facts created: Returns raw payment data with quarter mapping
- [ ] dashboard_facts created: Includes payment_status field from join
- [ ] Config updated: Both new views accessible via REST API
- [ ] Parallel operation: Old views still work unchanged
- [ ] No calculations: Rates stored as-is, no conversions or expected fees
## Implementation Order
1. **Create payment_facts** - Base view others might use
2. **Create dashboard_facts** - Includes payment status join
3. **Update config** - Make REST endpoints available
4. **Test endpoints** - Verify data accessible
5. **Compare results** - Ensure data consistency with old views
====
TODO: Migrate CurrentStatusCard Component to Use New Architecture
Context
We've built TypeScript calculation functions (Phase 1) and created simplified SQL views (Phase 2). Now we prove the architecture works by migrating one component end-to-end. CurrentStatusCard is our proof of concept - it needs period calculations, expected fees, and payment status. If this works, we can migrate everything else with confidence.
ISSUE 1: Update Dashboard Hook to Use dashboard_facts
The Issue
The useClientDashboard hook fetches from old dashboard_view which has calculated fields. Need to switch to dashboard_facts and update the TypeScript interface to match what we actually get back.
Why This Matters
Type Safety: Wrong types = runtime errors
API Change: Different columns returned
Hook Reuse: Other dashboard cards use this same hook
Expected Solution
New interface matching dashboard_facts columns
Fetch from new endpoint
Remove calculated field expectations
Keep backward compatibility for other cards (temporarily)
Dependencies & Files Touched
Update: src/hooks/useClientDashboard.ts
New types: Match dashboard_facts structure
Implementation
Phase 1: Add new types alongside old
typescript// src/hooks/useClientDashboard.ts
// ADD this new interface (keep old one for now)
export interface DashboardFactsData {
  // Client info
  client_id: number;
  display_name: string;
  full_name: string | null;
  ima_signed_date: string | null;

  // Contract info (RAW RATES)
  contract_id: number;
  provider_name: string;
  contract_number: string | null;
  payment_schedule: 'monthly' | 'quarterly';
  fee_type: 'percentage' | 'flat';
  percent_rate: number | null;  // RAW: 0.001 for 0.1%
  flat_rate: number | null;     // RAW: 1000 for $1000/month
  num_people: number | null;

  // Last payment
  last_payment_id: number | null;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  last_recorded_assets: number | null;
  last_applied_period: number | null;
  last_applied_year: number | null;
  last_applied_period_type: 'monthly' | 'quarterly' | null;

  // Status (FROM SQL)
  payment_status: 'Due' | 'Paid';
  current_period: number;
  current_year: number;

  // Contact
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  physical_address: string | null;
}
// Add new fetch function
export function useClientDashboardNew(clientId: number | null) {
  const [dashboardData, setDashboardData] = useState<DashboardFactsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setDashboardData(null);
      return;
    }

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        // NEW ENDPOINT
        const response = await dataApiClient.request(
          `dashboard_facts?$filter=client_id eq ${clientId}`
        );
        const data = Array.isArray(response) ? response[0] : response;
        setDashboardData(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [clientId]);

  return { dashboardData, loading, error };
}
Test: Hook returns raw data with payment_status included
ISSUE 2: Update CurrentStatusCard to Calculate Display Values
The Issue
CurrentStatusCard expects calculated fields like current_period_display, expected_fee, and converted rates. Now it gets raw data and must calculate these itself using our Phase 1 functions.
Why This Matters
Proof of Concept: Validates our architecture
User Experience: Must look identical to before
Pattern Setting: Other components will follow this pattern
Expected Solution
Import calculation functions
Calculate period display from current_period/year
Calculate expected fee using current AUM
Show "Awaiting Entry" for Due status
Handle null gracefully
Dependencies & Files Touched
Update: src/components/dashboard/cards/CurrentStatusCard.tsx
Import: Calculation functions from Phase 1
Implementation
Phase 1: Import dependencies
typescript// src/components/dashboard/cards/CurrentStatusCard.tsx
import React from 'react';
import { DashboardFactsData } from '../../../hooks/useClientDashboard';
import { formatCurrency, formatDateMMDDYY } from '../../../utils/formatters';
import { GridAlignedCard } from './GridAlignedCard';
// NEW IMPORTS
import { formatPeriodDisplay } from '../../../utils/calculations/periodCalculations';
import { calculateExpectedFee } from '../../../utils/calculations/feeCalculations';
interface CurrentStatusCardProps {
  dashboardData: DashboardFactsData;  // NEW TYPE
}
Phase 2: Update component logic
typescriptexport const CurrentStatusCard: React.FC<CurrentStatusCardProps> = ({ dashboardData }) => {
  const isPaid = dashboardData.payment_status === 'Paid';

  // CALCULATE period display (was provided by SQL)
  const currentPeriodDisplay = formatPeriodDisplay(
    dashboardData.current_period,
    dashboardData.current_year,
    dashboardData.payment_schedule
  );

  // CALCULATE expected fee (was provided by SQL)
  const expectedFee = calculateExpectedFee(
    dashboardData.fee_type,
    dashboardData.percent_rate,
    dashboardData.flat_rate,
    dashboardData.last_recorded_assets  // Use most recent AUM
  );

  const details = [
    {
      label: "Expected Payment",
      value: expectedFee !== null ? formatCurrency(expectedFee) : '--'
    },
    {
      label: "Last Payment Date",
      value: dashboardData.last_payment_date ? formatDateMMDDYY(dashboardData.last_payment_date) : '--'
    },
    {
      label: "Last Payment Amount",
      value: dashboardData.last_payment_amount ? formatCurrency(dashboardData.last_payment_amount) : '--'
    },
  ];

  return (
    <GridAlignedCard
      title="Current Status"
      mainValue={
        <div>
          <p className="text-xl font-bold text-gray-800 break-words leading-tight">
            {currentPeriodDisplay}
          </p>
          {!isPaid && (
            <p className="text-sm text-gray-500 mt-1">Awaiting Entry</p>
          )}
        </div>
      }
      details={details}
    />
  );
};
Test: Card displays same information as before
ISSUE 3: Update Parent Component to Use New Hook
The Issue
The Payments page creates CurrentStatusCard and passes dashboard data. It needs to use our new hook while other cards still use the old one.
Why This Matters
Isolated Testing: Only affect one card
Side-by-Side: Can compare old vs new
Gradual Migration: Proves we can migrate incrementally
Expected Solution
Use both hooks temporarily
Pass new data to CurrentStatusCard
Pass old data to other cards
Compare functionality
Dependencies & Files Touched
Update: src/pages/Payments.tsx
Change: Use dual hooks during migration
Implementation
Phase 1: Use both hooks
typescript// src/pages/Payments.tsx
import { useClientDashboard, useClientDashboardNew } from '@/hooks/useClientDashboard';
const Payments: React.FC = () => {
  const selectedClient = useAppStore((state) => state.selectedClient);

  // OLD HOOK for other cards
  const {
    dashboardData: oldDashboardData,
    loading: oldLoading,
    error: oldError
  } = useClientDashboard(selectedClient?.client_id || null);

  // NEW HOOK for CurrentStatusCard
  const {
    dashboardData: newDashboardData,
    loading: newLoading,
    error: newError
  } = useClientDashboardNew(selectedClient?.client_id || null);

  // In the render:
  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
    {oldDashboardData && newDashboardData && !oldLoading && !newLoading && (
      <>
        <ErrorBoundary>
          <PlanDetailsCard dashboardData={oldDashboardData} />
        </ErrorBoundary>
        <ErrorBoundary>
          {/* USING NEW DATA */}
          <CurrentStatusCard dashboardData={newDashboardData} />
        </ErrorBoundary>
        <ErrorBoundary>
          <AssetsAndFeesCard dashboardData={oldDashboardData} />
        </ErrorBoundary>
        <ErrorBoundary>
          <ContactCard dashboardData={oldDashboardData} />
        </ErrorBoundary>
      </>
    )}
  </div>
Test: CurrentStatusCard works with new data while others unchanged
ISSUE 4: Handle Edge Cases and Nulls
The Issue
Real data has nulls. Missing AUM, no payments yet, new clients. Component must handle gracefully without crashing.
Why This Matters
Production Reality: Perfect data doesn't exist
User Trust: No white screens of death
Error Messages: Clear when data missing
Expected Solution
Null checks before calculations
Sensible defaults
Clear messaging for missing data
No runtime errors
Dependencies & Files Touched
Update: Error handling in CurrentStatusCard
Implementation
Phase 1: Add defensive checks
typescript// In CurrentStatusCard component
// Safe period display
const currentPeriodDisplay = dashboardData.current_period && dashboardData.current_year
  ? formatPeriodDisplay(
      dashboardData.current_period,
      dashboardData.current_year,
      dashboardData.payment_schedule
    )
  : '--';
// Handle missing contract edge case
if (!dashboardData.contract_id) {
  return (
    <GridAlignedCard
      title="Current Status"
      mainValue={
        <div className="text-amber-600">
          <p className="text-sm">No active contract</p>
        </div>
      }
      details={[]}
    />
  );
}
// Defensive expected fee calculation
const expectedFee = dashboardData.fee_type &&
  (dashboardData.percent_rate !== null || dashboardData.flat_rate !== null)
  ? calculateExpectedFee(
      dashboardData.fee_type,
      dashboardData.percent_rate,
      dashboardData.flat_rate,
      dashboardData.last_recorded_assets
    )
  : null;
Test:
New client with no payments shows "--"
Missing AUM shows expected fee only for flat rate
No contract shows warning
ISSUE 5: Verify Feature Parity
The Issue
The migrated component must work identically to the original. Users can't see any difference except maybe better null handling.
Why This Matters
Trust Building: Proves new architecture works
No Regression: Everything still works
Migration Confidence: Can proceed with other components
Expected Solution
Side-by-side comparison
Test all states (paid/due/no payments)
Verify calculations match
Document any improvements
Dependencies & Files Touched
Testing: Manual verification with multiple clients
Implementation
Phase 1: Create comparison checklist
typescript// Temporary debug code to add to Payments.tsx
if (process.env.NODE_ENV === 'development') {
  console.log('=== CurrentStatusCard Data Comparison ===');
  console.log('OLD current_period_display:', oldDashboardData?.current_period_display);
  console.log('NEW calculated display:', currentPeriodDisplay);
  console.log('OLD expected_fee:', oldDashboardData?.expected_fee);
  console.log('NEW calculated fee:', expectedFee);
  console.log('OLD payment_status:', oldDashboardData?.payment_status);
  console.log('NEW payment_status:', newDashboardData?.payment_status);
}
Phase 2: Test scenarios
Client with percentage fee and AUM → Expected fee calculated
Client with percentage fee, no AUM → Expected fee null
Client with flat fee → Expected fee always shown
Client paid current period → Shows period without "Awaiting"
Client due payment → Shows "Awaiting Entry"
Brand new client → All fields show "--"
Validation Checklist
 CurrentStatusCard uses dashboard_facts: No reference to old calculated fields
 Period display calculated: Shows "June 2024" or "Q2 2024" correctly
 Expected fee calculated: Matches old logic exactly
 Payment status works: "Awaiting Entry" shown for Due status
 No runtime errors: Handles all null cases gracefully
Implementation Order
Add new hook - useClientDashboardNew fetches from dashboard_facts
Update CurrentStatusCard - Import calculations and compute values
Update Payments page - Use both hooks temporarily
Test edge cases - Verify nulls handled properly
Compare output - Ensure feature parity with original
====
Yes, fully grounded. We've:
- Built calculation functions (Phase 1)
- Created payment_facts & dashboard_facts views (Phase 2)
- Migrated CurrentStatusCard as proof (Phase 3)
Now we migrate the remaining components: 3 more dashboard cards, payment form, payment history, and the complex summary page.
---
# TODO: Migrate Remaining Components to New Architecture
## Context
CurrentStatusCard now uses dashboard_facts and TypeScript calculations successfully. Time to migrate everything else. This phase converts all components from SQL-calculated fields to TypeScript calculations. The Summary page is saved for last because it's the most complex - needs provider grouping and quarterly aggregations done client-side.
---
## ISSUE 1: Migrate Remaining Dashboard Cards
### The Issue
Three dashboard cards still use old calculated fields: PlanDetailsCard (needs rates), AssetsAndFeesCard (needs rate conversion and AUM estimation), ContactCard (mostly fine already). Each needs different calculations from our Phase 1 functions.
### Why This Matters
- **Dashboard Consistency**: All cards using same data source
- **AUM Display**: Must show estimated vs recorded differently
- **Rate Display**: Raw rates need conversion for display
### Expected Solution
- PlanDetailsCard: Simple, just formatting
- AssetsAndFeesCard: Rate conversion + AUM estimation logic
- ContactCard: Already works with raw data
- All three use DashboardFactsData type
### Dependencies & Files Touched
**Update:** `src/components/dashboard/cards/PlanDetailsCard.tsx`
**Update:** `src/components/dashboard/cards/AssetsAndFeesCard.tsx`
**Update:** `src/components/dashboard/cards/ContactCard.tsx`
### Implementation
**Phase 1: Update PlanDetailsCard**
```typescript
// src/components/dashboard/cards/PlanDetailsCard.tsx
import { DashboardFactsData } from '../../../hooks/useClientDashboard';
interface PlanDetailsCardProps {
  dashboardData: DashboardFactsData;  // NEW TYPE
}
// No calculations needed - just display raw data
// This card already works with raw data!
```
**Phase 2: Update AssetsAndFeesCard**
```typescript
// src/components/dashboard/cards/AssetsAndFeesCard.tsx
import { DashboardFactsData } from '../../../hooks/useClientDashboard';
import { convertRates, formatRateForDisplay } from '../../../utils/calculations/rateConversions';
import { estimateAum, isAumEstimated } from '../../../utils/calculations/feeCalculations';
interface AssetsAndFeesCardProps {
  dashboardData: DashboardFactsData;  // NEW TYPE
}
export const AssetsAndFeesCard: React.FC<AssetsAndFeesCardProps> = ({ dashboardData }) => {
  const isPercentage = dashboardData.fee_type === 'percentage';

  // CALCULATE rate conversions (was from SQL)
  const storedRate = dashboardData.percent_rate || dashboardData.flat_rate || 0;
  const rates = convertRates(
    storedRate,
    dashboardData.payment_schedule,
    dashboardData.fee_type
  );

  // DETERMINE if AUM is estimated
  const aumIsEstimated = isAumEstimated(
    dashboardData.fee_type,
    dashboardData.last_recorded_assets
  );

  // CALCULATE estimated AUM if needed
  const displayAum = dashboardData.last_recorded_assets ||
    (aumIsEstimated && dashboardData.last_payment_amount && dashboardData.percent_rate
      ? estimateAum(dashboardData.last_payment_amount, dashboardData.percent_rate)
      : null);

  // FORMAT for display with estimation indicator
  const aumDisplay = displayAum
    ? `${formatCurrency(displayAum, 0)}${aumIsEstimated ? '*' : ''}`
    : 'N/A';

  // BUILD rate display
  const compositeRates = (
    <div className="flex gap-1 flex-wrap">
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        M: {formatRateForDisplay(rates.monthly, dashboardData.fee_type)}
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        Q: {formatRateForDisplay(rates.quarterly, dashboardData.fee_type)}
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        A: {formatRateForDisplay(rates.annual, dashboardData.fee_type)}
      </span>
    </div>
  );

  // Rest remains the same...
};
```
**Phase 3: Update ContactCard**
```typescript
// src/components/dashboard/cards/ContactCard.tsx
import { DashboardFactsData } from '../../../hooks/useClientDashboard';
interface ContactCardProps {
  dashboardData: DashboardFactsData;  // NEW TYPE
}
// This card needs no calculations - already uses raw data
```
**Test:** All dashboard cards working with new data source
---
## ISSUE 2: Migrate Payment Form Expected Fee
### The Issue
PaymentForm calculates expected fee inline using dashboard data. Currently expects calculated rates but will now get raw rates. Must use our calculation function and handle missing AUM properly.
### Why This Matters
- **User Guidance**: Shows what payment should be
- **Percentage Fees**: Need current AUM to calculate
- **Entry Validation**: Helps spot typos
### Expected Solution
- Use calculateExpectedFee from Phase 1
- Handle null AUM (no expected fee shown)
- Pass raw rates to calculation
- Keep form behavior identical
### Dependencies & Files Touched
**Update:** `src/components/payment/PaymentForm.tsx`
**Already imports:** `useClientDashboard` hook
### Implementation
```typescript
// src/components/payment/PaymentForm.tsx
import { calculateExpectedFee } from '@/utils/calculations/feeCalculations';
// In the component, replace the inline calculation:
// REMOVE this old calculation
const calculateExpectedFee = () => {
  if (!dashboardData || !formData.total_assets) return null;
  const assets = parseFloat(formData.total_assets);
  if (dashboardData.fee_type === 'percentage' && dashboardData.percent_rate) {
    return assets * dashboardData.percent_rate;
  } else if (dashboardData.fee_type === 'flat' && dashboardData.flat_rate) {
    return dashboardData.flat_rate;
  }
  return null;
};
// REPLACE with:
const expectedFee = formData.total_assets && dashboardData
  ? calculateExpectedFee(
      dashboardData.fee_type,
      dashboardData.percent_rate,
      dashboardData.flat_rate,
      parseFloat(formData.total_assets) || null
    )
  : null;
```
**Test:** Expected fee shows correctly when AUM entered
---
## ISSUE 3: Migrate Payment History Variance Display
### The Issue
PaymentHistory shows variance for each payment. Currently expects pre-calculated variance fields. Must calculate on display and handle estimated AUM case (show "N/A - Est. AUM" not fake zero variance).
### Why This Matters
- **Variance Analysis**: Core compliance feature
- **Estimation Clarity**: Can't show fake variances
- **Historical Data**: Many old payments lack AUM
### Expected Solution
- Calculate variance per row
- Detect estimated AUM scenario
- Show "N/A - Est. AUM" when appropriate
- Apply variance status coloring
### Dependencies & Files Touched
**Update:** `src/components/payment/PaymentHistory.tsx`
**Update:** `src/hooks/usePayments.ts` (remove expected fields)
### Implementation
**Phase 1: Update Payment type**
```typescript
// src/hooks/usePayments.ts
export interface Payment {
  payment_id: number;
  contract_id: number;
  client_id: number;
  received_date: string;
  total_assets: number | null;
  actual_fee: number;
  method: string | null;
  notes: string | null;
  applied_period_type: string;
  applied_period: number;
  applied_year: number;

  // From joins
  provider_name?: string;
  fee_type?: string;
  percent_rate?: number | null;
  flat_rate?: number | null;
  payment_schedule?: string;

  // REMOVE these calculated fields:
  // expected_fee, variance_amount, variance_percent, variance_status
}
```
**Phase 2: Update PaymentHistory display**
```typescript
// src/components/payment/PaymentHistory.tsx
import { calculateExpectedFee, isAumEstimated } from '@/utils/feeCalculations';
import { getVarianceStatus, calculateVariance } from '@/utils/varianceCalculations';
// In the table row rendering:
{payments.map((payment) => {
  // CALCULATE expected fee
  const expectedFee = calculateExpectedFee(
    payment.fee_type!,
    payment.percent_rate || null,
    payment.flat_rate || null,
    payment.total_assets
  );

  // CHECK if AUM is estimated
  const aumIsEstimated = isAumEstimated(
    payment.fee_type!,
    payment.total_assets
  );

  // CALCULATE variance (null if estimated)
  const variance = calculateVariance(
    payment.actual_fee,
    expectedFee,
    aumIsEstimated
  );

  // GET status for coloring
  const varianceStatus = getVarianceStatus(
    payment.actual_fee,
    expectedFee,
    true, // has payment
    aumIsEstimated
  );

  return (
    <tr key={payment.payment_id}>
      {/* ... other cells ... */}

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {expectedFee !== null ? formatCurrency(expectedFee) : '--'}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {varianceStatus === 'unknown' ? (
          <span className="text-gray-500 italic">N/A - Est. AUM</span>
        ) : variance ? (
          <span className="text-gray-900">
            {formatCurrency(variance.amount!)}
            {variance.percent !== null && (
              <span className="text-xs ml-1">
                ({variance.percent.toFixed(1)}%)
              </span>
            )}
            {varianceStatus === 'warning' || varianceStatus === 'alert' ? (
              <span className="text-amber-500 ml-1">•</span>
            ) : null}
          </span>
        ) : (
          <span className="text-gray-400">--</span>
        )}
      </td>
    </tr>
  );
})}
```
**Test:**
- Percentage payment with AUM shows variance
- Percentage payment without AUM shows "N/A - Est. AUM"
- Flat fee always shows variance
---
## ISSUE 4: Update Payments Data Fetching
### The Issue
usePayments hook fetches from payment_history_view which has calculated fields. Need to switch to payment_facts and ensure we get contract details for calculations.
### Why This Matters
- **Required Fields**: Need fee_type and rates for calculations
- **Performance**: Simpler view = faster query
- **Consistency**: All components use same source
### Expected Solution
- Fetch from payment_facts instead
- Ensure joins include contract details
- Update type definitions
- Remove calculated field references
### Dependencies & Files Touched
**Update:** `src/hooks/usePayments.ts`
**Update:** `src/api/client.ts`
### Implementation
```typescript
// src/api/client.ts
async getPayments(clientId: number, year?: number) {
  let filter = `client_id eq ${clientId}`;
  if (year) {
    filter += ` and applied_year eq ${year}`;
  }
  // CHANGE FROM payment_history_view TO payment_facts
  return this.request(`payment_facts?$filter=${filter}&$orderby=received_date desc`);
}
// src/hooks/usePayments.ts
// Payment interface already updated in Issue 3
// Just ensure the fetched data includes contract fields we need
```
**Test:** Payment history loads with all needed fields
---
## ISSUE 5: Prepare for Summary Page Migration
### The Issue
Summary page is the most complex - fetches quarterly/annual aggregated data and groups by provider. With aggregation views gone, it must fetch raw payments and calculate everything client-side. This issue just prepares types and helpers.
### Why This Matters
- **Big Change**: Most complex migration
- **Performance Risk**: Fetching more data
- **Business Critical**: Main compliance view
### Expected Solution
- Define types for payment facts
- Create grouping utilities
- Plan calculation strategy
- Keep old code running
### Dependencies & Files Touched
**New file:** `src/utils/summaryCalculations.ts`
**Update types:** For summary data structures
### Implementation
```typescript
// src/utils/summaryCalculations.ts
import { calculateExpectedFee } from './calculations/feeCalculations';
import { getVarianceStatus } from './calculations/varianceCalculations';
export interface PaymentFact {
  // All fields from payment_facts view
  payment_id: number;
  client_id: number;
  display_name: string;
  provider_name: string;
  quarter: number;
  applied_year: number;
  actual_fee: number;
  total_assets: number | null;
  fee_type: 'percentage' | 'flat';
  percent_rate: number | null;
  flat_rate: number | null;
  payment_schedule: 'monthly' | 'quarterly';
  is_posted: boolean;
}
export interface ClientQuarterSummary {
  client_id: number;
  display_name: string;
  payment_schedule: string;
  quarter: number;
  payments: PaymentFact[];
  actual_total: number;
  expected_total: number | null;
  has_estimated: boolean;
  is_posted: boolean;
}
export interface ProviderQuarterSummary {
  provider_name: string;
  clients: ClientQuarterSummary[];
  total_actual: number;
  total_expected: number;
  clients_posted: number;
}
// Group payments by provider and client
export function groupPaymentsByProvider(payments: PaymentFact[]): Map<string, PaymentFact[]> {
  const groups = new Map<string, PaymentFact[]>();

  payments.forEach(payment => {
    const existing = groups.get(payment.provider_name) || [];
    existing.push(payment);
    groups.set(payment.provider_name, existing);
  });

  return groups;
}
// Calculate client quarterly summary
export function calculateClientQuarter(
  clientPayments: PaymentFact[]
): ClientQuarterSummary {
  const first = clientPayments[0];
  let hasEstimated = false;
  let expectedTotal = 0;
  let actualTotal = 0;

  clientPayments.forEach(payment => {
    actualTotal += payment.actual_fee;

    if (!payment.total_assets && payment.fee_type === 'percentage') {
      hasEstimated = true;
    }

    const expected = calculateExpectedFee(
      payment.fee_type,
      payment.percent_rate,
      payment.flat_rate,
      payment.total_assets
    );

    if (expected !== null) {
      expectedTotal += expected;
    }
  });

  return {
    client_id: first.client_id,
    display_name: first.display_name,
    payment_schedule: first.payment_schedule,
    quarter: first.quarter,
    payments: clientPayments,
    actual_total: actualTotal,
    expected_total: hasEstimated ? null : expectedTotal,
    has_estimated: hasEstimated,
    is_posted: clientPayments.every(p => p.is_posted)
  };
}
```
**Test:** Grouping utilities ready for Summary page
---
## Validation Checklist
- [ ] All dashboard cards use DashboardFactsData: PlanDetails, CurrentStatus, AssetsAndFees, Contact
- [ ] AssetsAndFees shows estimated AUM: With asterisk when estimated
- [ ] Payment form calculates expected: Using imported function
- [ ] Payment history shows variance: "N/A - Est. AUM" when appropriate
- [ ] Summary helpers created: Ready for Phase 5 migration
## Implementation Order
1. **Dashboard cards** - Simple type changes mostly
2. **Payment form** - Replace inline calculation
3. **Payment history** - Add variance calculation
4. **Payment fetching** - Switch to payment_facts
5. **Summary prep** - Create helpers for next phase
====
# TODO: Drop Old SQL Views and Functions from HWM 401k Database
## Context
All components now use TypeScript calculations with data from payment_facts and dashboard_facts views. The old calculating views and functions are no longer referenced anywhere in the codebase. Time to clean house. This is the commit point - after this, there's no going back to SQL calculations. We drop 11 views and 2 functions in dependency order to avoid foreign key errors.
---
## ISSUE 1: Drop Views in Correct Dependency Order
### The Issue
SQL views can depend on each other. Dropping in wrong order causes "cannot drop because view X depends on it" errors. We mapped the dependency chain earlier - now we execute the drops bottom-up (least dependent first).
### Why This Matters
- **Clean Execution**: No errors during migration
- **One Transaction**: All or nothing
- **No Orphans**: Everything related goes together
### Expected Solution
- Drop child views before parent views
- Start with the summary page views
- End with comprehensive_payment_summary
- Execute as single transaction
### Dependencies & Files Touched
**Database:** Drop 11 views in specific order
**No code changes:** Views already not referenced
### Implementation
```sql
-- Execute as single transaction
BEGIN TRANSACTION;
-- Level 4: Summary page views (no dependencies)
DROP VIEW IF EXISTS quarterly_page_data;
DROP VIEW IF EXISTS annual_page_data;
-- Level 3: Provider summary views
DROP VIEW IF EXISTS provider_quarterly_summary;
DROP VIEW IF EXISTS provider_annual_summary;
-- Level 3: Enhanced views
DROP VIEW IF EXISTS quarterly_summary_enhanced;
-- Level 2: Aggregation views
DROP VIEW IF EXISTS annual_summary_by_client;
DROP VIEW IF EXISTS quarterly_summary_aggregated;
-- Level 1: Direct calculation views
DROP VIEW IF EXISTS payment_history_view;
DROP VIEW IF EXISTS dashboard_view;
DROP VIEW IF EXISTS yearly_summaries_view;
-- Level 0: Base calculation view
DROP VIEW IF EXISTS comprehensive_payment_summary;
-- Verify drops
SELECT 'Remaining calculating views:', COUNT(*)
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_NAME IN (
  'comprehensive_payment_summary',
  'quarterly_summary_aggregated',
  'quarterly_summary_enhanced',
  'provider_quarterly_summary',
  'annual_summary_by_client',
  'provider_annual_summary',
  'quarterly_page_data',
  'annual_page_data',
  'payment_history_view',
  'dashboard_view',
  'yearly_summaries_view'
);
COMMIT TRANSACTION;
```
**Test:** Query should return count of 0
---
## ISSUE 2: Drop SQL Functions
### The Issue
Two scalar functions performed business logic in SQL: calculate_expected_fee and get_variance_status. With views gone, nothing references them. They must go.
### Why This Matters
- **No Confusion**: Can't accidentally use them
- **Clean Schema**: Only data, no logic
- **Documentation**: Database schema tells truth
### Expected Solution
- Drop both functions
- Verify no objects depend on them
- Confirm TypeScript replacements working
### Dependencies & Files Touched
**Database:** Drop 2 functions
**Already replaced by:** TypeScript calculation functions
### Implementation
```sql
-- Drop calculation functions
DROP FUNCTION IF EXISTS [dbo].[calculate_expected_fee];
DROP FUNCTION IF EXISTS [dbo].[get_variance_status];
-- Verify they're gone
SELECT 'Remaining calculation functions:', COUNT(*)
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_NAME IN ('calculate_expected_fee', 'get_variance_status')
AND ROUTINE_TYPE = 'FUNCTION';
```
**Test:** Query should return count of 0
---
## ISSUE 3: Update Database Connection Config
### The Issue
The swa-db-connections config still references deleted views. Azure Static Web Apps will throw errors trying to create REST endpoints for non-existent views.
### Why This Matters
- **API Errors**: 404s for old endpoints
- **Clean Config**: Only valid entities
- **Documentation**: Config shows what's available
### Expected Solution
- Remove all deleted view entities
- Keep the new ones we added
- Keep the helper views we preserved
- Restart data-api after changes
### Dependencies & Files Touched
**Update:** `swa-db-connections/staticwebapp.database.config.json`
**Remove:** 11 entity definitions
### Implementation
```json
{
  "entities": {
    // KEEP THESE (tables)
    "clients": { /* ... */ },
    "clients_all": { /* ... */ },
    "contracts": { /* ... */ },
    "contacts": { /* ... */ },
    "payments": { /* ... */ },
    "payment_periods": { /* ... */ },
    "quarterly_notes": { /* ... */ },
    "client_quarter_markers": { /* ... */ },

    // KEEP THESE (helper views)
    "sidebar_clients_view": { /* ... */ },
    "payment_form_periods_view": { /* ... */ },
    "payment_form_defaults_view": { /* ... */ },

    // KEEP THESE (new views)
    "payment_facts": { /* ... */ },
    "dashboard_facts": { /* ... */ },

    // DELETE THESE ENTITIES:
    // "comprehensive_payment_summary"
    // "quarterly_summary_aggregated"
    // "yearly_summaries_view"
    // "quarterly_page_data"
    // "annual_page_data"
    // "dashboard_view"
    // "payment_history_view"
  }
}
```
**Test:** Run `swa start` - no errors about missing database objects
---
## ISSUE 4: Clean Up TypeScript Code
### The Issue
Temporary code remains from migration: dual hooks, console.logs, old interfaces. Time to remove scaffolding and commit to new architecture.
### Why This Matters
- **Code Clarity**: No confusion about which to use
- **Performance**: Not fetching data twice
- **Maintenance**: Single path forward
### Expected Solution
- Remove old DashboardViewData interface
- Remove comparison logging
- Use single dashboard hook
- Delete commented old code
### Dependencies & Files Touched
**Update:** `src/hooks/useClientDashboard.ts`
**Update:** `src/pages/Payments.tsx`
**Update:** Component imports
### Implementation
**Phase 1: Clean up dashboard hook**
```typescript
// src/hooks/useClientDashboard.ts
// DELETE the old interface DashboardViewData
// DELETE the old useClientDashboard function
// RENAME useClientDashboardNew to useClientDashboard
// KEEP only DashboardFactsData interface
export interface DashboardFactsData {
  // ... (keep as is)
}
export function useClientDashboard(clientId: number | null) {
  // ... (the "new" version becomes the only version)
}
```
**Phase 2: Update Payments.tsx**
```typescript
// src/pages/Payments.tsx
// REMOVE dual hook usage
const { dashboardData, loading, error } = useClientDashboard(selectedClient?.client_id || null);
// REMOVE comparison logging
// DELETE any "if development" console.log blocks
// UPDATE all dashboard cards to use single data
{dashboardData && !loading && (
  <>
    <PlanDetailsCard dashboardData={dashboardData} />
    <CurrentStatusCard dashboardData={dashboardData} />
    <AssetsAndFeesCard dashboardData={dashboardData} />
    <ContactCard dashboardData={dashboardData} />
  </>
)}
```
**Phase 3: Update component imports**
```typescript
// In all dashboard card components:
import { DashboardFactsData } from '../../../hooks/useClientDashboard';
// NOT DashboardViewData (deleted)
```
**Test:** Application runs with no reference to old types
---
## ISSUE 5: Document What Remains
### The Issue
Future developers (or future AI sessions) need to understand what survived the purge and why. Document the intentional decisions.
### Why This Matters
- **Future Maintenance**: Know what's safe to touch
- **Design Decisions**: Why these views stayed
- **AI Context**: Next session starts fresh
### Expected Solution
- Document remaining views
- Explain calculation location
- Update schema documentation
- Note estimation handling
### Dependencies & Files Touched
**Create:** `src/utils/calculations/README.md`
**Update:** Main README.md
### Implementation
```markdown
# Calculation Architecture
## Overview
All business logic calculations moved from SQL to TypeScript in July 2025.
Database now returns raw facts only.
## What Lives Where
### SQL (Database)
- Raw data storage only
- Simple joins and filters
- No calculations, no derived fields
### TypeScript (Frontend)
- Expected fee calculations
- Variance calculations
- Rate conversions
- Period display formatting
- AUM estimation logic
## Remaining SQL Views
### Data Views (facts only)
- `payment_facts` - All payments with joins
- `dashboard_facts` - Current state per client
### Helper Views (filters only)
- `payment_form_periods_view` - Available periods for dropdown
- `payment_form_defaults_view` - Suggested values for forms
- `sidebar_clients_view` - Client list with payment status
- `payment_status_base` - Due/Paid determination
## Key Decisions
### Why No SQL Calculations?
- Single source of truth for business logic
- Easier testing and debugging
- TypeScript has better error handling
- Can show estimations clearly
### Estimation Handling
When AUM is missing for percentage-based fees:
1. Estimate AUM from payment (payment ÷ rate)
2. Display with visual indicator
3. Show "N/A - Est. AUM" for variance
4. Never calculate variance from estimates
### Rate Storage
Rates stored at payment frequency:
- Monthly client: $1000/month stored as 1000
- Quarterly client: 0.3%/quarter stored as 0.003
Frontend converts for display (monthly/quarterly/annual)
```
**Test:** New developer can understand architecture
---
## Validation Checklist
- [ ] All calculating views dropped: 11 views removed from database
- [ ] Functions dropped: calculate_expected_fee and get_variance_status gone
- [ ] Config updated: Old entities removed from REST API config
- [ ] Code cleaned: No dual hooks or old interfaces
- [ ] Architecture documented: Future maintainers understand design
## Implementation Order
1. **Drop views** - In dependency order, as transaction
2. **Drop functions** - No more SQL calculations
3. **Update config** - Remove deleted entities
4. **Clean code** - Remove migration scaffolding
5. **Document** - Explain what remains and why
=====
# TODO: Migrate Summary Page to Client-Side Calculations
## Context
The Summary page is our most complex view - shows quarterly/annual payment totals grouped by provider. Previously used pre-aggregated views (quarterly_page_data, annual_page_data) that we just dropped. Now must fetch raw payment_facts and calculate everything client-side. This is the big one - if this works, we've successfully moved all business logic to TypeScript.
---
## ISSUE 1: Update Summary Page Data Fetching
### The Issue
Summary page fetches from deleted views that provided pre-calculated provider totals, client summaries, and variance statuses. Must now fetch raw payment_facts and build these aggregations in TypeScript. This means more data over the wire but more flexibility.
### Why This Matters
- **Performance Risk**: Fetching individual payments vs aggregates
- **Complexity**: Multi-level grouping (provider → client → quarter)
- **Critical Feature**: Main compliance tracking view
### Expected Solution
- Fetch payment_facts for the period
- Fetch quarterly notes separately (already does this)
- Group by provider then client
- Calculate all totals and variances
- Maintain exact same UI
### Dependencies & Files Touched
**Update:** `src/pages/Summary.tsx`
**Use:** `src/utils/summaryCalculations.ts` (created in Phase 4)
### Implementation
**Phase 1: Update data fetching**
```typescript
// src/pages/Summary.tsx
import { PaymentFact, groupPaymentsByProvider, calculateClientQuarter } from '@/utils/summaryCalculations';
import { calculateExpectedFee } from '@/utils/calculations/feeCalculations';
import { getVarianceStatus } from '@/utils/calculations/varianceCalculations';
import { convertRates, formatRateForDisplay } from '@/utils/calculations/rateConversions';
const loadData = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    if (viewMode === 'quarterly') {
      // FETCH raw payments for the quarter
      const payments = await dataApiClient.request<PaymentFact[]>(
        `payment_facts?$filter=applied_year eq ${currentYear} and quarter eq ${currentQuarter}&$orderby=provider_name,display_name`
      );

      // GROUP by provider
      const providerGroups = new Map<string, PaymentFact[]>();
      payments.forEach(payment => {
        const group = providerGroups.get(payment.provider_name) || [];
        group.push(payment);
        providerGroups.set(payment.provider_name, group);
      });

      // BUILD provider summaries
      const summaries = Array.from(providerGroups.entries()).map(([providerName, providerPayments]) => {
        // Group by client within provider
        const clientGroups = new Map<number, PaymentFact[]>();
        providerPayments.forEach(payment => {
          const group = clientGroups.get(payment.client_id) || [];
          group.push(payment);
          clientGroups.set(payment.client_id, group);
        });

        // Calculate client summaries
        const clients = Array.from(clientGroups.values()).map(clientPayments => {
          const first = clientPayments[0];
          let actualTotal = 0;
          let expectedTotal = 0;
          let hasEstimated = false;

          clientPayments.forEach(p => {
            actualTotal += p.actual_fee;

            if (!p.total_assets && p.fee_type === 'percentage') {
              hasEstimated = true;
            }

            const expected = calculateExpectedFee(
              p.fee_type,
              p.percent_rate,
              p.flat_rate,
              p.total_assets
            );

            if (expected !== null) {
              expectedTotal += expected;
            }
          });

          // Convert rates for display
          const storedRate = first.percent_rate || first.flat_rate || 0;
          const rates = convertRates(storedRate, first.payment_schedule, first.fee_type);

          return {
            client_id: first.client_id,
            display_name: first.display_name,
            payment_schedule: first.payment_schedule,
            fee_type: first.fee_type,
            percent_rate: first.percent_rate,
            flat_rate: first.flat_rate,
            quarterly_rate: rates.quarterly,
            client_expected: expectedTotal,
            client_actual: actualTotal,
            client_variance: actualTotal - expectedTotal,
            client_variance_percent: expectedTotal > 0 ? ((actualTotal - expectedTotal) / expectedTotal * 100) : null,
            variance_status: getVarianceStatus(actualTotal, hasEstimated ? null : expectedTotal, true, hasEstimated),
            payment_count: clientPayments.length,
            expected_payment_count: first.payment_schedule === 'monthly' ? 3 : 1,
            payment_status_display: `${clientPayments.length}/${first.payment_schedule === 'monthly' ? 3 : 1}`,
            is_posted: clientPayments.every(p => p.is_posted),
            quarterly_notes: null, // Fetched separately
            has_notes: 0,
            applied_year: currentYear,
            quarter: currentQuarter
          };
        });

        // Calculate provider totals
        const providerActual = clients.reduce((sum, c) => sum + c.client_actual, 0);
        const providerExpected = clients.reduce((sum, c) => sum + c.client_expected, 0);
        const clientsPosted = clients.filter(c => c.is_posted).length;

        return {
          provider_name: providerName,
          clients,
          isExpanded: true,
          providerData: {
            provider_name: providerName,
            provider_client_count: clients.length,
            provider_actual_total: providerActual,
            provider_expected_total: providerExpected,
            provider_variance: providerActual - providerExpected,
            clients_posted: clientsPosted,
            total_clients: clients.length,
            provider_posted_display: `${clientsPosted}/${clients.length}`
          }
        };
      });

      setQuarterlyGroups(summaries);

    } else {
      // ANNUAL VIEW - fetch entire year
      const payments = await dataApiClient.request<PaymentFact[]>(
        `payment_facts?$filter=applied_year eq ${currentYear}&$orderby=provider_name,display_name,quarter`
      );

      // Similar grouping but accumulate by quarter...
      // [Annual logic here - similar pattern but with Q1-Q4 accumulation]
    }
  } catch (err) {
    console.error('Failed to load summary data:', err);
    setError('Failed to load summary data. Please try again.');
  } finally {
    setLoading(false);
  }
}, [currentYear, currentQuarter, viewMode]);
```
**Test:** Quarterly view shows same data as before
---
## ISSUE 2: Update Quarterly Notes Integration
### The Issue
Quarterly notes are stored separately and fetched via batch API call. The old view included them, but now we must merge them with our calculated summaries. Good news: the existing code already handles this correctly with a separate fetch.
### Why This Matters
- **User Feature**: Notes provide context for variances
- **Performance**: Don't fetch notes with every payment
- **Existing Pattern**: Code already does this right
### Expected Solution
- Keep existing note fetching logic
- Merge notes into client summaries after calculation
- Update has_notes flag appropriately
- Maintain note editing functionality
### Dependencies & Files Touched
**No changes:** Note handling already correct
**Verify:** Notes still display and edit properly
### Implementation
```typescript
// After setting quarterly groups, fetch and merge notes
useEffect(() => {
  if (viewMode === 'quarterly' && quarterlyGroups.length > 0) {
    // This already exists and works correctly!
    const fetchNotes = async () => {
      try {
        const notes = await dataApiClient.getQuarterlyNotesBatch(currentYear, currentQuarter);

        // Merge notes into summaries
        setQuarterlyGroups(prev => prev.map(provider => ({
          ...provider,
          clients: provider.clients.map(client => {
            const note = notes.find(n => n.client_id === client.client_id);
            return {
              ...client,
              quarterly_notes: note?.notes || null,
              has_notes: note?.notes ? 1 : 0
            };
          })
        })));
      } catch (err) {
        console.error('Failed to fetch notes:', err);
      }
    };

    fetchNotes();
  }
}, [quarterlyGroups, currentYear, currentQuarter, viewMode]);
```
**Test:** Notes appear and can be edited
---
## ISSUE 3: Update Annual View Calculations
### The Issue
Annual view shows four quarters of data per client with yearly totals. Must accumulate quarterly data from raw payments, handling sparse data (missing quarters = 0).
### Why This Matters
- **Year Overview**: Shows payment patterns
- **Missing Data**: Not all clients pay every quarter
- **Complex Aggregation**: Group by provider, client, AND quarter
### Expected Solution
- Fetch full year of payments
- Group by provider → client → quarter
- Fill missing quarters with zeros
- Calculate annual totals
- No variance status (annual doesn't show this)
### Dependencies & Files Touched
**Update:** Annual calculation logic in loadData
### Implementation
```typescript
// In loadData function, annual branch:
else { // Annual view
  const payments = await dataApiClient.request<PaymentFact[]>(
    `payment_facts?$filter=applied_year eq ${currentYear}&$orderby=provider_name,display_name,quarter`
  );

  // Group by provider
  const providerGroups = new Map<string, PaymentFact[]>();
  payments.forEach(payment => {
    const group = providerGroups.get(payment.provider_name) || [];
    group.push(payment);
    providerGroups.set(payment.provider_name, group);
  });

  // Build annual summaries
  const summaries = Array.from(providerGroups.entries()).map(([providerName, providerPayments]) => {
    // Group by client
    const clientGroups = new Map<number, PaymentFact[]>();
    providerPayments.forEach(payment => {
      const group = clientGroups.get(payment.client_id) || [];
      group.push(payment);
      clientGroups.set(payment.client_id, group);
    });

    // Calculate per client
    const clients = Array.from(clientGroups.values()).map(clientPayments => {
      const first = clientPayments[0];

      // Initialize quarters
      const quarterTotals = { 1: 0, 2: 0, 3: 0, 4: 0 };
      const quarterPayments = { 1: 0, 2: 0, 3: 0, 4: 0 };

      // Accumulate by quarter
      clientPayments.forEach(p => {
        quarterTotals[p.quarter] += p.actual_fee;
        quarterPayments[p.quarter]++;
      });

      // Calculate annual expected
      const paymentsPerQuarter = first.payment_schedule === 'monthly' ? 3 : 1;
      const expectedPerQuarter = calculateExpectedFee(
        first.fee_type,
        first.percent_rate,
        first.flat_rate,
        clientPayments[clientPayments.length - 1]?.total_assets // Use latest AUM
      );
      const annualExpected = expectedPerQuarter ? expectedPerQuarter * paymentsPerQuarter * 4 : 0;

      // Convert rates
      const storedRate = first.percent_rate || first.flat_rate || 0;
      const rates = convertRates(storedRate, first.payment_schedule, first.fee_type);

      return {
        client_id: first.client_id,
        display_name: first.display_name,
        payment_schedule: first.payment_schedule,
        fee_type: first.fee_type,
        percent_rate: first.percent_rate,
        flat_rate: first.flat_rate,
        annual_rate: rates.annual,
        q1_actual: quarterTotals[1],
        q2_actual: quarterTotals[2],
        q3_actual: quarterTotals[3],
        q4_actual: quarterTotals[4],
        q1_payments: quarterPayments[1],
        q2_payments: quarterPayments[2],
        q3_payments: quarterPayments[3],
        q4_payments: quarterPayments[4],
        client_annual_total: Object.values(quarterTotals).reduce((a, b) => a + b, 0),
        client_annual_expected: annualExpected,
        client_annual_variance: Object.values(quarterTotals).reduce((a, b) => a + b, 0) - annualExpected,
        client_annual_variance_percent: annualExpected > 0
          ? ((Object.values(quarterTotals).reduce((a, b) => a + b, 0) - annualExpected) / annualExpected * 100)
          : null,
        total_payments: clientPayments.length,
        total_expected_payments: paymentsPerQuarter * 4,
        applied_year: currentYear
      };
    });

    // Provider totals
    return {
      provider_name: providerName,
      clients,
      isExpanded: true,
      providerData: {
        provider_name: providerName,
        provider_client_count: clients.length,
        provider_q1_total: clients.reduce((sum, c) => sum + c.q1_actual, 0),
        provider_q2_total: clients.reduce((sum, c) => sum + c.q2_actual, 0),
        provider_q3_total: clients.reduce((sum, c) => sum + c.q3_actual, 0),
        provider_q4_total: clients.reduce((sum, c) => sum + c.q4_actual, 0),
        provider_annual_total: clients.reduce((sum, c) => sum + c.client_annual_total, 0)
      }
    };
  });

  setAnnualGroups(summaries);
}
```
**Test:** Annual view shows Q1-Q4 breakdowns
---
## ISSUE 4: Update Type Definitions
### The Issue
The component expects specific types (QuarterlyPageData, AnnualPageData) that match old view structures. Our calculated data must match these interfaces exactly or TypeScript will complain.
### Why This Matters
- **Type Safety**: Prevent runtime errors
- **Minimal Changes**: Don't rewrite display logic
- **Compatibility**: Use existing render code
### Expected Solution
- Create types that match expected structure
- Ensure all required fields present
- Handle type unions properly
- Map calculated data to expected format
### Dependencies & Files Touched
**Already defined:** Types at top of Summary.tsx
**Verify:** Our calculations create matching shape
### Implementation
// These interfaces already exist in Summary.tsx
// Our calculations must produce data matching these shapes
interface QuarterlyClientSummary {
  client_id: number;
  display_name: string;
  payment_schedule: string;
  fee_type: string;
  percent_rate: number | null;
  flat_rate: number | null;
  quarterly_rate: number;
  client_expected: number;
  client_actual: number;
  client_variance: number;
  client_variance_percent: number | null;
  variance_status: string;
  payment_count: number;
  expected_payment_count: number;
  payment_status_display: string;
  is_posted: boolean;
  quarterly_notes: string | null;
  has_notes: number;
  applied_year: number;
  quarter: number;
}
interface AnnualClientSummary {
  client_id: number;
  display_name: string;
  payment_schedule: string;
  fee_type: string;
  percent_rate: number | null;
  flat_rate: number | null;
  annual_rate: number;
  q1_actual: number;
  q2_actual: number;
  q3_actual: number;
  q4_actual: number;
  q1_payments: number;
  q2_payments: number;
  q3_payments: number;
  q4_payments: number;
  client_annual_total: number;
  client_annual_expected: number;
  client_annual_variance: number;
  client_annual_variance_percent: number | null;
  total_payments: number;
  total_expected_payments: number;
  applied_year: number;
}
// Ensure calculated objects match expected interfaces
// In the quarterly calculation section:
const clientSummary: QuarterlyClientSummary = {
  client_id: first.client_id,
  display_name: first.display_name,
  payment_schedule: first.payment_schedule,
  fee_type: first.fee_type,
  percent_rate: first.percent_rate,
  flat_rate: first.flat_rate,
  quarterly_rate: rates.quarterly,
  client_expected: expectedTotal,
  client_actual: actualTotal,
  client_variance: actualTotal - expectedTotal,
  client_variance_percent: expectedTotal > 0 ? ((actualTotal - expectedTotal) / expectedTotal * 100) : null,
  variance_status: getVarianceStatus(actualTotal, hasEstimated ? null : expectedTotal, true, hasEstimated),
  payment_count: clientPayments.length,
  expected_payment_count: first.payment_schedule === 'monthly' ? 3 : 1,
  payment_status_display: `${clientPayments.length}/${first.payment_schedule === 'monthly' ? 3 : 1}`,
  is_posted: clientPayments.every(p => p.is_posted),
  quarterly_notes: null, // Fetched separately
  has_notes: 0,
  applied_year: currentYear,
  quarter: currentQuarter
};
// No need to change render code - it expects these exact fields
```
**Test:** TypeScript compilation succeeds
---
## ISSUE 5: Optimize Performance for Large Datasets
### The Issue
Fetching individual payments instead of pre-aggregated data means more records over the wire. A year of monthly payments for 50 clients = 600 records vs 50 aggregated rows before.
### Why This Matters
- **Load Time**: Users notice if it's slower
- **Network Traffic**: More data = more bandwidth
- **Browser Memory**: Processing 600 records client-side
### Expected Solution
- Add loading states during calculation
- Consider pagination for annual view
- Cache results aggressively
- Profile actual performance
### Dependencies & Files Touched
**Monitor:** Network tab for payload size
**Update:** Loading states if needed
### Implementation
```typescript
// Add progress indication
const loadData = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    // Show different message for large datasets
    const estimatedRecords = viewMode === 'quarterly'
      ? 150  // ~50 clients × 3 months
      : 600; // ~50 clients × 12 months

    if (estimatedRecords > 300) {
      // Could add a loading message like "Processing X payments..."
    }

    // Consider chunking for annual view
    if (viewMode === 'annual') {
      // Option: Fetch quarters separately and merge
      // But for now, single fetch is simpler
    }

    // Existing fetch logic...

    // Cache the calculated results
    if (viewMode === 'quarterly') {
      apiCache.set(
        cacheKeys.quarterlySummary(currentYear, currentQuarter),
        summaries,
        10 * 60 * 1000 // 10 minutes
      );
    }

  } catch (err) {
    setError('Failed to load summary data. Please try again.');
  } finally {
    setLoading(false);
  }
}, [currentYear, currentQuarter, viewMode]);
// Quick wins:
// 1. The $orderby in API call helps - data arrives pre-sorted
// 2. Maps are efficient for grouping
// 3. Single pass through data where possible
```
**Test:**
- Quarterly view loads in < 2 seconds
- Annual view loads in < 3 seconds
- No UI freezing during calculation
---
## Validation Checklist
- [ ] Quarterly view works: Shows same data as old aggregated views
- [ ] Annual view works: Q1-Q4 columns populated correctly
- [ ] Notes integration: Can view and edit quarterly notes
- [ ] Posted checkboxes: Toggle and save correctly
- [ ] Performance acceptable: No noticeable slowdown vs old version
## Implementation Order
1. **Quarterly calculations** - Core grouping and totals
2. **Annual calculations** - Quarter accumulation logic
3. **Note integration** - Verify existing code still works
4. **Type safety** - Ensure calculations match interfaces
5. **Performance check** - Monitor actual load times
====
# TODO: Optimize & Polish the TypeScript Calculation Architecture
## Context
All SQL calculations are gone. Every component now uses TypeScript for business logic. With only 27 clients and 1000 payment entries, performance isn't critical, but we should still cache repeated calculations, ensure bulletproof null handling, and document the final architecture. This is the cleanup phase - making the codebase production-ready and maintainable.
---
## ISSUE 1: Add Calculation Caching Layer
### The Issue
Dashboard cards recalculate rates on every render. Summary page recalculates expected fees for the same payment multiple times. These calculations are cheap individually but unnecessary when repeated. A simple memoization layer prevents redundant work.
### Why This Matters
- **Efficiency**: Why calculate the same rate 50 times?
- **Consistency**: Cached = same result every time
- **React Renders**: Components re-render often
### Expected Solution
- Memoize rate conversions (input rarely changes)
- Cache expected fee calculations per payment
- Clear cache when data changes
- Keep it simple - no Redis needed
### Dependencies & Files Touched
**Update:** `src/utils/calculations/rateConversions.ts`
**Update:** `src/utils/calculations/feeCalculations.ts`
**New:** Simple memoization utilities
### Implementation
**Phase 1: Add memoization utility**
```typescript
// src/utils/memoize.ts
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}
```
**Phase 2: Memoize rate conversions**
```typescript
// src/utils/calculations/rateConversions.ts
import { memoize } from '../memoize';
// Rate conversions are perfect for memoization - same input always = same output
export const convertRates = memoize(
  (
    storedRate: number,
    storageFrequency: 'monthly' | 'quarterly',
    feeType: 'percentage' | 'flat'
  ): DisplayRates => {
    if (storageFrequency === 'monthly') {
      return {
        monthly: storedRate,
        quarterly: storedRate * 3,
        annual: storedRate * 12
      };
    } else {
      return {
        monthly: storedRate / 3,
        quarterly: storedRate,
        annual: storedRate * 4
      };
    }
  },
  // Custom key generator for efficiency
  (rate, freq, type) => `${rate}-${freq}-${type}`
);
```
**Phase 3: Smart caching for expected fees**
```typescript
// src/utils/calculations/feeCalculations.ts
// Don't memoize the main function - AUM changes too often
// Instead, create a helper for the Summary page's bulk calculations
export function createExpectedFeeCalculator() {
  const cache = new Map<string, number | null>();

  return {
    calculate: (
      feeType: 'percentage' | 'flat',
      percentRate: number | null,
      flatRate: number | null,
      currentAum: number | null
    ): number | null => {
      const key = `${feeType}-${percentRate}-${flatRate}-${currentAum}`;

      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const result = calculateExpectedFee(feeType, percentRate, flatRate, currentAum);
      cache.set(key, result);
      return result;
    },

    clearCache: () => cache.clear()
  };
}
// Use in Summary page:
// const feeCalculator = createExpectedFeeCalculator();
// ... use feeCalculator.calculate() in loops
```
**Test:** Console.log shows cache hits on repeated calculations
---
## ISSUE 2: Harden Null Handling
### The Issue
Real data has nulls everywhere - missing AUM, no payments, new clients, deleted records. TypeScript helps but doesn't prevent all runtime issues. Need defensive programming throughout.
### Why This Matters
- **Production Reality**: NULL is the most common value
- **User Experience**: No white screens from null errors
- **Edge Cases**: Empty providers, zero amounts
### Expected Solution
- Add null guards in calculations
- Provide sensible defaults
- Never assume data exists
- Clear user messaging for missing data
### Dependencies & Files Touched
**Audit:** All calculation functions
**Update:** Add defensive checks
### Implementation
**Phase 1: Audit calculation functions**
```typescript
// src/utils/calculations/periodCalculations.ts
export function formatPeriodDisplay(
  period: number | null | undefined,
  year: number | null | undefined,
  periodType: 'monthly' | 'quarterly' | null | undefined
): string {
  // ADD null guards
  if (!period || !year || !periodType) {
    return '--';
  }

  if (periodType === 'monthly') {
    if (period < 1 || period > 12) {
      console.warn(`Invalid monthly period: ${period}`);
      return '--';
    }
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[period - 1]} ${year}`;
  } else {
    if (period < 1 || period > 4) {
      console.warn(`Invalid quarterly period: ${period}`);
      return '--';
    }
    return `Q${period} ${year}`;
  }
}
// src/utils/calculations/feeCalculations.ts
export function estimateAum(
  actualFee: number | null | undefined,
  percentRate: number | null | undefined
): number | null {
  // ADD safety checks
  if (!actualFee || !percentRate || percentRate === 0) {
    return null;
  }

  // Sanity check - if rate is > 1, it's probably not a decimal
  if (percentRate > 1) {
    console.warn(`Suspicious percent rate: ${percentRate} - expected decimal like 0.001`);
    return null;
  }

  return actualFee / percentRate;
}
```
**Phase 2: Component-level safety**
```typescript
// Add to components that use calculations
// Safe rate formatting
const formatSafeRate = (rate: number | null | undefined, feeType: string | null) => {
  if (rate === null || rate === undefined || !feeType) {
    return '--';
  }
  try {
    return formatRateForDisplay(rate, feeType as 'percentage' | 'flat');
  } catch (err) {
    console.error('Rate formatting error:', err);
    return '--';
  }
};
// Safe currency formatting
const formatSafeCurrency = (amount: number | null | undefined, decimals = 2) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '--';
  }
  return formatCurrency(amount, decimals);
};
```
**Test:**
- New client with no data shows "--" everywhere
- Null AUM doesn't crash percentage calculations
- Invalid data logs warnings but doesn't break UI
---
## ISSUE 3: Add TypeScript Strict Checks
### The Issue
TypeScript's strict mode catches more potential issues at compile time. Our calculation layer should be bulletproof with strict null checks, no implicit any, and exhaustive type checking.
### Why This Matters
- **Compile-Time Safety**: Catch errors before runtime
- **Refactoring Confidence**: Types ensure changes don't break
- **Documentation**: Types are self-documenting
### Expected Solution
- Enable strict checks for calculation files
- Add exhaustive type checking for unions
- Remove any remaining 'any' types
- Ensure all returns types explicit
### Dependencies & Files Touched
**Update:** All files in `src/utils/calculations/`
**Add:** Strict type checking
### Implementation
**Phase 1: Add strict flags to calculation files**
```typescript
// At top of each calculation file:
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
// Better: Update tsconfig.json for the directory
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/utils/calculations/**/*"]
}
```
**Phase 2: Add exhaustive checking**
```typescript
// src/utils/calculations/varianceCalculations.ts
// Helper for exhaustive checks
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}
export function getVarianceStatus(
  actualFee: number,
  expectedFee: number | null,
  hasPayment: boolean,
  isEstimated: boolean
): VarianceStatus {
  if (!hasPayment) return 'no_payment';
  if (isEstimated || expectedFee === null || expectedFee === 0) return 'unknown';

  const varianceAmount = Math.abs(actualFee - expectedFee);
  const variancePercent = (varianceAmount / Math.abs(expectedFee)) * 100;

  // Exhaustive threshold checking
  const status = (() => {
    if (varianceAmount < 2) return 'exact';
    if (variancePercent <= 5) return 'acceptable';
    if (variancePercent <= 15) return 'warning';
    return 'alert';
  })();

  // TypeScript knows all cases are covered
  switch (status) {
    case 'exact':
    case 'acceptable':
    case 'warning':
    case 'alert':
      return status;
    default:
      return assertNever(status);
  }
}
```
**Test:** TypeScript compiler catches any type safety issues
---
## ISSUE 4: Create Calculation Test Suite
### The Issue
Calculations are business-critical. We need comprehensive tests that prove our TypeScript functions match the old SQL logic and handle edge cases correctly.
### Why This Matters
- **Regression Prevention**: Don't break working calculations
- **Edge Case Documentation**: Tests show expected behavior
- **Refactoring Safety**: Tests ensure changes don't break
### Expected Solution
- Unit tests for each calculation function
- Edge case coverage (nulls, zeros, boundaries)
- Real data examples from production
- Performance benchmarks for caching
### Dependencies & Files Touched
**Create:** `src/utils/calculations/__tests__/`
**Framework:** Vitest (already in package.json)
### Implementation
**Phase 1: Create comprehensive test suite**
```typescript
// src/utils/calculations/__tests__/feeCalculations.test.ts
import { describe, it, expect } from 'vitest';
import { calculateExpectedFee, estimateAum, isAumEstimated } from '../feeCalculations';
describe('calculateExpectedFee', () => {
  describe('flat fee', () => {
    it('returns flat rate directly', () => {
      expect(calculateExpectedFee('flat', null, 1000, null)).toBe(1000);
      expect(calculateExpectedFee('flat', null, 3000, 999999)).toBe(3000);
    });

    it('handles null flat rate', () => {
      expect(calculateExpectedFee('flat', null, null, null)).toBeNull();
    });
  });

  describe('percentage fee', () => {
    it('calculates correctly with AUM', () => {
      expect(calculateExpectedFee('percentage', 0.001, null, 1000000)).toBe(1000);
      expect(calculateExpectedFee('percentage', 0.0025, null, 400000)).toBe(1000);
    });

    it('returns null without AUM', () => {
      expect(calculateExpectedFee('percentage', 0.001, null, null)).toBeNull();
    });

    it('handles zero AUM', () => {
      expect(calculateExpectedFee('percentage', 0.001, null, 0)).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles very small percentages', () => {
      expect(calculateExpectedFee('percentage', 0.00001, null, 1000000)).toBe(10);
    });

    it('handles very large AUM', () => {
      expect(calculateExpectedFee('percentage', 0.001, null, 1000000000)).toBe(1000000);
    });
  });
});
describe('estimateAum', () => {
  it('calculates AUM from payment and rate', () => {
    expect(estimateAum(1000, 0.001)).toBe(1000000);
    expect(estimateAum(500, 0.0025)).toBe(200000);
  });

  it('returns null for invalid inputs', () => {
    expect(estimateAum(null, 0.001)).toBeNull();
    expect(estimateAum(1000, null)).toBeNull();
    expect(estimateAum(1000, 0)).toBeNull();
  });

  it('warns for suspicious rates', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(estimateAum(1000, 5)).toBeNull(); // 5 = 500%, probably wrong
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Suspicious percent rate'));
    consoleSpy.mockRestore();
  });
});
```
**Phase 2: Test with production scenarios**
```typescript
// src/utils/calculations/__tests__/realScenarios.test.ts
describe('Real production scenarios', () => {
  it('handles Nordic Museum - quarterly flat fee', () => {
    const fee = calculateExpectedFee('flat', null, 1000, null);
    expect(fee).toBe(1000);
  });

  it('handles Dakota Creek - quarterly percentage without AUM', () => {
    const fee = calculateExpectedFee('percentage', 0.003446, null, null);
    expect(fee).toBeNull();

    // With AUM
    const feeWithAum = calculateExpectedFee('percentage', 0.003446, null, 1507254.79);
    expect(feeWithAum).toBeCloseTo(5194, 0);
  });

  it('handles monthly to quarterly rate conversion', () => {
    const rates = convertRates(1000, 'monthly', 'flat');
    expect(rates).toEqual({
      monthly: 1000,
      quarterly: 3000,
      annual: 12000
    });
  });
});
```
**Test:** Run `npm test` - all tests pass
---
## ISSUE 5: Final Documentation and Cleanup
### The Issue
Future developers (human or AI) need to understand the architecture, why decisions were made, and how to extend the system. Clean up any remaining debug code and document the calculation layer thoroughly.
### Why This Matters
- **Knowledge Transfer**: Next person understands immediately
- **AI Context**: Future AI assistants start informed
- **Design Rationale**: Why not use SQL?
### Expected Solution
- Document each calculation module
- Create architecture diagram
- Remove console.logs and debug code
- Add JSDoc comments to key functions
### Dependencies & Files Touched
**Create:** Architecture documentation
**Update:** Add JSDoc comments
**Clean:** Remove debug code
### Implementation
**Phase 1: Add JSDoc to calculation functions**
```typescript
// src/utils/calculations/feeCalculations.ts
/**
 * Calculates expected fee based on contract terms
 *
 * @param feeType - 'percentage' or 'flat' fee structure
 * @param percentRate - Rate as decimal (0.001 = 0.1%) - used for percentage fees
 * @param flatRate - Dollar amount per period - used for flat fees
 * @param currentAum - Current assets under management - required for percentage fees
 * @returns Expected fee amount or null if calculation impossible
 *
 * @example
 * // Flat fee
 * calculateExpectedFee('flat', null, 1000, null) // Returns 1000
 *
 * // Percentage fee with AUM
 * calculateExpectedFee('percentage', 0.001, null, 1000000) // Returns 1000
 *
 * // Percentage fee without AUM
 * calculateExpectedFee('percentage', 0.001, null, null) // Returns null
 */
export function calculateExpectedFee(
  feeType: 'percentage' | 'flat',
  percentRate: number | null,
  flatRate: number | null,
  currentAum: number | null
): number | null {
  // Implementation...
}
```
**Phase 2: Create architecture README**
```markdown
# 401k Payment Tracker - Calculation Architecture
## Architecture Decision Record (ADR)
### Context
In July 2025, we migrated all business logic from SQL Server to TypeScript.
### Decision Drivers
1. **Single Source of Truth**: Business logic in one language/location
2. **Testability**: Easier to unit test TypeScript than SQL functions
3. **Version Control**: Better diff/merge for TypeScript files
4. **Developer Experience**: TypeScript has better tooling
5. **Estimation Handling**: Needed complex UI logic for missing data
### Architectural Pattern
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SQL Server    │────▶│   REST API      │────▶│  React Frontend │
│                 │     │ (Azure Static)  │     │                 │
│ - Raw data only │     │ - Auto-generated│     │ - Calculations  │
│ - No functions  │     │ - No logic      │     │ - Display logic │
│ - Simple views  │     │                 │     │ - Caching       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```
### Calculation Modules
1. **periodCalculations.ts**
   - Current billable period (arrears logic)
   - Period display formatting
   - Quarter mapping
2. **feeCalculations.ts**
   - Expected fee calculation
   - AUM estimation (display only)
   - Null handling
3. **rateConversions.ts**
   - Payment frequency conversions
   - Display formatting
   - Memoized for performance
4. **varianceCalculations.ts**
   - Variance amount/percentage
   - Status categorization
   - Estimation detection
### Key Patterns
#### Estimation Handling
When AUM is missing for percentage-based fees:
```typescript
if (!aum && feeType === 'percentage') {
  // 1. Estimate for display only
  const estimatedAum = actualFee / percentRate;

  // 2. Show with visual indicator
  display = `${formatCurrency(estimatedAum)}*`;

  // 3. Block variance calculation
  variance = "N/A - Est. AUM";
}
```
#### Rate Storage Convention
- Stored at payment frequency
- Monthly $1000 → stored as 1000
- Quarterly 0.3% → stored as 0.003
- Always convert for display
#### Null Safety
- Every calculation handles null inputs
- Return null rather than throw
- UI shows "--" for null values
```
**Phase 3: Clean debug code**
```typescript
// Remove from all files:
// - console.log statements (except warnings)
// - Commented old code
// - TODO comments that are done
// - Temporary test data
// Keep:
// - console.warn for suspicious data
// - console.error for actual errors
```
**Test:** Fresh developer can understand architecture in 10 minutes
---
## Validation Checklist
- [ ] Caching implemented: Rate conversions memoized, fee calculator available
- [ ] Null handling hardened: All calculations handle null/undefined gracefully
- [ ] TypeScript strict: Calculation layer uses strict checks
- [ ] Tests comprehensive: Edge cases, production scenarios covered
- [ ] Documentation complete: Architecture clear, functions documented
## Implementation Order
1. **Add caching** - Memoize expensive calculations
2. **Harden nulls** - Defensive programming throughout
3. **TypeScript strict** - Compile-time safety
4. **Write tests** - Prove calculations correct
5. **Document** - Future-proof the codebase