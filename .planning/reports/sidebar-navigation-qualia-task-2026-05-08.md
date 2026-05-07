# Sidebar Navigation Simplification — Qualia Task Spec

Date: 2026-05-08
Branch: `feat/sidebar-navigation-execution-2026-05-08`
Framework route: `/qualia-task`

Status: implemented in working tree on 2026-05-08.

## Goal

Simplify the ERP side menu without changing permissions or data models.

This is a focused rolling-polish task inside M5, not a new milestone.

## Locked Decisions

- Use normal business words only.
- Do not use "Command Center", "Control", "Matrix", "Delivery Records", or cute/internal labels in the sidebar.
- Keep the existing routes where practical; this task is navigation IA first, not a database redesign.
- Clock-in/out remains attendance and shift reporting, not task completion.
- ERP should not expose Qualia phases as primary navigation.
- Qualia phases/tasks stay internal to the framework/build process.

## Target Sidebar

### Admin

- Dashboard -> `/admin`
- Projects -> `/projects`
- Clients -> `/clients`
- Team -> `/admin?tab=team`
- Reports -> `/admin/reports`
- Billing -> `/admin?tab=finance` or `/billing` if keeping the existing billing route
- Knowledge -> `/knowledge`
- Settings -> `/settings`

Team-related pages such as attendance, submissions, employee audit, and reviews should live inside Team as tabs/links, not as top-level sidebar items.

### Employee

- Dashboard -> `/`
- Timesheet -> current clock-in/out surface, likely still on dashboard initially
- Projects -> `/projects`
- Tasks or Submissions -> keep only if there is a useful employee work list today
- Knowledge -> `/knowledge`
- Settings -> `/settings`

### Client

- Dashboard -> `/`
- Projects -> `/projects`
- Requests -> `/requests`
- Messages -> `/messages`
- Billing -> `/billing`
- Settings -> `/settings`

## Implementation Scope

Primary file:

- `components/portal/qualia-sidebar.tsx`

Likely supporting files:

- `components/command-menu.tsx` if command menu labels should match sidebar names.
- `app/api/knowledge/chat/route.ts` if the built-in ERP route explanation should stop mentioning old labels.
- `components/portal/qualia-control.tsx` if the `/admin` tab label "Overview" should become "Dashboard" and "Control" copy should be removed.

## Acceptance Criteria

- Sidebar has fewer top-level items for each role.
- Admin no longer sees "Control" as a sidebar label.
- Admin navigation uses Dashboard, Projects, Clients, Team, Reports, Billing, Knowledge, Settings.
- Employee navigation is limited to their daily work, projects, knowledge, and settings.
- Client navigation remains client-safe and only shows client-facing apps.
- Existing access control stays unchanged.
- Active sidebar highlighting still works for `/admin?tab=team`, `/admin?tab=finance`, `/admin/reports`, `/projects`, `/clients`, `/billing`, and `/settings`.
- Clock button/pill remains available for internal users.
- Build and lint pass.

## Suggested `/qualia-task` Prompt

```text
/qualia-task Simplify the ERP sidebar navigation using normal business labels.

Scope:
- Update components/portal/qualia-sidebar.tsx.
- Keep existing route permissions.
- Use role-based menus:
  Admin: Dashboard, Projects, Clients, Team, Reports, Billing, Knowledge, Settings.
  Employee: Dashboard, Timesheet or current daily work surface, Projects, Knowledge, Settings.
  Client: Dashboard, Projects, Requests, Messages, Billing, Settings.
- Replace "Control" with "Dashboard" in sidebar-facing language.
- Do not expose framework phases/tasks as sidebar concepts.
- Keep clock-in/out available for admins/employees.

Acceptance:
- Navigation is simpler and role-safe.
- Active states work for admin tab links with query strings.
- No route access regression.
- Run lint/build or the closest safe checks.
```

## Notes For Builder

- Read before editing.
- This task should not touch database schema.
- Avoid moving pages unless needed. Prefer route links and labels first.
- If a route does not exist for "Timesheet", do not create a new page in this task; link employees to the existing dashboard/clock surface and leave a follow-up note.
- If Billing for admins is better served by `/admin?tab=finance`, use that. If the existing `/billing` route is client/admin invoice history, leave it for client billing.
