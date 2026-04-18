# Roadmap — Portal v2

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

## Status
Portal v2 is **live on `portal.qualiasolutions.net`**. All planned phases shipped. Remaining work is OPTIMIZE.md medium/low backlog (not ship-blocking).
