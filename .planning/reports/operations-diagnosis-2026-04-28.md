# Qualia ERP Operations Diagnosis

Date: 2026-04-28  
Production checked: https://portal.qualiasolutions.net  
Live version checked: `ace6b32`  
Purpose: explain, in plain language, how the ERP operation currently works, what is wrong, what is missing, and what to do next to make employees, clients, admins, deadlines, and framework reporting run cleanly.

## Executive Diagnosis

The portal is online and structurally healthy. The production health endpoint is healthy, the database responds, and the local quality gates passed: TypeScript, lint, tests, audit, and production build.

The main problem is not that the whole ERP is broken. The main problem is operational discipline and a few stale data contracts. The portal has most of the pieces: employees, clients, admins, tasks, projects, deadlines, clock-in/out, reports, framework ingest, invoices, requests, messages, and knowledge. But some of those pieces are not yet forced into one consistent operating system.

In simple terms:

- Admins have too many places to check and a few reports are likely returning empty data because old field names are still being used.
- Employees can clock in, work, and report, but planning is too loose: project sessions do not require a planned outcome, project, deadline, and report metadata from the start.
- Clients have a portal, but client-project linking still has mixed data sources and one client detail page is probably using the wrong project status field.
- Deadlines exist in the database, but they are not strongly enforced across projects, phases, and tasks.
- The ERP and Qualia Framework are connected, but the framework is not yet sending all of the useful identifiers needed for clean client/project reporting.
- The UI is much better than before, but some screens still need clearer operating hierarchy: what needs attention today, what is blocked, what is late, who owns it, and what the client should see.

The priority is to turn the ERP from a record-keeping portal into an operating cockpit.

## Current Operation Map

### Admin Operation

Admins can:

- See the company/control dashboard.
- View all projects, clients, tasks, team activity, finance, framework reports, settings, and integrations.
- Assign work and review sessions.
- Use view-as/client workspace behavior.
- Manage API tokens for framework reporting.

What is working:

- The admin role is properly separated from employee/client roles at the layout level.
- Admins can access company-wide tasks and projects.
- Admin dashboard/control is the right direction: one central place instead of scattered pages.
- Production deploy and health monitoring are live.

What is weak:

- Some admin reports appear to depend on old assignment fields and may silently return empty data.
- Admin reporting still feels like checking history, not steering today's operation.
- There is not yet one daily "command center" that answers: who is working, what is late, what is blocked, what shipped, what needs me.
- Client management has both direct project ownership and portal access rows, which can drift if not reconciled.

### Employee Operation

Employees can:

- Log in to the portal.
- Clock into a project.
- See assigned projects and tasks.
- Work through task inboxes.
- Run `/qualia-report`.
- Clock out once the session report is attached.

What is working:

- The clock-in/clock-out flow creates operational accountability.
- Requiring a report before clock-out for project work is the right long-term behavior.
- Employee task pages support due dates, status, priority, project, assignee, and scheduling.
- Employees do not see admin/client-only areas they should not own.

What is weak:

- Project clock-in does not require a planned outcome, duration, or reason, even though the database supports it.
- There is a hardcoded special "Daily Research / Blog" entry for one employee. That should be configurable, not coded into the app.
- If `/qualia-report` fails or is not understood, an employee can feel trapped at clock-out.
- Quick-add tasks can be created with only a title and priority, which creates work without project, deadline, assignee, or phase discipline.
- "Coming Up" is not a true deadline priority list yet. It shows upcoming items, but the system should make overdue/due-soon/blocking work impossible to miss.

### Client Operation

Clients can:

- Enter a client workspace.
- View client-facing projects and updates.
- Send requests/messages.
- See billing/payment surfaces.
- Access only enabled client apps.

What is working:

- Clients are separated from internal users.
- The portal layout filters client apps differently from admin/employee apps.
- Internal-only project pages redirect clients away from admin project management.
- Billing, requests, messages, and workspace are the right client-facing building blocks.

What is weak:

- The client detail page likely uses an old `project_status` field where the current project table uses `status`. This can make linked projects or dropdowns fail quietly.
- The code still has two ways to represent client-project relationships: `projects.client_id` and `client_projects`. Both are useful, but their purpose must be defined clearly.
- Client task visibility exists technically, but client navigation does not make "Tasks" an obvious portal section. If client tasks are meant to exist, expose them clearly. If not, remove the client task concept.
- Client requests are present but underused. The live database only showed one pending client feature request.

## What Is Actually Broken Or Risky

### 1. Client Detail Project Linking Uses The Wrong Field

Severity: High  
Area: Clients / admin client management  
Evidence: `app/(portal)/clients/[id]/page.tsx`

The client detail page selects and filters by `project_status`, but the live `projects` table uses `status`. Another query in the same file correctly uses `status`, which confirms this is inconsistent.

Likely impact:

- A client detail page may show missing assigned projects.
- Admin project dropdowns may be empty or incomplete.
- The system can look like "there is no data" even when the data exists.

Recommended fix:

- Replace `project_status` with `status` on that page and in its client project access component.
- Keep `/clients` as the canonical client page.
- Treat `/admin?tab=clients` only as an entry point or redirect into `/clients`.

### 2. Admin "Assigned vs Done" Report Uses Old Assignment Fields

Severity: High  
Area: Admin reports / employee productivity  
Evidence: `app/actions/reports.ts`

The report queries `project_assignments.profile_id` and `status = active`, but the live schema uses `employee_id` and `removed_at`. This means the report can silently return empty results.

Likely impact:

- Admin cannot reliably compare assigned work versus completed work.
- Employee productivity reporting may be wrong.
- You may make operational decisions from missing data.

Recommended fix:

- Update the report query to use `employee_id`.
- Treat active assignments as `removed_at IS NULL`.
- Add a regression test for the report shape.

### 3. Deadlines Exist But Are Not Operationally Enforced

Severity: High  
Area: Projects, tasks, phases, delivery planning  
Evidence from live database:

- Active projects with deadline: 2
- Active projects without deadline: 15
- Phases with deadline: 0
- Phases without deadline: 89
- Open tasks with due date: 4
- Open tasks without due date: 1
- Open project tasks without phase: 2

This means the app has deadline fields, but the business process is not enforcing them.

Likely impact:

- Work can exist without a committed finish date.
- Projects can move without a visible delivery plan.
- Employees can complete tasks without understanding what deadline they are protecting.
- Clients do not get predictable expectation management.

Recommended fix:

- Make every active project have a target date.
- Make every active phase have a start date and target date.
- Make every open task have either a due date or a deliberate "no due date" reason.
- Add deadline health: On track, due soon, at risk, overdue.
- Add a weekly deadline review flow for admin.

### 4. Framework Reporting Is Connected But Not Complete

Severity: Medium-High  
Area: Qualia Framework <-> ERP reporting  
Evidence from live database:

- `session_reports`: 85 total
- Reports with `client_report_id`: 79
- Reports with `client_id`: 0
- Reports with `framework_version`: 0
- Dry-run reports: 0

The ERP can accept rich reporting fields, including `client_id` and `framework_version`, but the framework is not sending them yet.

Likely impact:

- Reports are hard to group cleanly by client.
- Version debugging is weaker: if a report payload changes, you cannot easily see which framework version produced it.
- Client reporting remains more manual than it needs to be.

Recommended fix:

- Update Qualia Framework `/qualia-report` to send:
  - `client_id`
  - `framework_version`
  - `project_id`
  - `team_id`
  - `git_remote`
  - `session_started_at`
  - `last_pushed_at`
  - `build_count`
  - `deploy_count`
  - `client_report_id`
- Require every employee to use a per-user `qlt_*` API token instead of the legacy shared key.
- Show a "report completeness" score in admin system reports.

### 5. Project Clock-In Is Too Loose

Severity: Medium  
Area: Employee accountability  
Evidence: `components/today-dashboard/clock-in-modal.tsx`, `app/actions/work-sessions.ts`

The schema supports planned duration, reason, and activities. The server requires those only for non-project sessions. For project sessions, employees can clock in with just a project.

Likely impact:

- The day starts without a clear goal.
- You learn what happened only after the session, not before.
- It is harder to catch bad focus early.

Recommended fix:

- For every project clock-in, ask for:
  - Planned outcome
  - Planned duration
  - Related task or phase
  - Blocker, if any
- Keep this fast, not bureaucratic: one sentence and a duration is enough.

### 6. Clock-Out Copy Still Says "Recommended" When Report Is Required

Severity: Medium  
Area: UX clarity  
Evidence: `components/clock-out-modal.tsx`

The code correctly blocks project clock-out until a report exists, but the label still says the report is "recommended." Lower in the same modal it correctly says "Report required to clock out."

Likely impact:

- Employees do not understand why the button is disabled.
- It creates support friction.

Recommended fix:

- Change the label to "required for project sessions."
- Add a clear "Run `/qualia-report`, then click Refresh" instruction.
- Add an admin override for real emergencies, with audit log.

### 7. One Employee's Daily Work Type Is Hardcoded

Severity: Medium  
Area: Operational configuration  
Evidence: `components/today-dashboard/clock-in-modal.tsx`

The "Daily Research / Blog" pseudo-project is hardcoded for one email address and bound to a project by name.

Likely impact:

- Renames or assignment changes can break the entry.
- Other employees cannot get similar daily work presets without code changes.
- Company workflow lives in code instead of admin settings.

Recommended fix:

- Create an admin-managed `work_presets` table.
- Allow presets per employee, team, or workspace.
- Bind presets to project IDs, not project names.

### 8. Task Quick Add Can Create Weak Tasks

Severity: Medium  
Area: Task quality and deadline discipline  
Evidence: `components/portal/qualia-tasks-view.tsx`

Quick-add creates a task with only a title and medium priority.

Likely impact:

- Tasks can become disconnected from project, phase, owner, and deadline.
- The inbox becomes a note bucket instead of a delivery system.

Recommended fix:

- Keep quick-add, but after pressing Enter show a compact required follow-up: project, due date, owner.
- If employee is inside a project context, default the project automatically.
- If due date is missing, default to today for personal tasks or phase target for project tasks.

### 9. Removed "Unphased" UI But Data Still Needs Cleanup

Severity: Medium  
Area: Project planning  
Evidence: project workflow code and live task counts

The visible "unphased" pseudo-bucket was removed from the project workflow, which is good because it was confusing. But live data still has open project tasks without phases.

Likely impact:

- Unphased work can become invisible in the project workflow.
- Framework imports with missing milestone/phase data may disappear from the clean roadmap view.

Recommended fix:

- Do not bring back the "Unphased" concept as a normal planning bucket.
- Add an admin-only "Needs planning" cleanup queue.
- Auto-assign orphan tasks to the correct phase when framework reports contain enough metadata.
- If metadata is missing, mark the project as needing planning cleanup.

### 10. Supabase Security And Performance Advisors Need A Cleanup Pass

Severity: Medium  
Area: Backend hardening  
Evidence: Supabase advisors

The advisors showed several non-emergency but real hardening items:

- Some RLS-enabled tables have no policies.
- Several SECURITY DEFINER functions are executable by broad roles.
- One function has mutable `search_path`.
- Leaked password protection is disabled.
- Several foreign keys are missing indexes.
- Several indexes are unused.

Likely impact:

- Not necessarily an active exploit, but it weakens long-term safety.
- As data grows, missing indexes can make pages slower.
- Broad function execution can become a future privilege problem.

Recommended fix:

- Add explicit RLS policies or intentionally document private server-only tables.
- Restrict SECURITY DEFINER functions to the minimum roles needed.
- Set immutable `search_path` on functions.
- Enable leaked password protection.
- Add indexes to active foreign keys that are used in joins.
- Remove unused indexes only after checking production query history.

## UI And UX Diagnosis

### What Looks Strong

- The portal now feels more like a focused SaaS operations tool than a generic dashboard.
- Role-based navigation is mostly clear.
- The sidebar grouping is sensible: Workspace, Knowledge, Admin, Account.
- Admin, employee, and client areas are visually closer to one product now.
- The task interface has useful editing power: status, assignee, project, due date, schedule, description.
- The project gallery and roadmap support deadline display and integration status.

### What Still Needs Work

The biggest UX issue is not colors or spacing. It is decision clarity.

Every important screen should answer four questions immediately:

1. What needs attention today?
2. What is late or at risk?
3. Who owns it?
4. What is the next action?

Right now, the portal stores a lot of information, but it does not always force these answers to the top.

### Admin UX Improvements

Build an admin command center with:

- Today's active employees
- Missing clock-ins
- Stale sessions
- Sessions missing reports
- Overdue tasks
- Projects at risk
- Client requests waiting
- Payments/invoices needing attention
- Latest deployments
- Latest framework reports
- System health

Admins should not need to open 6 pages to understand the company day.

### Employee UX Improvements

The employee home should be a work cockpit:

- Clock-in goal
- Today's assigned tasks
- Due/overdue work
- Active project
- Current phase
- Blockers
- Report status
- Clock-out readiness

Employee task creation should gently enforce project, owner, phase, and deadline.

### Client UX Improvements

The client workspace should focus on confidence:

- What is being built
- What changed recently
- What is next
- What is waiting on the client
- Open requests
- Invoices/payment status
- Files and approvals

Avoid showing internal delivery complexity unless it is intentionally client-visible.

## Deadline System Recommendation

Use three levels of deadlines:

### 1. Project Deadline

Meaning: client/business commitment.

Rules:

- Required for all Active, Demos, Pre-production, and Launched projects.
- Can be empty only for Archived, Done, or Backlog projects.
- Shown on project cards, admin dashboard, and client workspace.

### 2. Phase Deadline

Meaning: internal delivery checkpoint.

Rules:

- Every active phase gets start date and target date.
- Phase dates must fit inside the project deadline.
- If a phase slips, admin must either move the project deadline or reduce scope.

### 3. Task Due Date

Meaning: employee commitment.

Rules:

- Every open task needs a due date or explicit "no due date" reason.
- Project task due dates should not exceed the phase target date.
- Overdue task requires either completion, reassignment, or reschedule note.

### Deadline Health Labels

Use simple labels:

- On track: due date is safe.
- Due soon: due within 48 hours.
- At risk: phase/project is close and work remains.
- Overdue: due date passed.
- No deadline: active item missing required date.

### Weekly Deadline Ritual

Every Sunday or Monday:

- Admin reviews active projects without target dates.
- Admin reviews phases without target dates.
- Admin reviews overdue tasks.
- Employees confirm what they will finish this week.
- Client-facing updates are generated from the same data.

## ERP <-> Framework Reporting Plan

The ERP should become the central report receiver. The framework should be the work execution/report producer.

### What The Framework Should Send Every Time

Each `/qualia-report` should send:

- Project name
- Stable framework project ID
- ERP client ID
- ERP workspace/team ID
- Milestone number and name
- Phase number and name
- Tasks done and total tasks
- Verification result
- Deployment URL
- Commits
- Build count
- Deploy count
- Framework version
- Git remote
- Session start time
- Last push time
- Client report ID
- Submitted by employee

### What ERP Should Show From Reports

Admin view:

- Which employee submitted
- Which project/client
- What changed
- Verification result
- Whether deployed
- Whether report is complete
- Whether it attached to an active work session

Employee view:

- My latest report
- Whether clock-out is ready
- Missing fields
- Report history for my current session

Client view:

- Clean client-facing summary only
- No internal notes unless explicitly approved
- Milestone/phase progress
- Recent changes
- Next expected step

### Reporting Efficiency Improvements

- Generate a client-safe summary automatically from each internal report.
- Let admin approve/edit before sending to client.
- Auto-link report to project, phase, task, employee, and client.
- Show "missing report" and "incomplete report" in admin command center.
- Replace manual status chasing with daily digest.

## Client Pages Decision

Keep:

- `/clients` as the canonical admin client list.
- `/clients/[id]` as the full client detail page.

Do not keep a separate competing client page inside admin. If admin needs a clients tab, make it a shortcut or summary that links to `/clients`.

Data rule:

- `projects.client_id` should mean the project belongs to that client.
- `client_projects` should mean this client has portal access to this project.
- Add a reconciliation job that flags mismatches:
  - Project has `client_id` but no portal access row.
  - Portal access exists but project belongs to another client.
  - Client has access to archived/private project.

## Best Practices To Run The Platform

### Daily

- Every employee clocks into one clear project or approved internal preset.
- Every project session starts with planned outcome and duration.
- Every project session ends with `/qualia-report`.
- Admin checks command center for late work, missing reports, and blockers.
- Client requests are triaged same day.

### Weekly

- Review project deadlines.
- Review phase deadlines.
- Review overdue tasks.
- Review active clients and outstanding client asks.
- Review framework report completeness.
- Review invoices/payments.

### Monthly

- Security advisor cleanup.
- Unused indexes review.
- RLS/function permission review.
- Client portal quality review.
- Framework contract compatibility check.
- Design/UX polish pass on the busiest screens.

## Priority Roadmap

### Priority 0: Security Hygiene

Do immediately:

- Rotate any password that was pasted into chat or shared outside a password manager.
- Make sure every employee uses their own account.
- Move framework reporting to per-user `qlt_*` tokens only.
- Enable leaked password protection in Supabase.

### Priority 1: Fix Wrong Data Contracts

Do first because these can create silent failures:

- Fix `/clients/[id]` to use `projects.status`, not `project_status`.
- Fix Assigned vs Done report to use `project_assignments.employee_id` and `removed_at IS NULL`.
- Add tests so these do not break again.

### Priority 2: Deadline Discipline

Do next because this improves the whole business:

- Require target date on active projects.
- Require phase dates on active phases.
- Require task due date or no-date reason.
- Add deadline health labels.
- Add admin "missing deadlines" queue.

### Priority 3: Employee Work Discipline

- Project clock-in requires planned outcome and duration.
- Clock-out copy says report is required.
- Admin can override stuck sessions with audit log.
- Work presets become admin-configurable.

### Priority 4: Framework Reporting Upgrade

- Send `client_id` and `framework_version` from framework.
- Add report completeness score.
- Auto-create client-safe summaries.
- Attach reports to active work sessions reliably.

### Priority 5: Admin Command Center

- Build a single daily control screen.
- Show employee status, overdue work, missing reports, client asks, system health, and deployments.
- Make this the first admin page.

### Priority 6: Client Experience

- Clean client workspace into project status, requests, messages, invoices, files, and approvals.
- Decide whether client-visible tasks are real. If yes, add the Tasks nav item. If no, hide/retire the feature.
- Generate better client progress updates from framework reports.

## Scorecard

Overall platform health: 7/10  
Reason: online, tested, and structurally strong, but operational rules are not enforced enough.

Admin operation: 6.5/10  
Reason: powerful, but too many checks are scattered and two report/client areas likely have stale field bugs.

Employee operation: 7/10  
Reason: clock/report/task flow is strong, but project sessions need planned outcomes and deadlines.

Client operation: 6/10  
Reason: portal exists and role separation is good, but client-project linking and client-facing clarity need tightening.

Deadline management: 4/10  
Reason: fields exist, adoption is weak. Active projects and phases need mandatory dates.

Framework integration: 7/10  
Reason: reporting endpoint is solid, but payload completeness is not there yet.

Security posture: 6.5/10  
Reason: no dependency vulnerabilities found in this scan, but Supabase advisor cleanup and credential hygiene are needed.

UI/UX: 7/10  
Reason: design direction is strong, but operational attention states need to become sharper.

## What I Would Do Next

1. Fix the two likely silent data bugs: client detail project status and assigned-vs-done report.
2. Add missing deadline queues and enforcement.
3. Improve clock-in/clock-out so employees always plan, report, and close cleanly.
4. Update the framework report payload to send `client_id` and `framework_version`.
5. Build admin command center as the daily operating screen.
6. Clean the client workspace so clients see progress, asks, files, invoices, and messages without internal noise.
7. Run Supabase advisor hardening after the functional fixes.

