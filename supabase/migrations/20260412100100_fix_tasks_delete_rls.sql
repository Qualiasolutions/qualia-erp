-- =====================================================
-- FIX: tasks DELETE RLS matches UPDATE (any workspace member)
-- =====================================================
-- Previously tasks DELETE was:
--   is_admin() OR (is_workspace_member AND creator_id = auth.uid()) OR is_workspace_admin(workspace_id)
--
-- That blocked employees like Hasan from deleting tasks they didn't
-- personally create (even though they could SELECT/UPDATE them). And
-- because the server action used .delete() without .select(), the RLS
-- filter silently returned 0 rows and the UI showed a false-success
-- toast.
--
-- New policy matches the tasks UPDATE policy: any workspace member can
-- delete tasks in their workspace.
-- =====================================================

DROP POLICY IF EXISTS "Users can delete tasks in their workspace" ON public.tasks;

CREATE POLICY "Users can delete tasks in their workspace" ON public.tasks
FOR DELETE TO authenticated
USING (
  is_admin() OR is_workspace_member(workspace_id)
);
