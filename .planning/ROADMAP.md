# Roadmap: Qualia Portal & Trainee System

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-03-01)
- ✅ **v1.1 Production Polish** - Phases 4-8 (shipped 2026-03-04)
- ✅ **v1.2 Premium Animations** - Phases 10-11 (shipped 2026-03-04)
- ✅ **v1.3 Full ERP-Portal Integration** - Phases 12-16 (shipped 2026-03-06)
- 🎯 **v1.4 Admin Portal Onboarding** - Phases 17-19 (in planning)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-3) - SHIPPED 2026-03-01</summary>

### Phase 1: Database & Core Infrastructure

**Goal**: Foundation tables and RLS policies for trainee execution and client portal
**Plans**: 2 plans

Plans:

- [x] 01-01: Create core database tables with RLS policies
- [x] 01-02: Build server actions for phase reviews and project integrations

### Phase 2: Trainee Execution System

**Goal**: Interactive task guidance system for Moayad with phase-level review workflow
**Plans**: 3 plans

Plans:

- [x] 02-01: Interactive task checklist UI with GSD command buttons
- [x] 02-02: Phase review workflow (submit, approve, request changes)
- [x] 02-03: Admin review panel and pending reviews queue

### Phase 3: Client Portal Foundation

**Goal**: Client authentication and portal pages with read-only project views
**Plans**: 3 plans

Plans:

- [x] 03-01: Client authentication and role-based routing
- [x] 03-02: Portal layout and project roadmap view
- [x] 03-03: Shared files, comments, and activity feed

</details>

<details>
<summary>✅ v1.1 Production Polish (Phases 4-8) - SHIPPED 2026-03-04</summary>

### Phase 4: Loading States & Skeleton UI

**Goal**: Professional loading experience with content-shaped skeletons
**Plans**: 2 plans

Plans:

- [x] 04-01: Content-shaped loading skeletons for all portal pages
- [x] 04-02: Crossfade transitions from skeleton to real content

### Phase 5: Page & Modal Transitions

**Goal**: Smooth animations for navigation and modal interactions
**Plans**: 1 plan

Plans:

- [x] 05-01: Framer Motion page transitions and modal animations

### Phase 6: Micro-Interactions

**Goal**: Delightful button, card, and task completion feedback
**Plans**: 1 plan

Plans:

- [x] 06-01: Button press feedback, card hover states, task completion animations

### Phase 7: Email Notifications

**Goal**: Automated notifications for phase review workflow
**Plans**: 2 plans

Plans:

- [x] 07-01: Phase review email notifications via Resend
- [x] 07-02: Optimistic rollback fix for failed comments

### Phase 8: Schedule Consolidation & Mobile Polish

**Goal**: Code cleanup and mobile responsive perfection
**Plans**: 2 plans

Plans:

- [x] 08-01: Consolidate 3 schedule grids into single component (~1,700 lines saved)
- [x] 08-02: Mobile responsive perfection (375px, touch targets, drawers)

</details>

<details>
<summary>✅ v1.2 Premium Animations (Phases 10-11) - SHIPPED 2026-03-04</summary>

### Phase 10: Differentiator Animations

**Goal**: Premium animation effects (stagger, scroll-reveal, spring physics, gesture drawers)
**Plans**: 4 plans

Plans:

- [x] 10-01: Stagger animations on task and inbox lists
- [x] 10-02: Scroll-triggered reveals on roadmap phases
- [x] 10-03: Spring physics on buttons and cards
- [x] 10-04: Gesture-based mobile drawers with Vaul

### Phase 11: Final Polish & DX Improvements

**Goal**: Activity feed pagination, date standardization, code quality improvements
**Plans**: 3 plans

Plans:

- [x] 11-01: Cursor-based pagination for activity feed
- [x] 11-02: Standardize date formatting across portal
- [x] 11-03: useServerAction hook and schedule utility consolidation

</details>

<details>
<summary>✅ v1.3 Full ERP-Portal Integration (Phases 12-16) - SHIPPED 2026-03-06</summary>

**Milestone Goal:** Bridge the complete gap between employees, ERP, projects, client portal, and clients with unified notifications and seamless two-way sync.

#### Phase 12: Employee-Project Assignment System

**Goal**: Admins can assign employees to projects with full tracking and management UI
**Depends on**: Phase 11
**Requirements**: EMPL-01, EMPL-02, EMPL-03, EMPL-04
**Success Criteria** (what must be TRUE):

1. Admin can assign employee to specific project via database and UI
2. Admin can reassign employee between projects without data loss
3. Admin can view all current employee-project assignments in overview table
4. System tracks complete assignment history with timestamps for audit trail

**Plans**: 2 plans in 2 waves

