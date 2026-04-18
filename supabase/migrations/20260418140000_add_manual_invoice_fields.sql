-- Manual invoices alongside Zoho-synced ones.
--
-- `source` distinguishes the two so the Zoho sync upsert never clobbers a
-- manual row. `pdf_url` stores the storage path inside the project-files
-- bucket (NOT a public URL — the portal generates a signed URL on demand).

ALTER TABLE financial_invoices
  ADD COLUMN IF NOT EXISTS pdf_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- Backfill: every existing row came from Zoho sync, so tag them now.
UPDATE financial_invoices SET source = 'zoho' WHERE source = 'manual';

-- Optional sanity check: only allow the two known sources.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_invoices_source_check'
  ) THEN
    ALTER TABLE financial_invoices
      ADD CONSTRAINT financial_invoices_source_check
      CHECK (source IN ('zoho', 'manual'));
  END IF;
END $$;
