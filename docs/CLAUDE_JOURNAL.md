# CLAUDE_JOURNAL.md

### Sprint 1: **Foundation Fixes & Type Safety**

- Fix posted_count=0 bug (broken feature)
- Create constants file for all magic strings
- Generate TypeScript types from DB schema
- Consolidate duplicate type definitions
- Extract period/quarter utilities
- Fix AUM form clearing
- Add $top parameter to payment queries

*Why: Fixes broken features while establishing clean types and utilities*

### Sprint 1.5: **Test Foundation**

- Create unit tests for fee calculations
- Test period/quarter mapping logic
- Test variance status thresholds
- Test edge cases (null AUM, missing data)
- Document expected behavior for each calculation

*Why: Can’t safely refactor business logic without proving it works*

### Sprint 2: **Extract Business Logic from Database**

- Move calculate_expected_fee to TypeScript (DELETE historical AUM lookup)
- Move get_variance_status to TypeScript
- Move variance thresholds to config file
- Simplify ALL calculation views (including payment_form_defaults_view)
- Create calculation utility modules
- Verify all Sprint 1.5 tests still pass

*Why: Core architectural fix that enables everything else*
*Depends on: Sprint 1.5 tests to verify correctness*

### Sprint 3: **Clean Data Access**

- Refactor DataApiClient to generic methods
- Fix cache key generation for deterministic serialization
- Add caching to expensive/repeated queries
- Implement proper API-level upserts

*Why: Simplify data patterns now that Sprint 2 made views clean*
*Depends on: Sprint 2’s simplified views*

### Sprint 4: **Component Refactoring**

- Break apart Summary.tsx monolith using Sprint 3’s generic queries
- Split quarterly/annual views into separate components
- Fix nested modal pattern in Contacts
- Create reusable summary components

*Why: With clean data and logic from Sprints 2-3, components can be simple*
*Depends on: Sprint 3’s generic API methods*

### Sprint 5: **State & Performance**

- Add React Query for server state (proper provider wrapping)
- Extend Zustand usage for shared UI state
- Fix error handling consistency
- Add proper null handling throughout
- Complete cache invalidation strategy

*Why: Polish data flow using Sprint 4’s component structure*
*Depends on: Sprint 4’s modular components*

==============

# Sprint 1: Foundation Fixes & Type Safety in 401k Payment Tracker

## Context

The 401k payment tracking system has several broken features and type safety issues. This sprint fixes 7 independent tasks that establish a solid foundation. Each task can be completed in any order and has clear success criteria.

-----

## TASK 1: Fix posted_count hardcoded to 0

**Location**: `quarterly_summary_aggregated` and `annual_summary_by_client` views  
**Issue**: Views show `0 as posted_count` and `0 as fully_posted` instead of querying actual data  
**Fix**: Add LEFT JOIN to `client_quarter_markers` table and COUNT real values

```sql
-- Look for these hardcoded values in views:
0 as posted_count,
0 as fully_posted,
```

**Test**: Toggle posted checkbox in UI → counts should update in summary views

## TASK 2: Create constants file

**Pattern Search**: `'percentage'`, `'flat'`, `'monthly'`, `'quarterly'`, `'Primary'`, `'Authorized'`, `'Provider'`  
**Action**: Create `src/constants.ts`:

```typescript
export const FEE_TYPES = {
  PERCENTAGE: 'percentage',
  FLAT: 'flat'
} as const;

export const PAYMENT_SCHEDULES = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly'
} as const;

export const CONTACT_TYPES = {
  PRIMARY: 'Primary',
  AUTHORIZED: 'Authorized',
  PROVIDER: 'Provider'
} as const;

// Create types from constants
export type FeeType = typeof FEE_TYPES[keyof typeof FEE_TYPES];
export type PaymentSchedule = typeof PAYMENT_SCHEDULES[keyof typeof PAYMENT_SCHEDULES];
export type ContactType = typeof CONTACT_TYPES[keyof typeof CONTACT_TYPES];
```

**Test**: Replace one string → TypeScript should error until you import constant

## TASK 3: Generate TypeScript types from DB schema

**Tool**: Use `sql-ts` or manually create from schema
**Output**: `src/types/database.ts` with interfaces for all tables/views
**Key Types**: Client, Contract, Payment, Contact, DashboardViewData
**Test**: Hover over API responses → should show proper types

