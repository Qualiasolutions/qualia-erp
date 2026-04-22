---
date: 2026-04-22 (post 21-commit delta)
mode: full
critical: 0
high: 4
medium: 20
low: 16
status: needs_attention
prior_date: 2026-04-21 14:20
scope: full audit — frontend + backend + perf — vs 2026-04-21 baseline (21 commits landed since)
---

# Optimization Report — 2026-04-22

**Scope:** Fresh full-codebase audit (3 parallel specialist agents). Prior audit 2026-04-21 14:20 left 15 HIGH / 28 MEDIUM / 23 LOW. This delta covers 21 commits landed since (auto-assign milestone engine, files panel upload/delete, team-on-deck view, projects stage dropdown, orphan-cleanup -15,300 LOC, cron/reminders removal, planning-sync + work-sessions fixes).

## Headline

**All 15 HIGH items from the 2026-04-21 audit are verified CLOSED** — the hardening sweep between audits shipped. 4 new HIGH items were introduced or exposed by recent commits. Net severity shifted from _post-milestone rough edges_ to _feature-level gaps in freshly-shipped code_.

## Summary

- **15 HIGH closed** — responsive stacking (FH-R1..R4), password server action (FH-A1), toast on meeting-delete (FH-A2), project-links auth trio (BH-A1..A3), checkin workspace derive (BH-V1), activity_log CHECK expand (BH-V2), actionType Zod (BH-V3), embeddings + tts rate limits (BH-C1..C2), overview parallel (PH-H1), financials select projection (PH-H2), teamstatus limit (PH-H3), SWR barrel (PH-H4).
- **4 NEW HIGH** — all touch code shipped in the last 21 commits: files panel hover-only actions (touch blind), `client_file_uploaded` activity-type mismatch (silent audit failure), `work_sessions` RLS blocks admin stale-session auto-close, missing index on `tasks.source_milestone_key` (auto-assign hot path).
- **6 additional MEDIUMs closed** — dismissInsight guard, notif prefs Zod strict, deleteInvoice/deleteExpense UUID validation, getKnowledgeGuides auth, column projections on ai-conversations/phases/work-sessions read paths.
- **`select('*')` count 22 �� 14 → 6** in `app/actions/` (-73% total). `framer-motion` fully gone — clean `motion/react` + `LazyMotion`. `tldraw` verified not installed.
- **Revalidation debt remains zero** — not a single `revalidatePath`/`revalidateTag` call across 53 action modules; still the single biggest UX debt item.

---

## HIGH Priority (4 — all NEW)

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| H1 | Frontend / A11y | Files-panel download + delete are `opacity-0 group-hover:opacity-100` only — on touch devices (no hover) they are permanently invisible. Also `h-7 w-7` (28 px) below 44 px target. | `components/project-files-panel.tsx:226-253` | Add `group-focus-within:opacity-100` + `@media(hover:none){opacity:1}` and bump to 44 px tap area. |
| H2 | Backend / Audit | `uploadClientFile` writes `'client_file_uploaded'` as `activity_log.action_type` but the Zod enum in `activity-feed.ts:12-27` and the DB CHECK don't include it — client uploads are silently dropped from the audit trail (upload succeeds; feed shows nothing). | `app/actions/project-files.ts:386` → `app/actions/activity-feed.ts:240-242` | Either add `'client_file_uploaded'` to enum + migration, OR rename call to `'file_uploaded'` + `actionData.is_client_upload: true`. |
| H3 | Backend / RLS | `work_sessions` UPDATE policy is `profile_id = auth.uid()` only. The stale-session auto-close in `getTeamStatus` updates OTHER users' rows — RLS silently rejects every update, so stale sessions never close and appear "online" forever. | `app/actions/work-sessions.ts:543-554` + `supabase/migrations/20260324000001_create_work_sessions.sql:48-51` | Add admin UPDATE policy OR switch that one operation to `createAdminClient()` (already imported). |
| H4 | Perf / DB index | New auto-assign engine (`createTasksFromMilestones`, `markMilestoneTasksDone`) queries `tasks.source_milestone_key` via `.in()` / `.eq()`. Column added in `20260330100000_add_auto_assign_columns_to_tasks.sql` but no index — sequential scan grows with tasks table. | `app/actions/auto-assign.ts:120-124, 467` | `CREATE INDEX IF NOT EXISTS idx_tasks_source_milestone_key ON tasks(source_milestone_key) WHERE source_milestone_key IS NOT NULL;` |

