---
phase: 25-portal-security-hardening
plan: 01
subsystem: auth
tags: [idor, authorization, portal, security, rls, server-actions]

# Dependency graph
requires:
  - phase: 24-polish-branding
    provides: portal pages in final form
  - phase: 02-client-portal-core
    provides: client_projects table + portal actions

provides:
  - IDOR fix on updateFeatureRequest (client_id ownership scope)
  - Field-level write restriction on updateFeatureRequest for non-admins
  - project_id ownership validation on createFeatureRequest
  - canAccessProject guards on all four phase-comment reader/writer functions
  - Role check on inviteClientToProject blocking non-client profiles
  - canAccessProject extended to allow employee role

affects:
  - 25-02-PLAN
  - 25-03-PLAN
  - portal server actions going forward

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IDOR fix: append .eq('client_id', user.id) after .eq('id', recordId) for non-admin callers"
    - 'Field restriction: strip privileged fields from updateData before mutation for non-admin roles'
    - 'Ownership pre-check: query client_projects before insert when project_id is supplied'
    - 'canAccessProject from lib/portal-utils guards all project-scoped read/write functions'

key-files:
  created: []
  modified:
    - app/actions/client-requests.ts
    - app/actions/phase-comments.ts
    - app/actions/client-portal.ts
    - lib/portal-utils.ts

key-decisions:
  - 'Used existing canAccessProject from lib/portal-utils (not a local duplicate) — import path: @/lib/portal-utils'
  - 'Extended canAccessProject to also allow employee role so team members are not blocked from phase comments'
  - 'createFeatureRequest ownership check only runs when project_id is provided (it is optional) — no check needed for null'
  - "updateFeatureRequest returns 'access denied' on null data rather than propagating a generic DB error"

patterns-established:
  - "IDOR pattern: append .eq('client_id', user.id) as ownership scope for non-admin mutations"
  - 'Role gate pattern: fetch targetProfile.role before linking and reject non-client roles with explicit message'

# Metrics
duration: 12min
completed: 2026-03-10
---

# Phase 25 Plan 01: Portal IDOR Security Hardening Summary

**Four IDOR vulnerabilities patched: feature request ownership scope, project_id creation guard, phase comment access checks, and client-only invite enforcement**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-10T17:49:03Z
- **Completed:** 2026-03-10T18:01:00Z
- **Tasks:** 2 of 2
- **Files modified:** 4

## Accomplishments

- `updateFeatureRequest`: non-admin callers scoped to own records via `.eq('client_id', user.id)` — prevents client A modifying client B's request by guessing UUID
- `updateFeatureRequest`: non-admins stripped of `status` and `admin_response` write access (field-level restriction)
- `createFeatureRequest`: validates `project_id` ownership against `client_projects` before insert when a project_id is supplied
- `createPhaseComment`, `getPhaseComments`, `getPhaseCommentCount`, `getProjectCommentsCount`: all gate on `canAccessProject` from `lib/portal-utils`
- `inviteClientToProject`: rejects profiles where `role !== 'client'` with explicit error message
- `canAccessProject` in `lib/portal-utils.ts` extended to allow `employee` role so team members keep full access to phase comments

## Task Commits

1. **Task 1: Fix IDOR in client-requests.ts** - `1f6b6bd` (fix)
2. **Task 2: Fix IDOR in phase-comments.ts and inviteClientToProject role check** - `5848100` (fix)

## Files Created/Modified

- `app/actions/client-requests.ts` - IDOR fix on updateFeatureRequest + project_id ownership check on createFeatureRequest
- `app/actions/phase-comments.ts` - canAccessProject guard on createPhaseComment, getPhaseComments, getPhaseCommentCount, getProjectCommentsCount
- `app/actions/client-portal.ts` - role check in inviteClientToProject blocking non-client profiles
- `lib/portal-utils.ts` - extended canAccessProject to also allow employee role

## Decisions Made

- Imported `canAccessProject` from `@/lib/portal-utils` (not `./shared` — `shared.ts` has a different `canAccessProject` scoped to workspace membership). These are two distinct functions with different semantics.
- Extended `canAccessProject` in `portal-utils.ts` to allow `employee` role because phase comments are also written by team members (confirmed by existing code at line 52 of phase-comments.ts).
- `createFeatureRequest` ownership check only runs when `project_id` is provided — the field is optional and submissions without a project_id are valid.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Discovered employee role blocked by canAccessProject**

- **Found during:** Task 2 (phase-comments IDOR fix)
- **Issue:** `canAccessProject` in `portal-utils.ts` only bypassed for admin/manager. Employees who write phase comments would get 'access denied' after the guard was added.
- **Fix:** Added `|| profile?.role === 'employee'` to the bypass condition in `lib/portal-utils.ts`
- **Files modified:** `lib/portal-utils.ts`
- **Verification:** TypeScript passes, build passes. Employee bypass consistent with existing code in phase-comments.ts that treats employees as non-client users.
- **Committed in:** `5848100` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical: employee access would have been broken)
**Impact on plan:** Necessary correction — without it, employees would be denied access to phase comments after the guard was added. No scope creep.

## Issues Encountered

None — plan executed cleanly. TypeScript zero errors, build passed on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- IDOR vulnerabilities from plan 01 fully patched
- Ready for 25-02 (token-based invitation security) and 25-03 (remaining security hardening)
- `canAccessProject` in `portal-utils.ts` is now the canonical project access gate for portal actions

---

_Phase: 25-portal-security-hardening_
_Completed: 2026-03-10_

## Self-Check: PASSED

- `app/actions/client-requests.ts` — FOUND
- `app/actions/phase-comments.ts` — FOUND
- `app/actions/client-portal.ts` — FOUND
- `lib/portal-utils.ts` — FOUND
- Commit `1f6b6bd` (Task 1) — FOUND
- Commit `5848100` (Task 2) — FOUND