## Verification Run

Current production health:

- `https://portal.qualiasolutions.net/api/health`
- Status: healthy
- Version: `ace6b32`
- Database: up

Local quality checks from this diagnosis pass:

- `npx tsc --noEmit`: passed
- `npm run lint`: passed
- `npm test -- --runInBand`: passed, 29 suites, 655 tests
- `npm audit --omit=dev --json`: passed, 0 vulnerabilities
- `npm run build`: passed

Limitations:

- This report is based on code review, production health checks, live database/schema checks, and quality gates.
- I did not write the user's pasted password into automation or command logs.
- Full authenticated browser QA with real role screenshots should be run after the two data-contract fixes, using a rotated password or a temporary test account.

## Follow-up Implementation Notes (branch `ops-diagnosis-fixes`)

This section records what changed against this report on 2026-04-28. Nothing
listed here has been deployed to production — only landed on the
`ops-diagnosis-fixes` feature branch, with all local quality gates green.

### Done — Priority 1 silent data bugs

- **Client detail page** — `app/(portal)/clients/[id]/page.tsx`,
  `app/(portal)/clients/[id]/client-detail-view.tsx`,
  `components/clients/client-project-access.tsx`: every reference to a
  non-existent `project_status` column on the `projects` table is now
  `status` (the live column). The ENUM type is still named `project_status`
  and the `portal_project_mappings` view still has a renamed `project_status`
  column — both are intentional and untouched.
- **Assigned vs Done report** — `app/actions/reports.ts:getAssignedVsDone`:
  switched from `project_assignments.profile_id` + `status='active'` to the
  live `employee_id` + `removed_at IS NULL`, including the FK alias
  `project_assignments_employee_id_fkey`.
- **Regression tests** — `__tests__/actions/reports.test.ts` (new) asserts
  the live schema is queried, and `__tests__/actions/clients-detail-page.test.ts`
  (new) is a source-level pin against re-introducing the wrong column.

### Done — Priority 2 deadline visibility

- **Planning health** — new server action `loadPlanningHealth()` in
  `app/actions/admin-control/planning-health.ts` returns counts of:
  active projects with no target date, active phases missing start/target
  dates, open project tasks with no phase, open tasks with no due date.
- **Admin overview panel** — `components/portal/qualia-control.tsx` renders
  these counts in a "Planning cleanup needed / Planning health is clean"
  section above the weekly/activity row, with each row linking back to the
  upstream list (`/projects?missing=…`, `/tasks?scope=all&missing=…`). The
  retired "Unphased" pseudo-bucket is _not_ re-introduced — these are
  visibility hints, not a planning bucket.
- **Filter routing wired** — `/projects?missing=target_date`,
  `/projects?missing=phase_dates`, `/tasks?scope=all&missing=phase`, and
  `/tasks?scope=all&missing=due_date` now filter the actual list views and
  show a cleanup banner with a clear action. This turns the planning-health
  overview rows into working drilldowns.

### Done — Priority 3 employee workflow

- **Project clock-in plan** — `components/today-dashboard/clock-in-modal.tsx`
  is now a two-step flow: pick project → "Planned outcome" textarea +
  duration chips (30m/1h/2h/4h/Full day). The server action
  `app/actions/work-sessions.ts:clockIn` now enforces `clock_in_note`
  (planned outcome) and `planned_duration_minutes` for _all_ sessions, not
  just non-project ones.
- **Clock-out copy** — `components/clock-out-modal.tsx` now reads
  "(required for project sessions) — run `/qualia-report`, then click
  Refresh" instead of "(recommended)". The server-side enforcement was
  already correct; only the user-facing label drifted.
- **Work presets isolated** — the hardcoded "Daily Research / Blog" entry
  is gone from the modal. `lib/work-presets.ts` is now the single source of
  truth (one `WORK_PRESETS_BY_EMAIL` constant), with helpers
  `getWorkPresetsForEmail()`, `resolveWorkPresetProjectId()`, and
  `isWorkPresetId()`. New presets bind by stable project ID first, with
  name fallback for the legacy Moayad row. A future admin UI can swap this
  module's constant for a DB-backed lookup without touching the modal.
