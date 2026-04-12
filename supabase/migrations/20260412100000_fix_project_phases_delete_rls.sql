-- =====================================================
-- FIX: project_phases DELETE RLS was too restrictive
-- =====================================================
-- The original policy only allowed admins or the phase's `created_by`
-- to delete. That meant employees/managers who tried to delete a phase
-- they didn't personally create had their DELETE silently filtered by
-- RLS (no error raised, zero rows affected) and the UI reported success
-- while the phase remained.
--
-- New policy mirrors the UPDATE policy: any workspace member can delete.
-- This matches the expectation that workspace members manage project
-- state collaboratively.
-- =====================================================

DROP POLICY IF EXISTS "Admins or creators can delete phases" ON public.project_phases;

CREATE POLICY "Workspace members can delete phases" ON public.project_phases
FOR DELETE TO authenticated
USING (
  is_admin() OR is_workspace_member(workspace_id)
);

-- Also relax the phase_items delete policy the same way so CASCADE isn't
-- the only path and explicit deletes from app code work for workspace members.
DROP POLICY IF EXISTS "Admins or phase creators can delete items" ON public.phase_items;

CREATE POLICY "Workspace members can delete phase items" ON public.phase_items
FOR DELETE TO authenticated
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.project_phases pp
    WHERE pp.id = phase_items.phase_id
      AND is_workspace_member(pp.workspace_id)
  )
);
