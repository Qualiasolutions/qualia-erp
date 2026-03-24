# Roadmap: Qualia ERP

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-03-01)
- ✅ **v1.1 Production Polish** - Phases 4-8 (shipped 2026-03-04)
- ✅ **v1.2 Premium Animations** - Phases 10-11 (shipped 2026-03-04)
- ✅ **v1.3 Full ERP-Portal Integration** - Phases 12-16 (shipped 2026-03-06)
- ✅ **v1.4 Admin Portal Onboarding** - Phases 17-19 (shipped 2026-03-09)
- ✅ **v1.5.1 Security Hardening** - Phase 25 (shipped 2026-03-10)
- ✅ **v2.0 Team Efficiency & Owner Oversight** - Phase 26 (shipped 2026-03-15)
- 🚧 **v2.1 Attendance & Live Oversight** - Phases 28-31 (in progress)

## Phases

<details>
<summary>✅ v1.0–v2.0 (Phases 1-26) — SHIPPED</summary>

Phases 1-26 complete. See MILESTONES.md for full history.

Phase 26: Team Sync & Daily Structure — deleted learning system, added daily check-ins, task time logging, team dashboard, owner updates, morning emails, task notifications, GitHub/Vercel provisioning fix.

</details>

---

### 🚧 v2.1 Attendance & Live Oversight (In Progress)

**Milestone Goal:** Replace morning/evening check-ins with multi-session clock-in/clock-out, give Fawzi real-time visibility into who's working on what, enforce clock-outs, and remove per-task time tracking.

#### Phase 28: DB Migration & Cleanup

**Goal:** The codebase is free of the old check-in and task time tracking systems — new `work_sessions` schema is in place and ready to be built on.

**Depends on:** Phase 26 (complete)
**Requirements:** SESS-06, CLEAN-01, CLEAN-02

**Success Criteria** (what must be TRUE):

1. `work_sessions` table exists with correct schema — old `daily_checkins` table is either removed or preserved as archive with no active references
2. `TaskTimeTracker` component and timer UI are gone from task cards — no timer buttons, start/stop controls, or duration displays remain
3. `task_time_logs` table references are removed from all queries — `team-dashboard.ts` and any other action files query without it
4. App builds clean (`npx tsc --noEmit`) with no orphan imports or missing module errors

**Plans:** 2 plans

Plans:

- [x] 28-01-PLAN.md — Create work_sessions table in Supabase + remove task_time_logs references from queries and SWR hooks
- [x] 28-02-PLAN.md — Remove TaskTimeTracker component file + strip all timer UI from team-task-card.tsx, verify clean build

#### Phase 29: Session Clock-In / Clock-Out

**Goal:** Employees can clock in when they start working (selecting a project) and clock out with a summary — the core session loop is fully functional.

**Depends on:** Phase 28
**Requirements:** SESS-01, SESS-02, SESS-03, SESS-04, SESS-05, CLEAN-03, CLEAN-04

**Success Criteria** (what must be TRUE):

1. Employee opening the ERP app with no active session sees a clock-in modal — they cannot dismiss it without selecting a project and clocking in
2. Clock-in modal shows only the employee's assigned projects (not all projects) to select from
3. A persistent clock-out button is visible in the header/sidebar throughout the session — always accessible from any page
4. Clicking clock-out opens a summary form — the session cannot close without a text summary of work completed
5. Multiple sessions per day work correctly — an employee who clocked out can clock back in and the new session is tracked independently
6. `/admin/attendance` page shows session-based data (project, start time, end time, duration, summary) instead of morning/evening check-in format

**Plans:** TBD

Plans:

- [ ] 29-01: Session server actions (clock-in, clock-out, get active session, get today's sessions)
- [ ] 29-02: Clock-in modal (forced on open, project selection from assignments)
- [ ] 29-03: Persistent clock-out button + clock-out summary modal
- [ ] 29-04: Update /admin/attendance page to session model

#### Phase 30: Live Status Dashboard

**Goal:** Fawzi can see at a glance who is currently working, on which project, for how long — and can drill into session history for any employee.

**Depends on:** Phase 29
**Requirements:** LIVE-01, LIVE-02, LIVE-03

**Success Criteria** (what must be TRUE):

1. Admin dashboard shows each employee's current status: clocked in (green indicator, project name, session duration ticking) or offline (red/grey indicator, time since last session)
2. Status indicators refresh automatically via SWR polling — no manual reload needed
3. Admin can select any employee and date to view their session history for that day (sessions list with project, start/end, duration, summary)

**Plans:** TBD

Plans:

- [ ] 30-01: Live status data action + SWR hook for employee statuses
- [ ] 30-02: Live status panel UI on admin dashboard (employee cards with active/offline state)
- [ ] 30-03: Session history view for admin (per-employee, per-date drill-down)

#### Phase 31: Clock-Out Enforcement

**Goal:** Employees who forget or try to skip clocking out are caught — idle detection, planned logout reminders, and browser exit warnings keep sessions honest.

**Depends on:** Phase 29
**Requirements:** ENFC-01, ENFC-02, ENFC-03, ENFC-04

**Success Criteria** (what must be TRUE):

1. After a configurable idle period with no mouse/keyboard activity, a "Are you still working?" prompt appears — the session does not silently continue
2. If an employee set a planned logout time and it passes while still clocked in, a banner reminder appears prompting them to clock out
3. Closing or refreshing the browser tab while clocked in shows a native beforeunload warning — the session is not silently abandoned
4. If an employee dismisses the idle prompt and remains idle for an extended period, the session auto-closes with a note indicating it was auto-closed due to inactivity

**Plans:** TBD

Plans:

- [ ] 31-01: Idle detection hook + "still working?" prompt + auto clock-out after extended idle
- [ ] 31-02: Planned logout banner reminder + beforeunload warning

---

## Progress

| Phase                            | Milestone | Plans Complete | Status      | Completed  |
| -------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1-26. (Phases 1-26)              | v1.0–v2.0 | All            | Complete    | 2026-03-24 |
| 28. DB Migration & Cleanup       | v2.1      | 2/2            | ✅ Complete | 2026-03-24 |
| 29. Session Clock-In / Clock-Out | v2.1      | 0/4            | Not started | -          |
| 30. Live Status Dashboard        | v2.1      | 0/3            | Not started | -          |
| 31. Clock-Out Enforcement        | v2.1      | 0/2            | Not started | -          |
