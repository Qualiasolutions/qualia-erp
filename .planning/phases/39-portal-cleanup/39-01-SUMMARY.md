---
phase: 39
plan: 01
subsystem: portal
tags: [cleanup, dead-code, navigation]
dependency_graph:
  requires: []
  provides: [portal-navigation-without-messages]
  affects: [portal-sidebar, portal-header]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - components/portal/portal-sidebar.tsx
    - components/portal/portal-header.tsx
  deleted:
    - app/portal/messages/page.tsx
    - app/portal/messages/loading.tsx
    - components/portal/portal-messages.tsx
decisions: []
metrics:
  duration: ~10 minutes
  completed_date: 2026-03-28
---

# Phase 39 Plan 01: Remove Portal Messages Route Summary

Removed the dead `/portal/messages` route and all client-facing entry points by deleting route files, the PortalMessages component, removing the nav item from the sidebar, and removing the routeLabel from the header.

## Tasks Completed

| #   | Task                                                     | Commit  | Files                                                                            |
| --- | -------------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| 1   | Delete messages route files and component                | 1e995a2 | app/portal/messages/page.tsx, loading.tsx, components/portal/portal-messages.tsx |
| 2   | Remove Messages from sidebar nav and header route labels | 20cbd27 | components/portal/portal-sidebar.tsx, components/portal/portal-header.tsx        |

## Verification

- `app/portal/messages/` directory: gone
- `components/portal/portal-messages.tsx`: gone
- `grep portal/messages app/ components/`: no results
- `npx tsc --noEmit`: exits 0
- `npm run build`: passes

## Success Criteria Met

- /portal/messages route no longer exists (returns Next.js 404)
- Portal sidebar mainNav: Dashboard, Projects only
- manageNav unchanged: Requests, Billing, Settings
- MessageSquare import removed from portal-sidebar.tsx
- No TypeScript errors
- Build passes

## Deviations from Plan

None — plan executed exactly as written.

The pre-commit TypeScript hook failed on the first commit attempt because `.next/types/validator.ts` still referenced the deleted page. Running `npm run build` regenerated the types file and the commit succeeded on the second attempt. This was a normal build artifact flush, not a code deviation.

## Self-Check: PASSED

- components/portal/portal-sidebar.tsx exists and has no MessageSquare or portal/messages references
- components/portal/portal-header.tsx exists and has no portal/messages entry
- Commits 1e995a2 and 20cbd27 confirmed in git log
