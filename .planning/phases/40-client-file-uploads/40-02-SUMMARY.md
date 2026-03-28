---
phase: 40-client-file-uploads
plan: 02
subsystem: ui
tags: [file-upload, project-files, admin-view, badge, portal]

requires:
  - phase: 40-01
    provides: is_client_upload column on project_files, uploadClientFile server action

provides:
  - ERP files page split into Client Uploads and Internal Files sections
  - Amber 'Client upload' badge on FileList rows for client-uploaded files

affects:
  - project-files-admin-view

tech-stack:
  added: []
  patterns:
    - 'Files page split: filter by is_client_upload to render separate Client Uploads section above Internal Files'
    - 'Client upload badge: amber-tinted outline badge rendered inline with visibility badge in Visibility TableCell'

key-files:
  created: []
  modified:
    - app/projects/[id]/files/page.tsx
    - components/project-files/file-list.tsx

key-decisions:
  - 'Used (f as any).is_client_upload cast since ProjectFileWithUploader type predates the new column — avoids a large type refactor for a two-task plan'
  - 'Wrapped both badges in flex-col gap-1 div so they stack cleanly rather than overflow on narrow rows'

patterns-established:
  - 'Admin file split pattern: filter by is_client_upload after a single getProjectFiles(projectId, false) fetch — no second DB call needed'

duration: 3min
completed: 2026-03-28
---

# Phase 40 Plan 02: Admin Client Uploads View Summary

**ERP files page split into dedicated "Client Uploads" (amber count badge) and "Internal Files" sections, with an amber "Client upload" badge on each client-uploaded row in FileList**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T17:48:41Z
- **Completed:** 2026-03-28T17:51:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Split `app/projects/[id]/files/page.tsx` to filter the existing `getProjectFiles` result into `clientFiles` and `internalFiles` arrays and render them as two separate sections — no extra DB query needed
- Added an amber "Client upload" badge (border-amber-200 bg-amber-50 text-amber-700) to `components/project-files/file-list.tsx` Visibility cell, stacked below the existing visibility badge via flex-col gap-1 wrapper
- "All Files" heading renamed to "Internal Files" for unambiguous section labeling; Client Uploads section only renders when client uploads exist (conditional render)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Client Uploads section to ERP files page** - `11fabcf` (feat)
2. **Task 2: Add client upload badge to FileList rows** - `d60fa76` (feat)

## Files Created/Modified

- `app/projects/[id]/files/page.tsx` - Splits files array into clientFiles/internalFiles; renders Client Uploads section above Internal Files
- `components/project-files/file-list.tsx` - Adds Upload icon import and amber "Client upload" badge in Visibility cell

## Decisions Made

- Cast `file as any` for `is_client_upload` access rather than updating `ProjectFileWithUploader` type — proportionate for a two-task view-layer plan, avoids wider type churn
- Wrapped visibility badges in `flex-col gap-1` so the client upload badge stacks neatly below the visibility badge on every screen size

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four UPLOAD requirements now satisfied: UPLOAD-01 (portal UI), UPLOAD-02 (storage), UPLOAD-03 (admin view + download), UPLOAD-04 (email notification)
- Phase 40 complete — ready for Phase 41 (financials) or any other next phase

---

_Phase: 40-client-file-uploads_
_Completed: 2026-03-28_

## Self-Check: PASSED

- app/projects/[id]/files/page.tsx: FOUND
- components/project-files/file-list.tsx: FOUND
- Commit 11fabcf (Task 1): FOUND
- Commit d60fa76 (Task 2): FOUND
