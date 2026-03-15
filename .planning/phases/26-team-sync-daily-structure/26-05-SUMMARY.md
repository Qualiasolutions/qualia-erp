---
phase: 26-team-sync-daily-structure
plan: 05
subsystem: api
tags: [swr, server-actions, email, resend, cron, tasks]

# Dependency graph
requires:
  - phase: 26-04
    provides: time-logs, checkins, owner-updates cache keys in lib/swr.ts
  - phase: 26-01
    provides: daily structure DB tables, workspace_id on profiles

provides:
  - getTeamTaskDashboard server action (admin sees all team, employee sees own)
  - useTeamTaskDashboard SWR hook
  - sendMorningEmail email template (teal-branded, 3 sections)
  - /api/cron/morning-email endpoint with CRON_SECRET auth
  - vercel.json morning-email cron at 0 6 * * 1-5

affects: [team-page, dashboard, any page using team task status, morning workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Promise.all for parallel per-employee task fetches in team dashboard
    - Supabase FK array normalization inline with Array.isArray checks
    - CRON_SECRET pattern: production-only auth, matches /api/cron/reminders

key-files:
  created:
    - app/actions/team-dashboard.ts
    - app/api/cron/morning-email/route.ts
  modified:
    - lib/swr.ts
    - lib/email.ts
    - vercel.json

key-decisions:
  - 'Direct role check via Supabase query instead of isUserAdmin() helper (which requires userId arg)'
  - 'Admin sees all team profiles; employee sees only their own tasks — enforced server-side'
  - 'Morning email runs Mon-Fri 6 AM UTC, not 9 AM — separate from existing daily reminders cron'

patterns-established:
  - 'Team dashboard: role-based data scoping in server action, parallel fetches via Promise.all'
  - 'Morning email: per-user data aggregation (overdue + today + meetings) in cron loop'

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 26 Plan 05: Team Dashboard + Morning Email Summary

**Admin-scoped team task dashboard server action + morning briefing cron that emails each team member their overdue tasks, due-today tasks, and meetings at 6 AM UTC weekdays.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-15T03:02:51Z
- **Completed:** 2026-03-15T03:06:45Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `getTeamTaskDashboard` server action: admins get all profiles with parallel task fetches; employees get own tasks only; filtered to Todo/In Progress, sorted by priority then due_date
- `useTeamTaskDashboard` SWR hook added to `lib/swr.ts` (added `teamDashboard` cache key, invalidation helper)
- `sendMorningEmail` in `lib/email.ts`: three-section HTML email (Overdue red, Due Today teal, Meetings indigo) with "You're all caught up!" empty state
- `/api/cron/morning-email/route.ts` follows exact `/api/cron/reminders` pattern with CRON_SECRET auth and maxDuration=60
- Cron registered in `vercel.json` at `0 6 * * 1-5` (6 AM UTC Mon-Fri)

## Task Commits

1. **Task 1: Team dashboard data action** - `c8e4f14` (feat)
2. **Task 2: Morning email cron + template** - `d4f8871` (feat)

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified

- `app/actions/team-dashboard.ts` - `getTeamTaskDashboard()` with role-based scoping and priority sort
- `lib/swr.ts` - Added `teamDashboard` cache key + `useTeamTaskDashboard` hook + `invalidateTeamDashboard`
- `lib/email.ts` - Added `sendMorningEmail()` with teal-branded 3-section HTML template
- `app/api/cron/morning-email/route.ts` - Cron GET handler, per-user data fetch, calls sendMorningEmail
- `vercel.json` - Added morning-email cron schedule

## Decisions Made

- Used inline role check (`profiles.role`) instead of `isUserAdmin(userId)` helper — the shared helper takes a userId arg and was misimported from the plan's description as a zero-arg call
- `getProjectName` helper cast as `unknown` in cron route to satisfy Supabase's inferred `never` type on joined column when accessed via `.name`
- Morning email schedule is separate from reminders (6 AM vs 9 AM) — keeps concerns distinct

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed isUserAdmin() call signature mismatch**

- **Found during:** Task 1 (team-dashboard.ts)
- **Issue:** Plan said to import `isUserAdmin` from `./shared`, but that function requires a `userId: string` argument; calling with zero args causes TS error
- **Fix:** Replaced with direct Supabase query `profiles.role` on `user.id` — same result, correct signature
- **Files modified:** app/actions/team-dashboard.ts
- **Verification:** `npx tsc --noEmit` — no errors in team-dashboard.ts
- **Committed in:** c8e4f14 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed Supabase never-typed FK in cron route**

- **Found during:** Task 2 (morning-email/route.ts)
- **Issue:** `t.project?.name` and `t.project[0]?.name` inferred as `never` from Supabase select join
- **Fix:** Added `getProjectName(raw: unknown)` helper that casts and extracts safely
- **Files modified:** app/api/cron/morning-email/route.ts
- **Verification:** `npx tsc --noEmit` — no errors
- **Committed in:** d4f8871 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs caught by TypeScript)
**Impact on plan:** Both fixes were necessary for type correctness. No scope creep.

## Issues Encountered

None beyond the two TypeScript errors above.

## User Setup Required

None — CRON_SECRET already set in Vercel env from existing reminders cron. vercel.json cron entry auto-deploys.

## Next Phase Readiness

- Team dashboard hook ready for use on a `/team` or dashboard page
- Morning email delivery will begin on next Mon-Fri 6 AM UTC after deployment
- Plans 26-06 and 26-07 remain (not yet executed per wave structure)

---

_Phase: 26-team-sync-daily-structure_
_Completed: 2026-03-15_
