-- ERP v3.4.2 compat layer for qualia-framework
-- Adds: per-user API tokens, idempotent report ingest, polymorphic gap_cycles.
-- Reversible (see DOWN section at bottom, commented — run manually if needed).

-- ────────────────────────────────────────────────────────────
-- 1. api_tokens — per-user tokens replacing shared CLAUDE_API_KEY
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  scope text NOT NULL DEFAULT 'reports:write' CHECK (scope IN ('reports:write', 'reports:read', 'admin')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_api_tokens_profile ON api_tokens(profile_id);
CREATE INDEX idx_api_tokens_hash ON api_tokens(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_tokens_expiry ON api_tokens(expires_at) WHERE revoked_at IS NULL;

ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

-- Users can see their own non-revoked tokens (metadata only — never token_hash via API)
CREATE POLICY "users see own tokens"
  ON api_tokens FOR SELECT
  USING ((SELECT auth.uid()) = profile_id);

-- Admins see all tokens
CREATE POLICY "admins see all tokens"
  ON api_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- Only admins can insert (via server action using service role anyway, but RLS is defense in depth)
CREATE POLICY "admins insert tokens"
  ON api_tokens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- Users can revoke their own tokens
CREATE POLICY "users revoke own tokens"
  ON api_tokens FOR UPDATE
  USING ((SELECT auth.uid()) = profile_id)
  WITH CHECK ((SELECT auth.uid()) = profile_id);

COMMENT ON TABLE api_tokens IS 'Per-user API tokens for qualia-framework ERP ingest. token_hash is sha256(plaintext). Plaintext shown once on issue.';
COMMENT ON COLUMN api_tokens.token_prefix IS 'First 12 chars of plaintext for display (e.g. qlt_abc123de). Never unique or authoritative.';

-- ────────────────────────────────────────────────────────────
-- 2. idempotency_keys — 24h dedupe window for POST /api/v1/reports
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key uuid PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES session_reports(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_idempotency_keys_created_at ON idempotency_keys(created_at);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
-- No policies — service_role only. Ingest-path table.

COMMENT ON TABLE idempotency_keys IS 'Idempotency-Key header dedupe for /api/v1/reports. 24h window enforced by cleanup cron.';

-- ────────────────────────────────────────────────────────────
-- 3. session_reports — additive columns for v3.4.2 compat
-- ────────────────────────────────────────────────────────────

-- gap_cycles stays integer for back-compat (flattened current-phase value).
-- Full object shape goes into gap_cycles_raw when provided by v3.5+ clients.
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS gap_cycles_raw jsonb;
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS token_id uuid REFERENCES api_tokens(id) ON DELETE SET NULL;
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS auth_method text CHECK (auth_method IN ('legacy_shared_key', 'per_user_token'));

CREATE INDEX IF NOT EXISTS idx_session_reports_idempotency_key ON session_reports(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_reports_token ON session_reports(token_id);

COMMENT ON COLUMN session_reports.gap_cycles IS 'Current-phase gap cycle count (int). For v3.5+ object shape, see gap_cycles_raw.';
COMMENT ON COLUMN session_reports.gap_cycles_raw IS 'Full gap_cycles object from v3.5+ clients (e.g. {"1": 0, "2": 1}). Null for legacy v3.4.1 clients.';
COMMENT ON COLUMN session_reports.auth_method IS 'Which auth path ingested this report. legacy_shared_key will be revoked in v3.6.';

-- ────────────────────────────────────────────────────────────
-- DOWN (manual rollback reference — do not execute automatically)
-- ────────────────────────────────────────────────────────────
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS auth_method;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS token_id;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS idempotency_key;
-- ALTER TABLE session_reports DROP COLUMN IF EXISTS gap_cycles_raw;
-- DROP TABLE IF EXISTS idempotency_keys;
-- DROP TABLE IF EXISTS api_tokens;
