-- Session reports v4.0.4 UPSERT index fix
-- The initial v4.0.4 migration (20260419120000) created a PARTIAL unique index
-- (WHERE client_report_id IS NOT NULL AND framework_project_id IS NOT NULL).
-- Postgres supports ON CONFLICT on partial indexes, but Supabase JS client's
-- .upsert({...}, { onConflict: 'col1,col2' }) translates to plain
-- ON CONFLICT (col1, col2) without the WHERE predicate — which the resolver
-- cannot match against a partial index, producing:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
--
-- Fix: replace with a plain unique index. NULL semantics are identical for our
-- use: Postgres (pre-15 default) treats NULLs as DISTINCT in composite uniques,
-- so multiple rows with NULL framework_project_id or NULL client_report_id
-- coexist. Only rows where BOTH columns are non-null are constrained — which
-- is exactly when v4.0.4 payloads arrive and we want UPSERT semantics.

BEGIN;

DROP INDEX IF EXISTS session_reports_client_report_id_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS session_reports_client_report_id_uniq
  ON session_reports(framework_project_id, client_report_id);

COMMENT ON INDEX session_reports_client_report_id_uniq IS
  'UPSERT dedupe key for v4.0.4+ payloads. Plain (non-partial) so Supabase .upsert() onConflict resolves. Multiple rows with NULL framework_project_id or NULL client_report_id coexist because NULLs are distinct in composite unique constraints (pre-PG15 default).';

COMMIT;

-- ────────────────────────────────────────────────────────────
-- DOWN (manual rollback reference)
-- ────────────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS session_reports_client_report_id_uniq;
-- CREATE UNIQUE INDEX IF NOT EXISTS session_reports_client_report_id_uniq
--   ON session_reports(framework_project_id, client_report_id)
--   WHERE client_report_id IS NOT NULL AND framework_project_id IS NOT NULL;
