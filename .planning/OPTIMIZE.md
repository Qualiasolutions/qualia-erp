---
date: 2026-04-17
mode: full
critical: 3
high: 14
medium: 17
low: 12
status: needs_attention
---

# Optimization Report — Portal v2 Pre-Deploy (Phase 6)

## Summary

Three specialist agents (frontend + backend + performance) scanned the codebase before the Phase 6 deploy. **3 CRITICAL** performance issues (all N+1 DB loops, 2 admin-only + 1 hot-path), **14 HIGH** (split between a11y gaps, overly permissive code paths, and sequential query chains), **17 MEDIUM**, **12 LOW**.

**Deploy decision:** None of the criticals are imminent production outages. C1+C2 are admin-only migration helpers. C3 (clock-in stale session cleanup) is hot-path but degrades gracefully. Phase 6 can ship — criticals should be addressed in a follow-up phase.

## Critical Issues

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| C1 | Perf | N+1 sequential UPDATE per unlinked task | `app/actions/pipeline.ts:816-828` | Batch via `.in('id', ...)` or RPC |
| C2 | Perf | N+1 in `migrateAllProjectsToGSD` — nested per-project × per-phase loops | `app/actions/pipeline.ts:404-411`, `:1213-1329` | Controlled-concurrency `Promise.all` batches of 5 |
| C3 | Perf | N+1 stale session cleanup on every clock-in | `app/actions/work-sessions.ts:78-89` | `Promise.all` — each update is independent |

## High Priority

| # | Dim | Finding | Location | Fix |
|---|-----|---------|----------|-----|
| FH1 | UI | Missing `loading.tsx` on `/activity`, `/tasks` | `app/(portal)/activity/`, `app/(portal)/tasks/` | Mirror `requests/loading.tsx` |
| FH2 | UI | Missing `error.tsx` on 6 portal routes | activity, tasks, billing, files, messages, workspace | Lightweight copy of `projects/error.tsx` |
| FH3 | A11y | Form labels without `htmlFor` in project settings dialog | `app/(portal)/projects/[id]/project-detail-view.tsx:478-570` | Add `id`/`htmlFor` pairs (6 fields) |
| FH4 | A11y | Form labels without `htmlFor` in new-client dialog | `components/portal/portal-hub.tsx:873-886` | Add `id`/`htmlFor` pairs (2 fields) |
| BH1 | Sec | Verify no permissive `USING (true)` RLS leak on projects/teams/comments | `supabase/migrations/20240103..20240104` | Query `pg_policies` in prod to confirm |
| BH2 | Sec | `activity_log` CHECK constraint rejects `'deployment'`/`'code_push'`/`'feature_request'` — webhook activity silently lost | `supabase/migrations/20260301100000...` + webhook routes | Migration to expand CHECK constraint |
| BH3 | Sec | Client-side `.update()` on `profiles` | `components/onboarding/internal-app-walkthrough.tsx:655-662` | Move to server action |
| BH4 | Sec | Client-side `.update()` on `workspace_members` | `components/workspace-provider.tsx:120-135` | Server action `setDefaultWorkspace()` |
| BH5 | Sec | `createActivityLogEntry` unvalidated `actionType`/`actionData` | `app/actions/activity-feed.ts:179-214` | Zod enum + schema |
| BH6 | Sec | `getCrossProjectActivityFeed` trusts client-supplied `projectIds` (IDOR) | `app/actions/activity-feed.ts:117-174` | Filter IDs against user's accessible projects |
| PH1 | Perf | `canAccessProject` = 3 sequential queries on hot path | `app/actions/shared.ts:218-241` | `Promise.all` admin + project fetch |
| PH2 | Perf | `getProjects` sequential role + assignments check | `app/actions/projects.ts:162-176` | `getCachedUserRole` + `Promise.all` |
| PH3 | Perf | `getProjectStats` 5th sequential query outside parallel batch | `app/actions/projects.ts:284-297` | Fold into existing `Promise.all` |
| PH4 | Perf | Module-level `_finishedCache` unreliable on serverless | `app/actions/inbox.ts:64-65` | Replace with `React.cache()` |

## Medium Priority (17)

- **FM1-2** — Unnecessary `'use client'` on render-only `portal-billing-summary` / `portal-stats-row`
- **FM3** — `WorkspaceCard` not memoized (search box re-renders all cards) — `portal-workspace-grid.tsx:35-106`
- **FM4** — `client-access.tsx` table rows not memoized — extract `ClientRow` + memo
- **FM5** — Tasks table renders all rows without pagination — `tasks-content.tsx:283-394`
- **FM6** — `M1` closure stale-risk in `activity-content.tsx:150` (suppressed exhaustive-deps)
- **BM1** — `updateFeatureRequest` missing Zod validation — `client-requests.ts:166-223`
- **BM2** — No rate limiting on `/api/embeddings` (Google AI cost risk)
- **BM3** — No rate limiting on `/api/tts` (ElevenLabs cost risk)
- **BM4** — 22 instances of `.select('*')` across server actions (future column leak risk)
- **BM5** — `session_reports` RLS enabled with zero policies (documented service-role-only footgun)
- **PM1** — `tldraw.css` static import on board-canvas (admin-only, ~50-100KB)
- **PM2** — `select('*')` on hot roadmap/financials/projectById paths
- **PM3** — Barrel import in `lib/swr.ts` forces eval of 49 action stubs — direct imports
- **PM4** — AI agent chat lacks message virtualization for long conversations
- **PM5** — `getProjectStats` fifth sequential query outside parallel batch (redundant with PH3)

## Low Priority (12)

- **FL1** — Duplicate utility functions across portal files (`formatRelativeTime` × 3, `getGreeting` × 3)
- **FL2-5** — Dead props (`userName`, `userRole`), unused `PortalDashboardStats`, files empty-state spacing
- **BL1** — `console.log` in production server actions (project-assignments, project-integrations)
- **BL2** — `idempotency_keys` table has no purge cron
- **PL1-3** — Minor: `getProjects` duplicates role check, large `console.error` payloads in board-canvas, `getProjectById` `select('*')`

## Verdict

Phase 6 is **ship-ready**. The 3 criticals are scoped to admin migration helpers (C1, C2) plus one hot-path (C3) that degrades gracefully.

**Recommended follow-up phase (Phase 7: Optimization Fixes):**

1. C1 / C2 / C3 — batch N+1 loops
2. BH2 — activity_log CHECK constraint (silent data loss right now)
3. BH6 — `getCrossProjectActivityFeed` IDOR
4. FH3 / FH4 — form label a11y
5. FH1 / FH2 — missing loading.tsx / error.tsx (7 routes)
6. PH1 / PH2 / PH3 / PH4 — server-action parallelization + React.cache swap
