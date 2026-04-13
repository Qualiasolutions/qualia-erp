-- Baseline migration for task_attachments
--
-- Exists in production but CREATE TABLE / RLS were never committed. Captured
-- from live schema 2026-04-13. Idempotent — safe to run against an environment
-- that already has the table.
--
-- Related: OPTIMIZE.md finding C3.

CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Lookup index used by getTaskAttachments.
CREATE INDEX IF NOT EXISTS task_attachments_task_id_idx
  ON public.task_attachments (task_id);

-- Workspace scope index used by the workspace-scoped RLS check.
CREATE INDEX IF NOT EXISTS task_attachments_workspace_id_idx
  ON public.task_attachments (workspace_id);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments FORCE ROW LEVEL SECURITY;

-- Members of the workspace can read attachments in that workspace. Tightened
-- beyond "any authenticated user" — mirrors the canAccessTask pattern that
-- the server action should also enforce for defense in depth.
DROP POLICY IF EXISTS "task_attachments_select" ON public.task_attachments;
CREATE POLICY "task_attachments_select"
  ON public.task_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = task_attachments.workspace_id
        AND wm.profile_id = (SELECT auth.uid())
    )
  );

-- Only workspace members can upload, and only as themselves.
DROP POLICY IF EXISTS "task_attachments_insert" ON public.task_attachments;
CREATE POLICY "task_attachments_insert"
  ON public.task_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploader_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = task_attachments.workspace_id
        AND wm.profile_id = (SELECT auth.uid())
    )
  );

-- Only the uploader or a workspace admin can delete.
DROP POLICY IF EXISTS "task_attachments_delete" ON public.task_attachments;
CREATE POLICY "task_attachments_delete"
  ON public.task_attachments
  FOR DELETE
  TO authenticated
  USING (
    uploader_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'manager')
    )
  );
