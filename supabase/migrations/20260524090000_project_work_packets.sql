-- Project work packets.
--
-- A work packet is the ERP-owned operating instruction that joins assignment
-- deadlines with Framework execution state. The ERP remains source of truth
-- for employee, deadline, review, and owner approval; Framework reports and
-- snapshots refresh telemetry on the packet.

CREATE TABLE IF NOT EXISTS public.project_work_packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.project_assignments(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deadline_date date NOT NULL,
  current_milestone integer,
  current_milestone_name text,
  current_phase integer,
  current_phase_name text,
  next_command text NOT NULL DEFAULT '/qualia',
  definition_of_done text,
  blockers text[] NOT NULL DEFAULT '{}'::text[],
  repo_url text,
  vercel_url text,
  framework_status text,
  verification text,
  snapshot_generated_at timestamptz,
  last_report_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'blocked', 'review_requested', 'approved', 'completed', 'superseded')
  ),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_work_packets_active_assignment
  ON public.project_work_packets (assignment_id)
  WHERE assignment_id IS NOT NULL
    AND status IN ('active', 'blocked', 'review_requested');

CREATE INDEX IF NOT EXISTS idx_project_work_packets_project_status
  ON public.project_work_packets (project_id, status);

CREATE INDEX IF NOT EXISTS idx_project_work_packets_employee_status
  ON public.project_work_packets (employee_id, status);

CREATE INDEX IF NOT EXISTS idx_project_work_packets_deadline
  ON public.project_work_packets (deadline_date)
  WHERE status IN ('active', 'blocked', 'review_requested');

COMMENT ON TABLE public.project_work_packets IS
  'ERP-owned delivery mission for an assigned project: employee, deadline, next Framework command, review state, and latest Framework telemetry.';

ALTER TABLE public.project_work_packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_project_work_packets"
  ON public.project_work_packets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "employee_read_own_project_work_packets"
  ON public.project_work_packets FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "admin_insert_project_work_packets"
  ON public.project_work_packets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "admin_update_project_work_packets"
  ON public.project_work_packets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "admin_delete_project_work_packets"
  ON public.project_work_packets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Backfill current active assignments so the Mission page is useful
-- immediately after the migration lands. Later report/snapshot uploads refresh
-- these telemetry fields with richer Framework state.
INSERT INTO public.project_work_packets (
  workspace_id,
  project_id,
  assignment_id,
  employee_id,
  deadline_date,
  current_milestone,
  current_milestone_name,
  current_phase,
  current_phase_name,
  next_command,
  definition_of_done,
  repo_url,
  vercel_url,
  framework_status,
  verification,
  last_report_at,
  status,
  metadata
)
SELECT
  pa.workspace_id,
  pa.project_id,
  pa.id,
  pa.employee_id,
  pa.deadline_date,
  COALESCE(sr.milestone, ph.milestone_number),
  sr.milestone_name,
  COALESCE(sr.phase, ph.sort_order, ph.display_order),
  COALESCE(sr.phase_name, ph.name),
  CASE
    WHEN sr.verification = 'fail' OR COALESCE(sr.gap_cycles, 0) > 0 THEN '/qualia-fix'
    WHEN sr.status IN ('built') OR COALESCE(sr.verification, 'pending') = 'pending' THEN '/qualia-verify'
    WHEN sr.verification = 'pass'
      AND sr.phase IS NOT NULL
      AND sr.total_phases IS NOT NULL
      AND sr.phase < sr.total_phases THEN '/qualia-milestone'
    WHEN sr.verification = 'pass' THEN '/qualia-polish'
    WHEN ph.id IS NOT NULL THEN '/qualia-build'
    WHEN p.github_repo_url IS NOT NULL THEN '/qualia-map'
    ELSE '/qualia-new'
  END,
  p.name || ' is built against the approved scope. The current Framework phase verifies cleanly. The employee has submitted the assignment for owner review. The latest /qualia-report and project snapshot are visible in ERP.',
  p.github_repo_url,
  sr.deployed_url,
  sr.status,
  sr.verification,
  sr.submitted_at,
  CASE
    WHEN pa.completion_requested_at IS NOT NULL THEN 'review_requested'
    ELSE 'active'
  END,
  jsonb_build_object('backfilled_at', now(), 'latest_report_id', sr.id)
FROM public.project_assignments pa
JOIN public.projects p ON p.id = pa.project_id
LEFT JOIN LATERAL (
  SELECT
    id,
    milestone,
    milestone_name,
    phase,
    phase_name,
    total_phases,
    status,
    verification,
    gap_cycles,
    deployed_url,
    submitted_at
  FROM public.session_reports
  WHERE erp_project_id = pa.project_id
    AND dry_run = false
  ORDER BY submitted_at DESC NULLS LAST
  LIMIT 1
) sr ON true
LEFT JOIN LATERAL (
  SELECT
    id,
    name,
    milestone_number,
    sort_order,
    display_order
  FROM public.project_phases
  WHERE project_id = pa.project_id
    AND status IN ('in_progress', 'not_started')
  ORDER BY sort_order ASC
  LIMIT 1
) ph ON true
WHERE pa.removed_at IS NULL
  AND pa.completed_at IS NULL
ON CONFLICT DO NOTHING;
