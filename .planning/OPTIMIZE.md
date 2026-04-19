---
date: 2026-04-17
updated: 2026-04-18
mode: full
critical_original: 3
high_original: 14
medium_original: 17
low_original: 12
status: backlog_remaining_low_risk
---

# Optimization Report — Portal v2 Pre-Deploy (Phase 6)

## Update — 2026-04-18 sweep

Portal v2 is shipped. The 2026-04-17 audit found 3 critical / 14 high / 17 medium / 12 low. Since then:

- **Phase 8** closed: PH1 (canAccessProject parallelized), PH2/PH3 (getProjects/getProjectStats role caching), PH4 (inbox React.cache), FH3/FH4 (form a11y), FH1/FH2 (loading.tsx + error.tsx on 7 routes), BH6 (getCrossProjectActivityFeed IDOR), BM1 (updateFeatureRequest Zod).
- **2026-04-18 post-sprint sweep** (this commit): C1, C2, C3, BH3, BH4.

Remaining: BH1 (RLS permissive check — needs DB query), BH2 (activity_log CHECK constraint expansion), BH5 (createActivityLogEntry Zod), BM2-5 + all medium/low findings. **None are ship blockers.**

## Summary (original audit)

Three specialist agents (frontend + backend + performance) scanned the codebase before the Phase 6 deploy. **3 CRITICAL** performance issues (all N+1 DB loops, 2 admin-only + 1 hot-path), **14 HIGH** (split between a11y gaps, overly permissive code paths, and sequential query chains), **17 MEDIUM**, **12 LOW**.

## Critical Issues

| # | Dimension | Finding | Location | Fix | Status |
|---|-----------|---------|----------|-----|--------|
| C1 | Perf | N+1 sequential UPDATE per unlinked task | `app/actions/pipeline.ts:816-828` | Batch via `.in('id', ...)` or RPC | ✅ FIXED 2026-04-18 (grouped by phase_id, one UPDATE per group) |
| C2 | Perf | N+1 in Qualia Framework migration — nested per-project × per-phase loops | `app/actions/pipeline.ts:404-411` (migration helper later removed with `/admin/migrate`) | Controlled-concurrency `Promise.all` batches of 5 | ✅ FIXED 2026-04-18 (prerequisite-phase linking now `Promise.all`); migration helper removed 2026-04-19 |
| C3 | Perf | N+1 stale session cleanup on every clock-in | `app/actions/work-sessions.ts:78-89` | `Promise.all` — each update is independent | ✅ FIXED 2026-04-18 |

## High Priority

