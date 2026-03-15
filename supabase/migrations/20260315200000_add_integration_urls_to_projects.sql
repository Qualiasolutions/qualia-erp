-- Add integration URLs to projects table
-- These are updated when provisioning succeeds so the project record
-- carries the canonical github/vercel URLs without needing to join project_provisioning

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS github_repo_url TEXT,
  ADD COLUMN IF NOT EXISTS vercel_project_url TEXT;

COMMENT ON COLUMN projects.github_repo_url IS 'GitHub repository URL after provisioning';
COMMENT ON COLUMN projects.vercel_project_url IS 'Vercel project dashboard URL after provisioning';
