---
mode: quick
plan: 001
type: execute
autonomous: true
files_modified:
  - app/auth/reset-password/page.tsx
  - app/auth/reset-password/confirm/page.tsx
  - app/actions/auth.ts
  - components/login-form.tsx
  - app/actions/client-portal.ts
  - app/actions/phases.ts
  - components/portal/portal-projects-list.tsx
  - lib/email.ts
  - app/auth/error/page.tsx
---

# Client Portal Remaining Features

<objective>
Complete 5 remaining client portal features identified after v1.0 launch.

**Purpose:** Polish client experience with password reset, proper invite flow, accurate progress tracking, phase change notifications, and user-friendly error messages.

**Output:** 5 independent features shipped — password reset flow, Supabase auth invite integration, real progress calculation from project_phases, email notifications on phase status changes, and improved auth error page.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

## Current Implementation

**Auth system:**

- `app/auth/login/page.tsx` + `components/login-form.tsx` — has "Forgot password?" button (line 122-128) that does nothing
- `app/auth/confirm/route.ts` handles OTP verification already
- `app/actions/auth.ts` has `loginAction`
- Uses `@supabase/ssr` for auth

**Client invite:**

- `app/actions/client-portal.ts` has `inviteClientToProject()` and `removeClientFromProject()`
- These only link existing profiles to projects via `client_projects` table
- NO Supabase auth invite (`supabase.auth.admin.inviteUserByEmail`) yet
- Clients need role='client' in profiles to access portal

**Progress calculation:**

- `components/portal/portal-projects-list.tsx` uses hardcoded `getProgressForStatus()` (lines 50-66)
- Maps status to fake percentages: Demos=10%, Active=50%, Launched=100%
- Should calculate from `project_phases` table completion

**Email notifications:**

- `lib/email.ts` has Resend integration with `notifyAdminsOfCreation()` pattern
- FROM_EMAIL: `notifications@qualiasolutions.net`
- No phase change notifications yet

**Error page:**

- `app/auth/error/page.tsx` shows raw error: `Code error: {params.error}` (line 15)
- Leaks internal Supabase errors to users

**Database:**

- `project_phases` has `status` field (not_started, in_progress, completed, blocked)
- `client_projects` links profiles to projects
- `profiles.role` enum: admin, employee, client
  </context>

<tasks>

<task type="auto">
  <name>Task 1: Password Reset Flow</name>
  <files>
    app/auth/reset-password/page.tsx
    app/auth/reset-password/confirm/page.tsx
    app/actions/auth.ts
    components/login-form.tsx
  </files>
  <action>
Create password reset flow with two pages and server action:

1. **Request page** (`app/auth/reset-password/page.tsx`):
   - Form with email input + "Send reset link" button
   - Use Supabase `auth.resetPasswordForEmail(email, { redirectTo: APP_URL/auth/reset-password/confirm })`
   - Show success message: "Check your email for reset link"
   - Match login page design (same card, Qualia branding)

2. **Confirm page** (`app/auth/reset-password/confirm/page.tsx`):
   - Form with new password input + confirm password input + "Reset password" button
   - On submit: call `resetPasswordAction` server action
   - Show password strength indicator (min 8 chars)
   - After success: redirect to /auth/login with success message

3. **Server action** (`app/actions/auth.ts`):
   - Add `resetPasswordAction(formData: FormData)` that calls `supabase.auth.updateUser({ password: newPassword })`
   - Return ActionResult
   - Re-export in app/actions/index.ts

4. **Wire up button** (`components/login-form.tsx`):
   - Line 122-128: change button to `<Link href="/auth/reset-password">Forgot password?</Link>`

Use existing auth patterns from loginAction. DO NOT use magic links (use `resetPasswordForEmail` + `updateUser`).
</action>
<verify>

```bash
# Navigate to /auth/reset-password, enter email, check Supabase logs for reset email sent
# Follow reset link, enter new password, verify redirect to login
curl -I http://localhost:3000/auth/reset-password  # Should return 200
```

  </verify>
  <done>
Password reset flow complete: request page exists, confirm page exists, server action works, "Forgot password?" button links to reset page, reset emails send via Supabase.
  </done>
</task>

