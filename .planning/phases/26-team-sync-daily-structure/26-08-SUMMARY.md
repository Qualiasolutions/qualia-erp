---
phase: 26-team-sync-daily-structure
plan: 08
subsystem: infra
tags: [supabase, integrations, github, vercel, provisioning, migration]

# Dependency graph
requires:
  - phase: 26-03
    provides: project_provisioning table and setupProjectIntegrations orchestrator

provides:
  - github_repo_url and vercel_project_url columns on projects table
  - Provisioned URLs written to projects table on both fresh provisioning and retry
  - Verified end-to-end wizard → provisioning → URL storage flow is correct

affects: [provisioning UI, project detail page, any component reading project.github_repo_url]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Dual-write: always update both project_provisioning (canonical audit trail) and projects (denormalized fast access) after provisioning success'

key-files:
  created:
    - supabase/migrations/20260315200000_add_integration_urls_to_projects.sql
  modified:
    - lib/integrations/orchestrator.ts
    - types/database.ts

key-decisions:
  - 'Denormalize provisioned URLs onto projects table for fast access without join to project_provisioning'
  - 'Task 2 required no code changes — createProjectWithRoadmap + setupProjectIntegrations flow already correct'

patterns-established:
  - 'Dual-write pattern: provisioning writes both project_provisioning (full audit) and projects (fast access URL)'

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 26 Plan 08: Store Provisioned URLs on Projects Summary

**GitHub repo URL and Vercel project URL now written directly to projects table after provisioning, enabling single-table lookups without joining project_provisioning**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-15T02:58:04Z
- **Completed:** 2026-03-15T03:01:00Z
- **Tasks:** 2 (1 code, 1 verification)
- **Files modified:** 3

## Accomplishments

- Added `github_repo_url` and `vercel_project_url` columns to `projects` table via migration applied to live DB
- Updated `setupProjectIntegrations` to write URLs to `projects` table after GitHub and Vercel provisioning succeed
- Updated `retryProvisioningStep` to also write URLs to `projects` table on retry success
- Verified `createProjectWithRoadmap` → provisioning → URL storage end-to-end flow is complete and correct

## Task Commits

1. **Task 1: Store provisioned URLs on projects table** - `24d07af` (feat)
2. **Task 2: Verify wizard flow** - No commit needed (verification only, flow confirmed correct)

## Files Created/Modified

- `supabase/migrations/20260315200000_add_integration_urls_to_projects.sql` - Adds github_repo_url and vercel_project_url columns to projects table
- `lib/integrations/orchestrator.ts` - Dual-writes URLs to projects table after GitHub and Vercel provisioning (both fresh and retry paths)
- `types/database.ts` - Regenerated to include new columns

## Decisions Made

- Denormalize provisioned URLs onto `projects` table: `project_provisioning` retains full audit trail (repo name, clone URL, project ID, timestamps, error details) while `projects` gets the human-facing URLs for quick access without a join.
- Task 2 confirmed no code changes needed — `createProjectWithRoadmap` already creates provisioning record and calls `setupProjectIntegrations` correctly.

## Deviations from Plan

None - plan executed exactly as written. Task 2 was verification-only as predicted.

## Issues Encountered

- Supabase CLI appended version upgrade notice to generated `types/database.ts` file, causing TS parse errors. Fixed by stripping the trailing non-TypeScript lines.
- Migration history out of sync required `supabase migration repair --status reverted 20260310 20260315` before `db push --include-all`.

## User Setup Required

None - no external service configuration required. Migration was applied directly to the live Supabase project.

## Next Phase Readiness

- Projects table now carries GitHub/Vercel URLs directly — project detail pages can display links without joining `project_provisioning`
- All 8 plans in phase 26 now complete

## Self-Check

- [x] Migration file exists: `supabase/migrations/20260315200000_add_integration_urls_to_projects.sql`
- [x] orchestrator.ts modified: dual-write to projects table in both setupProjectIntegrations and retryProvisioningStep
- [x] types/database.ts regenerated with new columns
- [x] Commit `24d07af` confirmed

## Self-Check: PASSED

---

_Phase: 26-team-sync-daily-structure_
_Completed: 2026-03-15_
