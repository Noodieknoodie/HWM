-- sql-init/fix-quarterly-notes-n1.sql
-- Fix for N+1 query problem in quarterly notes
-- This view returns ALL clients' quarterly notes for a given period in one query

CREATE OR ALTER VIEW quarterly_notes_batch AS
SELECT 
    c.client_id,
    c.display_name,
    qn.year,
    qn.quarter,
    qn.notes,
    qn.last_updated,
    qn.updated_by
FROM clients c
LEFT JOIN quarterly_notes qn 
    ON c.client_id = qn.client_id
WHERE qn.year IS NOT NULL 
  AND qn.quarter IS NOT NULL;

-- Also create a view that includes ALL clients even without notes
CREATE OR ALTER VIEW quarterly_notes_all_clients AS
SELECT 
    c.client_id,
    c.display_name,
    pp.year,
    pp.period as quarter,
    qn.notes,
    qn.last_updated,
    qn.updated_by,
    CASE 
        WHEN qn.notes IS NOT NULL THEN 1 
        ELSE 0 
    END as has_notes
FROM clients c
CROSS JOIN (
    SELECT DISTINCT year, period 
    FROM payment_periods 
    WHERE period_type = 'quarterly'
) pp
LEFT JOIN quarterly_notes qn 
    ON c.client_id = qn.client_id 
    AND qn.year = pp.year 
    AND qn.quarter = pp.period;