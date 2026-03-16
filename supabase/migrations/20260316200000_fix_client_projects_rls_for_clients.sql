-- Fix: "Clients view own project links" policy was dropped in consolidation
-- migration but never recreated. Clients with role='client' could not read
-- their own rows from client_projects, making the portal projects page empty.

CREATE POLICY "Clients view own project links" ON public.client_projects
  FOR SELECT USING (
    client_id = (SELECT auth.uid())
  );
