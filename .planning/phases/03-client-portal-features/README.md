# Phase 3: Client Portal Features

**Status:** Ready for execution
**Created:** 2026-03-01
**Phase Goal:** Admin can invite clients to projects, clients can download shared files, leave comments on phases, and see a timeline of project updates

## Overview

Phase 3 builds on the client portal foundation from Phase 2 by adding interactive features that enable real async communication and file sharing between admins and clients.

### Success Criteria (what must be TRUE)

1. Admin can invite a client to a project via UI (wires existing inviteClientToProject action)
2. Admin can remove client project access via UI (wires existing removeClientFromProject action)
3. Admin can upload files to a project with visibility toggle (client-visible or internal-only)
4. Client sees client-visible files at /portal/[id]/files with download buttons
5. Files show phase association, description, and upload date
6. Client can leave comments at the phase level
7. Admin can reply to client comments in the same thread
8. Internal comments are hidden from clients (only admins/employees see them)
9. Client sees timeline of project events at /portal/[id]/updates (phase completions, file uploads, comments)
10. Activity feed entries are filtered by is_client_visible=true

## Plans

### Wave 1: Foundation

- **03-01-PLAN.md** - Admin client invite UI (gap closure from Phase 2 verification)
  - Requirements: AUTH-03
  - Closes the gap: Admin can invite/remove clients via UI
  - Files: `app/clients/[id]/page.tsx`, `components/clients/client-project-access.tsx`
  - Duration: ~15 min

### Wave 2: Core Features (Parallel Execution)

- **03-02-PLAN.md** - Shared files with visibility toggle
  - Requirements: FILE-01, FILE-02, FILE-03
  - Features: Upload files, visibility control, client download
  - Files: 6 files (actions, pages, components)
  - Duration: ~25 min

- **03-03-PLAN.md** - Client comments on phases
  - Requirements: CMNT-01, CMNT-02, CMNT-03
  - Features: Phase-level comments, internal/client visibility, threads
  - Files: 4 files (actions, portal pages, components)
  - Duration: ~25 min

### Wave 3: Integration

- **03-04-PLAN.md** - Client activity feed
  - Requirements: FEED-01, FEED-02, FEED-03
  - Depends on: 03-02 (files), 03-03 (comments)
  - Features: Timeline of events, auto-logging, tab navigation
  - Files: 5 files (actions, pages, components, integrations)
  - Duration: ~20 min

**Total estimated duration:** ~85 minutes (~1.4 hours)

## Gap Closure Context

Phase 2 verification identified 1 gap:

**Gap: Admin Invite UI Missing**

The server action `inviteClientToProject` exists and is fully implemented with:

- Admin role validation
- Duplicate check
- client_projects insert with invited_by and invited_at tracking
- Path revalidation

**BUT:** No admin UI component calls this action. Clients cannot be assigned to projects through the interface.

**Plan 03-01** directly addresses this gap by creating the missing UI component at `/clients/[id]/page.tsx` that wires the existing actions.

## Architecture Notes

### Database Tables Used

- `client_projects` - Links clients to projects (Phase 0)
- `documents` - Project files with is_client_visible flag (existing)
- `phase_comments` - Phase-level comments with is_internal flag (Phase 0)
- `activity_log` - Event timeline with is_client_visible flag (existing)

All tables already exist in schema - no migrations needed.

### Visibility Pattern

Consistent across all features:

- **Files:** `is_client_visible` boolean (default: false)
- **Comments:** `is_internal` boolean (default: false) - inverse of client-visible
- **Activity:** `is_client_visible` boolean (default: true for client actions)

### Auto-logging Integration

Plans 03-02 and 03-03 create features (files, comments).
Plan 03-04 integrates activity logging into those features:

- File upload → creates activity_log entry
- Comment creation → creates activity_log entry
- Activity feed queries → filters by is_client_visible

This creates a cohesive audit trail visible to clients.

## Wave Strategy

**Wave 1** (03-01) must complete first:

- Closes Phase 2 gap
- Enables testing with real client-project assignments

**Wave 2** (03-02, 03-03) can run in parallel:

- Files and comments are independent features
- No shared components or actions
- Both create data sources for activity feed

**Wave 3** (03-04) depends on Wave 2:

- Integrates with file upload action (from 03-02)
- Integrates with comment creation action (from 03-03)
- Creates unified timeline of all events

## Requirements Traceability

