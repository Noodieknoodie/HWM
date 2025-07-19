# 401k Payment Tracking System 

## Note from the dude who pays for you, Claude Code:
This application is for the operations employees at my company, Hohimer Wealth Management. My company manages the assets within the 401k plans that our clients offer to their employees. This app is a simple tool to help us organize and streamline the entry process, move away from risky Excel sheets, modernize our workflow, and help Dodd, our compliance officer, not have to scramble so much. These payments are typically paid via checks received from providers (like John Hancock, VOYA, etc.), and sometimes a single check is for multiple clients at once, though that detail doesn't really matter for this project. Regardless, I hope this helps put you in the right state of mind as you spearhead finishing this up. The user is smart enough to be dangerous in coding but is too excited by the advent of agentic coding tools (such as yourself) to dedicate his time to learning. He relies on your judgment, and you can expect to be the one doing all the coding in this project, so please don't suggest things you'll regret having to build yourself.


/// NOTE ///
## Database Testing Report

### System Overview
- **Purpose**: Payment tracking for a financial advisory firm managing retirement plans
- **Model**: Arrears billing (payments for previous period)
- **Active Clients**: 29 (excluding test clients 30-34)
- **Total Payments**: 888 historical records
- **Contract Types**: 17 percentage-based, 12 flat fee

### Key Findings

#### 1. **Posting Feature Status**
- The `client_quarter_markers` posting feature is brand new and completely unused
- Every completed quarter in 2024 shows "Should be posted" but none are marked
- No technical issues found - just waiting for adoption

#### 2. **AUM Recording Patterns**
- 20% of percentage-based payments missing AUM (180/888)
- **Voya** and **Principal** providers NEVER record AUM
- This forces all their variances to show as "unknown" status
- System handles this gracefully by estimating AUM from fee/rate when possible
- Other providers like John Hancock and Empower consistently record AUM

#### 3. **Payment Timing**
- Payments arrive extremely late (Q4 2024 payments in January 2025)
- Example: Q4 2024 payments received 300+ days from period start
- This is normal for arrears billing but affects cash flow reporting
- No early payment issues detected

#### 4. **Variance Distribution**
Current variance patterns show healthy distribution:
- **Exact matches**: 31 payments (mostly flat fees)
- **Acceptable (<5%)**: 84 payments (majority)
- **Warning (5-15%)**: 15 payments
- **Alert (>15%)**: 7 payments
- **Unknown (no AUM)**: 33 payments

Thresholds appear well-calibrated for real-world variance.

#### 5. **Data Quality**
- No orphaned records or referential integrity issues
- No invalid period values or future-dated applications
- All clients have single active contracts (no complexity from multiple providers)
- Clean relationships between clients, contracts, and payments
- Payment methods consistently recorded

#### 6. **Quarterly Notes**
- Feature exists but barely used (only 6 test entries from today)
- Could be valuable for documenting variance explanations
- Currently underutilized

### Observations

1. **Provider Patterns**: Clear divide between providers that report AUM (John Hancock, Empower) and those that don't (Voya, Principal)
2. **Payment Consistency**: Most clients pay regularly with minimal gaps
3. **Fee Accuracy**: Flat fee contracts show excellent accuracy with many exact matches
4. **Calculate Expected Fee Logic**: Function correctly returns NULL when AUM unavailable, preventing false variance alerts

### Recommendations

1. **Missing AUM**: Consider separate variance reporting for providers that don't report AUM vs those that do
2. **Posting Feature**: Develop user training/documentation for the new posting workflow
3. **Quarterly Notes**: Encourage use for documenting variance explanations, especially for alerts
4. **Variance Thresholds**: Current settings (0.01/5%/15%) are appropriate - no changes needed

### Technical Assessment
- The `calculate_expected_fee` function works correctly, returning NULL when data insufficient
- The `get_variance_status` function properly handles all edge cases including missing AUM
- View hierarchies correctly aggregate quarterly and annual data
- No performance concerns in current query patterns
- Database constraints and relationships are properly enforced

The system is well-architected for its purpose, gracefully handling real-world data inconsistencies while maintaining data integrity.

