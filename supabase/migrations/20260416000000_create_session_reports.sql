-- Session reports from /qualia-report skill
-- Receives structured phase-level reports via POST /api/v1/reports
-- Separate from claude_sessions (which is lightweight per-session metadata).

CREATE TABLE IF NOT EXISTS session_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name text NOT NULL,
  client text,
  milestone integer,
  phase integer,
  phase_name text,
  total_phases integer,
  status text,
  tasks_done integer DEFAULT 0,
  tasks_total integer DEFAULT 0,
  verification text DEFAULT 'pending',
  gap_cycles integer DEFAULT 0,
  deployed_url text,
  lifetime jsonb,
  commits text[] DEFAULT '{}',
  notes text,
  submitted_by text,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS: service_role only — ingested via authenticated API route, no user-facing reads yet
ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_session_reports_project ON session_reports(project_name);
CREATE INDEX idx_session_reports_created_at ON session_reports(created_at DESC);
CREATE INDEX idx_session_reports_submitted_by ON session_reports(submitted_by);

COMMENT ON TABLE session_reports IS 'Structured phase reports submitted by /qualia-report skill via POST /api/v1/reports. Auth: Bearer token matching CLAUDE_API_KEY env var.';
