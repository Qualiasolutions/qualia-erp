---
phase: 20-client-portal-workspace-management-admin
plan: 01
subsystem: client-portal
tags: [portal, admin, workspace, crm, credentials]
dependency_graph:
  requires: [client-portal-actions, setupPortalForClient, clients-table]
  provides: [createClientWorkspace, portal-hub-workspace-creation, portal-hub-manage-projects]
  affects: [/portal, /clients]
tech_stack:
  added: []
  patterns: [server-action-delegation, local-state-optimistic-update, two-state-dialog]
key_files:
  modified:
    - app/actions/client-portal.ts
    - components/portal/portal-hub.tsx
decisions:
  - 'Delegate auth account creation entirely to setupPortalForClient — no duplication of admin API calls'
  - 'Filter existing CRM clients via JS (contacts JSONB first element email match) rather than raw SQL'
  - 'Manage Projects re-uses setupPortalForClient with the new desired project set — it handles upsert semantics'
metrics:
  duration: '~15 minutes'
  completed_date: '2026-03-11'
---

# Quick Task 20: Client Portal Workspace Management (Admin) Summary

**One-liner:** Admin can create CRM client + portal auth account + project assignments in one dialog, and manage project assignments per existing client — without leaving /portal.

## Tasks Completed

| Task | Name                                                                  | Commit  | Files                            |
| ---- | --------------------------------------------------------------------- | ------- | -------------------------------- |
| 1    | Add createClientWorkspace server action                               | d402261 | app/actions/client-portal.ts     |
| 2    | Add New Workspace dialog + per-client project management to PortalHub | 39f7c3c | components/portal/portal-hub.tsx |

## What Was Built

### Task 1 — createClientWorkspace server action (app/actions/client-portal.ts)

New exported server action at the bottom of `client-portal.ts`:

- Auth + permission checks (`isUserManagerOrAbove`)
- Input validation: name non-empty, email format regex, at least one project
- CRM deduplication: fetches all clients, filters JS-side for `contacts[0].email` match
- If no existing CRM client: inserts into `clients` table with `lead_status: 'active_client'`
- Delegates to `setupPortalForClient(clientId, projectIds)` for auth user creation + project linking
- Returns `{ ...setupResult.data, clientId, isNewCrmClient }` with credentials
- Revalidates `/portal` and `/clients`

### Task 2 — PortalHub enhancements (components/portal/portal-hub.tsx)

**New Workspace button + dialog:**

- "New Workspace" button in header (right-aligned, qualia teal)
- Two-state dialog: form → credentials display (same pattern as existing credential dialog)
- Form: Client Name input, Contact Email input, project checklist (same styling as existing checklist)
- On success: shows copyable email + temp password, adds new client to local grid state immediately
- Copy All button for portal URL + email + password

**Manage Projects per existing client:**

- "Manage Projects" ghost button on all client cards with portal access (next to Reset Password)
- Dialog shows full project list with checkboxes pre-checked for current assignments
- Save calls `setupPortalForClient` with the new desired project set
- Updates local client state with new project list on success

## Verification

- `npx tsc --noEmit` — no errors
- `npm run build` — compiled successfully (51/51 pages)
- createClientWorkspace exported from client-portal.ts with correct signature
- Header shows New Workspace button
- Existing portal access clients show Manage Projects button

## Deviations from Plan

### Auto-fixed Issues

None — added null guard for `clientId` variable (TypeScript required it after the CRM lookup branch). Minor correctness fix, not a plan deviation.

## Self-Check: PASSED

- FOUND: app/actions/client-portal.ts
- FOUND: components/portal/portal-hub.tsx
- FOUND commit d402261 (Task 1)
- FOUND commit 39f7c3c (Task 2)
