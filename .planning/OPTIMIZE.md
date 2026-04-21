---
date: 2026-04-21 14:20
mode: full
critical: 0
high: 15
medium: 28
low: 23
status: needs_attention
prior_date: 2026-04-20 (phase 16 delta)
scope: post-Remaining-Surfaces milestone (Phases 17-22) + 2-day follow-up (27 commits)
---

# Optimization Report — Post-Remaining-Surfaces milestone (2026-04-21)

**Scope:** Full codebase audit spanning 3 parallel specialist agents (frontend, backend, performance). Last full audit was 2026-04-17 (Phase 6). Since then: UI Remake milestone closed (Phases 14-16.6), Remaining Surfaces milestone closed (Phases 17-22 + polish), plus 27 commits of follow-up work (phase 24 task detail, files inline upload, admin team-on-deck, auto-assign rewiring, orphan cleanup -15,300 LOC).

## Summary

**Zero true critical issues.** The 2 CRITICAL findings initially surfaced (permissive `USING(true)` RLS on projects/issues/teams/comments/documents) were **verified false positives** — those policies were dropped in migrations `20240104000000_add_role_based_access_control.sql` and `20251201000000_fix_permissive_rls.sql`. The backend agent was reading the original creation migration without cross-referencing the drop history.

**Real work to do:**
- **15 HIGH** — mix of responsive regressions on new data-dense surfaces (Gantt, roadmap breakdown, projects list, clients table), a few missing auth/role guards on `project-links.ts`, and long-standing deferred items (rate limits on `/api/embeddings` + `/api/tts`, `activity_log` CHECK constraint, `createActivityLogEntry` Zod).
- **28 MEDIUM** — design-system consistency (`max-w-[1400px]` caps in 4 surfaces, hardcoded shadow/hsl values, cursor-pointer gaps), column projection on hot reads (`select('*')` × 22, PM2 still open), head-only COUNT opportunities on overview tab, `next/dynamic` unused for modals, SWR barrel import still alive (PM3).
- **23 LOW** — polish items; touch target sizes on schedule nav, `console.error` instead of `toast.error` in 3 spots, `select('*')` on user-scoped read paths.

---

## High Priority (15)

### Frontend / Responsive

| # | Finding | Location | Fix |
|---|---------|----------|-----|
| FH-R1 | **QualiaToday two-column grid does not stack on mobile** — inline `gridTemplateColumns: '1.4fr 1fr'` with no responsive fallback. Content crushed below 768px. | `components/portal/qualia-today.tsx:802` | Tailwind: `grid grid-cols-1 gap-[var(--gap)] lg:grid-cols-[1.4fr_1fr]` |
| FH-R2 | **Roadmap PhaseBreakdownTable fixed 7-col grid (~640px min) overflows on mobile.** No `overflow-x-auto` wrapper → content clipped. | `components/portal/qualia-roadmap.tsx:466,495` | Wrap in `overflow-x-auto` + `min-w-[640px]`, or card layout on `<md`. |
| FH-R3 | **Projects list view fixed 6-col grid overflows on mobile** (600px min) with no scroll indicator. | `components/portal/qualia-projects-gallery.tsx:451,643` | Add `overflow-x-auto` wrapper, or hide list view on `<md`. |
| FH-R4 | **Schedule Gantt grid 60px + 7×1fr compresses day columns to ~35px on 320px viewport** — meeting titles truncated to 1-2 chars, unusable. | `components/portal/qualia-schedule.tsx:569,598` | Switch to vertical day-list on `<md`; render Gantt only at `md:+`. |

### Frontend / Auth pattern

