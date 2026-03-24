-- Create work_sessions table for session-based attendance tracking
-- Replaces per-task time tracking with session-level attendance

CREATE TABLE IF NOT EXISTS work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN ended_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER / 60
      ELSE NULL
    END
  ) STORED,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_work_sessions_workspace_id ON work_sessions(workspace_id);
CREATE INDEX idx_work_sessions_profile_id ON work_sessions(profile_id);
CREATE INDEX idx_work_sessions_started_at ON work_sessions(started_at);
CREATE INDEX idx_work_sessions_active ON work_sessions(profile_id) WHERE ended_at IS NULL;

-- RLS
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

-- Workspace members can read sessions in their workspace
CREATE POLICY "workspace_members_can_read_sessions"
  ON work_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = work_sessions.workspace_id
      AND wm.profile_id = auth.uid()
    )
  );

-- Employees can insert their own sessions
CREATE POLICY "employees_can_insert_own_sessions"
  ON work_sessions FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Employees can update their own sessions (for clock-out)
CREATE POLICY "employees_can_update_own_sessions"
  ON work_sessions FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
