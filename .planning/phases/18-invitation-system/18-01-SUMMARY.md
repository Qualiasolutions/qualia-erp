---
phase: 18-invitation-system
plan: 01
subsystem: database
tags: [supabase, postgresql, rls, invitations, auth]

# Dependency graph
requires:
  - phase: 17-project-import-flow
    provides: Portal settings infrastructure and project selection UI
provides:
  - Database schema for tracking client invitation lifecycle
  - Server actions for invitation CRUD operations
  - Secure token generation using crypto.randomUUID()
  - Authorization framework for invitation management
affects: [18-02, 18-03, 19-client-onboarding-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Idempotent invitation creation (returns existing if already sent)
    - invitation_status enum state machine (sent → resent → opened → accepted)
    - RLS policies for admin full access and manager project-specific view
    - Secure token generation with crypto.randomUUID()

key-files:
  created:
    - supabase/migrations/20260308000000_client_invitations.sql
    - app/actions/client-invitations.ts
  modified:
    - types/database.ts
    - lib/validation.ts

key-decisions:
  - 'Use crypto.randomUUID() for secure token generation (built-in Node.js, cryptographically secure)'
  - 'Idempotent createInvitation: returns existing invitation if already sent/resent'
  - 'Phase 18 creates opened_at and account_created_at columns but Phase 19 populates them'
  - 'UNIQUE constraint on (project_id, email) prevents duplicate invitations per project'

patterns-established:
  - 'invitation_status enum: sent → resent → opened → accepted → expired'
  - 'RLS pattern: admin full access, managers view invitations for their projects only'
  - 'Invitation token lookup optimization via partial index (WHERE status NOT IN accepted/expired)'

# Metrics
duration: 3m 50s
completed: 2026-03-08
---

# Phase 18 Plan 01: Invitation System Foundation Summary

**Client invitation database schema with secure token storage, RLS policies, and CRUD server actions using crypto.randomUUID()**

## Performance

- **Duration:** 3m 50s
- **Started:** 2026-03-08T14:48:03Z
- **Completed:** 2026-03-08T14:51:53Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created client_invitations table with invitation_status enum tracking lifecycle states
- Implemented secure token generation using crypto.randomUUID() for signup links
- Built four server actions (create, resend, history query, status check) with proper authorization
- Established RLS policies ensuring admin full access and manager project-specific visibility
- Set up database indexes for efficient project history, token lookup, and status filtering

## Task Commits

Each task was committed atomically:

1. **Task 1: Create client_invitations database schema** - `94f1f48` (feat)
2. **Task 2: Create invitation server actions and validation** - `81ddcfc` (feat)

## Files Created/Modified

- `supabase/migrations/20260308000000_client_invitations.sql` - Migration creating client_invitations table, invitation_status enum, indexes, and RLS policies
- `types/database.ts` - Auto-generated types including client_invitations table and invitation_status enum
- `app/actions/client-invitations.ts` - Server actions for invitation management (create, resend, history, status)
- `lib/validation.ts` - Added invitationSchema with email normalization

## Decisions Made

**1. Idempotent invitation creation**

- createInvitation returns existing invitation if status is 'sent' or 'resent'
- Prevents duplicate invitations and allows safe retries
- Useful for Plan 02 UI where admin might click "Send Invitation" multiple times

**2. Phase 18 vs Phase 19 scope boundary**

- Phase 18 creates opened_at and account_created_at columns in schema
- Phase 19 implements /auth/signup?token=X route which populates these timestamps
- Clear separation: infrastructure now, automatic transitions later

**3. Secure token generation**

- Use crypto.randomUUID() instead of custom token generation
- Built-in Node.js function, cryptographically secure
- Simpler than importing external library or manual crypto.randomBytes

**4. Database constraint strategy**

- UNIQUE(project_id, email) prevents duplicate invitations per project
- Allows same email across different projects (client works on multiple projects)
- Database-level enforcement avoids race conditions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Types file generation pollution**

- Initial `npx supabase gen types` included stderr output in file (line 1: "Initialising login role...")
- Caused ESLint parsing error during pre-commit hook
- Fixed by redirecting stderr: `npx supabase gen types typescript --linked 2>/dev/null > types/database.ts`
- Pre-existing TypeScript errors from regenerated types (unrelated to this plan)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02 (Admin invitation UI):**

- Database ready to store invitations
- Server actions ready to be called from UI forms
- Validation schema ready for form validation
- getProjectInvitationStatus() provides badge status info

**Ready for Plan 03 (Email template and delivery):**

- invitation_token column ready for signup link generation
- resent_at and resent_count ready for resend tracking
- metadata JSONB ready for future email tracking data

**Phase 19 dependencies satisfied:**

- opened_at column exists for tracking link clicks
- account_created_at column exists for tracking signup completion
- invitation_token column ready for /auth/signup?token=X validation

**No blockers identified.**

## Self-Check: PASSED

**Files Created:**

- ✓ supabase/migrations/20260308000000_client_invitations.sql
- ✓ app/actions/client-invitations.ts

**Files Modified:**

- ✓ types/database.ts
- ✓ lib/validation.ts

**Commits:**

- ✓ Task 1: 94f1f48
- ✓ Task 2: 81ddcfc

All files exist and all commits are in repository history.

---

_Phase: 18-invitation-system_
_Completed: 2026-03-08_