## TASK 4: Consolidate duplicate type definitions

**Duplicates Found In**:

- `ClientSearch.tsx` - `interface Client`
- `useAppStore.ts` - `interface Client`
- `useClientDashboard.ts` - `interface DashboardClient`

**Fix**: Create `src/types/index.ts` with canonical types, update all imports
**Test**: Change Client type once → errors appear everywhere it’s used

## TASK 5: Extract period/quarter utilities

**Duplicate Logic In**: `PaymentForm`, `formatPeriodDisplay`, `usePeriods`, SQL views
**Create**: `src/utils/periodHelpers.ts`:

```typescript
export function getQuarterFromMonth(month: number): number {
  return Math.ceil(month / 3);
}

export function getMonthsInQuarter(quarter: number): number[] {
  return [(quarter - 1) * 3 + 1, (quarter - 1) * 3 + 2, quarter * 3];
}

export function formatPeriodDisplay(
  period: number,
  year: number,
  schedule: 'monthly' | 'quarterly'
): string {
  // Consolidate the 4 different implementations into one
}
```

**Test**: All period displays should remain identical

## TASK 6: Fix AUM form clearing

**File**: `src/components/payment/PaymentForm.tsx`
**Issue**: Form clears `total_assets` after submission even though it rarely changes
**Fix**: After successful submission, preserve `total_assets` value:

```typescript
// Instead of clearing everything:
setFormData({
  ...initialFormData,
  total_assets: formData.total_assets, // Keep AUM
  received_date: new Date().toISOString().split('T')[0] // Update date
});
```

**Test**: Submit payment → AUM field retains value

## TASK 7: Add $top parameter to dashboard query

**File**: `src/hooks/useClientDashboard.ts`
**Current**: `dataApiClient.getPayments(clientId)` fetches all, then slices
**Fix**: `dataApiClient.getPayments(clientId, { limit: 10 })`
**In API Client**: Add `$top=${options.limit}` to query string
**Test**: Network tab should show `?$top=10` in request

## Sprint 1 Complete When:

- [ ] Posted counts show real values in quarterly/annual summaries
- [ ] All string literals replaced with constants
- [ ] Database types generated and no more `any` types
- [ ] Single Client type used everywhere
- [ ] Period/quarter logic in one utility file
- [ ] AUM persists after payment submission
- [ ] Dashboard only fetches 10 recent payments
- [ ] All TypeScript compiles without errors

-----

# Sprint 1.5: Test Foundation

## Context

Before refactoring core business logic, we need tests to prove calculations work correctly. This sprint creates a comprehensive test suite for all financial calculations and business rules.

-----

## TASK 1: Setup Test Infrastructure

**Files**: Create `src/__tests__/` directory structure
**Dependencies**: Already have vitest installed
**Pattern**: One test file per utility module

## TASK 2: Fee Calculation Tests

**File**: `src/__tests__/feeCalculations.test.ts`

```typescript
describe('Fee Calculations', () => {
  test('percentage fee with null AUM returns null', () => {
    expect(calculateExpectedFee({
      feeType: 'percentage',
      percentRate: 0.001,
      flatRate: null,
      aum: null,
      paymentSchedule: 'monthly'
    })).toBe(null);
  });

  test('percentage fee calculates correctly', () => {
    expect(calculateExpectedFee({
      feeType: 'percentage',
      percentRate: 0.001,
      flatRate: null,
      aum: 1000000,
      paymentSchedule: 'monthly'
    })).toBe(1000);
  });

  test('flat fee ignores AUM', () => {
    expect(calculateExpectedFee({
      feeType: 'flat',
      percentRate: null,
      flatRate: 500,
      aum: 1000000,
      paymentSchedule: 'monthly'
    })).toBe(500);
  });
});
```

## TASK 3: Period Logic Tests

**File**: `src/__tests__/periodHelpers.test.ts`

```typescript
describe('Period Helpers', () => {
  test('quarter mapping', () => {
    expect(getQuarterFromMonth(1)).toBe(1);
    expect(getQuarterFromMonth(4)).toBe(2);
    expect(getQuarterFromMonth(12)).toBe(4);
  });

  test('arrears period calculation', () => {
    // In January, we bill for December of previous year
    const jan2025 = new Date('2025-01-15');
    expect(getCurrentBillablePeriod(jan2025, 'monthly')).toEqual({
      period: 12,
      year: 2024
    });
  });
});
```

