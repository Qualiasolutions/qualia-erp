---
phase: quick-22
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/today-dashboard/index.tsx
  - components/portal/portal-hub.tsx
autonomous: true

must_haves:
  truths:
    - 'Manager users see only their own schedule column on the dashboard (single-column, read-only)'
    - 'Employee users continue to see only their own schedule (existing behavior unchanged)'
    - 'Admin users continue to see the full multi-column team schedule'
    - 'Portal hub client grid renders client initials avatar and last-login label cleanly'
  artifacts:
    - path: 'components/today-dashboard/index.tsx'
      provides: 'isNonAdmin flag replacing isEmployee for schedule scoping'
      contains: 'isNonAdmin'
    - path: 'components/portal/portal-hub.tsx'
      provides: 'Client cards with avatar initials and last-sign-in display'
  key_links:
    - from: 'components/today-dashboard/index.tsx'
      to: 'components/schedule-block.tsx'
      via: 'profiles, unified, readOnly props'
      pattern: "profiles=\\{isNonAdmin"
---

<objective>
Two targeted improvements:

1. **Dashboard schedule scoping** — managers currently see the full multi-column team schedule (same as admin). They should only see their own schedule, same as employees. Fix: replace `isEmployee` flag with `isNonAdmin` (`userRole !== 'admin'`) for all schedule-related conditionals.

2. **Portal hub design polish** — add client avatar initials (gradient circle, first letter of name) to client cards in the portal hub grid, and render last sign-in date as a human-readable label ("Last seen 2d ago" / "Never signed in").

Purpose: Managers should not have visibility into the full team's daily schedule. The portal hub client cards currently lack visual identity anchors.
Output: Modified `index.tsx` (schedule logic) and `portal-hub.tsx` (card design).
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/quick/22-dashboard-user-scoped-schedule-admin-por/22-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix schedule scoping — isEmployee → isNonAdmin</name>
  <files>components/today-dashboard/index.tsx</files>
  <action>
    In `components/today-dashboard/index.tsx`, replace the single `isEmployee` constant on line 51 with `isNonAdmin`:

    ```ts
    // Before
    const isEmployee = userRole === 'employee';

    // After
    const isNonAdmin = userRole !== 'admin';
    ```

    Then replace ALL four uses of `isEmployee` with `isNonAdmin`:

    1. Line 102: `{!isEmployee && (` → `{!isNonAdmin && (`  (Plus button in header)
    2. Line 124: `{!isEmployee && (` → `{!isNonAdmin && (`  (Settings button in header)
    3. Lines 141–143: The ScheduleBlock props:
       - `profiles={isEmployee ? profiles.filter(...)` → `profiles={isNonAdmin ? profiles.filter(...)`
       - `unified={isEmployee}` → `unified={isNonAdmin}`
       - `readOnly={isEmployee}` → `readOnly={isNonAdmin}`
    4. Line 147: `{!isEmployee && (` → `{!isNonAdmin && (`  (BuildingProjectsRow)

    Do not change any other logic. The `isNonAdmin` flag means: admin = full team view + controls, everyone else (manager, employee) = single-column own schedule, read-only, no + button, no settings, no building row.

  </action>
  <verify>
    `npx tsc --noEmit` passes with no errors in this file.
    Grep confirms no remaining `isEmployee` references in this file:
    `grep -n "isEmployee" components/today-dashboard/index.tsx` returns empty.
  </verify>
  <done>
    Admin users see full team schedule with Plus/Settings buttons and building row. Manager and employee users see only their own schedule column (single-column, read-only, no Plus/Settings, no building row).
  </done>
</task>

<task type="auto">
  <name>Task 2: Portal hub — client card avatar + last-seen label</name>
  <files>components/portal/portal-hub.tsx</files>
  <action>
    In the client card render block (around line 449 where `filtered.map((client) => ...)` begins), make two changes:

    **A. Add avatar initials circle** — In the "Top: Name + Status" row, prepend a gradient avatar before the name/email block:

    ```tsx
    <div className="flex items-start gap-3">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-qualia-500 to-qualia-700 text-[11px] font-semibold text-white shadow-sm">
        {client.name.charAt(0).toUpperCase()}
      </div>
      {/* Name + email — existing block, unchanged */}
      <div className="min-w-0 flex-1">
        ...
      </div>
      {/* Badge — existing, unchanged */}
    </div>
    ```

    **B. Add last-seen label** — At the bottom of the card (after the action buttons row), add a last sign-in line. Use `formatDistanceToNow` (already imported) to render human-readable time:

    ```tsx
    <p className="mt-2 text-[10px] text-muted-foreground/40">
      {client.lastSignIn
        ? `Last seen ${formatDistanceToNow(new Date(client.lastSignIn), { addSuffix: true })}`
        : 'Never signed in'}
    </p>
    ```

    Place this after the project count / action buttons, as the last element inside the card `div`.

    Do not change any functional logic, state, dialogs, or action handlers. Only modify the visual render of client cards.

  </action>
  <verify>
    `npx tsc --noEmit` passes with no errors in this file.
    Visually: each client card shows a teal gradient circle with first letter of name, and a "Last seen X ago" or "Never signed in" label at the bottom.
  </verify>
  <done>
    Portal hub client cards display avatar initials and last-sign-in date. No TypeScript errors. No functional regressions (dialogs, filters, actions all work as before).
  </done>
</task>

</tasks>

<verification>
After both tasks:
1. `npx tsc --noEmit` — no errors
2. `npm run lint` — no new lint errors
3. Manually verify: log in as a manager account → dashboard shows single-column schedule for that user only
4. Verify: admin account still sees full multi-column team schedule
</verification>

<success_criteria>

- `isNonAdmin` replaces `isEmployee` in all 4 locations in `components/today-dashboard/index.tsx`
- No `isEmployee` references remain in that file
- Portal hub client cards show avatar initials circle and last-seen label
- TypeScript compiles clean
  </success_criteria>

<output>
After completion, create `.planning/quick/22-dashboard-user-scoped-schedule-admin-por/22-SUMMARY.md`
</output>
