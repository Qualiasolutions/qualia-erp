# State: Qualia Portal & Trainee System

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** Moayad can independently execute project phases with clear guidance while Fawzi reviews at phase boundaries — and clients see real-time project progress without internal complexity.
**Current focus:** Planning next milestone

## Current Position

Phase: 21 of 24 (Client Experience)
Plan: 21-02 complete (2 of 3 plans in phase 21 — In progress)
Status: In progress
Last activity: 2026-03-10 — Completed 21-02: client_action_items table + PortalActionItems urgency widget

Progress: [##########░░░░] 19/24 phases complete (v1.0-v1.4) | Phase 21: 21-01, 21-02 done (21-03 remaining)

## Performance Metrics

**By Milestone:**

| Milestone                           | Phases | Plans | Shipped    |
| ----------------------------------- | ------ | ----- | ---------- |
| v1.0 MVP                            | 3      | 8     | 2026-03-01 |
| v1.1 Production Polish              | 5      | 9     | 2026-03-04 |
| v1.2 Premium Animations             | 2      | 7     | 2026-03-04 |
| v1.3 Full ERP-Portal Integration    | 5      | 13    | 2026-03-06 |
| v1.4 Admin Portal Onboarding        | 3      | 8     | 2026-03-09 |
| v1.5 Production-Ready Client Portal | 5      | 14    | TBD        |

**Overall:** 5 milestones shipped, 19 phases complete, 45 plans executed, 115,654 LOC TypeScript
**Current milestone:** v1.5 Production-Ready Client Portal (5 phases, 14 plans planned)

## Accumulated Context

### Key Decisions

| #   | Decision                                                               | Rationale                                                                         | Date       |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------- |
| 1   | CRM email is source of truth for portal onboarding (contacts[0].email) | No free-text email entry; ties portal accounts to CRM contacts                    | 2026-03-10 |
| 2   | Orphan rollback only on total failure (not partial)                    | Partial project linking is acceptable; full rollback only when nothing was linked | 2026-03-10 |
| 3   | node:crypto randomBytes for temp passwords                             | Cryptographically secure vs Math.random()                                         | 2026-03-10 |
| 4   | Client cannot self-complete action items (enforced in server action)   | RLS would conflict with client read policy; cleaner to gate in action function    | 2026-03-10 |
| 5   | Urgency computed client-side from due_date, no DB column               | Simpler SWR caching, no DB column needed; date math is trivial                    | 2026-03-10 |

### Blockers/Concerns

(None — fresh milestone)

### Quick Tasks Completed

| #   | Description                                                                   | Date       | Commit  | Directory                                                                                                     |
| --- | ----------------------------------------------------------------------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| 011 | Fix all production audit blockers and quick wins                              | 2026-03-10 | 533e41e | [011-fix-all-production-audit-blockers-and-qu](./quick/011-fix-all-production-audit-blockers-and-qu/)         |
| 012 | Simplified portal admin panel — single project picker                         | 2026-03-09 | 150f4eb | [12-simplified-portal-admin-panel-single-pro](./quick/12-simplified-portal-admin-panel-single-pro/)           |
| 013 | Add missing auth guards to phases, deployments, pipeline, logos               | 2026-03-10 | bc20282 | [013-add-missing-auth-guards-to-phases-deploy](./quick/013-add-missing-auth-guards-to-phases-deploy/)         |
| 014 | Enhance client portal UI/UX — design, layout, styling, animations, typography | 2026-03-10 | dc8ed5e | [14-enhance-client-portal-ui-ux-design-layou](./quick/14-enhance-client-portal-ui-ux-design-layou/)           |
| 015 | Fix loading icon, logo uploads, schedule block merging + Hasan evening hours  | 2026-03-10 | bb52e99 | [015-fix-loading-icon-logo-uploads-schedule-merge](./quick/015-fix-loading-icon-logo-uploads-schedule-merge/) |

## Session Continuity

Last session: 2026-03-10
Stopped at: Phase 21 in progress. Plans 21-01 and 21-02 complete. 21-03 remaining.
Resume file: `.planning/phases/21-client-experience/21-02-SUMMARY.md`
**Next action:** Execute plan 21-03

---

_State initialized: 2026-03-01_
_Last updated: 2026-03-10 — Completed plan 21-02: client_action_items table + PortalActionItems urgency widget on dashboard_
