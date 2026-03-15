# Qualia ERP — Fix & Complete Checklist

**Context**: Portal + Trainee system is ~65% production-ready. Features are built, but security holes, duplicate code, and missing polish need fixing before shipping to clients.

**How to use**: Work through each section in order (P0 → P1 → P2 → P3 → P4). Each item has the exact file, line, and fix.

---

## P0 — SECURITY (do first, non-negotiable)

### 1. Add admin auth to migrateAllProjectsToGSD()

**File**: `app/actions/pipeline.ts` ~line 1141
**Problem**: Any authenticated user can call this function and it deletes ALL phases and tasks across ALL projects. Zero auth check.
**Fix**:

```typescript
export async function migrateAllProjectsToGSD() {
  const adminCheck = await isUserAdmin();
  if (!adminCheck) return { success: false, error: 'Admin access required' };
  // ... rest of existing code
}
```

### 2. Create admin layout guard

**File**: Create `app/admin/layout.tsx` (does NOT exist yet)
**Problem**: Middleware only blocks clients from `/admin/*`, not employees. Any employee can access admin pages.
**Fix**: Create this file:

```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/');

  return <>{children}</>;
}
```

### 3. Remove hardcoded user IDs

**File**: `components/today-dashboard/daily-schedule-grid.tsx` ~line 330-331
**Problem**: `FAWZI_ID` and `MOAYAD_ID` are hardcoded UUIDs in a client component. Breaks when adding team members.
**Fix**: Import from profiles or a shared constants file. Query profiles table for admin/employee roles instead of matching UUIDs.

---

## P1 — CODE CONSOLIDATION (biggest ROI, saves ~3,400 lines)

### 4. Merge 3 duplicate schedule grids into 1

**Files** (all implement the same thing — time grid, task/meeting cards, drag-drop, edit modals):

- `components/today-dashboard/daily-schedule-grid.tsx` (793 lines)
- `components/schedule-block.tsx` (952 lines) ← **keep this one, most complete**
- `components/day-view.tsx` (898 lines)

**Fix**: Create a single `<ScheduleGrid variant="dashboard" | "full" | "compact">` component using `schedule-block.tsx` as the base. Replace imports in all consumers. Delete the other two files.

### 5. Delete dead code (867 lines, zero imports anywhere)

Delete these files — they are imported by nothing:

- `components/project-health-monitor.tsx` (510 lines)
- `components/team/daily-schedule-hub.tsx` (139 lines)
- `components/team/time-block-grid.tsx` (135 lines)
- `components/team/schedule-header.tsx` (86 lines)

Verify with: `grep -r "project-health-monitor\|daily-schedule-hub\|time-block-grid\|schedule-header" --include="*.tsx" --include="*.ts" app/ components/ lib/`

### 6. Extract duplicate meeting constants

**Duplicated in**: `new-meeting-modal.tsx`, `new-meeting-modal-inline.tsx`, `edit-meeting-modal.tsx`
**Fix**: Create `lib/meeting-constants.ts` with shared `TIME_SLOTS` and `DURATION_OPTIONS`. Import in all three files.

### 7. Extract portal shared components

**Duplicated in**: 3 portal sub-pages (files, updates, etc.)
**Fix**: Create `components/portal/portal-page-header.tsx` with back button + title pattern. Replace copy-pasted headers.

### 8. Extract getProjectStatusColor()

**Duplicated in**: `portal-projects-list.tsx` and `portal-roadmap.tsx`
**Fix**: Move to `lib/portal-styles.ts`, import in both.

---

## P2 — BUG FIXES

### 9. Fix stale closure in schedule grid

**File**: `components/today-dashboard/daily-schedule-grid.tsx` ~line 399
**Problem**: `handleComplete` callback captures stale `tasks` array.
**Fix**: Use functional state update or add `tasks` to the dependency array of the callback.

### 10. Fix stale optimistic update in comment thread

**File**: `components/portal/phase-comment-thread.tsx`
**Problem**: Failed comment creation leaves a ghost comment in the UI — no rollback on error.
**Fix**: On catch, remove the optimistically-added comment from state.

### 11. Fix race condition in reviews queue

**File**: `components/admin/reviews-queue.tsx` (or similar)
**Problem**: Rapid approve/reject clicks cause state corruption.
**Fix**: Use a `Set<string>` of pending action IDs. Disable buttons while an action is in-flight for that specific review.

