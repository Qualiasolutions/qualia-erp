# Phase 20: Portal Foundation Fixes

**Milestone:** v1.5 Production-Ready Client Portal
**Goal:** Fix critical portal bugs and verify end-to-end client onboarding flow works flawlessly
**Priority:** P0 - Must work before Moayad uses it
**Plans:** 3 plans in 1 wave

## Context

Based on client portal architecture research and testing, several critical issues block production use:

1. Project creation from portal admin panel fails silently
2. Client invite → account creation → login flow needs end-to-end verification
3. Credentials display after invite may not be working properly

## Success Criteria

**What must be TRUE after completion:**

1. **Admin can create projects** - Portal admin panel project creation works and shows in project grid immediately
2. **Invite flow works end-to-end** - Admin invites client → client gets credentials → client logs in → sees their project
3. **Error handling is visible** - All failure modes show clear error messages, no silent failures
4. **Real-time updates work** - Admin panel updates immediately after operations (router.refresh() works)

## Plans

### Plan 20-01: Fix Project Creation Bug

**Goal:** Debug and fix the "project creation doesn't save" issue in portal admin panel
**Tasks:**

- Test project creation flow with better error logging
- Verify `createProjectFromPortal` server action works with real data
- Ensure project appears in both admin panel dropdown AND project grid
- Test router.refresh() triggers server re-render correctly

### Plan 20-02: Verify Client Invite Flow End-to-End

**Goal:** Test complete flow from admin invite to client login and portal access
**Tasks:**

- Admin creates project and invites client with email
- Verify credentials dialog appears with email/password/portal URL
- Test credentials work at https://qualia-erp.vercel.app/auth/login
- Verify client lands on /portal and sees their assigned project
- Test project detail pages (updates, files, roadmap) load correctly

### Plan 20-03: Improve Error Handling and UX

**Goal:** Add proper error states and loading feedback throughout portal admin panel
**Tasks:**

- Add loading states to all form submissions
- Improve error toasts with specific DB error messages
- Add confirmation dialogs for destructive actions (remove client access)
- Test offline/network error scenarios

## Dependencies

None - this is foundational work

## Risk Assessment

**Low risk** - These are bug fixes and verification, not new features

## Validation

**Manual testing required:**

1. Admin creates project → appears in dropdown and grid
2. Admin invites client → gets credentials → shares with test user
3. Test user logs in → sees project → navigates portal successfully
4. Error cases (invalid email, duplicate invite) show proper messages
