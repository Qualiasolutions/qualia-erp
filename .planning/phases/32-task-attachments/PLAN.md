# Phase 32: Task File Attachments

## Goal

Allow users to upload file attachments (including HTML) to tasks, view/download them, and optionally mark tasks as done upon upload — enabling deliverable-based task completion.

## Context

Currently, file uploads exist only at the project level (`project-files.ts` / `project_files` table). Tasks have no attachment support. Hasan's Supabase advisory audit task requires uploading an HTML report as the deliverable, which exposed this gap.

## Dependencies

- Phase 29 (complete) — task system is stable
- Existing `project-files` storage bucket and upload patterns

## Plans

### Plan 32-01: Database + Server Actions

**Goal:** `task_attachments` table exists, server actions for upload/download/delete work, storage bucket path supports task files.

**Tasks:**

1. **Create `task_attachments` table** via Supabase migration:

   ```sql
   create table task_attachments (
     id uuid primary key default gen_random_uuid(),
     task_id uuid not null references tasks(id) on delete cascade,
     workspace_id uuid not null references workspaces(id),
     uploader_id uuid not null references profiles(id),
     file_name text not null,
     file_size bigint not null,
     mime_type text not null,
     storage_path text not null,
     created_at timestamptz default now()
   );

   -- RLS
   alter table task_attachments enable row level security;
   create policy "Users can view attachments in their workspace"
     on task_attachments for select using (
       workspace_id in (select workspace_id from profiles where id = auth.uid())
     );
   create policy "Users can insert attachments"
     on task_attachments for insert with check (uploader_id = auth.uid());
   create policy "Uploaders and admins can delete"
     on task_attachments for delete using (
       uploader_id = auth.uid() or
       exists (select 1 from profiles where id = auth.uid() and role = 'admin')
     );
   ```

2. **Add `text/html` to allowed MIME types** — extend the `ALLOWED_MIME_TYPES` array in upload validation (currently missing from `project-files.ts`)

3. **Create `app/actions/task-attachments.ts`** with:
   - `uploadTaskAttachment(formData)` — validates file, uploads to `project-files` bucket at `tasks/{taskId}/{filename}`, inserts row
   - `getTaskAttachments(taskId)` — returns list with uploader info
   - `deleteTaskAttachment(attachmentId)` — auth check, delete from storage + DB
   - `downloadTaskAttachment(attachmentId)` — returns signed URL

4. **Add SWR hook** `useTaskAttachments(taskId)` in `lib/swr.ts` + `invalidateTaskAttachments(taskId)`

5. **Update types** — add `task_attachments` to `types/database.ts` generated types

**Success Criteria:**

- Upload a file via action → row appears in `task_attachments` → file downloadable via signed URL
- RLS prevents cross-workspace access
- `text/html` files accepted

### Plan 32-02: UI — Attachment Section in Task Detail

**Goal:** Users can upload, view, and download attachments from the task detail dialog.

**Tasks:**

1. **Create `components/task-attachments.tsx`**:
   - Dropzone area (click or drag-and-drop) with file type hints
   - File list showing: icon by type, file name, size, uploader, upload date
   - Download button per file
   - Delete button (for uploader or admin)
   - Upload progress indicator

2. **Integrate into `task-detail-dialog.tsx`**:
   - Add "Attachments" section below description
   - Show file count badge in section header
   - Use `useTaskAttachments(taskId)` hook

3. **Optional "Complete with deliverable" flow**:
   - When uploading to a non-Done task, show checkbox: "Mark task as done"
   - If checked, also calls `updateTask` to set status = 'Done'
   - This enables the "upload HTML to mark as done" workflow

**Success Criteria:**

- User opens task detail → sees attachments section
- Can drag-and-drop or click to upload files (including .html)
- Files appear in list with download/delete options
- "Mark as done" checkbox works when uploading

## Out of Scope

- Inline HTML preview (just download for now)
- File versioning
- Comments on attachments
