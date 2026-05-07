---
date: 2026-05-07
mode: simplify+deepen+bad-patterns
critical: 0
high: 4
medium: 5
low: 5
status: needs_attention
prior_date: 2026-04-26
scope: simplification (dead code, duplicates, premature abstractions) + architecture deepening (Ousterhout) + badly-handled FE/BE patterns
shipped_in_session_2026_05_07: [L1, L2, L5, M3, M5]
deferred_with_reason:
  - L3: 33 import-path changes for moving 14-line file — low ROI churn
  - L4: per-route audit needed (which reads via SWR vs server component)
  - M1: substantial — 4 modules + their UI consumers, deserves own PR
  - M2: only 11 callers, partial overlap, dedup payoff small (~30 LOC)
  - M4: single-file leak; inline fix is 3-line shuffle, no real benefit
  - H2: behavior change (silent success → error on missing rows) needs per-call-site audit before applying broadly
  - H1: 271-fn migration — multi-week, must be incremental per-module
  - H3: 2337-line lib/swr.ts split — mechanical but high churn, own PR
  - H4: god-component splits — per-component multi-day refactors
---

# Optimization Report — 2026-05-07

**Project:** qualia-erp · **Mode:** simplify+deepen+bad-patterns · **Spawned:** 3 parallel agents (code-simplicity-reviewer, architecture-strategist, general-purpose bad-pattern hunt).

## Summary

The codebase ships and works, but three structural smells dominate: (1) **the action preamble** is repeated 271 times across 56 modules — every server action independently does `createClient + auth.getUser + role check`; (2) **`lib/swr.ts` is a 2337-line god module** holding all 37 hooks + 33 invalidators in one file; (3) **multiple high-value components bypass SWR entirely** via imperative `useEffect` fetches, breaking cache sharing and tab-switch refresh. None are critical, but each compounds — adding a new action, hook, or large component is more expensive than it should be. The simplicity pass also found ~250 lines of dead/aliased code and a dual re-export router (`app/actions.ts` + `app/actions/index.ts` = 386 lines) that can be collapsed.

## HIGH Priority (4)

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| H1 | Backend / Architecture | **Action preamble repeated 271 times.** Every server action does `createClient → auth.getUser → null-check → role check → workspace scope` (8-12 lines per fn). Auth identity is never cached at the request level — `getCachedUserRole` caches the role lookup but not the `auth.getUser()` round-trip itself. | 271 fns across `app/actions/*.ts` (e.g. `clients.ts:58-83`, `inbox.ts` 23 calls, `work-sessions.ts` 14 calls) | Build `withAuth(fn)` HOF + `getCachedUser = cache(...)` in `app/actions/shared.ts`. Wrapped fn receives `{ supabase, user, workspaceId, isAdmin }`. Migrate incrementally — new actions use it, port a module per session. |
| H2 | Backend / Safety | **Silent mutations without `.select()`.** When RLS blocks a `.delete()` or `.update()`, the call returns `error: null` — caller reports success but zero rows changed. Pattern is fixed correctly at `phases.ts:218-238` but not propagated. | `activities.ts:114`, `daily-brief.ts:152,165,178`, `phases.ts:257,295,330,407,667,688,695`, `deployments.ts:166,181,203`, `workspace.ts:137,142,221,291`, `client-requests.ts:305,386,392,542`, `portal-messages.ts:495` (~20+ sites) | Always chain `.select('id')` after `.delete()`/`.update()` and assert `data.length > 0`. Could be a lint rule. |
| H3 | Architecture | **`lib/swr.ts` god module — 2337 lines.** 37 hooks + 33 invalidators + cache-keys object all in one file. Adding any client-side fetch means editing the same monster. | `lib/swr.ts:1-2337` | Split into `lib/swr/{keys,config,tasks,projects,portal,comms,team}.ts` with a barrel `lib/swr/index.ts` preserving existing imports. Mechanical, no logic change. |
| H4 | Frontend | **God components bypass SWR via imperative `useEffect` fetches.** `project-workflow.tsx` (1420 lines) imports 8 server actions directly, runs `useEffect → fetchData()`, ignores the existing `useProjectPhases`/`useProjectTasks` hooks. Breaks cache-sharing, tab-switch revalidation (45s), and optimistic updates from sibling consumers. | `components/project-workflow.tsx:633-634` (1420 lines), plus `qualia-knowledge-view.tsx` 1610 lines, `qualia-tasks-list.tsx` 1351, `qualia-home-view.tsx` 1149, `qualia-projects-gallery.tsx` 1107, `control-finance.tsx` 897, `portal-welcome-tour.tsx` 865 | Replace `useEffect+server-action` with the existing SWR hooks. Split each god-component into `<List>`, `<Detail>`, `<Section>` chunks. Largest 3 first. |

