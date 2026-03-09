# Production Readiness Audit

**Project:** Qualia ERP (Internal Suite)
**Date:** 2026-03-10
**Audited by:** 6 parallel Opus agents (Security, Performance, Reliability, Observability, Deployment, Data)
**Overall Score: 42/100**

---

## Summary

| Area          | Score  | Critical | High | Medium | Low |
| ------------- | ------ | -------- | ---- | ------ | --- |
| Security      | 35/100 | 2        | 2    | 4      | 0   |
| Performance   | 45/100 | 2        | 3    | 2      | 0   |
| Reliability   | 40/100 | 1        | 3    | 1      | 0   |
| Observability | 25/100 | 1        | 2    | 2      | 0   |
| Deployment    | 60/100 | 0        | 1    | 4      | 0   |
| Data          | 50/100 | 0        | 2    | 3      | 0   |

**Totals: 6 Critical, 13 High, 16 Medium**

---

## BLOCKERS (Fix Before Next Deploy)

### B1. CRITICAL — Live API Key Committed to Git

**Files:** `.env.vercel`, `.env.vercel-pull` (committed in `eec8385`)
**Details:** `RESEND_API_KEY=re_VXLgyqhJ_...` is in the git history. Even if removed from HEAD, it persists in history.
**Fix:**

1. Rotate the Resend API key immediately at resend.com
2. Add `.env.vercel*` to `.gitignore`
3. `git rm --cached .env.vercel .env.vercel-pull`
4. Consider `git filter-repo` to scrub history

### B2. CRITICAL — `/api/migrate-tasks` Completely Unprotected

**File:** `app/api/migrate-tasks/route.ts`
**Details:** Unauthenticated POST triggers `initializePipelinesForAllProjects()` and `resetAllPhaseTasks()` — bulk deletes and recreates tasks across ALL projects. Zero auth, zero secret.
**Fix:** Add cron secret check or delete this route if migration is complete.

### B3. CRITICAL — 24 MB PowerPoint in Public Directory

**File:** `public/work/afifi/AI - Presentation.pptm`
**Details:** Served as a static asset, inflates Vercel deployment size and cold starts.
**Fix:** Delete from public/ and git. Move to Supabase Storage if needed.

### B4. CRITICAL — No APM or Error Reporting Service

**Files:** `app/error.tsx:16`, `app/global-error.tsx:17`, `components/error-boundary.tsx:32`
**Details:** All have placeholder comments for error services but call nothing. Combined with `removeConsole` stripping client logs in production, browser errors are completely invisible.
**Fix:** Install `@sentry/nextjs` or BetterStack/Axiom.

### B5. CRITICAL — Cron Endpoints Conditionally Unprotected

**Files:** `app/api/cron/reminders/route.ts:22`, `app/api/cron/research-tasks/route.ts:38`, `app/api/cron/blog-tasks/route.ts:27`
**Details:** Pattern `if (NODE_ENV === 'production' && cronSecret)` — if `CRON_SECRET` is not set, endpoints are fully open. These use service_role clients.
**Fix:** Always require secret: `if (!cronSecret || authHeader !== \`Bearer ${cronSecret}\`)`

### B6. CRITICAL — N+1 Sequential DB Updates in Pipeline Operations

**File:** `app/actions/pipeline.ts:396-403, 784-805, 849-916, 1183-1280`
**Details:** Prerequisite-phase linking issues one UPDATE per phase in a loop. Migration functions at scale (100 projects) = 500+ sequential DB calls, will hit Vercel function timeout.
**Fix:** Replace with batch upsert or single SQL UPDATE with CASE expression.

---

## High Priority

### H1. `deployments.ts` and `pipeline.ts` Missing Auth

**Files:** `app/actions/deployments.ts` (all 5 functions), `app/actions/pipeline.ts` (6 functions)
**Details:** No `getUser()` call. Rely entirely on RLS. `linkVercelProject()` could let any authenticated user rewire Vercel project links.

### H2. `phases.ts` Mutation Actions Missing Auth

**File:** `app/actions/phases.ts`
**Details:** `createProjectPhase`, `deleteProjectPhase`, `updateProjectPhase`, `completePhase`, `unlockPhase` — all perform DB mutations with no auth guard.

### H3. Logo Upload IDOR

**File:** `app/actions/logos.ts:24, 164`
**Details:** `uploadProjectLogo()` and `uploadClientLogo()` verify entity exists but never check if user has permission. Any authenticated user can overwrite any logo.

### H4. No Dynamic Imports — Full Client Bundle on First Paint

**File:** `app/layout.tsx:15-16`
**Details:** AIAssistantProvider, AIAssistantWidget, CommandMenu loaded statically in root layout on every route. ~40-60 KB unnecessary JS on critical path.
**Fix:** Convert to `next/dynamic` with `ssr: false`.

### H5. Admin Actions Have Zero Audit Trail

**File:** `app/actions/admin.ts`
**Details:** `updateUserRole()`, `inviteTeamMember()`, `removeTeamMember()` — highest privilege operations with no logging whatsoever.

### H6. Auth Events Not Logged

**File:** `app/actions/auth.ts:11`
**Details:** `loginAction()` silently swallows failures. No rate limiting, no failed attempt counter, no activity record. Brute-force completely invisible.

### H7. `removeConsole` Strips Client Error Logging

**File:** `next.config.ts:97`
**Details:** `removeConsole: process.env.NODE_ENV === 'production'` removes ALL console.\* in client bundles, including the error.tsx/global-error.tsx error logging.

