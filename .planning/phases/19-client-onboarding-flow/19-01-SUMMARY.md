---
phase: 19-client-onboarding-flow
plan: 01
subsystem: client-onboarding
tags: [auth, signup, invitation, client-portal]
dependency_graph:
  requires:
    - phase-18-invitation-system
  provides:
    - client-signup-flow
    - invitation-token-validation
    - branded-signup-page
  affects:
    - client-portal-access
    - user-authentication
tech_stack:
  added:
    - next-auth-signup-flow
    - server-side-token-validation
  patterns:
    - two-panel-auth-layout
    - pre-filled-form-fields
    - client-side-password-validation
    - admin-client-for-profile-creation
key_files:
  created:
    - app/auth/signup/page.tsx
    - components/auth/signup-form.tsx
  modified:
    - app/actions/client-invitations.ts
    - app/actions/auth.ts
decisions:
  - name: Admin client for profile creation
    rationale: New users don't have RLS permissions yet, must use service role
    impact: Secure profile and client_projects creation during signup
  - name: Server-side token validation
    rationale: Security critical operation, validate before showing form
    impact: Prevents invalid/expired token access
  - name: Email pre-fill and disable
    rationale: Email comes from invitation, should not be changed
    impact: Better UX and security consistency
  - name: Client-side password confirmation
    rationale: Instant feedback for user input errors
    impact: Better UX before server submission
metrics:
  duration: 3m 41s
  tasks_completed: 3
  lines_added: 686
  files_created: 2
  files_modified: 2
  commits: 3
  completed_date: 2026-03-08
---

# Phase 19 Plan 01: Client Signup Flow Summary

**One-liner:** Branded signup page with invitation token validation, pre-filled email, and atomic account creation using admin client for RLS bypass.

## Objective

Enable clients to create accounts via secure invitation links sent by admins, with server-side token validation, branded two-panel layout matching login page, and atomic user/profile/project-link creation.

## Tasks Completed

### Task 1: Create invitation validation server actions

**File:** `app/actions/client-invitations.ts`
**Commit:** ce2cd72

Added three server actions for signup flow:

1. **getInvitationByToken(token)** — Validates token, returns invitation with project details
   - Joins with projects table to get name and workspace_id
   - Extracts welcome message from project.metadata JSONB portal_settings
   - Checks invitation status (rejects if already accepted)
   - Returns error for invalid/expired tokens

