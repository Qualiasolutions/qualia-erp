# Public Bookings Sync — Verification & Smoke Test

**Date:** 2026-04-21
**Migration:** `20260420102118_add_public_bookings` (applied to production, ref `vbpzaiqovffpsroxaulv`)
**Purpose:** Verify that public bookings created via `qualiasolutions.net/contact` correctly mirror into the ERP `meetings` table and surface in the Schedule view.

## How the sync works

A BEFORE INSERT trigger on `public.public_bookings` named `mirror_public_booking_to_meeting` fires whenever a new booking row is inserted with `status = 'confirmed'`. The trigger:

1. Inserts a new row into `public.meetings` with:
   - `title = 'Public: ' || NEW.name` (the **detection key** used by the Schedule UI to mark public bookings)
   - `description` = a formatted block containing the booker's email, phone, timezone, and notes
   - `start_time` / `end_time` = the booking's slot times
2. Captures the new `meetings.id` and sets `NEW.meeting_id` so the `public_bookings` row links back to the mirrored meeting.

Because the trigger runs BEFORE INSERT, the meeting is guaranteed to exist in the same transaction as the booking. If the trigger or the meetings insert fails, the booking insert is aborted.

## Schema surface

```
public_bookings (
  id uuid, name text, email text, phone text,
  start_time timestamptz, end_time timestamptz,
  duration_minutes int, timezone text, notes text,
  status text default 'confirmed',
  meeting_id uuid → meetings(id) ON DELETE SET NULL,
  created_at timestamptz
)
```

RLS: enabled, service_role only. The marketing site writes via its own service_role key (see the ingest path at `qualiasolutions.net`). The ERP never writes directly — it only reads the mirrored meetings.

## Smoke test (run via Supabase MCP `execute_sql`)

### Step 1 — Insert a test booking

```sql
INSERT INTO public.public_bookings (
  name, email, phone, start_time, end_time, duration_minutes, timezone, notes, status
)
VALUES (
  'Sync Smoke Test',
  'smoke@example.com',
  '+35700000000',
  (now() + interval '1 day')::timestamptz,
  (now() + interval '1 day' + interval '30 minutes')::timestamptz,
  30,
  'Europe/Nicosia',
  'Automated smoke test — safe to delete.',
  'confirmed'
);
```

### Step 2 — Verify the mirror

```sql
SELECT
  pb.id AS booking_id,
  pb.meeting_id,
  m.title,
  m.start_time,
  m.end_time,
  m.description
FROM public.public_bookings pb
LEFT JOIN public.meetings m ON m.id = pb.meeting_id
WHERE pb.email = 'smoke@example.com'
ORDER BY pb.created_at DESC
LIMIT 1;
```

**Expected:** one row where `meeting_id` is non-NULL, `title = 'Public: Sync Smoke Test'`, `start_time`/`end_time` match the insert, and `description` contains `smoke@example.com` and `Europe/Nicosia`.

### Step 3 — UI verification

Open `portal.qualiasolutions.net/schedule`. Navigate to tomorrow's date. The meeting titled `Public: Sync Smoke Test` should appear in the week grid with a small teal dot indicator in the top-right of the event block (Task 1 feature). Clicking it should open the popover with a `Public` badge next to the title.

### Step 4 — Cleanup

```sql
-- Delete the meeting first; the public_bookings.meeting_id will be nulled (ON DELETE SET NULL)
DELETE FROM public.meetings WHERE title = 'Public: Sync Smoke Test';

-- Then delete the booking
DELETE FROM public.public_bookings WHERE email = 'smoke@example.com' AND name = 'Sync Smoke Test';
```

## FK cascade behavior

The FK constraint `public_bookings.meeting_id → meetings(id) ON DELETE SET NULL` means:

- Deleting a meeting created from a public booking does **not** delete the booking row; it nullifies the link. The booking record is preserved as a historical audit trail.
- There is no cascade from booking → meeting. Deleting a `public_bookings` row leaves the mirrored meeting intact (intentional — the meeting may have been edited by an admin after the booking came in).

## Admin workflow

After Phase 22 Task 1 ships:

- Admins clicking any meeting (public or internal) get Edit/Delete buttons in the popover.
- Editing a `Public: X` meeting updates only the `meetings` row — the `public_bookings` source row is not back-synced. This is acceptable because bookings are immutable intent from the client; the meeting is the internal representation the team actually works off.
- Deleting a `Public: X` meeting nullifies `public_bookings.meeting_id` but leaves the booking record.

## Next verification run

Re-run this smoke test after any of the following changes:

- Modifying the `mirror_public_booking_to_meeting` trigger (any migration touching that function)
- Schema changes to `public_bookings` or `meetings`
- Changes to the ingest path on `qualiasolutions.net` (outside this repo — but smoke test still validates the end-to-end contract)
