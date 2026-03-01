-- Phase 0: Portal & Trainee System — new tables, role extension, RLS helper
-- Adds: phase_reviews, project_integrations, project_files, activity_log,
--        client_projects, phase_comments
-- Extends: user_role enum with 'client'
-- Creates: is_client_of_project() RLS helper function

-- =============================================================================
-- 0.1 Extend user_role enum
-- =============================================================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client';

-- =============================================================================
-- 0.2 New Tables
-- =============================================================================

-- phase_reviews: tracks admin review of each phase submission
CREATE TABLE public.phase_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
  phase_name text NOT NULL,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  submitted_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'changes_requested')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  feedback text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_phase_review UNIQUE(project_id, phase_name)
);

CREATE INDEX idx_phase_reviews_project ON public.phase_reviews(project_id);
CREATE INDEX idx_phase_reviews_pending ON public.phase_reviews(status) WHERE status = 'pending';

-- project_integrations: link projects to GitHub repos, Vercel deployments, etc.
CREATE TABLE public.project_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN ('github', 'vercel', 'figma', 'notion')),
  external_url text NOT NULL,
  external_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  connected_at timestamptz DEFAULT now(),
  CONSTRAINT unique_integration UNIQUE(project_id, service_type)
);

-- project_files: add portal columns to existing table
ALTER TABLE public.project_files ADD COLUMN IF NOT EXISTS phase_name text;
ALTER TABLE public.project_files ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.project_files ADD COLUMN IF NOT EXISTS is_client_visible boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_project_files_visible ON public.project_files(project_id)
  WHERE is_client_visible = true;

-- activity_log: feed of project events for team and client portal
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'phase_submitted', 'phase_approved', 'phase_changes_requested',
    'task_completed', 'comment_added', 'file_uploaded', 'status_changed'
  )),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  action_data jsonb DEFAULT '{}'::jsonb,
  is_client_visible boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_log_project ON public.activity_log(project_id, created_at DESC);

-- client_projects: links client users to their projects
CREATE TABLE public.client_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  access_level text DEFAULT 'view' CHECK (access_level IN ('view', 'comment')),
  invited_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id),
  CONSTRAINT unique_client_project UNIQUE(client_id, project_id)
);

-- phase_comments: comments on phases from trainee, admin, or clients
CREATE TABLE public.phase_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_name text NOT NULL,
  task_key text,
  commented_by uuid NOT NULL REFERENCES auth.users(id),
  comment_text text NOT NULL,
  is_internal boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_phase_comments_phase ON public.phase_comments(project_id, phase_name);

-- =============================================================================
-- 0.3 RLS Helper Function
-- =============================================================================
CREATE OR REPLACE FUNCTION is_client_of_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_projects
    WHERE client_id = (SELECT auth.uid())
    AND project_id = p_project_id
  );
$$;

-- =============================================================================
-- 0.4 Enable RLS on all new tables
-- =============================================================================
ALTER TABLE public.phase_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_integrations ENABLE ROW LEVEL SECURITY;
-- project_files RLS already enabled — only adding client policy
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_comments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 0.5 RLS Policies
-- =============================================================================

-- phase_reviews: admin + employee on own projects, clients on their projects (read-only)
CREATE POLICY "Admin full access to phase_reviews" ON public.phase_reviews
  FOR ALL USING (is_admin());

CREATE POLICY "Employees view phase reviews for their projects" ON public.phase_reviews
  FOR SELECT USING (
    submitted_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = phase_reviews.project_id
      AND p.lead_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Employees submit phase reviews" ON public.phase_reviews
  FOR INSERT WITH CHECK (submitted_by = (SELECT auth.uid()));

CREATE POLICY "Clients view phase reviews for their projects" ON public.phase_reviews
  FOR SELECT USING (is_client_of_project(project_id));

-- project_integrations: admin + employees on workspace projects
CREATE POLICY "Admin full access to project_integrations" ON public.project_integrations
  FOR ALL USING (is_admin());

CREATE POLICY "Employees view project integrations" ON public.project_integrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_integrations.project_id
      AND p.lead_id = (SELECT auth.uid())
    )
  );

-- project_files: add client visibility policy (admin/employee policies already exist)
CREATE POLICY "Clients view visible project files" ON public.project_files
  FOR SELECT USING (
    is_client_visible = true
    AND is_client_of_project(project_id)
  );

-- activity_log: admin full, employees on own projects, clients see visible entries
CREATE POLICY "Admin full access to activity_log" ON public.activity_log
  FOR ALL USING (is_admin());

CREATE POLICY "Employees view activity log" ON public.activity_log
  FOR SELECT USING (
    actor_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = activity_log.project_id
      AND p.lead_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Employees insert activity log" ON public.activity_log
  FOR INSERT WITH CHECK (actor_id = (SELECT auth.uid()));

CREATE POLICY "Clients view visible activity log" ON public.activity_log
  FOR SELECT USING (
    is_client_visible = true
    AND is_client_of_project(project_id)
  );

-- client_projects: admin manages, clients see own
CREATE POLICY "Admin full access to client_projects" ON public.client_projects
  FOR ALL USING (is_admin());

CREATE POLICY "Clients view own project links" ON public.client_projects
  FOR SELECT USING (client_id = (SELECT auth.uid()));

-- phase_comments: admin full, employees on own projects, clients see non-internal
CREATE POLICY "Admin full access to phase_comments" ON public.phase_comments
  FOR ALL USING (is_admin());

CREATE POLICY "Employees view phase comments" ON public.phase_comments
  FOR SELECT USING (
    commented_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = phase_comments.project_id
      AND p.lead_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Employees insert phase comments" ON public.phase_comments
  FOR INSERT WITH CHECK (commented_by = (SELECT auth.uid()));

CREATE POLICY "Clients view non-internal phase comments" ON public.phase_comments
  FOR SELECT USING (
    is_internal = false
    AND is_client_of_project(project_id)
  );

CREATE POLICY "Clients insert phase comments" ON public.phase_comments
  FOR INSERT WITH CHECK (
    is_client_of_project(project_id)
    AND commented_by = (SELECT auth.uid())
    AND is_internal = false
  );
