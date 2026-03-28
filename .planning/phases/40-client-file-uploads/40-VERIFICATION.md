---
phase: 40-client-file-uploads
verified: 2026-03-28T17:54:20Z
status: gaps_found
score: 3/5 must-haves verified
gaps:
  - truth: 'Admin/staff can view client-uploaded files in ERP project view as a separate section'
    status: failed
    reason: 'getProjectFiles() select query omits is_client_upload from the field list. The admin files page filters by (f as any).is_client_upload, but since the field is never fetched, it is always undefined/falsy — clientFiles array is always empty and the Client Uploads section never renders.'
    artifacts:
      - path: 'app/actions/project-files.ts'
        issue: 'select() on line 88-110 lists is_client_visible but NOT is_client_upload. Field must be added to the select string.'
      - path: 'app/projects/[id]/files/page.tsx'
        issue: 'Filters by (f as any).is_client_upload which will always be falsy when field is missing from query result.'
    missing:
      - 'Add is_client_upload to the getProjectFiles() select field list (line ~103, after is_client_visible)'
  - truth: "Client-uploaded files show amber 'Client upload' badge in ERP file list"
    status: failed
    reason: 'Same root cause: file-list.tsx checks (file as any).is_client_upload, but since getProjectFiles never returns that field, the badge condition is never true.'
    artifacts:
      - path: 'components/project-files/file-list.tsx'
        issue: 'Badge renders correctly when is_client_upload is truthy, but the data never contains this field.'
    missing:
      - 'Fix is blocked by the same getProjectFiles() select omission — adding is_client_upload to the select resolves both gaps.'
---

# Phase 40: Client File Uploads — Verification Report

**Phase Goal:** Clients can upload files to their projects and admins see and receive notification of those uploads.
**Verified:** 2026-03-28T17:54:20Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                                  | Status   | Evidence                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Client can drag-and-drop or browse to upload files on portal project page and sees them listed immediately after                                       | VERIFIED | PortalClientUpload component is fully implemented with drag/drop, file selection, router.refresh() on success, wired into portal files page                                               |
| 2   | Files stored in Supabase Storage under project-files bucket at {projectId}/client-uploads/ path, with is_client_upload=true and is_client_visible=true | VERIFIED | uploadClientFile sets storagePath = `${projectId}/client-uploads/${timestamp}_${sanitizedName}`, inserts with is_client_upload=true, is_client_visible=true                               |
| 3   | Admin/staff can view client-uploaded files as a separate "Client Uploads" section in ERP project view                                                  | FAILED   | getProjectFiles() select omits is_client_upload — filter (f as any).is_client_upload is always undefined, section never renders                                                           |
| 4   | Client-uploaded files show amber "Client upload" badge in ERP file-list rows                                                                           | FAILED   | Same root cause: badge guard (file as any).is_client_upload is always falsy because field is not fetched                                                                                  |
| 5   | Admin receives email notification when a client uploads a file                                                                                         | VERIFIED | notifyEmployeesOfClientFileUpload() is fully implemented in lib/email.ts, imported and called in uploadClientFile, sends per-employee emails with file name, description, and direct link |

**Score:** 3/5 truths verified

### Required Artifacts

| Artifact                                                                       | Expected                                   | Status   | Details                                                                                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `components/portal/portal-client-upload.tsx`                                   | Drag-and-drop upload component             | VERIFIED | 242 lines, full drag/drop, validation, loader states, calls uploadClientFile, router.refresh()                                        |
| `supabase/migrations/20260328174218_add_is_client_upload_to_project_files.sql` | DB migration + RLS INSERT policy           | VERIFIED | Adds NOT NULL DEFAULT false column + client INSERT RLS policy with client_projects lookup                                             |
| `app/actions/project-files.ts` — uploadClientFile                              | Server action for client uploads           | VERIFIED | Auth, access check, path, storage upload, DB insert with is_client_upload=true, activity log, email notification                      |
| `app/portal/[id]/files/page.tsx`                                               | Portal files page with upload section      | VERIFIED | Imports PortalClientUpload, renders upload section above file list                                                                    |
| `app/projects/[id]/files/page.tsx`                                             | Admin files page split by is_client_upload | ORPHANED | Split logic and Client Uploads section exist, but is_client_upload is never returned by getProjectFiles() so clientFiles is always [] |
| `components/project-files/file-list.tsx`                                       | Amber client upload badge on rows          | ORPHANED | Badge code exists and is correct, but is_client_upload is never in the file data so badge never renders                               |
| `lib/email.ts` — notifyEmployeesOfClientFileUpload                             | Email notification function                | VERIFIED | Fully implemented with Resend, per-employee preference check, HTML+text email with file details and CTA link                          |
| `types/database.ts`                                                            | is_client_upload in project_files types    | VERIFIED | Row, Insert, Update all include is_client_upload: boolean                                                                             |