## TASK 4: Variance Status Tests

**File**: `src/__tests__/varianceCalculations.test.ts`

Test all threshold boundaries and edge cases:

- Exact match (within $0.01)
- Each percentage threshold
- No payment scenarios
- Null/undefined handling

## TASK 5: Edge Case Documentation

**File**: `src/__tests__/businessRules.test.ts`

Document expected behavior for:

- Missing AUM on percentage clients
- Negative variances
- Year boundary calculations
- Quarterly vs monthly payment counts

## Sprint 1.5 Complete When:

- [ ] 20+ tests covering all calculations
- [ ] All tests pass
- [ ] Edge cases documented in tests
- [ ] Test files mirror utility structure
- [ ] Can run `npm test` successfully

-----

# Sprint 2: Extract Business Logic from Database

## Context

The 401k payment tracking system has critical business logic trapped in SQL functions and views. This architectural flaw makes debugging impossible and testing non-existent. This sprint extracts all calculations to TypeScript where they belong. Sprint 1.5 tests will verify correctness.

-----

## Critical Rule

**DELETE all historical AUM lookup logic**. The `calculate_expected_fee` function currently searches backwards through payments for old AUM values. This is wrong - only current period AUM should be used. Return NULL if unavailable.

## Current State Mapping

These SQL objects contain business logic to extract:

- `calculate_expected_fee` (SQL function) - Has broken historical AUM lookup
- `get_variance_status` (SQL function) - Contains hardcoded thresholds
- `comprehensive_payment_summary` view - Calls both functions
- `dashboard_view` - Complex calculations for rates and AUM
- `payment_history_view` - Variance calculations
- `payment_form_defaults_view` - Expected fee logic
- `quarterly_summary_aggregated` - Aggregation and variance logic

## ISSUE 1: Create TypeScript Calculation Utilities

### The Issue

Business logic for fee calculations and variance status lives in SQL scalar functions, making it impossible to debug or unit test. The `calculate_expected_fee` function has a critical bug where it searches historical payments for AUM values.

### Why This Matters

- **Operations Team**: Wrong variance calculations mean Dodd can’t trust the compliance reports
- **Debugging**: Can’t step through SQL functions to find why calculations are wrong

### Expected Solution

- All calculations happen in TypeScript
- Only current period AUM is used (no historical lookup)
- Variance thresholds are configurable
- All Sprint 1.5 tests pass

### Implementation

**Phase 1: Create Fee Calculator**

```typescript
// src/utils/feeCalculations.ts
import { FEE_TYPES, PAYMENT_SCHEDULES } from '@/constants';

export interface FeeCalculationParams {
  feeType: 'percentage' | 'flat';
  percentRate: number | null;
  flatRate: number | null;
  aum: number | null;
  paymentSchedule: 'monthly' | 'quarterly';
}

export function calculateExpectedFee(params: FeeCalculationParams): number | null {
  const { feeType, percentRate, flatRate, aum } = params;
  
  if (feeType === FEE_TYPES.FLAT) {
    return flatRate;
  }
  
  if (feeType === FEE_TYPES.PERCENTAGE && percentRate && aum) {
    return Math.round(aum * percentRate * 100) / 100;
  }
  
  return null; // Cannot calculate without AUM - NO HISTORICAL LOOKUP
}
```

**Phase 2: Create Variance Calculator**

```typescript
// src/utils/varianceCalculations.ts
import { varianceThresholds } from '@/config/businessRules';

export type VarianceStatus = 'no_payment' | 'exact' | 'acceptable' | 'warning' | 'alert' | 'unknown';

export function getVarianceStatus(
  actualFee: number | null,
  expectedFee: number | null,
  hasPayment: boolean
): VarianceStatus {
  if (!hasPayment) return 'no_payment';
  if (!expectedFee || !actualFee) return 'unknown';
  
  const variance = Math.abs(actualFee - expectedFee);
  const percentVariance = (variance / expectedFee) * 100;
  
  if (variance < varianceThresholds.EXACT_THRESHOLD) return 'exact';
  if (percentVariance <= varianceThresholds.ACCEPTABLE_PERCENT) return 'acceptable';
  if (percentVariance <= varianceThresholds.WARNING_PERCENT) return 'warning';
  return 'alert';
}
```

