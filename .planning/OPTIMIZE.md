---
date: 2026-04-26 (post --fix)
mode: perf
critical: 0
high: 2
medium: 5
low: 4
status: needs_attention
prior_date: 2026-04-22
scope: --perf only — single specialist sweep against the Phase 21 baseline + delta from Phases 23/24 + new diagnostic findings
fixed_in_this_run: M1 (motion typo), L1 (notification-panel barrel)
---

# Optimization Report — 2026-04-26 (Performance)

**Project:** qualia-erp · **Mode:** `--perf` · **Baseline:** Phase 21 (commit `b1ec710`, 2026-04-21) — shared JS 1658.5 kB, top chunk 488 kB, ~1.95 MB first-load on most routes.

## Headline

The mid-list of the prior `--full` audit (2026-04-22) is mostly closed: **M-P7 (`use cache`/`cacheTag` consumers) is FIXED** via `lib/cached-reads.ts`, **M-P8 (sequential phase creation) is FIXED** via batch-insert at `pipeline.ts:463-485`, and **all 6 remaining `select('*')` calls are gone** (M-B5 closed). What remains is a small set of measurable, surgical wins concentrated in the chat-API path, the root-provider auth duplication, and a single-character config typo that silently disables motion tree-shaking.

**Top 3 wins, by impact/effort:** the `next.config.ts` `motion` typo (5 min, 15–25 kB), parallelizing chat API DB writes (1 h, 30–50 ms TTFB on every chat message), and a shared `AuthProvider` to kill the dual `getUser()` round-trip in root providers (half-day, 60–100 ms on every page load).

---

## HIGH Priority (2)

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| H1 | Latency / Chat | `processStreamingAI` is preceded by 2 serial Supabase inserts (existing-conversation path) or 3 serial inserts (new-conversation path). Adds 30–50 ms TTFB to every chat message. | `app/api/chat/route.ts:140-149` (existing) · `153-173` (new) | Existing path: `Promise.all([insertMessage, updateConversationTimestamp])`. New path: keep conversation insert sequential (need ID), but fire message insert concurrently with `processStreamingAI` start, OR fire-and-forget after stream begins. |
| H2 | Render / Auth | `AdminProvider` and `WorkspaceProvider` both call `supabase.auth.getUser()` independently on mount. Two redundant client-side auth round-trips per page load. | `components/admin-provider.tsx:118` · `components/workspace-provider.tsx:42` | Create `AuthProvider` at root with single `getUser()` call exposing context. Both consumers `useAuthUser()`. Saves 60–100 ms / page load. |

---

## MEDIUM Priority (6)

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| ~~M1~~ | ~~Bundle~~ | ~~`optimizePackageImports` lists `'framer-motion'` but the installed package is `motion`.~~ **FIXED 2026-04-26** — `next.config.ts:119` now `'motion'`. Verify with `ANALYZE=true npm run build` next deploy. | `next.config.ts:119` | DONE |
| M2 | Bundle | `PortalInvoiceFormDialog` is statically imported on the billing page (~15–25 kB form + Zod schemas in initial bundle). **NOT auto-fixed**: `billing/page.tsx` is a server component, so `dynamic(..., { ssr: false })` requires extracting an admin-area client wrapper first. | `app/(portal)/billing/page.tsx:8` | Create `<AdminInvoiceFormButton>` client wrapper that does the dynamic import; render that from the server page instead of the dialog directly. Last of M-P5 cluster. |
| M3 | Queries | `loadClientsTab` runs unfiltered `select('id, client_id, status, updated_at')` on `projects` and aggregates per-client in JS. O(projects) data + O(projects) work on every admin Clients tab load. | `app/actions/admin-control/clients.ts:35-45` | Supabase RPC: `GROUP BY client_id` returning `(client_id, project_count, active_count, last_activity)`. ~80% transfer reduction at 50+ projects. |
| M4 | Queries | `getTeamStatus` offline-session lookup uses heuristic `.limit(offlineProfileIds.length * 5)` then JS dedup (TODO acknowledged on line 565). At 20 offline members fetches ~100 rows to keep 20. | `app/actions/work-sessions.ts:565-584` | RPC `get_latest_session_per_profile(ws_id uuid, profile_ids uuid[])` using `DISTINCT ON (profile_id) ... ORDER BY profile_id, ended_at DESC`. Returns exactly N rows. Fires every 90 s. |
| M5 | Render | `QualiaToday` fires 5 independent SWR hooks on mount (`useTodaysTasks`, `useInboxTasks`, `useEmployeeAssignments`, `useTodaysMeetings`, `useTeamTodaySnapshot`). 5 round-trips, up to 5 re-renders as data arrives. | `components/portal/qualia-today.tsx:687-691` | New combined server action `getTodayDashboardData()` returning all 5 payloads via `Promise.all`. Single SWR hook `useTodayDashboard()`. 1 round-trip + 1 settled render. |
| M6 | Latency | Middleware falls back to a `profiles` SELECT on every request when `app_metadata.user_role` and JWT claims both lack the role. Affects users whose `custom_access_token_hook` hasn't fired. ~15–25 ms per request. | `middleware.ts:74-80` | Cache resolved role into a response cookie OR force `refreshSession()` on first miss to populate the JWT claim, then short-circuit on subsequent requests. |

