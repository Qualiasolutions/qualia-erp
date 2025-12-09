-- =====================================================
-- MIGRATION: Add start_date, project_type, client info to get_project_stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_project_stats(p_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  status project_status,
  start_date date,
  target_date date,
  project_group text,
  project_type text,
  deployment_platform text,
  client_id uuid,
  client_name text,
  lead_id uuid,
  lead_full_name text,
  lead_email text,
  total_issues bigint,
  done_issues bigint,
  roadmap_progress integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.status,
    p.start_date,
    p.target_date,
    p.project_group::text,
    p.project_type::text,
    p.deployment_platform::text,
    c.id AS client_id,
    c.name AS client_name,
    pr.id AS lead_id,
    pr.full_name AS lead_full_name,
    pr.email AS lead_email,
    COUNT(i.id) AS total_issues,
    COUNT(CASE WHEN i.status = 'Done' THEN 1 END) AS done_issues,
    calculate_roadmap_progress(p.id) AS roadmap_progress
  FROM
    public.projects p
    LEFT JOIN public.profiles pr ON p.lead_id = pr.id
    LEFT JOIN public.clients c ON p.client_id = c.id
    LEFT JOIN public.issues i ON p.id = i.project_id
  WHERE
    (p_workspace_id IS NULL OR p.workspace_id = p_workspace_id)
  GROUP BY
    p.id, p.name, p.status, p.start_date, p.target_date, p.project_group,
    p.project_type, p.deployment_platform, c.id, c.name, pr.id, pr.full_name, pr.email
  ORDER BY
    p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
