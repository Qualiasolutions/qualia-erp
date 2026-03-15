# Requirements: Qualia ERP v2.0

**Defined:** 2026-03-15
**Core Value:** Give Fawzi visibility into team work and give employees clear daily structure — check-ins, time logging, and a useful task dashboard.

## v2.0 Requirements

### Data Cleanup

- [ ] **CLEANUP-01**: Learning system fully deleted — tables (`skill_categories`, `skills`, `user_skills`, `skill_practice_log`, `achievements`, `user_achievements`, `task_reflections`, `teaching_notes`), profile fields (`learn_mode`, `total_xp`, `current_streak`, `onboarding_step`, `onboarding_completed`), all actions in `learning.ts`, and related UI components
- [ ] **CLEANUP-02**: Fix hardcoded team members in `daily-flow.ts` — replace email-based lookup with dynamic profile query

### Daily Check-ins

- [ ] **CHECKIN-01**: Employee is prompted with a daily check-in when opening the ERP (what did you do, what's blocked) stored as a `daily_checkins` record
- [ ] **CHECKIN-02**: Owner can view employee check-ins on the dashboard, filterable by person and date

### Notifications

- [ ] **NOTIF-01**: Owner receives an in-app notification when a task is marked as completed by an employee
- [ ] **NOTIF-02**: Owner and employees receive a scheduled morning email at shift start with today's due tasks, overdue items, and upcoming meetings

### Team Dashboard

- [ ] **DASH-01**: Dashboard has a team task container (replacing or alongside the schedule) showing each employee's tasks grouped by status — useful at a glance for both managers and employees
- [ ] **DASH-02**: Employee task cards show assignee, project, priority, and due date in a clean, scannable layout

### Time Logging

- [ ] **TIME-01**: Employee can log when they start working on a task (records `started_at` timestamp)
- [ ] **TIME-02**: Employee can log when they finish a task (records `finished_at` timestamp, calculates duration)
- [ ] **TIME-03**: Time spent is visible on task cards and in the team dashboard container

### Design Quality

- [ ] **DQ-01**: All new UI passes `/critique` + `/polish` + `/harden` flow — impeccable design matching existing ERP aesthetic

## v2.1 Requirements (Deferred)

- **TEAM-01**: Dedicated team overview page with per-person workload rollup
- **ACT-01**: Workspace-wide activity feed UI
- **ACT-02**: Client activity timeline on client detail page
- **REV-01**: Review queue for pending task reviews
- **REV-02**: Project health dashboard page
- **PHASE-01**: Phase-level assignees on project_phases
- **REALTIME-01**: Supabase Realtime for instant notifications
- **AI-01**: AI-powered weekly team performance recap

## Out of Scope

| Feature                    | Reason                                    |
| -------------------------- | ----------------------------------------- |
| Supabase Realtime          | Polling at 45s is sufficient for 3 people |
| Phase-level assignees      | Deferred to v2.1                          |
| Activity feed page         | Deferred to v2.1                          |
| Project health dashboard   | Deferred to v2.1                          |
| Review queue               | Deferred to v2.1                          |
| Client activity timeline   | Deferred to v2.1                          |
| Shift awareness indicators | Deferred to v2.1                          |
| Learning/XP/gamification   | Being deleted — dead weight               |

## Traceability

| Requirement | Phase    | Status  |
| ----------- | -------- | ------- |
| CLEANUP-01  | Phase 26 | Pending |
| CLEANUP-02  | Phase 26 | Pending |
| CHECKIN-01  | Phase 26 | Pending |
| CHECKIN-02  | Phase 26 | Pending |
| NOTIF-01    | Phase 26 | Pending |
| NOTIF-02    | Phase 26 | Pending |
| DASH-01     | Phase 26 | Pending |
| DASH-02     | Phase 26 | Pending |
| TIME-01     | Phase 26 | Pending |
| TIME-02     | Phase 26 | Pending |
| TIME-03     | Phase 26 | Pending |
| DQ-01       | Phase 26 | Pending |

**Coverage:**

- v2.0 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---

_Requirements defined: 2026-03-15_
_Last updated: 2026-03-15 after scope reduction to 1 phase_