**Phase 3: Create Config File**

```typescript
// src/config/businessRules.ts
export const varianceThresholds = {
  EXACT_THRESHOLD: 0.01, // $0.01
  ACCEPTABLE_PERCENT: 5,
  WARNING_PERCENT: 15,
  ALERT_PERCENT: 100
};
```

**Test:** Run Sprint 1.5 tests → all calculation tests should pass

-----

## ISSUE 2: Update Components to Use TypeScript Logic

### The Issue

Components currently receive pre-calculated values from SQL views. They need to be updated to use our new TypeScript utilities.

### Implementation

**Phase 1: Update Dashboard Hook**

```typescript
// src/hooks/useClientDashboard.ts
import { calculateExpectedFee, calculateAnnualRate } from '@/utils/feeCalculations';

// In the data processing:
const expectedFee = calculateExpectedFee({
  feeType: dashboard.fee_type,
  percentRate: dashboard.percent_rate,
  flatRate: dashboard.flat_rate,
  aum: dashboard.aum,
  paymentSchedule: dashboard.payment_schedule
});
```

**Phase 2: Update Payment History**

```typescript
// In payment processing logic:
const payments = rawPayments.map(payment => ({
  ...payment,
  expected_fee: calculateExpectedFee({...}),
  variance_status: getVarianceStatus(
    payment.actual_fee,
    calculatedExpectedFee,
    true
  )
}));
```

-----

## ISSUE 3: Simplify Database Views

### The Issue

Views contain complex CASE statements and function calls. They should just JOIN data.

### Views to Simplify

- `dashboard_view` - Remove rate calculations
- `payment_history_view` - Remove variance calculations
- `comprehensive_payment_summary` - Remove function calls
- `payment_form_defaults_view` - Remove expected fee logic
- `quarterly_summary_aggregated` - Remove variance status

### Implementation

**Phase 1: Remove Function Calls**

```sql
-- Old view:
dbo.calculate_expected_fee(...) as expected_fee,
dbo.get_variance_status(...) as variance_status

-- New view:
-- Just return raw data, let TypeScript calculate
```

**Test:** Views should return raw data only, no calculated fields

-----

## Sprint 2 Complete When:

- [ ] All calculations in TypeScript utilities
- [ ] NO historical AUM lookup anywhere
- [ ] Variance thresholds in config file
- [ ] Database views simplified to JOINs only
- [ ] All Sprint 1.5 tests still pass
- [ ] Components use TypeScript calculations
- [ ] All TypeScript compiles without errors

-----

# Sprint 3: Clean Data Access Patterns

## Context

With business logic now in TypeScript (Sprint 2) and database views simplified, the data access layer needs modernization. The DataApiClient has 20+ specific methods that mirror the old complex views. Time to simplify with generic patterns and proper caching.

-----

## ISSUE 1: Refactor DataApiClient to Generic Methods

### The Issue

DataApiClient has become a dumping ground with a specific method for every possible query. Adding new features requires adding new methods, creating an ever-growing API surface.

### Implementation

**Phase 1: Create Generic Query Builder**

```typescript
// src/api/queryBuilder.ts
export interface FilterParams {
  [key: string]: string | number | boolean | null;
}

export interface QueryOptions {
  orderBy?: string;
  top?: number;
  select?: string[];
}

export function buildODataQuery(filters?: FilterParams, options?: QueryOptions): string {
  const parts: string[] = [];
  
  // Build $filter
  if (filters) {
    const filterClauses = Object.entries(filters)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        if (value === null) return `${key} eq null`;
        if (typeof value === 'string') return `${key} eq '${value}'`;
        return `${key} eq ${value}`;
      });
    
    if (filterClauses.length > 0) {
      parts.push(`$filter=${filterClauses.join(' and ')}`);
    }
  }
  
  // Add other options
  if (options?.orderBy) parts.push(`$orderby=${options.orderBy}`);
  if (options?.top) parts.push(`$top=${options.top}`);
  if (options?.select) parts.push(`$select=${options.select.join(',')}`);
  
  return parts.length > 0 ? '?' + parts.join('&') : '';
}
```

