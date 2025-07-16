# 401k Payment Tracking System - Terminology Index

## System Overview

This system tracks management fee payments from 401k providers to HWM (Hohimer Wealth Management). HWM manages 401k plans for client companies. The providers hold the actual assets and pay HWM's management fees directly from those accounts. This is a recording system, not a payment processing system.

## Core Entities

### Client
A company that offers a 401k plan to its employees. Each client has one active contract with HWM for asset management services. Clients are identified by a display name (like "Nordic Museum") and sometimes have a longer legal name stored separately.

### Provider
The financial institution that custodies the 401k assets. Examples include Voya, John Hancock, and Ascensus. One provider can service multiple clients. Providers calculate and send management fee payments to HWM based on the contract terms.

### Contract
The agreement between a client and HWM that defines:
- Which provider holds the assets
- The fee structure (percentage of assets or flat fee)
- The payment frequency (monthly or quarterly)
- The fee rate

Currently the system assumes one active contract per client. When rates change, the existing contract should be updated, though this will affect historical variance calculations. 

// NOTE: Future improvement needed - implement contract date ranges with start/end dates to properly handle rate changes without affecting historical variance calculations.

### Payment
A record of money received from a provider on behalf of a client. Each payment includes:
- The amount received (actual_fee)
- The date received (received_date)
- The period it covers (applied_period and applied_year)
- Optional: the assets under management at that time (total_assets)

Payments are manually entered - there is no automated matching or import process.

### Contact
People associated with a client. Three types:
- Primary: Main contact for the account
- Authorized: Can make decisions about the account
- Provider: Works at the provider company

Contacts are informational only and do not affect any calculations or payment logic.

## Payment Timing and Periods

### Payment Schedule
Determines how frequently a client is billed. Two options:

**Monthly**: 12 payments per year, one for each month
**Quarterly**: 4 payments per year, one for each quarter

This is the fundamental property that determines:
- How periods are numbered (1-12 for monthly, 1-4 for quarterly)
- How rates are interpreted
- How many payments to expect in any time period

### Applied Period vs Received Date
These are distinct concepts:
- **Applied Period**: The time period the payment covers (what work it's paying for)
- **Received Date**: When the payment actually arrived

Example: A payment received on July 15, 2024 might be for June 2024 (monthly) or Q2 2024 (quarterly).

### Arrears Billing
All payments are for work already completed. This is called billing in arrears:
- In July, you bill for June
- In Q3, you bill for Q2
- In January 2025, you bill for December 2024 or Q4 2024

The system automatically calculates the "current billable period" based on this logic.

### Quarter Mapping
Quarters are calendar-based:
- Q1: January, February, March
- Q2: April, May, June
- Q3: July, August, September
- Q4: October, November, December

Monthly payments are grouped into quarters for reporting purposes.

## Fee Calculations

### Fee Types

**Percentage**: The fee is a percentage of assets under management (AUM)
- Formula: AUM × percent_rate = fee
- Requires knowing the asset value

**Flat**: The fee is a fixed dollar amount
- Same fee regardless of asset value
- Simpler calculation

### Rate Storage and Scaling

This is critical: **Rates are stored at their payment frequency.**

For percentage rates:
- A monthly client with rate 0.0007 pays 0.07% of assets each month
- A quarterly client with rate 0.003 pays 0.3% of assets each quarter

For flat rates:
- A monthly client with rate $1,000 pays $1,000 per month
- A quarterly client with rate $3,000 pays $3,000 per quarter

To show equivalent rates at different frequencies, multiply:
- Monthly to quarterly: rate × 3
- Monthly to annual: rate × 12
- Quarterly to annual: rate × 4

### Expected Fee Calculation

The expected fee is what should be received based on the contract:

**For flat fee clients**: Simply the flat rate.

**For percentage clients**: AUM × percent_rate. However, this requires knowing the AUM. The system attempts to find AUM in this order:
1. AUM recorded with the current payment
2. Most recent AUM from a previous payment
3. Cannot calculate if no AUM available

### The AUM Problem

Historical data migrated from Excel often lacks AUM values. This is common because:
- The data wasn't tracked historically
- Users don't always enter it even when known
- It's not required for flat fee clients

When AUM is missing for a percentage-based client:
- The true expected fee cannot be calculated
- The system may show an estimated AUM (payment ÷ rate) for display purposes
- This estimation is not stored - it's calculated on the fly

### Variance Calculations

Variance = Actual Fee - Expected Fee

The variance shows whether a payment was over or under the expected amount. Variance is only meaningful when the expected fee can be calculated.

Variance categories:
- **exact**: Within $0.01 (essentially perfect)
- **acceptable**: Within 5% of expected
- **warning**: Within 15% of expected
- **alert**: More than 15% off

These thresholds are arbitrary and could be adjusted.

## Status Tracking

### Payment Status
Indicates whether a payment has been received for the current billable period:
- **Paid**: Payment received
- **Due**: Payment not yet received

This status only considers the current period based on arrears billing logic.

// NOTE: The system previously had a separate "compliance_status" field that duplicated payment status with color names (green/yellow). This is being removed - payment_status is the single source of truth, and the UI layer will handle any color coding.

### Posted to HWM
A manual checkbox system that lets compliance officers (specifically Dodd) mark that they've reviewed and approved a quarter's payments for a client. This is tracked in the client_quarter_markers table and is completely separate from payment data. It's simply a "I've looked at this" indicator.

// NOTE: There's also a legacy posted_to_hwm field on individual payments that's unused and should be removed.

### Collection Rate
A calculated metric showing what percentage of expected fees were actually collected:
- Formula: (Total Actual ÷ Total Expected) × 100
- Aggregated across all clients
- Only meaningful when expected fees can be calculated

## Data Quality and Historical Records

### IMA Signed Date
Originally intended as the contract signing date, but the historical data was unreliable. Now defined as the date of the first payment, providing a "client since" date.

### Historical Data Migration
The system contains data migrated from Excel spreadsheets, which means:
- Many historical records lack AUM values
- Some data may be incomplete or estimated
- The system is designed to handle missing data gracefully

### Manual Process
This is not an automated system. Users must:
1. Select the client from the sidebar
2. Manually enter payment details
3. Choose which period the payment applies to

There are no reference numbers, automatic matching, or payment imports.

## Summary and Reporting

### Dashboard View
Shows the current state of a single client:
- Most recent payment information
- Current billable period and payment status
- Contract details and rates
- Estimated next payment

### Quarterly Summary
Displays all payments for a specific quarter:
- Groups clients by provider
- Shows payment details and variances
- Allows drilling down to individual payments
- Includes manual compliance checkboxes

### Annual Summary
Shows a full year's data:
- Four quarters of totals per client
- Provider-level aggregation
- No payment-level detail
- Year-over-year comparisons

### Provider Aggregation
In summary views, clients are grouped under their provider. This is purely organizational - there are no provider-level fees or calculations. It simply helps see all clients using the same provider together.

## What This System Is Not

This system does not:
- Automatically match or import payments
- Send alerts or notifications
- Track promises or partial payment schedules
- Enforce compliance or flag issues
- Calculate provider-level fees
- Handle multiple simultaneous contracts per client
- Adjust historical data when contracts change

It is a recording and reporting system that shows what happened and lets users interpret the results.


