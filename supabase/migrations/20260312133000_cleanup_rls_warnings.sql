-- Cleanup: fix duplicate policies, auth initplan perf, and duplicate index
-- Resolves all Supabase linter warnings

-- ============================================================================
-- 1. client_projects: remove old duplicate policies (keep our new consolidated ones)
-- ============================================================================
DROP POLICY IF EXISTS "client_projects_select" ON public.client_projects;
DROP POLICY IF EXISTS "client_projects_insert" ON public.client_projects;
DROP POLICY IF EXISTS "client_projects_update" ON public.client_projects;
DROP POLICY IF EXISTS "client_projects_delete" ON public.client_projects;
DROP POLICY IF EXISTS "Clients view own project links" ON public.client_projects;

-- ============================================================================
-- 2. client_action_items: consolidate overlapping policies + fix initplan
-- ============================================================================
DROP POLICY IF EXISTS "admin_read_action_items" ON public.client_action_items;
DROP POLICY IF EXISTS "admin_manage_action_items" ON public.client_action_items;
DROP POLICY IF EXISTS "client_read_own_action_items" ON public.client_action_items;

-- Single admin/manager read+write policy
CREATE POLICY "admin_manage_action_items" ON public.client_action_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- Client read own (with initplan fix)
CREATE POLICY "client_read_own_action_items" ON public.client_action_items
  FOR SELECT USING (client_id = (SELECT auth.uid()));

-- ============================================================================
-- 3. dashboard_notes: fix initplan warnings (wrap auth.uid() in select)
-- ============================================================================
DROP POLICY IF EXISTS "Admin and manager can insert dashboard notes" ON public.dashboard_notes;
DROP POLICY IF EXISTS "Author or admin can update dashboard notes" ON public.dashboard_notes;
DROP POLICY IF EXISTS "Author or admin can delete dashboard notes" ON public.dashboard_notes;

CREATE POLICY "Admin and manager can insert dashboard notes" ON public.dashboard_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Author or admin can update dashboard notes" ON public.dashboard_notes
  FOR UPDATE USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Author or admin can delete dashboard notes" ON public.dashboard_notes
  FOR DELETE USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- 4. notification_preferences: fix initplan warnings
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can create their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can delete their own notification preferences" ON public.notification_preferences;

CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create their own notification preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own notification preferences" ON public.notification_preferences
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 5. project_assignments: fix initplan warnings
-- ============================================================================
DROP POLICY IF EXISTS "Workspace members can view assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Admins can insert assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.project_assignments;

CREATE POLICY "Workspace members can view assignments" ON public.project_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager', 'employee')
    )
  );

CREATE POLICY "Admins can insert assignments" ON public.project_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can update assignments" ON public.project_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete assignments" ON public.project_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- 6. time_entries: fix initplan warnings + consolidate SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can view own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete own time entries" ON public.time_entries;

-- Single SELECT policy: own entries OR admin sees all
CREATE POLICY "Users can view time entries" ON public.time_entries
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can insert own time entries" ON public.time_entries
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own time entries" ON public.time_entries
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own time entries" ON public.time_entries
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 7. Duplicate index on projects
-- ============================================================================
DROP INDEX IF EXISTS idx_projects_client;
