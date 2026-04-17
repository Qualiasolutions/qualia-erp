---
phase: 8
status: shipped
date: 2026-04-17
deploy: dpl_4RTZH1Z8i99wcX5gnLgKb1xhJHdL
url: https://portal.qualiasolutions.net
commits: 4
tasks: 5 of 6 (Task 6 = deploy step, executed inline)
---

# Phase 8 — Hardening + Polish Follow-up — SUMMARY

Closes the deep-review + OPTIMIZE findings that Phase 7 deferred. Nothing was a production outage — each item was defense-in-depth, UX polish, or known debt.

## Shipped

### Task 1 — App Library server-side bypass + client data scoping (commit `02b79d3`)
- `assertAppEnabledForClient` helper in `lib/portal-utils.ts` (internal users pass unconditionally; clients checked against `portal_app_config`)
- Guards added to 7 portal pages: `messages`, `billing`, `requests`, `tasks`, `activity`, `settings/notifications`, `files` — clients hitting disabled apps via direct URL are redirected to `/`
- `/files` employee branch fix — employees now see all workspace projects instead of falling through to the client code path (previously always returned 0 files)
- `portal-dashboard-v2.tsx` gains `enabledApps?: string[]` prop — quick actions filtered by enabled apps
- `getClientVisibleTasks` — TODO documented (requires `tasks.is_client_visible` column)
- **Deviation:** `getClientInvoices` cannot scope by `project_id` — column doesn't exist on `financial_invoices`. Existing CRM-client-id approach is correct; documented inline.

### Task 2 — Impersonation mutation guard (commit `fc16956`, also absorbed Task 3)
- `assertNotImpersonating` helper in `lib/portal-utils.ts` — reads `view-as-user-id` cookie, blocks mutations when set
- Guard added to **14 mutation entry points** across 5 action files:
  - `client-requests.ts` — `createFeatureRequest`, `updateFeatureRequest`
  - `project-assignments.ts` — `assignEmployeeToProject`, `reassignEmployee`, `removeAssignment`
  - `portal-admin.ts` — `updatePortalAppConfig`, `updatePortalBranding`, `uploadPortalLogo`, `updatePortalSettings`
  - `phases.ts` — `createProjectPhase`, `deleteProjectPhase`
  - `projects.ts` — `createProject`, `updateProject`, `deleteProject`
- `view-as-banner.tsx` — bold "Read-only mode" warning
- **Deviation:** cookie name uses `view-as-user-id` (dashes) to match existing codebase convention

### Task 3 — AI agent role filter + schedule scoping + settings toggles (absorbed into `fc16956`)
- `agent-client.tsx` — employees see 4 quick actions, admin/manager see 6 (excludes Create Invoice, Billing Overview, Team Activity)
- `meetings.ts:getMeetings` — new optional `scopeToUserId`; filters to attendee, creator, or project-assigned meetings
- `schedule/page.tsx` — passes `user.id` when role is `employee`
- `settings-content.tsx` — 5 notification toggles (added `task_assigned`, `task_due_soon`)

### Task 4 — Admin sidebar + perf parallelization (commit `9a5a6c0`)
- `portal-sidebar-v2.tsx` — new collapsible `AdminNavGroup` exposing all 7 admin subpages (Team Management, Assignments, Attendance, Reports, Tasks, Migrate, Board), gated on `admin|manager`
- `shared.ts:canAccessProject` — parallelized via `Promise.all` (isAdmin + project fetch), early-return if admin
- `projects.ts:getProjects` + `getProjectStats` — both now use `getCachedUserRole` instead of raw `profiles.role` select
- `inbox.ts:_finishedCache` → `React.cache()` — removes unreliable module-level `let` (broken on Vercel serverless)

### Task 5 — Loading/error boundaries + a11y + Dependabot (commit `236097b`)
- **8 new boundary files** created:
  - `loading.tsx` — `activity`, `tasks`
  - `error.tsx` — `activity`, `tasks`, `billing`, `files`, `messages`, `workspace`
- `portal-hub.tsx` — 2 labels now have `htmlFor`/`id` (new-client dialog: Client Name, Contact Email)
- `project-detail-view.tsx` — already correctly wired in prior commit `7bdfbfd`; no changes needed
- `npm audit fix` — patched `brace-expansion` (moderate) + `next` (high DoS). Local audit now shows 0 vulnerabilities in `package-lock.json`.
- GitHub Dependabot still reports 25 repo-wide vulns (3 crit / 7 high / 13 mod / 2 low) — tracked in the Security tab; criticals are transitive and need manual review.

### Task 6 — Deploy + verify (this summary)
- Gates: tsc 0 errors · lint 0 errors (1 known warning in `portal-settings.tsx` useCallback dep) · build success
- Push: `cec5282..236097b master -> master`
- Deploy: `vercel --prod --yes` → `dpl_4RTZH1Z8i99wcX5gnLgKb1xhJHdL` READY
- Smoke:
  - `portal.qualiasolutions.net/` → HTTP 307 (redirect to `/auth/login`, expected) · 535ms
  - `/auth/login` → HTTP 200 · 785ms
  - `/api/health` → HTTP 200 · 1902ms (cold start; warms under 500ms after first hit)

## Success Criteria — Result

- [x] App Library disabled apps unreachable via direct URL for clients (7 pages guarded)
- [x] Mutations fail with clear error when admin impersonates (14 actions guarded, ≥ 5 target)
- [x] `/files` returns real files for employees (employee branch restored)
- [x] `/schedule` for employees shows only their meetings (`scopeToUserId` wired)
- [x] AI agent doesn't surface billing actions to employees (role filter in place)
- [~] `getClientInvoices` scope — deviation: table lacks `project_id`, existing CRM-client-id scope is correct
- [x] Settings has all 5 notification toggles
- [x] Admin sidebar exposes 7 admin subpages (target: ≥ 5)
- [x] `canAccessProject` parallelized with `Promise.all`
- [x] `_finishedCache` → `React.cache`
- [x] 8 loading/error boundaries added (target: 7)
- [x] Form htmlFor/id linkage — portal-hub done, project-detail-view pre-existing
- [x] Dependabot vulns in local lockfile = 0 (repo-wide: deferred to security review)
- [x] tsc/lint/build green; production deploy succeeds; smoke checks pass

## Deferred to Backlog

- Stat card component consolidation across 3 dashboards
- Admin workspace tabs → underline style refactor
- 46 hardcoded `=== 'admin'` → centralized helper
- Welcome tour hardcoded "Q" logo → client branding
- Invoice PDF download (file_url always null)
- idempotency_keys cleanup cron
- Copy polish ("Home" → "Dashboard", client-facing "Requests" naming)
- Rate limiting on `/api/tts` and `/api/embeddings`
- Middleware `/api/*` exclusion optimization
- `api_tokens` UI for Fawzi to mint per-user employee tokens
- Health endpoint env var name leak (MEDIUM-6 from auth audit)
- Onboarding flow for newly-invited clients (guided tour)
- GitHub Dependabot: 3 critical / 7 high transitive vulns need manual review

## Portal v2 — Complete

Phase 1 through Phase 8 shipped. Portal v2 is production-live on `portal.qualiasolutions.net`.
