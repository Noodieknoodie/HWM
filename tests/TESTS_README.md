# HWM Test Framework

This test framework is designed to work with the mock data already loaded in the database

HWM 401k Payment Tracker Test Document
Test Strategy Overview
Use the 4 mock clients that span 2021-2025 with different test scenarios applied by year. This approach tests every fee configuration against every edge case systematically.
Mock Client Setup (ALREADY IN DB)
Base Clients (Constant Across All Years)
1. TEST-MONTHLY-FLAT: Monthly schedule, flat fee type
2. TEST-QUARTERLY-FLAT: Quarterly schedule, flat fee type
3. TEST-MONTHLY-PERCENT: Monthly schedule, percentage fee type
4. TEST-QUARTERLY-PERCENT: Quarterly schedule, percentage fee type
Year-Based Test Scenarios
2025 (Jan-June): Clean Baseline + Dashboard Estimation
* All payments correct and on time
* Percentage clients: Mix of provided and missing AUM
    * Jan/Mar/May: Full AUM data
    * Feb/Apr/Jun: No AUM (tests dashboard estimation)
* Purpose: Test current functionality and AUM reverse calculation
2024: Missing AUM Year
* Percentage clients: AUM only provided in Mar, Jun, Sep, Dec
* Flat clients: Normal (but verify variance still calculates without AUM)
* Add edge case: One payment with $0 expected fee
* Purpose: Test estimation, variance blocking, and edge cases
2023: Variance Test Year + Boundaries
* Q1: Exact matches testing $0.01 threshold
    * Small payment: $10 with $9.99 expected (tests dollar threshold)
    * Large payment: $10,000 with $9,999.99 expected (same threshold)
* Q2: 5% over expected (test "acceptable" status)
* Q3: 12% under expected (test "warning" status)
* Q4: 22% over expected (test "alert" status)
* Dec 31 payment: Verify Q4 assignment
* Purpose: Validate all variance thresholds and quarter boundaries
2022: Payment Gap Year + Multi-Payment
* MONTHLY-FLAT: Missing Feb, May, Aug
    * June: TWO payments for same month (test duplicate handling)
* QUARTERLY-FLAT: Missing Q2
* MONTHLY-PERCENT: Missing Mar, Jul, Nov
    * April: $0 payment amount (test validation)
