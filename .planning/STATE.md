# State — Portal v2

## Current Phase
Phase 8 — Hardening + Polish Follow-up. SHIPPED.

## Status
shipped

## Active Work
None — Portal v2 is production-live on `portal.qualiasolutions.net`. Three deploys today (2026-04-17):

**Deploy 3 (`dpl_4RTZH1Z8i99wcX5gnLgKb1xhJHdL`) — Phase 8 (5 of 6 tasks, Task 6 = deploy itself):**
- Task 1: App Library server-side bypass guards on 7 portal pages + `/files` employee branch + dashboard quickActions filter
- Task 2: `assertNotImpersonating` guard on 14 mutation entry points across 5 action files + view-as "Read-only" warning
- Task 3: AI agent role filter + `meetings.getMeetings(scopeToUserId)` + 5 settings notification toggles
- Task 4: Admin sidebar exposes all 7 subpages · `canAccessProject` parallelized · `getProjects`/`getProjectStats` use `getCachedUserRole` · `_finishedCache` → `React.cache()`
- Task 5: 8 new loading/error boundaries · portal-hub htmlFor/id · npm audit 0 vulns in lockfile
- Smoke: portal 307 · login 200 · health 200 (all green)



**Deploy 1 (`dpl_C2TyijNfQ29bxh6T7fbYXvj7znYS`) — Phases 5, 6, auto-assign removal, clock-out hotfix:**
- Portal Settings admin tab (auth policies / notification defaults / custom domain)
- Client Access tab wired to real `lastSignIn` / `isActive`
- Responsive + dark-mode audit sweep, a11y hardening (nav landmark / tab ARIA / aria-live / labels / 7 memoized list rows)
- Auto-population of tasks on employee assignment DISABLED (per Fawzi)
- Clock-out modal: session report now RECOMMENDED not required (unblocks Hasan + future users)

