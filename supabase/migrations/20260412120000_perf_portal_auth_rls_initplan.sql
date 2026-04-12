-- =====================================================
-- PERF: wrap auth.uid() in (SELECT auth.uid()) for portal tables
-- =====================================================
-- Supabase advisor flags auth_rls_initplan WARN for policies that call
-- auth.uid() directly inside RLS quals — Postgres re-evaluates the function
-- for every row instead of caching it once per query. Wrapping the call in
-- a scalar subselect lets the planner hoist it out of the loop.
--
-- Pure performance optimization — no semantic change.
-- =====================================================

-- portal_app_config
DROP POLICY IF EXISTS portal_app_config_update ON public.portal_app_config;
CREATE POLICY portal_app_config_update ON public.portal_app_config
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

DROP POLICY IF EXISTS portal_app_config_delete ON public.portal_app_config;
CREATE POLICY portal_app_config_delete ON public.portal_app_config
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

-- portal_branding
DROP POLICY IF EXISTS portal_branding_update ON public.portal_branding;
CREATE POLICY portal_branding_update ON public.portal_branding
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

DROP POLICY IF EXISTS portal_branding_delete ON public.portal_branding;
CREATE POLICY portal_branding_delete ON public.portal_branding
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

-- portal_message_channels
DROP POLICY IF EXISTS "Clients can view own project channels" ON public.portal_message_channels;
CREATE POLICY "Clients can view own project channels" ON public.portal_message_channels
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects
    WHERE client_projects.project_id = portal_message_channels.project_id
      AND client_projects.client_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Team members can view all channels" ON public.portal_message_channels;
CREATE POLICY "Team members can view all channels" ON public.portal_message_channels
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'employee'::user_role])
  )
);

DROP POLICY IF EXISTS "Team members can update channels" ON public.portal_message_channels;
CREATE POLICY "Team members can update channels" ON public.portal_message_channels
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'employee'::user_role])
  )
);

DROP POLICY IF EXISTS "Clients can update own project channels" ON public.portal_message_channels;
CREATE POLICY "Clients can update own project channels" ON public.portal_message_channels
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects
    WHERE client_projects.project_id = portal_message_channels.project_id
      AND client_projects.client_id = (SELECT auth.uid())
  )
);

-- portal_message_read_status
DROP POLICY IF EXISTS "Users manage own read status" ON public.portal_message_read_status;
CREATE POLICY "Users manage own read status" ON public.portal_message_read_status
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- portal_messages
DROP POLICY IF EXISTS "Team members can view all messages" ON public.portal_messages;
CREATE POLICY "Team members can view all messages" ON public.portal_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'employee'::user_role])
  )
);

DROP POLICY IF EXISTS "Clients can view non-internal messages" ON public.portal_messages;
CREATE POLICY "Clients can view non-internal messages" ON public.portal_messages
FOR SELECT TO authenticated
USING (
  is_internal = false
  AND EXISTS (
    SELECT 1 FROM public.client_projects
    WHERE client_projects.project_id = portal_messages.project_id
      AND client_projects.client_id = (SELECT auth.uid())
  )
);
