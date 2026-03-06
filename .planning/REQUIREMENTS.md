# Requirements: Qualia Portal & Trainee System

**Defined:** 2026-03-06
**Core Value:** Moayad can independently execute project phases with clear guidance while Fawzi reviews at phase boundaries — and clients see real-time project progress without internal complexity.

## v1.3 Requirements

Requirements for Full ERP-Portal Integration milestone. Each maps to roadmap phases.

### Employee Management

- [ ] **EMPL-01**: Admin can assign employees to specific projects in the database
- [ ] **EMPL-02**: Admin can reassign employees between projects via management UI
- [ ] **EMPL-03**: Admin can view all current employee-project assignments in overview table
- [ ] **EMPL-04**: System tracks employee assignment history with timestamps

### Notifications

- [ ] **NOTIF-01**: Employee receives email notification when assigned project client takes action
- [ ] **NOTIF-02**: Employee receives email notification when assigned project client submits comment
- [ ] **NOTIF-03**: Employee receives email notification when assigned project client uploads file
- [ ] **NOTIF-04**: Employee can configure which notification types they want to receive
- [ ] **NOTIF-05**: Employee can set notification delivery preferences (email, in-app, both)
- [ ] **NOTIF-06**: Client receives email notification when assigned employee updates project status

### Portal Pages

- [ ] **PORTAL-01**: Client can access enhanced dashboard page with project overview
- [ ] **PORTAL-02**: Client can view project features gallery with screenshots and mockups
- [ ] **PORTAL-03**: Client can submit feature requests and support tickets via requests page
- [ ] **PORTAL-04**: Client can view and update account settings and preferences
- [ ] **PORTAL-05**: Client can configure notification preferences in settings
- [ ] **PORTAL-06**: Enhanced roadmap page displays with improved layout and styling

### Design System

- [ ] **DESIGN-01**: All portal pages match ERP's Apple-like aesthetic and design language
- [ ] **DESIGN-02**: Portal uses consistent typography, spacing, and color scheme with ERP
- [ ] **DESIGN-03**: Portal components use same interaction patterns as ERP (buttons, forms, modals)
- [ ] **DESIGN-04**: Portal animations and transitions match ERP's premium feel
- [ ] **DESIGN-05**: Portal responsive design works seamlessly across all device sizes

### Integration

- [ ] **INTEG-01**: Every portal project is linked to corresponding ERP project and client
- [ ] **INTEG-02**: Project status changes in ERP automatically update in portal
- [ ] **INTEG-03**: Portal client activities appear in unified ERP activity timeline
- [ ] **INTEG-04**: ERP project updates trigger real-time portal refresh for connected clients
- [ ] **INTEG-05**: All project data syncs bidirectionally between ERP and portal systems
- [ ] **INTEG-06**: Notification routing system connects ERP employees with portal clients

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Notifications

- **NOTIF-07**: Real-time browser push notifications for instant updates
- **NOTIF-08**: SMS notifications for urgent project milestones
- **NOTIF-09**: Slack integration for team notifications

### Portal Enhancement

- **PORTAL-07**: Client invoice management with payment portal integration
- **PORTAL-08**: File sharing with version control and collaborative editing
- **PORTAL-09**: Video call scheduling and integration with meetings

### Analytics

- **ANALYTICS-01**: Employee workload analytics and assignment optimization
- **ANALYTICS-02**: Client engagement metrics and portal usage analytics
- **ANALYTICS-03**: Project progress predictions and timeline optimization

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                                 | Reason                                                           |
| --------------------------------------- | ---------------------------------------------------------------- |
| Multi-client portal accounts            | Single client per portal login sufficient for current needs      |
| Client project editing capabilities     | Portal is read-only by design, comments provide feedback channel |
| White-label portal customization        | Qualia branding is business requirement                          |
| Offline portal functionality            | Web-first approach, internet connection assumed                  |
| Portal mobile app                       | Responsive web design covers mobile usage                        |
| Third-party integrations (Slack, Teams) | Focus on core ERP-portal integration first                       |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase    | Status  |
| ----------- | -------- | ------- |
| EMPL-01     | Phase 12 | Pending |
| EMPL-02     | Phase 12 | Pending |
| EMPL-03     | Phase 12 | Pending |
| EMPL-04     | Phase 12 | Pending |
| NOTIF-01    | Phase 14 | Pending |
| NOTIF-02    | Phase 14 | Pending |
| NOTIF-03    | Phase 14 | Pending |
| NOTIF-04    | Phase 14 | Pending |
| NOTIF-05    | Phase 14 | Pending |
| NOTIF-06    | Phase 14 | Pending |
| PORTAL-01   | Phase 16 | Pending |
| PORTAL-02   | Phase 16 | Pending |
| PORTAL-03   | Phase 16 | Pending |
| PORTAL-04   | Phase 16 | Pending |
| PORTAL-05   | Phase 16 | Pending |
| PORTAL-06   | Phase 16 | Pending |
| DESIGN-01   | Phase 15 | Pending |
| DESIGN-02   | Phase 15 | Pending |
| DESIGN-03   | Phase 15 | Pending |
| DESIGN-04   | Phase 15 | Pending |
| DESIGN-05   | Phase 15 | Pending |
| INTEG-01    | Phase 13 | Pending |
| INTEG-02    | Phase 13 | Pending |
| INTEG-03    | Phase 13 | Pending |
| INTEG-04    | Phase 13 | Pending |
| INTEG-05    | Phase 13 | Pending |
| INTEG-06    | Phase 13 | Pending |

**Coverage:**

- v1.3 requirements: 27 total
- Mapped to phases: 27 (100% coverage ✓)
- Unmapped: 0

**Phase Distribution:**

- Phase 12 (Employee-Project Assignment System): 4 requirements
- Phase 13 (ERP-Portal Integration): 6 requirements
- Phase 14 (Unified Notification System): 6 requirements
- Phase 15 (Portal Design System): 5 requirements
- Phase 16 (Complete Portal Pages): 6 requirements

---

_Requirements defined: 2026-03-06_
_Last updated: 2026-03-06 after v1.3 roadmap creation (100% coverage achieved)_
