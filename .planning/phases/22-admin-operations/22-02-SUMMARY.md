---
phase: 22-admin-operations
plan: '02'
subsystem: portal-admin
tags: [portal, admin, auth, last-login, client-management]
dependency_graph:
  requires: []
  provides: [getPortalClientManagement, clientManagement-prop, enhanced-client-table]
  affects: [app/portal/page.tsx, components/portal/portal-admin-panel.tsx]
tech_stack:
  added: [date-fns/formatDistanceToNow]
  patterns:
    [admin.listUsers for auth metadata, Promise.all parallel fetch, email Map for O(1) lookup]
key_files:
  created: []
  modified:
    - app/actions/client-portal.ts
    - app/portal/page.tsx
    - components/portal/portal-admin-panel.tsx
decisions:
  - id: D6
    decision: Match clients to auth users by email (normalized lowercase)
    rationale: Profiles store email; auth users expose email on the User object — straightforward join key
    date: '2026-03-10'
  - id: D7
    decision: Preserve fallback table when clientManagement is null
    rationale: Admin action may fail (missing service role key in some envs); degrade gracefully rather than break the whole panel
    date: '2026-03-10'
metrics:
  duration: ~20 minutes
  completed_date: '2026-03-10'
---

# Phase 22 Plan 02: Client Management Table with Last Login Summary

**One-liner:** Admin client table with real `last_sign_in_at` from Supabase Auth admin API, status badges, and project/status filters — closes the "has this client ever logged in?" visibility gap.

## What Was Built

### getPortalClientManagement action (app/actions/client-portal.ts)

New exported server action + `MergedPortalClient` interface. Runs three parallel fetches:

1. `profiles` filtered by `role='client'` for names/emails
2. `client_projects` with project join for assignment data
3. `adminClient.auth.admin.listUsers({ perPage: 1000 })` for `last_sign_in_at`

Merges by email (normalized lowercase), computes `isActive` = signed in within last 30 days, returns `{ clients, totalActive, totalInactive }`.

### Portal page (app/portal/page.tsx)

Parallelizes both admin fetches with `Promise.all`. Extracts `clientManagement` typed as `{ clients: MergedPortalClient[]; totalActive: number; totalInactive: number } | null`. Passes as new prop to `PortalAdminPanel`.

### PortalAdminPanel component (components/portal/portal-admin-panel.tsx)

New client management table replaces the old "Client Accounts" table:

- Header badges: "N Active | N Inactive" counts
- Project filter dropdown (unique projects across all clients, sorted by name)
- Status filter dropdown (All / Active / Inactive)
- Table columns: Client, Email, Projects, Last Login, Status, Actions
- Last Login: `formatDistanceToNow` relative display, or "Never"
- Status badge: green "Active" / gray "Inactive"
- Projects: up to 3 visible, "+N more" overflow badge
- Actions: KeyRound password reset button preserved
- Empty state row when filters produce no results
- Full fallback to old simple table if `clientManagement` is null

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes (0 errors)
- `npm run build` passes (all routes including `/portal` build successfully)
- All three tasks committed individually

## Self-Check: PASSED

| Item                                     | Result |
| ---------------------------------------- | ------ |
| app/actions/client-portal.ts             | FOUND  |
| app/portal/page.tsx                      | FOUND  |
| components/portal/portal-admin-panel.tsx | FOUND  |
| commit 5abe228                           | FOUND  |
| commit 2dcd58c                           | FOUND  |
