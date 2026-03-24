# State: Qualia Portal & Trainee System

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10)

**Core value:** Fawzi has real-time visibility into who's working, when, and on what — employees clock in/out every session with zero friction.
**Current focus:** v2.1 Attendance & Live Oversight

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-24 — Completed quick task 28: Fix review blockers

## Accumulated Context

### Key Decisions

| #   | Decision                                                              | Rationale                                                                                       | Date       |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| 1   | Renamed 20260315_add_daily_structure.sql to 20260315100000            | Avoid schema_migrations_pkey conflict when two migrations share same date prefix                | 2026-03-15 |
| 2   | Kept SkillLevel type in lib/ai/memory.ts                              | Separate concept (profiles.skill_level column) — not related to XP/gamification learning system | 2026-03-15 |
| 3   | task_time_logs.duration_minutes as GENERATED ALWAYS AS STORED         | Eliminates app-side duration calculation; computed server-side automatically                    | 2026-03-15 |
| 4   | Morning email cron at 6 AM UTC Mon-Fri (separate from 9 AM reminders) | Different purpose: daily briefing vs overdue reminders — keeps concerns separate                | 2026-03-15 |
| 5   | Direct role query instead of isUserAdmin() in team-dashboard.ts       | isUserAdmin() helper requires userId arg; inline query is simpler and correct                   | 2026-03-15 |
| 6   | Removed currentUserId from TeamTaskContainer props                    | Server action derives identity from auth.uid() — no need to thread client-side ID               | 2026-03-15 |
| 7   | AdminCheckinsSection lazy-loads on panel open, not mount              | Avoids unnecessary checkin queries on every dashboard load for admin users                      | 2026-03-15 |
| 8   | TaskTimeTracker derives state from timeLog prop, not own SWR hook     | Avoids N+1 SWR hooks per task card; revalidate() on parent refreshes all task data after timer  | 2026-03-15 |
| 9   | currentUserId re-added to TeamTaskContainer as UI-only prop           | Server actions use auth.uid(); UI needs it to check task ownership for interactive timer        | 2026-03-15 |

### Blockers/Concerns

(None — phase 26 complete)

### Quick Tasks Completed

| #   | Description                                                                    | Date       | Commit  | Directory                                                                                           |
| --- | ------------------------------------------------------------------------------ | ---------- | ------- | --------------------------------------------------------------------------------------------------- |
| 16  | Payments page UX redesign — monthly tracking, income/expenses, per-client view | 2026-03-11 | c6533e1 | [16-payments-page-ux-redesign-monthly-tracki](./quick/16-payments-page-ux-redesign-monthly-tracki/) |
| 17  | Simplify and enhance Client Portal admin page UI/UX                            | 2026-03-11 | 52bb1cf | [17-simplify-and-enhance-client-portal-admin](./quick/17-simplify-and-enhance-client-portal-admin/) |
| 18  | Schedule page: meeting attendee selection + client revalidation fix            | 2026-03-11 | ee44486 | [18-schedule-page-overhaul-unified-team-sche](./quick/18-schedule-page-overhaul-unified-team-sche/) |
| 19  | Automated retainer fees (monthly/annual) and project installment payments      | 2026-03-11 | 7410e4a | [19-automated-retainer-fees-monthly-annual-a](./quick/19-automated-retainer-fees-monthly-annual-a/) |
| 20  | Client Portal workspace creation + per-client project management (admin)       | 2026-03-11 | ac4a513 | [20-client-portal-workspace-management-admin](./quick/20-client-portal-workspace-management-admin/) |
| 21  | Client Portal GlluzTech workspace + roadmap population (9 projects, 41 phases) | 2026-03-12 | 3ce5ed0 | [21-client-portal-create-glluztech-workspace](./quick/21-client-portal-create-glluztech-workspace/) |
| 22  | Dashboard user-scoped schedule + portal design enhancement                     | 2026-03-13 | debdc31 | [22-dashboard-user-scoped-schedule-admin-por](./quick/22-dashboard-user-scoped-schedule-admin-por/) |
| 23  | Pipeline flow view — visual node-based view for project phases                 | 2026-03-13 | 41f8eb8 | [23-pipeline-flow-view-visual-node-based-vie](./quick/23-pipeline-flow-view-visual-node-based-vie/) |
| 24  | Qualia Framework Pipeline loader + GSD webhook + dead code cleanup             | 2026-03-13 | 57080ea | N/A                                                                                                 |
| 24b | Assign clients to existing projects — updateProject fix + project/client UI    | 2026-03-15 | 3419d80 | [24-assign-clients-to-existing-projects-clie](./quick/24-assign-clients-to-existing-projects-clie/) |
| 26  | Status page visible to employees/managers — assigned projects only             | 2026-03-20 |         | [26-make-status-page-visible-to-employees-ma](./quick/26-make-status-page-visible-to-employees-ma/) |
| 27  | Responsive design audit and fixes — mobile nav, touch actions, filter bars     | 2026-03-24 | 094dc77 | [27-responsive-design-audit-and-fixes-across](./quick/27-responsive-design-audit-and-fixes-across/) |
| 28  | Fix review blockers — double cast, plaintext password, touch targets           | 2026-03-24 | 334ba2e | [28-fix-review-blockers-double-cast-plaintex](./quick/28-fix-review-blockers-double-cast-plaintex/) |

## Session Continuity

Last session: 2026-03-24
Stopped at: v2.1 milestone initialization
**Next action:** Define requirements → create roadmap → plan phase → execute

---

_State initialized: 2026-03-01_
_Last updated: 2026-03-10 — v1.5.1 milestone complete, STATE.md reset for next milestone_
