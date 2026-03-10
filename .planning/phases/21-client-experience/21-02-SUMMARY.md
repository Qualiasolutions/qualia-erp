---
phase: 21-client-experience
plan: 02
subsystem: ui, database, api
tags: [supabase, rls, swr, react, portal, client-portal, action-items]

# Dependency graph
requires:
  - phase: 20-portal-foundation-fixes
    provides: Portal architecture, client_projects, portal sidebar, client-portal.ts actions
provides:
  - client_action_items table with RLS (client reads own, admin/manager manages all)
  - getClientActionItems / createClientActionItem / completeClientActionItem server actions
  - useClientActionItems / invalidateClientActionItems SWR hooks
  - PortalActionItems component with urgency color system
  - Dashboard integration showing pending action items below WhatsNextWidget
affects: [21-client-experience, admin-panel, portal-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Action items follow same normalizeFKResponse pattern for project FK arrays'
    - 'Urgency computed client-side from due_date vs today (overdue/due-soon/upcoming)'
    - 'Admin-only completion enforced at server action layer, not RLS'

key-files:
  created:
    - supabase/migrations/20260310000000_client_action_items.sql
    - components/portal/portal-action-items.tsx
  modified:
    - app/actions/client-portal.ts
    - lib/swr.ts
    - app/portal/portal-dashboard-content.tsx

key-decisions:
  - 'Clients cannot mark items complete — enforced in completeClientActionItem server action (not RLS), since RLS would conflict with admin read policy'
  - 'Urgency computed client-side rather than server-side for simpler SWR caching'
  - 'Partial index on client_id WHERE completed_at IS NULL for fast client lookups of pending items'

patterns-established:
  - 'Urgency system: overdue=red, due-soon (<=3 days)=amber, upcoming=muted — reusable pattern for due-date UI'
  - 'Action type icon map: approval/upload/feedback/payment/general — extendable'

# Metrics
duration: 6min
completed: 2026-03-10
---

# Phase 21 Plan 02: Client Action Items Summary

**client_action_items table with RLS, CRUD server actions, SWR hook, and PortalActionItems widget with overdue/due-soon/upcoming urgency colors integrated into the portal dashboard**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-10T16:14:47Z
- **Completed:** 2026-03-10T16:20:43Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- client_action_items table applied to production DB with RLS (client reads own, admin/manager manages all, partial index for pending lookups)
- Three server actions: getClientActionItems (auth-gated), createClientActionItem (Zod-validated, admin-only), completeClientActionItem (admin-only)
- useClientActionItems hook with 45s auto-refresh + invalidateClientActionItems helper in lib/swr.ts
- PortalActionItems component: urgency color system, action type icons via lucide-react, skeleton loading, empty state
- Dashboard shows action items section below WhatsNextWidget

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration + server actions** - `e814ffc` (feat)
2. **Task 2: SWR hook + PortalActionItems component + dashboard integration** - `17670a8` (feat)

## Files Created/Modified

- `supabase/migrations/20260310000000_client_action_items.sql` - Table creation with RLS policies and partial index
- `app/actions/client-portal.ts` - Added getClientActionItems, createClientActionItem, completeClientActionItem
- `lib/swr.ts` - Added clientActionItems cache key, ActionItem interface, useClientActionItems hook, invalidateClientActionItems
- `components/portal/portal-action-items.tsx` - New component with urgency system and action type icons
- `app/portal/portal-dashboard-content.tsx` - Imported and placed PortalActionItems after WhatsNextWidget

## Decisions Made

- Clients cannot self-complete items — enforced in the server action layer. RLS would have required a separate policy and created ambiguity since clients can see their own rows.
- Urgency computed client-side (no server-side `urgency` column) — simpler SWR cache invalidation, no extra DB column.
- Partial index `WHERE completed_at IS NULL` keeps the index small and fast for the common case (fetching pending items).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extra closing brace from Edit tool**

- **Found during:** Task 1 (server actions append)
- **Issue:** An extra `}` appeared at end of file after the Edit tool wrote the new functions, causing TS1128 error
- **Fix:** Removed the stray brace
- **Files modified:** app/actions/client-portal.ts
- **Verification:** `npx tsc --noEmit` passed with no errors in client-portal
- **Committed in:** e814ffc (Task 1 commit)

**2. [Rule 1 - Bug] `.errors` → `.issues` on ZodError**

- **Found during:** Task 1 (TypeScript check)
- **Issue:** Used `.errors[0]` instead of `.issues[0]` on ZodError (linter auto-corrected)
- **Fix:** Linter applied automatically via pre-commit hook
- **Files modified:** app/actions/client-portal.ts
- **Verification:** `npx tsc --noEmit` passed
- **Committed in:** e814ffc (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs caught by TypeScript)
**Impact on plan:** No scope change. Both minor syntax issues, corrected inline.

## Issues Encountered

- Migration history out of sync — required `supabase migration repair --status reverted 20260310` before `db push` could proceed. This is an existing known issue (documented in MEMORY.md).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- client_action_items table live in production with correct RLS
- Admin can now create action items via createClientActionItem (no UI yet — that's a future plan)
- Portal dashboard shows pending items to clients with urgency indicators
- Hooks ready for any future admin UI that needs to list/complete action items

---

_Phase: 21-client-experience_
_Completed: 2026-03-10_

## Self-Check: PASSED

- migration file: FOUND
- client-portal.ts: FOUND (getClientActionItems, createClientActionItem, completeClientActionItem exported)
- swr.ts: FOUND (useClientActionItems, invalidateClientActionItems exported)
- portal-action-items.tsx: FOUND
- portal-dashboard-content.tsx: FOUND
- SUMMARY.md: FOUND
- Commit e814ffc: FOUND
- Commit 17670a8: FOUND
