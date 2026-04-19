-- Phase 11: Ensure request_comments table exists in migration chain
-- and align RLS delete policies for phase_comments.
--
-- request_comments was created via Supabase MCP (no migration file),
-- meaning it cannot be reproduced from the migration chain alone.
-- This migration makes it reproducible and adds proper RLS policies.
--
-- phase_comments has an admin FOR ALL policy (includes DELETE),
-- but non-admin authors cannot delete their own comments through RLS.
-- This adds an explicit author DELETE policy for phase_comments.

-- =============================================================================
-- 1. request_comments table (idempotent — IF NOT EXISTS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.request_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.client_feature_requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_comments_request_id
  ON public.request_comments(request_id);

ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: admin, author, request owner (client_id on the feature request),
--         or client linked to the request's project
DROP POLICY IF EXISTS "View request comments" ON public.request_comments;
CREATE POLICY "View request comments" ON public.request_comments
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR author_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.client_feature_requests r
      WHERE r.id = request_comments.request_id
      AND r.client_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.client_feature_requests r
      JOIN public.client_projects cp ON cp.project_id = r.project_id
      WHERE r.id = request_comments.request_id
      AND cp.client_id = (SELECT auth.uid())
    )
  );

-- Employees can view all request comments (staff access)
DROP POLICY IF EXISTS "Employees view request comments" ON public.request_comments;
CREATE POLICY "Employees view request comments" ON public.request_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'employee'
    )
  );

-- INSERT: author_id must match auth.uid()
DROP POLICY IF EXISTS "Insert request comments" ON public.request_comments;
CREATE POLICY "Insert request comments" ON public.request_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = (SELECT auth.uid()));

-- DELETE: author or admin
DROP POLICY IF EXISTS "Delete request comments" ON public.request_comments;
CREATE POLICY "Delete request comments" ON public.request_comments
  FOR DELETE TO authenticated
  USING (author_id = (SELECT auth.uid()) OR is_admin());

-- =============================================================================
-- 2. phase_comments: add explicit DELETE policy for non-admin authors
--    Admin already has FOR ALL via "Admin full access to phase_comments".
--    Non-admin authors (employees, clients) need this to delete their own.
-- =============================================================================

DROP POLICY IF EXISTS "Author delete phase comments" ON public.phase_comments;
CREATE POLICY "Author delete phase comments" ON public.phase_comments
  FOR DELETE TO authenticated
  USING (commented_by = (SELECT auth.uid()));

-- =============================================================================
-- 3. project_notes: delete policy already correct (author OR admin)
--    Migration 20260109000000, policy "Delete project notes":
--      USING (user_id = auth.uid() OR is_admin())
--    No change needed.
-- =============================================================================
