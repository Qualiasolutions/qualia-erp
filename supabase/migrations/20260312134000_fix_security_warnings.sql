-- Fix remaining Supabase security linter issues

-- 1. portal_project_mappings: SECURITY DEFINER view — recreate as SECURITY INVOKER
--    This ensures the view respects the querying user's RLS, not the view creator's
DROP VIEW IF EXISTS public.portal_project_mappings;

CREATE VIEW public.portal_project_mappings
WITH (security_invoker = true)
AS
SELECT
  cp.id as mapping_id,
  cp.client_id as portal_client_id,
  cp.project_id,
  p.name as project_name,
  p.status as project_status,
  p.project_type,
  p.client_id as erp_client_id,
  pc.email as portal_client_email,
  c.name as erp_client_name,
  c.display_name as erp_company_name
FROM client_projects cp
JOIN projects p ON cp.project_id = p.id
JOIN profiles pc ON cp.client_id = pc.id
LEFT JOIN clients c ON p.client_id = c.id;

COMMENT ON VIEW public.portal_project_mappings IS
'Shows complete mapping between portal client accounts, projects, and ERP CRM clients';

-- 2. Fix mutable search_path on update_notification_preferences_updated_at
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