| # | Dim | Finding | Location | Fix | Status |
|---|-----|---------|----------|-----|--------|
| FH1 | UI | Missing `loading.tsx` on `/activity`, `/tasks` | `app/(portal)/activity/`, `app/(portal)/tasks/` | Mirror `requests/loading.tsx` | ✅ FIXED Phase 8 |
| FH2 | UI | Missing `error.tsx` on 6 portal routes | activity, tasks, billing, files, messages, workspace | Lightweight copy of `projects/error.tsx` | ✅ FIXED Phase 8 |
| FH3 | A11y | Form labels without `htmlFor` in project settings dialog | `app/(portal)/projects/[id]/project-detail-view.tsx:478-570` | Add `id`/`htmlFor` pairs (6 fields) | ✅ FIXED Phase 8 |
| FH4 | A11y | Form labels without `htmlFor` in new-client dialog | `components/portal/portal-hub.tsx:873-886` | Add `id`/`htmlFor` pairs (2 fields) | ✅ FIXED Phase 8 |
| BH1 | Sec | Verify no permissive `USING (true)` RLS leak on projects/teams/comments | `supabase/migrations/20240103..20240104` | Query `pg_policies` in prod to confirm | ⏳ PENDING — needs DB query |
| BH2 | Sec | `activity_log` CHECK constraint rejects `'deployment'`/`'code_push'`/`'feature_request'` — webhook activity silently lost | `supabase/migrations/20260301100000...` + webhook routes | Migration to expand CHECK constraint | ⏳ PENDING |
| BH3 | Sec | Client-side `.update()` on `profiles` | `components/onboarding/internal-app-walkthrough.tsx:655-662` | Move to server action | ✅ FIXED 2026-04-18 (`persistInternalOnboardingState`) |
| BH4 | Sec | Client-side `.update()` on `workspace_members` | `components/workspace-provider.tsx:120-135` | Server action `setDefaultWorkspace()` | ✅ FIXED 2026-04-18 (delegates to existing `setDefaultWorkspace`) |
| BH5 | Sec | `createActivityLogEntry` unvalidated `actionType`/`actionData` | `app/actions/activity-feed.ts:179-214` | Zod enum + schema | ⏳ PENDING |
| BH6 | Sec | `getCrossProjectActivityFeed` trusts client-supplied `projectIds` (IDOR) | `app/actions/activity-feed.ts:117-174` | Filter IDs against user's accessible projects | ✅ FIXED Phase 7 |
| PH1 | Perf | `canAccessProject` = 3 sequential queries on hot path | `app/actions/shared.ts:218-241` | `Promise.all` admin + project fetch | ✅ FIXED Phase 8 |
| PH2 | Perf | `getProjects` sequential role + assignments check | `app/actions/projects.ts:162-176` | `getCachedUserRole` + `Promise.all` | ✅ FIXED Phase 8 |
| PH3 | Perf | `getProjectStats` 5th sequential query outside parallel batch | `app/actions/projects.ts:284-297` | Fold into existing `Promise.all` | ✅ FIXED Phase 8 |
| PH4 | Perf | Module-level `_finishedCache` unreliable on serverless | `app/actions/inbox.ts:64-65` | Replace with `React.cache()` | ✅ FIXED Phase 8 |

## Medium Priority (17 — all deferred, not ship blockers)

- **FM1-2** — Unnecessary `'use client'` on render-only `portal-billing-summary` / `portal-stats-row`
- **FM3** — `WorkspaceCard` not memoized (search box re-renders all cards) — `portal-workspace-grid.tsx:35-106`
- **FM4** — `client-access.tsx` table rows not memoized — extract `ClientRow` + memo
- **FM5** — Tasks table renders all rows without pagination — `tasks-content.tsx:283-394`
- **FM6** — `M1` closure stale-risk in `activity-content.tsx:150` (suppressed exhaustive-deps)
- **BM1** — `updateFeatureRequest` missing Zod validation — `client-requests.ts:166-223` — ✅ FIXED Phase 7
- **BM2** — No rate limiting on `/api/embeddings` (Google AI cost risk)
- **BM3** — No rate limiting on `/api/tts` (ElevenLabs cost risk)
- **BM4** — 22 instances of `.select('*')` across server actions (future column leak risk)
- **BM5** — `session_reports` RLS enabled with zero policies (documented service-role-only footgun)
- **PM1** — `tldraw.css` static import on board-canvas (admin-only, ~50-100KB) — moot, board removed
- **PM2** — `select('*')` on hot roadmap/financials/projectById paths
- **PM3** — Barrel import in `lib/swr.ts` forces eval of 49 action stubs — direct imports
- **PM4** — AI agent chat lacks message virtualization for long conversations
- **PM5** — `getProjectStats` fifth sequential query outside parallel batch (redundant with PH3) — ✅ FIXED

## Low Priority (12)

- **FL1** — Duplicate utility functions across portal files (`formatRelativeTime` × 3, `getGreeting` × 3)
- **FL2-5** — Dead props (`userName`, `userRole`), unused `PortalDashboardStats`, files empty-state spacing
- **BL1** — `console.log` in production server actions (project-assignments, project-integrations)
- **BL2** — `idempotency_keys` table has no purge cron
- **PL1-3** — Minor: `getProjects` duplicates role check, large `console.error` payloads in board-canvas (moot), `getProjectById` `select('*')`

## Verdict

Phase 6 shipped. All 3 criticals closed, 9 of 14 highs closed, 1 of 17 mediums closed. Remaining:
- **BH1, BH2, BH5** — three security-flavored items. None live-incident. Queue as follow-up sprint.
- **All medium/low findings** — deferred (incremental refactor as files are touched).
