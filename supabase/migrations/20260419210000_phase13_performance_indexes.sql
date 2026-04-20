-- Phase 13: Performance indexes for portal hot paths
--
-- client_projects is queried on every portal page; RLS policies also run
-- subqueries on (client_id = auth.uid()). Without individual indexes, every
-- query pays for a scan of the (client_id, project_id) unique constraint.
--
-- client_action_items is queried by client_id on the portal dashboard.
-- activity_log partial index covers the filter `is_client_visible = true`
-- used by the portal activity feed.

CREATE INDEX IF NOT EXISTS idx_client_projects_client_id
  ON public.client_projects (client_id);

CREATE INDEX IF NOT EXISTS idx_client_projects_project_id
  ON public.client_projects (project_id);

CREATE INDEX IF NOT EXISTS idx_client_action_items_client_id
  ON public.client_action_items (client_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_client_visible
  ON public.activity_log (project_id, created_at DESC)
  WHERE is_client_visible = true;
