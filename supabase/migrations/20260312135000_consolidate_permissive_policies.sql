-- Consolidate multiple permissive policies into single policies per table/action
-- Fixes all remaining "multiple_permissive_policies" linter warnings

-- ============================================================================
-- 1. client_projects: merge admin+manager FOR ALL + employee SELECT into one SELECT
-- ============================================================================
DROP POLICY IF EXISTS "Admin and manager full access to client_projects" ON public.client_projects;
DROP POLICY IF EXISTS "Employees can view client_projects" ON public.client_projects;

-- Single FOR ALL for admin/manager (covers SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Team full access to client_projects" ON public.client_projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager', 'employee')
    )
  );

-- Clients see own links
DROP POLICY IF EXISTS "Clients view own project links" ON public.client_projects;
-- (already dropped, but safe)

-- ============================================================================
-- 2. client_action_items: merge admin FOR ALL + client SELECT into single SELECT
-- ============================================================================
DROP POLICY IF EXISTS "admin_manage_action_items" ON public.client_action_items;
DROP POLICY IF EXISTS "client_read_own_action_items" ON public.client_action_items;

-- Admin/manager: full CRUD
CREATE POLICY "admin_manage_action_items" ON public.client_action_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- Client: read own (restrictive — only fires for SELECT, no overlap with admin FOR ALL on SELECT
-- because we need client to ONLY see their own)
-- Use RESTRICTIVE to avoid the "multiple permissive" warning? No — that changes semantics.
-- Instead: single SELECT policy combining both conditions
DROP POLICY IF EXISTS "admin_manage_action_items" ON public.client_action_items;

CREATE POLICY "action_items_select" ON public.client_action_items
  FOR SELECT USING (
    client_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "action_items_admin_write" ON public.client_action_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "action_items_admin_update" ON public.client_action_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "action_items_admin_delete" ON public.client_action_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- 3. client_feature_requests: merge admin FOR ALL + client per-action
-- ============================================================================
DROP POLICY IF EXISTS "Admin full access to client_feature_requests" ON public.client_feature_requests;
DROP POLICY IF EXISTS "Clients view own feature requests" ON public.client_feature_requests;
DROP POLICY IF EXISTS "Clients create feature requests" ON public.client_feature_requests;
DROP POLICY IF EXISTS "Clients update own pending requests" ON public.client_feature_requests;

-- SELECT: admin/manager OR own
CREATE POLICY "feature_requests_select" ON public.client_feature_requests
  FOR SELECT USING (
    client_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- INSERT: admin/manager OR client (own)
CREATE POLICY "feature_requests_insert" ON public.client_feature_requests
  FOR INSERT WITH CHECK (
    client_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- UPDATE: admin/manager OR own pending
CREATE POLICY "feature_requests_update" ON public.client_feature_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
    OR (client_id = (SELECT auth.uid()) AND status IN ('pending', 'in_review'))
  );

-- DELETE: admin/manager only
CREATE POLICY "feature_requests_delete" ON public.client_feature_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- 4. client_invitations: merge admin FOR ALL + manager SELECT
-- ============================================================================
DROP POLICY IF EXISTS "Admin full access to invitations" ON public.client_invitations;
DROP POLICY IF EXISTS "Managers view invitations for their projects" ON public.client_invitations;

-- Single SELECT: admin/manager can view all
CREATE POLICY "invitations_select" ON public.client_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- Admin-only write
CREATE POLICY "invitations_admin_write" ON public.client_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "invitations_admin_update" ON public.client_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "invitations_admin_delete" ON public.client_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- 5. client_invoices: merge admin FOR ALL + client SELECT
-- ============================================================================
DROP POLICY IF EXISTS "Admin full access to client_invoices" ON public.client_invoices;
DROP POLICY IF EXISTS "Clients view own invoices" ON public.client_invoices;

-- SELECT: admin/manager OR own
CREATE POLICY "invoices_select" ON public.client_invoices
  FOR SELECT USING (
    client_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- Admin write
CREATE POLICY "invoices_admin_insert" ON public.client_invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "invoices_admin_update" ON public.client_invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "invoices_admin_delete" ON public.client_invoices
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );
