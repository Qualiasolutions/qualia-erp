# Qualia ERP Readiness Audit — 2026-04-24

## Verdict

**Not ready for a blanket production-readiness claim. The first repair pass removed concrete blockers; a second pass against live Supabase confirms H1 and surfaces new RLS gaps that must be closed before a readiness claim.**

The codebase is not a mess: TypeScript, lint, unit tests, and coverage thresholds pass. But those gates mostly prove that known unit-level paths still compile. They do **not** prove the ERP is ready across admin, employee, client, Supabase RLS, runtime UX, observability, or deployment reproducibility.

The biggest gap is that prior planning docs repeatedly call the app "PASS" while later reports in the same `.planning` folder show serious runtime, RLS, stale UI, and UX issues discovered after those passes. The audit should therefore treat `.planning` as a useful map, not as proof.

## Fix Pass Completed

Completed in this pass:

- Made the production build reproducible by pinning tracing/Turbopack root and switching `npm run build` to the verified webpack build path.
- Moved redirect-only routes into `next.config.ts` redirects so `/admin/assignments`, `/admin/attendance`, and `/inbox` no longer break static generation.
- Migrated Sentry setup into `instrumentation.ts` and `instrumentation-client.ts`.
- Added Upstash env documentation and wired rate limiting into shared-key Claude API routes.
- Moved service-role project cached reads behind route-level project authorization.
- Changed client app-library gating to fail closed when a client has no workspace, except the home app.
- Replaced native browser confirm dialogs in polished portal surfaces with themed confirmation flows.
- Removed ambiguous Tailwind easing utilities.
- Raised key icon-button touch targets and fixed always-hidden/touch-hostile action controls.
- Fixed a hidden view-as bug where the compact admin dropdown updated local state without setting the server cookie.
- Removed real runtime `select('*')` calls from app/lib code paths found by static scan.
- Fixed Zoho token retrieval to use `workspace_integrations` instead of a legacy/nonexistent `integrations` table.
- Added an RLS migration draft to tighten task and project phase destructive writes.

## Second Pass — Live Supabase Verification (2026-04-24, Opus)

Ran against production Supabase (`vbpzaiqovffpsroxaulv`, Postgres 17) via Supabase MCP. Results confirm H1 and add new findings.

### Gates re-run (clean tree + Codex changes)

| Gate                      | Result                                            |
| ------------------------- | ------------------------------------------------- |
| `npx tsc --noEmit`        | PASS                                              |
| `npm run lint`            | PASS                                              |
| `npm run build` (webpack) | PASS — 63/63 app routes, Proxy middleware emitted |

### RLS live state — confirms H1

Query: `pg_policies` on `public.tasks`, `public.project_phases`, `public.phase_items`.

- `tasks` UPDATE/DELETE policies: `(is_admin() OR is_workspace_member(workspace_id))` — any workspace member can write. `canModifyTask()` in `app/actions/shared.ts` is stricter (creator/assignee/project lead/project assignment/admin).
- `project_phases` INSERT/UPDATE/DELETE: `(is_admin() OR is_workspace_member(workspace_id))` — broad.
- `phase_items` DELETE: `(is_admin() OR EXISTS project_phases.is_workspace_member(ws))` — broad.
- Helper functions referenced by the new migration (`is_admin`, `is_workspace_admin(ws_id)`, `is_project_workspace_member`) are present and match expected signatures.
- Tables are small (19 `phase_items` rows; tasks/phases counts are modest) — blast radius of the migration is low.
- **`supabase/migrations/20260424120000_tighten_tasks_phases_rls.sql` is NOT yet applied to live DB.** It is only in the repo. Apply it in a controlled window with a verified rollback policy. Migration is DDL-only and is safe to re-run (uses `DROP POLICY IF EXISTS` + `CREATE POLICY`).

### New CRITICAL/HIGH findings from live RLS inspection

#### C2 — `profiles` SELECT policy is wide open to any authenticated user

`pg_policies` on `public.profiles`:

- Policy `"Public profiles are viewable by everyone"` — `cmd=SELECT`, `roles=public`, `qual=true`.

Impact:

- Every authenticated user (admin, employee, **client**) can read every profile row across workspaces: `email`, `username`, `role`, `company`, `planned_logout_time`, `phone`, etc.
- Internal staff lists are visible to external clients.
- Cross-workspace leakage across future multi-tenant use cases.

Recommended fix:

- Restrict SELECT to `id = auth.uid() OR is_admin() OR same workspace via workspace_members OR same project via client_projects/project_assignments`.
- Keep a narrow `profiles_public_columns` view (or computed columns) for cross-workspace lookups instead of raw row access.

#### H6 — `clients` table workspace-wide mutation by any member

`pg_policies` on `public.clients`:

- INSERT/SELECT/UPDATE policies: any user whose `profile_id` is in `workspace_members` for the same workspace.
- DELETE policy: only `workspace_members.role IN ('owner','admin')` — correct.
- INSERT/UPDATE/SELECT roles are `{public}` (should be `{authenticated}` for consistency; not exploitable by itself since RLS still runs on `auth.uid()`).

Impact:

- Any employee in the workspace can create/update any client row directly via Supabase JS, even if the UI only exposes that to admins.

Recommended fix:

- Tighten INSERT/UPDATE to admin or workspace admin, matching server-action intent.
- Convert `{public}` to `{authenticated}` across these policies to reduce surface area for anon JWTs.

#### H7 — `project_files` DELETE is workspace-wide, not project-scoped

`pg_policies` on `public.project_files`:

- `project_files_delete` — `qual = (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE profile_id = auth.uid()))`.
- `project_files_insert` has a narrower client-upload branch gated by `is_client_upload=true AND is_client_visible=true AND client_projects` — good.
- `project_files_select` correctly includes `is_client_of_project(project_id)` for client reads.

Impact:

- Any employee can delete project files on any project in the workspace, including client uploads, without being assigned to the project and without admin authorization.

Recommended fix:

- Restrict DELETE to `is_admin() OR is_workspace_admin(workspace_id) OR project lead OR project_assignments (active)`.
- Server action must re-check authorization (do not rely solely on RLS).

#### H8 — Storage bucket `project-files` is marked `public=true`

`storage.buckets` row for `project-files`: `public=true`, size cap 50 MiB, MIME allowlist looks reasonable.

Impact:

- Any path served via `getPublicUrl` is reachable without auth if the URL is guessed or leaked. For sensitive client deliverables/invoices/contracts this is a privacy problem even with RLS on list/upload/delete.
- Storage `objects` policies still gate API operations, but the **download URL** is public.

Recommended fix:

- Flip the bucket to `public=false` and switch the app to `createSignedUrl(path, ttl)` for downloads.
- Keep logos in a separate public bucket if needed, or use `createSignedUrl` with a long TTL for branding assets.

#### H9 — `manager` role still referenced in live RLS policies (drift)

Policies still referencing `'manager'::user_role`:

- `client_feature_requests` (feature_requests_delete/insert/select/update)
- `financial_invoices` (admin_manager_insert/update/delete_invoices, Clients view own invoices)

Current DB state: `profiles.role = 'manager'` → 0 rows. So the clauses are currently inert.

Impact:

- Future re-introduction of a manager row (manual SQL, old seed) would silently grant manager-level rights that the app layer otherwise blocks.
- Confusing for future maintainers; contradicts migration `20260418150000_remove_manager_role.sql` intent.

Recommended fix:

- Follow-up migration: rewrite these policies to drop the manager arm, or add a DB check constraint preventing `role='manager'` on `profiles`.

### Supabase advisors (`get_advisors`)

Security:

- INFO `rls_enabled_no_policy`: `public.idempotency_keys`, `public.public_bookings`, `public.session_reports`, `public.website_leads` — tables have RLS on but zero policies, so every authenticated read/write is blocked (service_role only). Likely intentional (documented for `session_reports` in CLAUDE.md). Verify via code grep that all writes to these tables go through `createAdminClient()`.
- WARN `auth_leaked_password_protection`: Supabase Auth HaveIBeenPwned check is disabled. Enable in Supabase dashboard → Auth → Password settings.

Performance: advisor output is large (87 KB). Full dump saved to `.claude/.../mcp-supabase-get_advisors-1776990590973.txt`. Headline classes present (based on project history): `auth_rls_initplan` (mostly addressed by `20260412224920_perf_portal_auth_rls_initplan`), unused indexes, and duplicate permissive policies. Re-run advisors after applying `20260424120000` and the follow-ups above; triage anything new.

### Browser QA — still not done in this environment

The sandbox blocks binding a dev server port, so real browser QA at admin/employee/client roles across mobile/desktop was **not** performed in this pass. This remains the single biggest outstanding risk before a readiness claim.

Minimum required next step before calling the ERP ready:

1. `npm run dev` locally, real browser.
2. Test admin, employee, client on 375px + 1440px for: tasks scope toggle, project roadmap/files, client files upload/delete/download, requests with attachments, billing, messages, knowledge seeding, view-as.
3. Record each flow with pass/fail evidence and append to this audit.

## What I Ran

| Gate                                            | Result                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                              | PASS                                                                                                    |
| `npm run lint`                                  | PASS                                                                                                    |
| `npm test -- --runInBand`                       | PASS — 29 suites, 655 tests                                                                             |
| `npm run test:coverage -- --runInBand`          | PASS against configured threshold; actual global coverage is low at 31.96% statements / 27.14% branches |
| `npm audit --audit-level=moderate`              | BLOCKED — sandbox DNS/network failure to registry.npmjs.org                                             |
| `npm run build`                                 | PASS — now explicitly runs `next build --webpack`, 63/63 app routes generated                           |
| `npm run build:turbopack`                       | FAIL — Turbopack internal error in sandbox while binding an internal port                               |
| `npx next build --webpack`                      | PASS — 63/63 app routes generated                                                                       |
| `npx next dev --webpack -p 3001`                | BLOCKED — sandbox denies listening on local ports                                                       |
| Supabase live check via `@supabase/supabase-js` | BLOCKED — DNS/network failure to Supabase project host                                                  |
| Supabase CLI / MCP                              | BLOCKED — Supabase CLI is not installed on PATH and no Supabase MCP tool is exposed in this session     |

## Critical

### C1 — Production build was not reproducible in this environment

Evidence:

- `npm run build` fails with a Turbopack panic while processing `geist/dist/geistsans_*.module.css`.
- `npx next build --webpack` compiles and typechecks, then fails in static generation: `Next.js build worker exited with code: 1`.
- `.next/trace` checked 62 pages; `/knowledge` is the notable route missing from the checked-page list.
- Next also warns that it is choosing `/home/qualia/package-lock.json` as the workspace root instead of this repo.

Status after fix:

- `npm run build` now uses `next build --webpack` and passes.
- `next.config.ts` pins `outputFileTracingRoot` and `turbopack.root` to the repo.
- Redirect-only routes moved into `next.config.ts`, removing static generation failures for `/admin/assignments`, `/admin/attendance`, and `/inbox`.
- Turbopack remains blocked in this sandbox by `binding to a port` / `Operation not permitted`; keep `build:turbopack` as a separate verification path until it is stable in CI.

Impact:

- A readiness claim is weak if a clean local production build cannot be reproduced.
- The root inference warning can affect output tracing and deployment packaging.

Recommended fix:

- Keep webpack as the production build path until Turbopack can be verified outside the sandbox.
- Track the remaining Sentry edge warning and Next `middleware` to `proxy` migration.

## High

### H1 — Supabase RLS is broader than server-action authorization for destructive task/phase writes

Evidence:

- `app/actions/shared.ts` has a strict `canModifyTask()` helper: admin, creator, assignee, project lead, or project assignment.
- `supabase/migrations/20260412100100_fix_tasks_delete_rls.sql` allows `DELETE` when `is_admin() OR is_workspace_member(workspace_id)`.
- `supabase/migrations/20260412100000_fix_project_phases_delete_rls.sql` and `20260412110000_fix_project_phases_insert_update_rls.sql` allow any workspace member to insert/update/delete project phases.

Impact:

- Server actions may block unauthorized employees, but RLS is the real database boundary.
- Any authenticated browser session has the Supabase public key and user JWT. If RLS allows the write, a user can bypass UI/server-action intent by calling Supabase directly.

Recommended fix:

- Review and apply `supabase/migrations/20260424120000_tighten_tasks_phases_rls.sql` in staging.
- For tasks: RLS should match creator/assignee/project lead/project assignment/admin, not broad workspace membership.
- For phases: decide whether any employee may manage roadmap structure. If not, restrict to admin/project lead/assigned project members.
- Add RLS regression tests with real policies or SQL fixtures, not only mocked server-action tests.

### H2 — Service-role cached reads happen before route-level project authorization

Evidence:

- `lib/cached-reads.ts` uses `createAdminClient()` by design.
- `app/(portal)/projects/[id]/page.tsx` calls `getCachedProjectById(id)` and `getCachedProjectIntegrationStatus(id)` before checking whether a client has `client_projects` access or an employee has an active `project_assignments` row.

Impact:

- The route does not appear to render the data to unauthorized users, but it does perform service-role reads before authorization.
- This creates avoidable blast radius, cache pollution, and a bad security pattern for future maintainers.

Recommended fix:

- Done for `app/(portal)/projects/[id]/page.tsx`: authenticate and authorize the user/project relationship first using the normal scoped client, then call service-role cached reads.
- Consider splitting cached data into safe public/client/internal shapes.

### H3 — API rate limiting is incomplete and misconfigured

Evidence:

- `lib/rate-limit.ts` uses Upstash Redis env vars, but `.env.example` does not list `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN`.
- Local import prints missing Upstash env warnings.
- `apiRateLimiter` is exported but unused.
- `/api/claude/session-log`, `/api/claude/session-feed`, and `/api/claude/project-status` use a shared `CLAUDE_API_KEY` with service-role access and no rate limit.

Impact:

- A compromised shared key can generate unbounded service-role traffic.
- Local and preview environments can silently miss rate-limit behavior.

Recommended fix:

- Done for the Claude shared-key routes found in this pass.
- Add required Upstash env vars to live deployment environments.
- Prefer per-user `qlt_*` API tokens over shared `CLAUDE_API_KEY` where possible.

### H4 — Sentry/observability setup is incomplete for current Next.js

Evidence:

- Build warns that `sentry.server.config.ts` and `sentry.edge.config.ts` should move into a Next instrumentation file.
- Build warns no instrumentation file exists.
- `sentry.client.config.ts` is deprecated for Turbopack and should move to `instrumentation-client.ts`.

Impact:

- Server/edge errors may not be captured reliably.
- This is especially risky because many ERP failures are behavioral and runtime-only.

Recommended fix:

- Done: added `instrumentation.ts` and `instrumentation-client.ts`, and removed deprecated Sentry config files.
- Verify server, edge/middleware, route handlers, and client errors all arrive in Sentry.

### H5 — Live Supabase state was not verifiable from this environment

Evidence:

- Supabase CLI is absent.
- No Supabase MCP tool is exposed.
- Direct Supabase JS requests fail with `getaddrinfo EAI_AGAIN`.

Impact:

- I could inspect migrations and code, but not the actual final production policy set, applied migrations, table counts, storage policies, or advisor output.

Recommended fix:

- Run this SQL against production/staging and attach the result to the next audit:
  - `select * from pg_policies where schemaname in ('public','storage') order by tablename, policyname;`
  - list storage bucket policies and MIME limits
  - Supabase advisors: security, performance, RLS
  - migration history versus repo migrations

## Medium

### M1 — Test coverage is much lower than the stated target

Actual coverage:

- Statements: 31.96%
- Branches: 27.14%
- Functions: 33.95%
- Lines: 32.93%

Important 0% modules include:

- `app/actions/work-sessions.ts`
- `app/actions/reports.ts`
- `app/actions/portal-admin.ts`
- `app/actions/portal-messages.ts`
- `app/actions/task-attachments.ts`
- `app/actions/health.ts`
- `app/actions/client-requests.ts`
- `app/actions/request-comments.ts`

Impact:

- The most business-critical ERP behavior is not well covered.
- Existing tests rely heavily on mocked Supabase clients, so they do not validate actual RLS behavior.

Recommended fix:

- Raise thresholds gradually by domain, not globally all at once.
- Add integration-style tests for auth/RLS-sensitive actions.

### M2 — Client app-library guard fails open for clients with no workspace

Evidence:

- `assertAppEnabledForClient()` returns `true` when `getClientWorkspaceId()` returns null.
- Comment says a client with zero linked projects still sees pages.

Impact:

- Disabled apps can be accessible to clients who temporarily lack a project link.
- This weakens the App Library as an access-control layer.

Recommended fix:

- Done: fail closed for app-specific routes; preserve explicit home app exception.
- Use explicit empty states after access is granted, not as a reason to bypass app gating.

### M3 — Role model still has `manager` drift

Evidence:

- `20260418150000_remove_manager_role.sql` says manager is removed from app behavior but kept in the enum.
- `types/database.ts` still includes `'manager'`.
- Several app comments and checks still reference manager.
- `app/(portal)/layout.tsx` treats only `admin` and `employee` as internal; a lingering `manager` profile would be handled inconsistently even though JWT claims normalize it.

Impact:

- Rare but serious if a manager row is inserted manually or by old code.
- Policies still grant manager rights in several places.

Recommended fix:

- Add a DB check/trigger or admin action guard preventing new manager rows.
- Normalize profile role in server components the same way JWT claims are normalized.
- Clean up stale comments and policy naming.

### M4 — Native browser dialogs remain in polished surfaces

Evidence:

- `components/portal/portal-request-list.tsx` uses `window.confirm()` for attachment deletion.
- `app/(portal)/knowledge/knowledge-page-client.tsx` uses `window.confirm()` and `window.location.reload()` for seeding.

Impact:

- Inconsistent UX.
- Native dialogs are hard to style, test, and localize.

Recommended fix:

- Done for request attachment deletion and knowledge guide seeding.

### M5 — Several icon buttons are still below the 44px touch target

Examples:

- Message composer toolbar buttons: `components/portal/messaging/message-composer.tsx`
- AI assistant header/sidebar buttons: `components/ai-assistant/*`
- Client table view toggles: `components/client-table-view.tsx`

Impact:

- Mobile/touch usability still violates the design requirement.

Recommended fix:

- Done for the shared icon button variants and several visible portal/AI/client controls.
- Continue checking dense custom controls manually in browser screenshots.

### M6 — Motion classes produce Tailwind ambiguity warnings

Evidence:

- Build warns for `ease-[cubic-bezier(...)]` and `ease-[premium]`.

Impact:

- The design system relies on predictable motion tokens, but the generated utility resolution is ambiguous.

Recommended fix:

- Done for the ambiguous easing utilities found by static scan.

### M7 — `select('*')` remains in some service paths

Examples:

- `app/api/claude/session-feed/route.ts`
- `lib/knowledge-data.ts`
- `lib/integrations/zoho.ts`
- `lib/integrations/orchestrator.ts`
- `lib/ai/memory.ts`

Impact:

- Wider payloads, accidental data exposure, and future schema-coupling risk.

Recommended fix:

- Done for real runtime `select('*')` calls found under `app`, `lib`, and `components`.
- Remaining matches are comments or documentation snippets.

## Newly Found During Fix Pass

### N1 — Zoho integration token retrieval used a stale table shape

Evidence:

- `lib/integrations/zoho.ts` read from `integrations` and attempted to update `access_token` / `token_expires_at`.
- The current app writes integration settings to `workspace_integrations.encrypted_token` plus `config`.

Impact:

