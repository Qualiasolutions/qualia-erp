# Quick Task 003: Dashboard Schedule Toggle + Schedule Page Unified View

## Context

- **Dashboard** (`today-page.tsx` → `TodayDashboard` → `ScheduleBlock`): Already has ALL/F/M toggle filter via `filterButtons` in `ScheduleBlock`. This works when 2+ team members exist in profiles. ✅ Already implemented.
- **Schedule page** (`schedule/page.tsx` → `ScheduleContent` → `ScheduleBlock`): Currently shows the same member-split grid as the dashboard. Needs to be changed to a unified single-column view.

## Tasks

### Task 1: Add `unified` mode to ScheduleBlock

**File:** `components/schedule-block.tsx`

**Changes:**

1. Add `unified?: boolean` prop to `ScheduleBlockProps`
2. When `unified=true`:
   - Create a single virtual "all" member that aggregates all schedules
   - Build a `unifiedSchedule` Map that merges all tasks + meetings into single time slots
   - Hide the member filter toggle (no `filterButtons` rendered)
   - Use single-column grid: `56px 1fr` instead of `56px repeat(N, 1fr)`
   - Show a single "Schedule" header instead of member headers
   - The quick-add still works but without member assignment filtering
3. When `unified=false` (default): no changes to existing behavior

### Task 2: Pass `unified={true}` from Schedule page

**File:** `components/schedule-content.tsx`

**Changes:**

1. Pass `unified={true}` to `<ScheduleBlock>` in the day view rendering
2. This makes the schedule page render as a single-column unified timeline

### Task 3: Verify dashboard is unchanged

**File:** `components/today-dashboard/index.tsx`

**Verify:** `<ScheduleBlock>` is called WITHOUT `unified` prop → defaults to `false` → keeps existing ALL/F/M toggle behavior.

## Expected Outcome

- **Dashboard**: Shows member-split schedule with ALL/F/M toggle (already works)
- **Schedule page (day view)**: Shows unified single-column timeline with all meetings and tasks combined
- **Schedule page (week/month)**: Unchanged
