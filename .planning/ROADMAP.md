# Roadmap — Portal v2

## Milestone: UI Remake ✅ (CLOSED 2026-04-20 — 8 phases shipped in one day)

Portal v2 core work-surface redesign + design-system foundation. All shipped and verified in production on `307c183`.

| Phase | Commit | Surface |
|---|---|---|
| 14 | `7e6a6b7` | Design System Foundation (tokens / motion / elevation) |
| 15 | `57521e0` | Portal Shell — QualiaSidebar replaces PortalSidebarV2 |
| 16.1 | `22ac5d3` | Today (admin + employee dashboards) |
| 16.2 | `61f2029` | Tasks — single-column with inline composer |
| 16.3 | `0be99ff` | Projects — editorial gallery + list toggle |
| 16.4 | `e3415a8` | Roadmap — Gantt + phase breakdown (replaces redirect stub) |
| 16.5 | `beae6d6` | Schedule — Mon–Sun week ribbon + Nicosia/Amman TZ bands |
| 16.6 | `307c183` | Perf harden (virtualization · memo · skeleton · color helpers) |

Archive: `.planning/archive/milestone-ui-remake/` (plans + verifications + CLOSE.md).

---

## Next Milestone: Remaining Surfaces 🟡 (ready to plan — `/qualia-plan 17`)

Everything the UI Remake didn't touch — admin pages, portal client pages, secondary internal pages.

- **Phase 17** — Admin (`/admin`, `/admin/assignments`, `/admin/attendance`, `/admin/reports`) + Control surface
- **Phase 18** — Client portal (`/portal/*` hub, billing, requests, settings)
- **Phase 19** — Secondary internal (`/clients`, `/team`, `/payments`, `/knowledge`, `/research`, `/seo`, `/status`, `/agent`, `/settings/*`)
- **Phase 20** — Roadmap side rail (lead/team/resources/files/notes — deferred from 16.4)
- **Phase 21** — Polish + launch (SEO meta, copy sweep, a11y pass)

---

## Prior work (historical, all shipped in earlier April sprints)

## Phase 1: Portal Shell & Foundation ✅ (shipped)
- New portal layout with Assembly-style sidebar
- Redesigned dashboard (Home) with stats, action items, projects
- Projects grid + tabbed project detail
- Modernized billing/requests/settings

## Phase 2: Client Messaging ✅ (shipped)
- Per-project message channels
- Rich text compose (markdown shortcuts)
- Internal notes (team-only)
- Supabase Realtime for live updates
- Unread counts in sidebar
- Three-panel layout (channels, thread, details)

## Phase 3: Project Boards ✅ (shipped, then REMOVED)
- Kanban/table/list views per project
- Tasks + phases + GitHub issues as board items
- Import from GitHub repos (extend webhook)
- Connected to auto-assign engine
- Removed 2026-04-18 (commit `6096de4`) — board system deleted entirely, `admin_boards` table dropped (migration `20260418110000`). Fawzi called it useless.

## Phase 4: Portal Apps ✅ (shipped 2026-04-14, `e02c3b8`)
- Client-visible task board (read-only `ProjectBoard` + standalone `/tasks`)
- Feature request comments (`request_comments` table + thread UI)
- Files with phase-based sub-grouping + inline image/PDF preview
- Standalone `/activity` feed

## Phase 5: Admin Controls ✅ (verified 2026-04-17)
- Portal Settings tab (auth policies / notification defaults / custom domain)
- Client Access tab wired to real `lastSignIn` / `isActive`
- `portal_settings` table + server actions + Zod schema + SWR hook

## Phase 6: Polish & Ship ✅ (shipped 2026-04-17)
- Responsive + dark-mode audit sweep
- A11y hardening (nav landmark, tab ARIA, aria-live, labels, memoized list rows)
- Auto-population of tasks on employee assignment DISABLED (per Fawzi)
- Clock-out modal: session report RECOMMENDED not required

## Phase 7: Pre-Ship Hardening ✅ (shipped 2026-04-17, partial — rest folded into Phase 8)
- Server-action role guards on projects/integrations/phases CRUD
- `getCrossProjectActivityFeed` IDOR closed
- `updateFeatureRequest` Zod-validated
- Route guards: `/inbox`, `/schedule`, `/agent` redirect clients
- 5 admin pages split into server wrappers with `isPortalAdminRole` SSR guards
- `custom_access_token_hook` defaults missing profiles to `'client'`

