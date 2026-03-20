# Summary: 26 — Status page for employees/managers (assigned projects only)

**Date:** 2026-03-20

## Changes

### 1. Sidebar — Status visible to all roles

- Moved "Status" from `adminNav` to `workspaceNav` in `components/sidebar.tsx`
- Added `/status` to `employeeAllowedHrefs` so employees see it

### 2. Status page — role-based monitor filtering

- **Admins**: See all monitors (unchanged behavior)
- **Employees/Managers**: See only monitors matching their assigned projects' `vercel_project_url`
- URL matching compares monitor hostnames against project URLs from `project_assignments` table
- If employee has no project assignments, shows empty state

## Files Modified

- `components/sidebar.tsx` — nav restructure
- `app/status/page.tsx` — auth + assignment-based filtering