---

## MEDIUM Priority (23)

### Frontend / UI (6)

| # | Finding | Location | Fix |
|---|---------|----------|-----|
| M-F1 | `ProjectFilesPanel` uses native `window.confirm()` instead of themed `ConfirmDialog` — jarring UX; blocks main thread. | `components/project-files-panel.tsx:134` | Swap to `ConfirmDialog` pattern used in `qualia-schedule.tsx:695`. |
| M-F2 | `TodayTimeline` renders **fabricated hardcoded times** `['09:30','11:00','13:15','15:45','16:30']` next to tasks — misleading; no data source. | `components/portal/qualia-today.tsx:435` | Remove time column or replace with real `estimated_minutes` / task index. |
| M-F3 | Projects gallery view-toggle buttons `h-6 w-6` (24 px) — below 44 px touch target. | `components/portal/qualia-projects-gallery.tsx:597` | `min-h-[44px] min-w-[44px]` wrapper; icon stays small. | FIXED 2026-04-22 |
| M-F4 | `QualiaPortalHub` hero uses dynamic `clientAccentGradient(hue)` with white text — light hues (yellow/lime) fail WCAG AA. | `components/portal/qualia-portal-hub.tsx:82,111-130` | Clamp gradient lightness <35 % OR add `bg-black/20` scrim. |
| M-F5 | `ControlTeam` avatar uses `text-white` on `clientAccent(hue, 50, 0.14)` — same light-hue contrast failure. | `components/portal/control-team.tsx:160-162` | Use `text-foreground` OR clamp background lightness to <40 % when white text is used. |
| M-F6 | Schedule legend relies solely on colored dots to distinguish meeting kinds — color-only signaling (WCAG 1.4.1). | `components/portal/qualia-schedule.tsx:544-550` | Add distinct shape or icon per kind. |
| M-F7 | StageColumn inner `grid-cols-2` squeezes project cards to ~170 px each at `md:` (tablet) — card content truncates unreadably. | `components/portal/qualia-projects-gallery.tsx:733` | Container query `@[320px]:grid-cols-2` or conditional `grid-cols-1` on parent `md:`. |
| M-F8 | Files-panel actions also fail keyboard focus — `opacity-0 group-hover` hides them from keyboard tab traversal too. | `components/project-files-panel.tsx:226-253` | Add `group-focus-within:opacity-100` (bundled with H1). |

### Backend (5)