## Phase 8: Hardening + Polish Follow-up ✅ (shipped 2026-04-17, `dpl_4RTZH1Z8i99wcX5gnLgKb1xhJHdL`)
- Task 1 — App Library server-side bypass guards on 7 portal pages + dashboard quickActions filter
- Task 2 — `assertNotImpersonating` guard on 14 mutation entry points + view-as "Read-only" warning
- Task 3 — AI agent role filter + `meetings.getMeetings(scopeToUserId)` + settings notification toggles
- Task 4 — Admin sidebar exposes all 7 subpages · `canAccessProject` parallelized · `getProjects`/`getProjectStats` use `getCachedUserRole` · `_finishedCache` → `React.cache()`
- Task 5 — 8 new loading/error boundaries · portal-hub htmlFor/id · npm audit clean

## Post-Phase-8 hotfix/polish sprint ✅ (shipped 2026-04-18, six deploys)
- Board system removal (above)
- Client-view UI gating on project detail page
- Spotlight welcome tour (`portal-welcome-tour.tsx`)
- Username login for clients (migration `20260417223000`)
- Storage MIME whitelist alignment (migration `20260417221402`)
- `canModifyTask` auth bug + `React.cache` no-op fix

## Post-sprint review sweep ✅ (2026-04-18, branch `fix/review-high-items-2026-04-18`)
- H1 — onboarding profile write moved to `persistInternalOnboardingState()` server action
- H2 — default-workspace write delegated to existing `setDefaultWorkspace()` server action
- H3 — `linkTasksToPhases` N+1 UPDATE loop batched by phase_id via `.in('id', ids)`
- H4 — `initializeProjectPipeline` prerequisite-phase linking parallelized via `Promise.all`
- H5 — clock-in stale session cleanup parallelized via `Promise.all`

## Phase 9: Task System Consolidation 🟡 (ready to plan)

**Goal:** Single `/tasks` page serving clients, employees, and admins — folds `/inbox` and `/admin/tasks` into one role-aware surface.

**Why:** Three task surfaces today (`/inbox`, `/tasks`, `/admin/tasks`) are confusing, duplicate UI work, and split mental models. Aligns with Fawzi's "unified portal for all roles" vision.

**Success criteria:**
- `/inbox` redirects to `/tasks` (any role, query params preserved)
- `/admin/tasks` redirects to `/tasks?scope=all` (admin) or `/tasks` (non-admin)
- Employees on `/tasks`: own assigned tasks only, no scope toggle, no bulk actions
- Admins on `/tasks`: own tasks by default; "All" toggle reveals workspace tasks; bulk select + assign / done / delete
- Clients on `/tasks`: only `is_client_visible=true` tasks for their linked projects; read-only
- Sidebar shows exactly one "Tasks" entry — no Inbox, no admin Tasks subpage
- Bulk assign sends one notification per affected assignee
- `npx tsc --noEmit`, `npm run lint`, `npm test` clean
- No regressions in `inbox-widget` "see all" link or welcome tour selector

**Pre-scope reference:** `.planning/phases/9-tasks-consolidation/PLAN.md` (2026-04-18 draft).

---

## Phase 10: God-Module Split + Cache Components 🔵 (queued)

**Goal:** Characterize + split `app/actions/client-portal.ts` (2679 LOC); add Next.js 16 `use cache` to hot read paths.

**Why:** Biggest god-module in the codebase blocks safe refactors and inflates bundle size. Native Cache Components (not Redis) is the right caching layer on Vercel for Next.js 16 — cheaper, tag-integrated, zero new infra.

**Success criteria:**
- Characterization tests cover 8-12 most-used `client-portal.ts` exports (tests pass before + after refactor)
- `client-portal.ts` split into `app/actions/client-portal/{projects,invoices,feature-requests,action-items,activities}.ts`
- Thin `client-portal.ts` barrel re-exports everything (backcompat; zero caller changes required)
- `use cache` + `cacheTag` added to `getProjectById`, dashboard aggregates, roadmap reads
- `updateTag` called from corresponding mutations to invalidate
- `npx tsc --noEmit`, `npm run lint`, `npm test` clean; test coverage net-positive on touched modules

---

## Status
Portal v2 is **live on `portal.qualiasolutions.net`**. Phase 9 (tasks consolidation) ready to plan. Phase 10 (god-module + caching) queued. Remaining OPTIMIZE.md medium/low backlog (not ship-blocking).
