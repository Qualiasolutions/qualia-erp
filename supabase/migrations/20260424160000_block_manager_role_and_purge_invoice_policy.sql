-- Finalize H9 cleanup: the app layer removed the 'manager' role in
-- 20260418150000 but the enum value and stray policy references remained.
--
-- 1. ADD a CHECK preventing any future `role='manager'` insert or update.
--    Safe: live DB has 0 rows with role='manager'.
-- 2. REWRITE "Clients view own invoices" on financial_invoices to drop
--    the last stale `role = ANY('admin','manager')` arm (the admin/manager
--    shortcut is now covered by is_admin()).

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_not_manager
  CHECK (role <> 'manager');

DROP POLICY IF EXISTS "Clients view own invoices" ON public.financial_invoices;

CREATE POLICY "Clients view own invoices"
ON public.financial_invoices
FOR SELECT TO authenticated
USING (
  is_admin()
  OR client_id = (SELECT auth.uid())
  OR client_id IN (
    SELECT c.id
    FROM public.clients c
    JOIN public.projects p ON p.client_id = c.id
    JOIN public.client_projects cp ON cp.project_id = p.id
    WHERE cp.client_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.client_projects cp
    JOIN public.projects p ON p.id = cp.project_id
    WHERE cp.client_id = (SELECT auth.uid())
      AND p.client_id = financial_invoices.client_id
      AND p.client_id IS NOT NULL
  )
);
