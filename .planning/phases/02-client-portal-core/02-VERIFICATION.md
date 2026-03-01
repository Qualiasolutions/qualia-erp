---
phase: 02-client-portal-core
verified: 2026-03-01T18:30:00Z
status: gaps_found
score: 5/6 must-haves verified
gaps:
  - truth: 'Admin can invite a client to a project (creates client_projects link)'
    status: partial
    reason: 'Server action exists and works but no admin UI wired to call it'
    artifacts:
      - path: 'app/actions/client-portal.ts'
        issue: "inviteClientToProject and removeClientFromProject actions exist but aren't exposed in any admin interface"
    missing:
      - 'Admin UI component or button to invoke inviteClientToProject'
      - 'UI should be in /clients/[id] page or /projects/[id] page'
      - 'Wire the existing action to a button/form in admin interface'
human_verification:
  - test: 'Login as client user and verify automatic redirect to /portal'
    expected: 'Client lands on /portal, not on root /'
    why_human: 'Requires actual login flow and redirect behavior'
  - test: 'Try accessing /projects as client user'
    expected: 'Redirected back to /portal'
    why_human: 'Middleware redirect behavior needs browser testing'
  - test: 'Verify portal layout has no admin sidebar or internal navigation'
    expected: 'Only Qualia header with logo and user dropdown visible'
    why_human: 'Visual layout verification'
  - test: 'View project roadmap as client'
    expected: 'See phase names, statuses, dates but NO task details or phase items'
    why_human: "Visual verification of what's hidden vs shown"
---

# Phase 2: Client Portal Core Verification Report

**Phase Goal:** Clients can log in, see their assigned projects, and view simplified roadmap progress
**Verified:** 2026-03-01T18:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                  | Status     | Evidence                                                                                              |
| --- | -------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| 1   | Client role users are automatically redirected to /portal after login                  | ✓ VERIFIED | middleware.ts lines 78-86: redirects client role to /portal for root and internal routes              |
| 2   | Client cannot access internal routes like /projects, /inbox, /admin                    | ✓ VERIFIED | middleware.ts lines 66-75: blocks 8 internal routes for client role                                   |
| 3   | Admin can invite a client to a project (creates client_projects link)                  | ⚠️ PARTIAL | inviteClientToProject exists in app/actions/client-portal.ts but NO UI wired to call it               |
| 4   | Client sees list of their assigned projects at /portal                                 | ✓ VERIFIED | app/portal/page.tsx calls getClientProjects, PortalProjectsList renders cards                         |
| 5   | Client sees simplified roadmap at /portal/[id] with phase names, progress, status only | ✓ VERIFIED | app/portal/[id]/page.tsx queries project_phases only, PortalRoadmap shows phases without task details |
| 6   | Portal has clean, branded layout without admin sidebar                                 | ✓ VERIFIED | app/portal/layout.tsx has PortalHeader (logo + user menu) and footer, no sidebar or internal nav      |

**Score:** 5/6 truths verified (1 partial)

### Required Artifacts

| Artifact                                     | Expected                                        | Status     | Details                                                                                      |
| -------------------------------------------- | ----------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `middleware.ts`                              | Role-based routing logic                        | ✓ VERIFIED | 118 lines, role query lines 56-60, client redirect 78-86, admin redirect 90-94               |
| `app/actions/client-portal.ts`               | Client portal server actions                    | ✓ VERIFIED | 174 lines, exports inviteClientToProject, removeClientFromProject, getClientProjects         |
| `lib/portal-utils.ts`                        | Portal utility functions                        | ✓ VERIFIED | 63 lines, exports isClientRole, canAccessProject, getClientProjectIds                        |
| `app/portal/layout.tsx`                      | Portal layout without admin sidebar             | ✓ VERIFIED | 46 lines, isClientRole check, PortalHeader component, no sidebar                             |
| `app/portal/page.tsx`                        | Client projects list page                       | ✓ VERIFIED | 44 lines, calls getClientProjects, passes to PortalProjectsList                              |
| `app/portal/[id]/page.tsx`                   | Simplified project roadmap page                 | ✓ VERIFIED | 74 lines, canAccessProject check, queries project_phases, passes to PortalRoadmap            |
| `components/portal/portal-projects-list.tsx` | Projects list component for clients             | ✓ VERIFIED | 161 lines, card grid with status badges, progress bars, empty state                          |
| `components/portal/portal-roadmap.tsx`       | Simplified roadmap component                    | ✓ VERIFIED | 225 lines, vertical timeline, phase status/dates/description, NO task details or phase items |
| `components/portal/portal-header.tsx`        | Clean header with Qualia logo and user dropdown | ✓ VERIFIED | 89 lines, Qualia Q logo, user menu with sign out                                             |

All artifacts exist and are substantive (no TODOs/placeholders found).

### Key Link Verification

