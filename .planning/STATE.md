# State — Portal v2

## Current Phase
Post-Phase-8 hotfix/polish sprint (2026-04-18). SHIPPED.

## Status
shipped

## Active Work
**Another agent is currently working on** (do not touch these files/areas):
- Hasan's clock-out → session report log-out issue
- `npm audit` error fixing / dependency hardening

## Handoff — sprint of 2026-04-18

Nine deploys landed since last STATE.md update. All on prod `portal.qualiasolutions.net`.

### Security + correctness fixes
- `0bd7a9d` **canModifyTask auth bug + React.cache() no-op** — `project_assignments` column was `profile_id` (wrong) now `employee_id` + `removed_at IS NULL`; `getFinishedProjectIds` dropped its `supabase` arg so `React.cache()` actually dedupes per request (was keyed on a fresh client instance every call).
- `4c960d7` **storage MIME whitelist mismatch** — `text/html` was in the code whitelist but NOT in the `project-files` bucket's `allowed_mime_types` → 400 on HTML upload. Aligned both + added `image/heic`/`heif`, `image/svg+xml`, `image/avif`, `application/octet-stream`, `video/webm`, `audio/ogg`. Migration `20260417221402`.
- `a0dbb04` **client-view scoping** — project detail page hides admin-only UI from clients: Settings gear, Integration header links, Assigned Team panel, Notes panel. Resources panel kept (team shares client-visible links there). Widened `userRole` prop union from `'admin' | 'employee'` to include `'manager' | 'client'`. Also deleted bad `client_projects` row giving `underdogsales` access to Boss Brainz (Alecci Media project).
- `6096de4` **board system removed** — deleted `components/project-board/` (8 files), `app/(portal)/admin/board/`, `app/actions/admin-boards.ts`, Board tab from `project-workflow.tsx` and `portal-project-tabs.tsx`, `/admin/board` links from both sidebars, `admin_boards` table (migration `20260418110000`). Unused icons cleaned (LayoutGrid, LayoutDashboard, Palette).

### Feature work
- `ddff86e` **username login for clients** — migration `20260417223000` adds `profiles.username TEXT` with partial unique LOWER index, backfilled client usernames from email local-part. `loginAction` resolves username → email server-side via `createAdminClient`. Login form label becomes "Username or email" for Portal variant; `type="text"` + `autoComplete="username"`; staff still use email. **All 16 client passwords reset to `qualia`** via pgcrypto (runtime data, not committed).
- `8eae63f` **spotlight welcome tour** — full rewrite of `portal-welcome-tour.tsx`. SVG mask cutout overlay, tooltip card with auto-flip, staggered entry (30ms), 320ms ease-out-expo step transitions, 6 steps (projects/tasks/files/messages/requests/settings), filtered by `enabledApps`, keyboard nav (Esc/Arrow/Enter), focus trap, mobile bottom-sheet, respects `prefers-reduced-motion`, localStorage version bumped to `qualia-portal-tour-v3`. Sidebar links + dashboard projects grid gained `data-tour=…` anchors.
- **Name display fix** (landed inside `8eae63f`) — `companyName` for clients now comes from `profiles.full_name` (curated) instead of `portal_project_mappings.erp_company_name` (stale CRM names like "Alecci Media" for Underdog Sales, "Mr. Morees Abawi" for Vero Models).

### Client data curation (runtime, not in code)
- **Deleted 6 clients** (rasmus, froutaria, urbans, woodlocation, mypearl, luxcars) — cascade through `auth.users → profiles → client_projects`.
- **Renamed** 5 clients: giannis→`giannisuk`, anglobal→`aandnglobal`, gsc→`underdogsales` (+ full_name "Underdog Sales"), morees→`veromodels` (+ full_name "Vero Models"), marco→`marcopellizzeri` (+ full_name "Marco Pellizzeri").
- 16 clients remain. All passwords = `qualia`. All usernames one-word lowercase.

### Test suite
- `f91957b` · `9765c5b` — Phase 8 broke 75 test failures (parallelization + disabled auto-assign + removed revalidatePath). Fixed all 621/621 tests across 27 suites. Added `__tests__/lib/portal-utils.test.ts` covering `assertAppEnabledForClient` + `assertNotImpersonating` + `isPortalAdminRole` (21 cases).

## Known gaps / follow-ups
- **Manager role on project workflow**: `ProjectWorkflow` gates admin UI by `isAdmin={userRole === 'admin'}`; managers don't get edit/delete phases. Intentional or should be widened? (Fawzi flagged, deferred.)
- **Remaining Phase 8 OPTIMIZE.md low/medium findings** still deferred (see `.planning/OPTIMIZE.md` backlog section).
- **GitHub Dependabot** — 24 transitive vulns repo-wide (3 critical / 6 high). The other agent is working on this.

## Full deploy chain (2026-04-18)
```
dpl_o4k156slh  → board removal
dpl_lbiu8ufca  → client-view gating + bad link cleanup
dpl_lhrwpadlb  → spotlight tour + name fix
dpl_94yznhuk5  → username login + password reset
dpl_o4y9mw836  → storage MIME alignment
dpl_82pxgvluw  → canModifyTask + React.cache fixes
```

---

## Previous: 2026-04-17 — Three deploys:

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
master (+ feature branch `fix/review-high-items-2026-04-18` for post-sprint review sweep)

## Last Deploy
commit `0717b9b` · 2026-04-18 · production healthy (post-Phase-8 hotfix sprint — six deploys: board removal, client-view gating, welcome tour, username login, MIME alignment, auth fixes)

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