# Terminology Index

## 1. System Overview
This system tracks management fee payments from 401k providers to HWM (Hohimer Wealth Management). HWM manages 401k plans for client companies. The providers hold the actual assets and pay HWM's management fees directly from those accounts. This is a recording system, not a payment processing system.

## 2. Core Entities

### 2.1 Client
A company that offers a 401k plan to its employees. Each client has one active contract with HWM for asset management services. Clients are identified by a display name (like "Nordic Museum") and sometimes have a longer legal name stored separately.

### 2.2 Provider
The financial institution that custodies the 401k assets. Examples include Voya, John Hancock, and Ascensus. One provider can service multiple clients. Providers calculate and send management fee payments to HWM based on the contract terms.

### 2.3 Contract
The agreement between a client and HWM that defines:
- Which provider holds the assets
- The fee structure (percentage of assets or flat fee)
- The payment frequency (monthly or quarterly)
- The fee rate

### 2.4 Payment
A record of money received from a provider on behalf of a client. Each payment includes:
- The amount received (actual_fee)
- The date received (received_date)
- The period it covers (applied_period and applied_year)
- Optional: the assets under management at that time (total_assets)
Payments are manually entered - there is no automated matching or import process.

### 2.5 Contact
People associated with a client. Three types:
- Primary: Main contact for the account
- Authorized: Can make decisions about the account
- Provider: Works at the provider company
Contacts are informational only and do not affect any calculations or payment logic.

## 3. Payment Timing and Periods

### 3.1 Payment Schedule
Determines how frequently a client is billed. Two options:
Monthly: 12 payments per year, one for each month
Quarterly: 4 payments per year, one for each quarter
This is the fundamental property that determines:
- How periods are numbered (1-12 for monthly, 1-4 for quarterly)
- How rates are interpreted
- How many payments to expect in any time period

