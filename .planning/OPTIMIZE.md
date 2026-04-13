---
date: 2026-04-13 05:45
updated: 2026-04-13 10:14
mode: full
critical: 6
high: 14
medium: 17
low: 22
total: 59
status: wave_c_shipped
waves_done: [A, C]
waves_partial: [B]
waves_pending: [D]
---

# Optimization Report — Qualia ERP Portal v2

**Project:** qualia-erp | **Mode:** full | **Date:** 2026-04-13
**Scope:** Post-Phase 3 (Project Boards) optimization pass. Wave 1 frontend + backend + performance agents in parallel. Hot surfaces audited: dashboard, sidebar, inbox (just fixed), messaging (just expanded), project boards (just shipped), view-as flow (just rebuilt).

## Execution Status (2026-04-13 09:33)

### Wave A — SHIPPED in commit `8fea8bc`
All 6 CRITICAL + H1 fixed and deployed to production (`portal.qualiasolutions.net`, health check green, DB up).

| # | Status | Notes |
|---|---|---|
| C1 | ✅ LIVE | `portal-workspace-grid.tsx:153` now pushes `/?…` instead of dead `/portal?…` |
| C2 | 🟡 CODE LIVE, MIGRATION PENDING | Baseline migration `20260413000000_baseline_portal_messaging.sql` committed to `supabase/migrations/`. Live DB already has tables — migration is idempotent and documents current state. **Needs `supabase db push` to apply RLS policies as specified in source control.** |
| C3 | 🟡 CODE LIVE, MIGRATION PENDING | Baseline migration `20260413000100_baseline_task_attachments.sql` committed. Same status as C2. |
| C4 | ✅ LIVE | N+1 in `getMessageChannels` collapsed. New `computeUnreadCounts()` helper does one bulk fetch + client-side bucketing, capped at 2000 rows. |
| C5 | ✅ LIVE | Same fix applied to `getUnreadCounts`. Both hot-path hooks now single-query. |
| C6 | 🟡 CODE LIVE, INDEXES PENDING | Index definitions embedded in the baseline migrations (C2). **Apply with `supabase db push` — the N+1 collapse is already live and performant without them, indexes will make it faster still as volume grows.** |
| H1 | ✅ LIVE | `OwnerUpdatesBanner` HTML-escapes user-authored text before markdown-lite regex. Stored-XSS sink closed. |
| M4 | 🟡 MIGRATION PENDING | `20260413000200_baseline_financial_tables.sql` also committed — captures `financial_invoices` + `financial_payments` baselines with RLS. |

### Wave B — PARTIAL, shipped in commit `7d4f862`
Six of seven fixes complete and deployed. **H2 remains** — blocked on Upstash provisioning.

| # | Status | Notes |
|---|---|---|
| H2 | ❌ TODO | Upstash rate limit for `/api/chat`. Current in-memory limiter is per-instance and bypassable under concurrency. Needs `@upstash/ratelimit` + `@upstash/redis` + provisioned Upstash database (env vars `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`). **Pragmatic interim**: tighten the in-memory limits to 3/60s per user and add per-IP layer. Long-term: provision Upstash. |
| H3 | ✅ LIVE | `canModifyTask` tightened. Admin → pass; manager → workspace override; creator/assignee/lead → pass; employee requires `project_assignments` membership for that project. Previously any workspace member could edit any task. |
| H4 | ✅ LIVE | `getTaskAttachmentUrl` now queries `workspace_members` directly against the attachment's workspace, not via the session cookie's "current workspace". Removed stale `getCurrentWorkspaceId` import. |
| H5 | ✅ LIVE | `useInboxTasks().isError` now surfaced in both `InboxWidget` and `InboxView`. On fetch failure → retry card, not false "Inbox zero". |
| H6 + M11 | ✅ LIVE | `NewConversationDialog` rewritten on shadcn/Radix `<Dialog>`. Focus trap, focus restore, Escape, scroll lock, and `aria-labelledby` all handled by Radix. |
| H7 | ✅ LIVE | Inbox `TaskRow` title area is a real `<button>` that opens the edit modal. Checkbox `stopPropagation` so toggling done doesn't also open edit. Action icons (edit/hide/delete) always visible on mobile, reveal-on-hover only at `md+`. |
| H8 | ✅ LIVE | `TaskCard` only claims `role="button"` + `tabIndex={0}` when an `onClick` handler is actually passed. `KanbanBoard` uses it without a handler; before, screen readers focused an inert button. |

### Wave C — SHIPPED in commits `24139c8`, `12e9cd0`, `d29c59e`
Performance hardening complete. Shipped in 3 batches + deployed + verified on `portal.qualiasolutions.net`.

