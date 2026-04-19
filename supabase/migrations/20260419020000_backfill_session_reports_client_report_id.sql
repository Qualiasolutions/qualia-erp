-- Backfill client_report_id on historical session_reports rows.
-- Before this migration: all 43 pre-v4.0.4 rows had NULL client_report_id
-- and rendered with a short-UUID fallback in the Framework Reports tab.
-- Strategy:
--   - Group by COALESCE(framework_project_id, project_name) so per-project
--     sequencing matches what /qualia-report does going forward.
--   - Assign QS-REPORT-NN in chronological submitted_at order.
--   - Respect rows that already have a client_report_id (from v4.0.4+ posts
--     or earlier hand-fills) by using MAX(existing_num) as the starting offset
--     per project. Existing IDs stay stable; new assignments continue the
--     sequence from where those left off.
-- Idempotent: re-running is a no-op because WHERE client_report_id IS NULL
-- has no matches on the second pass.

BEGIN;

WITH ordered_nulls AS (
  SELECT
    id,
    COALESCE(framework_project_id, project_name) AS proj_key,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(framework_project_id, project_name)
      ORDER BY submitted_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM session_reports
  WHERE client_report_id IS NULL
),
project_max AS (
  SELECT
    COALESCE(framework_project_id, project_name) AS proj_key,
    COALESCE(
      MAX((regexp_match(client_report_id, '^QS-REPORT-(\d+)$'))[1]::INT),
      0
    ) AS max_num
  FROM session_reports
  WHERE client_report_id LIKE 'QS-REPORT-%'
  GROUP BY COALESCE(framework_project_id, project_name)
)
UPDATE session_reports sr
SET client_report_id = 'QS-REPORT-' || LPAD((COALESCE(pm.max_num, 0) + ordered.rn)::text, 2, '0')
FROM ordered_nulls ordered
LEFT JOIN project_max pm ON pm.proj_key = ordered.proj_key
WHERE sr.id = ordered.id
  AND sr.client_report_id IS NULL;

COMMIT;

-- Verification (run after applying):
--   SELECT COUNT(*) FILTER (WHERE client_report_id IS NULL) AS still_null
--   FROM session_reports;
--   -- expect 0
--
--   SELECT project_name, framework_project_id, client_report_id, submitted_at
--   FROM session_reports
--   WHERE client_report_id LIKE 'QS-REPORT-%'
--   ORDER BY COALESCE(framework_project_id, project_name), submitted_at;
--   -- expect per-project sequential numbering

-- ROLLBACK (manual; paste into a new migration if needed — NEVER inline):
-- begin;
--   UPDATE session_reports
--   SET client_report_id = NULL
--   WHERE client_report_id LIKE 'QS-REPORT-%'
--     AND (submitted_at < '2026-04-19T00:00:00Z');  -- preserve new v4.0.4 posts
-- commit;