## MEDIUM Priority (5)

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| M1 | Backend / Contract | **Inconsistent `ActionResult` envelope.** Some read functions return raw shapes (`{rows, total, authorized}`) or `null` on failure instead of `{success, error?, data?}`. Callers each invent their own null-check. | `reports.ts:91-98` + `:57-58`, `projects.ts:229`, `clients.ts:507`, `knowledge.ts:125` | Wrap reads as `ActionResult<T>` — `success: true, data:T` or `success: false, error: msg`. Auth failures get `error: 'Not authenticated'` instead of bare `null` (so UI distinguishes auth vs empty vs error). |
| M2 | Architecture | **`canDelete*` family — 7 near-identical functions.** Each does `isUserAdmin || (fetch row, compare creator_id == userId)`. ~100 LOC of duplication. | `app/actions/shared.ts:65-269` (`canDeleteIssue`, `canDeleteProject`, `canDeleteMeeting`, `canDeleteClient`, `canDeletePhase`, `canDeletePhaseItem`, `canDeleteProjectFile`) | Single `canDelete(userId, table, id, ownershipRule)` parameterized by table + creator column + optional FK chain. 229 callers migrate mechanically. |
| M3 | Simplicity | **`getUserRole` is the uncached twin of `getCachedUserRole`.** 21 callers use the uncached one and lose the per-request dedup. | `app/actions/shared.ts:60` (uncached), `:42` (cached, used by `isUserAdmin`) | Delete `getUserRole`. Migrate the 21 callers to `getCachedUserRole`. |
| M4 | Architecture | **Supabase FK shape leaks into the page layer.** `normalizeFKResponse` should live behind the action; instead a portal page imports it directly. | `app/(portal)/clients/[id]/page.tsx:69` (1 confirmed; 32 other call sites are correctly inside `app/actions/` or `lib/`) | Move the normalize call into `getClientById` (or whichever action returns this), so the page receives a clean domain type. Drop the page-level import. |
| M5 | Architecture | **`isUserManagerOrAbove` is a misleading alias for `isUserAdmin`.** The `manager` role was removed 2026-04-18; the alias remains and 5 files import it as if there were a manager tier. | `app/actions/shared.ts:57` — `export const isUserManagerOrAbove = isUserAdmin;` Callers: `app/(portal)/requests/page.tsx:5`, `app/actions/admin.ts:5`, `app/actions/dashboard-notes.ts:5,55,90,123,144` | Migrate the 5 callers to `isUserAdmin`. Delete the alias. (Already on the deferred list in `.continue-here.md` — now scoped.) |

## LOW Priority (5)

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| L1 | Simplicity | **Dual re-export routers.** `app/actions.ts` (139 LOC, "for backward compat") and `app/actions/index.ts` (247 LOC) both re-export the same 56 modules. 12 imports use the older `@/app/actions` path. | `app/actions.ts:1-139`, `app/actions/index.ts:1-247` | Migrate the 12 stale imports to `@/app/actions/index` (or per-module). Delete `app/actions.ts`. |
| L2 | Simplicity | **Dead exports — 7 confirmed zero-caller exports.** | `activities.ts:92` (`deleteActivity`), `financials.ts:456,470,484` (`hideInvoice`/`unhideInvoice`/`deleteInvoice`), `health.ts` (`getHealthMetrics`, `calculateProjectHealth`), `auth.ts` (`getAdminStatus`), `auto-assign.ts:200` (`createTasksFromPhases` alias), `shared.ts:137` (`canDeletePhaseItem`) | Verify each with `grep -r "from.*<symbol>"`, then delete. ~50 LOC. |
| L3 | Simplicity | **`lib/server-utils.ts` is a 14-line file with one used export.** Premature module boundary. | `lib/server-utils.ts:4-14` | Inline `normalizeFKResponse` + `FKResponse` type into `lib/supabase/server.ts` (where it contextually belongs). Delete the file. |
| L4 | Frontend | **Double revalidation.** Server actions call `revalidatePath('/tasks')` AND client code calls `invalidateInboxTasks()` after the same mutation. SWR fires immediately; `revalidatePath` fires uselessly in the background. | `inbox.ts:867`, `projects.ts` (8 `revalidatePath` calls) | For client-rendered routes that read via SWR, drop `revalidatePath`. Reserve it for pure server-component pages. |
| L5 | Hygiene | **7 stale planning artifacts (~100KB).** Old optimize-audits, debug log, session log, prior OPTIMIZE.md. | `.planning/{DEBUG-2026-04-25-1213,SESSION-2026-04-26,optimize-audit-buttons,optimize-audit-comments,optimize-audit-leaks,optimize-audit-perf}.md` (this file replaces the previous `OPTIMIZE.md`) | Delete. Active research (`phase-admin-control-v2-research.md`, `research/admin-v2-pillar-*.md`) stays — those are for in-progress M5 work. |

## Suggested execution order

Pair structurally-related items so commits stay small + atomic:

1. **Quick wins (1 session, ~1h)** — L1, L2, L3, L5: delete dead code + dual router + stale planning files. ~400 LOC + 100KB removed. Zero behavior change.
2. **Safety pass (1 session, ~2h)** — H2: add `.select('id')` + post-condition assertions to the 20 silent-mutation sites. Fix per file, run tests after each.
3. **`canDelete*` collapse (1 session, ~2h)** — M2 + M3 + M5: collapse the 7 functions, remove `getUserRole` duplicate, delete `isUserManagerOrAbove` alias. All happen in `shared.ts` + caller migration.
4. **Action envelope normalization (1-2 sessions)** — M1: rewrap reads in `ActionResult<T>` for the 4 modules. Fix UI consumers as you go (TS will surface them).
5. **`withAuth` HOF (incremental)** — H1: build the wrapper, then migrate one module per session. Don't try to do all 271 in one go.
6. **`lib/swr.ts` split (1 session)** — H3: mechanical move into `lib/swr/{keys,config,tasks,...}.ts` with barrel re-export. No callers change.
7. **God-component split (per-component, biggest first)** — H4: start with `project-workflow.tsx` (1420 LOC). Extract SWR hooks first, then split into sub-components. Repeat for the next 6.

Items 1-3 are pure simplification — recommend doing them first; they unblock cleaner work on 4-7.
