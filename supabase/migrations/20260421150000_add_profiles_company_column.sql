-- Add the `company` column to profiles.
--
-- Settings page (app/(portal)/settings/settings-content.tsx) and the
-- updateClientProfile server action already read/write this column, but it
-- was never created — so every save errored silently (UPDATE referencing a
-- non-existent column), and the page-level SELECT returned .data = null
-- which showed an empty form on load. Adding the column unblocks both.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT;
