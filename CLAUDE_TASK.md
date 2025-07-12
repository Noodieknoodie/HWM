# REFER TO: 


# HohimerPro 401k App - Database Schema Update Implementation Guide

## Overview
We've completed a major overhaul of the database schema to fix critical issues with payment tracking and reporting. The Summary page was showing incomplete and incorrect data. This guide explains what changed and how to implement the frontend updates.

## What Was Wrong Before

### 1. **Missing Clients Problem**
The old views (`quarterly_summary_by_provider`, `quarterly_summary_detail`) only showed clients who had made payments. This meant:
- New clients disappeared from reports
- Clients who missed payments vanished from summaries  
- No way to see who owed money

### 2. **Incorrect Expected Fee Calculations**
- The `expected_fee` column in the payments table was unreliable (sometimes just copied from actual_fee)
- No fallback logic for percentage-based clients missing AUM data
- Providers like Ascensus, Principal, and Pricipal never recorded AUM, making expected fees impossible to calculate

### 3. **Bad Data**
- PSWM Inc had a rate of 0.125 (12.5% monthly = 150% annual!) instead of 0.000417
- This caused expected fees of $128,861 instead of ~$400

### 4. **Broken Variance Status**
- Aggregated views showed "exact" for -50% variances
- The logic tried to aggregate status strings instead of recalculating from amounts

## New Database Architecture

### Core Views Structure
```
client_period_matrix (base view - every client/period combination)
    ↓
calculate_expected_fee (function with 3-tier fallback)
    ↓
comprehensive_payment_summary (all periods with/without payments)
    ↓
quarterly_summary_aggregated → yearly_summaries_view
```

### New Views to Use

1. **`quarterly_summary_aggregated`** - Replaces `quarterly_summary_by_provider`
   - Shows ALL clients (even with no payments)
   - Has `expected_payment_count` field for count-based metrics
   - Correct variance calculations

2. **`comprehensive_payment_summary`** - Replaces `quarterly_summary_detail`
   - Shows every period for every client
   - NULL payment_id indicates missing payment
   - Uses calculated expected fees, not the unreliable column

3. **`yearly_summaries_view`** - New view for annual summaries
   - Aggregates quarterly data
   - Includes quarterly breakdowns (q1_actual, q2_actual, etc.)

### Expected Fee Calculation Logic
The `calculate_expected_fee` function uses a 3-tier fallback:
1. Try to use current period's AUM
2. Fall back to most recent AUM from any prior payment
3. Fall back to last payment amount (assumes stable AUM)

## Implementation Steps

### 1. Update API Client (`src/api/client.ts`)

Replace these methods:

```typescript
// OLD - REMOVE
async getQuarterlySummaryByProvider(year: number, quarter: number) {
  return this.request(`quarterly_summary_by_provider?$filter=...`);
}

// NEW - ADD
async getQuarterlySummaryByProvider(year: number, quarter: number) {
  return this.request(`quarterly_summary_aggregated?$filter=applied_year eq ${year} and quarter eq ${quarter}`);
}

// OLD - REMOVE  
async getQuarterlySummaryDetail(clientId: number, year: number, quarter: number) {
  return this.request(`quarterly_summary_detail?$filter=...`);
}

// NEW - ADD
async getQuarterlySummaryDetail(clientId: number, year: number, quarter: number) {
  return this.request(`comprehensive_payment_summary?$filter=client_id eq ${clientId} and year eq ${year} and quarter eq ${quarter}`);
}

// NEW - ADD
async getAnnualSummaryByProvider(year: number) {
  return this.request(`yearly_summaries_view?$filter=year eq ${year}`);
}
```

### 2. Update Summary Page Components

The Summary page needs to handle the new fields:

#### Provider Summary Table Changes
- Add "Expected Payments" column using `expected_payment_count`
- Show payment completion as "X of Y" using `payment_count` and `expected_payment_count`
- Update variance status colors to properly reflect the fixed calculations

#### Client Detail Expansion Changes
- Handle periods with `payment_id = NULL` as missing payments
- Show these as red/warning rows with "No Payment" status
- Expected fees will now always be calculated (no more NULL expected fees for percentage clients)

### 3. Handle Missing Payments

The new schema explicitly shows missing payments. Update the UI to:

```typescript
// In the expanded client detail view
interface PaymentPeriod {
  period_display: string;
  payment_id: number | null;  // NULL = missing payment
  actual_fee: number | null;
  expected_fee: number;
  variance_status: 'no_payment' | 'exact' | 'acceptable' | 'warning' | 'alert';
}

// Style missing payments differently
const rowClass = !payment.payment_id ? 'missing-payment-row' : '';
```

### 4. Update Variance Status Styling

The variance statuses are now accurate:
- `no_payment` - No payment received (new status)
- `unknown` - Cannot calculate expected fee  
- `exact` - Within $0.01
- `acceptable` - Within 5%
- `warning` - Within 15%
- `alert` - Over 15% variance

### 5. Remove Legacy Code

Remove any references to:
- `quarterly_summary_by_provider` view
- `quarterly_summary_detail` view
- `quarterly_totals` view (if exists)
- Any code that reads `payments.expected_fee` directly

## Testing Checklist

1. **Verify all clients appear** - Even those with no 2025 payments should show with 0 actual
2. **Check PSWM Inc** - Expected fees should be ~$400, not $128k
3. **Test variance colors** - -50% variance should show as "alert", not "exact"
4. **Expand client details** - Should see all periods, including missing payments
5. **Count metrics** - "2 of 3 payments" style display should work

## Migration Notes

- The database has already been updated with all new views
- PSWM Inc's rate has been corrected  
- No data migration needed - just point to new views
- Old views still exist but should not be used

## Why This Matters

The Summary page is the main dashboard for tracking payment compliance. Before these changes:
- Clients could "disappear" making it impossible to track who owed money
- Expected fees were wildly incorrect for some clients
- The page showed incorrect compliance statuses

Now:
- Every client is visible every period
- Expected fees use intelligent fallback logic for missing data
- Variance calculations accurately reflect payment compliance
- The business can properly track who owes what