**Phase 2: Implement Generic Methods**

```typescript
// src/api/client.ts
class DataApiClient {
  async query<T>(entity: string, filters?: FilterParams, options?: QueryOptions): Promise<T[]> {
    const query = buildODataQuery(filters, options);
    const response = await this.request(`${entity}${query}`);
    return Array.isArray(response) ? response : [];
  }

  async get<T>(entity: string, key: Record<string, any>): Promise<T | null> {
    const keyPath = Object.entries(key)
      .map(([k, v]) => `${k}/${v}`)
      .join('/');
    try {
      return await this.request(`${entity}/${keyPath}`);
    } catch (error) {
      if (error?.status === 404) return null;
      throw error;
    }
  }

  async mutate<T>(
    entity: string,
    action: 'create' | 'update' | 'delete',
    data?: any,
    key?: Record<string, any>
  ): Promise<T> {
    const keyPath = key ? '/' + Object.entries(key).map(([k, v]) => `${k}/${v}`).join('/') : '';
    const methods = { create: 'POST', update: 'PATCH', delete: 'DELETE' };
    
    return await this.request(`${entity}${keyPath}`, {
      method: methods[action],
      body: data ? JSON.stringify(data) : undefined
    });
  }
}
```

**Phase 3: Update All Existing Calls**

```typescript
// Before:
const data = await dataApiClient.getQuarterlyPageData(2024, 1);

// After:
const data = await dataApiClient.query<QuarterlyPageData>(
  'quarterly_page_data',
  { applied_year: 2024, quarter: 1 },
  { orderBy: 'provider_name,display_name' }
);
```

-----

## ISSUE 2: Implement Proper Caching

### The Issue

The caching utility exists but is barely used. Repeated queries for client lists, dashboard data, and quarters hit the API unnecessarily.

### Implementation

**Phase 1: Fix Cache Key Generation**

```typescript
// src/api/cachedClient.ts
import { apiCache, cacheKeys } from '@/utils/cache';

class CachedDataApiClient extends DataApiClient {
  async query<T>(
    entity: string,
    filters?: FilterParams,
    options?: QueryOptions & { cache?: boolean; ttl?: number }
  ): Promise<T[]> {
    if (options?.cache) {
      // Deterministic cache key
      const cacheKey = `${entity}_${Object.keys(filters || {}).sort().map(k => `${k}:${filters[k]}`).join('_')}`;
      const cached = apiCache.get<T[]>(cacheKey);
      if (cached) return cached;
      
      const data = await super.query<T>(entity, filters, options);
      apiCache.set(cacheKey, data, options.ttl);
      return data;
    }
    
    return super.query<T>(entity, filters, options);
  }
}
```

**Phase 2: Cache Common Queries**

```typescript
// Client list (changes rarely)
const clients = await client.query('sidebar_clients_view', {}, { 
  cache: true, 
  ttl: 10 * 60 * 1000 // 10 minutes
});

// Dashboard data (changes when payments added)
const dashboard = await client.query('dashboard_view', 
  { client_id: clientId }, 
  { cache: true, ttl: 60 * 1000 } // 1 minute
);
```

-----

## ISSUE 3: Fix API-Level Operations

### The Issue

Quarterly notes use frontend “check-then-update” pattern. Contract validation happens after form submission. These should be API-level concerns.

### Implementation

**Phase 1: Implement Proper Upsert**

```typescript
// For quarterly notes - use PUT for upsert semantics
async upsertQuarterlyNote(
  clientId: number,
  year: number,
  quarter: number,
  notes: string
): Promise<void> {
  await this.mutate('quarterly_notes', 'update', 
    { notes, client_id: clientId, year, quarter },
    { client_id: clientId, year, quarter }
  );
  
  // Clear related cache
  apiCache.clear(`quarterly_notes_${year}_${quarter}`);
}
```

**Phase 2: Early Contract Validation**