- [x] 12-01-PLAN.md — Database foundation and server actions for assignments
- [x] 12-02-PLAN.md — Admin UI with assignment manager and history table

#### Phase 13: ERP-Portal Integration

**Goal**: Complete two-way synchronization between ERP and portal systems
**Depends on**: Phase 12
**Requirements**: INTEG-01, INTEG-02, INTEG-03, INTEG-04, INTEG-05, INTEG-06
**Success Criteria** (what must be TRUE):

1. Every portal project is linked to corresponding ERP project and client record
2. Project status changes in ERP automatically appear in portal within seconds
3. Client activities in portal appear in unified ERP activity timeline immediately
4. ERP project updates trigger real-time portal data refresh for connected clients
5. All project data syncs bidirectionally without manual intervention

**Plans**: 3 plans in 3 waves

- [x] 13-01-PLAN.md — Data linkage between ERP and portal (client_id FK, integration helpers)
- [x] 13-02-PLAN.md — Real-time sync with SWR and integration status badges
- [x] 13-03-PLAN.md — Gap closure: Enable portal auto-refresh with SWR hooks

#### Phase 14: Unified Notification System

**Goal**: Employees and clients receive automated email notifications for relevant actions via Resend
**Depends on**: Phase 13
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06
**Success Criteria** (what must be TRUE):

1. Employee receives email when assigned project client takes any tracked action
2. Employee receives email when assigned project client submits comment or uploads file
3. Employee can configure notification types and delivery preferences in settings
4. Client receives email when assigned employee updates project status or milestone
5. Notification preferences persist and apply correctly to all future notifications

**Plans**: 3 plans in 2 waves

- [x] 14-01-PLAN.md — Notification preferences infrastructure (DB, RLS, CRUD actions)
- [x] 14-02-PLAN.md — Employee email notifications for client actions
- [x] 14-03-PLAN.md — Client notifications and settings UI

#### Phase 15: Portal Design System

**Goal**: Portal matches ERP's Apple-like aesthetic completely with cohesive design language, using identical typography hierarchy, spacing system, elevation shadows, and interaction patterns for indistinguishable quality perception.
**Depends on**: Phase 13 (can partially parallel)
**Requirements**: DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04, DESIGN-05
**Success Criteria** (what must be TRUE):

1. All portal pages use same typography, spacing, and color scheme as ERP
2. Portal components use identical interaction patterns to ERP (buttons, forms, modals)
3. Portal animations and transitions match ERP's premium feel and timing
4. Portal responsive design works seamlessly across all device sizes (375px+)
5. Visual inspection shows no discernible difference in aesthetic quality between systems

**Plans**: 2 plans in 2 waves

- [x] 15-01-PLAN.md — Typography, spacing, and elevation system foundation
- [x] 15-02-PLAN.md — Interaction patterns, form styling, and responsive polish

#### Phase 16: Complete Portal Pages

**Goal**: Complete all portal pages with full functionality, auto-refresh, and professional UI - settings, features gallery, and enhanced dashboard
**Depends on**: Phase 13
**Requirements**: PORTAL-01, PORTAL-02, PORTAL-03, PORTAL-04, PORTAL-05, PORTAL-06
**Success Criteria** (what must be TRUE):

1. Client can access enhanced dashboard with project overview and key metrics
2. Client can view project features gallery with screenshots, mockups, and descriptions
3. Client can submit feature requests and support tickets via requests page with confirmation
4. Client can view and update account settings and notification preferences
5. Enhanced roadmap page displays with improved layout matching design system

**Plans**: 3 plans in 1 wave

- [x] 16-01-PLAN.md — Account settings page with profile and notification preferences
- [x] 16-02-PLAN.md — Features gallery with lightbox and phase association
- [x] 16-03-PLAN.md — Enhanced dashboard with SWR auto-refresh and organized components

</details>

<details open>
<summary>🎯 v1.4 Admin Portal Onboarding (Phases 17-19) - IN PLANNING</summary>

**Milestone Goal:** Streamlined admin workflow to convert ERP projects to portal-accessible projects with automated client invitation and onboarding flow.

**Overview:** Admin can import ERP projects, send client invitations, and clients can create accounts with immediate project access.

### Phase 17: Project Import Flow

**Goal:** Admin can configure ERP projects for portal access and prepare them for client invitation

**Dependencies:** None (builds on existing ERP and portal infrastructure)

**Requirements:** IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04, IMPORT-05

**Success Criteria** (what must be TRUE):

1. Admin can see list of ERP projects with clear indication of portal configuration status (not configured, ready for invitation, portal active)
2. Admin can select one or multiple projects and see accurate preview of client-facing roadmap view
3. Admin can configure project settings (visibility options, welcome message) before marking ready for portal
4. Admin can save portal configuration and projects are marked "Portal Ready" for Phase 18 invitation system
5. Admin can verify configuration success through visual confirmation and status badge changes

