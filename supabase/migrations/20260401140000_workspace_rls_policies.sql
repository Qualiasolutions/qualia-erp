-- =====================================================
-- MIGRATION: Workspace & Workspace Members RLS Policies
-- =====================================================
-- Adds RLS policies to workspaces and workspace_members
-- tables which previously had none, causing visibility
-- issues after workspace creation.
-- =====================================================

-- Enable RLS on workspaces and workspace_members if not already enabled
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- =====================
-- WORKSPACES POLICIES
-- =====================

-- Members can view their workspaces, admins see all
DROP POLICY IF EXISTS "Users view own workspaces" ON public.workspaces;
CREATE POLICY "Users view own workspaces" ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR id IN (
      SELECT workspace_id FROM public.workspace_members WHERE profile_id = auth.uid()
    )
  );

-- Any authenticated user can create a workspace
DROP POLICY IF EXISTS "Authenticated users create workspaces" ON public.workspaces;
CREATE POLICY "Authenticated users create workspaces" ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins and workspace owners (created_by) can update
DROP POLICY IF EXISTS "Workspace owners update" ON public.workspaces;
CREATE POLICY "Workspace owners update" ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR created_by = auth.uid()
  );

-- Only admins and workspace owners can delete
DROP POLICY IF EXISTS "Workspace owners delete" ON public.workspaces;
CREATE POLICY "Workspace owners delete" ON public.workspaces
  FOR DELETE
  TO authenticated
  USING (
    is_admin() OR created_by = auth.uid()
  );

-- =====================
-- WORKSPACE MEMBERS POLICIES
-- =====================

-- Members can see co-members of workspaces they belong to
DROP POLICY IF EXISTS "Members view workspace members" ON public.workspace_members;
CREATE POLICY "Members view workspace members" ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.profile_id = auth.uid()
    )
  );

-- Admins can manage all workspace members (insert/update/delete)
DROP POLICY IF EXISTS "Admins manage workspace members" ON public.workspace_members;
CREATE POLICY "Admins manage workspace members" ON public.workspace_members
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Users can update their own membership (e.g., toggling is_default)
DROP POLICY IF EXISTS "Users update own membership" ON public.workspace_members;
CREATE POLICY "Users update own membership" ON public.workspace_members
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

-- =====================================================
-- NOTE: The createWorkspace() server action uses the
-- admin client (service_role) for the membership INSERT,
-- which bypasses RLS entirely. This is intentional so
-- the workspace creator always gets their membership
-- regardless of policy restrictions.
-- =====================================================