**Wave C-1** (commit `24139c8`) — layout + listUsers waterfalls
- **H9** ✅ LIVE. `layout.tsx` 5–7 sequential queries → 3 batched waits. Dropped redundant `getUserRole` (profile select already returns role). Parallelized profile + viewAs via `Promise.all`. Parallelized workspace + companyName. Client workspace now 1 JOIN instead of 2. New `lib/portal-cache.ts` with `getPortalAuthUser`/`getPortalProfile`/`getViewAsCookieId` cached via React.cache().
- **H10** ✅ LIVE. `page.tsx` routes through `portal-cache` helpers so layout + page dedupe profile/viewAs via React.cache in same request. `clients → client_contacts → profiles` chain collapsed into a single JOIN with a fallback path for clients without a primary contact yet.
- **H14** ✅ LIVE. `getPortalClientManagement` + `getPortalHubData` now share a 120s `unstable_cache` wrapper around `auth.admin.listUsers({perPage:1000})`. Both sites build their signInMap from the same cached Record. Tag-invalidatable via `portal-auth-sign-in-map`.
- **M13** ✅ LIVE. Dropped client-side `supabase.auth.getUser()` preflight in `usePortalProjectWithPhases` — RLS already enforces ownership.
- **M17** ✅ LIVE. `getCurrentWorkspaceId` wrapped in React `cache()` so 52+ parallel call sites share a single auth + workspace_members round-trip per request.

**Wave C-2** (commit `12e9cd0`) — inbox reshape
- **H11** ✅ LIVE. New `getInboxPreview(limit=5)` server action returns tiny `{id, title, status, priority, item_type, due_date, project{id,name}}` projection + two head-only COUNT queries (`totalOpen`, `overdueCount`). New `useInboxPreview` SWR hook + `invalidateInboxPreview` invalidator. `InboxWidget` switched over — estimated ~95% bandwidth savings on home dashboard loads.
- **H12** ✅ LIVE. `getTasks` now applies a default `limit` of 200 as a safety cap. Dropped nested `lead:profiles` from the default select projection (project lead still available on-demand in `getProjectTasks`).
- **M14** ✅ LIVE. `quickUpdateTask` merged the post-update SELECT into the UPDATE via `.select('workspace_id, title').single()`. Per-admin `createNotification` fan-out replaced with a single bulk INSERT built from a mapped rows array.
- **M15** ✅ LIVE. `InboxWidget.handleComplete` now uses optimistic `mutate` — drops the completed task from the SWR cache immediately, background-revalidates the preview + full inbox + daily flow caches (all non-immediate). Rollback on error. No more 300–800ms double-refetch delay.

**Wave C-3** (commit `d29c59e`) — client dashboard JOINs
- **H13** ✅ LIVE. `getClientDashboardData` collapses `client_projects → projects` chain into a single JOIN that returns `projectIds` + CRM `clientIds` in one roundtrip; duplicate head-only COUNT dropped. `getClientDashboardProjects` collapses the `client_projects → projects → project_phases` chain into a single nested JOIN (`project:projects!inner(..., phases:project_phases(...))`). Normalize/sort/dedupe in JS.

**Deferred from Wave C:**
- **M16** | `assignEmployeeToProject` 5 sequential pre-checks. Admin-only path, not a hot path, ~100–200ms cumulative. Rolled into Wave D.

### Wave D — NOT STARTED
All remaining MEDIUM + LOW findings plus H2 (Upstash). See the section tables below for the full list.
- **H2** — still blocked on Upstash provisioning decision from Fawzi. OPTIMIZE.md notes `vercel integration add upstash` as the Marketplace path for auto-provisioned `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` env vars.
- **Pending migrations** — 3 baseline files in `supabase/migrations/` still need `supabase db push` with `SUPABASE_ACCESS_TOKEN`. Idempotent, safe to apply.

## How to Pick Up (for the next Claude session)

**Starting point:**
1. Read this file (`.planning/OPTIMIZE.md`) top-to-bottom — you're looking at it.
2. Read `.planning/STATE.md` for project phase context.
3. Verify the live state: `curl -s https://portal.qualiasolutions.net/api/health` should return `version: 7d4f862` or later.
4. Wave A + partial Wave B are already live. Do not re-apply those fixes.

