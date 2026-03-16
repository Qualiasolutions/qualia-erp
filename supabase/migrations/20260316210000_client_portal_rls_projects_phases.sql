-- Fix: Clients need SELECT access to projects, project_phases, and phase_items
-- for the portal project detail / roadmap pages.
-- Without these, a logged-in client sees nothing on their project pages.

-- Projects: clients can view projects they're linked to via client_projects
CREATE POLICY "Clients view own projects" ON public.projects
  FOR SELECT USING (
    id IN (
      SELECT project_id FROM public.client_projects
      WHERE client_id = (SELECT auth.uid())
    )
  );

-- Project phases: clients can view phases for their linked projects
CREATE POLICY "Clients view project phases" ON public.project_phases
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM public.client_projects
      WHERE client_id = (SELECT auth.uid())
    )
  );

-- Phase items: clients can view items for phases of their linked projects
CREATE POLICY "Clients view phase items" ON public.phase_items
  FOR SELECT USING (
    phase_id IN (
      SELECT pp.id FROM public.project_phases pp
      JOIN public.client_projects cp ON cp.project_id = pp.project_id
      WHERE cp.client_id = (SELECT auth.uid())
    )
  );