### 3.2 Applied Period vs Received Date
These are distinct concepts:
- Applied Period: The time period the payment covers (what work it's paying for)
- Received Date: When the payment actually arrived
Example: A payment received on July 15, 2024 might be for June 2024 (monthly) or Q2 2024 (quarterly).

### 3.3 Arrears Billing
All payments are for work already completed. This is called billing in arrears:
- In July, you bill for June
- In Q3, you bill for Q2
- In January 2025, you bill for December 2024 or Q4 2024
The system automatically calculates the "current billable period" based on this logic.

### 3.4 Quarter Mapping
Quarters are calendar-based:
- Q1: January, February, March
- Q2: April, May, June
- Q3: July, August, September
- Q4: October, November, December
Monthly payments are grouped into quarters for reporting purposes.

## 4. Fee Calculations

### 4.1 Core Components
Assets Under Management (AUM): The total dollar value of 401k assets the provider is holding for a client at a specific point in time. Critical for percentage-based fee calculations.
Expected Fee: What HWM should receive based on the contract terms and current AUM.
Actual Fee: What HWM actually received from the provider.
Variance: The difference between actual and expected fees. Used to identify payment discrepancies.
// SEE CONDITIONAL DETAILS IN SECTION 5

### 4.2 Fee Types
Percentage: Fee calculated as a percentage of AUM
- Requires knowing the AUM to calculate expected fee
- Formula: AUM × rate = expected fee
Flat: Fixed dollar amount per period
- Same fee regardless of asset value
- Expected fee is simply the contracted rate

### 4.3 Rate Storage Rules
Rates are stored at their natural payment frequency:
- Monthly client with 0.1% rate → stored as 0.001
- Quarterly client with 0.3% rate → stored as 0.003
- Monthly client with $1,000 flat fee → stored as 1000
- Quarterly client with $3,000 flat fee → stored as 3000
To display annual equivalents, multiply by periods per year (12 for monthly, 4 for quarterly).

## 5. AUM Handling

### 5.1 When AUM is Known
For percentage-based clients with actual AUM data:
1. Calculate expected fee = AUM × rate
2. Calculate variance = actual fee - expected fee
3. Categorize variance severity (exact/acceptable/warning/alert)
4. Display all values normally

### 5.2 When AUM is Missing

For percentage-based clients without AUM data:
1. Estimate AUM: actual fee ÷ rate
2. Mark as estimated: Set is_aum_estimated = true
3. Display differently: Show in gray/italic to indicate estimation
4. Block variance: Display "unknown" status instead of calculating

{{FIXED ✓}} The calculate_expected_fee function correctly returns NULL when no AUM exists for the current period. It does not search backwards through historical payments.

### 5.3 The Hard Rule
Never calculate variance from estimated AUM. Since estimated AUM = payment ÷ rate, the expected fee would equal the actual fee, making variance always zero and meaningless.

## 6. Variance Calculations

### 6.1 When Variance is Valid
Calculate variance for:
- All flat fee clients (expected fee is known)
- Percentage clients with actual AUM data
- Any payment where expected fee can be independently determined

### 6.2 When Variance is Invalid
Do not calculate variance for:
- Percentage clients with estimated AUM
- Payments missing required data
- Situations where expected fee cannot be determined

### 6.3 Variance Thresholds
- Exact: Within $0.01 of expected
- Acceptable: Within 5% of expected  
- Warning: Within 15% of expected
- Alert: More than 15% difference
These thresholds apply uniformly regardless of payment size or client type.

{{FIXED ✓}} Thresholds are stored in the variance_thresholds table and can be modified without code changes.

## 7. Status Tracking

### 7.1 Payment Status
Indicates whether a payment has been received for the current billable period:
- Paid: Payment received
- Due: Payment not yet received
This status only considers the current period based on arrears billing logic.

{{FIXED ✓}} The "compliance_status" field has been completely removed. Only "payment_status" exists in the system.

### 7.2 Posted to HWM
A manual checkbox system that lets compliance officers (specifically Dodd) mark that they've reviewed and approved a quarter's payments for a client. This is tracked in the client_quarter_markers table and is completely separate from payment data. It's simply a "I've looked at this" indicator.

{{FIXED ✓}} The is_posted field in client_quarter_markers is correctly referenced by the views. The feature is brand new and unused but technically functional.

### 7.3 Collection Rate
A calculated metric showing what percentage of expected fees were actually collected:
- Formula: (Total Actual ÷ Total Expected) × 100
- Aggregated across all clients
- Only meaningful when expected fees can be calculated

## 8. Data Quality and Historical Records

### 8.1 IMA Signed Date
Originally intended as the contract signing date, but the historical data was unreliable. Now defined as the date of the first payment, providing a "client since" date.

### 8.2 Historical Data Migration
The system contains data migrated from Excel spreadsheets, which means:
- Many historical records lack AUM values
- Some data may be incomplete or estimated
- The system is designed to handle missing data gracefully

### 8.3 Manual Process
This is not an automated system. Users must:
1. Select the client from the sidebar
2. Manually enter payment details
3. Choose which period the payment applies to
There are no reference numbers, automatic matching, or payment imports.

## 9. Summary and Reporting

### 9.1 Dashboard View
Shows the current state of a single client:
- Most recent payment information
- Current billable period and payment status
- Contract details and rates
- Estimated next payment

### 9.2 Quarterly Summary
Displays all payments for a specific quarter:
- Groups clients by provider
- Shows payment details and variances
- Allows drilling down to individual payments
- Includes manual compliance checkboxes

### 9.3 Annual Summary
Shows a full year's data:
- Four quarters of totals per client
- Provider-level aggregation
- No payment-level detail
- Year-over-year comparisons

### 9.4 Provider Aggregation
In summary views, clients are grouped under their provider. This is purely organizational - there are no provider-level fees or calculations. It simply helps see all clients using the same provider together.

## 10. What This System Is Not
This system does not:
- Automatically match or import payments
- Send alerts or notifications
- Track promises or partial payment schedules
- Enforce compliance or flag issues
- Calculate provider-level fees
- Handle multiple simultaneous contracts per client
- Adjust historical data when contracts change
It is a recording and reporting system that shows what happened and lets users interpret the results.