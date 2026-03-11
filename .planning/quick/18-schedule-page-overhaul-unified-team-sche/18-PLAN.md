---
phase: quick-18
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/new-meeting-modal.tsx
  - app/actions/meetings.ts
autonomous: true

must_haves:
  truths:
    - 'User can select team members when creating a meeting'
    - 'Selected attendees are persisted to meeting_attendees after creation'
    - "Meetings appear on each attendee's column in ScheduleBlock automatically"
  artifacts:
    - path: 'components/new-meeting-modal.tsx'
      provides: 'Multi-select attendee picker for profiles'
    - path: 'app/actions/meetings.ts'
      provides: 'Batch attendee insert after meeting creation'
  key_links:
    - from: 'components/new-meeting-modal.tsx'
      to: 'app/actions/meetings.ts'
      via: 'attendee_ids[] passed in FormData'
      pattern: "formData\\.append.*attendee_ids"
    - from: 'app/actions/meetings.ts createMeeting'
      to: 'meeting_attendees table'
      via: 'supabase batch insert'
      pattern: 'meeting_attendees.*insert'
---

<objective>
Add attendee selection to the meeting creation modal so meetings show up on the correct team member columns in ScheduleBlock.

Purpose: ScheduleBlock already places meetings on per-attendee columns — it just needs attendees to actually be set. This wires the missing link.
Output: Modal with profile multi-select, attendees batch-inserted after meeting creation.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@components/new-meeting-modal.tsx
@app/actions/meetings.ts
@app/actions/auth.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add attendee multi-select to NewMeetingModal</name>
  <files>components/new-meeting-modal.tsx</files>
  <action>
    Add a team member multi-select picker to the form. Steps:

    1. Import `getProfiles` from `@/app/actions` (already exported from index.ts via auth.ts).

    2. Add state: `const [profiles, setProfiles] = useState<Array<{id: string; full_name: string | null; email: string}>>([])` and `const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([])`.

    3. In the `useEffect` that runs on `open`, call `getProfiles().then(data => setProfiles(data as ...))` and reset `setSelectedAttendeeIds([])`.

    4. Add an attendee picker section to the form AFTER the duration chips and BEFORE the meeting link. Use a compact toggle-button grid (not a dropdown) — render each profile as a pill button. Clicking toggles their ID in `selectedAttendeeIds`. Show avatar initial or full_name truncated. Style: selected = `bg-primary/10 text-primary border-primary/30`, unselected = `bg-secondary/50 text-muted-foreground`. Section label: "Team members" in the same style as "Duration".

    5. In `handleSubmit`, after building `formData`, append each selected attendee:
       ```
       selectedAttendeeIds.forEach(id => formData.append('attendee_ids', id));
       ```

    6. Update the summary card to show attendee count when attendees selected: `{selectedAttendeeIds.length > 0 && <span>{selectedAttendeeIds.length} attendee{selectedAttendeeIds.length > 1 ? 's' : ''}</span>}`.

    Do NOT change the Drawer/Dialog wrapper, submit logic, or any other form fields.

  </action>
  <verify>Open the New Meeting modal — a "Team members" section appears with profile pills. Selecting profiles highlights them. The summary card shows attendee count.</verify>
  <done>Team member pills render, toggle on click, count shows in summary.</done>
</task>

<task type="auto">
  <name>Task 2: Batch-insert attendees in createMeeting action</name>
  <files>app/actions/meetings.ts</files>
  <action>
    After the meeting insert succeeds (after the `if (error)` block that returns early), read attendee IDs from `formData` and batch-insert them into `meeting_attendees`.

    1. Extract attendee IDs: `const attendeeIds = formData.getAll('attendee_ids') as string[]`.

    2. If `attendeeIds.length > 0`, do a batch insert:
       ```typescript
       const attendeeRows = attendeeIds.map(profileId => ({
         meeting_id: data.id,
         profile_id: profileId,
       }));
       const { error: attendeeError } = await supabase
         .from('meeting_attendees')
         .insert(attendeeRows);
       if (attendeeError) {
         console.error('Error adding attendees:', attendeeError);
         // Non-fatal: meeting was created, just log
       }
       ```

    3. This logic goes BEFORE the `logClientActivity` call and AFTER the meeting insert success check.

    No schema changes needed — `meeting_attendees` table already exists with `meeting_id` and `profile_id` columns.
    Do NOT change the `createMeetingSchema` in validation.ts — attendee_ids come outside of Zod validation (raw formData.getAll after validation).

  </action>
  <verify>Create a meeting with 2 attendees selected. Check Supabase `meeting_attendees` table — 2 rows inserted with the correct meeting_id and profile_ids.</verify>
  <done>meeting_attendees rows exist after meeting creation with selected profile IDs. ScheduleBlock shows the meeting on both attendees' columns.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — no type errors
2. Create a test meeting selecting 2 team members → rows appear in `meeting_attendees`
3. Navigate to `/schedule` → meeting block appears on both attendees' columns in ScheduleBlock day view
</verification>

<success_criteria>

- Modal shows team member picker with profile pills
- Selecting profiles and submitting persists attendees to DB
- ScheduleBlock shows meeting on each selected attendee's column (no ScheduleBlock code changes needed)
- No TypeScript errors
  </success_criteria>

<output>
After completion, create `.planning/quick/18-schedule-page-overhaul-unified-team-sche/quick-18-01-SUMMARY.md`
</output>
