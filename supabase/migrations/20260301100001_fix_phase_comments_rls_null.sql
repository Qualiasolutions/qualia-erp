-- Fix: phase_comments client SELECT policy doesn't match NULL is_internal values
-- The original policy was: is_internal = false AND is_client_of_project(project_id)
-- But is_internal can be NULL, which would hide comments from clients.
-- Server action already handles this with OR is_internal IS NULL, but RLS must match.

DROP POLICY IF EXISTS "Clients view non-internal phase comments" ON public.phase_comments;

CREATE POLICY "Clients view non-internal phase comments" ON public.phase_comments
  FOR SELECT USING (
    (is_internal = false OR is_internal IS NULL)
    AND is_client_of_project(project_id)
  );
