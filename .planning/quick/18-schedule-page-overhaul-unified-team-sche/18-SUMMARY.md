# Summary: Quick-18 — Schedule page: meeting attendee selection

## What was done

### Task 1: Attendee multi-select in NewMeetingModal

- Added team member pill buttons to meeting creation modal
- Profiles loaded via `getProfiles()` on modal open
- Toggle selection adds/removes from `selectedAttendeeIds`
- Summary card shows attendee count
- `attendee_ids` appended to FormData on submit

### Task 2: Batch-insert attendees in createMeeting action

- `createMeeting()` reads `formData.getAll('attendee_ids')` after meeting insert
- Batch inserts into `meeting_attendees` table (non-fatal on error)
- No schema changes needed — table already existed

### Bonus: Client revalidation fix

- Added `revalidatePath('/clients')` when a new client is created via custom_client_name in meeting modal

## Files modified

- `components/new-meeting-modal.tsx` — Attendee picker UI + FormData
- `app/actions/meetings.ts` — Batch attendee insert + client revalidation

## How it works end-to-end

1. User opens New Meeting modal → profiles load as pill buttons
2. User selects team members by clicking pills (highlighted when selected)
3. On submit, `attendee_ids` sent via FormData
4. `createMeeting()` creates meeting, then batch-inserts attendees
5. `ScheduleBlock` already checks `meeting.attendees` and renders on each attendee's column — no changes needed there

## Commit

ee44486