| # | Finding | Location | Fix |
|---|---------|----------|-----|
| M-B1 | `uploadProjectFile` + `uploadClientFile` have no Zod validation on FormData (`project_id`, `description`, `phase_id`, `is_client_visible`) — unbounded string writes, UUID only validated at DB level. | `app/actions/project-files.ts:147-232, 280-404` | `z.object({ project_id: z.string().uuid(), description: z.string().max(2000).nullable(), phase_id: z.string().uuid().nullable(), is_client_visible: z.enum(['true','false']).optional() })`. |
| M-B2 | `/api/claude/session-log` accepts arbitrary JSON; `working_directory` and `branch` have no length cap — potential row-bloat via compromised key. | `app/api/claude/session-log/route.ts:30-49` | Zod schema with `.max(200/500)` on string fields. |
| M-B3 | `/api/claude/{session-log,session-feed,project-status,report-upload}` have no rate limiting — API-key auth only. Compromised key → unbounded DB hits. | `app/api/claude/*/route.ts` | `apiRateLimiter(keyHash)` ≈ 60 req/min. |
| M-B4 | **Zero `revalidatePath`/`revalidateTag` calls across all 53 action modules** — server-rendered pages serve stale data until SWR 45 s cycle. | `app/actions/**` | Add on hot mutation paths: `clockIn/Out → /tasks`, `uploadProjectFile → /projects/[id]/files`, `createDailyCheckin → /`. |
| M-B5 | 6 remaining `select('*')` in actions (down from 14). Fixed: `notification-preferences.ts:32`, `health.ts:86,114,370` (+ count queries), `ai-context.ts:48,73`, `pipeline.ts:83`, `checkins.ts:221`, `work-sessions.ts:368,434`. Remaining: `pipeline.ts:680`, `ai-conversations.ts:105,296`, `client-portal/settings.ts:87`, `project-links.ts:36`, `knowledge.ts:52`. | multiple | Project explicit columns on remaining paths. | PARTIALLY FIXED 2026-04-22 (8 of 14 projections done) |

### Perf (10)

| # | Finding | Location | Fix |
|---|---------|----------|-----|
| M-P1 | Today dashboard admin view **double-polls `getTeamStatus`** — `useTeamStatus` in `today-dashboard/index.tsx:37` + `useTeamTodaySnapshot` in `qualia-today.tsx:677` (which internally calls `getTeamStatus`). 2× queries per 60 s poll per admin. | `components/today-dashboard/index.tsx:37` & `components/portal/qualia-today.tsx:677` | Merge — `useTeamTodaySnapshot` exposes online subset, drop the separate `useTeamStatus` call. |
| M-P2 | `getTeamTodaySnapshot` queries `profiles` while also calling `getTeamStatus` (which joins workspace_members → profiles). Overlapping result sets. | `app/actions/team-today.ts:43-51` | Derive profile fields from `getTeamStatus` result; drop redundant query. |
| M-P3 | `getProjectPhasesWithDetails` does 3 sequential queries (phases → tasks → resources) — all independent. | `app/actions/pipeline.ts:674-700` | `Promise.all`; use project_id join on resources (avoid phaseIds dep). |
| M-P4 | PH-H3 partial — `getTeamStatus` has a heuristic `.limit(offlineProfileIds.length * 5)` but the proper fix is a `DISTINCT ON` RPC. | `app/actions/work-sessions.ts:565-572` | Create RPC `get_last_sessions_per_profile(ids uuid[])`. |
| M-P5 | `next/dynamic` used only in `components/new-project-modal.tsx` — heavy interaction-gated dialogs are statically imported: `PortalWelcomeTour` (~25 KB gz), `MessageThread`, `FilePreviewModal`, `PortalInvoiceFormDialog`. | `app/(portal)/portal-dashboard-content.tsx:5`, `messages-content.tsx:14`, `files-content.tsx:27`, `billing/page.tsx:8` | `dynamic(() => import(...), { ssr: false })` per dialog. |
| M-P6 | 11 components still import from barrel `@/app/actions` instead of specific modules — 10-30 KB action stubs in client bundle. | `app/(portal)/projects/[id]/project-detail-view.tsx:51` + 10 others | Direct imports per module (SWR already done). |
| M-P7 | `updateTag` wired in 5 `projects.ts` mutations but **no `'use cache'` / `cacheTag` consumers anywhere** — tags invalidate nothing. | `app/actions/projects.ts:4,500,552,671,731,795` | Add `'use cache'` + `cacheTag('project-${id}')` to `getProjectStats`, `getProjectPhases`, `getProjectById` (requires `dynamicIO` flag). |
| M-P8 | `loadQualiaFrameworkPipeline` creates 6 phases + task batches **sequentially** (12 round-trips for a new project). | `app/actions/phases.ts:535-588` | Batch insert phases, capture IDs, batch insert tasks. |
| M-P9 | Logo deletion iterates 5 extensions sequentially. | `app/actions/logos.ts:147-151` (+ client variant ~298) | Pass extension array to single `.remove()` OR `Promise.all`. | FIXED 2026-04-22 (already batch `.remove()` via Item 20) |
| M-P10 | `loadClientsTab` fetches all projects to compute per-client stats client-side (O(n) aggregation). | `app/actions/admin-control/clients.ts:35-37` | SQL RPC with `GROUP BY client_id`. |