| Requirement | Description                                  | Plan  | Status  |
| ----------- | -------------------------------------------- | ----- | ------- |
| AUTH-03     | Admin can invite client to project           | 03-01 | Pending |
| FILE-01     | Admin upload with visibility toggle          | 03-02 | Pending |
| FILE-02     | Client sees client-visible files             | 03-02 | Pending |
| FILE-03     | Files show phase, description, date          | 03-02 | Pending |
| CMNT-01     | Client can comment on phases                 | 03-03 | Pending |
| CMNT-02     | Admin can reply to comments                  | 03-03 | Pending |
| CMNT-03     | Internal comments hidden from clients        | 03-03 | Pending |
| FEED-01     | Client sees timeline at /portal/[id]/updates | 03-04 | Pending |
| FEED-02     | Feed shows phases, files, comments           | 03-04 | Pending |
| FEED-03     | Activity filtered by is_client_visible       | 03-04 | Pending |

## Verification Strategy

Each plan includes:

- **Manual testing** - Step-by-step user flows for admin and client roles
- **Code verification** - TypeScript compilation, pattern checks
- **must_haves** - Automated verification via goal-backward analysis

### Human Verification Points

1. **Client invite UI** (03-01):
   - Admin can assign client to project via UI
   - Changes persist to client_projects table

2. **File visibility** (03-02):
   - Admin uploads file with toggle ON → client sees it
   - Admin uploads file with toggle OFF → client doesn't see it

3. **Comment visibility** (03-03):
   - Client comment → admin sees it
   - Admin reply (not internal) → client sees it
   - Admin internal comment → client doesn't see it

4. **Activity timeline** (03-04):
   - File upload → appears in timeline (if client-visible)
   - Comment → appears in timeline (if not internal)
   - Events show chronologically

## Codebase Impact

### New Files (14 total)

**Components (7):**

- `components/clients/client-project-access.tsx` - Client-project assignment UI
- `components/project-files/file-upload-form.tsx` - File upload with visibility toggle
- `components/project-files/file-list.tsx` - Admin file list
- `components/portal/portal-file-list.tsx` - Client file list
- `components/portal/phase-comment-thread.tsx` - Comment thread with replies
- `components/portal/portal-activity-feed.tsx` - Activity timeline

**Actions (3):**

- `app/actions/project-files.ts` - File CRUD with visibility filtering
- `app/actions/phase-comments.ts` - Comment CRUD with internal/client filtering
- `app/actions/activity-feed.ts` - Activity logging and retrieval

**Pages (4):**

- `app/projects/[id]/files/page.tsx` - Admin file management
- `app/portal/[id]/files/page.tsx` - Client file viewing
- `app/portal/[id]/updates/page.tsx` - Client activity timeline

### Modified Files (4)

- `app/clients/[id]/page.tsx` - Add ClientProjectAccess component
- `app/portal/[id]/page.tsx` - Add tab navigation, pass user context
- `components/portal/portal-roadmap.tsx` - Add comment threads per phase
- (Potential) `app/projects/[id]/roadmap/page.tsx` - Admin commenting (optional)

### Dependencies

All plans use existing patterns:

- ActionResult from `app/actions/shared.ts`
- Supabase client from `lib/supabase/server.ts`
- shadcn/ui components
- lucide-react icons
- date-fns for timestamps

No new package installations required.

## Risks & Mitigations

| Risk                      | Impact                                     | Mitigation                                       |
| ------------------------- | ------------------------------------------ | ------------------------------------------------ |
| File upload size limits   | Large files fail                           | Client-side 10MB validation + server-side check  |
| Comment spam              | Thread pollution                           | Character limit (2000), rate limiting (future)   |
| Activity feed performance | Slow load with many events                 | Limit to 100 entries, pagination (future)        |
| Visibility filtering bugs | Security issue (clients see internal data) | Strict server-side filtering, verification tests |

## Success Metrics

After Phase 3 completion:

1. **Functional:**
   - Clients can be assigned to projects via UI (not manual DB)
   - File sharing works with proper visibility control
   - Comments enable async communication
   - Activity timeline shows project progress

2. **Security:**
   - Internal files never leak to clients (is_client_visible filter)
   - Internal comments never leak to clients (is_internal filter)
   - Signed URLs expire after 1 hour (Supabase Storage)

3. **UX:**
   - Clients see unified portal experience (Roadmap → Files → Updates)
   - Tab navigation works smoothly
   - Empty states guide users appropriately

## Next Steps

After Phase 3:

- **Post-verification:** Run manual testing checklist
- **Documentation:** Update user guides for admins and clients
- **Training:** Onboard Moayad on new features
- **Monitoring:** Track file uploads, comments, activity volume

Future enhancements (post-v1):

- Real-time notifications (web push, email)
- File preview (PDF, images in browser)
- Rich text comments (markdown support)
- Activity feed pagination
- Export activity log to PDF
