# Plan: 24 — Assign clients to existing projects

**Mode:** quick
**Created:** 2026-03-15

## Task 1: Add client_id to updateProject action

**What:** The `updateProject` action in `app/actions/projects.ts` has `client_id` in its Zod schema but doesn't destructure or pass it to the DB update query. Fix this.
**Files:** `app/actions/projects.ts`
**Done when:** `client_id` is destructured from validation.data and included in the .update() call

## Task 2: Add client selector to project settings dialog

**What:** In `app/projects/[id]/project-detail-view.tsx`, the settings dialog has selectors for group, type, lead, etc. Add a client selector dropdown that lists all clients and allows assigning/unassigning a client from the project. Need to fetch clients list — use `getClients` action.
**Files:** `app/projects/[id]/project-detail-view.tsx`, `app/projects/[id]/page.tsx` (pass clients data)
**Done when:** Project settings dialog shows a client dropdown, saving it updates client_id

## Task 3: Add project assignment on client detail page

**What:** On `app/clients/[id]/client-detail-view.tsx`, show which projects are linked to this client and allow linking new projects via a selector. Projects with `client_id = this client` should show as linked, with ability to unlink. Need a "Link Project" action.
**Files:** `app/clients/[id]/client-detail-view.tsx`, `app/clients/[id]/page.tsx`
**Done when:** Client detail page shows linked projects and allows linking/unlinking projects