| # | Finding | Location | Fix |
|---|---------|----------|-----|
| FH-A1 | **Password change calls client-side `supabase.auth.updateUser({password})`.** Contradicts the "never mutate from client" rule — every other mutation flows through server actions. | `app/(portal)/settings/settings-content.tsx:12,83` | New `changePassword` server action in `app/actions/auth.ts`, call via `startTransition`. |
| FH-A2 | **Silent meeting-delete failure** — `console.error` only; no user-facing toast. Dialog closes, user thinks meeting deleted. | `components/portal/qualia-schedule.tsx:457` | `toast.error('Failed to delete meeting')` |

### Backend / Auth gaps on project-links

| # | Finding | Location | Fix |
|---|---------|----------|-----|
| BH-A1 | **`getProjectLinks` has no auth check at all** — any context can read GitHub URLs/integration metadata for any project. | `app/actions/project-links.ts:22-37` | Add `supabase.auth.getUser()` + `canAccessProject(user.id, projectId)` guard. |
| BH-A2 | **`removeProjectLink` has no auth/role check** — any authenticated user can delete any project's GitHub integration, breaking webhook sync. | `app/actions/project-links.ts:75-90` | Add auth + admin/lead guard. |
| BH-A3 | **`saveProjectLink` authenticates but lacks role guard** — any employee/client could attach a malicious repo. | `app/actions/project-links.ts:42-70` | Add `isUserAdmin` or lead check. |

### Backend / Validation & deferred items

| # | Finding | Location | Fix |
|---|---------|----------|-----|
| BH-V1 | **`createDailyCheckin` trusts client `workspaceId`** — inserts into any workspace without membership check. | `app/actions/checkins.ts:62,77` | Derive from `getCurrentWorkspaceId()` or verify `workspace_members`. |
| BH-V2 | **`activity_log` CHECK constraint still rejects `code_push`, `deployment`, `feature_request`** — GitHub + Vercel webhooks insert these and silently fail. (BH2 from Phase 6.) | `supabase/migrations/20260301100000_...` vs `app/api/github/webhook/route.ts:298`, `app/api/webhooks/vercel/route.ts:209` | Migration to expand CHECK constraint. |
| BH-V3 | **`createActivityLogEntry` accepts arbitrary `actionType` without Zod** — BH5 from Phase 6, unresolved. | `app/actions/activity-feed.ts:205-240` | `z.enum([...])` on actionType. |

### Backend / Cost controls

| # | Finding | Location | Fix |
|---|---------|----------|-----|
| BH-C1 | **`/api/embeddings` has no rate limit** (BM2 Phase 6) — employee could burn Google AI credits unbounded. | `app/api/embeddings/route.ts:26` | `await apiRateLimiter(user.id)` after auth. |
| BH-C2 | **`/api/tts` has no rate limit** (BM3 Phase 6) — ElevenLabs credit risk. | `app/api/tts/route.ts:8` | Same. |

### Performance / Hot-path optimizations

| # | Finding | Location | Fix |
|---|---------|----------|-----|
| PH-H1 | **`loadOverviewTab` runs two sequential `Promise.all` batches** (4 + 3 queries). All 7 are independent. | `app/actions/admin-control/overview.ts:49,120` | Merge into one `Promise.all`. Saves ~50-200ms. |
| PH-H2 | **`getFinancialSummary` does `select('*')` on 3 tables in parallel** — PM2 still open. Transfers 3-5× needed data. | `app/actions/financials.ts:123-127` | Explicit column projection per table. |
| PH-H3 | **`getTeamStatus` fetches ALL closed sessions for offline users with no `.limit()`** — unbounded growth. Polled every 60s. | `app/actions/work-sessions.ts:556-562` | `.limit()` + `DISTINCT ON` via RPC. |
| PH-H4 | **`lib/swr.ts` still uses barrel import from `@/app/actions`** — PM3 from Phase 6, unresolved. 10-30KB action stubs in client bundle. | `lib/swr.ts:4-12` | Direct imports from each action module. |

---

## Medium Priority (28 — see detail below)

### Design system consistency (11)

