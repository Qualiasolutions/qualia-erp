-- Session reports v4.2 columns for qualia-framework
--
-- Framework v4.2 sends two new fields in the /api/v1/reports payload that the
-- ERP currently strips silently (Zod payloadSchema doesn't list them, so the
-- values never reach the row insert). See qualia-framework
-- docs/erp-report-contract.md for the full audit.
--
--   client_id          — UUID FK to public.clients. Lets the ERP key reports
--                         against the canonical clients table instead of fuzzy
--                         matching the display-name `client` text column.
--                         Nullable: legacy payloads and brand-new projects
--                         that haven't been linked yet send empty/null.
--
--   framework_version  — semver string of qualia-framework that produced the
--                         payload (e.g. "4.2.0"). Lets the ERP gate validation
--                         rules per schema age and surface "this client is on
--                         an old framework" warnings in the admin UI.

BEGIN;

-- ────────────────────────────────────────────────────────────
-- New columns
-- ────────────────────────────────────────────────────────────

ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS framework_version text;

-- ────────────────────────────────────────────────────────────
-- Foreign key
-- ────────────────────────────────────────────────────────────
-- ON DELETE SET NULL — deleting a client must not cascade-delete its history
-- of session reports. The reports stay, just unlinked. The display-name
-- `client` text column is still on the row for human reference.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_reports_client_id_fkey'
  ) THEN
    ALTER TABLE session_reports
      ADD CONSTRAINT session_reports_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- Indexes
-- ────────────────────────────────────────────────────────────
-- Reports-by-client queries (admin Reports tab filtered by client) are the
-- hot read path. Partial index — most reports have client_id = NULL during
-- the rollout window and we don't want to index them.
CREATE INDEX IF NOT EXISTS session_reports_client_id_idx
  ON session_reports(client_id, submitted_at DESC)
  WHERE client_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- Column documentation
-- ────────────────────────────────────────────────────────────

COMMENT ON COLUMN session_reports.client_id IS 'UUID FK to public.clients. Sent by qualia-framework v4.2+ when the project is linked to an ERP client. NULL for legacy payloads and unlinked projects. Prefer this over the `client` text column when joining.';
COMMENT ON COLUMN session_reports.framework_version IS 'Semver of qualia-framework that produced the payload (e.g. "4.2.0"). NULL for pre-v4.2 payloads. Used to gate validation rules and surface staleness warnings in the admin UI.';

COMMIT;

-- ────────────────────────────────────────────────────────────
-- DOWN (manual rollback reference — do not execute automatically)
-- ────────────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS session_reports_client_id_idx;
-- ALTER TABLE session_reports DROP CONSTRAINT IF EXISTS session_reports_client_id_fkey;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS framework_version;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS client_id;
