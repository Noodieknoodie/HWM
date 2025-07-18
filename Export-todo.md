# Fix Export Field Mappings

## See:

`src/components/export/ExportDataPage.tsx`

## Refer to source of truth:

- `src/pages/Summary.tsx` (quarterly_page_data, annual_page_data interfaces)
- `src/components/payment/PaymentHistory.tsx` (payment_history_view fields)
- `src/hooks/useClientDashboard.ts` (contract fields)

## Issue:

22 mismatched field names causing undefined values in exports

## Task:

### Quarterly Export (~line 115-125)

Find → Replace:

- `fee_percentage` → `quarterly_rate`
- `fee_flat` → `quarterly_rate`
- `expected_fee` → `client_expected`
- `amount_received` → `client_actual`
- `payment_status` → `variance_status`

Remove string formatting:

- `row.fee_type === 'Percentage' ? \`${row.fee_percentage}%` : `$${row.fee_flat}``→`row.quarterly_rate`

### Annual Export (~line 140-150)

Find → Replace:

- `fee_percentage` → `annual_rate`
- `fee_flat` → `annual_rate`
- `q1_total` → `q1_actual`
- `q2_total` → `q2_actual`
- `q3_total` → `q3_actual`
- `q4_total` → `q4_actual`
- `annual_total` → `client_annual_total`

Remove string formatting:

- `row.fee_type === 'Percentage' ? \`${row.fee_percentage}%` : `$${row.fee_flat}``→`row.annual_rate`

### Client History Export (~line 235-255)

Find → Replace:

- `currentContract.fee_percentage` → `currentContract.percent_rate * 100`
- `currentContract.fee_flat` → `currentContract.flat_rate`
- `payment.period_label` → `payment.period_display`
- `payment.payment_method` → `payment.method`
- `payment.amount` → `payment.actual_fee`
- `payment.aum` → `payment.display_aum`
- `payment.payment_status` → `payment.variance_status`

Remove string formatting:

- `currentContract?.fee_type === 'Percentage' ? \`${currentContract.fee_percentage}%` : `$${currentContract?.fee_flat || ‘N/A’}``→`currentContract?.fee_type === ‘percentage’ ? currentContract.percent_rate * 100 : currentContract.flat_rate`