**Plans:** 3 plans in 3 waves

Plans:

- [x] 17-01-PLAN.md — Admin import page with project list and portal status filtering
- [x] 17-02-PLAN.md — Project selection and client roadmap preview modal
- [x] 17-03-PLAN.md — Portal settings configuration and persistence with visual confirmation

---

### Phase 18: Invitation System

**Goal:** Admin can invite clients and track invitation lifecycle

**Dependencies:** Phase 17 (requires portal-enabled projects to invite clients to)

**Requirements:** INVITE-01, INVITE-02, INVITE-03, INVITE-04, INVITE-05

**Success Criteria** (what must be TRUE):

1. Admin can enter client email address for any portal-enabled project and send invitation with one click
2. Admin can view invitation status (sent, delivered, opened, account created) for each project
3. Admin can resend invitation if client hasn't responded within visible time period
4. Admin can see complete invitation history showing all sends, resends, and status changes with timestamps
5. System automatically updates invitation status when client opens email or creates account

**Plans:** 3 plans in 3 waves

Plans:

- [x] 18-01-PLAN.md — Database schema and server actions for invitation tracking
- [x] 18-02-PLAN.md — Invitation email template and admin UI for sending invitations
- [x] 18-03-PLAN.md — Invitation status badges and history modal with resend capability

---

### Phase 19: Client Onboarding Flow

**Goal:** Client can create account and access project immediately after invitation

**Dependencies:** Phase 18 (requires invitation system to send invitations)

**Requirements:** ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04, ONBOARD-05, ONBOARD-06

**Success Criteria** (what must be TRUE):

1. Client receives well-designed invitation email with clear call-to-action and project details
2. Client can click invitation link and land on branded account creation page with pre-filled email
3. Client can complete account creation form and submit successfully without errors
4. Client is automatically logged in and redirected to their project portal page without manual login
5. Client can immediately view project roadmap, download shared files, and leave comments on phases

**Plans:** Pending

</details>

## Progress

**Execution Order:**
Phases execute in numeric order: 17 → 18 → 19

| Phase                                     | Milestone | Plans Complete | Status   | Completed  |
| ----------------------------------------- | --------- | -------------- | -------- | ---------- |
| 1. Database & Core Infrastructure         | v1.0      | 2/2            | Complete | 2026-03-01 |
| 2. Trainee Execution System               | v1.0      | 3/3            | Complete | 2026-03-01 |
| 3. Client Portal Foundation               | v1.0      | 3/3            | Complete | 2026-03-01 |
| 4. Loading States & Skeleton UI           | v1.1      | 2/2            | Complete | 2026-03-04 |
| 5. Page & Modal Transitions               | v1.1      | 1/1            | Complete | 2026-03-04 |
| 6. Micro-Interactions                     | v1.1      | 1/1            | Complete | 2026-03-04 |
| 7. Email Notifications                    | v1.1      | 2/2            | Complete | 2026-03-04 |
| 8. Schedule Consolidation & Mobile Polish | v1.1      | 2/2            | Complete | 2026-03-04 |
| 10. Differentiator Animations             | v1.2      | 4/4            | Complete | 2026-03-04 |
| 11. Final Polish & DX Improvements        | v1.2      | 3/3            | Complete | 2026-03-04 |
| 12. Employee-Project Assignment System    | v1.3      | 2/2            | Complete | 2026-03-06 |
| 13. ERP-Portal Integration                | v1.3      | 3/3            | Complete | 2026-03-06 |
| 14. Unified Notification System           | v1.3      | 3/3            | Complete | 2026-03-06 |
| 15. Portal Design System                  | v1.3      | 2/2            | Complete | 2026-03-06 |
| 16. Complete Portal Pages                 | v1.3      | 3/3            | Complete | 2026-03-06 |
| 17. Project Import Flow                   | v1.4      | 3/3            | Complete | 2026-03-08 |
| 18. Invitation System                     | v1.4      | 3/3            | Complete | 2026-03-08 |
| 19. Client Onboarding Flow                | v1.4      | 0/0            | Pending  | —          |

**Milestone v1.4 Progress:** 2/3 phases complete (67%)

## Dependencies Flow (v1.4)

```
Phase 17 (Project Import)
    ↓
Phase 18 (Invitation System)
    ↓
Phase 19 (Client Onboarding)
```

Linear dependency chain: Must complete project import before invitations can be sent, must have invitations before onboarding flow is needed.

---

_Roadmap created: 2026-03-01_
_Last updated: 2026-03-08 (revision: clarified Phase 17 scope boundary)_
