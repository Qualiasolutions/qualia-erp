# Requirements: Qualia ERP v2.0

**Defined:** 2026-03-15
**Core Value:** Give Fawzi real-time visibility into team workload, activity, and project health — and give employees clear daily structure with check-ins and phase ownership.

## v2.0 Requirements

### Team Visibility

- [ ] **TEAM-01**: Owner can view a team overview page showing each employee's active project assignments, task counts (todo/in-progress/done this week), and last activity timestamp
- [ ] **TEAM-02**: Owner can see a workload widget on the dashboard showing tasks per person grouped by status, with overload flagging (>X active tasks)
- [ ] **TEAM-03**: Owner can see shift awareness indicators showing who is currently on-shift vs off-shift based on stored schedule (Moayad 8-3, Hasan 6-10PM)

### Activity & Audit

- [ ] **ACT-01**: Owner can view a workspace-wide activity feed showing recent actions (task created/completed, project updates, assignments) with actor names and timestamps
- [ ] **ACT-02**: Owner can see a client activity timeline on the client detail page showing chronological history of calls, emails, meetings, notes, and status changes

### Notifications

- [ ] **NOTIF-01**: Owner receives an in-app notification when a task is marked as completed by an employee
- [ ] **NOTIF-02**: Owner and employees receive a scheduled morning email at shift start with today's due tasks, overdue items, and health alerts

### Review & Oversight

- [ ] **REV-01**: Owner can see a review queue (on dashboard or dedicated view) listing all tasks with `review_status: 'pending'`, sorted by submission time
- [ ] **REV-02**: Owner can view a project health dashboard page showing all projects sorted by health score (worst first) with trend arrows and severity indicators

### Phase Ownership

- [ ] **PHASE-01**: Owner can assign an employee to a specific project phase (optional `assignee_id` on `project_phases`)
- [ ] **PHASE-02**: Phase assignee is displayed on the phase UI and filters are available to see "my phases"

### Daily Check-ins

- [ ] **CHECKIN-01**: Employee is prompted with a daily check-in when opening the ERP (what did you do, what's blocked) stored as a `daily_checkins` record
- [ ] **CHECKIN-02**: Owner can view all check-ins on the team overview page, filterable by person and date

### Data Cleanup

- [ ] **CLEANUP-01**: Learning system fully deleted — tables (`skill_categories`, `skills`, `user_skills`, `skill_practice_log`, `achievements`, `user_achievements`, `task_reflections`, `teaching_notes`), profile fields (`learn_mode`, `total_xp`, `current_streak`, `onboarding_step`, `onboarding_completed`), all actions in `learning.ts`, and related UI components
- [ ] **CLEANUP-02**: Fix hardcoded team members in `daily-flow.ts` — replace email-based lookup with dynamic profile query

### Design Quality

- [ ] **DQ-01**: All new frontend pages and components pass `/critique` design review (visual hierarchy, information architecture, emotional resonance)
- [ ] **DQ-02**: All new frontend pages and components pass `/polish` final detail pass (spacing, alignment, consistency)
- [ ] **DQ-03**: All new frontend pages and components pass `/harden` edge case review (overflow, empty states, loading states, error handling)

## v2.1 Requirements (Deferred)

- **REALTIME-01**: Supabase Realtime subscriptions for instant notification delivery
- **AI-01**: AI-powered weekly team performance recap email
- **TIME-01**: Time tracking with clock-in/clock-out
- **PUSH-01**: Push notifications via browser service workers

## Out of Scope

| Feature                  | Reason                                                |
| ------------------------ | ----------------------------------------------------- |
| Supabase Realtime        | Polling at 45s is sufficient for a 3-person team      |
| Time tracking (clock)    | Manual schedule blocking covers the need              |
| Push notifications       | In-app + email notifications are enough               |
| AI weekly recap          | Nice-to-have, not critical for team coordination      |
| Learning/XP/gamification | Being deleted — unnecessary complexity for small team |

## Traceability

| Requirement | Phase    | Status  |
| ----------- | -------- | ------- |
| TEAM-01     | Phase 27 | Pending |
| TEAM-02     | Phase 27 | Pending |
| TEAM-03     | Phase 27 | Pending |
| ACT-01      | Phase 27 | Pending |
| ACT-02      | Phase 27 | Pending |
| NOTIF-01    | Phase 26 | Pending |
| NOTIF-02    | Phase 27 | Pending |
| REV-01      | Phase 27 | Pending |
| REV-02      | Phase 27 | Pending |
| PHASE-01    | Phase 26 | Pending |
| PHASE-02    | Phase 27 | Pending |
| CHECKIN-01  | Phase 26 | Pending |
| CHECKIN-02  | Phase 27 | Pending |
| CLEANUP-01  | Phase 26 | Pending |
| CLEANUP-02  | Phase 26 | Pending |
| DQ-01       | Phase 27 | Pending |
| DQ-02       | Phase 27 | Pending |
| DQ-03       | Phase 27 | Pending |

**Coverage:**

- v2.0 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---

_Requirements defined: 2026-03-15_
_Last updated: 2026-03-15 after initial definition_
