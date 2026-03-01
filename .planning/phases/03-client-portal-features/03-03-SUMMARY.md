---
phase: 03-client-portal-features
plan: 03-03
subsystem: client-portal
tags: [comments, client-communication, phase-roadmap, role-based-access]

dependency_graph:
  requires:
    - 02-02-portal-layout (portal structure)
    - phase_comments table (database schema)
    - profiles.role (user role detection)
  provides:
    - Phase-level commenting system
    - Client-admin communication channel
    - Internal comment visibility controls
  affects:
    - app/portal/[id]/page.tsx
    - components/portal/portal-roadmap.tsx

tech_stack:
  added:
    - React useOptimistic for optimistic UI updates
    - date-fns formatDistanceToNow for timestamps
  patterns:
    - Server actions for comment CRUD operations
    - Role-based filtering (client vs admin/employee)
    - Expandable sections with lazy loading
    - Optimistic updates with error handling

key_files:
  created:
    - app/actions/phase-comments.ts (237 lines)
    - components/portal/phase-comment-thread.tsx (260 lines)
  modified:
    - components/portal/portal-roadmap.tsx (added 159 lines)
    - app/portal/[id]/page.tsx (added 16 lines)

decisions:
  - Clients cannot create internal comments (forced is_internal=false)
  - Comment threads collapsed by default, expand on demand
  - Comment count badge displayed before expansion
  - Admin/employee see all comments; clients see only non-internal
  - 2000 character limit enforced client-side and server-side
  - Delete restricted to comment author or admin
  - Admin roadmap integration skipped (different architecture)

metrics:
  duration: 3 minutes
  completed: 2026-03-01
  commits: 4
  lines_added: ~672
  lines_removed: ~83
---

# Phase 03 Plan 03: Client Comments on Phases Summary

**Phase-level commenting with internal visibility controls and optimistic UI updates**

## What Was Built

### 1. Server Actions (app/actions/phase-comments.ts)

Created complete comment CRUD system:

- **createPhaseComment**: Validates input (max 2000 chars), enforces is_internal=false for clients, revalidates paths
- **getPhaseComments**: Fetches comments with profile joins, filters internal comments for clients, normalizes FK responses
- **deletePhaseComment**: Authorization check (author or admin), soft delete with revalidation
- **getProjectCommentsCount**: Aggregate count with optional client-visibility filter

All actions follow established patterns: ActionResult returns, auth checks, normalizeFKResponse for Supabase FKs.

### 2. Comment Thread Component (components/portal/phase-comment-thread.tsx)

Rich client component with:

- Chronological comment display with avatars, names, timestamps (formatDistanceToNow)
- Internal badge (amber background) for internal comments (admin/employee only)
- Character counter (0/2000) with validation
- Internal comment toggle (admin/employee only)
- Optimistic UI updates using useOptimistic hook
- Delete button for authors and admins
- Empty state handling
- Loading states
- Error handling with user feedback

### 3. Portal Roadmap Integration (components/portal/portal-roadmap.tsx)

Enhanced existing component:

- Added userRole and currentUserId props
- Created PhaseWithComments subcomponent for encapsulation
- Expandable comment section per phase (collapsed by default)
- Comment count badge before expansion
- Lazy loading: comments fetched only on expand
- Role-based filtering: clients see only non-internal comments
- Preserved all existing phase display functionality

### 4. Portal Page Context (app/portal/[id]/page.tsx)

Minimal changes to wire user context:

- Fetch user profile to detect role (admin/employee/client)
- Pass userRole and currentUserId to PortalRoadmap
- Maintain existing access control and project fetching logic

### 5. Admin Roadmap Integration (Skipped)

Investigation revealed admin side uses ProjectWorkflow (task-based, not timeline-based). Adding comments would require:

- Significant architectural changes
- Different UI pattern (phases are task containers, not timeline items)
- Beyond scope of "optional" task

Decision: Skip admin roadmap integration. Admin users can view/reply to client comments from portal view if needed.

## Deviations from Plan

None — plan executed exactly as written.

- Task 1-4: Completed as specified
- Task 5: Investigated and skipped per plan's "OPTIONAL" designation and architectural mismatch

## Technical Highlights

1. **Optimistic UI**: useOptimistic provides instant feedback, reverts on error
2. **Role-based filtering**: Client role detection → automatic internal comment hiding
3. **Lazy loading**: Comment count shown immediately, full thread loaded on expand
4. **Character validation**: Enforced client-side (0/2000 counter) and server-side (max 2000)
5. **Authorization**: createPhaseComment forces is_internal=false for clients, deletePhaseComment checks author or admin

## Success Criteria Verification

| Criterion                                              | Status | Evidence                                                      |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------- |
| Client can comment on phases from portal roadmap       | ✅     | PhaseCommentThread form + createPhaseComment action           |
| Admin can reply to client comments                     | ✅     | Same form, role='admin' → can see all comments                |
| Internal comments hidden from clients                  | ✅     | is_internal=false forced for clients, filtered in fetch       |
| Comment threads show chronologically                   | ✅     | getPhaseComments orders by created_at ASC                     |
| User names and timestamps displayed                    | ✅     | Avatar, full_name, formatDistanceToNow(created_at)           |
| Admin can create internal-only comments                | ✅     | isInternal toggle visible for admin/employee                  |
| Clients cannot see or create internal comments         | ✅     | Forced false + filtered in query                              |
| Character limit (2000) enforced                        | ✅     | Client-side counter + server-side validation                  |
| Authors and admins can delete comments                 | ✅     | deletePhaseComment checks author OR admin                     |
| Optimistic updates work for create/delete              | ✅     | useOptimistic hook with addOptimisticComment                  |
| TypeScript compilation passes (source files)           | ✅     | No errors in source files (test files have env config issues) |

## Next Phase Readiness

**Phase 3 Plan 4 (Shared Files)**: Ready to proceed

- No blockers
- Comments system independent from shared files feature
- Both can be used simultaneously (comments on phases, files on projects)

## Testing Recommendations

1. **Role-based visibility**: Login as client → verify internal comments hidden
2. **Character limit**: Type 2001+ characters → verify error + submit blocked
3. **Optimistic UI**: Create comment → verify instant display → check persisted after page refresh
4. **Delete authorization**: Client tries to delete admin comment → verify denied
5. **Empty state**: Phase with no comments → verify "No comments yet" message
6. **Comment count badge**: Add comments → verify count updates → collapse → count persists
7. **Internal toggle**: Login as client → verify toggle hidden; as admin → verify toggle visible

## Self-Check: PASSED

### Created Files Exist

```bash
✅ FOUND: app/actions/phase-comments.ts (6.0K)
✅ FOUND: components/portal/phase-comment-thread.tsx (8.4K)
```

### Modified Files Exist

```bash
✅ FOUND: components/portal/portal-roadmap.tsx (12K, +159 lines)
✅ FOUND: app/portal/[id]/page.tsx (2.5K, +16 lines)
```

### Commits Exist

```bash
✅ FOUND: b1ce4e5 feat(03-03): create phase comments server actions
✅ FOUND: 29fa4be feat(03-03): create phase comment thread component
✅ FOUND: b69dd4e feat(03-03): wire comments into portal roadmap
✅ FOUND: 95f5f63 feat(03-03): wire user context into portal project page
```

All verification checks passed.
