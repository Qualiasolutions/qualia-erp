# Plan: 26 — Status page for employees/managers (assigned projects only)

**Mode:** quick (no-plan)
**Created:** 2026-03-20

## Task 1: Sidebar — expose Status to all roles

**What:** Move "Status" from adminNav to workspaceNav and add `/status` to employeeAllowedHrefs
**Files:** components/sidebar.tsx
**Done when:** Employees and managers see Status in sidebar nav

## Task 2: Status page — filter monitors by assigned projects

**What:** For non-admin users, fetch their project_assignments → get vercel_project_url → filter monitors to only those matching assigned project URLs. Admins see all monitors (unchanged).
**Files:** app/status/page.tsx
**Done when:** Non-admins see only monitors for their assigned projects
