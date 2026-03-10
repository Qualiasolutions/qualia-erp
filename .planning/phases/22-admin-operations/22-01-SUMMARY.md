---
phase: 22-admin-operations
plan: '01'
subsystem: ui
tags: [react, server-actions, portal, bulk-operations, typescript]

# Dependency graph
requires:
  - phase: 20-foundation-fixes
    provides: setupPortalForClient server action with auth admin API integration
  - phase: 21-client-experience
    provides: portal admin panel two-step single-client setup flow

provides:
  - bulkSetupPortalForClients server action (sequential, per-client results)
  - Bulk Setup mode toggle in portal admin panel setup card
  - Multi-CRM-client checkbox select (step 1 bulk mode)
  - Per-client results list with success/failure display
  - Copy All Credentials button for multi-client plain-text block

affects: [22-02, portal-admin, client-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Sequential bulk action pattern (loop over setupPortalForClient, collect results, success:true if any succeeded)
    - Bulk mode toggle with shared step state (step 1/2 works for both single and bulk flows)
    - Per-item result display with green/red indicators

key-files:
  created: []
  modified:
    - app/actions/client-portal.ts
    - components/portal/portal-admin-panel.tsx

key-decisions:
  - 'Sequential execution (not Promise.all) for bulkSetupPortalForClients to avoid Supabase auth admin API rate limits'
  - 'success:true returned when at least one client in a batch succeeded; only false if ALL failed'
  - 'Bulk and single modes share the same step state variable and project toggleProject handler'
  - 'Copy All Credentials generates Name|Email|Password|Portal line per client (skips already-existed accounts)'

patterns-established:
  - 'Bulk server actions return { results[], totalSuccess, totalFailed } shape under data'
  - 'Per-client error surfacing: each result carries its own success/error, never hidden by aggregate failure'

# Metrics
duration: 18min
completed: 2026-03-10
---

# Phase 22 Plan 01: Bulk Client Portal Onboarding Summary

**`bulkSetupPortalForClients` server action + Bulk Setup mode in admin panel enabling 3-5 client onboarding in one form submission with per-client credential results**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-10T17:33:47Z
- **Completed:** 2026-03-10T17:51:00Z
- **Tasks:** 2 of 2
- **Files modified:** 2

## Accomplishments

- New `bulkSetupPortalForClients` server action: accepts `crmClientIds[]` + `projectIds[]`, runs `setupPortalForClient` sequentially per client, returns per-client result array with `{ success, email, name, tempPassword, alreadyExisted, projectsLinked, error }`
- Bulk Setup toggle button in Setup Client Access card header — switches between single mode (existing two-step flow unchanged) and bulk mode
- Bulk mode step 1: checkbox grid selecting multiple CRM clients (name + email shown); step 2: same project multi-select grid
- Submit button label dynamically shows "Create Portal Access for N Clients"
- Per-client results list: green check for success (shows credentials inline), red X for failure (shows error message)
- "Copy All Credentials" button produces `Name | Email | Password | Portal: {url}` lines for all new accounts in one click

## Task Commits

1. **Task 1: Add bulkSetupPortalForClients server action** - `9b00145` (feat)
2. **Task 2: Add Bulk Setup mode to portal admin panel setup card** - `3cc78cd` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/actions/client-portal.ts` - Added `bulkSetupPortalForClients` export (~100 lines) at end of file
- `components/portal/portal-admin-panel.tsx` - Added bulk mode state, handlers, and UI within setup card; added `clientManagement` to `PortalAdminPanelProps` (pre-existing TS mismatch fix)

## Decisions Made

- Sequential execution in `bulkSetupPortalForClients` (not `Promise.all`) — Supabase auth admin API has rate limits that parallel calls would hit when onboarding 3-5 clients
- `success: true` if at least one client succeeded — consistent with plan spec; prevents hiding partial successes behind a single top-level error
- Bulk and single modes share `step`, `selectedProjectIds`, and `toggleProject` — avoids duplicate state, step labels adapt based on `isBulkMode` flag

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TS type mismatch on PortalAdminPanelProps**

- **Found during:** Task 2 (TypeScript check after UI changes)
- **Issue:** `app/portal/page.tsx` passed `clientManagement` prop but `PortalAdminPanelProps` had no such field — compilation error TS2322
- **Fix:** Added `clientManagement: { clients: MergedPortalClient[]; totalActive: number; totalInactive: number } | null` to the interface (auto-added by linter, also added `MergedPortalClient` import)
- **Files modified:** `components/portal/portal-admin-panel.tsx`
- **Verification:** `npx tsc --noEmit` passes, `npm run build` passes
- **Committed in:** `3cc78cd` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - pre-existing type bug)
**Impact on plan:** Necessary fix — TypeScript would have blocked the build. No scope creep.

## Issues Encountered

None beyond the pre-existing TS mismatch handled above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Bulk Setup action and UI complete; Plan 02 can build the client accounts table enhancements on top of this
- `clientManagement` prop is now correctly typed in `PortalAdminPanelProps` (ready for Plan 02 to wire up the management table)

---

_Phase: 22-admin-operations_
_Completed: 2026-03-10_
