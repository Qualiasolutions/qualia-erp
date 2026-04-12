-- =====================================================
-- FIX: project_phases INSERT + UPDATE RLS for workspace members
-- =====================================================
-- The surviving INSERT/UPDATE policies on project_phases only permit
-- the project's lead_id or admins. That blocks employees (like Hasan)
-- from creating or renaming phases on projects they're assigned to.
--
-- Add permissive policies that allow any workspace member of the phase's
-- workspace to insert and update. These OR with the existing policies,
-- so admins / project leads still work unchanged.
-- =====================================================

DROP POLICY IF EXISTS "Workspace members can insert phases" ON public.project_phases;

CREATE POLICY "Workspace members can insert phases" ON public.project_phases
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR is_workspace_member(workspace_id)
);

DROP POLICY IF EXISTS "Workspace members can update phases" ON public.project_phases;

CREATE POLICY "Workspace members can update phases" ON public.project_phases
FOR UPDATE TO authenticated
USING (
  is_admin() OR is_workspace_member(workspace_id)
)
WITH CHECK (
  is_admin() OR is_workspace_member(workspace_id)
);
