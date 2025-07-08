-- docs/sql-fixes/create_sidebar_clients_view.sql
-- Creates the sidebar_clients_view for the client navigation sidebar
-- Replaces clients_by_provider_view with a simpler, focused view

CREATE VIEW [dbo].[sidebar_clients_view] AS
SELECT 
    c.client_id,
    c.display_name,
    ct.provider_name,
    -- Simplified compliance status - just green or yellow
    CASE 
        WHEN cps.payment_status = 'Paid' THEN 'green'
        ELSE 'yellow'
    END AS compliance_status
FROM clients c
LEFT JOIN contracts ct ON c.client_id = ct.client_id
LEFT JOIN client_payment_status cps ON c.client_id = cps.client_id
ORDER BY c.display_name;