**Deploy 2 (`dpl_GnoyTbKpmoEnWDj4cZgqJTA66qpn`) — Phase 7 Tasks 1/2/3/7 (partial):**
- Server-action role guards on `updateProject`, `upsertIntegration`, `deleteIntegration`, phases CRUD
- `getCrossProjectActivityFeed` IDOR closed (filters projectIds against user's accessible set)
- `updateFeatureRequest` Zod-validated
- Route guards: `/inbox`, `/schedule`, `/agent` redirect clients (middleware + page-level)
- 5 admin pages (tasks, reports, attendance, migrate, agent) split into server wrappers with `isPortalAdminRole` SSR guards
- `admin/board` uses `getUser()` (no stale claims)
- `custom_access_token_hook` defaults missing profiles to `'client'` (least-privilege)
- Task 1 (RLS) verified already clean — no migration needed

## Deferred to Phase 8
Remaining deep-review findings (none are ship-blockers; no active production incidents):

- **Task 4** — Employee/client permission leaks: AI agent `quickActions` role filter; `/files` employee branch using `project_assignments`; `/schedule` meetings scoping; `getClientInvoices` scope by project_ids; `getClientVisibleTasks` internal-only filter; settings notifications missing 2 toggles (task_assigned, task_due_soon); `NewProjectModal` already gated via canCreate.
- **Task 5** — App Library server-side bypass guards on 7 pages (messages/billing/files/requests/tasks/activity/settings/notifications) so disabled apps block direct URL access for clients, not just hide the nav link.
- **Task 6** — Impersonation mutation guard — prevent write actions while admin is in view-as mode.
- **Task 7 remainder** — Admin sidebar nav links for assignments/reports/board (currently only 2 of 7 admin subpages discoverable).
- All OPTIMIZE.md medium/low findings (N+1 in admin migrations, loading.tsx/error.tsx boundaries, form htmlFor, rate limiting, 46 hardcoded role checks, etc.)

Plus: 25 Dependabot vulnerabilities on default branch (3 critical, 7 high, 13 moderate, 2 low) — npm audit needed.

---

### Completed: Phase 6 (2026-04-17)
5 tasks / 3 waves / 4 commits. Migration applied via Supabase MCP. `/admin/board` restored.

### Completed: Phase 5 verified PASS (2026-04-17)
4 tasks / 3 waves / 4 commits / 21 contracts all PASS / tsc clean / all 8 success criteria scored ≥3.

Commits:
- `177f35d` — portal_settings table migration + server actions + Zod schema
- `2de2fcf` — Client Access tab gap fix (wired to getPortalClientManagement)
- `39ce639` — SWR hook + cache key + invalidation
- `5774d76` — Portal Settings tab UI (auth / notification defaults / custom domain)

**Pending infrastructure (not a code gap):**
1. Apply migration: `npx supabase db push --linked` — writes `portal_settings` table
2. Regenerate types: `npx supabase gen types typescript --project-id vbpzaiqovffpsroxaulv > types/database.ts`
3. Browser QA blocked — Playwright MCP not connected. To enable: `claude mcp add playwright npx @playwright/mcp@latest` then re-run /qualia-verify 5.

Ready for Phase 6: Polish & Ship.

Out-of-band: framework v3.4.2-compat layer shipped to prod 2026-04-17 (commit `f907028`). Accepts per-user `qlt_*` tokens OR legacy `CLAUDE_API_KEY` (grandfathered until 2026-05-17). Polymorphic `gap_cycles`, 24h idempotency. Branch 2 (`feature/erp-v3.5-fields`) and branch 3 (`feature/erp-v3.6-cleanup`) still to go — gated on framework v3.5/v3.6 tags.

## Progress
- [x] Phase 1: Portal Shell & Foundation — DONE
- [x] Phase 2: Client Messaging — DONE
- [x] Phase 3: Project Boards — DONE (verified 2026-04-13)
- [x] Optimization sweep — ALL WAVES COMPLETE (2026-04-14)
- [x] Phase 4: Portal Apps — DONE (shipped 2026-04-14, commit `e02c3b8`)
- [x] Phase 5: Admin Controls — DONE (verified 2026-04-17)
- [x] Phase 6: Polish & Ship — DONE (shipped 2026-04-17)
- [x] Phase 7: Pre-Ship Hardening — PARTIAL (4/7 shipped 2026-04-17, remainder in Phase 8)
- [x] Phase 8: Hardening + Polish Follow-up — DONE (shipped 2026-04-17, `dpl_4RTZH1Z8i99wcX5gnLgKb1xhJHdL`)

## Phase 4 Deliverables
- **Client Task Board**: Read-only ProjectBoard for clients + standalone /tasks route with cross-project view
- **Feature Request Comments**: request_comments table + comment thread UI replacing single admin_response
- **Files Improvements**: Phase-based sub-grouping + inline image/PDF preview modal
- **Activity Feed**: Standalone /activity route with cross-project feed + enhanced dashboard activity

## Phases
1. Portal Shell & Foundation — done
2. Client Messaging — done
3. Project Boards (GitHub Projects-style) — done
4. Portal Apps (Tasks, Files, Requests, Activity) — done
5. Admin Controls — ready to plan
6. Polish & Ship — pending

## Branch
master

## Last Deploy
commit `e02c3b8` · 2026-04-14 · production healthy (Phase 4 shipped)

## Decisions
- Transform, don't delete — extend existing tables and actions
- Assembly-inspired sidebar with app-based navigation (Inbox promoted to slot 2 for internal users)
- Supabase Realtime for messaging
- Projects as the central organizing concept in portal
- GitHub Projects-style boards for task management (kanban + table + list views)
- Keep all internal ERP functionality untouched
- View-as impersonation adopts `effectiveRole`/`effectiveUserId` across layout + sidebar
- N+1 in messaging hot path collapsed via `computeUnreadCounts` bulk-fetch + JS bucketing
- Defer Upstash rate limiting until Upstash is provisioned (Fawzi decision)
- M16 barrel export migration deferred — 39 files, high risk, negligible real bundle impact
- Skip folder hierarchy for files MVP — phase-based grouping is sufficient

## Infrastructure Notes (for next session)
- Production Vercel project: deployed via `vercel --prod --yes` (scope: qualiasolutionscy)
- Production URL: `portal.qualiasolutions.net` (307 → `/auth/login`)
- Supabase ref: `vbpzaiqovffpsroxaulv`
- Supabase MCP is linked to Sakani org, NOT Qualia — use Supabase CLI with access token for migrations.
- Three Vercel teams exist: `qualiasolutionscy` (dev), `qualiaproduction` (prod), `qualia-glluztech`.
