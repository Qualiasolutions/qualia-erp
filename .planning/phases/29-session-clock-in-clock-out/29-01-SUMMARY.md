---
phase: 29-session-clock-in-clock-out
plan: 01
subsystem: api
tags: [supabase, swr, server-actions, attendance, work-sessions]

# Dependency graph
requires:
  - phase: 28-work-sessions-foundation
    provides: work_sessions table with profile_id, project_id, started_at, ended_at, duration_minutes, summary columns

provides:
  - clockIn server action (creates work_sessions row, blocks duplicate open sessions)
  - clockOut server action (closes session with summary + computed duration_minutes)
  - getActiveSession server action (open session for current user or null)
  - getTodaysSessions server action (all sessions today, open + closed)
  - getSessionsAdmin server action (admin-only, profile + project joins, date/profile/limit filters)
  - useActiveSession SWR hook (30s polling)
  - useTodaysSessions SWR hook (45s auto-refresh)
  - invalidateActiveSession, invalidateTodaysSessions, invalidateSessionsAdmin cache helpers
  - 3 new cacheKeys entries (activeSession, todaysSessions, sessionsAdmin)

affects:
  - 29-02-clock-in-modal
  - 29-03-clock-out-button
  - 29-04-admin-attendance

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'maybeSingle() for optional single-row queries (avoids error on no match)'
    - 'FK normalization: Array.isArray(row.profile) ? row.profile[0] || null : row.profile'
    - 'Dynamic imports in SWR fetchers for server actions'
    - '30s polling for active session (tighter than standard 45s autoRefreshConfig)'

key-files:
  created:
    - app/actions/work-sessions.ts
  modified:
    - lib/swr.ts

key-decisions:
  - 'Used maybeSingle() instead of single() for active session queries to avoid PostgREST PGRST116 errors when no session exists'
  - 'getSessionsAdmin date filter uses gte/lt on next-day boundary (not lte) to cover full UTC day'

patterns-established:
  - "Work session actions follow checkins.ts pattern: 'use server', createClient, auth check, error logging, revalidatePath"
  - 'SWR hooks use dynamic imports for server actions to avoid client-bundle pollution'

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 29 Plan 01: Work Session Server Actions and SWR Hooks Summary

**5 server actions (clockIn, clockOut, getActiveSession, getTodaysSessions, getSessionsAdmin) + 2 SWR hooks with 30s live polling and 3 cache invalidators for the work_sessions feature**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T05:58:19Z
- **Completed:** 2026-03-24T06:06:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `app/actions/work-sessions.ts` with all 5 server actions, full auth checks, FK normalization, and error logging
- Added `useActiveSession` (30s polling) and `useTodaysSessions` hooks to `lib/swr.ts`
- Added 3 cache keys and 3 invalidators — all downstream clock-in/out UI plans can import immediately

## Task Commits

Each task was committed atomically:

1. **Task 1: Create app/actions/work-sessions.ts** - `23f0d79` (feat)
2. **Task 2: Add session cache keys, SWR hooks, and invalidators to lib/swr.ts** - `f586949` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/actions/work-sessions.ts` - All 5 work session server actions with auth, validation, and FK normalization
- `lib/swr.ts` - 3 cache keys, 2 SWR hooks, 3 invalidators appended (no existing code modified)

## Decisions Made

- Used `maybeSingle()` instead of `single()` for queries that may return no rows (active session check) to avoid PostgREST error PGRST116
- Date filter in `getSessionsAdmin` uses `gte(date + T00:00:00Z)` and `lt(nextDay + T00:00:00Z)` to cover the full UTC calendar day correctly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All server actions and SWR hooks are ready for consumption
- Plan 29-02 (clock-in modal) and 29-03 (clock-out button) can import `clockIn`, `clockOut`, `useActiveSession`, `invalidateActiveSession`, `invalidateTodaysSessions` directly
- Plan 29-04 (admin attendance) can import `getSessionsAdmin` and `invalidateSessionsAdmin`

## Self-Check: PASSED

- app/actions/work-sessions.ts: FOUND
- lib/swr.ts: FOUND
- 29-01-SUMMARY.md: FOUND
- Commit 23f0d79: FOUND
- Commit f586949: FOUND

---

_Phase: 29-session-clock-in-clock-out_
_Completed: 2026-03-24_
