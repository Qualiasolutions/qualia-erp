---
phase: 26-team-sync-daily-structure
plan: 06
subsystem: ui
tags: [react, shadcn, swr, team-dashboard, check-in, daily-flow, linear-style]

# Dependency graph
requires:
  - phase: 26-04
    provides: createDailyCheckin, getTodaysCheckin, getCheckins server actions + SWR hooks
  - phase: 26-05
    provides: useTeamTaskDashboard SWR hook + getTeamTaskDashboard action

provides:
  - TeamTaskCard component with priority/status/due-date/time visualization
  - TeamTaskContainer with admin grouped view + employee flat view
  - AdminCheckinsSection with date/profile filters collapsible panel
  - CheckinModal forcing employee morning check-in before dashboard access
  - workspaceId threaded through today-page → TodayDashboard → TeamTaskContainer

affects: [today-dashboard, team-sync, daily-structure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Force-modal pattern using onEscapeKeyDown + onInteractOutside preventDefault
    - Lazy checkin loading in AdminCheckinsSection (loads on panel open, reloads on date change)
    - Employee gate: useTodaysCheckin(workspaceId only when isNonAdmin) → show modal if morning === null

key-files:
  created:
    - components/today-dashboard/team-task-card.tsx
    - components/today-dashboard/team-task-container.tsx
    - components/today-dashboard/checkin-modal.tsx
  modified:
    - components/today-dashboard/index.tsx
    - app/today-page.tsx

key-decisions:
  - 'Removed currentUserId from TeamTaskContainer props since server action derives identity from auth.uid()'
  - 'AdminCheckinsSection does lazy loading: fetches only when panel opened, not on component mount'
  - 'Employee checkin gate uses useTodaysCheckin with null workspaceId for admins to skip fetch entirely'
  - 'CheckinModal maps multi-line textarea input to planned_tasks string array (one item per line)'

patterns-established:
  - 'Force-modal: onEscapeKeyDown + onInteractOutside both call e.preventDefault() to block dismissal'
  - 'Lazy admin panel: useState([]) + load on toggle + reload on filter change vs SWR auto-refresh'

# Metrics
duration: 25min
completed: 2026-03-15
---

# Phase 26 Plan 06: Team Task UI + Check-in Modal Summary

**Linear-style team task dashboard with per-person collapsible groups, time-spent badges, and a force-dismissal morning check-in modal gating employee dashboard access**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-15T03:08:46Z
- **Completed:** 2026-03-15T03:33:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- TeamTaskCard renders each task as a horizontal row: priority colored dot, status circle (hollow/filled), title/project stacked, due-date chip (red if overdue, amber if today), time-spent badge from time_log
- TeamTaskContainer wires useTeamTaskDashboard SWR hook — admins see collapsible MemberGroup sections per team member with task count badge, employees see flat list of own tasks
- AdminCheckinsSection: lazy-loaded collapsible inside TeamTaskContainer, date picker + profile Select filter, maps DailyCheckin records to morning/evening rows with planned/completed task lists
- CheckinModal blocks employee dashboard until morning check-in submitted — not closeable via backdrop or Escape, submits createDailyCheckin and invalidates SWR cache
- workspaceId prop added to TodayDashboardProps and threaded from today-page.tsx server component

## Task Commits

1. **Task 1: Team task container + task card + index + today-page** - `f8bbc2e` (feat)
2. **Task 2: Daily check-in modal** - `ab6fc62` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `components/today-dashboard/team-task-card.tsx` - Horizontal task row with priority/status/due/time badges
- `components/today-dashboard/team-task-container.tsx` - Admin grouped view + employee flat view + AdminCheckinsSection
- `components/today-dashboard/checkin-modal.tsx` - Force check-in dialog, non-dismissable
- `components/today-dashboard/index.tsx` - Added workspaceId prop, TeamTaskContainer render, CheckinModal gate
- `app/today-page.tsx` - Pass workspaceId to TodayDashboard

## Decisions Made

- Removed `currentUserId` from `TeamTaskContainer` props — the server action `getTeamTaskDashboard` derives identity from `auth.uid()`, no need to pass it
- AdminCheckinsSection uses lazy loading (fetch on open, not on mount) to avoid unnecessary admin checkin queries on every dashboard load
- Checkin gate uses `useTodaysCheckin(isNonAdmin ? workspaceId : null)` — admins skip fetch entirely via null key

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- ESLint pre-commit hook caught: unused `dotColor` variable, unused `Button` import, unescaped apostrophe in JSX text, unused `currentUserId` parameter — all fixed before final commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All team task UI components are in place, wired to server actions from plans 04-05
- Plan 07 (if any remaining) can build on this foundation
- The AdminCheckinsSection currently shows checkin data in a read-only format — could be extended with edit/delete in a future plan

---

_Phase: 26-team-sync-daily-structure_
_Completed: 2026-03-15_
