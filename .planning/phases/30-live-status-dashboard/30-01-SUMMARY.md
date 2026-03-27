---
phase: 30
plan: "01"
subsystem: work-sessions
tags: [data-layer, swr, server-actions, admin, realtime]
dependency_graph:
  requires: []
  provides:
    - getTeamStatus server action (app/actions/work-sessions.ts)
    - useTeamStatus SWR hook (lib/swr.ts)
    - invalidateTeamStatus helper (lib/swr.ts)
    - TeamMemberStatus type (re-exported from lib/swr.ts)
  affects:
    - Phase 30 plans 02/03 (UI will consume useTeamStatus)
    - Phase 31 (clock-out enforcement will call invalidateTeamStatus)
tech_stack:
  added: []
  patterns:
    - 3-query pattern (profiles, open sessions, recent closed) for team presence
    - FK normalization (Array.isArray check) consistent with existing work-sessions actions
    - SWR 15s poll with isDocumentVisible() guard for near-realtime presence
    - Cascade invalidation: clock-in/out -> activeSession + todaysSessions -> teamStatus
key_files:
  created: []
  modified:
    - app/actions/work-sessions.ts
    - lib/swr.ts
decisions:
  - 3 queries instead of 2: profiles + open sessions + recent closed. Separate query for last
    closed session per offline user avoids a complex subquery and stays readable.
  - 15s poll interval (not 30s or 45s): team presence is near-realtime data, 15s matches
    the "ticking duration" intent from the plan spec.
  - invalidateTeamStatus called from invalidateActiveSession AND invalidateTodaysSessions:
    ensures any clock event immediately cascades to the admin dashboard without waiting for
    the next 15s poll.
metrics:
  duration: "~2 minutes"
  completed: "2026-03-27"
---

# Phase 30 Plan 01: Live Status Data Layer Summary

**One-liner:** `getTeamStatus` server action + `useTeamStatus` SWR hook (15s poll) for live employee presence, with cascade invalidation from clock-in/out events.

## Accomplishments

- Added `TeamMemberStatus` interface to `app/actions/work-sessions.ts` — captures online/offline state, active project name, session start time, and last session end time.
- Implemented `getTeamStatus(workspaceId)` — admin-gated server action using 3 queries: all profiles, all open sessions, most recent closed session per offline employee. Maps to `TeamMemberStatus[]` sorted online-first then alphabetically.
- Added `teamStatus` cache key to `cacheKeys` in `lib/swr.ts` (tuple format consistent with `clientActionItems`).
- Added `type-only` import + re-export of `TeamMemberStatus` from `lib/swr.ts` so consumers import from one place.
- Implemented `useTeamStatus(workspaceId | null)` — polls every 15 seconds when tab visible, stops when hidden. Returns `{ members, isLoading, isValidating, isError, error, revalidate }`.
- Implemented `invalidateTeamStatus(workspaceId, immediate?)` helper.
- Updated `invalidateActiveSession` and `invalidateTodaysSessions` to cascade invalidation to team status — clock events now immediately reflect in admin dashboard.

## Task Commits

| Task | Name                                               | Commit  | Files                        |
| ---- | -------------------------------------------------- | ------- | ---------------------------- |
| 1    | Add getTeamStatus server action                    | 5a0d751 | app/actions/work-sessions.ts |
| 2    | Add useTeamStatus SWR hook and invalidation helper | 9bee6d1 | lib/swr.ts                   |

## Files Created

None.

## Files Modified

- `/home/qualia/Projects/qualia-erp/app/actions/work-sessions.ts` — added `TeamMemberStatus` interface and `getTeamStatus()` action (+128 lines)
- `/home/qualia/Projects/qualia-erp/lib/swr.ts` — added cache key, type re-export, `useTeamStatus`, `invalidateTeamStatus`, cascade calls in existing invalidators (+53 lines net)

## Decisions Made

1. **3 queries max:** Profiles, open sessions, recent closed sessions. No complex subquery — keeps the action readable and debuggable.
2. **15s poll interval:** Matches the near-realtime presence requirement. Standard 45s autoRefresh is too slow for a live status dashboard.
3. **Cascade invalidation:** `invalidateActiveSession` and `invalidateTodaysSessions` now call `invalidateTeamStatus` — any clock event immediately refreshes the admin view without waiting for the 15s timer.
4. **Offline profile query optimization:** Only offline profiles are included in the last-closed-session query (filters out those with open sessions), reducing unnecessary DB rows.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- **30-02** (UI layer) is unblocked. `useTeamStatus` and `TeamMemberStatus` can be imported from `lib/swr.ts`.
- **30-03** (any dashboard features) depends on 30-02.
- **31** (clock-out enforcement) can call `invalidateTeamStatus` directly from its server actions.

## Self-Check

- [x] `getTeamStatus` exported from `app/actions/work-sessions.ts` — FOUND
- [x] `useTeamStatus` exported from `lib/swr.ts` — FOUND
- [x] `invalidateTeamStatus` exported from `lib/swr.ts` — FOUND
- [x] `teamStatus` in `cacheKeys` — FOUND
- [x] Commit 5a0d751 exists — FOUND
- [x] Commit 9bee6d1 exists — FOUND
- [x] `npx tsc --noEmit` passes — PASS

## Self-Check: PASSED
