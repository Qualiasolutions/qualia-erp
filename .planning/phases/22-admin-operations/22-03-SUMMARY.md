---
phase: 22-admin-operations
plan: '03'
subsystem: ui
tags: [admin, credentials, password-reset, client-portal, server-action, node-crypto]

# Dependency graph
requires:
  - phase: 22-02
    provides: Enhanced client management table with MergedPortalClient type and last login tracking
provides:
  - resetClientPassword server action returning new temp password via admin API
  - Export Credentials collapsible section per project in admin panel
  - Per-row Reset Password (RotateCcw) with inline credential card
  - Bulk Reset All for project with results list and Copy All
affects:
  - 22-admin-operations
  - portal admin panel

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'resetClientPassword follows same admin listUsers + updateUserById pattern as setupPortalForClient'
    - 'Per-row transient UI state (resetResults record keyed by client.id) with 30s auto-dismiss'
    - 'Bulk reset runs sequentially (not Promise.all) to respect Supabase auth admin rate limits'

key-files:
  created: []
  modified:
    - app/actions/client-portal.ts
    - components/portal/portal-admin-panel.tsx

key-decisions:
  - 'No email sent on reset — returns tempPassword for Moayad to share manually, matching new-account pattern'
  - 'Export block uses plain text (not CSV/PDF) — no external library, copyable in one click'
  - 'Bulk reset runs sequentially following the established pattern from bulkSetupPortalForClients'

patterns-established:
  - 'Inline credential cards use 30s auto-dismiss with manual X dismiss for transient UI state'
  - 'Export Credentials section defaults collapsed — toggle to show, avoids visual clutter'

# Metrics
duration: 18min
completed: 2026-03-10
---

# Phase 22 Plan 03: Credential Management Summary

**Admin credential reset via node:crypto + Supabase admin API, with per-client inline password display, project export block (plain text, clipboard), and bulk reset with results list.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-10T17:45:44Z
- **Completed:** 2026-03-10T18:03:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `resetClientPassword` server action: generates `Qualia-<12-hex>!` temp password via `node:crypto randomBytes`, looks up auth user by email via `admin.listUsers`, updates via `admin.updateUserById`, returns `{ email, tempPassword, name }` for manual sharing
- Export Credentials collapsible section: project dropdown generates a formatted plain-text block (portal access summary with name/email/portal URL per client), copies to clipboard in one click with "Copied!" flash
- Per-row RotateCcw button: spinner while pending, inline credential card on success showing new password with Copy + dismiss, auto-dismisses after 30 seconds
- Bulk Reset for project: "Reset All for [Project]" button appears when project filter active, runs resets sequentially, shows results list with success/error per client, "Copy All" copies `Name | Email | Password` per line

## Task Commits

Each task was committed atomically:

1. **Task 1: Add resetClientPassword server action** - `cd127e9` (feat)
2. **Task 2: Add Export Credentials, per-row Reset, and Bulk Reset UI** - `daf3706` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `app/actions/client-portal.ts` - Added `resetClientPassword` exported server action (~70 lines)
- `components/portal/portal-admin-panel.tsx` - Added Export section, RotateCcw per row, Bulk Reset button, state and handlers (+419 lines)

## Decisions Made

- No email sent on password reset — returns `tempPassword` directly for Moayad to share manually, consistent with `setupPortalForClient` pattern
- Export block is plain text, not CSV/PDF — avoids external library dependency, human-readable, clipboard-friendly
- Bulk reset runs sequentially to match established pattern and respect Supabase auth API rate limits

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 22 (Admin Operations) complete — all 3 plans shipped
- Phase 23 (Communication) or Phase 24 (Polish/Branding) can proceed
- Credential management is fully self-contained; no downstream blockers

---

_Phase: 22-admin-operations_
_Completed: 2026-03-10_
