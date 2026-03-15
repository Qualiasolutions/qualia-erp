---
phase: quick
plan: '24'
subsystem: projects-clients
tags: [projects, clients, crm, erp-linking]
dependency_graph:
  requires: []
  provides: [client-project-assignment]
  affects: [project-settings, client-detail]
tech_stack:
  added: []
  patterns: [server-action-formdata, optimistic-ui, useTransition]
key_files:
  modified:
    - app/actions/projects.ts
    - app/projects/[id]/project-detail-view.tsx
    - app/projects/[id]/page.tsx
    - app/clients/[id]/client-detail-view.tsx
    - app/clients/[id]/page.tsx
metrics:
  duration: ~20 minutes
  completed: 2026-03-15
---

# Quick Task 24: Assign Clients to Existing Projects — Summary

**One-liner:** Wired `projects.client_id` FK end-to-end — updateProject now persists it, project settings has a client selector, and client detail shows linked projects with link/unlink controls.

## Tasks Completed

### Task 1: Fix updateProject to pass client_id (commit: 46ec66a)

The `updateProject` action had `client_id` in its Zod schema but never destructured or applied it to the DB update. Added it to the destructuring and the update object, using empty string → null convention (handled by `parseFormData`).

### Task 2: Add client selector to project settings dialog (commit: c0d106f)

- Added `ClientOption[]` prop to `ProjectDetailView`
- Added `clientId` state with change tracking
- Added Client `<Select>` dropdown in settings dialog below Lead selector
- Included `client_id` in `handleSave` FormData (empty string clears assignment)
- Updated `useCallback` dependency array to include `clientId`
- `page.tsx` fetches clients in parallel with other data, maps to `{ id, display_name }`

### Task 3: ERP-linked projects on client detail (commit: 3419d80)

- `page.tsx` fetches `projects WHERE client_id = this client` server-side
- `page.tsx` fetches unlinked projects (`client_id IS NULL`) for the link dropdown (admin only)
- `client-detail-view.tsx` gets two new props: `erpLinkedProjects`, `erpAvailableProjects`
- Replaced static "Projects List" card with interactive "Linked Projects" card
- Link: selects unlinked project → sets `projects.client_id` via `updateProject`
- Unlink: sets `projects.client_id` to empty (null) via `updateProject`
- Optimistic updates with rollback on error using `useTransition`
- Admin-only link/unlink controls; all users see the list

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files confirmed:

- `app/actions/projects.ts` — client_id destructured and applied
- `app/projects/[id]/project-detail-view.tsx` — client selector present, ClientOption interface added
- `app/projects/[id]/page.tsx` — getClients called, clients prop passed
- `app/clients/[id]/client-detail-view.tsx` — erpLinkedProjects state, link/unlink handlers, interactive card
- `app/clients/[id]/page.tsx` — erpLinkedProjects and erpAvailableProjects fetched and passed

Commits confirmed: 46ec66a, c0d106f, 3419d80

## Self-Check: PASSED
