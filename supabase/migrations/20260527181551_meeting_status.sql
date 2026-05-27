-- Meeting status lifecycle.
--
-- Background: until now, a row in `meetings` was implicitly confirmed —
-- either an admin created it directly (Quick Schedule) or it landed via
-- a public booking (qualiasolutions.net/contact). We are introducing a
-- third path: portal clients can submit a meeting REQUEST from their
-- dashboard. Admins then confirm or decline that request.
--
-- Schema change:
--   * Add `meetings.status` text, default 'confirmed', with a CHECK
--     constraint pinning the value set to a small enum.
--   * Backfill: every existing row was created by an admin/booking and
--     is therefore 'confirmed'. The column default + the IS NULL
--     backfill below cover both fresh inserts and existing rows.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + DROP CONSTRAINT IF EXISTS so
-- re-running this migration on a database that has already received it
-- is a no-op.

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed';

-- Backfill any rows that pre-date the default (paranoid, NOT NULL above
-- should already cover this — kept for migrations re-applied against
-- pre-existing rows that were created before the column was added).
UPDATE public.meetings SET status = 'confirmed' WHERE status IS NULL;

ALTER TABLE public.meetings
  DROP CONSTRAINT IF EXISTS meetings_status_check;

ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_status_check
  CHECK (status IN ('confirmed', 'requested', 'declined', 'cancelled'));

-- Index for the admin "pending requests" view. Partial index keeps it
-- small — almost every row will be 'confirmed', the requested set is
-- typically a handful at a time.
CREATE INDEX IF NOT EXISTS meetings_status_requested_idx
  ON public.meetings (workspace_id, start_time)
  WHERE status = 'requested';
