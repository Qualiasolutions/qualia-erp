# Roadmap: Qualia Portal & Trainee System

## Overview

Transform the Qualia Internal Suite with two interconnected capabilities: an interactive trainee execution system where employees follow GSD phases with guided task checklists and phase-level reviews, and a client portal where clients see their project progress in real-time. Building on completed database foundation (Phase 0), we'll deliver trainee-facing features first, then layer on the client experience.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 0: Foundation** - Database schema, review workflow backend, admin components (COMPLETE)
- [x] **Phase 1: Trainee Interactive System** - Task guidance, phase locking, integration display (COMPLETE)
- [x] **Phase 2: Client Portal Core** - Auth routing, portal layout, project views (COMPLETE)
- [ ] **Phase 3: Client Portal Features** - Shared files, comments, activity feed

## Phase Details

### Phase 0: Foundation (COMPLETE)

**Goal**: Database tables, RLS policies, review workflow server actions, and admin components are built and working
**Depends on**: Nothing (first phase)
**Requirements**: REVW-01, REVW-02, REVW-03, REVW-04, INTG-01, ADMN-01, ADMN-02
**Success Criteria** (what must be TRUE):

1. All new tables exist with RLS policies enforced (phase_reviews, project_integrations, activity_log, client_projects, phase_comments)
2. Admin can submit phase for review, approve, and request changes via server actions
3. Admin sees pending reviews at /admin/reviews with badge in projects header
4. Admin can link GitHub and Vercel URLs to projects
   **Status**: Complete
   **Plans**: Backend work completed before roadmap creation

---

### Phase 1: Trainee Interactive System

**Goal**: Employees can execute GSD phases with interactive task guidance, respect phase dependencies, and see project integrations
**Depends on**: Phase 0
**Requirements**: TASK-01, TASK-02, TASK-03, TASK-04, LOCK-01, LOCK-02, LOCK-03, INTG-02
**Success Criteria** (what must be TRUE):

1. Employee sees each phase's tasks as an interactive checklist with helper text from GSD templates
2. Employee can check off tasks and see phase progress bar update automatically
3. Employee cannot start a phase until the previous phase is approved (lock icon shows)
4. Admin can manually unlock phases if needed
5. GitHub and Vercel integration links display prominently in project detail header
   **Plans**: 2 plans in 1 wave

Plans:

- [x] 01-01-PLAN.md — Interactive task instruction cards with helper text and GSD commands
- [x] 01-02-PLAN.md — GitHub/Vercel integration display in project header

### Phase 2: Client Portal Core

**Goal**: Clients can log in, see their assigned projects, and view simplified roadmap progress
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, PORT-01, PORT-02, PORT-03, PORT-04
**Success Criteria** (what must be TRUE):

1. Client role users are automatically redirected to /portal after login
2. Client cannot access internal routes like /projects, /inbox, /admin
3. Admin can invite a client to a project (creates client_projects link)
4. Client sees list of their assigned projects at /portal
5. Client sees simplified project roadmap at /portal/[id] with phase names, progress bars, and status only (no task details)
6. Portal has clean, branded layout without admin sidebar
   **Plans**: 2 plans in 2 waves

Plans:

- [x] 02-01-PLAN.md — Auth & role-based routing with client protection
- [x] 02-02-PLAN.md — Portal layout, projects list, and simplified roadmap

### Phase 3: Client Portal Features

**Goal**: Admin can invite clients to projects, clients can download shared files, leave comments on phases, and see a timeline of project updates
**Depends on**: Phase 2
**Requirements**: AUTH-03, FILE-01, FILE-02, FILE-03, CMNT-01, CMNT-02, CMNT-03, FEED-01, FEED-02, FEED-03
**Gap Closure**: AUTH-03 merged from Phase 2 verification gap (admin invite UI missing)
**Success Criteria** (what must be TRUE):

1. Admin can invite a client to a project via UI (wires existing inviteClientToProject action)
2. Admin can remove client project access via UI (wires existing removeClientFromProject action)
3. Admin can upload files to a project with visibility toggle (client-visible or internal-only)
4. Client sees client-visible files at /portal/[id]/files with download buttons
5. Files show phase association, description, and upload date
6. Client can leave comments at the phase level
7. Admin can reply to client comments in the same thread
8. Internal comments are hidden from clients (only admins/employees see them)
9. Client sees timeline of project events at /portal/[id]/updates (phase completions, file uploads, comments)
10. Activity feed entries are filtered by is_client_visible=true
   **Plans**: TBD

Plans:

- [x] 03-01: Admin client invite UI (gap closure)
- [ ] 03-02: Shared files with visibility toggle
- [ ] 03-03: Client comments on phases
- [ ] 03-04: Client activity feed

## Progress

**Execution Order:**
Phases execute in numeric order: 0 (complete) → 1 → 2 → 3

| Phase                         | Plans Complete | Status      | Completed  |
| ----------------------------- | -------------- | ----------- | ---------- |
| 0. Foundation                 | N/A            | Complete    | 2026-03-01 |
| 1. Trainee Interactive System | 2/2            | Complete    | 2026-03-01 |
| 2. Client Portal Core         | 2/2            | Complete    | 2026-03-01 |
| 3. Client Portal Features     | 1/4            | In progress | -          |