### 12. Add error handling to schedule page

**File**: `app/schedule/page.tsx`
**Problem**: Uses `Promise.all` for data fetching with no try-catch. If any query fails, entire page crashes.
**Fix**: Wrap in try-catch, show error state.

### 13. Add email validation to portal admin invite

**File**: `components/portal/portal-admin-panel.tsx`
**Problem**: Client invite flow has no email validation.
**Fix**: Add Zod email validation before submitting invite.

---

## P3 — RESPONSIVE & MOBILE

### 14. Fix portal admin table overflow

**File**: `components/portal/portal-admin-panel.tsx`
**Problem**: Two `<Table>` components with no overflow wrapper. Breaks on mobile.
**Fix**: Wrap each table in `<div className="overflow-x-auto">`.

### 15. Add responsive breakpoints to admin pages

**Files**: Admin pages using fixed `p-8` padding
**Fix**: Change to `p-4 md:p-8`. Review card layouts should stack on mobile with `flex-col md:flex-row`.

### 16. Fix dialog overflow on mobile

**Files**: Portal dialogs
**Fix**: Add `max-h-[90vh] overflow-y-auto` to dialog content containers.

### 17. Add mobile breakpoints to schedule grids

**Problem**: Fixed grid column widths with no responsive adjustment.
**Fix**: After consolidating grids (#4), add responsive column behavior.

---

## P4 — PHASE 3 COMPLETION (polish & ship)

### 18. Email notifications for review workflow

**Status**: Resend is integrated but only basic emails work. Daily digest is stubbed.
**Need**:

- "Phase submitted for review" → email to admin
- "Phase approved" / "Changes requested" → email to trainee
- "New update on your project" → email to client
  **File**: `lib/email.ts` — extend existing Resend integration.

### 19. Add tests for portal + trainee workflows

**Status**: Only 4 basic tests exist. Zero coverage on new features.
**Need** (minimum):

- Trainee completes tasks → submits phase → admin approves → next phase unlocks
- Admin requests changes → trainee sees feedback → resubmits
- Client logs in → sees project → downloads file → leaves comment
- Client cannot see internal comments or task details
- RLS: client can't access other clients' projects

### 20. Pagination on activity feeds

**Status**: Activity feed has a `LIMIT` but no cursor pagination.
**Fix**: Add cursor-based pagination using `created_at` as cursor. Add "Load more" button in `components/portal/activity-feed.tsx`.

### 21. Consolidate 3 schedule utility files

**Files**: `lib/schedule-utils.ts`, `lib/schedule-shared.ts`, `lib/schedule-constants.ts`
**Fix**: Merge into 2 files max: `lib/schedule-constants.ts` (static values) and `lib/schedule-utils.ts` (functions).

### 22. Standardize date formatting across portal

**Problem**: 3 different date formatting approaches in portal components.
**Fix**: Create `lib/format-date.ts` with standard formatters. Use everywhere.

### 23. Add ARIA labels to icon-only buttons

**Files**: 3 portal pages have back buttons with no ARIA labels.
**Fix**: Add `aria-label="Go back"` to all icon-only buttons.

### 24. Create useServerAction hook

**Problem**: Form submission pattern repeated 20+ times across the app.
**Fix**: Create `hooks/use-server-action.ts` that handles loading state, error handling, and toast notifications.

---

## Verification After Fixes

Run these checks after completing all items:

```bash
# 1. Build succeeds
npm run build

# 2. No TypeScript errors
npx tsc --noEmit

# 3. Lint passes
npm run lint

# 4. Tests pass
npm test

# 5. No dead code (should return 0 results)
grep -r "project-health-monitor\|daily-schedule-hub\|time-block-grid\|schedule-header" --include="*.tsx" --include="*.ts" app/ components/ lib/

# 6. No hardcoded user IDs
grep -r "696cbe99-20fe-437c-97fe-246fb3367d9b\|e0472b7b-4378-4311-9c45-9d3e8ca94bd2" --include="*.tsx" --include="*.ts" app/ components/ lib/

# 7. Admin layout guard exists
test -f app/admin/layout.tsx && echo "EXISTS" || echo "MISSING"
```

---

**Total items**: 24
**Estimated effort**: 3-4 focused dev days
**Expected savings**: ~3,400 lines of code removed/consolidated
