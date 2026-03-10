---
phase: 20-foundation-fixes
plan: '04'
subsystem: ui
tags: [portal, admin-panel, client-management, server-actions, supabase-auth]

requires:
  - phase: 20-foundation-fixes
    provides: Portal admin panel skeleton with setupClientForProject action

provides:
  - setupPortalForClient server action (CRM email lookup + multi-project linking + rollback)
  - Two-step admin panel UI: CRM client picker → project multi-select → credentials card
  - crmClients prop wired from portal page to admin panel

affects:
  - portal admin workflows
  - client onboarding flow
  - Phase 20-05 (any further portal enhancements)

tech-stack:
  added: []
  patterns:
    - 'CRM-first portal onboarding: email sourced from clients.contacts JSONB, not manually entered'
    - 'Multi-project atomic setup with per-project error collection and orphan rollback'
    - 'Two-step form with step state (1|2) using shadcn Select + custom checkbox buttons'

key-files:
  created: []
  modified:
    - app/actions/client-portal.ts
    - components/portal/portal-admin-panel.tsx
    - app/portal/page.tsx

key-decisions:
  - 'Use node:crypto randomBytes for temp password instead of Math.random() — cryptographically secure'
  - 'Roll back orphaned auth user only when ALL project links fail, not on partial failure'
  - 'Skip duplicate project links silently (count as success), do not error on already-linked'
  - 'CRM client email comes from contacts[0].email JSONB field — existing CRM data, no new input'

patterns-established:
  - 'Admin setup flow reads from CRM (clients table) as source of truth for email, not free-text'
  - 'Multi-project operations collect errors per-item without failing the whole batch'

duration: 4min
completed: 2026-03-10
---

# Phase 20 Plan 04: Client-Centric Admin Panel Rework Summary

**CRM-first portal onboarding: `setupPortalForClient` reads email from `clients.contacts` JSONB, creates auth user with crypto password, links multiple projects atomically with orphan rollback — two-step admin UI replaces single project-dropdown.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T15:27:44Z
- **Completed:** 2026-03-10T15:31:28Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `setupPortalForClient(clientId, projectIds[])` server action: looks up CRM client email, creates/reuses portal auth account, links to multiple projects, rolls back orphaned auth user if all project inserts fail
- Admin panel replaced with two-step flow: (1) pick CRM client by name (email shown in dropdown), (2) multi-select projects via checkbox grid → Create Portal Access
- Credentials card updated to show `projectsLinked` count; existing-account path shows inline confirmation instead of password block
- `app/portal/page.tsx` now queries `clients` table and passes `crmClients` prop alongside existing `projects`

## Task Commits

1. **Task 1: Add setupPortalForClient server action** - `f1ca372` (feat)
2. **Task 2: Rework portal admin panel UI to client-centric flow** - `0b59b16` (feat)

## Files Created/Modified

- `app/actions/client-portal.ts` - Added `setupPortalForClient` export + `node:crypto` import
- `components/portal/portal-admin-panel.tsx` - Replaced single-step form with two-step CRM flow, new `crmClients` prop, updated credentials card
- `app/portal/page.tsx` - Added CRM clients query, passes `crmClients` to `PortalAdminPanel`

## Decisions Made

- Used `node:crypto randomBytes(12).toString('base64url')` for temp password — cryptographically secure vs `Math.random()`
- Orphan rollback only triggers when ALL project links fail (not partial) — partial success is acceptable
- Duplicate project links skipped silently (already linked = success for that project)
- CRM email sourced from `contacts[0].email` — no free-text email input needed in admin panel

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Portal admin panel now uses CRM data as source of truth for client identity
- `setupPortalForClient` is the canonical way to onboard a client; `setupClientForProject` remains but is no longer referenced in the admin UI
- Plan 20-05 can build on this CRM-centric foundation

---

_Phase: 20-foundation-fixes_
_Completed: 2026-03-10_
