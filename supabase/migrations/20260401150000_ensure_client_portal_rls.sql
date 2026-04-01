-- Consolidated client portal RLS policies
-- Ensures all tables needed by portal clients have proper SELECT policies.
-- Idempotent: drops then recreates each policy.

-- 1. client_projects: clients can see their own project links
DROP POLICY IF EXISTS "Clients view own project links" ON public.client_projects;
CREATE POLICY "Clients view own project links" ON public.client_projects
  FOR SELECT USING (client_id = auth.uid());

-- 2. projects: clients can see projects they're linked to
DROP POLICY IF EXISTS "Clients view own projects" ON public.projects;
CREATE POLICY "Clients view own projects" ON public.projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM public.client_projects WHERE client_id = auth.uid())
  );

-- 3. project_phases: clients can see phases of their projects
DROP POLICY IF EXISTS "Clients view project phases" ON public.project_phases;
CREATE POLICY "Clients view project phases" ON public.project_phases
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM public.client_projects WHERE client_id = auth.uid())
  );

-- 4. phase_items: clients can see items in phases of their projects
DROP POLICY IF EXISTS "Clients view phase items" ON public.phase_items;
CREATE POLICY "Clients view phase items" ON public.phase_items
  FOR SELECT USING (
    phase_id IN (
      SELECT pp.id FROM public.project_phases pp
      JOIN public.client_projects cp ON cp.project_id = pp.project_id
      WHERE cp.client_id = auth.uid()
    )
  );

-- 5. client_activities: clients can see their own activities
DROP POLICY IF EXISTS "Clients view own activities" ON public.client_activities;
CREATE POLICY "Clients view own activities" ON public.client_activities
  FOR SELECT USING (
    client_id IN (
      SELECT c.id FROM public.clients c
      JOIN public.projects p ON p.client_id = c.id
      JOIN public.client_projects cp ON cp.project_id = p.id
      WHERE cp.client_id = auth.uid()
    )
    OR client_id::text = auth.uid()::text
  );

-- 6. client_feature_requests: clients can manage their own requests
DROP POLICY IF EXISTS "Clients manage own feature requests" ON public.client_feature_requests;
CREATE POLICY "Clients manage own feature requests" ON public.client_feature_requests
  FOR ALL USING (
    project_id IN (SELECT project_id FROM public.client_projects WHERE client_id = auth.uid())
  );

-- 7. client_action_items: clients see their own action items
DROP POLICY IF EXISTS "Clients view own action items" ON public.client_action_items;
CREATE POLICY "Clients view own action items" ON public.client_action_items
  FOR SELECT USING (
    client_id = auth.uid()
  );

-- 8. financial_invoices: clients see their own invoices
-- Join path: auth.uid() -> client_projects.client_id (portal user)
--         -> client_projects.project_id -> projects.client_id (CRM client)
--         -> financial_invoices.client_id (CRM client ID)
-- OR direct match if financial_invoices.client_id is set to the portal user's ID
DROP POLICY IF EXISTS "Clients view own invoices" ON public.financial_invoices;
CREATE POLICY "Clients view own invoices" ON public.financial_invoices
  FOR SELECT USING (
    client_id = auth.uid()
    OR client_id IN (
      SELECT c.id FROM public.clients c
      JOIN public.projects p ON p.client_id = c.id
      JOIN public.client_projects cp ON cp.project_id = p.id
      WHERE cp.client_id = auth.uid()
    )
  );
