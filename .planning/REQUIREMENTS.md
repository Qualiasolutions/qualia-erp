# Requirements: Qualia ERP v2.1

**Defined:** 2026-03-24
**Core Value:** Fawzi has real-time visibility into who's working, when, and on what — employees clock in/out every session with zero friction.

## v2.1 Requirements

### Session Management

- [ ] **SESS-01**: Employee sees forced clock-in modal on app open if no active session
- [ ] **SESS-02**: Clock-in modal shows employee's assigned projects to select from
- [ ] **SESS-03**: Employee can clock out at any time via persistent UI element in header/sidebar
- [ ] **SESS-04**: Clock-out requires mandatory summary of work completed before closing session
- [ ] **SESS-05**: Multiple sessions per day tracked independently (morning, after-lunch, etc.)
- [ ] **SESS-06**: New `work_sessions` table replaces `daily_checkins` for session storage

### Enforcement

- [ ] **ENFC-01**: Idle detection prompts "Are you still working?" after inactivity timeout
- [ ] **ENFC-02**: Banner reminder appears when planned logout time is reached
- [ ] **ENFC-03**: Browser beforeunload warns if employee closes tab without clocking out
- [ ] **ENFC-04**: Auto clock-out after extended idle with no response

### Live Dashboard

- [ ] **LIVE-01**: Admin dashboard shows real-time employee status (clocked in/out, which project, session duration)
- [ ] **LIVE-02**: Status indicators update via SWR polling (green = active, red = offline)
- [ ] **LIVE-03**: Admin can view session history for any employee by date

### Cleanup

- [ ] **CLEAN-01**: Remove TaskTimeTracker component and all timer UI from task cards
- [ ] **CLEAN-02**: Remove task_time_logs references from team dashboard queries
- [ ] **CLEAN-03**: Replace old check-in modal with new session clock-in modal
- [ ] **CLEAN-04**: Update /admin/attendance page to show session-based data

## Future Requirements

### Attendance Analytics

- **ANALYTICS-01**: Weekly/monthly attendance summary per employee
- **ANALYTICS-02**: Average session duration trends
- **ANALYTICS-03**: Project time allocation breakdown

## Out of Scope

| Feature                             | Reason                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Supabase Realtime for live status   | SWR polling sufficient for 3 users                                        |
| GPS/location tracking               | Trust-based system, not surveillance                                      |
| Per-task time tracking              | Replaced by session-based attendance                                      |
| Overtime calculations               | Not relevant for current team structure                                   |
| Break time tracking within sessions | Sessions are per-block (morning, afternoon) — breaks are between sessions |

## Traceability

| Requirement | Phase    | Status  |
| ----------- | -------- | ------- |
| SESS-01     | Phase 29 | Pending |
| SESS-02     | Phase 29 | Pending |
| SESS-03     | Phase 29 | Pending |
| SESS-04     | Phase 29 | Pending |
| SESS-05     | Phase 29 | Pending |
| SESS-06     | Phase 28 | Pending |
| ENFC-01     | Phase 31 | Pending |
| ENFC-02     | Phase 31 | Pending |
| ENFC-03     | Phase 31 | Pending |
| ENFC-04     | Phase 31 | Pending |
| LIVE-01     | Phase 30 | Pending |
| LIVE-02     | Phase 30 | Pending |
| LIVE-03     | Phase 30 | Pending |
| CLEAN-01    | Phase 28 | Pending |
| CLEAN-02    | Phase 28 | Pending |
| CLEAN-03    | Phase 29 | Pending |
| CLEAN-04    | Phase 29 | Pending |

**Coverage:**

- v2.1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---

_Requirements defined: 2026-03-24_
_Last updated: 2026-03-24 after roadmap creation (phases 28-31)_
