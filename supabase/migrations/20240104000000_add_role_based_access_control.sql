-- Role-based access control: Admins see everything, employees see only assigned items

-- Update info@qualiasolutions.net to admin role
UPDATE profiles
SET role = 'admin'
WHERE email = 'info@qualiasolutions.net';

-- Create a helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role = 'admin'
  );
$$;

-- Create a helper function to check if user is member of a team
CREATE OR REPLACE FUNCTION is_team_member(team_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = team_uuid
    AND profile_id = (SELECT auth.uid())
  );
$$;

-- =====================
-- ISSUES POLICIES
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view all issues" ON issues;
DROP POLICY IF EXISTS "Authenticated users can insert issues" ON issues;
DROP POLICY IF EXISTS "Authenticated users can update issues" ON issues;
DROP POLICY IF EXISTS "Authenticated users can delete issues" ON issues;

-- Admins see all, employees see assigned/created/team issues
CREATE POLICY "Users can view issues" ON issues FOR SELECT USING (
  is_admin() OR
  assignee_id = (SELECT auth.uid()) OR
  creator_id = (SELECT auth.uid()) OR
  (team_id IS NOT NULL AND is_team_member(team_id))
);

-- Admins can insert any, employees can insert
CREATE POLICY "Users can insert issues" ON issues FOR INSERT WITH CHECK (
  is_admin() OR true
);

-- Admins can update all, employees only their assigned/created/team issues
CREATE POLICY "Users can update issues" ON issues FOR UPDATE USING (
  is_admin() OR
  assignee_id = (SELECT auth.uid()) OR
  creator_id = (SELECT auth.uid()) OR
  (team_id IS NOT NULL AND is_team_member(team_id))
);

-- Only admins can delete
CREATE POLICY "Admins can delete issues" ON issues FOR DELETE USING (
  is_admin()
);

-- =====================
-- PROJECTS POLICIES
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view all projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON projects;

-- Admins see all, employees see led/team projects
CREATE POLICY "Users can view projects" ON projects FOR SELECT USING (
  is_admin() OR
  lead_id = (SELECT auth.uid()) OR
  (team_id IS NOT NULL AND is_team_member(team_id))
);

-- Admins can insert any, employees can insert
CREATE POLICY "Users can insert projects" ON projects FOR INSERT WITH CHECK (
  is_admin() OR true
);

-- Admins can update all, employees only their led/team projects
CREATE POLICY "Users can update projects" ON projects FOR UPDATE USING (
  is_admin() OR
  lead_id = (SELECT auth.uid()) OR
  (team_id IS NOT NULL AND is_team_member(team_id))
);

-- Only admins can delete
CREATE POLICY "Admins can delete projects" ON projects FOR DELETE USING (
  is_admin()
);

-- =====================
-- TEAMS POLICIES
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view all teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can insert teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can update teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can delete teams" ON teams;

-- Admins see all, employees see their teams
CREATE POLICY "Users can view teams" ON teams FOR SELECT USING (
  is_admin() OR is_team_member(id)
);

-- Only admins can create teams
CREATE POLICY "Admins can insert teams" ON teams FOR INSERT WITH CHECK (
  is_admin()
);

-- Admins can update all, employees only their teams
CREATE POLICY "Users can update teams" ON teams FOR UPDATE USING (
  is_admin() OR is_team_member(id)
);

-- Only admins can delete
CREATE POLICY "Admins can delete teams" ON teams FOR DELETE USING (
  is_admin()
);

-- =====================
-- TEAM_MEMBERS POLICIES
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view team members" ON team_members;
DROP POLICY IF EXISTS "Authenticated users can insert team members" ON team_members;
DROP POLICY IF EXISTS "Authenticated users can delete team members" ON team_members;

-- Admins see all, employees see members of their teams
CREATE POLICY "Users can view team members" ON team_members FOR SELECT USING (
  is_admin() OR is_team_member(team_id)
);

-- Only admins can manage team membership
CREATE POLICY "Admins can insert team members" ON team_members FOR INSERT WITH CHECK (
  is_admin()
);

CREATE POLICY "Admins can delete team members" ON team_members FOR DELETE USING (
  is_admin()
);

-- =====================
-- CLIENTS POLICIES
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view all clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON clients;

-- Everyone can view clients (for dropdowns)
CREATE POLICY "Users can view clients" ON clients FOR SELECT USING (true);

-- Only admins can manage clients
CREATE POLICY "Admins can insert clients" ON clients FOR INSERT WITH CHECK (
  is_admin()
);

CREATE POLICY "Admins can update clients" ON clients FOR UPDATE USING (
  is_admin()
);

CREATE POLICY "Admins can delete clients" ON clients FOR DELETE USING (
  is_admin()
);

-- =====================
-- COMMENTS POLICIES
-- =====================
DROP POLICY IF EXISTS "Authenticated users can view all comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can update comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can delete comments" ON comments;

-- Users can view comments on issues they can access
CREATE POLICY "Users can view comments" ON comments FOR SELECT USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM issues
    WHERE issues.id = comments.issue_id
    AND (
      issues.assignee_id = (SELECT auth.uid()) OR
      issues.creator_id = (SELECT auth.uid()) OR
      (issues.team_id IS NOT NULL AND is_team_member(issues.team_id))
    )
  )
);

-- Users can insert comments on issues they can access
CREATE POLICY "Users can insert comments" ON comments FOR INSERT WITH CHECK (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM issues
    WHERE issues.id = issue_id
    AND (
      issues.assignee_id = (SELECT auth.uid()) OR
      issues.creator_id = (SELECT auth.uid()) OR
      (issues.team_id IS NOT NULL AND is_team_member(issues.team_id))
    )
  )
);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (
  is_admin() OR user_id = (SELECT auth.uid())
);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete comments" ON comments FOR DELETE USING (
  is_admin() OR user_id = (SELECT auth.uid())
);
