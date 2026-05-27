-- Shared client requests on a project.
--
-- Today, the `feature_requests_select` policy lets a client read only the
-- rows they personally filed (client_id = auth.uid()). When a project has
-- multiple client-side stakeholders linked through `client_projects` (e.g.
-- Kim + Alexandria both on Boss Brainz), each one is invisible to the
-- other — they end up filing duplicate requests because they can't see
-- the team's existing work.
--
-- Extend the SELECT policy so any client with a `client_projects` row
-- for the request's project can read it, regardless of who filed it.
-- The original `client_id` (creator) on each row is unchanged — the UI
-- still attributes the request to the person who submitted it.
--
-- Scope:
--   * Read-only relaxation. UPDATE stays creator-only, DELETE stays
--     admin-only. We are NOT letting teammates edit each other's
--     requests, only see them.
--   * `request_comments_select` already cascades through `client_projects`
--     (see 20260422150000_advisors_cleanup.sql lines 187-207), so no
--     comment-policy change is needed — comments on shared requests
--     automatically become visible to the shared client set.
--
-- Idempotent: DROP IF EXISTS + CREATE so re-running is safe.

DROP POLICY IF EXISTS "feature_requests_select" ON public.client_feature_requests;

CREATE POLICY "feature_requests_select"
ON public.client_feature_requests
FOR SELECT TO authenticated
USING (
  is_admin()
  OR client_id = (SELECT auth.uid())
  OR assigned_to = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.client_id = (SELECT auth.uid())
      AND cp.project_id = client_feature_requests.project_id
  )
);

COMMENT ON POLICY "feature_requests_select" ON public.client_feature_requests IS
  'Admin OR creator OR assignee OR any client linked to the request''s project via client_projects. Read-only sharing; UPDATE/DELETE remain restrictive.';