**Before anything else — apply the pending migrations:**
The baseline migrations in `supabase/migrations/20260413000000_*.sql` and the index migrations embedded within them need to be applied to the production Supabase project. The CLI path requires `SUPABASE_ACCESS_TOKEN`:
```bash
SUPABASE_ACCESS_TOKEN=xxxxx npx supabase link --project-ref vbpzaiqovffpsroxaulv
SUPABASE_ACCESS_TOKEN=xxxxx npx supabase db push
```
All three migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`). Running them on the live DB is safe — they'll only add missing indexes and reconcile RLS policies to the source-controlled versions.

**Wave ordering for next session:**
1. H2 (Upstash) — needs Upstash provisioning decision from Fawzi first. If no Upstash, do the pragmatic interim (tighten in-memory limits + per-IP layer) and document the long-term migration.
2. Wave C — H9 → H10 → H14 (easy wins, cache + request-scope) → H11 → H12 → H13 (bigger refactors) → M13..M17.
3. Wave D — MEDIUM findings (design consistency, a11y), then LOW findings in order.

**Process for each wave:**
1. Start the wave: `TaskUpdate` task in-progress.
2. Implement the fixes, commit + deploy per wave (not per finding).
3. Run: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `vercel --prod --yes`.
4. Post-deploy verify: `curl /api/health` for version + DB state.
5. Update this file's status block for the completed wave.
6. `TaskUpdate` task completed.

**Infrastructure notes (important):**
- Production Vercel project is `qualiaproduction/qualia-erp`, NOT `qualiasolutionscy/qualia-erp`. The dev team project exists but has no env vars.
- The `.vercel/project.json` in this repo was re-linked to the production project during the Wave A deploy. Commands like `vercel env pull` work against the right project now.
- Production URL: `portal.qualiasolutions.net` (307 → `/auth/login`)
- Supabase project ref: `vbpzaiqovffpsroxaulv`
- Supabase MCP is linked to a different org (Sakani), not Qualia — don't try to apply migrations via `mcp__supabase__*`, it'll fail with "project not found". Use the Supabase CLI with access token.

**Things NOT to re-do:**
- Do not re-apply the C1 route fix, C4/C5 N+1 collapse, H1 XSS escape, H3–H8 Wave B items. They're live.
- Do not re-write the baseline migrations — they're in `supabase/migrations/20260413000000_*.sql`.
- Do not change `components/portal/portal-sidebar-v2.tsx` layout — the Inbox slot-2 promotion and the `effectiveRole`-driven filter are intentional (user ask).
- Do not re-introduce motion.div wrappers inside the inbox virtualizer — there's a regression trap there (see M9).

## Summary

6 CRITICAL issues, concentrated in three areas: a **broken admin workspace entry point** (`router.push('/portal?...')` hits a route that no longer exists after commit `ff580b5`), **six tables whose CREATE TABLE + RLS live only in the live database** (portal_messages, portal_message_channels, portal_message_read_status, task_attachments, financial_invoices, financial_payments — meaning a fresh environment from `supabase db reset` is broken and RLS posture is unauditable from source control), and **two N+1 storms in the messaging hot path** (`getMessageChannels` + `getUnreadCounts` each fire one COUNT per channel on a 30–60s poll). All are landmines on the growth path, not cosmetic issues.

High-priority tier adds: a silent XSS sink in the owner-updates banner, an in-memory rate limiter that no-ops on Vercel (the chat endpoint is an open-cost DoS vector), `canModifyTask` that grants every workspace member write access to every task, several unwired UX affordances (TaskRow click, TaskCard phantom button, NewConversationDialog focus trap), and sequential query waterfalls in the portal layout + page that add 100–500ms to every navigation.

No critical issues are in the code shipped this session. The session's own fixes (inbox virtualizer, view-as filtering, new conversation dialog, inbox widget, sidebar reorder) passed all three agents clean. The critical issues are pre-existing debt surfaced by a full audit.

## Critical Issues (fix before ship)

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| C1 | Frontend / Routing | Admin workspace grid pushes to `router.push(\`/portal?${params}\`)`, but the `/portal/*` route was deleted in commit ff580b5. Admin click on a client tile = 404. Primary admin → impersonate flow is broken. | `components/portal/portal-workspace-grid.tsx:153` | Change to `router.push(\`/?${params.toString()}\`)`. `app/(portal)/page.tsx:11` already reads `searchParams.workspace`. |
| C2 | Backend / RLS | `portal_messages`, `portal_message_channels`, `portal_message_read_status` have **zero** `CREATE TABLE` statements in `supabase/migrations/`. The perf-init-plan migration (20260412120000) defines SELECT/UPDATE policies but no INSERT policies and no schema baseline. | `supabase/migrations/20260412120000_perf_portal_auth_rls_initplan.sql:59-132` | Run `supabase db pull --schema public` → commit baseline migration → add INSERT policies (clients for own projects with `is_internal=false`, internal staff anywhere). Add CI check that fails when code references a table with no `CREATE TABLE` in migrations. |
| C3 | Backend / RLS | `task_attachments` has **zero** references in `supabase/migrations/`, yet `app/actions/task-attachments.ts` reads, writes, and deletes from it and trusts RLS. No application-level ownership check in `getTaskAttachments`. | `app/actions/task-attachments.ts:97` | `supabase db pull` to capture live schema + commit baseline. Add explicit `canAccessTask(user.id, taskId)` at top of `getTaskAttachments` — defense in depth, don't trust RLS alone. |
| C4 | Performance | N+1 in `getMessageChannels` — one COUNT query per channel for unread badge. 20 channels × ~20ms = +400ms per dashboard load. SWR polls every 30s visible + on focus. `useMessageChannels` fires this on every sidebar render. | `app/actions/portal-messages.ts:195-232` | Replace per-channel loop with one grouped query: `SELECT channel_id, count(*) FROM portal_messages WHERE channel_id = ANY($1) AND created_at > cutoff GROUP BY channel_id`. Or expose a Postgres RPC. |
| C5 | Performance | Identical N+1 in `getUnreadCounts` — runs **in addition to C4** because `useUnreadMessageCount` and `useMessageChannels` mount simultaneously. Two parallel N+1 storms per minute per active portal. | `app/actions/portal-messages.ts:717-740` | Collapse into one grouped query OR eliminate `getUnreadCounts` entirely — consumer can derive total from the cached `useMessageChannels` data (already returns `unreadCount` per channel). |
| C6 | Performance / Indexes | Zero committed indexes on `portal_messages` or `portal_message_channels`. The N+1 COUNTs filter `channel_id = ? AND created_at > ?` but do a heap scan per call. After C4/C5 collapse, the aggregation still needs these indexes. | `supabase/migrations/` (no matching index migration) | New migration: `CREATE INDEX idx_portal_messages_channel_created ON portal_messages(channel_id, created_at DESC); CREATE INDEX idx_portal_message_channels_project ON portal_message_channels(project_id); CREATE INDEX idx_portal_message_read_status_user_channel ON portal_message_read_status(user_id, channel_id);` |

## High Priority

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| H1 | Backend / XSS | `OwnerUpdatesBanner` passes user-authored text through regex transforms then `dangerouslySetInnerHTML` without HTML-escaping first. Stored XSS by any owner-update author. | `components/today-dashboard/owner-updates-banner.tsx:61-78` | Escape `&<>"'` before applying the markdown-lite regex, OR swap for DOMPurify with allowlist `<code><strong><br>`. |
| H2 | Backend / DoS | `lib/rate-limit.ts` stores counters in a module-level `Map`. Vercel Functions spawn fresh instances per concurrent invocation, so counters don't aggregate. The chat endpoint (most expensive call in the system) is effectively uncapped. | `lib/rate-limit.ts:1-98`, `app/api/chat/route.ts:43` | Move to `@upstash/ratelimit` keyed by user id. Until then, add Vercel BotID or strict per-IP platform limits. |
| H3 | Backend / Authorization | `canModifyTask` returns true for any workspace member. Any employee can edit/reassign/delete tasks on unrelated projects. | `app/actions/shared.ts:162` | Tighten to `creator_id = auth.uid() OR assignee_id = auth.uid() OR EXISTS(project_assignments WHERE project_id = task.project_id AND profile_id = auth.uid()) OR isUserAdmin(auth.uid())`. |
| H4 | Backend / Auth | `getTaskAttachmentUrl` compares `attachment.workspace_id` against `getCurrentWorkspaceId()` (user's "current" workspace), not against their actual membership. Users in multiple workspaces get inconsistent auth. | `app/actions/task-attachments.ts:281` | Query `workspace_members` directly for `workspace_id = attachment.workspace_id AND profile_id = auth.uid()`. Don't route auth through a session cookie. |
| H5 | Frontend / Data safety | `useInboxTasks().isError` is never surfaced. Fetch errors render as "Inbox zero" — users see empty state on an outage. | `components/portal/inbox-widget.tsx:54`, `app/(portal)/inbox/inbox-view.tsx:268` | Destructure `isError` + render error block with retry calling `revalidate()`. Pattern already used in `components/project-board/project-board.tsx:134`. |
| H6 | Frontend / A11y | `NewConversationDialog` is a hand-rolled `<div role="dialog">` — no focus trap, no focus restore, no `aria-labelledby` link to heading, no scroll lock. Keyboard users get stranded outside the dialog mid-flow. | `components/portal/messaging/new-conversation-dialog.tsx:99-205` | Replace with Radix `<Dialog>` from `components/ui/dialog.tsx` — gives focus trap, focus restore, scroll lock, `aria-labelledby` for free. `view-as-dialog.tsx` already follows this pattern. |
| H7 | Frontend / UX | Inbox `TaskRow` is a plain `<div>` with no click handler. Mouse users instinctively click the title expecting edit — nothing happens. Action icons are `opacity-0 ... group-hover:opacity-100`, so touch users literally cannot see edit/delete/hide. | `app/(portal)/inbox/inbox-view.tsx:137-258` | Either wire the row `onClick` to `onEdit(task)` (expected behavior) OR always show actions on viewports `< md` (drop `sm:opacity-0`). The `onEdit` handler is already wired. |
| H8 | Frontend / A11y | `TaskCard` in project board declares `onClick` prop and always renders `cursor-pointer` + `role="button"` + `tabIndex={0}`, but `KanbanBoard` never passes a handler. Screen readers focus an inert button; keyboard users hit Enter, nothing happens. | `components/project-board/task-card.tsx:34-54` rendered by `components/project-board/kanban-board.tsx:96` | Either wire `onClick` to open `EditTaskModal`, or drop `role="button"`, `tabIndex`, `cursor-pointer` when `onClick` is undefined. |
| H9 | Performance | `app/(portal)/layout.tsx` fires 5–7 sequential DB queries before any HTML streams (auth → role → profile → viewAs profile → workspace → apps → branding). Internal path: ~3 RTTs, client path: ~5. +100–400ms to TTFB on every portal navigation. | `app/(portal)/layout.tsx:19-162` | Collapse into 2 `Promise.all` batches. Even better: move `role` into the JWT custom_access_token_hook (migration `20260327000000_custom_claims_hook.sql` already exists) and drop the separate `getUserRole` call entirely. |
| H10 | Performance | Admin impersonation page `app/(portal)/page.tsx` adds 5 more sequential queries on top of the layout waterfall — profile → viewAs profile → clients → client_contacts → profiles. Net 8–12 sequential queries before the admin sees HTML. | `app/(portal)/page.tsx:28-115` | Single SQL query/RPC that accepts `client_id` and returns `{client_name, portal_user_id, contact_email}` via JOINs. Share profile resolution with the layout via a `cache()` helper. |
| H11 | Performance | `InboxWidget` fetches the full inbox (no limit, 4-table join) just to display 5 tasks. For a power user with 200 tasks, every dashboard mount + invalidation fetches 200 rows × 4 joined profiles to slice to 5. Runs on BOTH employee and admin dashboards. | `components/portal/inbox-widget.tsx:53-86`, `app/actions/inbox.ts:93-192` | New `getInboxPreview(limit = 5)` server action that does the sort + limit in SQL and selects only `id, title, status, priority, due_date, project(id, name)`. Dedicated SWR key. ~95% DB/bandwidth savings. |
| H12 | Performance | `getTasks` has no default limit and returns a 4-table-deep join (`creator`, `assignee`, `project` with nested `lead`). Inbox page fetches all workspace inbox tasks × 4 joined records on every poll. | `app/actions/inbox.ts:93-192` | Require explicit `limit` (50 for inbox view). Drop nested `lead:profiles` from default select — fetch on-demand on project detail only. |
| H13 | Performance | `getClientDashboardData` and `getClientDashboardProjects` use sequential fetch-then-fetch chains (4 layers for unpaid invoice path; 3 layers for projects → phases). Backs `usePortalDashboard` which polls on every portal home load. | `app/actions/client-portal.ts:910-997, 1002-1087` | Single SQL JOIN or Postgres RPC across `client_projects → projects → project_phases → financial_invoices`. Estimated ~80–150ms saved per load. |
| H14 | Performance | `getPortalHubData` and `getPortalClientManagement` call `supabase.auth.admin.listUsers({perPage: 1000})` on every dashboard load. GoTrue admin endpoint is ~200–500ms and rate-limited. No cache. | `app/actions/client-portal.ts:2342-2509, 1836-1940` | Wrap in `unstable_cache` with 60–300s revalidate, OR maintain a `profiles` mirror via trigger and replace with indexed table query. |

## Medium Priority

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| M1 | Backend / Data integrity | `getOrCreateChannel` does SELECT-then-INSERT with no unique constraint. Two concurrent "start conversation" clicks create duplicate channels, splitting history. | `app/actions/portal-messages.ts` (getOrCreateChannel helper) | Add `UNIQUE (project_id)` on `portal_message_channels`, switch to `.upsert(..., { onConflict: 'project_id' })`. |
| M2 | Backend / Duplication | `getUserRole` exists in both `app/actions/shared.ts` (cached) and `lib/portal-utils.ts` (uncached). Security fixes land in one, not the other. | `app/actions/shared.ts`, `lib/portal-utils.ts` | Pick one, codemod imports, add ESLint rule to ban the dead path. |
| M3 | Backend / Defense in depth | `getTaskAttachments` authenticates but does zero authorization beyond `auth.getUser()`, relying entirely on RLS. Combined with C3 (missing migration), a future permissive policy silently exposes every workspace's attachments. | `app/actions/task-attachments.ts:97` | `await canAccessTask(user.id, taskId)` at function top. |
| M4 | Backend / Migration hygiene | Six tables exist only in production, not in `supabase/migrations/` (C2 + C3 + `financial_invoices`, `financial_payments`). Fresh `supabase db reset` cannot reproduce production. | `supabase/migrations/` | `supabase db pull --schema public` → commit baseline. CI check for "table referenced but not CREATED". |
| M5 | Frontend / Design | Inbox header icon uses `bg-gradient-to-br from-amber-500/20 to-orange-600/20` — the only gradient surface in the portal. DESIGN.md is flat tints only. | `app/(portal)/inbox/inbox-view.tsx:482` | `bg-amber-500/10 ring-1 ring-amber-500/20`. Matches rest of file. |
| M6 | Frontend / Design | Hardcoded `text-red-500/600`, `text-amber-500/600`, `text-violet-500` scattered across 7+ files. `text-destructive`, `text-warning`, `text-accent` tokens are bypassed. Client white-labelling (branding already loaded) can't affect status colors. | `inbox-view.tsx:190,497`, `inbox-widget.tsx:118-119`, `message-bubble.tsx:42`, `view-as-dialog.tsx:34-46`, `portal-action-items.tsx:54-58` | Centralize in `lib/color-constants.ts` as `OVERDUE_COLORS`, `INTERNAL_NOTE_COLORS`. Prefer `text-destructive` / `bg-destructive/10` for errors. |
| M7 | Frontend / Design | Inbox page title uses `text-base sm:text-lg`. DESIGN.md says page titles use `text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)]` (used in `admin-dashboard-content.tsx:103`). Inbox H1 looks like a card title next to Dashboard's real H1. | `app/(portal)/inbox/inbox-view.tsx:486` | Match the fluid clamp pattern used on other top-level pages. |
| M8 | Frontend / A11y | Quick-add task input + search input use placeholder-only labels. WCAG failure (placeholder vanishes on type, screen readers may not announce). | `app/(portal)/inbox/inbox-view.tsx:531, 572-583` | Add `aria-label="Search tasks"` and `aria-label="Add new task"`. |
| M9 | Frontend / A11y | Inbox virtualizer inline `transform: translateY(...)` has no comment explaining the just-fixed motion-library regression. Future contributor will wrap `TaskRow` in `<m.div>` and break it again. | `app/(portal)/inbox/inbox-view.tsx:629-660` | Add code comment: "Do not wrap TaskRow in motion.div — transform-on-transform conflicts with @tanstack/react-virtual". Consider switching to `top: ${start}px`. |
| M10 | Frontend / A11y | Project board `DndContext` has no `KeyboardSensor`, no `accessibility.announcements`, no screen reader instructions. Keyboard-only/screen-reader users literally cannot use drag-and-drop — they can focus a card (because of H8's `tabIndex=0`) but can't move it. | `components/project-board/kanban-board.tsx:180-185` | Add `KeyboardSensor` to `useSensors` and pass `accessibility={{ announcements: {...}, screenReaderInstructions: {...} }}`. |
| M11 | Frontend / A11y | `NewConversationDialog` race: `autoFocus` fires but parent doesn't restore focus to the trigger button on close (Body ends up as focus target). | `components/portal/messaging/new-conversation-dialog.tsx:139` | Same fix as H6 — Radix Dialog handles focus restore automatically. |
| M12 | Performance | `useMessageChannels`, `useChannelMessages`, `useUnreadMessageCount` set `revalidateOnFocus: true`. Every other SWR hook is `false` (default). Combined with C4/C5 N+1, every alt-tab triggers a fresh storm. | `lib/swr.ts:1821, 1858, 1891` | Set `revalidateOnFocus: false` on all three. Polling + Realtime already keep data fresh. |
| M13 | Performance | `usePortalProjectWithPhases` does `supabase.auth.getUser()` from the browser inside the SWR fetcher before the data query. ~30–80ms added to every poll with no security benefit (RLS already guards). | `lib/swr.ts:1222-1226` | Drop client-side auth check; rely on RLS. If you need user id, derive server-side or pass from parent. |
| M14 | Performance | `quickUpdateTask` fires an extra SELECT to get `workspace_id + title` after the UPDATE, then fans out N notification INSERTs sequentially. Runs on every inbox completion click (hot path). | `app/actions/inbox.ts:702-812` | `.update(...).select('workspace_id, title').single()` to merge. Replace notification loop with one `INSERT INTO notifications SELECT ... FROM profiles WHERE workspace_id = ? AND role = 'admin'`. |
| M15 | Performance | `InboxWidget.handleComplete` invalidates two SWR caches with `immediate: true` — triggers two sequential refetches per click. Users see 300–800ms feedback delay on a single checkbox. | `components/portal/inbox-widget.tsx:97-98` | Use `mutate(key, optimisticData, { revalidate: false })` to remove completed task from cache immediately, then background-revalidate once. |
| M16 | Performance | `assignEmployeeToProject` does 5 sequential pre-checks (project → employee → membership → dup check → INSERT). ~100–200ms cumulative. | `app/actions/project-assignments.ts:21-175` | Parallelize pre-checks via `Promise.all`, OR push validation into a single SQL function with `RAISE EXCEPTION`. |
| M17 | Performance | `getCurrentWorkspaceId()` is called 52 times across 16 action files, each with its own `auth.getUser()` + `workspace_members` lookup. Three parallel actions from one page pay the cost 3×. Sometimes it's sequential before a `Promise.all`, gating the whole batch. | `app/actions/daily-flow.ts:2`, `inbox.ts:6`, `client-portal.ts:5`, `projects.ts:6`, +12 others | Wrap in React `cache()` for request-scoped memoization. Better: move workspace_id into JWT custom claims (hook already wired). |

## Low Priority

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| L1 | Backend | View-as cookie 1-hour maxAge not refreshed on use. Admins lose impersonation every 60 min. | `app/actions/view-as.ts` | Re-set the cookie on each authenticated portal render for sliding expiration. |
| L2 | Backend | `TOKEN_ENCRYPTION_KEY || SUPABASE_SERVICE_ROLE_KEY` fallback couples AES key lifecycle to Supabase credential rotation. | `app/actions/integrations.ts:10` | Make `TOKEN_ENCRYPTION_KEY` mandatory, throw at module load if missing. |
| L3 | Backend | Vercel webhook fuzzy matching strips `%_` but not other special chars. Not exploitable (HMAC verified), but fragile. | `app/api/webhooks/vercel/route.ts:107` | Exact match on a normalized slug column instead of `ilike` fuzzy. |
| L4 | Frontend | Desktop `<aside>` sidebar has no `aria-label`. Screen readers announce just "complementary". | `components/portal/portal-sidebar-v2.tsx:437` | `aria-label="Sidebar"`, or convert to `<div>` since inner `<nav>` is the landmark. |
| L5 | Frontend | `EditTaskModal` conditional mount `{editingTask && ...}` fights Radix Dialog's internal state. Subtle focus-jump on first open. | `app/(portal)/inbox/inbox-view.tsx:666-672` | Always mount, let modal handle `null` task internally. |
| L6 | Frontend | Badges use `text-[10px]` — below 11px readability minimum. | `inbox-widget.tsx:113,118,196,210`, `employee-dashboard-content.tsx:200,206`, `portal-dashboard-v2.tsx:189,201,217`, `portal-action-items.tsx:130,140` | Bump to `text-[11px]` min across all badges. |
| L7 | Frontend | `'use client'` files contain pure static JSX components (`EmptyThreadPlaceholder`, `MessagesSkeleton`) that ship to client unnecessarily. | `messages-content.tsx:191-201`, `message-thread.tsx:184-210` | Extract pure skeletons to a non-client module when reused. |
| L8 | Frontend | `messages-content.tsx` has `void userName; void selectedChannelId;` — dead state machinery and unused prop. | `app/(portal)/messages/messages-content.tsx:34` | Delete `selectedChannelId` state + setters. Remove `userName` from props + page.tsx call site. |
| L9 | Frontend | `components/portal/portal-hub.tsx` is 1203 lines. Recent workspace switcher may have superseded it. | `components/portal/portal-hub.tsx` | Grep usages; if unused delete; if used split into `portal-hub-{credentials,users,reset}.tsx`. |
| L10 | Frontend | `app/(portal)/inbox/inbox-view.tsx` is 685 lines — page shell + TaskRow + filters + virtualizer + keyboard shortcuts + reducer + modal coord all mixed. | `app/(portal)/inbox/inbox-view.tsx` | Extract `TaskRow`, `tasksReducer`, and date helpers (duplicated in `inbox-widget.tsx`) to separate files. |
| L11 | Frontend | `isOverdue`, `isDueToday`, `getInitials`, `getGreeting` duplicated across 4+ files with drift (status-aware vs status-agnostic). | `inbox-view.tsx:77-86`, `inbox-widget.tsx:27-36`, `task-card.tsx:22-26`, `list-view.tsx:30-34`, `table-view.tsx:43-47`, 3× dashboards | Extract to `lib/date-utils.ts` + `lib/string-utils.ts`. Single source. |
| L12 | Frontend | `TaskCard` etc. use Radix `AvatarImage` which wraps `<img>` — no `next/image` optimization for Supabase-hosted avatars. | `task-card.tsx:88`, `list-view.tsx:194`, `table-view.tsx:211` | Acceptable for tiny avatars; flag only if they grow above-the-fold. |
| L13 | Frontend | View-as banner hardcodes amber; ignores `branding.accent_color` even though layout loads it. | `components/portal/view-as-banner.tsx:30-41` | Acceptable for now (admin-only state); address in white-label phase. |
| L14 | Frontend | `EmployeeDashboardContent` calls `formatDate()` + `getGreeting()` inline in every render. Hydration-mismatch trap if anyone drops `'use client'`. | `employee-dashboard-content.tsx:63-75`, also `admin-dashboard-content.tsx:14-28` | `useMemo` them or pass from server as props. |
| L15 | Frontend | `useUnreadMessageCount(userId ?? null)` in sidebar — verify the hook short-circuits on null, otherwise every role switch triggers a wasted subscription. | `components/portal/portal-sidebar-v2.tsx:281` | Confirm short-circuit in hook body; gate the call if not. |
| L16 | Frontend | `handleSelectChannel` races: `setSelectedProjectId` runs before `await markChannelRead`, and no toast on failure. Rapid-click can mark wrong channel. | `app/(portal)/messages/messages-content.tsx:58-73` | Surface errors via `toast.error` + use a ref-based "current selection" guard. |
| L17 | Performance | `useMessageChannels` cache key is `messageChannels(userId)` but fetcher does its own server `auth.getUser()` round trip on every revalidation. | `lib/swr.ts:1803-1834`, `portal-messages.ts:127-129` | After C4/C5 collapse, add `last_message_at` cursor — short-circuit server response when nothing newer. |
| L18 | Performance | `getMessagingProjects` re-fetches on every `NewConversationDialog` open (no client-side cache). | `components/portal/messaging/new-conversation-dialog.tsx:33-54` | Wrap in a `useMessagingProjects` SWR hook; dialog opens instantly on subsequent clicks. |
| L19 | Performance | `getDeploymentStats` fetches all deploys to count in JS. | `app/actions/deployments.ts:95-129` | SQL `GROUP BY status, environment`. |
| L20 | Performance | Zero Sentry spans on messaging server actions — slow/failing queries invisible. | `app/actions/portal-messages.ts:170-172, 235-241, 308-310, 689-691, 743-748` | Wrap each action in `Sentry.startSpan()` + add >500ms slow-query logging. |
| L21 | Performance | `loadQualiaFrameworkPipeline` does 12+ sequential INSERTs in a for-loop. One-time admin action, not hot but blocking. | `app/actions/phases.ts:399-499` | Two bulk INSERTs (phases then phase_items referencing returned IDs). |
| L22 | Frontend | Sidebar lacks visible focus indicator on collapsed state. | `components/portal/portal-sidebar-v2.tsx` (general) | Audit after critical fixes. |

## Recommended Fix Order

### Wave A — before any production push (blocks ship)
1. **C1** — one-line route fix. ~30 seconds.
2. **C2 + C3 + M4** — `supabase db pull` → commit baseline migration covering all 6 orphan tables. ~30 minutes.
3. **C4 + C5 + C6** — new migration with indexes + single grouped unread-count query. ~2 hours.
4. **H1** — owner-updates XSS escape. ~15 minutes.

### Wave B — this week
5. **H2** — swap in `@upstash/ratelimit` for chat endpoint.
6. **H3** — tighten `canModifyTask`.
7. **H4** — fix attachment workspace auth.
8. **H5** — surface inbox errors.
9. **H6 + M11** — replace NewConversationDialog with Radix Dialog.
10. **H7 + H8** — wire up row/card clicks (inbox + boards).

### Wave C — next sprint (performance hardening)
11. **H9 + H10** — collapse portal layout + admin page waterfalls. Move role to JWT claims.
12. **H11 + H12** — `getInboxPreview` + require `getTasks` limit.
13. **H13 + H14** — client-portal SQL joins + `listUsers` caching.
14. **M13 + M14 + M15 + M17** — SWR + quick-complete + request-scoped workspace cache.

### Wave D — polish & craft (anytime)
15. All MEDIUM frontend findings (design consistency, a11y).
16. All LOW findings in priority order.

## Fix Phase Proposal

If you want this as a formal Qualia phase rather than ad-hoc fixes, I can insert **Phase 3.5: Critical Debt Sweep** into `ROADMAP.md` covering C1–C6 + H1–H4 (the ship-blockers). That's 10 tightly-scoped items and would delay Phase 4 by one planning session. Otherwise, Wave A can be knocked out today in a quick session.

## What Was Not Investigated

- **Edge functions** — `supabase/functions/` wasn't audited (may or may not exist; not checked).
- **AI chat auth** — `app/api/chat/route.ts` has rate limiting (broken) but deeper auth + output-guard review skipped.
- **Wave 2 architecture synthesis** — skipped because Wave 1 findings already cross-referenced patterns organically (duplicated helpers, migration gaps, auth duplication). Not worth additional tokens.
- **SEO / sitemap** — out of scope for a portal behind auth.
- **Accessibility automation** — no axe/lighthouse run; findings are from static code review only.
- **Load testing** — no synthetic traffic against the N+1 hot paths to confirm the p95 estimates.

---

**Report generated by:** `/qualia-optimize` full mode. Three parallel Wave 1 agents (frontend, backend, performance). Sidebar + dashboard integration changes were verified clean before the pass.
