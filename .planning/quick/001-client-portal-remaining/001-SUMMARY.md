# Quick Task 001: Client Portal Remaining Features

## Summary

Implemented 5 remaining client portal features identified after v1.0 launch.

## Features Delivered

### 1. Password Reset Flow

- **Request page** (`/auth/reset-password`): Email input form, calls `resetPasswordForEmail()`, shows success confirmation
- **Confirm page** (`/auth/reset-password/confirm`): New password + confirm fields, password strength indicator, calls `updateUser()`
- **Login integration**: "Forgot password?" link now routes to reset page (was a dead button)
- Uses Supabase native password reset flow via magic link

### 2. Client Invite with Supabase Auth

- **New action** `inviteClientByEmail()`: Creates Supabase auth account via `auth.admin.inviteUserByEmail()`
- Creates profile with role='client' and links to project in one action
- Guards against inviting existing team members (admin/employee roles)
- **Admin client utility** added to `lib/supabase/server.ts` using service_role key
- **UI updated**: "Invite client by email" form in `ClientProjectAccess` component with email, name, project fields

### 3. Real Progress Calculation

- **New actions** `calculateProjectProgress()` and `calculateProjectsProgress()` in `app/actions/phases.ts`
- Calculates `(completed phases / total phases) * 100` from actual `project_phases` data
- **Portal page** fetches progress server-side and passes to client component
- Removed hardcoded `getProgressForStatus()` that mapped status to fake percentages

### 4. Email Notifications on Phase Changes

- **New helper** `notifyClientsOfPhaseChange()` in `lib/email.ts`
- Queries all clients linked to project via `client_projects`, sends Resend email
- Triggered by `updatePhaseStatus()` (for completed/skipped) and `completePhase()`
- Fire-and-forget pattern (doesn't block response)
- Qualia-branded email template with project link to portal

### 5. User-Friendly Error Page

- Error message mapping for common Supabase errors (access_denied, otp_expired, etc.)
- Removed raw error display (`Code error: {params.error}`)
- Added "Back to login" button
- Fixed `auth/confirm/route.ts` to use error keys instead of raw messages

## Files Modified (13 total)

**New files (2):**

- `app/auth/reset-password/page.tsx`
- `app/auth/reset-password/confirm/page.tsx`

**Modified files (11):**

- `app/actions/client-portal.ts` — Added `inviteClientByEmail()` action
- `app/actions/phases.ts` — Added progress calculation + notification hooks
- `app/actions/pipeline.ts` — Added phase change notification to `updatePhaseStatus()`
- `app/auth/confirm/route.ts` — Use error keys instead of raw messages
- `app/auth/error/page.tsx` — User-friendly error messages
- `app/clients/[id]/client-detail-view.tsx` — Minor cleanup
- `app/portal/page.tsx` — Fetch real progress from phases
- `components/clients/client-project-access.tsx` — Added email invite form
- `components/login-form.tsx` — Wired forgot password link
- `components/portal/portal-projects-list.tsx` — Use server-provided progressMap
- `lib/email.ts` — Added `notifyClientsOfPhaseChange()`
- `lib/supabase/server.ts` — Added `createAdminClient()` for service role operations

## Requirements

- `SUPABASE_SERVICE_ROLE_KEY` env var must be set in Vercel for client invite to work
- `RESEND_API_KEY` must be set for email notifications
- Both should already be configured from v1.0

## Known Limitations

- Client invite requires `SUPABASE_SERVICE_ROLE_KEY` — fails gracefully with error message if not set
- Email notifications are fire-and-forget — no retry on failure
- Progress calculation is phase-level (not task-level within phases)

## Commit

Branch: `feat/client-portal-remaining`
Deployed to: https://qualia-erp.vercel.app
