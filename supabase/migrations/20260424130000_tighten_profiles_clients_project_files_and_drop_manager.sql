-- Close C2/H6/H7/H9 from docs/audits/2026-04-24-readiness-audit.md:
--   C2: profiles SELECT was `USING (true)` — every authenticated user could read
--       every profile across workspaces (emails, roles, phone). Restrict to
--       self, admin, co-workspace members, and shared-project relationships.
--   H6: clients INSERT/UPDATE were open to any workspace member. Restrict to
--       admin / workspace admin.
--   H7: project_files DELETE was workspace-wide. Restrict to admin /
--       workspace admin / project lead / active project assignment / uploader.
--   H9: `manager` role references still lingered in financial_invoices and
--       client_feature_requests RLS. Purge now that the role is removed.

-- ============ profiles SELECT ============
-- NOTE: the scoped profiles SELECT originally planned here caused infinite
-- recursion in production (project_assignments RLS reads profiles, profiles
-- policy read project_assignments). See 20260424140000 for the rollback.
-- A recursion-safe version requires a SECURITY DEFINER helper and browser
-- QA before re-introduction. Left as follow-up.

-- ============ clients INSERT / UPDATE ============

DROP POLICY IF EXISTS "Users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients" ON public.clients;

CREATE POLICY "clients_insert_admin"
ON public.clients
FOR INSERT TO authenticated
WITH CHECK (
  is_admin()
  OR (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id))
);

CREATE POLICY "clients_update_admin"
ON public.clients
FOR UPDATE TO authenticated
USING (
  is_admin()
  OR (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id))
)
WITH CHECK (
  is_admin()
  OR (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id))
);

-- ============ project_files DELETE ============

DROP POLICY IF EXISTS "project_files_delete" ON public.project_files;

CREATE POLICY "project_files_delete"
ON public.project_files
FOR DELETE TO authenticated
USING (
  is_admin()
  OR (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id))
  OR uploaded_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_files.project_id
      AND p.lead_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = project_files.project_id
      AND pa.employee_id = (SELECT auth.uid())
      AND pa.removed_at IS NULL
  )
);

-- ============ Manager role cleanup ============

-- financial_invoices
DROP POLICY IF EXISTS "admin_manager_insert_invoices" ON public.financial_invoices;
DROP POLICY IF EXISTS "admin_manager_update_invoices" ON public.financial_invoices;
DROP POLICY IF EXISTS "admin_manager_delete_invoices" ON public.financial_invoices;

CREATE POLICY "admin_insert_invoices"
ON public.financial_invoices
FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "admin_update_invoices"
ON public.financial_invoices
FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "admin_delete_invoices"
ON public.financial_invoices
FOR DELETE TO authenticated
USING (is_admin());

-- client_feature_requests
DROP POLICY IF EXISTS "feature_requests_delete" ON public.client_feature_requests;
DROP POLICY IF EXISTS "feature_requests_insert" ON public.client_feature_requests;
DROP POLICY IF EXISTS "feature_requests_select" ON public.client_feature_requests;
DROP POLICY IF EXISTS "feature_requests_update" ON public.client_feature_requests;

CREATE POLICY "feature_requests_select"
ON public.client_feature_requests
FOR SELECT TO authenticated
USING (
  client_id = (SELECT auth.uid())
  OR is_admin()
  OR project_id IN (
    SELECT cp.project_id FROM public.client_projects cp
    WHERE cp.client_id = (SELECT auth.uid())
  )
);

CREATE POLICY "feature_requests_insert"
ON public.client_feature_requests
FOR INSERT TO authenticated
WITH CHECK (
  client_id = (SELECT auth.uid())
  OR is_admin()
  OR project_id IN (
    SELECT cp.project_id FROM public.client_projects cp
    WHERE cp.client_id = (SELECT auth.uid())
  )
);

CREATE POLICY "feature_requests_update"
ON public.client_feature_requests
FOR UPDATE TO authenticated
USING (
  is_admin()
  OR (
    client_id = (SELECT auth.uid())
    AND status = ANY (ARRAY['pending'::text, 'in_review'::text])
  )
  OR project_id IN (
    SELECT cp.project_id FROM public.client_projects cp
    WHERE cp.client_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  is_admin()
  OR (
    client_id = (SELECT auth.uid())
    AND status = ANY (ARRAY['pending'::text, 'in_review'::text])
  )
  OR project_id IN (
    SELECT cp.project_id FROM public.client_projects cp
    WHERE cp.client_id = (SELECT auth.uid())
  )
);

CREATE POLICY "feature_requests_delete"
ON public.client_feature_requests
FOR DELETE TO authenticated
USING (
  is_admin()
  OR project_id IN (
    SELECT cp.project_id FROM public.client_projects cp
    WHERE cp.client_id = (SELECT auth.uid())
  )
);
