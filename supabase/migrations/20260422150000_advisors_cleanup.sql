-- Clean up 48 Supabase advisor WARNs (2026-04-22).
-- Three buckets:
--   1. 6 duplicate indexes    → drop the redundant one per pair
--   2. 9 auth_rls_initplan    → wrap bare auth.uid() in (SELECT auth.uid())
--   3. 33 multiple_permissive → drop legacy duplicates where newer policy is a superset
--
-- Net behavioural change is zero: every DROP either removes a strict subset
-- of an existing policy, removes a duplicate with identical qual/check, or
-- is replaced by a merged policy with equivalent permissions.

-- ============ 1. Duplicate indexes ============

DROP INDEX IF EXISTS public.portal_message_channels_project_id_unique;
DROP INDEX IF EXISTS public.idx_portal_message_read_status_user;
DROP INDEX IF EXISTS public.idx_portal_messages_channel_created;
DROP INDEX IF EXISTS public.idx_portal_messages_project;
DROP INDEX IF EXISTS public.idx_task_attachments_task_id;
DROP INDEX IF EXISTS public.idx_task_attachments_workspace_id;

-- ============ 2. auth_rls_initplan fixes + multi-permissive consolidation ============

-- --- api_tokens SELECT: merge admin + user ---
DROP POLICY IF EXISTS "admins see all tokens" ON public.api_tokens;
DROP POLICY IF EXISTS "users see own tokens" ON public.api_tokens;
CREATE POLICY "api_tokens_select_own_or_admin"
  ON public.api_tokens FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role)
  );

-- --- work_sessions UPDATE: merge admin + employee (fixes both initplan and multi-perm) ---
DROP POLICY IF EXISTS "admins_can_update_workspace_sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "employees_can_update_own_sessions" ON public.work_sessions;
CREATE POLICY "work_sessions_update_self_or_workspace_admin"
  ON public.work_sessions FOR UPDATE TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'::user_role)
      AND EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = work_sessions.workspace_id
          AND wm.profile_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    profile_id = (SELECT auth.uid())
    OR (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'::user_role)
      AND EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = work_sessions.workspace_id
          AND wm.profile_id = (SELECT auth.uid())
      )
    )
  );

-- --- financial_invoices SELECT: drop newer narrow dup; keep "Clients view own invoices" ---
DROP POLICY IF EXISTS "financial_invoices_select" ON public.financial_invoices;

-- --- financial_payments SELECT: admin_manager_full_access (ALL) supersets select_admin ---
DROP POLICY IF EXISTS "financial_payments_select_admin" ON public.financial_payments;

-- --- phase_comments DELETE: merge author + admin ---
DROP POLICY IF EXISTS "Author delete phase comments" ON public.phase_comments;
DROP POLICY IF EXISTS "phase_comments_delete" ON public.phase_comments;
CREATE POLICY "phase_comments_delete"
  ON public.phase_comments FOR DELETE TO authenticated
  USING (is_admin() OR commented_by = (SELECT auth.uid()));

-- --- phase_items DELETE: "Workspace members" is a strict superset of "Admins" ---
DROP POLICY IF EXISTS "Admins can delete phase items" ON public.phase_items;

-- --- portal_app_config_insert: wrap auth.uid() ---
DROP POLICY IF EXISTS "portal_app_config_insert" ON public.portal_app_config;
CREATE POLICY "portal_app_config_insert"
  ON public.portal_app_config FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    )
  );

-- --- portal_branding_insert: wrap auth.uid() ---
DROP POLICY IF EXISTS "portal_branding_insert" ON public.portal_branding;
CREATE POLICY "portal_branding_insert"
  ON public.portal_branding FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    )
  );

-- --- portal_settings insert/update/delete: wrap auth.uid() ---
DROP POLICY IF EXISTS "portal_settings_insert" ON public.portal_settings;
CREATE POLICY "portal_settings_insert"
  ON public.portal_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    )
  );

DROP POLICY IF EXISTS "portal_settings_update" ON public.portal_settings;
CREATE POLICY "portal_settings_update"
  ON public.portal_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    )
  );

DROP POLICY IF EXISTS "portal_settings_delete" ON public.portal_settings;
CREATE POLICY "portal_settings_delete"
  ON public.portal_settings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    )
  );

-- --- portal_message_channels: _insert / _select / _update are ORed supersets ---
DROP POLICY IF EXISTS "Team members can create channels" ON public.portal_message_channels;
DROP POLICY IF EXISTS "Clients can create channels for own projects" ON public.portal_message_channels;
DROP POLICY IF EXISTS "Team members can view all channels" ON public.portal_message_channels;
DROP POLICY IF EXISTS "Clients can view own project channels" ON public.portal_message_channels;
DROP POLICY IF EXISTS "Team members can update channels" ON public.portal_message_channels;
DROP POLICY IF EXISTS "Clients can update own project channels" ON public.portal_message_channels;

-- --- portal_message_read_status: "Users manage own read status" (ALL) is the superset ---
DROP POLICY IF EXISTS "portal_message_read_status_insert_own" ON public.portal_message_read_status;
DROP POLICY IF EXISTS "portal_message_read_status_select_own" ON public.portal_message_read_status;
DROP POLICY IF EXISTS "portal_message_read_status_update_own" ON public.portal_message_read_status;

-- --- portal_messages INSERT: _insert is identical to legacy ---
DROP POLICY IF EXISTS "Users with access can send messages" ON public.portal_messages;

-- --- portal_messages SELECT: _select is the ORed superset ---
DROP POLICY IF EXISTS "Clients can view non-internal messages" ON public.portal_messages;
DROP POLICY IF EXISTS "Team members can view all messages" ON public.portal_messages;

-- --- project_phases: "Workspace members" (broader) supersets project_phases_* ---
DROP POLICY IF EXISTS "project_phases_delete" ON public.project_phases;
DROP POLICY IF EXISTS "project_phases_insert" ON public.project_phases;
DROP POLICY IF EXISTS "project_phases_update" ON public.project_phases;

-- --- request_comments DELETE: merge author + admin/manager into one ---
DROP POLICY IF EXISTS "Delete request comments" ON public.request_comments;
DROP POLICY IF EXISTS "request_comments_delete" ON public.request_comments;
CREATE POLICY "request_comments_delete"
  ON public.request_comments FOR DELETE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    )
  );

-- --- request_comments INSERT: newer _insert is broader (role check + author) ---
DROP POLICY IF EXISTS "Insert request comments" ON public.request_comments;

-- --- request_comments SELECT: merge employees + author + client-of-request into _select ---
DROP POLICY IF EXISTS "Employees view request comments" ON public.request_comments;
DROP POLICY IF EXISTS "View request comments" ON public.request_comments;
DROP POLICY IF EXISTS "request_comments_select" ON public.request_comments;
CREATE POLICY "request_comments_select"
  ON public.request_comments FOR SELECT TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'employee'::user_role])
    )
    OR EXISTS (
      SELECT 1 FROM client_feature_requests r
      WHERE r.id = request_comments.request_id
        AND r.client_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM client_feature_requests r
      JOIN client_projects cp ON cp.project_id = r.project_id
      WHERE r.id = request_comments.request_id
        AND cp.client_id = (SELECT auth.uid())
    )
  );

-- --- task_attachments: drop legacy {public} duplicates (newer {authenticated} equivalents exist) ---
DROP POLICY IF EXISTS "Uploaders and admins can delete" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can insert attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can view attachments in their workspace" ON public.task_attachments;