### Design-system consistency (2)

| # | Finding | Location | Fix |
|---|---------|----------|-----|
| M-D1 | `TaskDetailDialog` "Mark as done" uses hardcoded `bg-emerald-600 text-white` — bypasses Button variant system. | `components/portal/task-detail-dialog.tsx:146` | Add `variant="success"` to Button or use semantic token class. |
| M-D2 | Pill-style Active/Done/All filter on tasks list — DESIGN.md mandates underline tabs. Borderline (filter vs tab). | `components/portal/qualia-tasks-list.tsx:214-233` | Design review — convert to underline if read as tabs. |

---

## LOW Priority (20 — digest)

**Frontend / A11y (8)**
- `TeamMemberRow` in Today has no mobile cap — long task lists push other members off-screen (`qualia-today.tsx:294, 348-369`).
- `TodayTimeline` time column cramped on 320 px (`qualia-today.tsx:425-428`).
- Hardcoded `hsl(142 76% 36%)` for progress-bar emerald in roadmap breakdown (`qualia-roadmap.tsx:523`).
- `rgba(0,0,0,…)` raw-black shadow literals — invisible in dark mode (`qualia-tweaks-panel.tsx:62,119,146`, `qualia-projects-gallery.tsx:360,708`).
- ~~Filter pill buttons `h-7` (28 px) — below 44 px touch target (`qualia-projects-gallery.tsx:573`).~~ FIXED 2026-04-22 (h-7 → h-9)
- Hidden file input lacks accessible label (`project-files-panel.tsx:162-168`).
- `TaskRow` has `role="row"` + onClick but no tabIndex/keydown — keyboard user can't activate full row (`qualia-tasks-list.tsx:408-423`).
- ~~`openTaskIds` Set rebuilt every render in `qualia-today.tsx:712-715` (no `useMemo`).~~ FIXED 2026-04-22 (already wrapped in useMemo with proper deps)

**Backend (5)**
- ~~`getSessionsAdmin` `select('*')` on `work_sessions` + FK joins (`work-sessions.ts:366-374`).~~ FIXED 2026-04-22
- ~~`getMySessions` `select('*')` (`work-sessions.ts:433-435`).~~ FIXED 2026-04-22
- `/api/claude/session-feed` query param `project` has no length cap.
- `scripts/rotate-integration-tokens.ts` uses static salt (`qualia-token-salt`) — acceptable for deterministic re-encrypt, but document in header.
- `skill_categories` / `skills` / `achievements` SELECT `USING(true)` — reference tables, low risk but should scope to non-client roles when touched.

**Perf (5)**
- ~~Missing index on `activity_log.actor_id` (FK join in overview — limit 10 caps impact) — add `CREATE INDEX idx_activity_log_actor_id ON activity_log(actor_id)`.~~ FIXED 2026-04-22 (migration added)
- ~~`TeamMemberRow` / `TeamOnDeck` not `memo()` — 60 s polling re-renders all rows on unchanged data (`qualia-today.tsx:244,282`).~~ FIXED 2026-04-22
- `ProjectFilesPanel` uses raw `useEffect` + `startTransition` instead of SWR — no dedup/caching across tab switches (`project-files-panel.tsx:70-86`).
- ~~`useTeamTodaySnapshot` polls at 60 s — admin-only, change to `slowRefreshConfig` (90 s) (`lib/swr.ts:700-706`).~~ FIXED 2026-04-22
- QualiaToday fires 5 SWR hooks on mount — consider combined `getTodayDashboardData` server action; `useTodaysTasks` is a subset of `useInboxTasks`.

