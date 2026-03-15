# Roadmap: Qualia ERP v2.0

**Milestone:** v2.0 Team Efficiency & Owner Oversight
**Phases:** 1 (Phase 26)
**Requirements:** 17

## Phase 26: Team Sync & Daily Structure

**Goal:** Delete dead learning system, add daily check-ins, task time logging, completion notifications, morning emails, team task dashboard, owner updates system, and fix GitHub/Vercel auto-provisioning — all with impeccable design quality.

**Requirements:** CLEANUP-01, CLEANUP-02, CHECKIN-01, CHECKIN-02, NOTIF-01, NOTIF-02, DASH-01, DASH-02, TIME-01, TIME-02, TIME-03, UPDATE-01, UPDATE-02, PROV-01, PROV-02, PROV-03, DQ-01

**Plans:** 7 plans

Plans:

- [ ] 26-01-PLAN.md — Delete learning system + migrate daily_checkins, owner_updates, task_time_logs tables
- [ ] 26-02-PLAN.md — Fix hardcoded team members in daily-flow.ts with dynamic profile query
- [ ] 26-03-PLAN.md — Remove VAPI from project creation wizard
- [ ] 26-04-PLAN.md — Check-in actions, owner update actions, time log actions + task completion notification
- [ ] 26-05-PLAN.md — Team dashboard data action + morning email cron
- [ ] 26-06-PLAN.md — Team task container + daily check-in modal (dashboard UI)
- [ ] 26-07-PLAN.md — Owner updates banner/compose + task time tracker UI

**Success Criteria:**

1. Learning system tables, actions, and components are fully removed — no orphan references
2. `daily-flow.ts` dynamically queries profiles instead of hardcoding emails
3. Employees see a check-in prompt on ERP open if they haven't checked in today — owner sees all check-ins
4. Completing a task fires an in-app notification to the task creator / admin
5. Cron sends morning email to each user with their due/overdue tasks and meetings
6. Dashboard shows a team task container where managers see all employees' tasks and employees see their own — grouped by status, scannable
7. Employees can log start/finish time on tasks — duration is calculated and visible
8. Owner can post updates/notes to employees — employees see them on login and can acknowledge
9. Creating a project with GitHub+Vercel auto-creates repo, Vercel project, and connects them
10. VAPI removed from project creation wizard
11. All new UI passes `/critique` + `/polish` + `/harden` — consistent with existing ERP aesthetic

---

## Build Order

### Wave 1: Cleanup & Data Layer

1. Delete learning system (migration + code removal)
2. Fix `daily-flow.ts` hardcoded emails
3. Create `daily_checkins` table + server actions
4. Add `started_at`, `finished_at`, `time_spent_minutes` fields to tasks (or separate `task_time_logs` table)
5. Wire `notifyTaskCompleted` in task status change flow
6. Create `owner_updates` table (message, target user/all, read status)

### Wave 2: Backend — Check-ins, Time, Email, Provisioning

7. Daily check-in server actions (create, get today's, get by person/date)
8. Task time logging actions (start, finish, get time for task)
9. Morning email cron endpoint + Resend template
10. Team dashboard data action (tasks grouped by assignee + status)
11. Owner updates server actions (create, get unread, acknowledge)
12. Fix/verify GitHub auto-provisioning (create repo via GitHub API)
13. Fix/verify Vercel auto-provisioning (create project, connect to repo)
14. Remove VAPI from project wizard options

### Wave 3: Frontend — Dashboard & UI

15. Team task dashboard container component (replaces/enhances schedule block)
16. Task time logging UI (start/stop buttons on task cards)
17. Daily check-in prompt modal + owner check-in view
18. Owner updates compose UI + employee update banner/card
19. Morning email template design

### Wave 4: Design Quality

20. Run `/critique` on all new components
21. Run `/polish` for final detail pass
22. Run `/harden` for edge cases, empty states, loading states

---

_Roadmap created: 2026-03-15_
_Last updated: 2026-03-15 — Phase 26 planned (7 plans, 3 waves)_