### H8. Timezone Bug in Cron Jobs

**Files:** `app/api/cron/blog-tasks/route.ts:117`, `app/api/cron/research-tasks/route.ts:88`
**Details:** `new Date().toISOString().split('T')[0]` returns UTC date. Cron runs at Cyprus local time. 2-hour window where tasks get yesterday's date.
**Fix:** Use `toLocaleDateString('en-CA', { timeZone: 'Europe/Nicosia' })`.

### H9. No Error Boundaries in Component Tree

**Details:** Zero `ErrorBoundary` wrappers in components/. A thrown exception in any of 50+ client components crashes the entire route.

### H10. `useTodaysMeetings` Duplicates Network Request

**File:** `lib/swr.ts:501-525`
**Details:** Two SWR keys both call `getMeetings()`. Derive today's meetings from `useMeetings` cache instead.

### H11. In-Memory Rate Limiter is Serverless-Unsafe

**File:** `lib/rate-limit.ts:11`
**Details:** Each Vercel function instance has its own Map. Effective limit = `20 * N instances`.
**Fix:** Migrate to `@upstash/ratelimit`.

### H12. High Severity Next.js Vulnerability

**Package:** `next@16.0.10`
**Details:** 3 CVEs including DoS vectors (Image Optimizer, RSC deserialization, PPR).
**Fix:** `npm install next@16.1.6`

### H13. No Soft Delete / No Data Recovery

**Details:** All deletes are hard with `ON DELETE CASCADE`. No recycle bin, no undo, no PITR confirmation. Accidental project deletion destroys all tasks, phases, files, and activity permanently.

---

## Medium Priority

### M1. `select('*')` Over-fetching (20+ instances)

`pipeline.ts`, `deployments.ts`, `health.ts`, `learning.ts`, `phases.ts`, `time-tracking.ts` — fetch all columns when only subset needed.

### M2. `app/api/upload-video/route.ts` — Dead Debug Code

Hardcoded path to `/home/qualia/Downloads/...`, no auth. Remove entirely.

### M3. No Pagination on `getProjects()` and `getMeetings()`

Fetch all records with no `.limit()`. Will degrade at 50+ projects / 200+ meetings.

### M4. CI Scripts Referenced But Missing

`test:e2e`, `test:smoke`, `test:db:rls`, `test:db:functions` called in CI but don't exist in package.json. `continue-on-error: true` masks failure.

### M5. `middleware.ts` Deprecated in Next.js 16

Build warns to migrate to `proxy` convention.

### M6. ESLint/Next.js Version Mismatch

`eslint-config-next@15.3.1` vs `next@16.0.10`.

### M7. No Structured Logging Library

726 `console.*` calls across 114 files. No JSON structured logging, no log levels.

### M8. Cron Job Failures Send No Alerts

3 daily crons return 500 on failure but nothing notifies anyone.

### M9. `createProjectFromPortal` Missing Enum Validation

`app/actions/client-portal.ts:483` — `project_type` passed raw without Zod validation.

### M10. `portal_project_mappings` View Exposes PII Without Security Barrier

`supabase/migrations/20260306200000_erp_portal_integration.sql:14`

### M11. Initial Permissive RLS Policies Not Fully Cleaned Up

Old "authenticated users can insert clients" policies may still exist on live DB.

### M12. No Data Retention Policies

`activity_log`, `notifications`, `ai_conversations` grow unbounded. No TTL or cleanup.

### M13. No GDPR Features

No data export, no account self-deletion, no consent tracking.

### M14. `NEXT_PUBLIC_SITE_URL` Not Set → Wrong robots/sitemap Domain

Falls back to `app.qualiasolutions.io` instead of `qualia-erp.vercel.app`.

### M15. PWA Manifest Icon Mismatch

Both sizes reference `/logo.webp` instead of properly sized PNGs.

### M16. Public Logo Images Unoptimized

`glluztech.png` (1.4 MB), `melon-auto.png` (688 KB), `sphere.png` (1.6 MB), `dashboard-bg.png` (516 KB).

---

## Pre-Deploy Checklist

- [ ] B1: Rotate Resend API key, scrub from git
- [ ] B2: Protect or delete `/api/migrate-tasks`
- [ ] B3: Delete 24 MB PowerPoint from public/
- [ ] B4: Install error reporting (Sentry)
- [ ] B5: Fix cron secret enforcement
- [ ] B6: Batch pipeline DB operations
- [ ] H12: Update Next.js to 16.1.6

## Post-Deploy Checklist

- [ ] App loads correctly (HTTP 200)
- [ ] Auth flow works (login/logout)
- [ ] No console errors
- [ ] API latency < 500ms
- [ ] Cron jobs fire correctly
- [ ] Sentry receiving events

---

## Quick Wins (< 30 min each)

1. Delete `public/work/afifi/` — 0 min, saves 24 MB
2. `git rm --cached .env.vercel*` + rotate key — 10 min
3. Add auth to `/api/migrate-tasks` or delete it — 5 min
4. Fix cron secret pattern — 5 min per file
5. Fix timezone in cron jobs — 5 min per file
6. Delete `app/api/upload-video/route.ts` — 1 min
7. Compress/convert public images — 15 min
8. Add `next/dynamic` to AI assistant — 10 min
9. Fix `useTodaysMeetings` to derive from cache — 10 min
10. Update Next.js — `npm install next@16.1.6` — 5 min

---

_Generated by 6 parallel Opus audit agents on 2026-03-10_
