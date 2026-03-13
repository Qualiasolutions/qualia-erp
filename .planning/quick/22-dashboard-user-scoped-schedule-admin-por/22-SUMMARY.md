# Summary: Quick Task 22 — Dashboard user-scoped schedule + portal design

## What Changed

### Task 1: Schedule scoping fix (isEmployee → isNonAdmin)

**File:** `components/today-dashboard/index.tsx`

Replaced `isEmployee` (`userRole === 'employee'`) with `isNonAdmin` (`userRole !== 'admin'`) in all 4 locations:

- Header: Plus button and Settings button hidden for non-admins
- ScheduleBlock: profiles filtered to current user only, unified single-column mode, read-only
- BuildingProjectsRow: hidden for non-admins

**Effect:** Managers now see only their own schedule column (same as employees). Admins keep the full multi-column team view.

### Task 2: Portal hub client card polish

**File:** `components/portal/portal-hub.tsx`

- Added teal gradient avatar circle (first letter of client name) to each client card
- Updated last-sign-in label: shows "Last seen X ago" for clients who've logged in, "Never signed in" for those who haven't (previously hidden when no sign-in)

## Verification

- `npx tsc --noEmit` — passes clean
- No `isEmployee` references remain in `components/today-dashboard/index.tsx`
- All 4 user roles handled correctly: admin (full view), manager/employee (scoped view), client (n/a on admin dashboard)
