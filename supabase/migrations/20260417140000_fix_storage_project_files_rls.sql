-- Fix broken storage RLS policies for project-files bucket.
-- Prior policies used storage.foldername(p.name) on the projects table,
-- which returns [] for any project whose name doesn't contain a slash —
-- blocking ALL uploads / reads / deletes. Replace with checks on the
-- storage object's own name (the upload path: `<projectId>/<timestamp>_<file>`).

DROP POLICY IF EXISTS "Workspace members can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can read project files" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can delete project files" ON storage.objects;

-- INSERT: any authenticated workspace member may upload to a path whose
-- first folder matches a project.id the user has workspace access to.
CREATE POLICY "Workspace members can upload project files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-files'
    AND EXISTS (
      SELECT 1
      FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.profile_id = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = p.id::text
    )
  );

-- SELECT: workspace members may read files whose path's first folder is a
-- project in their workspace.
CREATE POLICY "Workspace members can read project files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-files'
    AND EXISTS (
      SELECT 1
      FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.profile_id = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = p.id::text
    )
  );

-- DELETE: same shape.
CREATE POLICY "Workspace members can delete project files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-files'
    AND EXISTS (
      SELECT 1
      FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.profile_id = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = p.id::text
    )
  );