- **`max-w-[1400px]` caps on 4 major surfaces** violate DESIGN.md "no max-width caps": `qualia-control.tsx:262,312`, `qualia-portal-hub.tsx:122,140`, `qualia-today.tsx:791`, `app/(portal)/admin/page.tsx:32,43`. Wastes ultrawide real estate. Remove caps, use fluid `px-6 lg:px-8 xl:px-12`.
- **`max-w-[820px]` cap on tasks list** is fine for inbox but cramped for admin `scope=all` view. `components/portal/qualia-tasks-list.tsx:1120`. Conditional max-width by scope.
- **Hardcoded `hsl(142 76% 36%)` for progress-bar emerald** in roadmap breakdown — should use design token. `components/portal/qualia-roadmap.tsx:522`.
- **Hardcoded `rgba(0,164,172,0.25)` shadow** in welcome-tour (raw brand RGB). `components/portal/portal-welcome-tour.tsx:363,553`. Replace with `hsl(var(--primary)/0.25)`.
- **Hardcoded `bg-emerald-600 text-white` on TaskDetailDialog "Mark done" button** — bypasses Button variant system. `components/portal/task-detail-dialog.tsx:146`. Use `variant="success"` shadcn extension.
- **Pill-style segmented control for Active/Done/All filter** in tasks — DESIGN.md mandates underline-only tabs; filter is borderline but currently pill. `components/portal/qualia-tasks-list.tsx:214-233`. Design review: if it reads as tab, convert.
- **`cursor-pointer` missing on 14+ clickable elements**: `qualia-tweaks-panel.tsx:82-100,112,139`, `control-team.tsx:158-209`, `qualia-sidebar.tsx:228-251`, `control-system.tsx:250`.
- **QualiaPortalHub hero uses dynamic `clientAccentGradient(hue)` with white text** — light hues produce WCAG AA failure. `components/portal/qualia-portal-hub.tsx:112`. Add contrast check or dark scrim.
- **ControlClients table grid fixed 6-col inline** — no responsive stacking. `components/portal/control-clients.tsx:71,115`. Wrap in `overflow-x-auto` + min-width.
- **ControlTeam assignments matrix** needs `min-w-[500px]` on the `<table>` inside its scroll wrapper. `components/portal/control-team.tsx:305`.
- **Tab switching in `/admin` requires full server re-render** — no prefetching / Suspense. Users see dashed placeholder on every tab click. `components/portal/qualia-control.tsx:314-328`, `app/(portal)/admin/page.tsx:54-91`. Either prefetch adjacent tabs or switch to client SWR for tab data.

### Backend hardening (8)

- **RLS follow-up — verify `meeting_attendees` / `issue_assignees` / `portal_settings` / `dashboard_notes` / `knowledge_guides` / `portal_app_config` / `portal_branding`** SELECT policies against live DB. Source migrations use `USING(true)`; subsequent cleanup (`20260312133000_cleanup_rls_warnings.sql` et al) may have replaced them. Run `pg_policies` query before acting — BH1 from Phase 6 still requires this confirmation step.
- **`updateNotificationPreferences` has no Zod validation** on the preferences object — caller could inject arbitrary column names into upsert. `app/actions/client-portal/settings.ts:109-165`.
- **`dismissInsight` has no admin/role check** — any authenticated user can dismiss health warnings for any project. `app/actions/health.ts:315-340`.
- **`getKnowledgeGuides` runs without `supabase.auth.getUser()`** — works due to public-read RLS but should still gate on auth for defense in depth. `app/actions/knowledge.ts:41-62`.
- **`deleteInvoice` / `deleteExpense` accept string IDs without Zod UUID validation.** `app/actions/financials.ts:470,539`.
- **Zero `revalidatePath`/`revalidateTag` calls across all 53 action modules** — server components serve stale data until SWR 45s window. Audit hot mutation paths and add `revalidatePath('/tasks')` etc. where server rendering matters.
- **22 `select('*')` instances across actions** (BM4 open) — key offenders: `financials.ts:124-126`, `health.ts:86,114`, `ai-conversations.ts:73,104,285`, `ai-context.ts:48,73`, `notification-preferences.ts:32,190`, `project-integrations.ts:136`, `deployments.ts:43`, `phases.ts:29`, `client-portal/settings.ts:74`. Replace with explicit column lists.
- **`session_reports` RLS has zero policies by design** (BM5) — add a SQL comment on the migration so future auditors don't flag it. `supabase/migrations/20260416000000_create_session_reports.sql:28`.

