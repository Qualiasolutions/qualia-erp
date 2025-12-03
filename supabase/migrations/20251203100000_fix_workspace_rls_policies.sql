-- =====================================================
-- MIGRATION: Fix Workspace-Scoped RLS Policies
-- =====================================================
-- This migration updates RLS policies to properly scope
-- data access by workspace. Users should only see data
-- within workspaces they are members of.
-- =====================================================

-- =====================
-- ISSUES POLICIES (Update to include workspace check)
-- =====================
DROP POLICY IF EXISTS "Users can view issues" ON issues;
DROP POLICY IF EXISTS "Users can insert issues" ON issues;
DROP POLICY IF EXISTS "Users can update issues" ON issues;
DROP POLICY IF EXISTS "Admins can delete issues" ON issues;

-- Admins see all, users see issues in their workspaces
CREATE POLICY "Users can view issues" ON issues FOR SELECT
TO authenticated
USING (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id)) OR
  creator_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM issue_assignees
    WHERE issue_assignees.issue_id = issues.id
    AND issue_assignees.profile_id = (SELECT auth.uid())
  )
);

-- Users can insert issues in their workspaces
CREATE POLICY "Users can insert issues" ON issues FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
);

-- Users can update issues in their workspaces that they're assigned to, created, or team member of
CREATE POLICY "Users can update issues" ON issues FOR UPDATE
TO authenticated
USING (
  is_admin() OR
  (
    (workspace_id IS NULL OR is_workspace_member(workspace_id)) AND
    (
      creator_id = (SELECT auth.uid()) OR
      (team_id IS NOT NULL AND is_team_member(team_id)) OR
      EXISTS (
        SELECT 1 FROM issue_assignees
        WHERE issue_assignees.issue_id = issues.id
        AND issue_assignees.profile_id = (SELECT auth.uid())
      )
    )
  )
);

-- Only admins or creators can delete issues
CREATE POLICY "Users can delete issues" ON issues FOR DELETE
TO authenticated
USING (
  is_admin() OR creator_id = (SELECT auth.uid())
);

-- =====================
-- PROJECTS POLICIES (Update to include workspace check)
-- =====================
DROP POLICY IF EXISTS "Users can view projects" ON projects;
DROP POLICY IF EXISTS "Users can insert projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;

-- Admins see all, users see projects in their workspaces
CREATE POLICY "Users can view projects" ON projects FOR SELECT
TO authenticated
USING (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id)) OR
  lead_id = (SELECT auth.uid()) OR
  (team_id IS NOT NULL AND is_team_member(team_id))
);

-- Users can insert projects in their workspaces
CREATE POLICY "Users can insert projects" ON projects FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
);

-- Users can update projects in their workspaces that they lead or are team member of
CREATE POLICY "Users can update projects" ON projects FOR UPDATE
TO authenticated
USING (
  is_admin() OR
  (
    (workspace_id IS NULL OR is_workspace_member(workspace_id)) AND
    (
      lead_id = (SELECT auth.uid()) OR
      (team_id IS NOT NULL AND is_team_member(team_id))
    )
  )
);

-- Only admins or leads can delete projects
CREATE POLICY "Users can delete projects" ON projects FOR DELETE
TO authenticated
USING (
  is_admin() OR lead_id = (SELECT auth.uid())
);

-- =====================
-- TEAMS POLICIES (Update to include workspace check)
-- =====================
DROP POLICY IF EXISTS "Users can view teams" ON teams;
DROP POLICY IF EXISTS "Admins can insert teams" ON teams;
DROP POLICY IF EXISTS "Users can update teams" ON teams;
DROP POLICY IF EXISTS "Admins can delete teams" ON teams;

-- Users see teams in their workspaces
CREATE POLICY "Users can view teams" ON teams FOR SELECT
TO authenticated
USING (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id)) OR
  is_team_member(id)
);

-- Workspace admins or system admins can create teams
CREATE POLICY "Admins can insert teams" ON teams FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id))
);

-- Team members can update their team, workspace admins can update any in workspace
CREATE POLICY "Users can update teams" ON teams FOR UPDATE
TO authenticated
USING (
  is_admin() OR
  is_team_member(id) OR
  (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id))
);

-- Only system admins or workspace admins can delete teams
CREATE POLICY "Admins can delete teams" ON teams FOR DELETE
TO authenticated
USING (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id))
);

-- =====================
-- CLIENTS POLICIES (Update to include workspace check)
-- =====================
DROP POLICY IF EXISTS "Users can view clients" ON clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON clients;
DROP POLICY IF EXISTS "Admins can update clients" ON clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON clients;

-- Users can view clients in their workspaces
CREATE POLICY "Users can view clients" ON clients FOR SELECT
TO authenticated
USING (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
);

-- Workspace members can create clients
CREATE POLICY "Users can insert clients" ON clients FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
);

-- Workspace members can update clients in their workspace
CREATE POLICY "Users can update clients" ON clients FOR UPDATE
TO authenticated
USING (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
);

-- Only admins or workspace admins can delete clients
CREATE POLICY "Admins can delete clients" ON clients FOR DELETE
TO authenticated
USING (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id))
);

-- =====================
-- COMMENTS POLICIES (Update to follow issue workspace scoping)
-- =====================
DROP POLICY IF EXISTS "Users can view comments" ON comments;
DROP POLICY IF EXISTS "Users can insert comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete comments" ON comments;

-- Users can view comments on issues they can access
CREATE POLICY "Users can view comments" ON comments FOR SELECT
TO authenticated
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM issues
    WHERE issues.id = comments.issue_id
    AND (
      (issues.workspace_id IS NOT NULL AND is_workspace_member(issues.workspace_id)) OR
      issues.creator_id = (SELECT auth.uid()) OR
      EXISTS (
        SELECT 1 FROM issue_assignees
        WHERE issue_assignees.issue_id = issues.id
        AND issue_assignees.profile_id = (SELECT auth.uid())
      )
    )
  )
);

-- Users can insert comments on issues they can access
CREATE POLICY "Users can insert comments" ON comments FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM issues
    WHERE issues.id = issue_id
    AND (
      (issues.workspace_id IS NOT NULL AND is_workspace_member(issues.workspace_id)) OR
      issues.creator_id = (SELECT auth.uid()) OR
      EXISTS (
        SELECT 1 FROM issue_assignees ia
        WHERE ia.issue_id = issues.id
        AND ia.profile_id = (SELECT auth.uid())
      )
    )
  )
);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE
TO authenticated
USING (
  is_admin() OR user_id = (SELECT auth.uid())
);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete comments" ON comments FOR DELETE
TO authenticated
USING (
  is_admin() OR user_id = (SELECT auth.uid())
);

-- =====================
-- ACTIVITIES POLICIES (Add workspace scoping)
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view all activities" ON activities;
DROP POLICY IF EXISTS "Users can view activities" ON activities;
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON activities;
DROP POLICY IF EXISTS "Users can insert activities" ON activities;

-- Users can view activities in their workspaces
CREATE POLICY "Users can view activities" ON activities FOR SELECT
TO authenticated
USING (
  is_admin() OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id)) OR
  actor_id = (SELECT auth.uid())
);

-- Users can create activities in their workspaces
CREATE POLICY "Users can insert activities" ON activities FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR
  actor_id = (SELECT auth.uid()) OR
  (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
);

-- =====================
-- CLIENT_CONTACTS POLICIES (Add workspace scoping via client)
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view client contacts" ON client_contacts;
DROP POLICY IF EXISTS "Users can view client contacts" ON client_contacts;

-- Users can view contacts for clients they can access
CREATE POLICY "Users can view client contacts" ON client_contacts FOR SELECT
TO authenticated
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = client_contacts.client_id
    AND (clients.workspace_id IS NOT NULL AND is_workspace_member(clients.workspace_id))
  )
);

-- Users can manage contacts for clients in their workspace
CREATE POLICY "Users can insert client contacts" ON client_contacts FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = client_id
    AND (clients.workspace_id IS NOT NULL AND is_workspace_member(clients.workspace_id))
  )
);

CREATE POLICY "Users can update client contacts" ON client_contacts FOR UPDATE
TO authenticated
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = client_contacts.client_id
    AND (clients.workspace_id IS NOT NULL AND is_workspace_member(clients.workspace_id))
  )
);

CREATE POLICY "Users can delete client contacts" ON client_contacts FOR DELETE
TO authenticated
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = client_contacts.client_id
    AND (clients.workspace_id IS NOT NULL AND is_workspace_member(clients.workspace_id))
  )
);

-- =====================
-- CLIENT_ACTIVITIES POLICIES (Add workspace scoping via client)
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view client activities" ON client_activities;
DROP POLICY IF EXISTS "Users can view client activities" ON client_activities;

-- Users can view activities for clients they can access
CREATE POLICY "Users can view client activities" ON client_activities FOR SELECT
TO authenticated
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = client_activities.client_id
    AND (clients.workspace_id IS NOT NULL AND is_workspace_member(clients.workspace_id))
  )
);

-- Users can manage activities for clients in their workspace
CREATE POLICY "Users can insert client activities" ON client_activities FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = client_id
    AND (clients.workspace_id IS NOT NULL AND is_workspace_member(clients.workspace_id))
  )
);

-- =====================================================
-- VERIFICATION QUERY (run after migration to verify)
-- =====================================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
-- =====================================================