* QUARTERLY-PERCENT: Missing Q3
* Purpose: Test compliance, missing payments, and edge cases
2021: Contract Change Year + Provider Aggregation
* All contracts change July 1, 2021
* First half: Original rates
* Second half: 20% higher rates (new contracts)
* Create 3 clients under same provider for aggregation testing
* Purpose: Test contract history and provider math
Test Execution Matrix
Test Category	Year/Period	What to Verify
Current Period Logic	July 2025	All clients show June 2025 or Q2 2025 as billable
Dashboard AUM Estimate	2025 Feb/Apr	Dashboard shows estimated AUM, calculation = payment/rate
Clean Calculations	2025	All math correct, rollups accurate, Q1 sums Jan/Feb/Mar
AUM Estimation	2024	Percentage: asterisks, "N/A - Est. AUM"; Flat: normal variance
Variance Thresholds	2023 by quarter	Status matches, $0.01 = exact regardless of payment size
Quarter Boundaries	2023 Dec 31	Payment appears in Q4, not Q1 2024
Missing Payments	2022	Gaps show "Missing Payment", compliance % correct
Duplicate Payments	2022 June	Both payments show, summaries handle correctly
Contract Changes	2021 July split	Expected fees use correct rate based on contract
Provider Aggregation	All years	Provider totals = sum of client totals exactly
Automated Test Suite
1. Database Foundation Tests
Test: Arrears Billing Logic
* Query: SELECT current_period_display FROM dashboard_view WHERE client_id IN (test client IDs)
* Pass: In July 2025, monthly clients show "June 2025", quarterly show "Q2 2025"
* Fail: Shows July or Q3
Test: Quarterly Mapping
* Query: SELECT quarter FROM comprehensive_payment_summary WHERE client_id = [TEST-MONTHLY-FLAT] AND year = 2025
* Pass: Jan/Feb/Mar = Q1, Apr/May/Jun = Q2, etc.
* Fail: Incorrect quarter assignment
Test: Quarter Boundaries
* Query: Check Dec 31, 2023 payment quarter assignment
* Pass: Shows in Q4 2023
* Fail: Shows in Q1 2024
2. Calculation Tests
Test: Dashboard AUM Estimation
* Query: Check dashboard_view for TEST-MONTHLY-PERCENT in Feb 2025
* Pass: aum = last_payment_amount / percent_rate, aum_source = 'estimated'
* Fail: AUM null or calculation wrong
Test: Flat Fee Variance Without AUM
* Query: Check 2024 TEST-MONTHLY-FLAT variance calculations
* Pass: Variance calculated normally despite null AUM
* Fail: Variance shows as NULL or N/A
Test: AUM Estimation Flag
* Query: Check 2024 data for percentage clients
* Pass: is_aum_estimated = 1 for months without AUM
* Fail: Flag not set or calculation attempted
Test: Variance Status Assignment
* Query: Check variance_status for all 2023 payments
* Pass: Q1="exact", Q2="acceptable", Q3="warning", Q4="alert"
* Fail: Wrong status for variance percentage
Test: Zero Expected Fee Handling
* Query: Check payment with $0 expected in 2024
* Pass: variance_percent = NULL (no divide by zero)
* Fail: Error or infinity value
Test: Missing Payment Handling
* Query: Check 2022 comprehensive_payment_summary
* Pass: payment_id IS NULL for gap months, included in counts
* Fail: Missing periods not shown
3. Business Logic Tests
Test: Multiple Payments Same Period
* Check: June 2022 for TEST-MONTHLY-FLAT
* Pass: Both payments visible, summaries show total
* Fail: Only one payment shown or double counting
Test: Provider Total Aggregation
* Check: Provider totals in quarterly_summary
* Pass: Sum of client totals = provider total exactly
* Fail: Rounding errors or miscalculation
Test: Quarterly Rollup for Monthly Clients
* Check: Q2 2025 for TEST-MONTHLY-FLAT
* Pass: payment_count = 3, total = sum of Apr+May+Jun
* Fail: Wrong count or math
Test: Contract Change Preservation
* Check: 2021 expected fees before/after July
* Pass: First half uses original rate, second half uses new rate
* Fail: Historical data changed or wrong rate applied
Test: Posted Status Independence
* Action: Toggle is_posted for any quarter
* Pass: Only affects checkboxes, not payment data
* Fail: Payment calculations change
4. Validation Tests
Test: Zero Dollar Payment
* Action: Try to save payment with $0 amount
* Pass: Error "Payment amount must be positive"
* Fail: Payment saves
Test: Negative AUM Entry
* Action: Enter -1000 in AUM field
* Pass: Accepts negative (edge case allowed)
* Fail: Validation prevents entry
Test: Future Payment Prevention
* Action: Try to save payment dated tomorrow
* Pass: Error "Payment date cannot be in the future"
* Fail: Payment saves
5. Export Validation
Test: CSV Export Accuracy
* Export: Q2 2025 summary
* Pass: All test clients present, totals match UI, estimated AUM marked
* Fail: Missing data or calculation differences
Test: Provider Subtotals
* Export: Annual 2021 with multiple providers
* Pass: Provider subtotal rows calculate correctly
* Fail: Manual sum doesn't match exported total
Manual UI Testing Instructions
Phase 1: Initial State Verification
Test: Dashboard Current Period
* Tell user: "Navigate to TEST-MONTHLY-FLAT in July 2025"
* Ask: "What period shows as current?"
* Success: User reports "June 2025"
* Failure: Any other period
Test: Dashboard AUM Display
* Tell user: "Look at TEST-MONTHLY-PERCENT dashboard in Feb 2025"
* Ask: "How is the AUM displayed?"
* Success: "Shows number in gray/italic with asterisk"
* Failure: Normal black text or no AUM shown
Test: Payment Status Display
* Tell user: "Look at payment status for TEST-QUARTERLY-PERCENT"
* Ask: "Is it marked as Due or Paid?"
* Success: "Due" (since we're in July collecting for Q2)
* Failure: "Paid" without entering payment
Phase 2: Visual Indicators
Test: AUM Estimation Asterisks
* Tell user: "View payment history for TEST-MONTHLY-PERCENT, year 2024"
* Ask: "Do some AUM values have asterisks?"
* Success: "Yes, on entries without original AUM data"
* Failure: No visual distinction
Test: Variance for Flat Fees
* Tell user: "Check TEST-MONTHLY-FLAT 2024 payments"
* Ask: "Do flat fee payments show variance?"
* Success: "Yes, variance calculated normally"
* Failure: Shows N/A for variance
Test: Variance Indicators
* Tell user: "Look at TEST-QUARTERLY-FLAT payment history for 2023"
* Ask: "Do any payments have amber dots?"
* Success: "Yes, Q3 and Q4 have dots"
* Failure: No dots or wrong payments marked
Phase 3: Data Entry
Test: Zero Payment Validation
* Tell user: "Try to enter $0 payment amount"
* Ask: "What happens?"
* Success: "Error about positive amount required"
* Failure: Can proceed to save
Test: Payment Entry Validation
* Tell user: "Try to enter a payment dated tomorrow"
* Ask: "What happens?"
* Success: "Error message about future dates"
* Failure: Payment saves
Test: Duplicate Period Entry
* Tell user: "Enter second payment for TEST-MONTHLY-FLAT June 2022"
* Ask: "Does it save successfully?"
* Success: "Yes, both payments show in history"
* Failure: Error or replaces first payment
Phase 4: Summary Views
Test: Dashboard Estimation Calculation
* Tell user: "For TEST-QUARTERLY-PERCENT with 0.3% rate and $3000 payment"
* Ask: "What AUM does dashboard show?"
* Success: "$1,000,000 in gray with asterisk"
* Failure: Different number or no estimation
Test: Quarterly Summary Accuracy
* Tell user: "Open Q2 2023 quarterly summary"
* Ask: "What variance status shows for each test client?"
* Success: "All show 'acceptable' (green/yellow)"
* Failure: Wrong status indicators
Test: Provider Aggregation
* Tell user: "In quarterly summary, compare provider total to sum of its clients"
* Ask: "Do they match exactly?"
* Success: "Yes, provider total = sum of clients"
* Failure: Numbers don't add up
Test: Missing Payment Display
* Tell user: "Expand TEST-MONTHLY-PERCENT details for Q1 2022"
* Ask: "What shows for March?"
* Success: "Missing Payment"
* Failure: Blank or error
Test: Posted Checkbox Function
* Tell user: "Toggle posted checkbox for TEST-QUARTERLY-FLAT Q2 2025"
* Ask: "Does provider count update?"
* Success: "Yes, fraction changes (e.g., 1/2 → 2/2)"
* Failure: No change
Phase 5: Compliance Testing
Test: Compliance Modal Calculations
* Tell user: "Open compliance modal for TEST-QUARTERLY-PERCENT"
* Ask: "What's the 2022 compliance rate?"
* Success: "75%" (3 of 4 quarters paid)
* Failure: Different percentage
Test: Multiple Payment Handling
* Tell user: "Check compliance for TEST-MONTHLY-FLAT June 2022"
* Ask: "How many payments show?"
* Success: "Two payments listed for June"
* Failure: Only one or combined
Test: Historical Navigation
* Tell user: "In compliance modal, expand 2021"
* Ask: "Do you see different rates before and after July?"
* Success: "Yes, payment amounts change mid-year"
* Failure: Consistent amounts all year
Phase 6: State Management
Test: Client Switching
* Tell user: "Start entering payment for TEST-MONTHLY-FLAT, then switch to TEST-QUARTERLY-FLAT"
* Ask: "What happens to the form?"
* Success: "Form clears completely"
* Failure: Old data remains
Test: Navigation Persistence
* Tell user: "Set year filter to 2023, navigate to Contacts, return to Payments"
* Ask: "Is 2023 still selected?"
* Success: "Yes"
* Failure: Reset to current year
Phase 7: Rate Display Verification
Test: Rate Conversion Display
* Tell user: "Check dashboard for TEST-MONTHLY-PERCENT with 0.1% monthly rate"
* Ask: "What rates show in the card?"
* Success: "M: 0.10%, Q: 0.30%, A: 1.20%"
* Failure: Wrong calculations or single rate
Phase 8: Performance Testing
Test: Large Dataset Performance
* Tell user: "Expand all quarterly details for all test clients in 2022"
* Ask: "Any lag or freezing?"
* Success: "Smooth performance"
* Failure: Noticeable delays
Test: Contract Change Impact
* Tell user: "Change TEST-MONTHLY-PERCENT rate and refresh"
* Ask: "How quickly do all views update?"
* Success: "Immediate update across all screens"
* Failure: Some views show old data
Success Criteria Summary
All tests pass when:
1. Current period calculations follow arrears logic
2. Visual indicators match data state (asterisks, dots, gray text)
3. Contract changes preserve history via separate contracts
4. Missing data handled gracefully with appropriate messages
5. Provider aggregations match sum of clients exactly
6. Exports match UI exactly including estimation indicators
7. All validation rules prevent bad data entry
8. User can complete quarterly review efficiently
Critical failures requiring immediate fix:
* Wrong current period displayed
* Mathematical calculation errors (especially dashboard AUM estimation)
* Provider totals not matching client sums
* Historical data corruption on contract changes
* Missing visual indicators for estimated data
* Divide by zero errors with $0 expected fees



