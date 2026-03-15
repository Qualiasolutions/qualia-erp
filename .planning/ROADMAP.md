# Roadmap: Qualia ERP v2.0

**Milestone:** v2.0 Team Efficiency & Owner Oversight
**Phases:** 1 (Phase 26)
**Requirements:** 12

## Phase 26: Team Sync & Daily Structure

**Goal:** Delete dead learning system, add daily check-ins, task time logging, completion notifications, morning emails, and a team task dashboard container — all with impeccable design quality.

**Requirements:** CLEANUP-01, CLEANUP-02, CHECKIN-01, CHECKIN-02, NOTIF-01, NOTIF-02, DASH-01, DASH-02, TIME-01, TIME-02, TIME-03, DQ-01

**Success Criteria:**

1. Learning system tables, actions, and components are fully removed — no orphan references
2. `daily-flow.ts` dynamically queries profiles instead of hardcoding emails
3. Employees see a check-in prompt on ERP open if they haven't checked in today — owner sees all check-ins
4. Completing a task fires an in-app notification to the task creator / admin
5. Cron sends morning email to each user with their due/overdue tasks and meetings
6. Dashboard shows a team task container where managers see all employees' tasks and employees see their own — grouped by status, scannable
7. Employees can log start/finish time on tasks — duration is calculated and visible
8. All new UI passes `/critique` + `/polish` + `/harden` — consistent with existing ERP aesthetic

---

## Build Order

### Wave 1: Cleanup & Data Layer

1. Delete learning system (migration + code removal)
2. Fix `daily-flow.ts` hardcoded emails
3. Create `daily_checkins` table + server actions
4. Add `started_at`, `finished_at`, `time_spent_minutes` fields to tasks (or separate `task_time_logs` table)
5. Wire `notifyTaskCompleted` in task status change flow

### Wave 2: Backend — Check-ins, Time, Email

6. Daily check-in server actions (create, get today's, get by person/date)
7. Task time logging actions (start, finish, get time for task)
8. Morning email cron endpoint + Resend template
9. Team dashboard data action (tasks grouped by assignee + status)

### Wave 3: Frontend — Dashboard & UI

10. Team task dashboard container component (replaces/enhances schedule block)
11. Task time logging UI (start/stop buttons on task cards)
12. Daily check-in prompt modal + owner check-in view
13. Morning email template design

### Wave 4: Design Quality

14. Run `/critique` on all new components
15. Run `/polish` for final detail pass
16. Run `/harden` for edge cases, empty states, loading states

---

_Roadmap created: 2026-03-15_
_Last updated: 2026-03-15 after scope reduction to 1 phase_