---

## LOW Priority (5)

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| ~~L1~~ | ~~Bundle~~ | ~~`notification-panel.tsx` imports server actions from the `@/app/actions` barrel.~~ **FIXED 2026-04-26** — switched to `@/app/actions/notifications`. M-P6 cluster fully closed. | `components/notification-panel.tsx:22` | DONE |
| L2 | Bundle | `@octokit/rest` is in `dependencies` (~45 kB gz). Imported only in server-only files (`app/actions/integrations.ts:6`, `lib/integrations/github.ts:5`). Likely tree-shaken from client; verify with `ANALYZE=true`. | `package.json:21` | `ANALYZE=true npm run build` to confirm zero client leak. If clean, no action. If leaks, add to `serverExternalPackages`. |
| L3 | Render | `ProjectFilesPanel` uses raw `useEffect` + `startTransition` for fetching — no SWR dedup, no cache sharing across instances. | `components/project-files-panel.tsx:78-88` | Add `useProjectFiles(projectId, isClient)` to the SWR layer; replace manual fetch. |
| L4 | Architecture | `lib/swr.ts` is a 2300-line client module — every consumer pays parse cost for the whole file. Domain-split would localize churn and trim downstream parse work. | `lib/swr.ts` | Split into `lib/swr/{tasks,projects,teams,notifications,...}.ts` + `lib/swr/config.ts`; re-export from `lib/swr/index.ts` for compat. |
| L5 | Architecture | `app/actions/inbox.ts` is 1800 lines (read + write + bulk + client-visible filter). Server-side only — performance impact zero, maintainability cost real. | `app/actions/inbox.ts` | Split into `inbox-read.ts`, `inbox-write.ts`, `inbox-bulk.ts`. |

---

## Closed Since 2026-04-22

Verified FIXED — no action needed:

- **M-P7** — `lib/cached-reads.ts` now implements `'use cache'` + `cacheTag` for `getCachedProjectById`, `getCachedProjectIntegrationStatus`, `getCachedClientDashboardData`, `getCachedClientDashboardProjects`. `updateTag()` calls in `app/actions/projects.ts` (lines 500, 554, 635, 681, 741, 806) correctly invalidate them.
- **M-P8** — `loadQualiaFrameworkPipeline` removed; `initializeProjectPipeline` at `app/actions/pipeline.ts:463-485` batch-inserts phases and `Promise.all`s prerequisite updates.
- **M-B5** — Zero `select('*')` in `app/actions/` (only historical comments remain).
- **M-P6 (mostly)** — Down from 11 client barrel imports to 1 (`notification-panel.tsx`).

---

## NFR Status

- **NFR-1 (FCP < 1.5s):** Baseline captured Phase 21. **Still no CI regression gate.** Recommend Lighthouse CI as a small slice in any near-term perf phase.
- **NFR-2 (WCAG AA):** Out of scope for `--perf`. See prior 2026-04-22 audit if reopened.
- **NFR-4 (Security):** No regressions surfaced by perf scan.

---

## Recommended Close-out

**Option A — Phase 25 perf sweep (~1 day total)** — single bundled commit:
- M1 (5 min, motion typo) — pure win, zero risk.
- H1 (1 h, chat parallel writes) — measurable TTFB win on hot path.
- M2 (5 min, PortalInvoiceFormDialog dynamic) — closes M-P5 cluster.
- L1 (5 min, notification-panel barrel) — closes M-P6 cluster.
- M3 + M4 (1 h each, two RPCs) — bundle the migration, ship together.
- H2 (half-day, AuthProvider) — refactor with care; affects every page.

**Option B — `/qualia-optimize --fix`** — auto-apply M1, M2, L1 (the three 5-min items). Defer everything that touches runtime semantics.

**Option C — Architectural Phase 25.A "RSC migration"** — separate phase to migrate dashboard + tasks + projects read paths from "client component → SWR → server action" to "server component → Suspense streaming". 200–500 ms LCP win on key authenticated pages. This is the only remaining lever on the **shared 1658 kB baseline**. Track L4 + L5 as deferred maintainability work alongside it.

---

## TOP 5 (impact / effort)

| # | Action | Expected Win | Effort |
|---|--------|-------------|--------|
| 1 | Fix `next.config.ts:119` — `'framer-motion'` → `'motion'` | 15–25 kB shared JS | 5 min |
| 2 | Parallelize chat API DB writes (`api/chat/route.ts:140-149`) | 30–50 ms TTFB / chat msg | 1 h |
| 3 | Shared `AuthProvider` to dedupe `getUser()` in root providers | 60–100 ms / page load | half-day |
| 4 | RPC for `loadClientsTab` per-client aggregate | ~80% transfer reduction at scale | 1 h |
| 5 | RPC `DISTINCT ON` for `getTeamStatus` offline lookup | ~80% rows reduction every 90 s | 1 h |
