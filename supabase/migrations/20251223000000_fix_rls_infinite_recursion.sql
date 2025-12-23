-- Fix infinite recursion between issues and issue_assignees RLS policies
-- The issue: issues policy checks issue_assignees, which checks issues -> infinite loop

-- 1. Create a SECURITY DEFINER helper to check if user is assigned to an issue
-- This bypasses RLS when checking assignment, breaking the recursion
CREATE OR REPLACE FUNCTION public.is_issue_assignee(p_issue_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM issue_assignees
    WHERE issue_id = p_issue_id
    AND profile_id = (SELECT auth.uid())
  );
$$;

-- 2. Update the issues SELECT policy to use the new helper function
DROP POLICY IF EXISTS "Users can view issues" ON public.issues;

CREATE POLICY "Users can view issues" ON public.issues
FOR SELECT USING (
  is_admin()
  OR ((workspace_id IS NOT NULL) AND is_workspace_member(workspace_id))
  OR ((workspace_id IS NULL) AND (
    (creator_id = (SELECT auth.uid()))
    OR is_issue_assignee(id)
  ))
);

-- 3. Drop and recreate get_project_stats with SECURITY DEFINER
DROP FUNCTION IF EXISTS public.get_project_stats(uuid);

CREATE FUNCTION public.get_project_stats(p_workspace_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  status text,
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
  roadmap_progress numeric,
  metadata jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.name,
    p.status::text,
    p.start_date,
    p.target_date,
    p.project_group::text,
    p.project_type::text,
    p.deployment_platform::text,
    c.id AS client_id,
    COALESCE(c.display_name, c.name) AS client_name,
    pr.id AS lead_id,
    pr.full_name AS lead_full_name,
    pr.email AS lead_email,
    COUNT(i.id) AS total_issues,
    COUNT(CASE WHEN i.status = 'Done' THEN 1 END) AS done_issues,
    calculate_task_progress(p.id) AS roadmap_progress,
    p.metadata
  FROM
    public.projects p
    LEFT JOIN public.profiles pr ON p.lead_id = pr.id
    LEFT JOIN public.clients c ON p.client_id = c.id
    LEFT JOIN public.issues i ON p.id = i.project_id
  WHERE
    (p_workspace_id IS NULL OR p.workspace_id = p_workspace_id)
  GROUP BY
    p.id, p.name, p.status, p.start_date, p.target_date, p.project_group, p.project_type,
    p.deployment_platform, p.metadata, c.id, c.display_name, c.name, pr.id, pr.full_name, pr.email
  ORDER BY
    p.created_at DESC;
$$;
