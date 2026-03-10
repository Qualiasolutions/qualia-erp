---
phase: 20-foundation-fixes
plan: '05'
subsystem: portal
tags: [portal, error-boundaries, performance, next-js, server-actions]

requires:
  - phase: 20-foundation-fixes
    provides: Portal foundation with client portal actions

provides:
  - Next.js App Router error boundaries for portal root and project routes
  - Parallelized getClientDashboardData with Promise.all (4 concurrent queries)
  - getNotificationPreferences returns defaults instead of error for clients without workspace

affects:
  - portal error UX
  - dashboard load performance
  - settings page for portal clients

tech-stack:
  added: []
  patterns:
    - "Next.js error.tsx boundaries: 'use client' required, accept { error, reset } props"
    - 'Promise.all parallelization: pre-fetch dependent IDs, then fan out independent queries'
    - 'Graceful workspace guard: return defaults instead of error for users without workspace'

key-files:
  created:
    - app/portal/error.tsx
    - app/portal/[id]/error.tsx
  modified:
    - app/actions/client-portal.ts

key-decisions:
  - 'Error boundaries show error.message if available, fall back to friendly static copy'
  - 'Activity feed query pre-fetches project IDs outside Promise.all (dependency constraint)'
  - 'getNotificationPreferences returns defaults (not error) when no workspace — clients always see settings page'

patterns-established:
  - 'Portal error boundaries follow same structure: AlertCircle icon, message, Try again button'
  - 'Dashboard parallelization pattern: pre-fetch deps first, then Promise.all for independent queries'

duration: 8min
completed: 2026-03-10
---

# Phase 20 Plan 05: Portal Error Boundaries + Dashboard Query Performance Summary

**Next.js App Router error boundaries added to portal root and project routes; `getClientDashboardData` parallelized with `Promise.all` replacing 5 sequential queries; `getNotificationPreferences` returns defaults instead of error for client users without a workspace.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-10T15:27:43Z
- **Completed:** 2026-03-10T15:35:00Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 1

## Accomplishments

- `app/portal/error.tsx`: catches errors at portal root level, logs to console, shows reset button
- `app/portal/[id]/error.tsx`: catches errors at project detail level, same UI pattern
- `getClientDashboardData`: replaced 5 sequential queries (projectCount, pendingRequests, unpaidInvoices, nested-await recentActivity) with `Promise.all` — project IDs pre-fetched first since activity feed depends on them, remaining 4 queries run in parallel
- `getNotificationPreferences`: workspace guard now returns sensible defaults instead of `{ success: false, error: 'No workspace found' }` — portal clients never get a broken settings page

## Task Commits

1. **Task 1: Add portal error boundaries** — `36de2df` (feat)
2. **Task 2: Parallelize dashboard queries + fix workspace guard** — `0b59b16` (feat, merged with 20-04 parallel execution)

## Files Created/Modified

- `app/portal/error.tsx` — Portal root error boundary
- `app/portal/[id]/error.tsx` — Portal project detail error boundary
- `app/actions/client-portal.ts` — Promise.all in getClientDashboardData + workspace guard fix in getNotificationPreferences

## Decisions Made

- Activity feed pre-fetches `client_projects` outside `Promise.all` since `in('project_id', clientProjectIds)` depends on that result — this is correct architectural ordering, not sequential anti-pattern
- `getNotificationPreferences` returns defaults without `delivery_method` key when no workspace (matches the client portal's simplified notification model)
- Settings page (`app/portal/settings/page.tsx`) required no changes — already handles `!prefsResult.success` gracefully by keeping defaults

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error from parallel 20-04 agent**

- **Found during:** Task 2 verification (npx tsc --noEmit)
- **Issue:** `app/portal/page.tsx` modified by parallel 20-04 agent to pass `crmClients` prop; TS reported prop not in `PortalAdminPanelProps`
- **Fix:** Confirmed `PortalAdminPanelProps` already had `crmClients: CrmClient[]` in `portal-admin-panel.tsx` — the error was transient during parallel execution. Final TSC run: zero errors.
- **Files modified:** None (already correct after 0b59b16)

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Portal error boundaries are now in place — unhandled render errors show a reset UI instead of blank screen
- Dashboard data loads faster due to parallelization
- Settings page works for both internal users (with workspace) and portal clients (without workspace)

---

_Phase: 20-foundation-fixes_
_Completed: 2026-03-10_