- Zoho connection testing and API requests could silently fail even when an admin saved a Zoho refresh token.

Status:

- Fixed to read `workspace_integrations`, decrypt the saved refresh token, and store refreshed access-token metadata in `config`.

### N2 — Compact view-as dropdown did not set the server cookie

Evidence:

- `components/today-dashboard/index.tsx` called `startViewAs()`.
- `components/admin-provider.tsx` only updated local state and reloaded; it did not call `setViewAsUser()`.

Impact:

- The UI could appear to switch while server-rendered data remained tied to the real user.

Status:

- Fixed in `AdminProvider`: `startViewAs()` now calls the server action and uses `router.refresh()`.

### M8 — Middleware file convention is deprecated

Evidence:

- Build warns: use `proxy` instead of `middleware`.

Impact:

- Not a current runtime blocker, but it is framework drift on Next 16.

Recommended fix:

- Migrate `middleware.ts` to the current proxy convention.

### M9 — Planning docs are useful but stale/conflicting

Evidence:

- `.planning/REVIEW.md` says static audit passes and no blockers.
- `.planning/OPTIMIZE.md` and later reports show multiple high/medium issues discovered after similar passes.
- `.planning/STATE.md` says master clean/up to date, but current `git status` shows untracked `.codex`.

Impact:

- Agents can over-trust prior “PASS” docs and stop before runtime verification.

Recommended fix:

- Add a “last verified by runtime QA” field with exact commands, roles, and dates.
- Separate static pass from product readiness.

## UX/Product Gaps To Re-Test With A Browser

Runtime browser QA was blocked by the sandbox, so these need a real browser pass:

- Admin flow: create/edit/delete client, assign employee, remove employee, create invoice, upload portal branding.
- Employee flow: clock in/out, tasks mine/all restrictions, project access by assignment, schedule, files.
- Client flow: app-library disabled apps, project visibility, files upload/delete/download, requests with attachments, billing, messages.
- Mobile widths: 320px, 375px, 768px.
- Keyboard-only path: sidebar, tasks, messages, file/request attachments, knowledge page.
- Error states: Supabase failure, upload failure, rate-limit failure, invalid invitation, missing workspace/client link.

## Recommended Fix Order (updated after live verification)

1. **Apply RLS migration `20260424120000_tighten_tasks_phases_rls.sql`** to production Supabase. DDL-only, re-runnable, policies confirmed compatible with existing helper functions.
2. **Close C2** — rewrite `profiles` SELECT policy to restrict cross-workspace visibility.
3. **Close H6/H7** — tighten `clients` INSERT/UPDATE and `project_files` DELETE to admin/project-member scope.
4. **Close H8** — flip `project-files` storage bucket to private; move app to signed URLs for downloads.
5. **Close H9** — follow-up migration to purge `manager` role references from live policies.
6. Enable Supabase Auth HaveIBeenPwned leaked-password protection.
7. Migrate `middleware.ts` → `proxy.ts` (Next 16 convention) and fix rate-limit docstring env-var drift (`KV_REST_API_URL` → `UPSTASH_REDIS_REST_URL`).
8. Run live browser QA for admin/employee/client flows at 375px + 1440px; append results here.
9. Raise coverage for the 0% high-risk action modules (portal messaging, portal admin, work sessions, reports, client requests, task attachments).
10. Re-run `get_advisors` after steps 1–5 and triage remaining performance lints.

## Immediate Actions Taken This Pass

- Live Supabase connected via MCP; migration history, RLS, storage, and advisors verified.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` re-run on current tree — all green.
- RLS migration reviewed and confirmed compatible (helper functions present; DDL is idempotent).
- Audit updated with C2, H6–H9 and remediation order. Migration not auto-applied — staged for human approval + deploy window.

## Bottom Line

The ERP is beyond prototype quality in many areas, but it is not ready to be declared “done.” The remaining risk is not mainly TypeScript or lint. It is authorization alignment, reproducible builds, live Supabase verification, runtime UX, observability, and role-based workflow behavior.
