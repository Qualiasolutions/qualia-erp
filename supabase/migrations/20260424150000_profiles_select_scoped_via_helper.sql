-- Re-introduce the scoped profiles SELECT policy, this time without the
-- recursion that took portal down. Key differences vs the first attempt:
--
--  1. Visibility logic lives in a SECURITY DEFINER function owned by
--     `postgres` (BYPASSRLS=true). Inner queries against workspace_members
--     and project_assignments bypass their own RLS → no profiles loop.
--  2. Admin-arm reads `user_role` from the JWT claim (populated by
--     custom_access_token_hook) instead of calling is_admin(), which itself
--     reads `profiles` and would recurse.
--
-- Visibility rules:
--  - self: id = auth.uid()
--  - admin (by JWT claim)
--  - co-workspace members (internal staff)
--  - client sees employees actively assigned to their projects
--  - employee sees clients of projects they are actively assigned to

CREATE OR REPLACE FUNCTION public.can_view_profile(target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    target_id = (SELECT auth.uid())
    OR ((SELECT auth.jwt()) ->> 'user_role') = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.workspace_members wm_self
      JOIN public.workspace_members wm_target
        ON wm_self.workspace_id = wm_target.workspace_id
      WHERE wm_self.profile_id = (SELECT auth.uid())
        AND wm_target.profile_id = target_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.client_projects cp
      JOIN public.project_assignments pa ON pa.project_id = cp.project_id
      WHERE cp.client_id = (SELECT auth.uid())
        AND pa.employee_id = target_id
        AND pa.removed_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_assignments pa
      JOIN public.client_projects cp ON cp.project_id = pa.project_id
      WHERE pa.employee_id = (SELECT auth.uid())
        AND pa.removed_at IS NULL
        AND cp.client_id = target_id
    );
$$;

REVOKE ALL ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;

CREATE POLICY "profiles_select_scoped"
ON public.profiles
FOR SELECT TO authenticated
USING (public.can_view_profile(id));
