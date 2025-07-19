SQL DEPENDENCY CHAIN - HWM 401k Database

LEVEL 0 - Base Tables (No Dependencies)
├── clients_all
├── variance_thresholds  
├── test_results
└── payment_periods

LEVEL 1 - Tables with FKs
├── client_quarter_markers
│   └── → clients_all
├── contacts
│   └── → clients_all
├── contracts
│   └── → clients_all (CASCADE DELETE)
├── quarterly_notes
│   └── → clients_all
└── payments
    ├── → clients_all
    └── → contracts

LEVEL 2 - Base Views & Functions
├── clients (VIEW)
│   └── → clients_all
├── calculate_expected_fee (FUNCTION)
│   └── → payments
├── get_variance_status (FUNCTION)
│   └── → variance_thresholds
└── test_summary (VIEW)
    └── → test_results

LEVEL 3 - First-Order Views
├── payment_status_base
│   ├── → clients
│   ├── → contracts
│   └── → payments
├── client_period_matrix
│   ├── → clients
│   ├── → contracts
│   └── → payment_periods
└── payment_history_view
    ├── → payments
    ├── → contracts
    ├── → calculate_expected_fee()
    └── → get_variance_status()

LEVEL 4 - Complex Views
├── dashboard_view
│   ├── → clients
│   ├── → contracts
│   ├── → contacts
│   └── → payments (LastPayment CTE)
├── sidebar_clients_view
│   ├── → clients
│   ├── → contracts
│   └── → payment_status_base
├── payment_form_defaults_view
│   ├── → clients
│   ├── → contracts
│   ├── → payment_status_base
│   └── → payments
├── payment_form_periods_view
│   ├── → clients
│   ├── → contracts
│   ├── → payment_periods
│   └── → payments
└── comprehensive_payment_summary
    ├── → client_period_matrix
    ├── → payments
    ├── → calculate_expected_fee()
    └── → get_variance_status()

LEVEL 5 - Aggregation Views
├── quarterly_summary_aggregated
│   ├── → comprehensive_payment_summary
│   └── → client_quarter_markers
└── yearly_summaries_view
    ├── → quarterly_summary_aggregated
    └── → get_variance_status()

LEVEL 6 - Enhanced Views
├── quarterly_summary_enhanced
│   ├── → quarterly_summary_aggregated
│   └── → quarterly_notes
├── annual_summary_by_client
│   └── → quarterly_summary_aggregated
└── provider_quarterly_summary
    └── → quarterly_summary_aggregated

LEVEL 7 - Provider Summary
└── provider_annual_summary
    └── → annual_summary_by_client

LEVEL 8 - Final Presentation Views
├── quarterly_page_data
│   ├── → quarterly_summary_enhanced
│   ├── → provider_quarterly_summary
│   └── → client_quarter_markers
└── annual_page_data
    ├── → annual_summary_by_client
    └── → provider_annual_summary

STORED PROCEDURES
└── sp_test_summary
    └── → test_summary

---

CRITICAL DEPENDENCY PATHS:

1. Payment Variance Chain:
   variance_thresholds → get_variance_status() → comprehensive_payment_summary → quarterly_summary_aggregated → quarterly_page_data

2. Client Hierarchy:
   clients_all → clients → client_period_matrix → comprehensive_payment_summary → quarterly_summary_aggregated

3. Payment Processing:
   payments → calculate_expected_fee() → comprehensive_payment_summary → quarterly_summary_aggregated → annual_summary_by_client

4. Posting Status:
   client_quarter_markers → quarterly_summary_aggregated → quarterly_summary_enhanced → quarterly_page_data

---

DROP ORDER (reverse of creation):
1. Drop stored procedures first
2. Drop Level 8 views
3. Work backwards to Level 0
4. Drop functions
5. Drop tables with FKs
6. Drop base tables

CREATE ORDER:
1. Base tables (Level 0)
2. FK tables (Level 1)
3. Functions
4. Views in level order (2→8)
5. Stored procedures
