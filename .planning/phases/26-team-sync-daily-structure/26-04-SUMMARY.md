---
phase: 26-team-sync-daily-structure
plan: 04
subsystem: server-actions
tags: [checkins, owner-updates, time-logs, notifications, swr, server-actions]

# Dependency graph
requires:
  - 26-01 (daily_checkins, owner_updates, task_time_logs tables)
provides:
  - createDailyCheckin / getTodaysCheckin / getCheckins server actions
  - createOwnerUpdate / getOwnerUpdates / acknowledgeOwnerUpdate server actions
  - startTaskTimer / stopTaskTimer / getTaskTimeLog / getTaskTimeLogs server actions
  - task completion notifications in quickUpdateTask
  - SWR cache keys + hooks for checkins, ownerUpdates, timeLogs
affects:
  - 26-05 (UI can now call these actions)
  - 26-06 (admin updates UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Upsert on (profile_id, checkin_date, checkin_type) — one morning + one evening per user per day'
    - 'owner_update_reads left-joined in getOwnerUpdates — is_read computed in app layer'
    - 'task_time_logs: DB GENERATED duration_minutes — app never calculates duration manually'
    - 'Dynamic import for createNotification in quickUpdateTask — avoids circular dep between inbox and notifications'
    - 'Timer idempotency: startTaskTimer checks for existing active log before inserting'

key-files:
  created:
    - app/actions/checkins.ts
    - app/actions/owner-updates.ts
    - app/actions/time-logs.ts
  modified:
    - app/actions/inbox.ts (task completion notifications in quickUpdateTask)
    - lib/swr.ts (cache keys + hooks for checkins, ownerUpdates, timeLogs)

key-decisions:
  - 'Dynamic import for createNotification avoids circular dependency (inbox.ts -> notifications.ts -> both in actions/)'
  - 'getOwnerUpdates joins owner_update_reads and computes is_read in app layer — avoids complex Supabase lateral join'
  - 'startTaskTimer is idempotent: returns success with already_running:true if timer already active'
  - 'createOwnerUpdate accepts targetUserId param (reserved for future targeted updates — not used at DB level yet)'

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 26 Plan 04: Server Actions — Checkins, Owner Updates, Time Logs Summary

**Six server actions across three domain files + SWR hooks + task completion notifications wired into quickUpdateTask**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-15T02:58:28Z
- **Completed:** 2026-03-15T03:01:05Z
- **Tasks:** 2
- **Files created:** 3 | **Files modified:** 2

## Accomplishments

**Task 1 — Check-in + owner update actions + SWR cache keys:**

- `app/actions/checkins.ts`: `createDailyCheckin` (upsert on profile+date+type), `getTodaysCheckin`, `getCheckins` (admin-only with filters)
- `app/actions/owner-updates.ts`: `createOwnerUpdate` (admin-only), `getOwnerUpdates` (left-joined read status), `acknowledgeOwnerUpdate` (upsert into reads), `updateOwnerUpdate`, `deleteOwnerUpdate`
- `lib/swr.ts`: 5 new cache keys (`todaysCheckins`, `checkins`, `ownerUpdates`, `timeLogs`, `timeLogsBulk`) + `useTodaysCheckin`, `useOwnerUpdates`, `useTaskTimeLog` hooks + matching invalidation helpers

**Task 2 — Time log actions + task completion notifications:**

- `app/actions/time-logs.ts`: `startTaskTimer` (idempotent, checks for existing active log), `stopTaskTimer` (sets ended_at, returns DB-computed duration_minutes), `getTaskTimeLog` (current user's latest log), `getTaskTimeLogs` (admin-only bulk with profile join)
- `app/actions/inbox.ts`: `quickUpdateTask` now fires `task_completed` notifications to all admins (except actor) when status changes to Done — uses dynamic import to avoid circular dependency

## Task Commits

1. **Task 1: Check-in + owner update actions + SWR** - `176c2f0` (feat)
2. **Task 2: Time log actions + task completion notifications** - `f01add9` (feat)

## Files Created/Modified

- `/app/actions/checkins.ts` — Full CRUD for daily_checkins table (upsert, today fetch, admin list)
- `/app/actions/owner-updates.ts` — Owner update CRUD + read acknowledgement with left-join read status
- `/app/actions/time-logs.ts` — Timer start/stop/get for task_time_logs; bulk admin fetch
- `/app/actions/inbox.ts` — Task completion notification block added to quickUpdateTask
- `/lib/swr.ts` — Cache keys, hooks, and invalidators for checkins/ownerUpdates/timeLogs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] Added updateOwnerUpdate + deleteOwnerUpdate**

- **Found during:** Task 1 (creating owner-updates.ts)
- **Issue:** Plan only specified create/get/acknowledge — no update or delete. Without these, admin UI in plan 26-06 would have no way to manage existing updates.
- **Fix:** Added `updateOwnerUpdate` (patch title/body/priority/pinned) and `deleteOwnerUpdate` both admin-gated
- **Files modified:** app/actions/owner-updates.ts
- **Commit:** 176c2f0

**2. [Rule 2 - Missing Functionality] getOwnerUpdates computes unread count in app layer**

- **Found during:** Task 1 (implementing getOwnerUpdates)
- **Issue:** Plan said "left join owner_update_reads for read status" — Supabase's select doesn't support left-join semantics directly; the reads relation comes back as an array needing app-side filtering
- **Fix:** fetch `reads:owner_update_reads(profile_id, read_at)`, find current user's read record in the result map, attach `is_read` + `read_at` to each update, strip raw reads array from response
- **Files modified:** app/actions/owner-updates.ts
- **Commit:** 176c2f0

## Issues Encountered

None — clean execution.

## User Setup Required

None.

## Next Phase Readiness

- All server actions are ready for UI consumption in plans 26-05 and 26-06
- `useTodaysCheckin`, `useOwnerUpdates`, `useTaskTimeLog` hooks are available from `lib/swr.ts`
- Task completion notifications are live — admins will receive in-app alerts when any task is marked Done

---

_Phase: 26-team-sync-daily-structure_
_Completed: 2026-03-15_