- **Audited admin override** — new server action
  `adminOverrideClockOut()` force-closes a stuck session for ANY profile,
  appending `[Admin override · ISO] reason` to the summary and inserting
  an `activity_log` row with `action_type='session_admin_overrode'` for
  project sessions. Admin-gated and reason-required.
- **Admin override UI** — `components/portal/control-team.tsx` now exposes
  "Force close" on active team sessions in Control → Team. It opens a reason
  dialog, calls the audited server action, refreshes the admin page, and keeps
  normal employee clock-out as the default path.

### Done — Priority 4 framework reporting

- **Route already accepts the fields** — `app/api/v1/reports/route.ts`
  already had `client_id` (UUID) and `framework_version` in its zod schema
  and persisted both. No route change needed; this was a payload-side
  problem in the framework, not the ERP.
- **Admin completeness panel** — `app/actions/admin-control/system.ts` now
  pulls the last 100 production reports and computes a
  `FrameworkReportCompleteness` payload covering: client_id present,
  framework_version present, client_report_id present, framework_project_id
  present, team_id present, per-user token auth (vs legacy shared key).
  Surfaced in `components/portal/control-system.tsx` as a single panel with
  a 0–100 score and per-gap counts.

### Done — Priority 5 client/admin UX cleanup

- **`/clients` is canonical** — `/admin?tab=clients` already redirects to
  `/clients`; this remains the only behaviour. No competing admin clients
  view exists.
- **Doc the linkage difference** — top-of-file note in
  `app/actions/clients.ts` explains that `projects.client_id` is _ownership_
  while `client_projects` is _portal access_, and that drift between them
  is what `getClientAccessDrift()` flags.
- **Drift detector + warning banner** — new server action
  `getClientAccessDrift()` returns three drift classes (owned but no portal
  access, portal access pointing at a different client, active portal
  access to an Archived/Canceled project). The `/clients` page renders
  `ClientAccessDriftBanner` above the client list; collapsed by default,
  expandable to a row-by-row list with deep links to project + client.

### Done — Priority 6 safe advisor hardening (migration only, not applied)

- **`supabase/migrations/20260428150000_advisor_safe_hardening.sql`** —
  idempotent migration that:
  - Pins `search_path = ''` on `public.api_tokens_scope_is_valid` (pure
    function — no behavioural change).
  - Adds explicit RESTRICTIVE deny-all policies for `anon` and
    `authenticated` on the four `RLS Enabled No Policy` tables flagged by
    the linter: `idempotency_keys`, `session_reports`, `public_bookings`,
    `website_leads`. All four are already server-only in practice; this
    just makes the intent explicit and silences the linter.
- **`supabase/migrations/20260428151000_activity_log_session_override_action.sql`** —
  expands the `activity_log.action_type` check constraint to include
  `session_admin_overrode`, so the admin force-close audit event can persist.

### Quality gates (local, branch `ops-diagnosis-fixes`)

- `npx tsc --noEmit`: passed
- `npm run lint`: passed (zero warnings)
- `npm test -- --runInBand`: 31 suites, 660 tests, 0 failures (5 new tests
  added across two new files)
- `npm run build`: passed

### Not done in this pass / recommended follow-ups

- **Production not yet verified** — these changes have not been deployed,
  authenticated browser QA at three roles (admin/employee/client) is still
  pending, and the advisor migration has not been applied.
- **Per-user `qlt_*` token enforcement** — the framework completeness
  panel surfaces "non-per-user token" reports as a gap, but the API route
  still accepts the legacy `CLAUDE_API_KEY` for backwards compatibility.
  Tightening to per-user only is intentional follow-up work once the
  framework is fully on `qlt_*`.
- **SECURITY DEFINER function exposure** — the advisor flagged ~25
  functions executable by `anon`/`authenticated`. Most are RLS helpers
  (`is_admin`, `is_workspace_member`, etc.) that intentionally need
  authenticated EXECUTE. A line-by-line revoke pass needs careful review
  per function, deferred from this safe-only sweep.
