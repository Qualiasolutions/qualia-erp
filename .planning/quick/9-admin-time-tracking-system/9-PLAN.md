---
type: execute
wave: 1
depends_on: []
files_modified:
  - app/time-tracking/page.tsx
  - app/actions/time-tracking.ts
  - lib/validation.ts
  - lib/swr.ts
  - components/sidebar.tsx
  - types/database.ts
autonomous: true
user_setup:
  - service: supabase
    why: 'Time tracking table and RLS policies'
    env_vars: []
    dashboard_config:
      - task: 'Create time_entries table'
        location: 'Supabase Dashboard -> Table Editor'
        details: |
          SQL migration needed:
          ```sql
          CREATE TABLE time_entries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
            project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
            task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
            description TEXT,
            start_time TIMESTAMPTZ NOT NULL,
            end_time TIMESTAMPTZ,
            duration_seconds INTEGER,
            entry_date DATE NOT NULL,
            is_running BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );

          CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, entry_date);
          CREATE INDEX idx_time_entries_project ON time_entries(project_id);
          CREATE INDEX idx_time_entries_running ON time_entries(is_running) WHERE is_running = TRUE;

          -- RLS Policies
          ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

          -- Admins see all entries
          CREATE POLICY "Admins can view all time entries"
            ON time_entries FOR SELECT
            USING (
              EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
              )
            );

          -- Users see their own entries
          CREATE POLICY "Users can view own time entries"
            ON time_entries FOR SELECT
            USING (user_id = auth.uid());

          -- Users can insert their own entries
          CREATE POLICY "Users can insert own time entries"
            ON time_entries FOR INSERT
            WITH CHECK (user_id = auth.uid());

          -- Users can update their own entries
          CREATE POLICY "Users can update own time entries"
            ON time_entries FOR UPDATE
            USING (user_id = auth.uid());

          -- Users can delete their own entries
          CREATE POLICY "Users can delete own time entries"
            ON time_entries FOR DELETE
            USING (user_id = auth.uid());
          ```

must_haves:
  truths:
    - 'Admin can see time tracking tab in sidebar'
    - 'User can start a timer and see it running'
    - 'User can stop a timer and see the entry saved'
    - 'User can manually add a time entry'
    - 'User can view daily time entries'
    - 'User can view weekly summary'
    - "Admin can see all users' time entries"
  artifacts:
    - path: 'app/time-tracking/page.tsx'
      provides: 'Time tracking UI with timer, manual entry, and reports'
      min_lines: 300
    - path: 'app/actions/time-tracking.ts'
      provides: 'Server actions for time entry CRUD'
      exports: ['startTimer', 'stopTimer', 'createTimeEntry', 'getTimeEntries', 'getWeeklySummary']
    - path: 'lib/validation.ts'
      provides: 'Zod schemas for time entries'
      contains: 'createTimeEntrySchema'
    - path: 'lib/swr.ts'
      provides: 'SWR hook for time entries'
      contains: 'useTimeEntries'
  key_links:
    - from: 'app/time-tracking/page.tsx'
      to: 'app/actions/time-tracking.ts'
      via: 'server action calls'
      pattern: '(startTimer|stopTimer|createTimeEntry)'
    - from: 'components/sidebar.tsx'
      to: '/time-tracking'
      via: 'admin nav section'
      pattern: 'name.*Time.*href.*time-tracking'
---

<objective>
Create a complete time tracking system in the admin section of the ERP. Admins can track time spent on projects/tasks with start/stop timer functionality, manual entries, and reporting views.

Purpose: Enable time tracking for project management and billing purposes
Output: Functional time tracking page with timer, manual entry, daily/weekly views, and admin-only access
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/home/qualia/Projects/live/qualia/CLAUDE.md
@/home/qualia/Projects/live/qualia/components/sidebar.tsx
@/home/qualia/Projects/live/qualia/app/actions/shared.ts
@/home/qualia/Projects/live/qualia/lib/validation.ts
@/home/qualia/Projects/live/qualia/lib/swr.ts
@/home/qualia/Projects/live/qualia/app/admin/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create database schema and server actions</name>
  <files>
    app/actions/time-tracking.ts
    lib/validation.ts
    lib/swr.ts
    types/database.ts
  </files>
  <action>
