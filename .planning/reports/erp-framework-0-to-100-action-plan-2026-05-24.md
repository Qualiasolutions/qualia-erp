# ERP + Framework 0-to-100 Delivery Action Plan

Date: 2026-05-24  
Repo: `QualiasolutionsCY/qualia-erp`  
Framework repo reviewed: `Qualiasolutions/qualia-framework`  
Status: ERP foundation in progress; phases 1-5 have implementation in this worktree,
with Framework work-packet ingestion and hardening still pending

## Executive Finding

The ERP and Framework are both directionally correct. The ERP has clients,
projects, assignments, deadlines, reports, snapshots, billing, files, and admin
dashboards. The Framework has the project road, planner, builders, verifier,
shipping, handoff, reporting, harness eval, and project snapshot upload.

The missing layer is the operational bridge: an employee should not have to infer
what to do from scattered project cards, reports, roadmap rows, and Framework
state. Each assigned project needs a single work packet and mission surface that
answers:

- What am I responsible for?
- When is it due?
- What is the next Framework command?
- What does done mean?
- What proof exists?
- What is blocking delivery?
- Is this ready for owner review?

## Current ERP Evidence

- `app/actions/project-assignments.ts` already validates assignment deadlines,
  creates `project_assignments`, logs activity, sends assignment email, and
  best-effort syncs GitHub `.planning/` into ERP phase rows.
- `components/portal/assignment-focus-card.tsx` already gives employees a
  deadline-focused assignment card and submit-for-review action.
- `components/portal/qualia-projects-gallery.tsx` already groups projects by
  pipeline stage and shows team avatars, progress, target dates, and GitHub
  presence.
- `components/portal/qualia-roadmap.tsx` and
  `components/portal/roadmap-side-rail.tsx` already display roadmap/phase
  context and assigned team information.
- `components/phase-items-list.tsx` already renders Framework tasks synced from
  `PLAN.md`.
- `components/project-reports-panel.tsx` already shows `/qualia-report` session
  reports for a project.
- `app/api/v1/project-snapshots/route.ts` already accepts Framework project
  snapshots and stores latest snapshot data inside `projects.metadata`.
- `app/actions/admin-control/planning-health.ts` already detects missing project
  deadlines, phase dates, unphased open work, and undated tasks.
- `app/actions/admin-control/command-center.ts` already calculates monthly
  project health using target date, progress, and last report age.

## Current Framework Evidence

- `guide.md` defines the delivery road:
  `/qualia-new -> /qualia-plan -> /qualia-build -> /qualia-verify ->
/qualia-milestone -> /qualia-ship -> /qualia-handoff -> /qualia-report`.
- `docs/erp-contract.md` correctly states that `/qualia-report` is a shift
  submission, not proof that an assigned task is finished.
- `bin/report-payload.js` already uploads ERP identifiers, phase status,
  verification, gap cycles, harness eval, commits, notes, and submitted-by data.
- `bin/project-snapshot.js` already builds and uploads project-level state with
  ERP identifiers, current phase, verification, lifetime counters, and harness
  eval.
- `hooks/session-start.js` already renders the Framework router banner and next
  command at session start.
- `bin/command-surface.js` defines a smaller active command surface and retires
  old helper commands.

## Main Gap

ERP owns the business truth: client, employee, deadline, assignment, review, and
owner approval.

Framework owns the execution truth: planning state, build state, verification,
ship readiness, handoff, reports, and snapshots.

There is no first-class `work_packet` object that joins these truths into a
single daily operating instruction for employees.

## Product Principle

The employee should never ask, "What should I do next on this project?"

The ERP should answer that in one place. The Framework should enforce and report
against that answer.

## Commands To Promote

Only these commands should be shown in ERP-facing instruction surfaces:

- `/qualia`
- `/qualia-new`
- `/qualia-plan`
- `/qualia-build`
- `/qualia-verify`
- `/qualia-fix`
- `/qualia-feature`
- `/qualia-review`
- `/qualia-optimize`
- `/qualia-polish`
- `/qualia-milestone`
- `/qualia-ship`
- `/qualia-handoff`
- `/qualia-report`
- `qualia-framework project-snapshot --upload`
- `qualia-framework eval --run --write`

## Commands To Remove From ERP Teaching

These old or conflicting commands should not appear in employee-facing ERP copy,
templates, docs, or instructions:

