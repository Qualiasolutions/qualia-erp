---
phase: 28-db-migration-cleanup
plan: 01
subsystem: database
tags: [supabase, migrations, rls, typescript, swr, cleanup]

# Dependency graph
requires: []
provides:
  - work_sessions table with RLS and indexes in Supabase
  - Clean codebase with no task_time_logs references
  - Updated types/database.ts with work_sessions types
  - Pruned lib/swr.ts with no timer hooks
affects:
  - 28-02 (TaskTimeTracker component removal depends on clean team-dashboard types)
  - 29 (attendance session system builds on work_sessions table)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'GENERATED STORED columns for computed duration_minutes'
    - 'Partial index for active sessions: WHERE ended_at IS NULL'
    - 'Supabase migration push with --include-all for out-of-order migrations'

key-files:
  created:
    - supabase/migrations/20260324000000_create_work_sessions.sql
  modified:
    - types/database.ts
    - app/actions/team-dashboard.ts
    - lib/swr.ts
  deleted:
    - app/actions/time-logs.ts

key-decisions:
  - 'Appended convenience type aliases back to database.ts after regeneration (required by codebase conventions)'
  - 'Used migration push with --include-all to handle out-of-order migration state'

patterns-established:
  - 'Pattern: After supabase gen types, restore custom type aliases section at end of database.ts'

# Metrics
duration: 6min
completed: 2026-03-24
---

# Phase 28 Plan 01: DB Migration Cleanup Summary

**work_sessions table created in Supabase with RLS + indexes, all task_time_logs references scrubbed from team-dashboard.ts, time-logs.ts deleted, and SWR timer hooks removed**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-24T04:55:18Z
- **Completed:** 2026-03-24T05:01:04Z
- **Tasks:** 2
- **Files modified:** 4 (1 deleted, 1 created migration)

## Accomplishments

- Created work_sessions table with GENERATED STORED duration_minutes column, 4 indexes, and 3 RLS policies
- Deleted app/actions/time-logs.ts entirely (startTaskTimer, stopTaskTimer, getTaskTimeLog, getTaskTimeLogs)
- Removed task_time_logs join from team-dashboard.ts and stripped TeamMemberTaskTimeLog interface
- Removed useTaskTimeLog, invalidateTaskTimeLog, timeLogs, and timeLogsBulk from lib/swr.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create work_sessions table in Supabase** - `0de87db` (feat)
2. **Task 2: Remove task_time_logs from team-dashboard.ts and delete time-logs.ts** - `cc2bebc` (feat)

## Files Created/Modified

- `supabase/migrations/20260324000000_create_work_sessions.sql` - Migration creating work_sessions table, indexes, and RLS policies
- `types/database.ts` - Regenerated with work_sessions types; convenience type aliases restored
- `app/actions/team-dashboard.ts` - Removed TeamMemberTaskTimeLog interface, time_log field, and task_time_logs join
- `lib/swr.ts` - Removed timeLogs/timeLogsBulk cache keys and useTaskTimeLog/invalidateTaskTimeLog hooks
- `app/actions/time-logs.ts` - DELETED

## Decisions Made

- Used Supabase CLI migration push (not MCP) since `supabase db execute` doesn't exist in CLI 2.78.1
- Used `--include-all` flag to handle out-of-order migration state (remote had 3 unknown migrations that needed repair)
- Restored convenience type aliases to types/database.ts after regeneration — these are required by the codebase and documented in CLAUDE.md

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored convenience type aliases after database.ts regeneration**

- **Found during:** Task 1 (type regeneration)
- **Issue:** `npx supabase gen types` completely overwrites database.ts, wiping the custom type aliases (`Client`, `Project`, `ProjectType`, `DeploymentPlatform`, `LeadStatus`, etc.) that ~15 components depend on
- **Fix:** Re-appended the `// Type Aliases for Convenience` section from the previous file to the regenerated database.ts
- **Files modified:** types/database.ts
- **Verification:** `npx tsc --noEmit` — all errors resolved except expected team-task-card.tsx and task-time-tracker.tsx (plan 28-02)
- **Committed in:** cc2bebc (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required to prevent breaking the build. No scope creep.

## Issues Encountered

- Supabase CLI 2.78.1 does not have `db execute` — used migration file + `db push` instead
- Remote had 3 orphaned migration version markers (20260310, 20260315, 20260324041000) that needed `migration repair --status reverted` before push would succeed
- Used `--include-all` to handle out-of-order local migration files that preceded the repair

## Next Phase Readiness

- work_sessions table is live in Supabase with correct schema, indexes, and RLS
- task_time_logs references removed from all server actions and SWR hooks
- Remaining TypeScript errors only in task-time-tracker.tsx and team-task-card.tsx (plan 28-02)
- Plan 28-02 can now proceed to remove the TaskTimeTracker component and clean up team-task-card.tsx

## Self-Check: PASSED

- supabase/migrations/20260324000000_create_work_sessions.sql — FOUND
- types/database.ts — FOUND
- app/actions/team-dashboard.ts — FOUND
- app/actions/time-logs.ts — CONFIRMED DELETED
- lib/swr.ts — FOUND
- Commit 0de87db — FOUND
- Commit cc2bebc — FOUND

---

_Phase: 28-db-migration-cleanup_
_Completed: 2026-03-24_
