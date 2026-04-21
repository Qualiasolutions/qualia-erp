---
date: 2026-04-20 10:40
updated: 2026-04-20
mode: full (scoped to today's phase-16 deltas)
phase_16_critical: 0
phase_16_high: 0
phase_16_medium: 3
phase_16_low: 3
status: needs_attention
prior_date: 2026-04-17 (phase 6 pre-deploy)
---

# Optimization Report — Phase 16 UI Remake delta audit (2026-04-20)

**Scope:** 8 files changed this session — 5 new `components/portal/qualia-*.tsx` (Tasks, Projects, Roadmap, Schedule, plus prior Today) and 3 callsite swaps (`tasks-view.tsx`, `projects-client.tsx`, `schedule/page.tsx`, `roadmap/page.tsx`). Audited against DESIGN.md, security rules, and React-19/Next.js-16 best practices. This was NOT a full codebase re-audit — see the Phase 6 audit below for the broader surface.

## Summary

**Zero critical or high-severity issues.** New code is type-clean, lint-clean, a11y-conscious, and uses server actions / RLS correctly. Three mediums are regressions from the old files that the redesign replaced; three lows are refinements.

## Medium Priority

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| Ph16-M1 | Perf / Regression | **Virtualization dropped.** Old `tasks-view.tsx` used `@tanstack/react-virtual` for admin `scope=all` (up to 500 rows). New `QualiaTasksList` renders flat. At 500 rich rows with avatars + status chips, scroll jank is plausible on lower-end devices. | `components/portal/qualia-tasks-list.tsx` list-render block (~line 870) | Wrap the row list in `useVirtualizer` from `@tanstack/react-virtual` (already a dependency). Empty state + filter logic unchanged. |
| Ph16-M2 | Perf | **No `React.memo` on gallery / schedule rows.** `ProjectCardTile`, `ProjectListRow`, `EventBlock` re-render on every parent state change. `TaskRow` is correctly memoized — inconsistency. | `components/portal/qualia-projects-gallery.tsx:250,336`; `components/portal/qualia-schedule.tsx:164` | Wrap each in `React.memo(function …)`. Props are stable shape, no custom comparator needed. |
| Ph16-M3 | UI quality | **No explicit loading state during SWR revalidation.** `QualiaTasksList` reads `useInboxTasks()` but never inspects `isValidating` / `error`. On first render with empty `initialTasks`, user sees "Nothing here. Nice." flash before real data arrives. | `components/portal/qualia-tasks-list.tsx:670` (`inboxLive` destructure) | Destructure `isValidating` from the hook. Show a 4-row skeleton when `initialTasks.length === 0 && inboxLive.tasks.length === 0 && inboxLive.isValidating`. |

## Low Priority

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| Ph16-L1 | UI / data hygiene | **`logo_url` fetched but never rendered.** `GalleryProject` type includes it and `page.tsx` maps it from the RPC, but `ProjectCardTile` only shows the italic watermark + hue tape. Either render or drop. | `components/portal/qualia-projects-gallery.tsx` (type at line 17) | Option A: `<Image>` overlay on the accent tape (`object-contain opacity-70 mix-blend-luminosity`) — recommend. Option B: drop `logo_url` from type + mapping. |
| Ph16-L2 | Perf / Scalability | **Schedule fetches all meetings then filters client-side.** `getMeetings(undefined, scopeToUserId)` returns every meeting the user can see. Fine today; pathological at thousands. | `app/(portal)/schedule/page.tsx:41` | Add optional `dateRange: { start: Date; end: Date }` to `getMeetings`; pass `{ weekStart, weekStart + 7 days }`. Keep `undefined` fallback. |
| Ph16-L3 | Design system | **Inline `oklch()` color math scattered across 14+ call sites.** DESIGN.md:197 forbids "hardcoded colors scattered in JSX." The single-function hue derivation is acceptable but `oklch(55% 0.15 ${hue})` is duplicated. | `components/portal/qualia-projects-gallery.tsx:62-63,315,363,399`; `components/portal/qualia-roadmap.tsx:165,210,226,268,286,298,303,363,386,527` | Extract `clientAccent(hue: number): string` into `lib/color-constants.ts` returning the canonical oklch triplet. Replace inline template-string usage. |

## Planning-code alignment

- Phase 16 (UI Remake milestone) is not explicitly in REQUIREMENTS.md (which predates the remake) but aligns with **FR-2 Portal Dashboard** and **FR-3 Projects**. The UI remake is a visual-layer reroll, not a functional expansion, so requirements continue to describe the surface accurately.
- ROADMAP.md's "Phase 3: Project Boards ✅ (shipped, then REMOVED)" — accurate; no stale references in new phase-16 code.
- Phase 4/5 list `/tasks` standalone + portal settings — both still present, routes unchanged.
- **No orphan routes.** All phase-16 routes map to requirements.

## Architecture

1. **`tasks-view.tsx` shrank from 1034 → 30 LOC** via shim-to-new-component delegation. Net win — kept `page.tsx` untouched, cleared the test surface. Same pattern for `projects-client.tsx` (419 → 54 LOC). Worth formalizing as a convention for future phase swaps.
2. **Color accent derivation duplicated across 3 components** (`qualia-today.tsx`, `qualia-projects-gallery.tsx`, `qualia-roadmap.tsx`). Extract once into `lib/color-utils.ts` (or `lib/color-constants.ts`). Tied to Ph16-L3.
3. **`QualiaRoadmap` is a pure Server Component** — correct Next.js 16 default. No interactivity yet (no "Manage" / "+ Add" actions wired). Deferred in the task spec; track for Phase 17.

## What's clean in new code

- No `service_role` usage anywhere in `components/portal/`
- No `dangerouslySetInnerHTML`, `eval()`, or `new Function()`
- No `console.log`/`TODO`/`FIXME` leftover
- Error handling on every server-action call via `toast.error()`
- `useOptimistic` + `useTransition` for snappy UX in tasks list
- Role-gated fetches enforce RLS at the data layer (`canAccessProject`, `client_projects` link check, `project_assignments` scope)
- Tailwind-first; no raw `#rrggbb` or `rgba()` in new files
- Accessibility: `aria-label`, `aria-hidden`, `aria-pressed`, focus rings, keyboard targets all present

## Suggested close-out

- **Phase 16.6 "tasks/gallery/schedule perf harden"** — bundle M1 + M2 + M3 — 30–60 minutes
- **Separate small chore** for L3 (extract color-accent helper) before Phase 17 starts, so Phase 17 inherits the tokenised helper from day 1
- L1 + L2 — optional, no urgency

Run `/qualia-optimize --fix` to auto-apply L1/L2/L3 (MEDIUM findings require human review on virtualization + skeleton design choices).

---

# Optimization Report — Portal v2 Pre-Deploy (Phase 6) — PRIOR RUN

> This is the prior full-codebase audit from 2026-04-17 / updated 2026-04-18. Preserved for history.

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

## Verdict (Phase 6)

Phase 6 shipped. All 3 criticals closed, 9 of 14 highs closed, 1 of 17 mediums closed. Remaining:
- **BH1, BH2, BH5** — three security-flavored items. None live-incident. Queue as follow-up sprint.
- **All medium/low findings** — deferred (incremental refactor as files are touched).
