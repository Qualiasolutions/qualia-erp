# Qualia ERP Operations Implementation Plan

Date: 2026-04-28  
Branch: `ops-diagnosis-fixes`  
Source report: `.planning/reports/operations-diagnosis-2026-04-28.md`

## Operating Principle

The ERP should move from "records and pages" to a daily operating system:

- Admins see exceptions first.
- Employees start the day with an owned plan and end it with a report.
- Clients see calm progress, not internal delivery noise.
- The Qualia Framework sends structured evidence into the ERP automatically.
- Any work item that cannot be linked to client, project, phase, task, session, or report lands in a cleanup queue.

## Coordination Plan

Claude is currently working on:

- P2: deadline visibility and missing-deadline admin queue
- P3a: project clock-in planned outcome and duration
- P3b: clock-out copy
- P3c: daily-research preset isolation
- P3d: audited stuck-session override

To avoid collisions, this pass should not rewrite the active clock-in/clock-out files unless needed to resolve compile errors. The safe non-overlapping work is:

- Complete the admin overview planning-health display if the P2 action exists but the component is incomplete.
- Add Framework report completeness visibility in the System tab.
- Write this plan so later implementation can continue in strict priority order.

## Priority Plan

### P1: Silent Data Contract Fixes

Goal: remove places where the UI can silently show empty data because code uses stale DB fields.

Scope:

- `/clients/[id]` uses `projects.status`, not `project_status`.
- `getAssignedVsDone` uses `project_assignments.employee_id` and `removed_at IS NULL`.
- Regression tests pin those contracts.

Acceptance:

- Client detail page can load assigned/available projects from the live schema.
- Assigned-vs-done report returns active assignment rows.
- Tests cover the old column names.

### P2: Deadline Visibility

Goal: make missing planning data visible without bringing back the confusing "unphased" concept.

Scope:

- Admin overview panel counts:
  - active projects without target date
  - active phases without start/target date
  - open project tasks without phase
  - open tasks without due date
- Links route admins to cleanup surfaces.

Next follow-up:

- Make `/projects?missing=...` and `/tasks?missing=...` actually apply filters.
- Add "Needs planning" labels to orphan tasks.

### P3: Employee Daily Flow

Goal: make employee work sessions accountable from the beginning, not only at clock-out.

Scope:

- Clock-in requires planned outcome and planned duration for project work.
- Clock-out says project reports are required, not recommended.
- Daily work presets move out of hardcoded email checks.
- Admin override exists only with audit trail.

Acceptance:

- Project session cannot start without plan text and duration.
- Project session cannot close without report unless admin override is recorded.
- Presets are configured through data/config, not employee email conditionals.

### P4: Framework Report Quality

Goal: make `/qualia-report` data operationally useful, not just stored.

Scope:

- System tab shows last 100 report completeness:
  - `client_report_id`
  - `client_id`
  - `framework_version`
  - `framework_project_id`
  - `team_id`
  - per-user token auth
- Report completeness score appears in admin.

Next follow-up:

- Update Qualia Framework to send missing fields.
- Add report completeness filters in `/admin/reports?tab=framework`.
- Add a client-safe summary approval workflow.

### P5: Admin Command Center

Goal: make the first admin page answer "what needs attention today?"

Scope:

- Clocked-in team
- Missing clock-ins
- Stale sessions
- Missing reports
- Overdue tasks
- Projects at risk
- Client requests waiting
- Failed deploys
- Framework report gaps

Acceptance:

- Admin does not need to open multiple pages to run the day.
- Every widget links to its cleanup action.

### P6: Client Workspace Cleanup

Goal: make client experience simple and confidence-building.

Scope:

- Project status
- Latest approved update
- Next step
- Waiting-on-client items
- Requests/messages/files/invoices

Acceptance:

- Clients do not see internal-only delivery noise.
- Client-visible tasks are either made explicit in nav or retired.

### P7: Integrations And Automations

Goal: reduce manual chasing.

Scope:

- GitHub events into project timeline.
- Vercel deploys into System and project timeline.
- Slack/internal notifications for deadline, report, deploy, and client-request exceptions.
- Calendar integration for meetings and planned work blocks.
- Zoho deeper finance health.

Acceptance:

- Operational exceptions produce alerts.
- Alerts are deduplicated and link back to the ERP source record.

## Applied In This Pass

- Completed the admin Overview `PlanningHealth` card so P2 has a visible UI surface.
- Added System-tab Framework report completeness metrics for P4:
  - completeness score
  - missing client ID
  - missing framework version
  - missing QS report ID
  - missing framework project ID
  - missing team ID
  - non per-user token auth

## Verification Required

Before merging:

- `npx tsc --noEmit`
- `npm run lint`
- `npm test -- --runInBand`
- `npm run build`

Before claiming production fixed:

- deploy to Vercel
- verify `https://portal.qualiasolutions.net/api/health`
- authenticated admin browser check for `/admin`, `/admin?tab=system`, `/clients/[id]`, `/admin/reports?tab=framework`
