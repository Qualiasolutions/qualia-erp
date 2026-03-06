-- ============================================================================
-- ERP-Portal Integration: Links projects to CRM clients and creates mapping view
-- ============================================================================
-- Phase: 13-erp-portal-integration
-- Plan: 01
-- Description: Enable bidirectional navigation between ERP project management
--              and client portal by adding integration helpers and views.
-- ============================================================================

-- Add index on client_id for efficient lookup (column already exists)
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id);

-- Add helper view for portal-ERP project mapping
CREATE OR REPLACE VIEW portal_project_mappings AS
SELECT
  cp.id as mapping_id,
  cp.client_id as portal_client_id,
  cp.project_id,
  p.name as project_name,
  p.status as project_status,
  p.client_id as erp_client_id,
  pc.full_name as portal_client_name,
  pc.email as portal_client_email,
  c.name as erp_client_name,
  c.display_name as erp_company_name
FROM client_projects cp
JOIN projects p ON cp.project_id = p.id
JOIN profiles pc ON cp.client_id = pc.id
LEFT JOIN clients c ON p.client_id = c.id;

COMMENT ON VIEW portal_project_mappings IS
'Shows complete mapping between portal client accounts, projects, and ERP CRM clients';