<task type="auto">
  <name>Task 2: Client Invite with Supabase Auth</name>
  <files>
    app/actions/client-portal.ts
  </files>
  <action>
Enhance `inviteClientToProject()` to create Supabase auth account if client doesn't exist:

1. Check if profile with email exists:

   ```typescript
   const { data: existingProfile } = await supabase
     .from('profiles')
     .select('id, role')
     .eq('email', email)
     .single();
   ```

2. If profile exists:
   - Verify role='client' (error if role='admin' or 'employee')
   - Use existing profile.id for client_projects link

3. If profile does NOT exist:
   - Call `supabase.auth.admin.inviteUserByEmail(email, { redirectTo: APP_URL/portal, data: { role: 'client', full_name: clientName } })`
   - Supabase triggers will create profile with role='client' on signup
   - Wait for profile creation (poll with retry, max 5 attempts, 500ms delay)
   - Then create client_projects link

4. Update function signature to accept `email: string` and optional `clientName: string` (instead of clientId)

5. Add activity log entry: "Client invited to project"

DO NOT change removeClientFromProject(). Only enhance inviteClientToProject() with auth invite logic.
</action>
<verify>

```bash
# Run action from admin CRM page, check Supabase auth users table for new user with role='client'
# Check email inbox for Supabase invite email
# Verify profiles table has new entry with role='client'
# Verify client_projects link created
npm run dev  # Test from /clients/[id] page
```

  </verify>
  <done>
Client invite creates Supabase auth account, sends invite email, creates profile with role='client', links to project via client_projects, logs activity. Existing clients skip auth invite.
  </done>
</task>

<task type="auto">
  <name>Task 3: Real Progress Calculation from Phases</name>
  <files>
    app/actions/phases.ts
    components/portal/portal-projects-list.tsx
  </files>
  <action>
Replace hardcoded progress with real calculation from project_phases:

1. **Server action** (`app/actions/phases.ts`):
   - Add `calculateProjectProgress(projectId: string): Promise<number>`
   - Query project_phases for project: `select status from project_phases where project_id = projectId`
   - Calculate: `(count where status='completed') / (total count) * 100`
   - Handle edge case: if no phases exist, return `getProgressForStatus(project.project_status)` fallback
   - Return number (0-100)
   - Re-export in app/actions/index.ts

2. **Portal projects list** (`components/portal/portal-projects-list.tsx`):
   - Remove `getProgressForStatus()` function (lines 50-66)
   - In PortalProjectsList component: for each project, call `calculateProjectProgress(project.id)` server action on mount
   - Store progress in component state: `const [progress, setProgress] = useState<Record<string, number>>({})`
   - Use `progress[project.id] ?? 0` in Progress component value prop
   - Show loading skeleton while calculating

Use existing patterns from portal actions. DO NOT fetch phases client-side (use server action). Handle case where project has no phases gracefully.
</action>
<verify>

```bash
# Navigate to /portal, check progress bars show real percentages
# Create test project with phases: verify 0%, 50%, 100% as phases complete
# Check browser network tab: should see server action call for calculateProjectProgress
npm run dev
```

  </verify>
  <done>
Project progress calculates from actual phase completion, not hardcoded status mapping. Empty projects fall back to status-based progress. Portal shows accurate percentages.
  </done>
</task>

<task type="auto">
  <name>Task 4: Email Notifications on Phase Changes</name>
  <files>
    lib/email.ts
    app/actions/phases.ts
  </files>
  <action>
Send email notifications when phase status changes to completed or blocked:

1. **Email helper** (`lib/email.ts`):
   - Add `notifyClientOfPhaseChange(projectId: string, phaseName: string, newStatus: string, changedBy: string)`
   - Query client_projects to get all clients for project: `select client_id from client_projects where project_id = projectId`
   - For each client: get email from profiles
   - Send email with:
     - Subject: `Phase Update: ${phaseName} — ${project.name}`
     - Body: Clean HTML template (reuse pattern from existing notifications)
     - Content: "The ${phaseName} phase for ${project.name} is now ${newStatus}. View details: ${APP_URL}/portal/${projectId}"
   - Only send for status = 'completed' or 'blocked' (not in_progress or not_started)
   - Use FROM_EMAIL constant

