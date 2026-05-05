-- Multi-project work sessions.
--
-- Until now, a work_session was tied to a single project via
-- work_sessions.project_id. The new clock-in flow lets the user tick multiple
-- projects upfront, and clock-out gates on a session_reports row existing for
-- each one. This table is the source of truth for "all projects worked on
-- during a session." work_sessions.project_id stays as the legacy "primary
-- project" so existing read paths (Working on X badges, attendance views,
-- audit dashboards) keep rendering without per-callsite changes.

CREATE TABLE IF NOT EXISTS public.work_session_projects (
  session_id uuid NOT NULL REFERENCES public.work_sessions(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_work_session_projects_project_id
  ON public.work_session_projects (project_id);

COMMENT ON TABLE public.work_session_projects IS
  'Many-to-many: which projects an employee worked on during a single clock-in session. Locked at clock-in, drives per-project report check at clock-out.';

-- Backfill existing rows so historical sessions still surface their project
-- through the new join table.
INSERT INTO public.work_session_projects (session_id, project_id)
SELECT id, project_id
FROM public.work_sessions
WHERE project_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.work_session_projects ENABLE ROW LEVEL SECURITY;

-- SELECT: any user who can already see the parent session can see its project links.
CREATE POLICY "read_own_or_workspace_session_projects"
  ON public.work_session_projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.work_sessions ws
      WHERE ws.id = work_session_projects.session_id
        AND (
          ws.profile_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  );

-- INSERT/DELETE: owner of the session, or workspace admin.
CREATE POLICY "write_own_session_projects"
  ON public.work_session_projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_sessions ws
      WHERE ws.id = work_session_projects.session_id
        AND ws.profile_id = auth.uid()
    )
  );

CREATE POLICY "admin_write_session_projects"
  ON public.work_session_projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "delete_own_session_projects"
  ON public.work_session_projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.work_sessions ws
      WHERE ws.id = work_session_projects.session_id
        AND ws.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
