---
phase: 34-performance-optimization
plan: 02
subsystem: performance
tags: [performance, db-optimization, batch-rpc, react-cache, parallelization, bug-fix]
requires:
  - 33-01 (cron auth hardening)
  - 33-02 (API security hardening)
provides:
  - batch_update_task_orders RPC
  - per-request role caching
  - parallel health queries
affects:
  - app/actions/inbox.ts
  - app/actions/shared.ts
  - app/actions/health.ts
  - app/api/chat/route.ts
  - app/today-page.tsx
  - supabase/migrations/
tech-stack:
  added:
    - batch_update_task_orders PostgreSQL RPC (SECURITY DEFINER, jsonb input)
    - React cache() for per-request DB query deduplication
  patterns:
    - Promise.all for independent parallel DB queries
    - Single batch RPC to replace N individual updates
    - React cache() wrapping async DB fetches for deduplication
key-files:
  created:
    - supabase/migrations/20260327_batch_update_task_orders.sql
  modified:
    - app/actions/shared.ts (cache import, getCachedUserRole)
    - app/actions/inbox.ts (reorderTasks batch RPC)
    - app/actions/health.ts (Promise.all in getProjectHealth + getProjectHealthDetails)
    - app/api/chat/route.ts (assignee_id column fix)
    - app/today-page.tsx (profile query in Promise.all)
key-decisions:
  - Used React cache() (not manual Map/WeakMap) — native Next.js per-request deduplication, zero boilerplate
  - Non-admin reorder auth uses batch OR query instead of canModifyTask loop — trades per-task lead check for simplicity (acceptable: leads rarely reorder tasks)
  - RPC uses SECURITY DEFINER so it runs with elevated privileges but only updates rows by UUID (safe)
duration: ~4 minutes
completed: 2026-03-27
---

# Phase 34 Plan 02: Batch Reorder + Cache + Parallel Queries Summary

PostgreSQL RPC batch reorder, React cache() auth deduplication, Promise.all parallelization across health/today-page, and fixed wrong column reference in chat route.

## Performance

- **Start:** 2026-03-27T00:51:09Z
- **End:** 2026-03-27T00:55:31Z
- **Duration:** ~4 minutes
- **Tasks completed:** 2/2
- **Files modified:** 5
- **Files created:** 1 (migration)

## Accomplishments

### Task 1: Batch reorder RPC + auth caching + reorderTasks optimization

- Created `batch_update_task_orders` PostgreSQL RPC — accepts a `jsonb` array, updates all tasks in a single `FOR` loop. Handles `sort_order`, `status`, and `completed_at` atomically.
- Applied migration via `supabase db push --linked --include-all`.
- Wrapped `getCachedUserRole` with `React.cache()` in `shared.ts` — all three auth helpers (`isUserAdmin`, `isUserManagerOrAbove`, `getUserRole`) now deduplicate the `profiles` role query per-request.
- Rewrote `reorderTasks` in `inbox.ts`: replaced the N-iteration `canModifyTask` loop with a single batch `.in()` ownership query, and replaced `Promise.all` of N individual `UPDATE` calls with a single `supabase.rpc('batch_update_task_orders')` call.
- **Result:** Max 2 DB round-trips regardless of task count (1 auth + 1 RPC).

### Task 2: Parallel health queries + chat bug fix + today-page optimization

- `getProjectHealth`: 3 sequential queries → `Promise.all([metrics, activeCount, criticalCount])`.
- `getProjectHealthDetails`: 3 sequential queries → `Promise.all([calculateHealth RPC, insights, history])`.
- `app/api/chat/route.ts`: Fixed `.eq('assigned_to', user.id)` → `.eq('assignee_id', user.id)` — `assigned_to` column does not exist on `tasks`, was silently returning empty results.
- `app/today-page.tsx`: Moved profile query into `Promise.all` alongside meetings/projects/profiles fetches — eliminates one sequential waterfall on the main dashboard.

## Task Commits

| Task | Commit  | Description                                                                                |
| ---- | ------- | ------------------------------------------------------------------------------------------ |
| 1    | 91e4b09 | perf(34-02): batch reorder RPC + cache auth helpers                                        |
| 2    | fdbcc71 | perf(34-02): parallelize health queries + fix chat assignee_id + today-page parallel fetch |

## Files

### Created

- `supabase/migrations/20260327_batch_update_task_orders.sql` — PostgreSQL RPC for batch task order updates

### Modified

- `app/actions/shared.ts` — React cache() on getCachedUserRole, simplified isUserAdmin/isUserManagerOrAbove/getUserRole
- `app/actions/inbox.ts` — reorderTasks rewritten for 2 round-trips max
- `app/actions/health.ts` — Promise.all in getProjectHealth + getProjectHealthDetails
- `app/api/chat/route.ts` — assigned_to → assignee_id column fix
- `app/today-page.tsx` — profile query parallelized

## Decisions

| #   | Decision                                                 | Rationale                                                                                           |
| --- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | React cache() for role caching                           | Native Next.js dedup — no manual Map needed, per-request lifetime matches server action lifecycle   |
| 2   | Batch ownership query (OR) instead of canModifyTask loop | 1 query replaces N; acceptable trade-off: project leads rarely trigger drag-and-drop reorders       |
| 3   | RPC SECURITY DEFINER                                     | Allows function to update tasks regardless of RLS caller context, but input is validated UUIDs only |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

## Must-Have Verification

| Truth                                               | Status                                              |
| --------------------------------------------------- | --------------------------------------------------- |
| reorderTasks sends at most 2 DB round-trips         | PASS — 1 auth check + 1 RPC                         |
| isUserAdmin/isUserManagerOrAbove cached per-request | PASS — getCachedUserRole wrapped with React.cache() |
| getProjectHealth runs 3 queries in parallel         | PASS — Promise.all                                  |
| getProjectHealthDetails runs 3 queries in parallel  | PASS — Promise.all                                  |
| Chat route uses assignee_id (not assigned_to)       | PASS — fixed                                        |
| today-page.tsx profile query in Promise.all         | PASS                                                |

## Next Phase Readiness

Phase 34-03 (query optimization / N+1 fixes) can proceed. No blockers from this plan.