### Performance (9)

- **`getProjectPhases` uses `select('*')`** on roadmap hot path. `app/actions/phases.ts:29`. Explicit columns.
- **`getProjectById` uses `select('*, lead, team, client)`** on project detail hot path. `app/actions/projects.ts:365-376`. Explicit column list.
- **`getScheduledTasks` has no date filter / limit** — fetches entire history of scheduled tasks. `app/actions/inbox.ts:1326-1359`. Date window + `.limit(200)`.
- **`loadQualiaFrameworkPipeline` creates 6 phases + task batches sequentially** (12 round-trips). `app/actions/phases.ts:532-585`. Bulk insert phases first then bulk insert tasks.
- **Logo deletion iterates 5 extensions sequentially** — `app/actions/logos.ts:147-151` (+ client variant ~298). Use `Promise.all` or pass array to `.remove()`.
- **`next/dynamic` used only once across codebase** — static imports on heavy dialogs (message-thread, welcome-tour, invoice-form-dialog, file-preview-modal) bloat every route by 20-50KB.
- **No `'use cache'` / `cacheTag` on any read action** despite `updateTag` being wired in 5 mutation paths. Phase 10 noted opportunity on `getProjectById`, `getProjectStats`, `getProjectPhases`. 45-min work, eliminates redundant DB hits.
- **`loadOverviewTab` fetches full `issues` rows and `activity_log` rows just to count** — `app/actions/admin-control/overview.ts:69-73,126-127`. Replace with head-only COUNT queries.
- **`loadClientsTab` fetches all projects to compute per-client stats** — O(n) client-side aggregation. `app/actions/admin-control/clients.ts:35-37`. RPC with `GROUP BY client_id`.

### UI craft (0 — folded into design system above)

---

## Low Priority (23 — digest)

**Design / hygiene (12)**
- Arial/Helvetica in AI-assistant print-document template (`ai-assistant-chat.tsx:268,276`) — print-only, low user impact.
- `rgba(0,0,0,...)` shadow literals in 6 components (tinted shadow token would be cleaner).
- Missing `htmlFor`/`id` pair on ControlClients search label (`control-clients.tsx:43-53`).
- `console.error` in 3 spots (schedule:457, admin-action-items-panel:72, message-composer:98) → `toast.error`.
- Schedule week-nav buttons `h-8 w-8` (32px) below 44px touch target (`qualia-schedule.tsx:514-527`).
- Schedule legend relies on color dots for meeting kinds (colorblind accessibility).
- ControlTeam avatar backgrounds + `text-white` can fail contrast on yellow hues (`control-team.tsx:161-162`).
- QualiaToday `openTaskIds` set rebuilt every render without `useMemo` (`qualia-today.tsx:712-715`).
- `RoadmapSideRail` team section polls 60s on near-static data — switch to `slowRefreshConfig`.
- QualiaToday fires 5 SWR hooks on mount; consider combined `getTodayDashboardData` action.
- `reorderProject` runs 2 sequential UPDATEs instead of `Promise.all` (~50ms per drag).
- `getTeamTodaySnapshot` repeats auth roundtrip already done in `getTeamStatus`.

