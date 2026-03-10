---
phase: 25-portal-security-hardening
plan: '03'
subsystem: infra
tags: [next.js, observability, health-check, error-handling, supabase-auth, rollback]

# Dependency graph
requires:
  - phase: 25-portal-security-hardening
    provides: portal auth hardening (token invitations, crypto passwords, Zod validation)

provides:
  - Production-observable console.error/warn via removeConsole.exclude in next.config.ts
  - HTTP 503 for degraded/unhealthy health endpoint
  - Documented env var list in .env.example
  - Sanitized DB errors in createProjectFromPortal (logs server-side, generic to client)
  - Orphan rollback in inviteClientByEmail and setupClientForProject

affects: [production-build, monitoring, client-portal-actions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'removeConsole.exclude keeps error/warn observable in production'
    - 'Health endpoints return 503 for any non-healthy status'
    - 'DB errors logged server-side; generic message returned to client'
    - 'Auth user rollback on downstream insert failure to prevent orphaned accounts'

key-files:
  created:
    - .env.example
  modified:
    - next.config.ts
    - app/api/health/route.ts
    - app/actions/client-portal.ts

key-decisions:
  - 'degraded health state returns 503 (not 200) — monitors need reliable signal'
  - 'removeConsole.exclude rather than removing removeConsole entirely — keeps log noise low while preserving error observability'
  - 'Orphan rollback logs its own failure but does not throw — best-effort cleanup'

patterns-established:
  - 'Pattern: removeConsole with exclude array — preserve error/warn, strip log/info/debug in prod'
  - 'Pattern: DB errors logged server-side with message/details/hint; client gets static string'
  - 'Pattern: auth user rollback in try/catch after downstream failure'

# Metrics
duration: 12min
completed: 2026-03-10
---

# Phase 25 Plan 03: Production Observability and Hardening Summary

**Production errors now visible (removeConsole.exclude), monitors detect degraded state (503), DB internals never reach clients, orphaned Supabase auth users cleaned up on link failure**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-10T17:59:00Z
- **Completed:** 2026-03-10T18:11:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `next.config.ts` now uses `removeConsole: { exclude: ['error', 'warn'] }` — console.error and console.warn survive production builds; log/info/debug are stripped
- `app/api/health/route.ts` returns HTTP 503 for both `degraded` and `unhealthy` states, enabling monitoring systems to alert correctly
- `.env.example` completely regenerated from actual codebase scan — 17 env vars documented, grouped by service, no stale/removed vars
- `createProjectFromPortal` returns a static generic error to client; raw `message/details/hint` logged server-side only
- `inviteClientByEmail` and `setupClientForProject` both delete the newly created Supabase auth user if the `client_projects` insert fails — joining `setupPortalForClient` which already had this rollback

## Task Commits

1. **Task 1: Fix removeConsole, health endpoint, and create .env.example** - `eaeeafd` (fix)
2. **Task 2: Sanitize DB errors and fix orphaned user rollback** - `1223a4f` (fix)

## Files Created/Modified

- `next.config.ts` — removeConsole changed from `true` to `{ exclude: ['error', 'warn'] }`
- `app/api/health/route.ts` — statusCode logic simplified: healthy=200, everything else=503
- `.env.example` — replaced stale template (had GROQ_API_KEY, VIBE_VOICE_URL, Sentry) with current 17-var list
- `app/actions/client-portal.ts` — DB error sanitized in `createProjectFromPortal`; orphan rollback added to `inviteClientByEmail` and `setupClientForProject`

## Decisions Made

- `degraded` returns 503 rather than 200 — a degraded service is not fully operational; 200 would mask failures from uptime monitors and pagerduty-style alerting
- Used `removeConsole.exclude` array rather than disabling removeConsole entirely — preserves log noise reduction while allowing error observability
- Orphan rollback is best-effort (wrapped in try/catch, logs failure but does not re-throw) — a rollback failure is logged but should not mask the original link error

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate console.error in createProjectFromPortal**

- **Found during:** Task 2 (sanitize DB error)
- **Issue:** The original file already had a `console.error` with `error.message/details/hint` (the plan's intended logging). My initial edit added a second `console.error` instead of replacing the `return` line only, creating a duplicate.
- **Fix:** Merged both into a single `console.error` call with `DB error:` label, then the generic return
- **Files modified:** `app/actions/client-portal.ts`
- **Verification:** `grep -c "console.error" app/actions/client-portal.ts` shows expected count; no duplicate adjacent calls
- **Committed in:** `1223a4f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - duplicate log line from edit collision)
**Impact on plan:** Trivial fix during execution. No scope creep.

## Issues Encountered

None beyond the duplicate log line noted above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 25 is complete (3 of 3 plans). v1.5 Production-Ready Client Portal milestone security hardening is done:

- 25-01: IDOR fix, auth guards, rate limiting, input sanitization
- 25-02: Token-based invitations, crypto passwords, Zod validation, client role checks
- 25-03: Production observability, health endpoint, DB error sanitization, orphan rollback

Ready to ship v1.5 or begin next milestone.

---

_Phase: 25-portal-security-hardening_
_Completed: 2026-03-10_