2. **Wire into phase action** (`app/actions/phases.ts`):
   - Find `updatePhaseStatus()` or equivalent action
   - After status update succeeds, call `notifyClientOfPhaseChange()` ONLY if status changed to 'completed' or 'blocked'
   - Check old status !== new status before sending

Follow existing email.ts patterns (getResendClient, error handling, console.log on error). DO NOT send notifications for every status change (only completed/blocked).
</action>
<verify>

```bash
# Update a phase status to 'completed' via admin UI
# Check Resend dashboard for email sent
# Check client email inbox for notification
# Verify email contains project name, phase name, portal link
npm run dev
```

  </verify>
  <done>
Clients receive email when phase status changes to completed or blocked. Email includes phase name, project name, and link to portal. No emails for in_progress or not_started.
  </done>
</task>

<task type="auto">
  <name>Task 5: User-Friendly Auth Error Page</name>
  <files>
    app/auth/error/page.tsx
  </files>
  <action>
Replace raw error display with user-friendly error messages:

1. Create error mapping object:

   ```typescript
   const errorMessages: Record<string, { title: string; message: string }> = {
     access_denied: {
       title: 'Access Denied',
       message:
         'You do not have permission to sign in. Please contact support if this is unexpected.',
     },
     invalid_credentials: {
       title: 'Invalid Credentials',
       message: 'The email or password you entered is incorrect. Please try again.',
     },
     email_not_confirmed: {
       title: 'Email Not Confirmed',
       message: 'Please check your email and click the confirmation link to activate your account.',
     },
     account_locked: {
       title: 'Account Locked',
       message: 'Your account has been temporarily locked. Please contact support.',
     },
     default: {
       title: 'Authentication Error',
       message: 'We encountered an issue signing you in. Please try again or contact support.',
     },
   };
   ```

2. Update ErrorContent component:
   - Map `params.error` to friendly message: `const errorKey = params.error?.toLowerCase().replace(/ /g, '_') || 'default'`
   - Use `errorMessages[errorKey] || errorMessages.default`
   - Display title in CardTitle, message in CardContent
   - Add "Back to login" link button at bottom

3. Remove raw error display (line 15: `Code error: {params.error}`)

DO NOT log internal errors to user. Keep it clean and professional. Match login page aesthetic.
</action>
<verify>

```bash
# Navigate to /auth/error?error=access_denied — verify friendly message shown
# Navigate to /auth/error?error=some_unknown_error — verify default message shown
# Verify no raw Supabase errors visible
# Verify "Back to login" link works
curl http://localhost:3000/auth/error?error=access_denied  # Check response
```

  </verify>
  <done>
Auth error page shows user-friendly messages instead of raw errors. All Supabase error codes mapped to helpful text. "Back to login" link present. No internal details leaked.
  </done>
</task>

</tasks>

<verification>
After all tasks complete:

1. **Password reset flow:** Navigate to /auth/login → click "Forgot password?" → enter email → check inbox → follow link → set new password → verify login works
2. **Client invite:** From admin CRM, invite new client (no existing profile) → check Supabase auth users → verify invite email sent → client can login to portal
3. **Progress calculation:** Navigate to /portal → verify progress bars show real percentages based on phase completion (not hardcoded)
4. **Email notifications:** Mark a phase as completed → verify client receives email with phase name and portal link
5. **Error page:** Navigate to /auth/error?error=access_denied → verify friendly message shown (no raw error codes)

All 5 features should be independent and not break existing functionality.
</verification>

<success_criteria>

- [ ] Password reset flow functional: request page sends reset email, confirm page updates password, redirects to login
- [ ] Client invite creates Supabase auth account if needed, sends invite email, links to project
- [ ] Project progress calculated from actual phase completion (project_phases.status), not hardcoded status mapping
- [ ] Email sent to clients when phase status changes to 'completed' or 'blocked'
- [ ] Auth error page displays user-friendly messages, maps all common Supabase errors, has "Back to login" link
      </success_criteria>

<output>
After completion, create `.planning/quick/001-client-portal-remaining/001-SUMMARY.md` with:
- Files created/modified
- Feature summaries for each task
- Testing notes
- Known limitations (if any)
</output>
