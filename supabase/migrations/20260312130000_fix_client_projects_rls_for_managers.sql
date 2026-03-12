-- Fix: managers and employees can't see client_projects due to is_admin() check
-- The old policy only allowed role='admin'. Managers need the same access.

-- Create a helper that checks admin OR manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('admin', 'manager')
  );
$$;

-- Drop the old admin-only policy
DROP POLICY IF EXISTS "Admin full access to client_projects" ON public.client_projects;

-- Replace with admin+manager policy
CREATE POLICY "Admin and manager full access to client_projects" ON public.client_projects
  FOR ALL USING (is_admin_or_manager());

-- Also allow employees to READ client_projects (they can view the portal too)
CREATE POLICY "Employees can view client_projects" ON public.client_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'employee'
    )
  );
