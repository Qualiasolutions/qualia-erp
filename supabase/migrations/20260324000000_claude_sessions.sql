-- Claude session tracking for cross-session intelligence
-- Receives session summaries from save-session-state.sh via POST /api/claude/session-log

CREATE TABLE IF NOT EXISTS claude_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name text NOT NULL,
  branch text,
  files_changed integer DEFAULT 0,
  summary text,
  working_directory text,
  session_timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS: service_role only (no user-facing access needed)
ALTER TABLE claude_sessions ENABLE ROW LEVEL SECURITY;

-- Index for common queries
CREATE INDEX idx_claude_sessions_project ON claude_sessions(project_name);
CREATE INDEX idx_claude_sessions_timestamp ON claude_sessions(session_timestamp DESC);

-- Auto-cleanup: keep last 90 days
-- (Can be run via cron or Supabase scheduled function)
COMMENT ON TABLE claude_sessions IS 'Claude Code session tracking. Populated by save-session-state.sh hook via /api/claude/session-log. Retention: 90 days.';
