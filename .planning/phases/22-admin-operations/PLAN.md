# Phase 22: Admin Operations & Bulk Management

**Milestone:** v1.5 Production-Ready Client Portal
**Goal:** Streamline admin operations for bulk client onboarding and project management
**Priority:** P1 - Important for Moayad's efficiency
**Plans:** 3 plans in 1 wave

## Context

Current admin panel handles one client at a time. Moayad needs to:

- Invite multiple clients to the same project
- Assign the same client to multiple projects
- Bulk manage client access and permissions
- Export/share credentials efficiently

Research shows agencies need bulk operations for client onboarding efficiency.

## Success Criteria

**What must be TRUE after completion:**

1. **Bulk client invite** - Admin can invite multiple clients to the same project in one operation
2. **Multi-project assignment** - Admin can assign one client to multiple projects efficiently
3. **Bulk credential export** - Admin can export all client credentials for a project as shareable format
4. **Client management dashboard** - Admin has overview of all clients, their projects, last login, status

## Plans

### Plan 22-01: Bulk Client Operations

**Goal:** Enable bulk invite and assignment operations
**Tasks:**

- Add "Bulk Invite" mode to admin panel (toggle or separate form)
- Support comma-separated email list or file upload for bulk invites
- Create multi-select project assignment (assign client to multiple projects)
- Add bulk remove/reassign operations with confirmation

### Plan 22-02: Client Management Dashboard

**Goal:** Admin overview of all client relationships and activity
**Tasks:**

- Create admin dashboard showing all clients with key metrics
- Show last login, projects assigned, pending actions per client
- Add filters: by project, by status (active/inactive), by last login
- Enable bulk actions from the dashboard (reassign, remove, reset password)

### Plan 22-03: Credential Management & Export

**Goal:** Streamline credential sharing and management
**Tasks:**

- Add "Export Credentials" button to generate PDF/CSV with all project clients
- Create sharable credential format (email/password/portal URL + project name)
- Add credential regeneration for security (reset passwords in bulk)
- Store and display credential generation history for audit

## Dependencies

- Phase 20 (basic admin operations must work)
- Existing client-project relationship model

## Risk Assessment

**Medium risk** - Bulk operations need careful error handling and transaction safety

## Validation

**Moayad workflow test:**

1. Moayad bulk invites 5 clients to same project → all receive working credentials
2. Moayad assigns 1 client to 3 different projects → client sees all projects in portal
3. Moayad exports credentials for project → shares via WhatsApp/email efficiently
4. Admin dashboard shows accurate client status and activity metrics
