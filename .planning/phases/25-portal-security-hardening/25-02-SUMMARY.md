---
phase: 25-portal-security-hardening
plan: '02'
subsystem: portal-auth
tags: [security, validation, invitations, crypto, zod]
dependency_graph:
  requires: []
  provides:
    - token-based-invitation-lookups
    - crypto-secure-temp-passwords
    - zod-validated-portal-inputs
    - client-role-check-on-password-reset
  affects:
    - app/actions/client-invitations.ts
    - app/actions/client-portal.ts
    - app/actions/client-requests.ts
    - lib/validation.ts
    - app/auth/signup/page.tsx
    - app/actions/auth.ts
tech_stack:
  added: []
  patterns:
    - Token-based lookup (invitation_token instead of UUID PK)
    - crypto.randomBytes(12).toString('base64url') for temp passwords
    - Zod schema validation for untrusted portal inputs
    - Role guard before sending password reset emails
key_files:
  created: []
  modified:
    - app/actions/client-invitations.ts
    - app/actions/client-portal.ts
    - app/actions/client-requests.ts
    - lib/validation.ts
    - app/auth/signup/page.tsx
    - app/actions/auth.ts
decisions:
  - id: 3
    text: node:crypto randomBytes for temp passwords
    rationale: Cryptographically secure vs Math.random() 48-bit entropy
  - id: 8
    text: Invitation marking by token not UUID PK
    rationale: Prevents enumeration — opaque token is not guessable, UUID PK is sequential
metrics:
  duration_minutes: 12
  completed_date: 2026-03-10
  tasks_completed: 2
  tasks_total: 2
---

# Phase 25 Plan 02: Portal Auth Security Hardening Summary

**One-liner:** Token-based invitation lookups, crypto.randomBytes temp passwords, and Zod input validation for profile/feature-request mutations.

## Tasks Completed

| Task | Name                                                        | Commit  | Key Files                                                         |
| ---- | ----------------------------------------------------------- | ------- | ----------------------------------------------------------------- |
| 1    | Fix invitation security and temp password entropy           | 68a2e21 | client-invitations.ts, client-portal.ts, signup/page.tsx, auth.ts |
| 2    | Add Zod validation for profile updates and feature requests | 5148942 | lib/validation.ts, client-portal.ts, client-requests.ts           |

## What Was Built

### Task 1: Invitation Security + Crypto Passwords

**Invitation enumeration fix (`app/actions/client-invitations.ts`):**

- `markInvitationOpened(token)` — parameter renamed from `invitationId` to `token`; query changed from `.eq('id', invitationId)` to `.eq('invitation_token', token)` with basic length sanity check
- `markInvitationAccepted(token)` — same rename; added `.in('status', ['opened', 'sent', 'resent'])` guard to prevent re-accepting; marked `@internal` in JSDoc
- `getProjectInvitationStatus` — now requires authenticated manager+ caller before querying

**Caller updates (critical — TypeScript would not catch these):**

- `app/auth/signup/page.tsx` line 58: `markInvitationOpened(invitation.id)` → `markInvitationOpened(token)` (URL param already available)
- `app/actions/auth.ts` line 202: `markInvitationAccepted(invitation.id)` → `markInvitationAccepted(invitationToken)` (form data already available)

**Temp password entropy (`app/actions/client-portal.ts`):**

- Replaced 2 occurrences of `Math.random().toString(36).slice(2, 10)` with `randomBytes(12).toString('base64url')`
- Both in `inviteClientByEmail` (line 76) and `setupClientForProject` (line 529)
- `setupPortalForClient` (line 1225) already used `randomBytes` — no change needed

### Task 2: Zod Validation

**New schemas in `lib/validation.ts`:**

```ts
ClientProfileUpdateSchema — full_name (max 100), company (max 200)
FeatureRequestCreateSchema — title (max 200, required), description (max 5000), priority enum
```

**`updateClientProfile` (`client-portal.ts`):** Validates through `ClientProfileUpdateSchema` before building update object; returns first Zod error message on failure.

**`createFeatureRequest` (`client-requests.ts`):** Replaced manual `!input.title.trim()` check with full `FeatureRequestCreateSchema.safeParse(input)`; all insert fields sourced from `safeInput`.

**`sendClientPasswordReset` (`client-portal.ts`):** After manager auth check, queries `profiles` by normalized email — returns `'No portal account found'` if missing, `'Password reset is only available for client accounts'` if role is not client.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `.errors` vs `.issues` in Zod error access in client-requests.ts**

- **Found during:** Task 2 TypeScript check
- **Issue:** `parsed.error.errors[0]?.message` — `errors` property doesn't exist on `ZodError`; correct property is `issues`
- **Fix:** Changed to `parsed.error.issues[0]?.message`
- **Files modified:** `app/actions/client-requests.ts`
- **Commit:** 5148942 (fixed before commit)

**2. [Rule 1 - Bug] Only 2 Math.random occurrences in client-portal.ts (plan said 3)**

- **Found during:** Task 1 grep verification
- **Issue:** Plan anticipated 3 occurrences including line ~1226 in `setupPortalForClient`, but that location already used `randomBytes` from a prior fix (decision #3 in STATE.md)
- **Fix:** No action needed — replaced only the 2 remaining occurrences
- **Files modified:** None additional

**3. [Rule 2 - Missing critical functionality] Parallel plan 25-01 had already added ownership check to createFeatureRequest**

- **Found during:** Task 2 read of client-requests.ts
- **Issue:** An ownership check (`client_projects` lookup) was present that wasn't in the original file — added by concurrent plan 25-01
- **Fix:** Preserved the ownership check; replaced only the title validation with Zod schema; updated all `input.*` references to `safeInput.*` including inside the ownership block

## Self-Check: PASSED

All key files present. Both task commits verified in git history.