### Key Link Verification

| From               | To                                    | Via                                           | Status    | Details                                                                    |
| ------------------ | ------------------------------------- | --------------------------------------------- | --------- | -------------------------------------------------------------------------- |
| PortalClientUpload | uploadClientFile                      | import + formData call                        | WIRED     | Direct import, formData sent, result handled with toast + router.refresh() |
| uploadClientFile   | Supabase Storage project-files bucket | supabase.storage.from('project-files').upload | WIRED     | Storage path set to `{projectId}/client-uploads/{ts}_{name}`               |
| uploadClientFile   | project_files DB row                  | supabase.insert with is_client_upload=true    | WIRED     | Inserts with correct flags                                                 |
| uploadClientFile   | notifyEmployeesOfClientFileUpload     | direct call after insert                      | WIRED     | Called with projectId, uploaderName, file.name, description                |
| getProjectFiles    | is_client_upload field                | select field list                             | NOT WIRED | is_client_upload absent from select — returns undefined on all rows        |
| Admin files page   | Client Uploads section                | clientFiles.filter by is_client_upload        | NOT WIRED | Filter always produces empty array due to missing field in query           |
| file-list.tsx      | Amber badge                           | (file as any).is_client_upload check          | NOT WIRED | Guard always falsy for same reason                                         |

### Anti-Patterns Found

| File                               | Line    | Pattern                                            | Severity | Impact                                                                           |
| ---------------------------------- | ------- | -------------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `app/actions/project-files.ts`     | ~88-110 | Missing field in select query                      | Blocker  | is_client_upload never returned — breaks admin split + badge                     |
| `app/projects/[id]/files/page.tsx` | 112     | `onUploadComplete: () => window.location.reload()` | Warning  | Hard page reload instead of router.refresh(); works but causes full reload flash |
| `app/projects/[id]/files/page.tsx` | 139     | `onFileDeleted: () => window.location.reload()`    | Warning  | Same as above                                                                    |

### Human Verification Required

#### 1. Portal upload flow

**Test:** Log in as a portal client, navigate to a project's files page, drag a file onto the drop zone and submit.
**Expected:** File appears in the file list immediately below after upload.
**Why human:** router.refresh() behavior on portal Server Components requires a live session to verify.

#### 2. Email notification delivery

**Test:** Upload a file as a client user on a project that has assigned employees with email notifications enabled.
**Expected:** Assigned employee(s) receive an email with subject "{clientName} uploaded a file to {projectName}" and a "View File" link pointing to /projects/{id}/files.
**Why human:** Requires live Resend API key and valid employee email addresses to confirm delivery.

### Gaps Summary

One root cause blocks two truths: the `getProjectFiles()` select query in `app/actions/project-files.ts` does not include `is_client_upload` in its field list. All downstream consumers — the admin files page split and the FileList badge — rely on `(f as any).is_client_upload`, which is always `undefined` because Supabase only returns fields that are explicitly selected. The fix is a single line: add `is_client_upload,` to the select string in getProjectFiles (after `is_client_visible`). Once that field is returned, both the Client Uploads section and the amber badge will function correctly without any other changes.

The portal upload flow (Truth 1), storage path/DB flags (Truth 2), and email notification (Truth 5) are all fully implemented and wired correctly.

---

_Verified: 2026-03-28T17:54:20Z_
_Verifier: Claude (qualia-verifier)_
