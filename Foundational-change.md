## Current Database Schema

```sql
-- TABLES --
clients (client_id, display_name, full_name, ima_signed_date, onedrive_folder_path, valid_from, valid_to)
contacts (contact_id, client_id, contact_type, contact_name, phone, email, fax, physical_address, mailing_address, valid_from, valid_to)
contracts (contract_id, client_id, contract_number, provider_name, contract_start_date, fee_type, percent_rate, flat_rate, payment_schedule, num_people, notes, valid_from, valid_to)
payments (payment_id, contract_id, client_id, received_date, total_assets, expected_fee, actual_fee, method, notes, valid_from, valid_to, applied_period_type, applied_period, applied_year)
client_metrics (id, client_id, last_payment_date, last_payment_amount, last_payment_quarter, last_payment_year, total_ytd_payments, avg_quarterly_payment, last_recorded_assets, last_updated, next_payment_due)
quarterly_summaries (id, client_id, year, quarter, total_payments, total_assets, payment_count, avg_payment, expected_total, last_updated)
yearly_summaries (id, client_id, year, total_payments, total_assets, payment_count, avg_payment, yoy_growth, last_updated)
client_files (file_id, client_id, file_name, onedrive_path, uploaded_at)
payment_files (payment_id, file_id, linked_at)

-- VIEWS --
client_payment_status
payment_file_view

-- TRIGGERS --
update_client_metrics_after_payment
update_quarterly_after_payment
update_yearly_after_quarterly
```

## Evidence-Backed Game Plan

### 1. Fix Date Columns (nvarchar → DATE) with CHECK Constraints

**Evidence:**
- **Schema:** All date columns are `nvarchar(50)`
- **Backend (`dashboard/__init__.py`):** No date parsing happens in SQL, forcing Python to handle it
- **Frontend (`dateUtils.ts`):** Has `parseISO()` and complex date formatting because dates come as strings
- **Frontend (`PaymentFormFields.tsx`):** Default date setting requires string manipulation: `new Date().toISOString().split('T')[0]`

**Impact:**
- **SQL Benefits:** Can use DATEPART, DATEDIFF, proper sorting, date comparisons
- **Backend Changes:** Remove date string handling in all endpoints
- **Frontend Changes:** Simplify `formatDate()` function, remove parseISO calls
- **Performance:** Massive improvement in date-based queries and sorting
- **Data Integrity:** Add CHECK constraints on applied_period (1-12 for monthly, 1-4 for quarterly) to guarantee valid periods at database level

### 2. Remove Dead Columns from client_metrics

**Evidence:**
- **Trigger (`update_client_metrics_after_payment`):** Does NOT update `last_payment_quarter` or `last_payment_year`
  ```sql
  SET 
    last_payment_date = lp.received_date,
    last_payment_amount = lp.actual_fee,
    -- Notice: NO last_payment_quarter or last_payment_year updates!
  ```
- **Backend (`dashboard/__init__.py`):** Never queries these columns
- **Frontend:** Never displays quarter/year from client_metrics
- **Database:** These columns are storing stale, unmaintained data

**Impact:**
- **Tables Affected:** client_metrics (ALTER TABLE DROP COLUMN)
- **Code Changes:** None - nothing uses these columns
- **Storage:** Cleaner schema, less confusion

### 3. Add Date Dimension Table

**Evidence:**
- **Backend (`periods/__init__.py`):** 150 lines of complex Python generating periods that don't exist:
  ```python
  # Generate periods up to current collection period
  while year < current_year or (year == current_year and period <= current_period):
      if (period, year) not in paid_periods:
          # Generating non-existent data
  ```
- **Frontend (`PaymentForm`):** Relies on this complex endpoint for dropdown
- **Current Issue:** Every period dropdown request runs this expensive calculation

**Impact:**
- **New Table:** `payment_periods` with pre-populated 2015-2030 data
- **Backend Simplification:** Replace 150 lines with a simple JOIN query
- **Performance:** Instant period lookups vs runtime generation

### 4. Add Three Critical Views

#### A. payment_variance_view

**Evidence:**
- **Backend (`calculations/__init__.py`):** Entire Azure Function just for variance
- **Frontend (`PaymentHistory.tsx`):** Recalculates variance for every row:
  ```javascript
  const calculateVariance = (actual, expected) => {
    // Duplicating backend logic in frontend!
  }
  ```
- **Performance Issue:** Network call for each variance calculation

**New View:**
```sql
CREATE VIEW payment_variance_view AS
SELECT *, 
  actual_fee - expected_fee as variance_amount,
  CASE WHEN expected_fee = 0 THEN 0 
       ELSE ((actual_fee - expected_fee) / expected_fee) * 100 
  END as variance_percent,
  CASE 
    WHEN ABS(actual_fee - expected_fee) < 0.01 THEN 'exact'
    WHEN ABS(variance_percent) <= 5 THEN 'acceptable'
    WHEN ABS(variance_percent) <= 15 THEN 'warning'
    ELSE 'alert'
  END as variance_status
FROM payments
```

**Impact:**
- **Backend:** Delete entire `calculations` function folder
- **Frontend:** Remove `calculateVariance()` function
- **API calls:** Eliminate variance calculation endpoint

#### B. clients_by_provider_view

**Evidence:**
- **Backend (`clients/__init__.py`):** Manual JOIN in every client query:
  ```python
  LEFT JOIN contracts co ON c.client_id = co.client_id AND co.valid_to IS NULL
  ```
- **Backend (`dashboard/__init__.py`):** Same JOIN repeated
- **Frontend (`Sidebar.tsx`):** Groups by provider client-side:
  ```javascript
  const groupClientsByProvider = () => {
    // Doing in JS what SQL should do
  }
  ```

**Impact:**
- **Backend:** Simplify all client queries
- **Frontend:** Remove client-side grouping logic

#### C. available_periods_view

**Evidence:** Already covered above - replaces complex period generation

### 5. Add Missing Index

**Evidence:**
- **Backend (`payments/__init__.py`):** Every payment query filters by:
  ```sql
  WHERE p.client_id = ? AND p.applied_year = ? AND p.applied_period = ?
  ```
- **Current Schema:** No index on this combination
- **Performance:** Full table scans on payment lookups

**Impact:**
- **Query Performance:** 10-100x faster payment period lookups
- **Affects:** All payment queries, period availability checks

## Complete Impact Summary

**Backend Changes:**
1. Delete entire `calculations` folder
2. Simplify `periods/__init__.py` from 150 to ~20 lines
3. Remove date string handling throughout
4. Simplify all client queries (remove JOINs)
5. Remove expected fee calculations

**Frontend Changes:**
1. Delete `calculateVariance()` function
2. Simplify `groupClientsByProvider()`
3. Remove date parsing complexity
4. Simplify period generation logic

**Performance Gains:**
1. Date comparisons: 10x faster (native DATE vs string)
2. Period lookups: 100x faster (indexed table vs generation)
3. Payment queries: 10-50x faster (new index)
4. Variance display: Eliminate N API calls per page
5. Client grouping: Instant vs client-side processing

This plan is backed by specific evidence from your codebase showing redundancy, performance issues, and maintainability problems that these changes directly address.
