-- Feature request assignment.
--
-- Adds an `assigned_to` column to client_feature_requests so staff can pick
-- up requests by name. Nullable (an unassigned request still works exactly
-- like today). Index on the column for the "show me what's assigned to X"
-- and "show unassigned" kanban filters.
--
-- RLS: extend the existing SELECT policy so the assignee (an employee on
-- the request's project) can read it directly even if our app-layer
-- filter didn't already include it via project assignment. Admins keep
-- their unconditional read via is_admin(). Clients are unchanged — they
-- still only see their own requests.

ALTER TABLE public.client_feature_requests
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS client_feature_requests_assigned_to_idx
  ON public.client_feature_requests (assigned_to)
  WHERE assigned_to IS NOT NULL;

-- Extend SELECT — admin OR client (own) OR assignee. Re-create rather
-- than ALTER POLICY since Postgres won't let us OR in a new clause
-- declaratively.
DROP POLICY IF EXISTS "feature_requests_select" ON public.client_feature_requests;

CREATE POLICY "feature_requests_select"
ON public.client_feature_requests
FOR SELECT TO authenticated
USING (
  is_admin()
  OR client_id = (SELECT auth.uid())
  OR assigned_to = (SELECT auth.uid())
);

-- UPDATE policy intentionally not extended. Assignees who need to change
-- status route through the server action `updateFeatureRequest`, which
-- already gates by `isUserAdmin`. We deliberately keep the RLS surface
-- minimal here: an assignee with a stolen session shouldn't be able to
-- mutate a request directly via PostgREST.

COMMENT ON COLUMN public.client_feature_requests.assigned_to IS
  'Staff member this request is assigned to (admin or employee). NULL = unassigned. Set/cleared by admins via assignFeatureRequest().';