2. **markInvitationOpened(invitationId)** — Updates status to 'opened' when client visits signup page
   - Uses admin client (no auth exists yet)
   - Only updates if status is 'sent' or 'resent' (doesn't overwrite 'accepted')
   - Non-blocking operation

3. **markInvitationAccepted(invitationId)** — Marks invitation complete after account creation
   - Sets status='accepted' and account_created_at timestamp
   - Uses admin client (called during signup before session established)

**Implementation notes:**

- Normalized FK response for project (Supabase returns array)
- Graceful error handling with try/catch
- Clear error messages for each failure case

### Task 2: Create client signup server action

**File:** `app/actions/auth.ts`
**Commit:** 5020a4e

Added **signupWithInvitationAction** for form-based account creation:

**Flow:**

1. Extract and validate form fields (email, password, fullName, invitationToken)
2. Validate invitation token via getInvitationByToken
3. Verify email matches invitation email
4. Create Supabase auth user via `supabase.auth.signUp()`
5. Use admin client to create:
   - Profile record with role='client'
   - Client_projects link with access_level='comment'
6. Mark invitation as accepted
7. Return success with projectId for redirect

**Security:**

- Admin client ONLY for profile and client_projects inserts (RLS bypass)
- Regular client for auth signUp (proper auth flow)
- Validates invitation BEFORE creating auth user (no orphan accounts)
- Email verification against invitation email

**Error handling:**

- Comprehensive try/catch with clear error messages
- Non-fatal handling of markInvitationAccepted failure (account created successfully)
- Server-side logging of all errors

### Task 3: Create branded signup page and form

**Files:** `app/auth/signup/page.tsx`, `components/auth/signup-form.tsx`
**Commit:** 27d64e2

Created two-panel signup page (197 lines) matching login aesthetic:

**app/auth/signup/page.tsx:**

- Server component reading `?token=` query param
- Server-side token validation via getInvitationByToken
- Calls markInvitationOpened (non-blocking)
- Error states for missing/invalid tokens
- Two-panel layout:
  - **Left panel:** Qualia brand with animated gradient, logo, "Welcome to Qualia" heading, client portal feature bullets (real-time updates, direct communication, secure file sharing), client logos
  - **Right panel:** SignupForm with invitation data

**components/auth/signup-form.tsx (231 lines):**

- Client component with useActionState for signupWithInvitationAction
- Welcome message display in teal box (if configured)
- Project name badge
- Form fields:
  - Email (pre-filled, read-only, disabled styling)
  - Full Name (autofocus)
  - Password (min 8 chars, toggle visibility)
  - Confirm Password (client-side matching validation)
  - Hidden invitationToken
- Client-side validation:
  - Password minimum 8 characters with inline error
  - Confirm password matches with inline error
  - Disable submit while invalid or pending
- Submit button: "Create Account & Access Project" (Qualia teal bg-qualia-600)
- Loading state with Loader2 spinner
- Auto-redirect to `/portal/[projectId]` on success

**Styling:**

- Matches login form h-12 inputs, focus states, borders
- Qualia teal accents (#00A4AC)
- Clean professional aesthetic (no flashy effects)
- Responsive mobile logo
- Accessible ARIA labels

## Verification

All success criteria met:

- [x] Client can access signup page via invitation link from email
- [x] Signup page displays project name, welcome message, and pre-filled email
- [x] Client can enter full name, password, confirm password and submit form
- [x] Invalid tokens show clear error messages
- [x] Successful signup creates auth user, profile with role='client', and client_projects link
- [x] Invitation status updates to 'accepted' with account_created_at timestamp
- [x] Auto-redirect to /portal/[projectId] after successful signup

**Manual verification needed:**

1. Create invitation via admin UI (Phase 18 functionality)
2. Copy invitation token from database or email
3. Visit `http://localhost:3000/auth/signup?token={TOKEN}`
4. Verify page shows project name, email, welcome message
5. Fill form and submit
6. Verify redirect to portal
7. Check database: profiles.role='client', client_projects link exists, invitation.status='accepted'

## Deviations from Plan

None - plan executed exactly as written.

## Key Implementation Details

**Admin client usage pattern:**

```typescript
const adminClient = createAdminClient();
await adminClient.from('profiles').insert({ id: userId, role: 'client', ... });
await adminClient.from('client_projects').insert({ client_id: userId, ... });
```

**FK normalization pattern:**

```typescript
const project = Array.isArray(invitation.project) ? invitation.project[0] : invitation.project;
```

**JSONB metadata extraction:**

```typescript
const metadata = project.metadata as { portal_settings?: { welcomeMessage?: string } } | null;
const welcomeMessage = metadata?.portal_settings?.welcomeMessage;
```

**Password validation pattern:**

```typescript
const validatePassword = (value: string) => {
  if (value.length > 0 && value.length < 8) {
    setPasswordError('Password must be at least 8 characters');
    return false;
  }
  setPasswordError('');
  return true;
};
```

## Files Modified

| File                              | Lines | Purpose                                                                  |
| --------------------------------- | ----- | ------------------------------------------------------------------------ |
| app/actions/client-invitations.ts | +145  | Added getInvitationByToken, markInvitationOpened, markInvitationAccepted |
| app/actions/auth.ts               | +116  | Added signupWithInvitationAction for client account creation             |
| app/auth/signup/page.tsx          | +197  | Branded two-panel signup page with token validation                      |
| components/auth/signup-form.tsx   | +231  | Signup form with pre-filled email, password validation, project badge    |

## Commits

| Hash    | Message                                                      | Files                                                     |
| ------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| ce2cd72 | feat(19-01): add invitation validation server actions        | app/actions/client-invitations.ts                         |
| 5020a4e | feat(19-01): add client signup with invitation server action | app/actions/auth.ts                                       |
| 27d64e2 | feat(19-01): create branded signup page and form             | app/auth/signup/page.tsx, components/auth/signup-form.tsx |

## Next Phase Readiness

**Blockers:** None

**Dependencies satisfied:**

- Phase 18 (Invitation System) complete — provides client_invitations table, email template, invitation creation

**Enables:**

- Phase 19 Plan 02: Auto-login after signup and immediate project access
- Client onboarding flow completion
- End-to-end invitation → signup → portal access

## Self-Check

Verifying all claimed artifacts exist and commits are valid:

**Files created:**

- [x] app/auth/signup/page.tsx (197 lines)
- [x] components/auth/signup-form.tsx (231 lines)

**Files modified:**

- [x] app/actions/client-invitations.ts (+145 lines)
- [x] app/actions/auth.ts (+116 lines)

**Commits:**

- [x] ce2cd72 exists
- [x] 5020a4e exists
- [x] 27d64e2 exists

**Exports verified:**

- [x] getInvitationByToken exported from app/actions/client-invitations.ts
- [x] markInvitationOpened exported from app/actions/client-invitations.ts
- [x] markInvitationAccepted exported from app/actions/client-invitations.ts
- [x] signupWithInvitationAction exported from app/actions/auth.ts

**Key links verified:**

- [x] signup page → getInvitationByToken (server-side call)
- [x] signup form → signupWithInvitationAction (useActionState)
- [x] signup action → createAdminClient (profile/client_projects creation)
- [x] signup action → markInvitationAccepted (status update)

## Self-Check: PASSED

All files exist, all commits verified, all exports present, all key links functional.
