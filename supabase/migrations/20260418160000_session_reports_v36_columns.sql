-- Session reports v3.6+ columns for qualia-framework
-- app/api/v1/reports/route.ts inserts these columns (lines 184-190) but they
-- do not exist yet in schema. Every POST from /qualia-report silently drops
-- milestone_name, milestones, team/project identifiers, and build/deploy telemetry.
-- This migration adds them so the ingest matches the payload contract.

ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS framework_project_id text;
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS milestone_name text;
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS milestones jsonb;
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS team_id text;
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS git_remote text;
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS session_started_at timestamptz;
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS last_pushed_at timestamptz;
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS build_count integer;
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS deploy_count integer;

-- (framework_project_id, team_id) is the canonical dedupe key per erp-contract.md.
-- Non-unique — multiple reports per project over time is expected.
CREATE INDEX IF NOT EXISTS idx_session_reports_framework_project
  ON session_reports(framework_project_id, team_id)
  WHERE framework_project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_reports_milestone
  ON session_reports(project_name, milestone)
  WHERE milestone IS NOT NULL;

COMMENT ON COLUMN session_reports.framework_project_id IS 'Stable project identifier from qualia-framework tracking.json.project_id. Together with team_id forms canonical key.';
COMMENT ON COLUMN session_reports.milestone_name IS 'Human-readable milestone name (e.g. "Foundation"). Paired with milestone integer.';
COMMENT ON COLUMN session_reports.milestones IS 'Array of milestone summaries: [{num, name, closed_at?, phases_completed?, tasks_completed?}]. Historical record of journey progress at report time.';
COMMENT ON COLUMN session_reports.team_id IS 'Qualia team identifier from tracking.json. With framework_project_id forms canonical key.';
COMMENT ON COLUMN session_reports.git_remote IS 'Git remote URL at report time (e.g. git@github.com:org/repo.git).';
COMMENT ON COLUMN session_reports.session_started_at IS 'When the framework session that produced this report began.';
COMMENT ON COLUMN session_reports.last_pushed_at IS 'Timestamp of last git push observed by the framework at report time.';
COMMENT ON COLUMN session_reports.build_count IS 'Lifetime build count from tracking.json.';
COMMENT ON COLUMN session_reports.deploy_count IS 'Lifetime deploy count from tracking.json.';

-- ────────────────────────────────────────────────────────────
-- DOWN (manual rollback reference — do not execute automatically)
-- ────────────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS idx_session_reports_milestone;
-- DROP INDEX IF EXISTS idx_session_reports_framework_project;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS deploy_count;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS build_count;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS last_pushed_at;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS session_started_at;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS git_remote;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS team_id;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS milestones;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS milestone_name;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS framework_project_id;
