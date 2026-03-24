# State: Qualia Portal & Trainee System

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Fawzi has real-time visibility into who's working, when, and on what — employees clock in/out every session with zero friction.
**Current focus:** v2.1 Attendance & Live Oversight — Phase 28 (DB Migration & Cleanup)

## Current Position

Phase: 28 of 31 (DB Migration & Cleanup)
Plan: 0 of 2 in current phase
Status: Ready to plan
Last activity: 2026-03-24 — v2.1 roadmap created (phases 28-31)

Progress: [░░░░░░░░░░] 0% (v2.1 scope, 0/11 plans)

## Performance Metrics

**Velocity:**

- Total plans completed (v2.1): 0
- Average duration: — (no data yet)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| 28    | 0/2   | —     | —        |
| 29    | 0/4   | —     | —        |
| 30    | 0/3   | —     | —        |
| 31    | 0/2   | —     | —        |

## Accumulated Context

### Key Decisions

| #   | Decision                                                    | Rationale                                                         | Date       |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------------- | ---------- |
| 1   | Session-based attendance replaces morning/evening check-ins | Multi-session is more accurate — people leave for lunch, step out | 2026-03-24 |
| 2   | Project selection on clock-in (not free text)               | Cleaner data, maps to real projects, less friction                | 2026-03-24 |
| 3   | Remove per-task time tracking entirely                      | Session attendance is enough — task timers add friction not value | 2026-03-24 |
| 4   | SWR polling for live status (not Supabase Realtime)         | Consistent with existing patterns, 3 users don't need websockets  | 2026-03-24 |

### What's Being Replaced (v2.1)

- `daily_checkins` table → replaced by `work_sessions`
- `CheckinModal` → replaced by session clock-in modal (Phase 29)
- `TaskTimeTracker` component → removed (Phase 28)
- `task_time_logs` references in team-dashboard.ts → removed (Phase 28)
- `app/actions/time-logs.ts` → removed (Phase 28)
- `/admin/attendance` page → updated to session model (Phase 29)

### Blockers/Concerns

None.

### Quick Tasks Completed (last 5)

| #   | Description                                                          | Date       | Commit  |
| --- | -------------------------------------------------------------------- | ---------- | ------- |
| 26  | Status page visible to employees/managers                            | 2026-03-20 | —       |
| 27  | Responsive design audit and fixes                                    | 2026-03-24 | 094dc77 |
| 28  | Fix review blockers — double cast, plaintext password, touch targets | 2026-03-24 | 334ba2e |

## Session Continuity

Last session: 2026-03-24
Stopped at: v2.1 roadmap created — phases 28-31 defined, 17/17 requirements mapped
**Next action:** `/qualia:plan-phase 28`
