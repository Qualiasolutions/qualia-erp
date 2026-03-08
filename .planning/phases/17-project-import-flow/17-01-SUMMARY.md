---
phase: 17-project-import-flow
plan: 01
subsystem: ui
tags: [admin, portal, import, supabase, server-actions, shadcn-ui]

# Dependency graph
requires:
  - phase: 13-erp-portal-integration
    provides: client_projects table and ERP-portal linkage pattern
provides:
  - Admin UI for viewing ERP projects with portal access status
  - Server action getProjectsForPortalImport() with authorization
  - Project filtering by portal status (enabled/not-enabled)
  - Navigation structure for portal import workflow
affects: [17-02, 17-03, 18-invitation-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component data fetching with error boundaries
    - Client component state management for filters and selections
    - Badge-based status visualization with color coding
    - Checkbox UI pattern for bulk operations (visual only, functionality in next plan)

key-files:
  created:
    - app/actions/portal-import.ts
    - app/admin/projects/import/page.tsx
    - app/admin/projects/import/project-import-list.tsx
  modified:
    - components/sidebar.tsx

key-decisions:
  - "Separate client component from server page for proper 'use client' directive placement"
  - 'Sort projects with not-enabled first to prioritize import candidates'
  - 'Use client_projects count to determine portal access status rather than boolean flag'
  - 'Add checkboxes now (visual only) to establish UI pattern for Plan 02 bulk operations'

patterns-established:
  - 'Admin import pages follow server component pattern with separate client list component'
  - 'Portal status shown via dual indicators: badge color (green/gray) and count display'
  - 'Filter tabs use count badges to show distribution across states'
  - 'ERP client info displayed when available via FK join normalization'

# Metrics
duration: 3min 20sec
completed: 2026-03-08
---

# Phase 17 Plan 01: Project Import Flow - Admin UI Summary

**Admin interface for viewing ERP projects with portal status filtering, using count-based access detection and normalized FK responses**

## Performance

- **Duration:** 3 minutes 20 seconds
- **Started:** 2026-03-08T13:57:29Z
- **Completed:** 2026-03-08T14:00:49Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Admin can view all active ERP projects with clear portal access status indication
- Filtering system shows projects by portal configuration state (All, Not Enabled, Enabled)
- Portal access determined by counting client_projects records per project
- ERP client information displayed when projects have client_id FK populated
- Navigation integrated into admin sidebar for easy access

## Task Commits

Each task was committed atomically:

1. **Task 1: Create server action for fetching projects with portal status** - `20056bb` (feat)
2. **Task 2: Create admin import page with filterable project list** - `0478300` (feat)
3. **Task 3: Add Portal Import link to admin sidebar** - `5299b58` (feat)

## Files Created/Modified

**Created:**

- `app/actions/portal-import.ts` - Server action with isUserManagerOrAbove() auth, queries projects with Active/Demos/Delayed status, joins client_projects for count, normalizes FK responses for clients table
- `app/admin/projects/import/page.tsx` - Server component that fetches data and handles errors
- `app/admin/projects/import/project-import-list.tsx` - Client component with filter tabs, selection state, table rendering, badge status indicators

**Modified:**

- `components/sidebar.tsx` - Added Portal Import link to adminNav with Upload icon, visible to managers and admins

## Decisions Made

**Separation of client/server components:**

- Split page.tsx into server component (data fetching) and separate client component file (interactivity)
- Avoids ESLint errors from 'use client' directive placement mid-file
- Establishes clean pattern for future admin pages

**Count-based portal status:**

- Use `client_projects` count instead of boolean flag on projects table
- More accurate - reflects actual portal access grants
- Supports multiple clients per project (future use case)

**Sort order optimization:**

- Projects without portal access shown first (hasPortalAccess ASC)
- Prioritizes import candidates for admin workflow
- Then alphabetical by name for easy scanning

**UI preparation for Plan 02:**

- Checkboxes rendered but selection not used yet
- Configure buttons disabled with tooltip
- Establishes visual pattern, functionality added in next plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**ESLint error with 'use client' directive:**

- Initial implementation had 'use client' mid-file after server component export
- ESLint reported "Expected an assignment or function call" error
- Fixed by splitting into separate page.tsx (server) and project-import-list.tsx (client) files
- Pattern now established for future admin pages

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02 (Project Selection and Preview):**

- Project list rendering complete with accurate portal status
- Selection state infrastructure in place (Set-based IDs)
- Filter system functional for narrowing to import candidates
- Admin can identify which projects need portal configuration

**Infrastructure available:**

- `getProjectsForPortalImport()` provides all project data with portal status
- `ProjectForImport` type exported for reuse in Plan 02 modal
- Checkbox UI pattern established for bulk selection
- Badge system shows clear visual distinction between enabled/not-enabled

---

_Phase: 17-project-import-flow_
_Completed: 2026-03-08_

## Self-Check: PASSED

All created files verified to exist:

- ✓ app/actions/portal-import.ts
- ✓ app/admin/projects/import/page.tsx
- ✓ app/admin/projects/import/project-import-list.tsx

All task commits verified in git history:

- ✓ 20056bb (Task 1: Server action)
- ✓ 0478300 (Task 2: Admin page)
- ✓ 5299b58 (Task 3: Sidebar navigation)
