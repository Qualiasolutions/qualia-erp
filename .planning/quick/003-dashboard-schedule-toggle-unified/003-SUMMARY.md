# Quick Task 003: Dashboard Schedule Toggle + Schedule Page Unified View Summary

**One-liner:** Added unified single-column schedule mode to ScheduleBlock, enabled on schedule page while preserving dashboard's member-split view with ALL/F/M toggle.

## Metadata

- **Date:** 2026-03-02
- **Duration:** ~3 minutes
- **Tasks completed:** 3/3
- **Commits:** 2

## Objective

Split the schedule rendering behavior:

- **Dashboard**: Keep existing member-split grid with ALL/F/M toggle filter
- **Schedule page (day view)**: Show unified single-column timeline merging all tasks/meetings

## Implementation

### Task 1: Add unified mode to ScheduleBlock

**File:** `components/schedule-block.tsx`

**Changes:**

1. Added `unified?: boolean` prop (defaults to `false`)
2. Created `unifiedSchedule` memo that merges all scheduled tasks and meetings into single time slots
3. Modified `filteredMembers` to return single virtual "Schedule" column when unified
4. Conditionally hid member filter toggle when `unified=true`
5. Updated member headers to show plain "Schedule" text without avatar/options in unified mode
6. Changed task cell rendering to display ALL items per time slot in unified mode (vs first item only in member mode)

**Key implementation details:**

- Unified schedule aggregates ALL tasks regardless of assignee
- All meetings included without attendee filtering
- Single-column grid layout (`56px 1fr`) instead of member-split
- Multiple items per time slot rendered vertically with dividers
- Quick-add button still works but doesn't filter by member

**Commit:** `c0a1382`

### Task 2: Pass unified=true from Schedule page

**File:** `components/schedule-content.tsx`

**Changes:**

1. Added `unified={true}` prop to `<ScheduleBlock>` in day view
2. Added comment clarifying this enables single-column unified timeline

**Result:** Schedule page now shows merged timeline without member columns.

**Commit:** `9011fc1`

### Task 3: Verify dashboard unchanged

**File:** `components/today-dashboard/index.tsx`

**Verification:** Confirmed `<ScheduleBlock>` is called WITHOUT `unified` prop, so it defaults to `false` and maintains existing ALL/F/M toggle behavior.

**No changes required** - backward compatibility preserved.

## Technical Details

### Component Behavior Matrix

| Mode    | Grid Layout           | Columns    | Filter Toggle | Items/Slot | Use Case      |
| ------- | --------------------- | ---------- | ------------- | ---------- | ------------- |
| Member  | `56px repeat(N, 1fr)` | Per member | YES (ALL/F/M) | First only | Dashboard     |
| Unified | `56px 1fr`            | Single     | NO            | All items  | Schedule page |

### Schedule Building Logic

**Member mode (existing):**

- Creates `memberSchedule` Map: `memberId → (hour → tasks[])`
- Tasks assigned to specific members based on `assignee_id`
- Meetings assigned to attendees or creator
- Unassigned items go to first member

**Unified mode (new):**

- Creates `unifiedSchedule` Map: `hour → tasks[]`
- ALL scheduled tasks included regardless of assignee
- ALL meetings included
- No member filtering or assignment logic

### UI Differences

**Dashboard (member mode):**

- Member avatars + names in headers
- "More options" button per member
- ALL/F/M filter buttons (when 2+ members)
- Single task shown per time slot/member
- Quick-add assigns to filtered member

**Schedule page (unified mode):**

- Plain "Schedule" text in header
- No avatar, no options button
- No filter buttons
- All tasks/meetings shown per time slot
- Quick-add creates unassigned task

## Testing Notes

### Manual verification needed:

1. **Dashboard** (`/` route):
   - [ ] Member-split columns visible
   - [ ] ALL/F/M toggle buttons shown (when 2+ team members)
   - [ ] Filtering by member works
   - [ ] One task per time slot per member
   - [ ] Quick-add assigns to filtered member

2. **Schedule page** (`/schedule` route, day view):
   - [ ] Single "Schedule" column
   - [ ] No filter buttons
   - [ ] All tasks/meetings merged into time slots
   - [ ] Multiple items per slot shown vertically
   - [ ] Quick-add works (creates unassigned task)

3. **Schedule page week/month views:**
   - [ ] Unchanged (don't use ScheduleBlock)

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

| File                              | Changes                  | Lines Changed         |
| --------------------------------- | ------------------------ | --------------------- |
| `components/schedule-block.tsx`   | Added unified mode logic | ~116 net (+258, -142) |
| `components/schedule-content.tsx` | Pass unified prop        | +1                    |

**Total:** 2 files, ~117 lines changed

## Commits

1. **c0a1382** - `feat(quick-003): add unified mode to ScheduleBlock`
   - Core unified schedule implementation
   - Conditional rendering logic
   - Filter toggle hiding
   - Multi-item cell rendering

2. **9011fc1** - `feat(quick-003): pass unified=true to ScheduleBlock in schedule page`
   - Enable unified mode for schedule page day view
   - Dashboard behavior preserved via default prop

## Impact

### User Experience

- **Dashboard users**: No change - existing member-split view works as before
- **Schedule page users**: Cleaner unified timeline showing all work at a glance
- **Consistency**: Both pages use same ScheduleBlock component with different modes

### Technical Debt

None introduced. Implementation:

- Maintains backward compatibility (default prop)
- Reuses existing schedule rendering logic
- No duplication - single component with mode flag

### Performance

Negligible impact:

- Unified schedule is memoized (only rebuilds on data change)
- Rendering logic is conditional (one path or the other)
- No additional API calls or queries

## Next Steps

None required - feature is complete and isolated.

**Optional future enhancements:**

- Add drag-and-drop to unified schedule
- Allow toggling unified mode on dashboard
- Persist user's preferred schedule view

## Self-Check: PASSED

**Created files exist:**

```bash
✓ components/schedule-block.tsx (modified)
✓ components/schedule-content.tsx (modified)
```

**Commits exist:**

```bash
✓ c0a1382: feat(quick-003): add unified mode to ScheduleBlock
✓ 9011fc1: feat(quick-003): pass unified=true to ScheduleBlock in schedule page
```

All verifications passed.
