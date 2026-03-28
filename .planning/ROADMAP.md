# Roadmap: Qualia ERP

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-03-01)
- ✅ **v1.1 Production Polish** - Phases 4-8 (shipped 2026-03-04)
- ✅ **v1.2 Premium Animations** - Phases 10-11 (shipped 2026-03-04)
- ✅ **v1.3 Full ERP-Portal Integration** - Phases 12-16 (shipped 2026-03-06)
- ✅ **v1.4 Admin Portal Onboarding** - Phases 17-19 (shipped 2026-03-09)
- ✅ **v1.5.1 Security Hardening** - Phase 25 (shipped 2026-03-10)
- ✅ **v2.0 Team Efficiency & Owner Oversight** - Phase 26 (shipped 2026-03-15)
- ✅ **v2.1 Attendance & Live Oversight** - Phases 28-31 (shipped 2026-03-27)
- ✅ **v3.0 Production Hardening & Design** - Phases 33-38 (shipped 2026-03-27)
- 🚧 **v4.0 Portal & Financials** - Phases 39-43 (in progress)

## Phases

<details>
<summary>✅ v1.0–v3.0 (Phases 1-38) — SHIPPED</summary>

Phases 1-38 complete. See `.planning/milestones/` for archived roadmaps and state files.

Phase highlights:

- v1.0–v1.5.1: Client portal, animations, ERP-portal sync, onboarding, security (phases 1-25)
- v2.0–v2.1: Team efficiency, session-based attendance, live status dashboard (phases 26-31)
- v3.0: Security audit fixes, perf optimization, observability, testing, design polish (phases 33-38)

</details>

---

### 🚧 v4.0 Portal & Financials (In Progress)

**Milestone Goal:** Overhaul the client portal experience (design, file uploads, onboarding), give admins powerful management tools (health dashboard, impersonation, quick actions), and complete the financial dashboard with expenses and retainers.

---

#### Phase 39: Portal Cleanup

**Goal:** Dead code is removed and portal navigation reflects the current feature set.
**Depends on:** Phase 38
**Requirements:** CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):

1. `/portal/messages` route returns 404 — no page exists, no dead link
2. Portal sidebar shows no Messages item in navigation
3. Portal navigation links match all available routes with no broken or orphaned entries

**Plans:** 1 plan

Plans:

- [x] 39-01-PLAN.md — Remove Messages route, sidebar nav item, and header route label (2026-03-28)

---

#### Phase 40: Client File Uploads

**Goal:** Clients can upload files to their projects and admins see and receive notification of those uploads.
**Depends on:** Phase 39
**Requirements:** UPLOAD-01, UPLOAD-02, UPLOAD-03, UPLOAD-04
**Success Criteria** (what must be TRUE):

1. Client can drag-and-drop or browse to upload files on a project page and sees them listed immediately after
2. Uploaded files are stored in Supabase Storage with the correct project association
3. Admin/staff can view client-uploaded files in the ERP project view and download them
4. Admin receives an email notification when a client uploads a file

**Plans:** 2 plans

Plans:

- [x] 40-01-PLAN.md — DB migration (is_client_upload column + RLS), uploadClientFile server action, drag-and-drop portal upload UI (2026-03-28)
- [x] 40-02-PLAN.md — ERP admin Client Uploads section and FileList client badge (2026-03-28)

---

#### Phase 41: Financial Dashboard Completion

**Goal:** Admin has full financial picture — expenses tracked, net cash flow calculated, recurring revenue visible.
**Depends on:** Phase 38 (independent of phases 39-40, can run in parallel)
**Requirements:** FIN-01, FIN-02, FIN-03, FIN-04
**Success Criteria** (what must be TRUE):

1. Admin can add, edit, and delete an expense entry (amount, category, date, description) from the financials page
2. Admin sees a monthly expense breakdown chart grouped by category
3. Admin sees net cash flow (revenue minus expenses) per month on the financials dashboard
4. Admin sees a retainer/recurring clients view with each client's monthly total, synced from Zoho

**Plans:** 2 plans

Plans:

- [ ] 41-01-PLAN.md — expenses table + RLS, CRUD server actions, expense entry UI with modal on financials page
- [ ] 41-02-PLAN.md — monthly expense breakdown chart, net cash flow section, retainer/recurring clients view

---

#### Phase 42: Portal Design Refresh & Onboarding

**Goal:** Every client portal page is premium and consistent with Impeccable v4.0, and new clients are guided from their first login.
**Depends on:** Phases 39-40 (clean nav and file uploads in place before redesign)
**Requirements:** DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04, DESIGN-05, ONBOARD-01, ONBOARD-02
**Success Criteria** (what must be TRUE):

1. Portal sidebar uses tinted neutrals, brand accent, and fluid spacing matching Impeccable v4.0
2. Portal dashboard has clear visual hierarchy and portal project detail page shows clean progress with no roadmap noise
3. All remaining portal pages (billing, requests, settings, files) are visually consistent with the updated design
4. Portal works flawlessly on mobile — 44px touch targets, no horizontal scroll, fluid type scale
5. A first-time client sees a welcome flow on login that explains what the portal offers before reaching the dashboard
6. All empty states on portal pages offer a clear next-action prompt rather than a blank screen
   **Plans:** TBD

Plans:

- [ ] 42-01: Sidebar and global portal layout refresh
- [ ] 42-02: Dashboard and project detail page redesign
- [ ] 42-03: Remaining portal pages (billing, requests, settings, files) + full responsive pass
- [ ] 42-04: Welcome onboarding flow (first-login detection) and improved empty states

---

#### Phase 43: Admin Management Tools

**Goal:** Admins can manage client relationships from the portal hub — post updates, share files, monitor health, impersonate clients, hide inactive accounts.
**Depends on:** Phase 42 (builds on refreshed portal UI)
**Requirements:** ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05
**Success Criteria** (what must be TRUE):

1. Admin can post a client-visible project update directly from the portal hub without opening the ERP project view
2. Admin can share a file with a client directly from the portal hub
3. Admin sees a client health overview listing last login date, overdue invoice count, stale project flags, and attention-needed indicators per client
4. Admin can switch into "view as client" mode that renders the exact client portal UI with zero admin elements visible
5. Admin can hide or archive an inactive client from the portal hub, removing them from the default client list
   **Plans:** TBD

Plans:

- [ ] 43-01: Quick actions panel — post update and share file per project from portal hub
- [ ] 43-02: Client health overview — last login, overdue invoices, stale projects, attention flags
- [ ] 43-03: View-as-client impersonation mode and hide/archive inactive clients

---

## Progress

| Phase                                  | Milestone | Plans Complete | Status      | Completed  |
| -------------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1-38                                   | v1.0–v3.0 | All            | Complete    | 2026-03-27 |
| 39. Portal Cleanup                     | v4.0      | 1/1            | Complete    | 2026-03-28 |
| 40. Client File Uploads                | v4.0      | 2/2            | Complete    | 2026-03-28 |
| 41. Financial Dashboard Completion     | v4.0      | 0/2            | Not started | -          |
| 42. Portal Design Refresh & Onboarding | v4.0      | 0/4            | Not started | -          |
| 43. Admin Management Tools             | v4.0      | 0/3            | Not started | -          |
