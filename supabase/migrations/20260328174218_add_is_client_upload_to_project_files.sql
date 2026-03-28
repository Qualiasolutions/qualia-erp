-- Add is_client_upload column to project_files
ALTER TABLE project_files
  ADD COLUMN IF NOT EXISTS is_client_upload boolean NOT NULL DEFAULT false;

-- Add RLS INSERT policy for clients to upload files to their projects
-- Clients can only insert rows where:
--   - is_client_upload = true
--   - is_client_visible = true
--   - project_id is one the authenticated user has access to via client_projects
CREATE POLICY "Clients can insert their own uploads"
  ON project_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_client_upload = true
    AND is_client_visible = true
    AND EXISTS (
      SELECT 1 FROM client_projects
      WHERE client_projects.client_id = auth.uid()
        AND client_projects.project_id = project_files.project_id
    )
  );