```typescript
// In PaymentForm component
useEffect(() => {
  const checkContract = async () => {
    const dashboard = await client.get<DashboardViewData>(
      'dashboard_view',
      { client_id: clientId }
    );
    
    if (!dashboard?.contract_id) {
      setError('No active contract found. Please add a contract before recording payments.');
      setFormDisabled(true);
    }
  };
  
  if (clientId) checkContract();
}, [clientId]);
```

-----

## Sprint 3 Complete When:

- [ ] DataApiClient has 3-5 generic methods instead of 20+
- [ ] Common queries are cached with deterministic keys
- [ ] Quarterly notes use single upsert call
- [ ] Contract validation happens on form load
- [ ] All existing functionality still works
- [ ] Sprint 1.5 tests still pass
- [ ] All TypeScript compiles without errors

-----

# Sprint 4: Component Decomposition

## Context

Summary.tsx is a 1000+ line monolith handling data fetching, state management, rendering, exports, and inline editing. The payment pages also need similar treatment. With Sprint 3’s clean API methods, we can now create focused components.

-----

## Component Extraction Map

```
Summary.tsx (1000+ lines) breaks into:
├── Summary.tsx (container, ~150 lines)
├── components/summary/
│   ├── SummaryHeader.tsx
│   ├── SummaryMetrics.tsx
│   ├── QuarterlyTable.tsx
│   ├── AnnualTable.tsx
│   ├── ProviderRow.tsx
│   ├── ClientRow.tsx
│   └── NotePopover.tsx
```

## ISSUE 1: Extract Summary Components

### The Issue

Summary.tsx contains all logic inline - rendering, state, handlers, and business logic mixed together. Finding where to add a new feature or fix a bug requires scrolling through 1000+ lines.

### Implementation

**Phase 1: Create Container Component**

```typescript
// src/pages/Summary.tsx (simplified to ~150 lines)
export default function Summary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = searchParams.get('view') || 'quarterly';
  const year = parseInt(searchParams.get('year') || getCurrentYear());
  const quarter = parseInt(searchParams.get('quarter') || getCurrentQuarter());
  
  // Uses Sprint 3's generic query method
  const { data, loading, error } = useSummaryData(viewMode, year, quarter);
  
  if (loading) return <SummaryLoading />;
  if (error) return <Alert variant="error" message={error} />;
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <SummaryHeader
        viewMode={viewMode}
        year={year}
        quarter={quarter}
        onNavigate={(params) => setSearchParams(params)}
        onExport={(format) => handleExport(format, data)}
      />
      
      <SummaryMetrics data={data} />
      
      {viewMode === 'quarterly' ? (
        <QuarterlyTable
          groups={data.groups}
          year={year}
          quarter={quarter}
        />
      ) : (
        <AnnualTable
          groups={data.groups}
          year={year}
        />
      )}
    </div>
  );
}
```

**Phase 2: Extract Table Components**

