---
phase: 33-security-fixes
plan: 01
subsystem: security
tags: [next.js, npm-audit, cron-auth, csp]
dependency-graph:
  requires: []
  provides: [patched-deps, hardened-cron-auth]
  affects: [all-cron-routes, next-config]
tech-stack:
  added: []
  patterns: [environment-agnostic-auth]
key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - app/api/cron/reminders/route.ts
    - app/api/cron/attendance-report/route.ts
    - app/api/cron/uptime-check/route.ts
    - app/api/cron/research-tasks/route.ts
    - app/api/cron/morning-email/route.ts
    - app/api/cron/blog-tasks/route.ts
    - app/api/cron/weekly-digest/route.ts
decisions: []
metrics:
  duration: 3m 26s
  completed: 2026-03-26
---

# Phase 33 Plan 01: Dependency Audit + Cron Auth Hardening Summary

Next.js upgraded to 16.2.1 (fixing CSRF + DoS advisories), undici patched to resolve 5 high-severity vulnerabilities, and all 7 cron routes hardened to enforce CRON_SECRET auth in every environment (not just production).

## Task Results

| Task | Name                            | Commit  | Status |
| ---- | ------------------------------- | ------- | ------ |
| 1    | Upgrade Next.js + fix npm audit | c397646 | Done   |
| 2    | Harden cron auth + verify CSP   | 68fa5f2 | Done   |

## Details

### Task 1: Dependency Upgrade

- Next.js 16.1.6 -> 16.2.1 (fixes GHSA-h27x, GHSA-mq59, GHSA-jcc7)
- undici patched (fixes GHSA-f269, GHSA-2mjp, GHSA-vrm6, GHSA-v9p9, GHSA-4992)
- `npm audit --omit=dev` reports 0 vulnerabilities
- TypeScript compilation and production build both pass

### Task 2: Cron Auth Hardening

Removed `process.env.NODE_ENV === 'production'` wrapper from all 7 cron routes. Auth is now enforced unconditionally — any request without a valid `Bearer ${CRON_SECRET}` header gets 401, regardless of environment.

Routes hardened:

- reminders, attendance-report, uptime-check, research-tasks, morning-email, blog-tasks, weekly-digest

Added `console.error` logging to the 2 routes (attendance-report, uptime-check) that were missing it.

CSP confirmed clean — no `unsafe-eval` present (was already removed during VAPI cleanup).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added console.error to attendance-report and uptime-check cron routes**

- **Found during:** Task 2
- **Issue:** Two routes (attendance-report, uptime-check) had no error logging on unauthorized requests
- **Fix:** Added `console.error('[cron/ROUTE_NAME] Unauthorized request')` for consistency with other routes
- **Files modified:** attendance-report/route.ts, uptime-check/route.ts
- **Commit:** 68fa5f2

## Self-Check: PASSED
