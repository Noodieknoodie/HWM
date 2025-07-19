# Complete Export Page Fix Guide

## ISSUE 1: Quarterly Export Field Mappings

**Location:** ~line 115-125

**Current:**

```typescript
rate: row.fee_type === 'Percentage' ? `${row.fee_percentage}%` : `$${row.fee_flat}`,
expected: row.expected_fee || 0,
actual: row.amount_received || 0,
variance: (row.amount_received || 0) - (row.expected_fee || 0),
variancePercent: row.expected_fee ? ((row.amount_received || 0) - row.expected_fee) / row.expected_fee * 100 : 0,
status: row.payment_status || 'N/A'
```

**Fix:**

```typescript
rate: row.quarterly_rate,  // Raw number for both CSV & Excel
expected: row.client_expected || 0,
actual: row.client_actual || 0,
variance: row.client_variance || 0,  // Stop calculating
variancePercent: row.client_variance_percent || 0,  // Stop calculating
status: row.variance_status || 'N/A'
```

## ISSUE 2: Annual Export Field Mappings

**Location:** ~line 140-150

**Current:**

```typescript
annualRate: row.fee_type === 'Percentage' ? `${row.fee_percentage}%` : `$${row.fee_flat}`,
q1: row.q1_total || 0,
q2: row.q2_total || 0,
q3: row.q3_total || 0,
q4: row.q4_total || 0,
total: row.annual_total || 0
```

**Fix:**

```typescript
annualRate: row.annual_rate,  // Raw number for both CSV & Excel
q1: row.q1_actual || 0,
q2: row.q2_actual || 0,
q3: row.q3_actual || 0,
q4: row.q4_actual || 0,
total: row.client_annual_total || 0
```

## ISSUE 3: Client History Contract Rates

**Location:** ~line 235

**Current:**

```typescript
currentRate: currentContract?.fee_type === 'Percentage' 
  ? `${currentContract.fee_percentage}%` 
  : `$${currentContract?.fee_flat || 'N/A'}`,
```

**Fix:**

```typescript
// For CSV - raw number
currentRate: currentContract?.fee_type === 'percentage'  // lowercase!
  ? currentContract.percent_rate * 100  // Convert to display percentage
  : currentContract?.flat_rate || 0,

// For Excel - same raw number, apply formatting later
```

## ISSUE 4: Client History Payment Fields

**Location:** ~line 242-255

**Current:**

```typescript
payments: payments.map((payment: any) => ({
  date: new Date(payment.received_date).toLocaleDateString('en-US'),
  period: `${payment.period_label} ${payment.applied_year}`,
  paymentMethod: payment.payment_method || 'N/A',
  amount: payment.amount,
  aum: includeAum ? payment.aum : undefined,
  expectedFee: payment.expected_fee || 0,
  variance: includeVariance ? (payment.amount - (payment.expected_fee || 0)) : undefined,
  variancePercent: includeVariance && payment.expected_fee 
    ? ((payment.amount - payment.expected_fee) / payment.expected_fee * 100) 
    : undefined,
  status: includeVariance ? payment.payment_status : undefined
}))
```

**Fix:**

```typescript
payments: payments.map((payment: any) => ({
  date: format === 'csv' 
    ? new Date(payment.received_date).toLocaleDateString('en-US')  // MM/DD/YYYY string
    : new Date(payment.received_date).getTime() / 86400000 + 25569,  // Excel date serial
  period: payment.period_display || `${payment.applied_period} ${payment.applied_year}`,
  paymentMethod: payment.method || 'N/A',
  amount: payment.actual_fee,
  aum: includeAum ? payment.display_aum : undefined,
  expectedFee: payment.expected_fee || 0,
  variance: includeVariance ? payment.variance_amount : undefined,  // Use DB field
  variancePercent: includeVariance ? payment.variance_percent : undefined,  // Use DB field
  status: includeVariance ? payment.variance_status : undefined
}))
```

## ISSUE 5: Case Sensitivity Bug

**All exports checking fee_type**

**Current:** `row.fee_type === 'Percentage'`  
**Fix:** `row.fee_type === 'percentage'` (lowercase)

## ISSUE 6: Excel-Specific Formatting

**If you want formatted display in Excel:**

After creating worksheet but before writing file:

```typescript
if (format === 'excel' && XLSX) {
  // Apply number formats to columns
  const currencyColumns = ['Expected', 'Actual', 'Variance', 'Amount', 'AUM'];
  const percentColumns = ['Rate', 'Variance %'];
  
  // Would need XLSX formatting logic here
  // But honestly, just export raw numbers and let Excel handle it
}
```

## ISSUE 7: Annual Export Missing Provider Rows

**Current:** Only exports client rows  
**Should:** Match Quarterly pattern with provider summary rows

Add provider aggregation logic similar to Quarterly if needed.

-----

## ALREADY CORRECT ✅

### Field Names That Work:

- `provider_name`
- `display_name`
- `payment_schedule`
- `fee_type`
- `received_date`
- `expected_fee` (in payment history)

### Calculations That Work:

- System exports (contracts/clients/contacts) - no formatting, raw data
- Date formatting for CSV (MM/DD/YYYY)

### Logic That Works:

- Filter by selected clients vs all
- Date range filtering
- Include/exclude toggles for variance and AUM
- File download mechanism

### Export Structure That Works:

- CSV header generation
- Basic data transformation flow
- Loading states
- Error handling

-----

## Summary of Changes Needed:

1. **Replace 22 field names** with correct database fields
1. **Remove 4 calculations** - use database-provided variance
1. **Fix case sensitivity** on fee_type checks
1. **Remove all string formatting** ($ and % symbols)
1. **Add Excel date conversion** for payment history dates
1. **Consider provider rows** for Annual export

The core logic is fine. It’s just using wrong field names and doing unnecessary work.