```typescript
// src/components/summary/QuarterlyTable.tsx
// Uses Sprint 2's TypeScript calculations for variance
export function QuarterlyTable({ groups, year, quarter }: QuarterlyTableProps) {
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <table className="w-full">
        <QuarterlyTableHeader />
        <tbody>
          {groups.map(provider => (
            <ProviderSection key={provider.provider_name} {...provider}>
              {provider.clients.map(client => (
                <ClientQuarterlyRow
                  key={client.client_id}
                  client={client}
                  year={year}
                  quarter={quarter}
                />
              ))}
            </ProviderSection>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

-----

## ISSUE 2: Fix Nested Modal Pattern

### The Issue

ContactsModal renders ContactForm inside it, creating nested modals with complex state management and confusing UX.

### Implementation

```typescript
// src/components/dashboard/cards/ContactCard.tsx
export function ContactCard({ dashboardData }: ContactCardProps) {
  const [activeModal, setActiveModal] = useState<'list' | 'form' | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  return (
    <>
      <GridAlignedCard
        action={
          <button onClick={() => setActiveModal('list')}>
            Manage Contacts
          </button>
        }
      />
      
      {/* Single modal at a time */}
      {activeModal === 'list' && (
        <ContactsModal
          onAdd={() => setActiveModal('form')}
          onEdit={(contact) => {
            setEditingContact(contact);
            setActiveModal('form');
          }}
        />
      )}
      
      {activeModal === 'form' && (
        <ContactForm
          contact={editingContact}
          onClose={() => setActiveModal('list')}
        />
      )}
    </>
  );
}
```

-----

## ISSUE 3: Create Reusable Components

### The Issue

Period/quarter display logic, variance indicators, and status badges are duplicated across components.

### Implementation

```typescript
// src/components/shared/VarianceIndicator.tsx
// Uses Sprint 2's variance calculation utilities
export function VarianceIndicator({ actual, expected, showPercent }: Props) {
  const variance = actual - expected;
  const percent = expected > 0 ? (variance / expected) * 100 : 0;
  const status = getVarianceStatus(actual, expected, true);
  
  return (
    <span className={`variance-${status}`}>
      {formatCurrency(variance)}
      {showPercent && ` (${percent.toFixed(1)}%)`}
    </span>
  );
}
```

-----

## Sprint 4 Complete When:

- [ ] Summary.tsx under 200 lines
- [ ] Each component has single responsibility
- [ ] No nested modals
- [ ] Shared components eliminate duplication
- [ ] All existing functionality preserved
- [ ] Sprint 1.5 tests still pass
- [ ] All TypeScript compiles without errors

-----

# Sprint 5: State Management & Polish

## Context

With clean architecture from Sprint 4’s components and Sprint 3’s data layer, time to modernize state management and fix remaining UX issues. React Query for server state, consistent error handling, and proper null safety throughout.

-----

## ISSUE 1: Implement React Query

### The Issue

Every component manages its own loading/error states with useEffect. No shared caching between components that need the same data. Mutations require manual refreshes.

### Implementation

**Phase 1: Setup Query Client (Correct Wrapping Order)**

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
    },
  },
});

// Correct wrapping order
<QueryClientProvider client={queryClient}>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</QueryClientProvider>
```

**Phase 2: Convert Hooks to React Query**

```typescript
// Uses Sprint 3's generic query methods
export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: () => dataApiClient.query('sidebar_clients_view'),
    staleTime: 5 * 60 * 1000,
  });
}

// Mutations with complete cache invalidation
export function useCreatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: PaymentCreateData) => 
      dataApiClient.mutate('payments', 'create', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['quarterly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['annual-summary'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
```

-----

## ISSUE 2: Extend Zustand Usage

### The Issue

Zustand only tracks selectedClient and documentViewer. Other UI state like editingPayment causes prop drilling through multiple components.

### Implementation

```typescript
// src/stores/useAppStore.ts
interface AppState {
  // Existing
  selectedClient: Client | null;
  documentViewerOpen: boolean;
  
  // New UI State (no server data)
  editingPayment: Payment | null;
  setEditingPayment: (payment: Payment | null) => void;
  
  expandedProviders: Set<string>;
  toggleProvider: (name: string) => void;
  
  activeModal: 'contacts' | 'payment' | null;
  setActiveModal: (modal: 'contacts' | 'payment' | null) => void;
}
```

-----

## ISSUE 3: Fix Error Handling & Null Safety

### The Issue

Inconsistent error display. NaN displays when calculations hit null values.

### Implementation

**Phase 1: Centralized Error Display**

```typescript
// src/components/shared/QueryError.tsx
export function QueryError({ error }: { error: unknown }) {
  const message = getErrorMessage(error);
  return <Alert variant="error" title="Error loading data" message={message} />;
}
```

**Phase 2: Fix Null Handling**

```typescript
// Uses Sprint 2's calculation utilities
export function formatVariance(actual: number | null, expected: number | null): string {
  if (actual == null || expected == null) return '--';
  const variance = actual - expected;
  return formatSafeCurrency(variance);
}

export function formatCurrency(amount: number | null | undefined, decimals = 2): string {
  if (amount == null || isNaN(amount)) return '--';
  
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(absAmount);
  
  return isNegative ? `(${formatted})` : formatted;
}
```

-----

## Sprint 5 Complete When:

- [ ] React Query handles all server state
- [ ] No more useEffect for data fetching
- [ ] Zustand manages UI state without prop drilling
- [ ] Consistent error display everywhere
- [ ] No NaN or undefined displays
- [ ] Negative numbers show in red with parentheses
- [ ] Complete cache invalidation on mutations
- [ ] Sprint 1.5 tests still pass
- [ ] All TypeScript compiles without errors​​​​​​​​​​​​​​​​
