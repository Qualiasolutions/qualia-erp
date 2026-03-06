# Summary: 8 — Replace Sally with Hasan, employee role-based access

**Completed:** 2026-03-06
**Commit:** 9aa8c86

## Changes Made

### 1. Replaced Sally with Hasan

- Removed `SALLY_ID` from `lib/team-constants.ts`
- Removed Sally from meeting modal team list (`components/edit-meeting-modal.tsx`)
- Removed Sally's color config from `lib/color-constants.ts`
- Hasan was already in all 3 files — just cleaned up Sally references

### 2. Employee route restrictions (middleware.ts)

- Employees can only access: `/` (dashboard), `/schedule`, `/knowledge`
- All other routes redirect to `/`
- Auth and API routes remain accessible

### 3. Sidebar nav filtering (components/sidebar.tsx)

- Employee role sees only Dashboard, Schedule, Knowledge nav items
- Portal, Projects, Clients, Admin sections hidden for employees

### 4. SQL migration

- `supabase/migrations/20260306000000_setup_hasan_employee.sql`
- Sets `hasan@qualiasolutions.net` role to `employee`, full_name to `Hasan`
- Applied to production Supabase

## How It Works

- Schedule on dashboard dynamically shows columns per workspace profile
- Hasan appears as 3rd column alongside Fawzi and Moayad
- Admins can assign tasks/meetings to any team member
- Hasan sees only his allowed pages
