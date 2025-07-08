-- docs/sql-fixes/fix_available_payment_periods_view.sql

-- Fix: Update available_payment_periods view to support new clients
-- Issue: INNER JOIN to payments excludes clients with no payment history
-- Solution: Use LEFT JOIN and fall back to contract start date or IMA signed date

DROP VIEW IF EXISTS [dbo].[available_payment_periods];
GO

CREATE VIEW [dbo].[available_payment_periods] AS
SELECT 
    c.client_id,
    pp.year,
    pp.period,
    CASE 
        WHEN ct.payment_schedule = 'monthly' THEN pp.period_name
        WHEN ct.payment_schedule = 'quarterly' THEN 'Q' + CAST(pp.period AS VARCHAR) + ' ' + CAST(pp.year AS VARCHAR)
    END as display_text,
    CASE WHEN p.payment_id IS NOT NULL THEN 1 ELSE 0 END as is_paid
FROM clients c
JOIN contracts ct ON c.client_id = ct.client_id
JOIN payment_periods pp ON pp.period_type = ct.payment_schedule
LEFT JOIN payments p ON p.client_id = c.client_id 
    AND p.applied_year = pp.year 
    AND p.applied_period = pp.period
    AND p.applied_period_type = pp.period_type
-- Changed from INNER JOIN to LEFT JOIN to include clients with no payments
LEFT JOIN (
    SELECT client_id, 
           MIN(DATEFROMPARTS(applied_year, applied_period, 1)) as first_payment_date
    FROM payments
    GROUP BY client_id
) first_payment ON c.client_id = first_payment.client_id
WHERE pp.end_date <= GETDATE()
  -- Use contract start date, IMA signed date, or beginning of current year as fallback
  AND pp.start_date >= COALESCE(
      first_payment.first_payment_date,
      ct.contract_start_date,
      c.ima_signed_date,
      DATEFROMPARTS(YEAR(GETDATE()), 1, 1)
  );
GO