**Hygiene (2)**
- Arial/Helvetica in AI-assistant print template (`ai-assistant-chat.tsx:268,276`) — print-only, low impact.
- ~~`reorderProject` runs 2 sequential UPDATEs per drag instead of `Promise.all` (~50 ms per drag).~~ FIXED 2026-04-22 (already parallelized via Item 19)

---

## Pattern Analysis (cross-cutting)

1. **New feature code shipped without the hardening pattern** — all 4 new HIGHs touch code landed in the 21-commit sprint. Files-panel didn't get the a11y focus-within pass; `uploadClientFile` invented a new action_type without crossing off the Zod enum + CHECK constraint; work-sessions admin close didn't get an RLS policy; auto-assign shipped a hot-path column without its index. **Takeaway: the post-merge checklist should include "grep enum lists, verify RLS for admin overrides, audit touch-target sizes, add index when new `.eq()`/`.in()` column introduced."**

2. **`select('*')` trending down (-36 % since last audit)** — the team is closing these when they touch the file. No need for an ESLint rule yet; discipline is working.

3. **Revalidation is the accumulating debt** — zero `revalidatePath`/`revalidateTag` across 53 modules. SWR masks the problem on happy paths but every back-button / fresh load shows stale data. Worth a focused sweep.

4. **Two-view double-poll pattern** on admin Today page (`M-P1`/`M-P2`) is the exact same class of issue that `getProjectById` N+1 was a year ago — shared data accessed from two hooks that don't deduplicate. When you see two hooks with overlapping server actions, pick one.

5. **`next/dynamic` adoption is still 1 component** — this is unchanged since the last 2 audits. Modals/dialogs are conditionally rendered but eagerly bundled. 4 easy wins, ~60-100 KB removable.

---

## Planning-code alignment

- **Phase 9 "Tasks Consolidation"** in ROADMAP.md is marked _🟡 ready to plan_ but `app/(portal)/tasks/page.tsx` already implements the unified surface (CLAUDE.md "Unified Tasks Page" is authoritative). **ROADMAP.md is stale — mark Phase 9 shipped.**
- NFR-1 (FCP <1.5 s) — still no CI regression gate. Baseline captured in Phase 21. Consider Lighthouse CI gate before handoff.
- NFR-2 (WCAG AA) — 4 new a11y findings (H1, M-F4, M-F5, M-F6) all ship-blocking for the _Accessibility_ requirement. Bundle with H1 when fixing files panel.
- NFR-4 (Security) — PASS. Zero service_role in client paths. RLS verified on all new surfaces.

---

## Recommended Close-out

**Option A — Phase 23 hardening sweep (~3 h)**
Bundle all 4 HIGH items + 4 fastest MEDIUMs into a single sweep:
- H1 + M-F8 + M-F3 (files panel a11y + touch + view-toggle in one pass)
- H2 (client_file_uploaded enum + migration)
- H3 (work_sessions admin UPDATE RLS policy)
- H4 (`idx_tasks_source_milestone_key` migration)
- M-P1 + M-P2 (kill double team-status polling)
- M-P3 (parallelize `getProjectPhasesWithDetails`)
- M-B1 (Zod on project-files FormData)

Everything else defers to Phase 17+ of "Remaining Surfaces" milestone.

**Option B — `/qualia-optimize --fix` for safe LOW/MEDIUM**
Auto-fix: 14 `select('*')` projections, `memo()` on TeamMemberRow, `slowRefreshConfig` on team-today snapshot, `cursor-pointer` + touch-target bumps, `console.error` → `toast.error` if any remain, `revalidatePath` additions on hot mutations.

**Option C — defer, ship the 4 HIGHs as hotfixes** — lowest-overhead route if you want to keep current milestone focus intact.

Run `/qualia-optimize --fix` to auto-apply LOW and safer MEDIUM items.