Create time tracking server actions following existing patterns from app/actions/*.ts:

**app/actions/time-tracking.ts:**

- Import ActionResult from './shared', createClient from '@/lib/supabase/server', validation schemas
- Implement `startTimer(projectId?, taskId?, description?)` → creates entry with start_time, is_running=true, returns entry
- Implement `stopTimer(entryId)` → updates end_time, calculates duration_seconds, sets is_running=false
- Implement `createTimeEntry(data)` → manual entry creation with project/task, date, duration
- Implement `updateTimeEntry(id, data)` → update description, project, task, duration
- Implement `deleteTimeEntry(id)` → soft delete or hard delete with permission check
- Implement `getTimeEntries(userId?, date?)` → fetch entries filtered by user (if provided) and date
- Implement `getDailyTimeEntries(date)` → fetch all entries for a specific date, admin sees all, users see own
- Implement `getWeeklySummary(startDate, endDate, userId?)` → aggregate hours by project/user
- Implement `getRunningTimer(userId)` → fetch current running timer for user
- All actions must check auth via supabase.auth.getUser()
- Admin check: use isUserAdmin() or isUserManagerOrAbove() from './shared'
- Return ActionResult type for all actions
- Use revalidatePath('/time-tracking') after mutations

**lib/validation.ts:**

- Add createTimeEntrySchema: user_id (uuid), project_id (uuid, optional), task_id (uuid, optional), description (string, max 500), start_time (string), end_time (string, optional), duration_seconds (number, optional), entry_date (string)
- Add updateTimeEntrySchema: id (uuid), description, project_id, task_id, duration_seconds (all optional)
- Export CreateTimeEntryInput and UpdateTimeEntryInput types

**lib/swr.ts:**

- Add cache key: `timeEntries: (date: string) => `time-entries-${date}``, `runningTimer: (userId: string) => `running-timer-${userId}``
- Add useTimeEntries(date: string) hook → calls getTimeEntries via SWR with autoRefreshConfig
- Add useRunningTimer(userId: string) hook → calls getRunningTimer via SWR with autoRefreshConfig (30s refresh for live timer)
- Add invalidateTimeEntries(date: string, immediate = true) → mutate cache
- Add invalidateRunningTimer(userId: string, immediate = true) → mutate cache

**types/database.ts:**

- Add comment at top noting time_entries table exists but not auto-generated yet
- Add manual type export: `export type TimeEntry = { id: string; user_id: string; workspace_id: string | null; project_id: string | null; task_id: string | null; description: string | null; start_time: string; end_time: string | null; duration_seconds: number | null; entry_date: string; is_running: boolean; created_at: string; updated_at: string; }`

Follow existing patterns: normalizeFKResponse for foreign keys, validate with Zod before DB operations, handle errors with try/catch.
</action>
<verify>
Run `npx tsc --noEmit` to verify TypeScript compilation
Check that all exports are present: `grep -E "(startTimer|stopTimer|createTimeEntry)" app/actions/time-tracking.ts`
</verify>
<done>
Server actions file exists with all CRUD operations, validation schemas added, SWR hooks configured, types defined. No TypeScript errors.
</done>
</task>

<task type="auto">
  <name>Task 2: Create time tracking UI page</name>
  <files>
    app/time-tracking/page.tsx
  </files>
  <action>
Create admin-only time tracking page following patterns from app/admin/page.tsx:

**Structure:**

- 'use client' directive at top
- Check admin status via useAdminContext() → redirect if not admin/manager
- Use shadcn/ui components: Button, Select, Table, Card, Input, Textarea, Badge
- Import icons from lucide-react: Clock, Play, Square, Plus, Calendar, TrendingUp
- Three main sections: Timer Widget, Manual Entry Form, Time Log View

**Timer Widget (top section):**

- Display current running timer (if any) with live elapsed time counter
- Show project/task (if selected), description
- Start button → opens quick form (project selector, task selector, description input) → calls startTimer()
- Stop button → calls stopTimer(entryId) → invalidates cache
- Use useRunningTimer() hook for live data
- Use useEffect with setInterval(1000) to update elapsed time display

**Manual Entry Form (collapsible):**

- Date picker (default: today)
- Project selector (dropdown from useProjects())
- Task selector (dropdown filtered by project from useProjectTasks())
- Description textarea
- Duration input (hours:minutes format, e.g., "2:30")
- Submit → calls createTimeEntry() → invalidates cache
- Clear button to reset form

**Time Log View (main section):**

- Tabs: "Daily" and "Weekly"
- Daily tab:
  - Date picker (default: today)
  - Table: Start Time | End Time | Duration | Project | Task | Description | Actions
  - Show entries from useDailyTimeEntries(selectedDate)
  - Each row: Edit icon → inline edit, Delete icon → deleteTimeEntry()
  - Total hours at bottom
- Weekly tab:
  - Week picker (default: current week)
  - Summary cards: Total hours, Hours by project (bar chart or list)
  - Table: Date | Project | Total Hours
  - Use getWeeklySummary() for data

**Styling:**

- Clean admin panel aesthetic (match app/admin/page.tsx)
- Use Tailwind utility classes
- Responsive layout (stack on mobile)
- Loading states with skeleton loaders
- Error states with error messages
- Success toasts on actions (use sonner if available, or simple alerts)

**Permissions:**

- Admin sees all users' entries with user filter dropdown
- Employees see only their own entries
- Check role via useAdminContext() or getUserRole()
  </action>
  <verify>

1. Navigate to http://localhost:3000/time-tracking as admin → page loads
2. Start a timer → running timer appears with live counter
3. Stop timer → entry appears in daily log
4. Add manual entry → appears in daily log
5. Switch to weekly view → summary displays
6. Run `npm run build` → no build errors
   </verify>
   <done>
   Time tracking page exists at /time-tracking with timer widget, manual entry form, daily/weekly views. Admin can access, employees restricted. Timer starts/stops, manual entries save, views display correctly.
   </done>
   </task>

<task type="auto">
  <name>Task 3: Add sidebar navigation and update action exports</name>
  <files>
    components/sidebar.tsx
    app/actions/index.ts
  </files>
  <action>
**components/sidebar.tsx:**
- Import Clock icon from lucide-react
- Add new nav item to `adminNav` array (line ~48): `{ name: 'Time Tracking', href: '/time-tracking', icon: Clock }`
- Nav item will automatically show only for managers/admins via existing `isManagerOrAbove` check (line ~236)

**app/actions/index.ts:**

- Add comment section: `// ============ TIME TRACKING ============`
- Export all time tracking actions:
  ```typescript
  export {
    startTimer,
    stopTimer,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    getTimeEntries,
    getDailyTimeEntries,
    getWeeklySummary,
    getRunningTimer,
  } from './time-tracking';
  export type { TimeEntry } from '@/types/database';
  ```

Follow existing patterns in the file: group by domain, add comments, maintain alphabetical order within exports.
</action>
<verify>

1. Restart dev server: `npm run dev`
2. Login as admin → "Time Tracking" appears in sidebar Admin section
3. Click "Time Tracking" → navigates to /time-tracking
4. Check imports work: `grep "startTimer" app/time-tracking/page.tsx` should import from '@/app/actions'
   </verify>
   <done>
   Sidebar shows "Time Tracking" tab for admins/managers only. Navigation works. Action exports available from @/app/actions. Dev server runs without errors.
   </done>
   </task>

</tasks>

<verification>
**End-to-end flow:**
1. Admin logs in → sees "Time Tracking" in sidebar
2. Clicks Time Tracking → page loads
3. Starts timer with project + description → timer runs with live counter
4. Stops timer → entry appears in daily log with calculated duration
5. Adds manual entry → entry appears immediately
6. Switches to weekly view → shows aggregated hours
7. Employee logs in → does NOT see Time Tracking tab (or sees only their own entries if accessed directly)

**Database verification:**

- time_entries table exists in Supabase
- RLS policies enforce admin-sees-all, users-see-own rules
- Indexes improve query performance

**Code quality:**

- No TypeScript errors: `npx tsc --noEmit`
- No build errors: `npm run build`
- Follows existing patterns from app/actions/\*.ts and lib/swr.ts
  </verification>

<success_criteria>

- [ ] Time tracking page accessible at /time-tracking
- [ ] Sidebar shows "Time Tracking" for admins/managers only
- [ ] Timer can start/stop with live elapsed time display
- [ ] Manual entries can be created with project/task association
- [ ] Daily view shows entries for selected date
- [ ] Weekly view shows aggregated summary
- [ ] Admin sees all entries, employees see only their own
- [ ] All server actions return ActionResult type
- [ ] SWR hooks provide real-time updates
- [ ] No TypeScript or build errors
- [ ] Zod validation on all inputs
- [ ] RLS policies enforce permissions
      </success_criteria>

<output>
After completion, create `.planning/quick/9-admin-time-tracking-system/9-SUMMARY.md`
</output>
