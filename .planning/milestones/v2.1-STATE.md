# State: Qualia Portal & Trainee System

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Fawzi has real-time visibility into who's working, when, and on what — employees clock in/out every session with zero friction.
**Current focus:** v2.1 Attendance & Live Oversight — Phase 30 (Live Status Dashboard)

## Current Position

Phase: 30 of 31 (Live Status Dashboard)
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-03-25 — Quick task 29: review blockers fixed + DB performance advisors cleaned

Progress: [██████░░░░] 55% (v2.1 scope, 6/11 plans)

## Performance Metrics

**Velocity:**

- Total plans completed (v2.1): 0
- Average duration: — (no data yet)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| 28    | 2/2   | 14min | 7min     |
| 29    | 4/4   | 12min | ~3min    |
| 30    | 0/3   | —     | —        |
| 31    | 0/2   | —     | —        |

## Accumulated Context

### Key Decisions

| #   | Decision                                                       | Rationale                                                             | Date       |
| --- | -------------------------------------------------------------- | --------------------------------------------------------------------- | ---------- |
| 1   | Session-based attendance replaces morning/evening check-ins    | Multi-session is more accurate — people leave for lunch, step out     | 2026-03-24 |
| 2   | Project selection on clock-in (not free text)                  | Cleaner data, maps to real projects, less friction                    | 2026-03-24 |
| 3   | Remove per-task time tracking entirely                         | Session attendance is enough — task timers add friction not value     | 2026-03-24 |
| 4   | SWR polling for live status (not Supabase Realtime)            | Consistent with existing patterns, 3 users don't need websockets      | 2026-03-24 |
| 5   | useCurrentWorkspaceId() over useEffect + server action pattern | Already cached by SWR, deduplicated, consistent with rest of codebase | 2026-03-24 |

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

| #   | Description                                                                   | Date       | Commit  |
| --- | ----------------------------------------------------------------------------- | ---------- | ------- |
| 27  | Responsive design audit and fixes                                             | 2026-03-24 | 094dc77 |
| 28  | Fix review blockers — double cast, plaintext password, touch targets          | 2026-03-24 | 334ba2e |
| 29  | Fix review blockers — server-side attachment enforcement, admin-only, DB perf | 2026-03-25 | 380cb4b |

## Session Continuity

Last session: 2026-03-25
Stopped at: Quick task 29 complete — all review blockers fixed + Supabase advisors cleaned
**Next action:** Execute Phase 30 — live status / oversight dashboard (`/qualia:execute-phase 30`)
