-- Fix projects visibility: all workspace members should see all projects
-- This drops and recreates the SELECT policy to be simpler and more permissive

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view projects" ON projects;

-- Create new policy: workspace members see ALL projects in their workspace
CREATE POLICY "Users can view projects" ON projects FOR SELECT
TO authenticated
USING (
  -- Admins see everything
  is_admin()
  OR
  -- Workspace members see all projects in their workspace
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  OR
  -- Fallback: projects without workspace_id visible to leads/team members
  (workspace_id IS NULL AND (
    lead_id = (SELECT auth.uid()) OR
    (team_id IS NOT NULL AND is_team_member(team_id))
  ))
);

-- Also fix issues visibility - members should see all issues in workspace projects
DROP POLICY IF EXISTS "Users can view issues" ON issues;

CREATE POLICY "Users can view issues" ON issues FOR SELECT
TO authenticated
USING (
  -- Admins see everything
  is_admin()
  OR
  -- Workspace members see all issues in their workspace
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  OR
  -- Fallback for issues without workspace
  (workspace_id IS NULL AND (
    creator_id = (SELECT auth.uid()) OR
    assignee_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM issue_assignees
      WHERE issue_assignees.issue_id = issues.id
      AND issue_assignees.profile_id = (SELECT auth.uid())
    )
  ))
);

-- Add comment
COMMENT ON POLICY "Users can view projects" ON projects IS 'All workspace members can see all projects in their workspace';
COMMENT ON POLICY "Users can view issues" ON issues IS 'All workspace members can see all issues in their workspace';
