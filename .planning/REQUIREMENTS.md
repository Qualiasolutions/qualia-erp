# Requirements: Qualia ERP v4.0

**Defined:** 2026-03-28
**Core Value:** One platform for all Qualia operations — internal team management, client-facing project delivery, and financial visibility.

## v4.0 Requirements

### Financial Dashboard

- [ ] **FIN-01**: Admin can add, edit, and delete expense entries (amount, category, date, description)
- [ ] **FIN-02**: Admin can view monthly expense breakdown by category
- [ ] **FIN-03**: Admin can see net cash flow (revenue minus expenses) per month
- [ ] **FIN-04**: Admin can view retainer/recurring clients with monthly totals (synced from Zoho)

### Client Portal — File Uploads

- [ ] **UPLOAD-01**: Client can upload files to a project (drag-and-drop or file picker)
- [ ] **UPLOAD-02**: Client uploads are stored in Supabase Storage with project association
- [ ] **UPLOAD-03**: Admin/staff can view and download client-uploaded files in the ERP project view
- [ ] **UPLOAD-04**: Admin gets notified (email) when a client uploads a file

### Client Portal — Design Refresh

- [ ] **DESIGN-01**: Portal sidebar redesigned with modern look matching Impeccable v4.0
- [ ] **DESIGN-02**: Portal dashboard redesigned with cleaner layout and better hierarchy
- [ ] **DESIGN-03**: Portal project detail page simplified (less roadmap noise, clearer progress)
- [ ] **DESIGN-04**: All portal pages consistent with updated design system (billing, requests, settings, files)
- [ ] **DESIGN-05**: Portal responsive perfection (mobile-first, touch targets, fluid spacing)

### Client Portal — Onboarding

- [ ] **ONBOARD-01**: New client sees a welcome flow on first login (what the portal offers, how to navigate)
- [ ] **ONBOARD-02**: Empty states are helpful and guide the client to next actions

### Admin Portal — Management

- [ ] **ADMIN-01**: Admin can post a client-visible update from the portal hub (per project)
- [ ] **ADMIN-02**: Admin can share a file with a client directly from portal hub
- [ ] **ADMIN-03**: Admin sees client health overview (last login, overdue invoices, stale projects, attention needed)
- [ ] **ADMIN-04**: Admin can view portal as a specific client (full impersonation — exact client UI, no admin elements)
- [ ] **ADMIN-05**: Admin can hide/archive inactive clients from the portal hub view

### Cleanup

- [ ] **CLEAN-01**: Remove /portal/messages route and all related components
- [ ] **CLEAN-02**: Remove "Messages" from portal sidebar navigation
- [ ] **CLEAN-03**: Update portal navigation to reflect new structure

## Future Requirements

### Financial

- **FIN-F01**: Automated Zoho sync via cron (no manual Claude trigger)
- **FIN-F02**: Invoice creation from ERP (push to Zoho)
- **FIN-F03**: Payment collection links for clients

### Client Portal

- **CP-F01**: Client approval workflows (approve designs, sign off milestones)
- **CP-F02**: Client-to-team direct messaging threads
- **CP-F03**: Push notifications for project updates

## Out of Scope

| Feature                   | Reason                                         |
| ------------------------- | ---------------------------------------------- |
| Two-way chat/messaging    | Removed — clients use phase comments and email |
| Online payment collection | Clients pay via bank/cash, not checkout        |
| Client task visibility    | Read-only portal by design                     |
| Real-time collaboration   | SWR polling sufficient for small team          |
| Zoho expense sync         | Zoho expenses unused, manual entry in ERP      |

## Traceability

| Requirement | Phase    | Status   |
| ----------- | -------- | -------- |
| FIN-01      | Phase 41 | Pending  |
| FIN-02      | Phase 41 | Pending  |
| FIN-03      | Phase 41 | Pending  |
| FIN-04      | Phase 41 | Pending  |
| UPLOAD-01   | Phase 40 | Pending  |
| UPLOAD-02   | Phase 40 | Pending  |
| UPLOAD-03   | Phase 40 | Pending  |
| UPLOAD-04   | Phase 40 | Pending  |
| DESIGN-01   | Phase 42 | Pending  |
| DESIGN-02   | Phase 42 | Pending  |
| DESIGN-03   | Phase 42 | Pending  |
| DESIGN-04   | Phase 42 | Pending  |
| DESIGN-05   | Phase 42 | Pending  |
| ONBOARD-01  | Phase 42 | Pending  |
| ONBOARD-02  | Phase 42 | Pending  |
| ADMIN-01    | Phase 43 | Pending  |
| ADMIN-02    | Phase 43 | Pending  |
| ADMIN-03    | Phase 43 | Pending  |
| ADMIN-04    | Phase 43 | Pending  |
| ADMIN-05    | Phase 43 | Pending  |
| CLEAN-01    | Phase 39 | Complete |
| CLEAN-02    | Phase 39 | Complete |
| CLEAN-03    | Phase 39 | Complete |

**Coverage:**

- v4.0 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---

_Requirements defined: 2026-03-28_
_Last updated: 2026-03-28 — traceability complete, all 23 requirements mapped to phases 39-43_
