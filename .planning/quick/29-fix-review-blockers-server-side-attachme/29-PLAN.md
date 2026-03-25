# Plan: 29 — Fix review blockers

**Mode:** quick (no-plan)
**Created:** 2026-03-25

## Task 1: Server-side attachment enforcement

**What:** In `quickUpdateTask`, `updateTask`, and `quickToggleTaskStatus`, when status changes to 'Done', check if task has `requires_attachment` set. If so, verify at least one row exists in `task_attachments` before allowing the update.
**Files:** `app/actions/inbox.ts`
**Done when:** Server rejects status=Done when requires_attachment is set but no attachments exist.

## Task 2: Admin-only requires_attachment

**What:** In `updateTask`, only allow `requires_attachment` changes if user is admin. In `createTask`, same check. On client, hide the field for non-admin users.
**Files:** `app/actions/inbox.ts`, `components/edit-task-modal.tsx`, `components/new-task-modal.tsx`
**Done when:** Non-admin users cannot set/clear requires_attachment.

## Task 3: Auth check on uploadTaskAttachment

**What:** Add `canModifyTask()` authorization check in `uploadTaskAttachment` before allowing upload.
**Files:** `app/actions/task-attachments.ts`
**Done when:** Unauthorized users get rejected.

## Task 4: Cleanup MEDIUM items

**What:** Fix useTaskAttachments null vs empty string, clean up meeting-day-sidebar dead code, remove unused props from TeamTaskCard.
**Files:** `components/task-detail-dialog.tsx`, `components/meeting-day-sidebar.tsx`, `components/today-dashboard/team-task-card.tsx`
**Done when:** No dead code, correct null handling.