| From                                 | To                           | Via                          | Status      | Details                                                                 |
| ------------------------------------ | ---------------------------- | ---------------------------- | ----------- | ----------------------------------------------------------------------- |
| middleware.ts                        | profiles.role                | Supabase query               | ✓ WIRED     | Lines 56-60: queries profiles table for role after auth                 |
| middleware.ts                        | /portal redirect             | NextResponse.redirect        | ✓ WIRED     | Lines 83-85: redirects client to /portal                                |
| app/portal/page.tsx                  | getClientProjects action     | Server component direct call | ✓ WIRED     | Line 17: calls getClientProjects(user.id), result passed to component   |
| app/portal/[id]/page.tsx             | canAccessProject check       | Authorization check          | ✓ WIRED     | Line 23: verifies access before showing project, redirects if denied    |
| app/portal/[id]/page.tsx             | project_phases query         | Supabase query               | ✓ WIRED     | Lines 40-44: queries project_phases with ordering                       |
| app/actions/client-portal.ts         | client_projects table        | Supabase insert              | ✓ WIRED     | Lines 44-52: inserts into client_projects with invited_by and timestamp |
| components/portal/portal-roadmap.tsx | Phase rendering (NO tasks)   | Props from page              | ✓ WIRED     | Renders phases array, only shows name/status/dates/description          |
| Admin UI                             | inviteClientToProject action | NO WIRING                    | ✗ NOT_WIRED | Action exists but no UI component calls it                              |

**Wiring gap:** inviteClientToProject and removeClientFromProject actions are not called from any admin interface.

### Requirements Coverage

Phase 2 requirements from ROADMAP.md:

| Requirement | Description                                               | Status      | Blocking Issue                                 |
| ----------- | --------------------------------------------------------- | ----------- | ---------------------------------------------- |
| AUTH-01     | Client role users redirected to /portal                   | ✓ SATISFIED | middleware.ts implements role-based redirect   |
| AUTH-02     | Client users blocked from internal routes                 | ✓ SATISFIED | middleware.ts blocks 8 internal routes         |
| AUTH-03     | Admin/employee users redirected from /portal to dashboard | ✓ SATISFIED | middleware.ts lines 90-94                      |
| PORT-01     | Client sees list of assigned projects                     | ✓ SATISFIED | /portal page with PortalProjectsList component |
| PORT-02     | Client sees simplified roadmap with phase-level progress  | ✓ SATISFIED | /portal/[id] page with PortalRoadmap component |
| PORT-03     | Admin can invite client to project                        | ⚠️ BLOCKED  | Action exists but no UI to invoke it           |
| PORT-04     | Portal has clean layout without admin sidebar             | ✓ SATISFIED | Portal layout with branded header only         |

**Score:** 6/7 requirements satisfied (1 blocked by missing UI)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| None | -    | -       | -        | -      |

**Clean implementation:** No TODO comments, no stub patterns, no placeholder implementations found.

### Human Verification Required

#### 1. Client Login Redirect Flow

**Test:**

1. Create test user with `role='client'` in profiles table
2. Login as that user at /auth/login
3. Observe landing page

**Expected:**

- Client lands on /portal (not root /)
- URL shows /portal
- Portal header visible (not admin sidebar)

**Why human:** Requires actual authentication flow and browser redirect observation

#### 2. Internal Route Access Blocking

**Test:**

1. Login as client user
2. Manually navigate to /projects in address bar
3. Try /inbox, /admin, /schedule, /team

**Expected:**

- Each attempt redirects back to /portal
- Client never sees internal pages

**Why human:** Middleware redirect behavior needs browser testing

#### 3. Portal Layout Visual Verification

**Test:**

1. Login as client
2. Observe page layout at /portal

**Expected:**

- Header with Qualia logo (teal Q) on left
- User dropdown on right
- No admin sidebar
- No internal navigation links
- Footer with support link

**Why human:** Visual layout verification

#### 4. Simplified Roadmap Display

**Test:**

1. Assign client to project (will need admin UI from gap fix)
2. Login as client
3. Click project card
4. View roadmap at /portal/[id]

**Expected:**

- Phase names visible (e.g., "PLAN", "DESIGN")
- Phase statuses with color-coded dots
- Start and target dates visible
- Phase descriptions visible
- **NO task details**
- **NO phase items**
- **NO team members**
- **NO internal comments**

**Why human:** Visual verification of what's hidden vs shown

#### 5. Project Access Control

**Test:**

1. Find project ID that client is NOT assigned to
2. Login as client
3. Navigate to /portal/[unassigned-project-id]

**Expected:**

- Redirect to /portal
- Cannot view unauthorized project

**Why human:** Access control enforcement testing

#### 6. Empty State Display

**Test:**

1. Create client user with no assigned projects
2. Login as that client
3. View /portal

**Expected:**

- Empty state shows with icon
- Message: "No projects assigned yet. Contact your project manager for access."

**Why human:** Visual empty state verification

### Gaps Summary

**1 gap prevents full goal achievement:**

**Gap: Admin Invite UI Missing**

The server action `inviteClientToProject` exists and is fully implemented with:

- Admin role validation
- Duplicate check
- client_projects insert with invited_by and invited_at tracking
- Path revalidation

**BUT:** No admin UI component calls this action. Clients cannot be assigned to projects through the interface.

**Impact:** Success criterion #3 is only partially met. The backend works, but there's no way for admins to actually invite clients without manual database manipulation.

**Fix needed:**

1. Add UI component in `/clients/[id]/page.tsx` or `/projects/[id]/page.tsx`
2. Display available projects or clients (depending on entry point)
3. Button/form to invoke `inviteClientToProject(projectId, clientId)`
4. Display success/error feedback
5. Consider also wiring `removeClientFromProject` for access removal

**Suggested location:** `/clients/[id]/page.tsx` - add "Assign to Projects" section showing:

- Projects client has access to
- Dropdown to add new project access
- Remove button for each assigned project

---

_Verified: 2026-03-01T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
