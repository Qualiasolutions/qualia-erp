# Requirements: Qualia Portal & Trainee System

**Defined:** 2026-03-01
**Core Value:** Moayad executes project phases independently with clear guidance; clients see real-time progress without internal complexity

## v1 Requirements

### Trainee Task Guidance

- [ ] **TASK-01**: Employee sees each phase's tasks as interactive checklist with helper text from GSD templates
- [ ] **TASK-02**: Each task card shows title, helper text, relevant /gsd command as copyable code block, and prominent checkbox
- [ ] **TASK-03**: Phase progress bar updates automatically when tasks are checked off
- [ ] **TASK-04**: "Copy prompt to Claude Code" button accessible per phase

### Phase Review Workflow

- [x] **REVW-01**: Employee submits phase for review when all tasks are done (Submit for Review button)
- [x] **REVW-02**: Admin sees pending reviews in /admin/reviews queue
- [x] **REVW-03**: Admin can approve or request changes with feedback text
- [x] **REVW-04**: Phase card shows review status badge (pending, changes requested)

### Phase Locking

- [ ] **LOCK-01**: Phases enforce GSD sequence — can't start phase N+1 until phase N is approved
- [ ] **LOCK-02**: Locked phases show lock icon with "Complete previous phase first" message
- [ ] **LOCK-03**: Admin can override and unlock any phase manually

### Project Integrations

- [x] **INTG-01**: Admin can link GitHub repo URL and Vercel project URL to each project
- [ ] **INTG-02**: Integration links display in project detail header

### Admin Overview

- [x] **ADMN-01**: Projects page shows PendingReviewsBadge in header
- [x] **ADMN-02**: Admin reviews queue page exists at /admin/reviews

### Client Portal Auth

- [ ] **AUTH-01**: Client role users are redirected to /portal by middleware
- [ ] **AUTH-02**: Client cannot access internal routes (/projects, /inbox, /admin, etc.)
- [ ] **AUTH-03**: Admin can invite a client to a project (creates client_projects link)

### Client Portal Views

- [ ] **PORT-01**: Client sees list of their projects at /portal
- [ ] **PORT-02**: Client sees simplified project roadmap at /portal/[id] — phase names, progress bars, status only
- [ ] **PORT-03**: Client cannot see individual tasks, internal comments, or approval details
- [ ] **PORT-04**: Portal has clean layout with Qualia branding, no admin sidebar

### Shared Files

- [ ] **FILE-01**: Admin can upload files to a project with is_client_visible toggle
- [ ] **FILE-02**: Client sees client-visible files at /portal/[id]/files with download buttons
- [ ] **FILE-03**: Files show phase association, description, upload date

### Client Comments

- [ ] **CMNT-01**: Client can leave comments at the phase level
- [ ] **CMNT-02**: Admin can reply to client comments
- [ ] **CMNT-03**: Internal comments (is_internal=true) are hidden from clients

### Activity Feed

- [ ] **FEED-01**: Client sees timeline of client-visible events at /portal/[id]/updates
- [ ] **FEED-02**: Activity feed shows phase completions, file uploads, comments
- [ ] **FEED-03**: Activity entries filtered by is_client_visible=true

## v2 Requirements

### Email Notifications

- **NOTF-01**: Employee receives "Phase approved" / "Changes requested" emails
- **NOTF-02**: Admin receives "Phase submitted for review" email
- **NOTF-03**: Client receives "New update on your project" email

### Enhanced Integrations

- **INTG-03**: GitHub API calls to show last commit info
- **INTG-04**: Vercel API for deployment status display

### Mobile

- **MOBL-01**: Portal tested and responsive on mobile (clients check from phone)
- **MOBL-02**: Admin review flow tested on tablet

## Out of Scope

| Feature                     | Reason                                  |
| --------------------------- | --------------------------------------- |
| Screenshot/evidence uploads | Trust GSD process + phase review        |
| Full GitHub/Vercel OAuth    | URL links only for v1 — API later       |
| Real-time collaboration     | Not needed for 2-person team            |
| Client task editing         | Portal is read-only + comments          |
| Complex approval workflows  | Simple approve/request changes suffices |
| Mobile app                  | Web-first, mobile responsive            |

## Traceability

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| TASK-01     | Phase 1 | Pending  |
| TASK-02     | Phase 1 | Pending  |
| TASK-03     | Phase 1 | Pending  |
| TASK-04     | Phase 1 | Pending  |
| REVW-01     | Phase 0 | Complete |
| REVW-02     | Phase 0 | Complete |
| REVW-03     | Phase 0 | Complete |
| REVW-04     | Phase 0 | Complete |
| LOCK-01     | Phase 1 | Pending  |
| LOCK-02     | Phase 1 | Pending  |
| LOCK-03     | Phase 1 | Pending  |
| INTG-01     | Phase 0 | Complete |
| INTG-02     | Phase 1 | Pending  |
| ADMN-01     | Phase 0 | Complete |
| ADMN-02     | Phase 0 | Complete |
| AUTH-01     | Phase 2 | Pending  |
| AUTH-02     | Phase 2 | Pending  |
| AUTH-03     | Phase 2 | Pending  |
| PORT-01     | Phase 2 | Pending  |
| PORT-02     | Phase 2 | Pending  |
| PORT-03     | Phase 2 | Pending  |
| PORT-04     | Phase 2 | Pending  |
| FILE-01     | Phase 3 | Pending  |
| FILE-02     | Phase 3 | Pending  |
| FILE-03     | Phase 3 | Pending  |
| CMNT-01     | Phase 3 | Pending  |
| CMNT-02     | Phase 3 | Pending  |
| CMNT-03     | Phase 3 | Pending  |
| FEED-01     | Phase 3 | Pending  |
| FEED-02     | Phase 3 | Pending  |
| FEED-03     | Phase 3 | Pending  |

**Coverage:**

- v1 requirements: 31 total
- Mapped to phases: 31
- Already complete: 8
- Remaining: 23
- Unmapped: 0 ✓

---

_Requirements defined: 2026-03-01_
_Last updated: 2026-03-01 after initial definition_