- **Leaked password protection** — Supabase Auth dashboard toggle, not a
  SQL migration. Requires a separate operations step.
- **No password material was logged** — per the rules, I did not consume
  or log any credentials. Any password shared in chat must still be
  rotated.

### Changed files summary

```
app/(portal)/clients/[id]/page.tsx
app/(portal)/clients/[id]/client-detail-view.tsx
app/(portal)/clients/page.tsx
app/(portal)/projects/page.tsx
app/(portal)/projects/projects-client.tsx
app/(portal)/tasks/page.tsx
app/actions/admin-control/index.ts
app/actions/admin-control/overview.ts
app/actions/admin-control/planning-health.ts        (new)
app/actions/admin-control/system.ts
app/actions/admin-control/team.ts
app/actions/clients.ts
app/actions/inbox.ts
app/actions/reports.ts
app/actions/work-sessions.ts
components/clients/client-access-drift-banner.tsx   (new)
components/clients/client-project-access.tsx
components/clock-out-modal.tsx
components/portal/control-team.tsx
components/portal/control-system.tsx
components/portal/qualia-control.tsx
components/portal/qualia-tasks-view.tsx
components/today-dashboard/clock-in-modal.tsx
lib/work-presets.ts                                 (new)
supabase/migrations/20260428150000_advisor_safe_hardening.sql (new)
supabase/migrations/20260428151000_activity_log_session_override_action.sql (new)
__tests__/actions/clients-detail-page.test.ts       (new)
__tests__/actions/reports.test.ts                   (new)
.planning/reports/operations-diagnosis-2026-04-28.md (this file — updated)
```

### Production deployment status (2026-04-28)

The branch `ops-diagnosis-fixes` shipped to production via Vercel.

- **Live commit**: `0636a71` (codex follow-up wiring) on top of `26bfdec` (the
  initial ops-diagnosis fix commit).
- **Vercel deployment**: `dpl_CG9cwuysMk5ujBwjk8W6hzYHtpwe`, aliases include
  `portal.qualiasolutions.net`.
- **Health endpoint**: `/api/health` → 200, version `0636a71`, database `up`,
  latency 115ms (DB), 510–843ms (full request, cold path).
- **Supabase migrations applied to production**:
  - `20260428150000_advisor_safe_hardening.sql`
  - `20260428151000_activity_log_session_override_action.sql`
- **Codex follow-ups already on prod**: `?missing=` query param wiring on
  `/projects` and `/tasks`, the admin "Force close session" button on
  `control-team.tsx` calling `adminOverrideClockOut()`, and the
  `activity_log` action_type CHECK constraint update so the
  `session_admin_overrode` row inserts cleanly.

### Still outstanding after deploy

- **Sentry releases/source maps** — Vercel build warned `SENTRY_AUTH_TOKEN`
  is missing. Releases still report exceptions but without symbolicated
  source maps. Set `SENTRY_AUTH_TOKEN` in the Vercel project env to fix.
- **SECURITY DEFINER bulk hardening** — ~25 functions executable by
  `anon`/`authenticated`. Most are RLS helpers (`is_admin`,
  `is_workspace_member`, etc.) that legitimately need authenticated
  EXECUTE. Needs case-by-case review; intentionally not done in this
  safe-only sweep.
- **Auth leaked-password protection** — Supabase Auth dashboard toggle
  (Authentication → Settings → "Leaked password protection"). Not a SQL
  migration.
- **PageSpeed/CWV check** — was rate-limited (HTTP 429) during the
  deploy verification. Re-run when the quota resets.
- **`.qa-screenshots/` artifacts** — added to `.gitignore` in the next
  commit so future QA runs don't show up as untracked changes.
- **`/api/health` warm-path latency** — 510ms is above the 500ms target
  by a hair. The 115ms DB component is healthy; the headroom comes from
  cold-start. Worth a quick profile pass if it stays above target across
  multiple samples.
