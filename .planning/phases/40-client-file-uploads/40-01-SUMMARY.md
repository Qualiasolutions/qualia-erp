---
phase: 40-client-file-uploads
plan: 01
subsystem: ui, database, api
tags: [supabase, rls, file-upload, portal, server-actions, drag-and-drop]

requires:
  - phase: 39
    provides: portal infrastructure, client project access checks via canClientAccessProject

provides:
  - is_client_upload column on project_files with RLS INSERT policy for clients
  - uploadClientFile server action for portal client file uploads
  - PortalClientUpload drag-and-drop component
  - Portal files page with integrated upload section

affects:
  - portal-files
  - project-files-admin-view
  - client-activity-feed

tech-stack:
  added: []
  patterns:
    - 'Client upload path: projectId/client-uploads/timestamp_name (separate subfolder)'
    - 'RLS client insert: is_client_upload=true AND is_client_visible=true AND client_projects lookup'
    - 'Portal form pattern: useRouter().refresh() after server action for page revalidation'

key-files:
  created:
    - components/portal/portal-client-upload.tsx
    - supabase/migrations/20260328174218_add_is_client_upload_to_project_files.sql
  modified:
    - app/actions/project-files.ts
    - app/portal/[id]/files/page.tsx
    - types/database.ts

key-decisions:
  - 'Client uploads stored at projectId/client-uploads/ subfolder to distinguish from admin uploads'
  - 'is_client_upload=true and is_client_visible=true always set together for client uploads'
  - 'Used router.refresh() inside client component rather than prop callback for page revalidation'
  - 'Notification always sent on client upload (no role check needed — clients always notify)'

patterns-established:
  - 'Portal upload: always set both is_client_upload=true and is_client_visible=true'
  - 'Client upload storage path: {projectId}/client-uploads/{timestamp}_{sanitizedName}'

duration: 18min
completed: 2026-03-28
---

# Phase 40 Plan 01: Client File Uploads Summary

**Drag-and-drop portal file upload with Supabase RLS policy, uploadClientFile server action, and PortalClientUpload component integrated into the portal files page**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-28T17:41:28Z
- **Completed:** 2026-03-28T17:59:30Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added `is_client_upload` boolean column to `project_files` with NOT NULL DEFAULT false and a dedicated RLS INSERT policy for authenticated clients
- Created `uploadClientFile` server action that validates file size/type, checks client project access, uploads to `project-files` bucket under `client-uploads/` subfolder, and notifies the team
- Built `PortalClientUpload` drag-and-drop component with visual drag feedback, file selection display, optional description, and loading states; integrated into the portal files page above the file list

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration — add is_client_upload column and update RLS** - `b33685b` (feat)
2. **Task 2: uploadClientFile server action** - `363f0e0` (feat)
3. **Task 3: PortalClientUpload component and portal files page integration** - `c6a1be8` (feat)

## Files Created/Modified

- `supabase/migrations/20260328174218_add_is_client_upload_to_project_files.sql` - Migration adding column and RLS policy
- `types/database.ts` - Added is_client_upload to project_files Row/Insert/Update types
- `app/actions/project-files.ts` - Added uploadClientFile server action
- `components/portal/portal-client-upload.tsx` - New drag-and-drop upload component
- `app/portal/[id]/files/page.tsx` - Imported PortalClientUpload, added upload section, updated info banner text

## Decisions Made

- Client uploads stored in `projectId/client-uploads/` subfolder to visually separate from admin uploads and enable future per-subfolder policies
- Notification always sent on client file upload — no role check needed (server action is client-only)
- Used `router.refresh()` inside the client component directly rather than passing a server-side callback, since the page is a Server Component
- Description textarea shown conditionally only after file selection to keep the empty state minimal

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Remote Supabase had migrations not in local history — ran `supabase migration repair` and `db push --include-all` to resolve. No code changes required.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Portal clients can now upload files to their projects via drag-and-drop
- Admin can see client uploads in the project files view (is_client_visible=true)
- Activity log records client_file_uploaded events, team gets email notification
- Ready for phase 40 plan 02 (if any) or next phase

---

_Phase: 40-client-file-uploads_
_Completed: 2026-03-28_
