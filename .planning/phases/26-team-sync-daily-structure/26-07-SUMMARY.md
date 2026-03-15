---
phase: 26-team-sync-daily-structure
plan: 07
subsystem: ui
tags: [react, owner-updates, time-tracking, team-dashboard, swr]

# Dependency graph
requires:
  - phase: 26-04
    provides: owner_updates + owner_update_reads tables + server actions
  - phase: 26-05
    provides: task_time_logs table + startTaskTimer/stopTaskTimer actions
  - phase: 26-06
    provides: TeamTaskContainer + TeamTaskCard base components, useTeamTaskDashboard SWR hook
provides:
  - OwnerUpdatesBanner: employee-facing unread update banner with pagination + acknowledge
  - OwnerUpdatesCompose: admin-facing collapsible compose panel
  - TaskTimeTracker: interactive timer button (play/running/done) for task owners
  - TeamTaskCard: now renders TaskTimeTracker (interactive or read-only)
  - TeamTaskContainer: threads currentUserId + revalidate callback through
affects: [dashboard, team-tasks, owner-updates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Timer state derived from timeLog prop on mount; syncs via useEffect on prop change'
    - 'Live counter at 10s interval via setInterval; cleaned up on unmount'
    - 'Owner updates banner dismisses per-update (acknowledge) or globally (X)'
    - 'Compose panel uses useTransition for non-blocking submit'

key-files:
  created:
    - components/today-dashboard/owner-updates-banner.tsx
    - components/today-dashboard/owner-updates-compose.tsx
    - components/task-time-tracker.tsx
  modified:
    - components/today-dashboard/index.tsx
    - components/today-dashboard/team-task-card.tsx
    - components/today-dashboard/team-task-container.tsx

key-decisions:
  - 'TaskTimeTracker derives running/done state from timeLog prop passed from parent (no separate SWR hook per card)'
  - 'onTaskUpdate callback triggers revalidate() on the useTeamTaskDashboard SWR hook to refresh all task data'
  - 'OwnerUpdatesBanner fetches server-side on mount (not SWR) to avoid showing dismissed updates on re-renders'
  - 'currentUserId prop added back to TeamTaskContainer for UI ownership check — distinct from server action auth'

patterns-established:
  - 'isOwner check: currentUserId != null && currentUserId === task.assignee_id (snake_case assignee_id)'
  - 'readOnly prop pattern: same component renders interactive or display-only based on role/ownership'

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 26 Plan 07: Owner Updates Banner + Task Time Tracker Summary

**Employee unread-updates banner with nav/acknowledge, admin compose panel, and interactive task timer button integrated into team task cards**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-15T03:14:34Z
- **Completed:** 2026-03-15T03:17:51Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- OwnerUpdatesBanner: slim left-border-accent banner loads unread updates on mount, supports N/N pagination, per-update acknowledge, and global dismiss via X
- OwnerUpdatesCompose: collapsible admin panel with title/body/target-user fields, posts via createOwnerUpdate and invalidates SWR cache
- TaskTimeTracker: three-state interactive timer (play / running elapsed counter + stop / done time badge), 10s counter refresh, server actions wired with dynamic import
- TeamTaskCard: isOwner guard renders interactive or read-only tracker; removed static timeSpent string in favor of component
- TeamTaskContainer: currentUserId threaded through MemberGroup and employee flat list; revalidate() called after timer updates

## Task Commits

1. **Task 1: Owner updates banner + compose UI** - `44206f0` (feat)
2. **Task 2: Task time tracker + team card integration** - `01552b3` (feat)

## Files Created/Modified

- `components/today-dashboard/owner-updates-banner.tsx` - Employee banner: loads unread updates, paginate, acknowledge, dismiss
- `components/today-dashboard/owner-updates-compose.tsx` - Admin compose: collapsible, title+body+target select, post action
- `components/task-time-tracker.tsx` - Three-state timer button: play/running/done, 10s live counter
- `components/today-dashboard/index.tsx` - Adds banner (employees) and compose (admins); passes currentUserId to TeamTaskContainer
- `components/today-dashboard/team-task-card.tsx` - isOwner check, renders TaskTimeTracker interactive or read-only
- `components/today-dashboard/team-task-container.tsx` - currentUserId prop, handleTaskUpdate callback, passes to MemberGroup + employee list

## Decisions Made

- TaskTimeTracker derives state from timeLog prop (passed from team-dashboard data) rather than its own SWR fetch — avoids N+1 hooks per task card
- revalidate() on useTeamTaskDashboard refreshes entire team data after timer start/stop — simpler than per-task invalidation
- OwnerUpdatesBanner does a one-time server fetch on mount (not SWR) so the banner doesn't reappear after user acknowledges during session
- currentUserId re-added to TeamTaskContainer as UI-only prop — server actions still derive identity from auth.uid(); decision #6 in STATE.md applied only to action calls

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 8 plans in phase 26 are now code-complete
- Ready for human verification: tsc, build, dashboard loads, check-in modal, owner updates banner, VAPI removed, admin checkins, design quality
- Pre-existing TypeScript errors in unrelated files (client-detail-view, database types) were present before this plan and are not introduced by plan 07

## Self-Check

- [x] `components/today-dashboard/owner-updates-banner.tsx` — exists
- [x] `components/today-dashboard/owner-updates-compose.tsx` — exists
- [x] `components/task-time-tracker.tsx` — exists
- [x] `components/today-dashboard/index.tsx` — modified
- [x] `components/today-dashboard/team-task-card.tsx` — modified
- [x] `components/today-dashboard/team-task-container.tsx` — modified
- [x] Commit `44206f0` — Task 1
- [x] Commit `01552b3` — Task 2

## Self-Check: PASSED

---

_Phase: 26-team-sync-daily-structure_
_Completed: 2026-03-15_
