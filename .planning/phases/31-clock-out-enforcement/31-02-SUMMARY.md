---
phase: 31-clock-out-enforcement
plan: '02'
subsystem: clock-out-enforcement
tags: [work-sessions, profiles, swr, settings, banner, ux]
dependency_graph:
  requires: [31-01]
  provides: [planned-logout-banner, beforeunload-guard, work-schedule-settings]
  affects: [app/layout.tsx, app/settings/page.tsx, lib/swr.ts, app/actions/work-sessions.ts]
tech_stack:
  added: []
  patterns:
    - SWR hook with dynamic import for server action fetching
    - beforeunload event guard pattern for active session
    - Time interval polling in React (setInterval + useCallback)
    - Pathname-based banner reset on navigation
key_files:
  created:
    - supabase/migrations/20260327120000_add_planned_logout_time.sql
    - hooks/use-beforeunload-guard.ts
    - components/planned-logout-banner.tsx
    - components/settings/work-schedule-section.tsx
  modified:
    - types/database.ts
    - app/actions/work-sessions.ts
    - lib/swr.ts
    - app/settings/page.tsx
    - app/layout.tsx
decisions:
  - 'Placed PlannedLogoutBanner after SessionGuard in layout so both guards render at same level'
  - 'Banner re-shows on navigation via usePathname to prevent permanent dismissal mid-shift'
  - 'WorkScheduleSection is a standalone client component — keeps settings/page.tsx as server component'
metrics:
  duration_minutes: 6
  completed_date: '2026-03-27'
---

# Phase 31 Plan 02: Planned Logout Banner and Beforeunload Guard Summary

**One-liner:** Amber reminder banner with 60s polling and beforeunload tab-close guard, backed by TIME column on profiles and a settings time picker.

## What Was Built

### Database

- `planned_logout_time TIME DEFAULT NULL` column added to `profiles` table
- Migration `20260327120000_add_planned_logout_time.sql` applied to production

### Server Actions (`app/actions/work-sessions.ts`)

- `getPlannedLogoutTime(workspaceId)` — fetches current user's planned shift end time
- `updatePlannedLogoutTime(workspaceId, time)` — validates HH:MM format, sets or clears the value

### SWR Layer (`lib/swr.ts`)

- `cacheKeys.plannedLogout(wsId)` cache key added
- `usePlannedLogoutTime(workspaceId)` hook with standard `swrConfig`
- `invalidatePlannedLogoutTime(workspaceId, immediate?)` helper

### `hooks/use-beforeunload-guard.ts`

- Activates native browser "Leave site?" dialog when `enabled=true`
- Cleans up listener on unmount/disable

### `components/planned-logout-banner.tsx`

- Renders amber top-of-page bar when: clocked in AND planned time set AND current time past planned time
- Checks time every 60 seconds via `setInterval`
- Dismissable per page visit, resets on `usePathname` change
- Calls `useBeforeunloadGuard(!!session)` — guard is always active when clocked in regardless of banner state

### `components/settings/work-schedule-section.tsx`

- Time input (`<input type="time">`) pre-populated from `usePlannedLogoutTime`
- Save button calls `updatePlannedLogoutTime`, shows sonner toast on success/failure
- Clear button conditionally shown when a value exists

### Layout Integration (`app/layout.tsx`)

- `<PlannedLogoutBanner />` added after `<SessionGuard />`, wrapped in `<Suspense fallback={null}>`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` — zero errors
- `npm run build` — clean build, no warnings
- Settings page has "Work Schedule" section with time picker
- Banner logic: shows when past planned time + clocked in, hides otherwise

## Self-Check: PASSED

Files created/exist:

- supabase/migrations/20260327120000_add_planned_logout_time.sql — FOUND
- hooks/use-beforeunload-guard.ts — FOUND
- components/planned-logout-banner.tsx — FOUND
- components/settings/work-schedule-section.tsx — FOUND

Commits:

- 91c57a9 — Task 1 (migration, types, actions, SWR hook)
- c744ed3 — Task 2 (banner, guard, settings, layout)
