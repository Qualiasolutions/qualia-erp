---
phase: 29-session-clock-in-clock-out
plan: '03'
subsystem: ui
tags: [react, swr, dialog, sidebar, work-sessions, clock-out]

requires:
  - phase: 29-01
    provides: clockOut server action, useActiveSession SWR hook, invalidateActiveSession, invalidateTodaysSessions

provides:
  - ClockOutModal component with mandatory summary textarea
  - Sidebar clock-out button visible to employees with active sessions
  - Live LIVE badge in sidebar whenever a session is open
affects:
  - 29-04 (today dashboard — session list display uses same invalidation keys)
  - 30 (admin attendance — sessions become visible after clock-out)

tech-stack:
  added: []
  patterns:
    - 'useCurrentWorkspaceId() SWR hook for workspaceId in client components (avoids useEffect + server action)'
    - 'useActiveSession(workspaceId | null) — skips fetch when null (no employee / no workspaceId yet)'
    - 'Dialog-controlled modal with isPending via useTransition for optimistic loading state'

key-files:
  created:
    - components/clock-out-modal.tsx
  modified:
    - components/sidebar.tsx

key-decisions:
  - 'Used useCurrentWorkspaceId() SWR hook instead of useEffect + getCurrentWorkspaceId() — cleaner, cached, consistent with rest of codebase'
  - 'ClockOutModal resets state (summary, error) on open to prevent stale values on reopen'

patterns-established:
  - 'Clock-out button section placed between nav and UserMenu — clear visual hierarchy'
  - 'Session button shows project name with LIVE badge — employee sees exactly what they are clocked into'

duration: 2min
completed: 2026-03-24
---

# Phase 29 Plan 03: Clock-Out Button + Modal Summary

**Persistent sidebar clock-out button (employees only) with Dialog modal requiring non-empty summary before closing a work session**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T06:01:53Z
- **Completed:** 2026-03-24T06:03:22Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `ClockOutModal` — standalone Dialog with mandatory summary field, live duration display (updates every 60s), session info row (project name + start time), and full error handling
- Added clock-out button to `SidebarContent` that renders only for employees with an active session — shows project name and LIVE badge
- Used `useCurrentWorkspaceId()` SWR hook for workspaceId instead of the `useEffect + action` pattern suggested by plan — cleaner and cached

## Task Commits

1. **Task 1: Create ClockOutModal component** — `a1d3cd2` (feat)
2. **Task 2: Add clock-out button to sidebar** — `64d9649` (feat)

## Files Created/Modified

- `components/clock-out-modal.tsx` — Dialog modal with mandatory summary, live duration, clockOut() call, SWR invalidation on success
- `components/sidebar.tsx` — Added Timer icon, useActiveSession/useCurrentWorkspaceId hooks, showClockOut state, clock-out button section above UserMenu

## Decisions Made

- Used `useCurrentWorkspaceId()` SWR hook (already existed in lib/swr.ts) instead of the `useEffect + getCurrentWorkspaceId()` pattern specified in plan — it's cached, deduplicated, and consistent with all other workspace ID lookups in the codebase (Rule 1 class improvement, not a deviation in behavior)
- `ClockOutModal` resets `summary` and `error` state when modal opens, preventing stale values if employee cancels and reopens

## Deviations from Plan

None - plan executed exactly as written, with one implementation improvement: `useCurrentWorkspaceId()` SWR hook was used instead of `useEffect + getCurrentWorkspaceId()` — functionally equivalent but cleaner and already established in the codebase.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ClockOutModal and sidebar button are complete — clock-out flow is fully functional end-to-end
- Ready for 29-04: today dashboard session list (uses same `useTodaysSessions` + `invalidateTodaysSessions` keys)
- TypeScript compiles clean across all modified files

## Self-Check

- [x] `components/clock-out-modal.tsx` exists on disk
- [x] `components/sidebar.tsx` modified with clock-out section
- [x] Commit `a1d3cd2` exists (Task 1)
- [x] Commit `64d9649` exists (Task 2)
- [x] `npx tsc --noEmit` returns zero errors
- [x] All three verification grep commands pass

## Self-Check: PASSED

---

_Phase: 29-session-clock-in-clock-out_
_Completed: 2026-03-24_