- `/workflows:plan`
- `/workflows:review`
- `/workflows:compound`
- `/frontend-master`
- `/pr`
- `/fd`
- `/fb`
- `/sb`
- `/dd`
- `/sf`
- old `/qualia-task` references

Known ERP files to clean:

- `lib/trainee-phase-template.ts`
- `lib/qualia-framework-templates.ts`
- `.planning/reports/sidebar-navigation-qualia-task-2026-05-08.md` stays as
  history, but must not be reused as current instruction.

## Proposed ERP Data Model

Add `project_work_packets`.

Suggested columns:

- `id uuid primary key`
- `workspace_id uuid not null`
- `project_id uuid not null`
- `assignment_id uuid null`
- `employee_id uuid null`
- `deadline_date date not null`
- `current_milestone integer null`
- `current_milestone_name text null`
- `current_phase integer null`
- `current_phase_name text null`
- `next_command text not null`
- `definition_of_done text null`
- `blockers text[] not null default '{}'`
- `repo_url text null`
- `vercel_url text null`
- `framework_status text null`
- `verification text null`
- `snapshot_generated_at timestamptz null`
- `last_report_at timestamptz null`
- `status text not null default 'active'`
- `metadata jsonb not null default '{}'::jsonb`
- `created_by uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Status values:

- `active`
- `blocked`
- `review_requested`
- `approved`
- `completed`
- `superseded`

## Work Packet Generation Rules

Create or update the active work packet when:

- An employee is assigned to a project.
- Assignment deadline changes.
- GitHub planning sync updates current phase.
- A Framework project snapshot is received.
- A `/qualia-report` arrives for the project.
- Owner requests or approves completion.

Initial `next_command` rules:

- No Framework planning state: `/qualia-new` or `/qualia-map`, depending on
  whether the repo is new or existing.
- Planned but not built: `/qualia-build`.
- Built but not verified: `/qualia-verify`.
- Verification failed: `/qualia-fix`.
- Phase passed and more phases remain: `/qualia-milestone`.
- All phases passed but not polished: `/qualia-polish`.
- Polished but not live: `/qualia-ship`.
- Live but not handed off: `/qualia-handoff`.
- End of work session: `/qualia-report`.

## Employee Mission Page

Add a mission surface for each project.

Preferred route:

- `app/(portal)/projects/[id]/mission/page.tsx`

Alternative if project detail routing is not ready:

- Add a mission tab/panel inside the existing project detail surface.

Mission page must show:

- Project name and client.
- Assigned employee.
- Final assignment deadline.
- Days left or overdue state.
- Current milestone and phase.
- Current Framework status.
- Next command.
- Definition of done.
- Open blockers.
- Latest `/qualia-report`.
- Latest project snapshot.
- Verification state.
- Submit-for-review state.
- Owner approval/completion state.

Primary actions:

- Start work.
- Copy next command.
- Open repo.
- Open Vercel deployment.
- Sync planning.
- Upload/read latest snapshot.
- Submit for review.

## Existing UI To Improve

`components/portal/assignment-focus-card.tsx`

- Add "Open mission".
- Add "Next command".
- Add latest report/snapshot freshness.
- Keep deadline as the loudest visual element.

`components/portal/qualia-projects-gallery.tsx`

- Add risk chip:
  - overdue
  - due soon
  - stale report
  - stale snapshot
  - failed verification
  - waiting review
- Add compact employee/deadline/next-command line.

`components/portal/roadmap-side-rail.tsx`

- Add assignment deadline.
- Add active work packet.
- Add latest verification result.
- Add latest report age.
- Add next command.

`components/project-reports-panel.tsx`

- Treat reports as shift evidence.
- Do not imply reports equal completion.
- Surface harness eval when present.

## Owner Delivery Control Page

Add an owner/admin view after the work packet foundation.

Suggested route:

- `app/(portal)/admin/delivery/page.tsx`

It should show exception queues:

- Projects due today.
- Projects due within 3 days.
- Overdue projects.
- Active projects with no deadline.
- Active projects with no employee.
- Active assignments with no work packet.
- Work packets with stale report.
- Work packets with stale snapshot.
- Failed verification.
- Gap cycles greater than 0.
- Waiting for owner review.

Each row should link to the mission page or cleanup action.

## Framework Changes

Do not add a large new slash-command surface.

Add one CLI helper only if needed:

- `qualia-framework work-packet pull --project <erp_project_id>`

Framework files to change after ERP foundation:

- `hooks/session-start.js`
  - Read local work packet if present.
  - Show ERP deadline and next command in the session banner.

- `bin/report-payload.js`
  - Include `work_packet_id`, `assignment_id`, and `assignment_deadline` when
    available.

- `bin/project-snapshot.js`
  - Include `work_packet_id`, `assignment_id`, and `assignment_deadline` when
    available.

- `docs/erp-contract.md`
  - Add Work Packet contract and clarify ownership:
    ERP owns deadline/assignment/review; Framework owns build/verify proof.

Potential local file:

- `.planning/work-packet.json`

Local work packet should include:

- ERP project ID.
- Client ID.
- Assignment ID.
- Work packet ID.
- Deadline.
- Employee.
- Next command.
- Definition of done.
- Repo URL.
- ERP mission URL.

## Implementation Phases

### Phase 1: Command Cleanup

Goal: remove conflicting instruction surfaces.

Scope:

- Clean `lib/trainee-phase-template.ts`.
- Clean `lib/qualia-framework-templates.ts`.
- Replace old commands with current Framework road.
- Add tests or grep checks for retired commands.

Acceptance:

- No current ERP template instructs employees to use retired commands.
- Historical reports can remain unchanged.

### Phase 2: Work Packet Backend

Goal: create one operational record per active assignment/project.

Scope:

- Add migration for `project_work_packets`.
- Add server actions:
  - get active packet for project.
  - get active packet for assignment.
  - generate/upsert packet.
  - update packet status.
- Generate packet during assignment creation.
- Refresh packet during project snapshot ingest.
- Refresh packet during report ingest if enough identifiers exist.

Acceptance:

- Assigning an employee creates an active work packet.
- Existing projects can backfill packets.
- Work packet uses ERP deadline as source of truth.

### Phase 3: Employee Mission Surface

Goal: one page that tells employees what to do next.

Scope:

- Add mission route or mission tab.
- Link from assignment focus card.
- Show deadline, current state, next command, report/snapshot freshness, and
  review status.

Acceptance:

- Employee can open one page and know the project obligation.
- Page is useful even when Framework state is missing.

### Phase 4: Project Cards And Roadmap Side Rail

Goal: make delivery risk visible where owners already look.

Scope:

- Add risk chip and next action to project cards.
- Add packet/deadline/verification block to roadmap side rail.
- Use project metadata Framework snapshot when no packet exists yet.

Acceptance:

- Owner can scan project list and see which work needs attention.
- Roadmap panel explains next command and latest proof.

### Phase 5: Owner Delivery Control

Goal: run the company from exception queues.

Scope:

- Add delivery control data loader.
- Add admin page or command-center tab.
- Group by due soon, overdue, stale report, stale snapshot, failed verification,
  waiting review, no employee, and no packet.

Acceptance:

- Owner does not need to inspect every project manually.
- Every exception links to an action.

### Phase 6: Framework Work Packet Ingestion

Goal: Framework starts with ERP context and reports against it.

Scope:

- Add local `.planning/work-packet.json` support.
- Add CLI pull helper if API exists.
- Show work packet context on session start.
- Include work packet fields in report and snapshot payloads.

Acceptance:

- Framework session banner shows the ERP deadline and next command.
- Reports/snapshots can be traced back to ERP assignment/work packet.

### Phase 7: Hardening

Goal: make the new operating model reliable.

Scope:

- Unit tests for command cleanup.
- Server action tests for packet generation.
- API tests for report/snapshot packet refresh.
- UI smoke coverage for mission page.
- Typecheck and lint.

Acceptance:

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- Focused tests pass.

## Risks And Decisions

Decision needed: whether `project_work_packets` should be a new table or live in
`projects.metadata`.

Recommendation: use a table. Packets have lifecycle, status, ownership, and
query needs. `projects.metadata` is acceptable for latest Framework snapshot,
but not for operational assignment workflow.

Decision needed: whether to add `/qualia-start`.

Recommendation: do not add it. Keep slash commands small. Use ERP "Start work"
to open/copy the right existing command, and use `/qualia` as the router.

Decision needed: whether employees can complete project assignments without
owner approval.

Recommendation: no. Employees can request completion. Owner/admin approves.

## Approval Request

Recommended first approval scope:

1. Phase 1: command cleanup.
2. Phase 2: Work Packet backend.
3. Phase 3: Employee Mission surface.

After those are working, continue to owner delivery control and Framework
ingestion.
