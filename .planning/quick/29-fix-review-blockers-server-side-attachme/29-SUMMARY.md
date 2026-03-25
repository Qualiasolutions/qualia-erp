# Summary: 29 — Fix review blockers

**Completed:** 2026-03-25

## Changes

### CRITICAL Fix: Server-side attachment enforcement

- Added `checkAttachmentRequirement()` helper in `app/actions/inbox.ts`
- Enforced in `updateTask`, `quickUpdateTask`, `quickToggleTaskStatus`
- When status → Done, checks if `requires_attachment` is set and verifies attachments exist
- Returns descriptive error if blocked

### HIGH Fix: Admin-only requires_attachment

- Server: `createTask` and `updateTask` only allow `requires_attachment` changes for admins
- Client: `edit-task-modal.tsx` and `new-task-modal.tsx` hide the field for non-admin users
- Uses `useAdminContext()` hook for client-side role check

### HIGH Fix: Upload auth check

- Added `canModifyTask()` authorization check in `uploadTaskAttachment` (`task-attachments.ts`)
- Prevents unauthorized users from uploading to any task by ID

### MEDIUM Fixes

- `task-detail-dialog.tsx`: `useTaskAttachments(task?.id ?? null)` instead of `''` — prevents unnecessary SWR fetch
- `meeting-day-sidebar.tsx`: Rewritten for today-only, removed dead week code
- `team-task-card.tsx`: Removed dead comment on unused prop

### DB Performance (Supabase Advisors)

- Fixed 17 `auth_rls_initplan` WARNs — `(SELECT auth.uid())` subselect pattern
- Fixed 18 `multiple_permissive_policies` WARNs — merged/scoped duplicate policies
- Added 6 FK indexes, dropped 14 unused indexes
- Added RLS policy to `claude_sessions`

## Result

- Review blockers: 1 CRITICAL + 2 HIGH → all resolved
- Supabase advisors: 35 WARNs → 0
