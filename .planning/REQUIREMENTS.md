# Requirements: Qualia Portal & Trainee System

**Defined:** 2026-03-08
**Core Value:** Moayad can independently execute project phases with clear guidance while Fawzi reviews at phase boundaries — and clients see real-time project progress without internal complexity.

## v1 Requirements

Requirements for v1.4 Admin Portal Onboarding milestone. Each maps to roadmap phases.

### Project Import

- [ ] **IMPORT-01**: Admin can view ERP projects that are not yet portal-enabled
- [ ] **IMPORT-02**: Admin can select multiple ERP projects for bulk import to portal
- [ ] **IMPORT-03**: Admin can preview what client will see before enabling portal access
- [ ] **IMPORT-04**: Admin can configure project-specific portal settings during import
- [ ] **IMPORT-05**: Admin can save portal configuration and mark projects ready for client invitation (actual portal access created in Phase 18)

### Client Invitation

- [x] **INVITE-01**: Admin can enter client email address for a portal-enabled project
- [x] **INVITE-02**: Admin can send invitation email with project details to client
- [x] **INVITE-03**: Admin can resend invitation if client hasn't responded
- [x] **INVITE-04**: Admin can view invitation status (sent, delivered, opened, account created)
- [x] **INVITE-05**: System tracks invitation history and status changes

### Client Onboarding

- [ ] **ONBOARD-01**: Client receives well-designed invitation email with clear call-to-action
- [ ] **ONBOARD-02**: Client can click invitation link to access account creation page
- [ ] **ONBOARD-03**: Client can create account with email, password, and basic profile
- [ ] **ONBOARD-04**: Client is automatically logged in after account creation
- [ ] **ONBOARD-05**: Client has immediate access to their specific project after signup
- [ ] **ONBOARD-06**: Client can access project roadmap, files, and comments immediately

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Invitation Features

- **INVITE-06**: Invitation templates with customizable messaging
- **INVITE-07**: Scheduled invitation sending
- **INVITE-08**: Multiple recipients per project invitation
- **INVITE-09**: Invitation link expiry for security

### Client Management

- **CLIENT-01**: Admin can view all portal clients in management dashboard
- **CLIENT-02**: Admin can edit client account details
- **CLIENT-03**: Admin can disable client portal access
- **CLIENT-04**: Admin can transfer client to different project

### Analytics

- **ANALYTICS-01**: Dashboard showing invitation success rates
- **ANALYTICS-02**: Client signup and engagement metrics
- **ANALYTICS-03**: Project onboarding completion tracking

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                       | Reason                                             |
| ----------------------------- | -------------------------------------------------- |
| SSO/OAuth integration         | Email/password sufficient for v1, adds complexity  |
| Client self-service import    | Admin-controlled onboarding ensures quality        |
| Real-time invitation tracking | Email delivery status sufficient, avoid complexity |
| White-label customization     | Single-tenant system, standardized branding        |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase    | Status  |
| ----------- | -------- | ------- |
| IMPORT-01   | Phase 17 | Done    |
| IMPORT-02   | Phase 17 | Done    |
| IMPORT-03   | Phase 17 | Done    |
| IMPORT-04   | Phase 17 | Done    |
| IMPORT-05   | Phase 17 | Done    |
| INVITE-01   | Phase 18 | Done    |
| INVITE-02   | Phase 18 | Done    |
| INVITE-03   | Phase 18 | Done    |
| INVITE-04   | Phase 18 | Done    |
| INVITE-05   | Phase 18 | Done    |
| ONBOARD-01  | Phase 19 | Pending |
| ONBOARD-02  | Phase 19 | Pending |
| ONBOARD-03  | Phase 19 | Pending |
| ONBOARD-04  | Phase 19 | Pending |
| ONBOARD-05  | Phase 19 | Pending |
| ONBOARD-06  | Phase 19 | Pending |

**Coverage:**

- v1 requirements: 16 total
- Mapped to phases: 16 ✓
- Unmapped: 0 ✓

**Phase Distribution:**

- Phase 17 (Project Import Flow): 5 requirements
- Phase 18 (Invitation System): 5 requirements
- Phase 19 (Client Onboarding Flow): 6 requirements

---

_Requirements defined: 2026-03-08_
_Last updated: 2026-03-08 (revision: clarified IMPORT-05 phase boundary)_