**Backend hygiene (11)**
- `createConversation` no Zod on `title` (no length cap) — `ai-conversations.ts:121-153`.
- `createDailyCheckin` no Zod overall — `checkins.ts:61-100`.
- `deleteActivity` no UUID validation — `activities.ts:91`.
- `getActiveSession` / `getTodaysSessions` `select('*')` on `work_sessions` — polled every 60s.
- `getProjectHealthDetails` `select('*')` on two tables including JSONB payload.
- `ai_conversations` list uses `select('*')` — only needs `id, title, updated_at, created_at`.
- `ai_user_context` `select('*')` on `ai-context.ts:48,73`.
- `getTodaysCheckin` `select('*')` on `daily_checkins`.
- `shouldSendEmail` `select('*')` on single-row notification_preferences lookup — hot path.
- `skill_categories`/`skills`/`achievements` SELECT `USING(true)` — low-risk reference tables, scope to non-client roles when touched.
- `claude_sessions` feed `select('*')` in route handler — `app/api/claude/session-feed/route.ts:40`.

---

## Pattern analysis (cross-cutting)

1. **`select('*')` across 22+ call sites** is the single biggest bandwidth/forward-compat risk. When touched, always project columns. Consider an ESLint rule banning `.select('*')` outside admin debug helpers.
2. **Responsive breakpoints absent on new data-dense components** — Phases 17-22 shipped admin/portal surfaces with inline grid definitions that assume ≥768px viewport. Establish a pattern: any grid with ≥4 columns must include a stacking breakpoint or `overflow-x-auto` wrapper.
3. **`max-w-[1400px]` recurrence** across 4 surfaces suggests a paste pattern. Pull into a layout primitive (or remove entirely per DESIGN.md) before Phase 23+ uses it for the 5th time.
4. **Long-standing deferred items (BH2, BH5, BM2, BM3, BM4, PM2, PM3)** from 2026-04-17 audit are still open. None are ship blockers individually, but collectively represent accumulating debt. Bundle into a "Hardening + Column Projection" micro-phase (~2 hours) before the next milestone.

---

## Planning-code alignment

- **REQUIREMENTS.md (FR-1..FR-8, NFR-1..NFR-4)** — all surfaces exist and route-match. No orphan routes detected.
- **ROADMAP.md** claims Phases 9+ queued but `app/(portal)/tasks/page.tsx` already implements the Phase 9 unified tasks surface (see `CLAUDE.md` "Unified Tasks Page"). Update ROADMAP.md to mark Phase 9 as shipped.
- **NFR-1 (FCP < 1.5s)** — not currently measured in CI. Phase 21 captured a baseline (`.planning/phase-21-perf-baseline.md`) but no regression gate. Consider adding Lighthouse CI before handoff.
- **NFR-2 (WCAG AA)** — recent a11y work (Phase 21 Task 3: WAI-ARIA tabs, aria labels) is solid; residual gaps in findings #FH-R1..R4 and the LOW bucket.

---

## Recommended close-out

**Option A — bundle the HIGH items into a Phase 23 hardening sweep** (3-4 hours):
- FH-R1..R4 (responsive fixes, 4 components)
- FH-A1, FH-A2 (password server action + toast)
- BH-A1..A3 (project-links auth trio)
- BH-V1 (workspace_id derive)
- BH-V2 (activity_log CHECK migration)
- BH-V3 (Zod on actionType)
- BH-C1, BH-C2 (rate limits on embeddings + tts)
- PH-H1..H4 (overview parallel, select-star on financials, team-status limit, SWR barrel)

**Option B — defer and run `/qualia-optimize --fix`** to auto-apply LOW items and the safer MEDIUM items (cursor-pointer, console.error→toast, `select('*')` projections where callers are visible).

**Option C — verify the flagged RLS policies (`meeting_attendees`, `portal_settings`, etc.) against live DB first** before any migration work. Source migration text is not authoritative — the schema has been patched by at least 20 subsequent RLS migrations.

Run `/qualia-optimize --fix` to auto-apply LOW and safe-MEDIUM findings.
