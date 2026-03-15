-- Migration: Add daily structure tables (v2.0 Team Sync & Daily Flow)
-- See .planning/phases/26-team-sync-daily-structure/26-01-PLAN.md

-- =====================================================
-- daily_checkins: Morning standup / EOD check-in per user per day
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_checkins (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  profile_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_date      date NOT NULL DEFAULT CURRENT_DATE,
  checkin_type      text NOT NULL CHECK (checkin_type IN ('morning', 'evening')),
  -- Morning fields
  planned_tasks     text[] DEFAULT '{}',
  energy_level      integer CHECK (energy_level BETWEEN 1 AND 5),
  blockers          text,
  -- Evening fields
  completed_tasks   text[] DEFAULT '{}',
  wins              text,
  tomorrow_plan     text,
  mood              integer CHECK (mood BETWEEN 1 AND 5),
  -- Metadata
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, checkin_date, checkin_type)
);

-- =====================================================
-- owner_updates: Fawzi's async owner updates to the team
-- =====================================================
CREATE TABLE IF NOT EXISTS owner_updates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         text NOT NULL,
  body          text NOT NULL,
  priority      text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  pinned        boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- owner_update_reads: Track which team members have read each update
-- =====================================================
CREATE TABLE IF NOT EXISTS owner_update_reads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id       uuid NOT NULL REFERENCES owner_updates(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (update_id, profile_id)
);

-- =====================================================
-- task_time_logs: Track time spent on tasks per user session
-- =====================================================
CREATE TABLE IF NOT EXISTS task_time_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id         uuid REFERENCES tasks(id) ON DELETE SET NULL,
  project_id      uuid REFERENCES projects(id) ON DELETE SET NULL,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  duration_minutes integer GENERATED ALWAYS AS (
    CASE
      WHEN ended_at IS NOT NULL
      THEN GREATEST(0, EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)::integer
      ELSE NULL
    END
  ) STORED,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_daily_checkins_workspace_date ON daily_checkins(workspace_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_profile_date ON daily_checkins(profile_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_owner_updates_workspace ON owner_updates(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_updates_pinned ON owner_updates(workspace_id, pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS idx_owner_update_reads_update ON owner_update_reads(update_id);
CREATE INDEX IF NOT EXISTS idx_owner_update_reads_profile ON owner_update_reads(profile_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_workspace_profile ON task_time_logs(workspace_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_task ON task_time_logs(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_time_logs_project ON task_time_logs(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_time_logs_started ON task_time_logs(started_at DESC);

-- =====================================================
-- Row Level Security
-- =====================================================
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_update_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_logs ENABLE ROW LEVEL SECURITY;

-- daily_checkins: workspace members can read all, users can write their own
CREATE POLICY "daily_checkins_read" ON daily_checkins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = daily_checkins.workspace_id
        AND workspace_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "daily_checkins_insert" ON daily_checkins
  FOR INSERT WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = daily_checkins.workspace_id
        AND workspace_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "daily_checkins_update" ON daily_checkins
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "daily_checkins_delete" ON daily_checkins
  FOR DELETE USING (profile_id = auth.uid());

-- owner_updates: workspace members can read, admins can write
CREATE POLICY "owner_updates_read" ON owner_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = owner_updates.workspace_id
        AND workspace_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "owner_updates_write" ON owner_updates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- owner_update_reads: users can read/write their own read records
CREATE POLICY "owner_update_reads_select" ON owner_update_reads
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "owner_update_reads_insert" ON owner_update_reads
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- task_time_logs: workspace members can read all, users can write their own
CREATE POLICY "task_time_logs_read" ON task_time_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = task_time_logs.workspace_id
        AND workspace_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "task_time_logs_insert" ON task_time_logs
  FOR INSERT WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = task_time_logs.workspace_id
        AND workspace_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "task_time_logs_update" ON task_time_logs
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "task_time_logs_delete" ON task_time_logs
  FOR DELETE USING (profile_id = auth.uid());
