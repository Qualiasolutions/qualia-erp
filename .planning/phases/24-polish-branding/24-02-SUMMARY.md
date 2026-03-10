---
phase: 24-polish-branding
plan: '02'
subsystem: ui
tags: [portal, personalization, company-name, sidebar, dashboard, supabase-view]

# Dependency graph
requires:
  - phase: 24-01-polish-branding
    provides: Portal branding refresh (sidebar "Qualia Solutions", portal metadata)
provides:
  - Company name displayed in portal sidebar below logo for linked clients
  - Dashboard welcome greeting personalized with client company name
  - Graceful fallback to personal name when no ERP record linked
affects:
  - portal-dashboard
  - portal-sidebar

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Query portal_project_mappings.erp_company_name at layout and page level for client personalization
    - Skip company name fetch when isAdminViewing to avoid unnecessary queries
    - Pass optional companyName props through Server Component -> Client Component boundary

key-files:
  created: []
  modified:
    - app/portal/layout.tsx
    - components/portal/portal-sidebar.tsx
    - app/portal/page.tsx
    - app/portal/portal-dashboard-content.tsx
    - app/actions/client-portal.ts

key-decisions:
  - 'Company name fetched at both layout and page level (not shared) — App Router layout cannot pass props to page children'
  - 'Sidebar shows company name only for clients (isAdminViewing guard prevents fetch entirely)'
  - 'Dashboard greeting: companyName takes priority over firstName when available'

patterns-established:
  - 'Optional company branding: companyName?: string | null prop pattern for portal components'
  - 'portal_project_mappings view used as single source for ERP company name lookups'

# Metrics
duration: 12min
completed: 2026-03-10
---

# Phase 24 Plan 02: Portal Personalization — Company Name Summary

**Company name from ERP clients table surfaces in portal sidebar (below logo) and dashboard greeting ("Good morning, Alkemy") via portal_project_mappings view query at layout and page level.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-10T17:51:14Z
- **Completed:** 2026-03-10T18:03:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Portal sidebar shows client company name below "Qualia Solutions" logo in small muted text
- Dashboard welcome greeting uses company name when available ("Good morning, Alkemy")
- Graceful fallback to personal first name when no ERP record is linked
- Admin viewing portal sees no company name (query skipped with isAdminViewing guard)

## Task Commits

1. **Task 1: Fetch company name in portal layout and pass to sidebar** - `f9d4b22` (feat)
2. **Task 2: Personalize dashboard welcome heading with company name** - `39d6d99` (feat)

**Plan metadata:** TBD (docs commit)

## Files Created/Modified

- `app/portal/layout.tsx` — Queries portal_project_mappings for erp_company_name (client-only), passes companyName to PortalSidebar
- `components/portal/portal-sidebar.tsx` — Added companyName optional prop to interface and SidebarContent; displays below logo div
- `app/portal/page.tsx` — Queries portal_project_mappings for companyName on client path, passes to PortalDashboardContent
- `app/portal/portal-dashboard-content.tsx` — Added companyName optional prop; welcomeName = companyName || firstName
- `app/actions/client-portal.ts` — Fixed pre-existing bug: ZodError.errors -> ZodError.issues

## Decisions Made

- App Router constraint: layout cannot pass props to children pages directly, so company name is fetched independently in both layout.tsx and page.tsx. Acceptable duplication for correctness.
- Sidebar query uses `.maybeSingle()` rather than `.single()` to avoid errors when no mapping exists.
- Admin viewing guard: when isAdminViewing is true, the layout skips the mapping query entirely (not just hides the UI).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ZodError.errors -> ZodError.issues in updateClientProfile**

- **Found during:** Task 2 (TypeScript check after all changes)
- **Issue:** `parsed.error.errors[0]?.message` caused TS2339 — `ZodError` exposes `issues`, not `errors`
- **Fix:** Changed `parsed.error.errors[0]` to `parsed.error.issues[0]` in `app/actions/client-portal.ts` line 1049
- **Files modified:** `app/actions/client-portal.ts`
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** `39d6d99` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Pre-existing TypeScript error, unrelated to portal personalization. Fix was required to pass the plan's tsc verification criterion.

## Issues Encountered

None — plan executed cleanly. The only issue was the pre-existing Zod property bug found during tsc verification.

## User Setup Required

None — no external service configuration required. Uses existing `portal_project_mappings` view and `erp_company_name` column.

## Next Phase Readiness

- Portal personalization is complete for Phase 24
- Sidebar and dashboard both show company name for clients with linked ERP records
- Phase 24 plans 01 and 02 both complete — ready for Phase 25 (Portal Security Hardening)

---

_Phase: 24-polish-branding_
_Completed: 2026-03-10_

## Self-Check: PASSED

- app/portal/layout.tsx — FOUND
- components/portal/portal-sidebar.tsx — FOUND
- app/portal/page.tsx — FOUND
- app/portal/portal-dashboard-content.tsx — FOUND
- 24-02-SUMMARY.md — FOUND
- Commit f9d4b22 — FOUND
- Commit 39d6d99 — FOUND
