---
phase: 21-client-experience
plan: 01
subsystem: ui
tags: [react, portal, phases, progress, dashboard]

# Dependency graph
requires:
  - phase: 20-portal-foundation-fixes
    provides: portal dashboard architecture, usePortalDashboard hook with currentPhase/nextPhase data
provides:
  - WhatsNextWidget component for client portal dashboard
  - Visual phase progress with hero number, progress bar, Now/Next labels per project
affects:
  - 21-02-PLAN.md
  - 21-03-PLAN.md

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'WhatsNextWidget: accepts ProjectWithPhases[] + isLoading, renders one card per project'
    - 'Progress bar: CSS transition-all duration-500, width set via inline style from progress prop'
    - 'Skeleton loading: single card skeleton shown while isLoading, returns null when no projects'

key-files:
  created:
    - components/portal/portal-whats-next-widget.tsx
  modified:
    - app/portal/portal-dashboard-content.tsx

key-decisions:
  - 'Interface duplicated in widget (not imported from dashboard) to keep component self-contained'
  - 'Returns null on empty projects array — upstream component handles empty state messaging'
  - 'CSS-only transitions, no framer-motion, per plan spec'

patterns-established:
  - 'ProjectPhaseCard: sub-component renders single project block, keeps WhatsNextWidget clean'
  - 'ProjectPhaseSkeleton: mirrors card layout for zero layout shift on load'

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 21 Plan 01: What's Next Widget Summary

**Hero progress widget surfacing current/next phase per project on client portal dashboard, with skeleton loading, empty-state handling, and CSS progress bar animation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T11:54:45Z
- **Completed:** 2026-03-10T11:58:20Z
- **Tasks:** 2
- **Files modified:** 2 (+ 1 pre-existing bug fixed)

## Accomplishments

- Created `WhatsNextWidget` component with per-project phase cards: hero progress number, animated progress bar, Now/Next phase labels
- Handles zero-phases gracefully ("No phases configured"), handles complete projects (green "Complete" + CheckCircle2 icon)
- Integrated widget into `portal-dashboard-content.tsx` between stats and projects list with section heading

## Task Commits

Each task was committed atomically:

1. **Task 1: Create WhatsNextWidget component** - `7101f36` (feat)
2. **Task 2: Integrate WhatsNextWidget into dashboard** - `6de1de2` (feat)

**Plan metadata:** committed after summary

## Files Created/Modified

- `components/portal/portal-whats-next-widget.tsx` - WhatsNextWidget + ProjectPhaseCard + ProjectPhaseSkeleton sub-components
- `app/portal/portal-dashboard-content.tsx` - Added import and "What's next" section with heading

## Decisions Made

- Interface `ProjectWithPhases` duplicated in the widget rather than imported from the dashboard file — keeps the widget self-contained and avoids coupling to a `'use client'` file
- `WhatsNextWidget` returns `null` on empty projects array — the dashboard's `PortalRecentActivity` already handles the empty project state
- Single skeleton card shown during loading (not per-project count) — project count is unknown until data loads

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed extra closing brace and Zod `.errors` reference in client-portal.ts**

- **Found during:** Task 2 verification (build step)
- **Issue:** Pre-existing uncommitted code in `app/actions/client-portal.ts` had an extra `}` brace at end of file (line 1576) causing Turbopack parse error, plus `validated.error.errors` should be `.issues` per Zod v3 API
- **Fix:** Removed extra brace, changed `.errors[0]` to `.issues[0]`
- **Files modified:** `app/actions/client-portal.ts`
- **Verification:** `npx tsc --noEmit` clean, `npm run build` passes
- **Committed in:** staged with task 2 pre-commit hooks

---

**Total deviations:** 1 auto-fixed (Rule 1 - pre-existing syntax bug blocking build)
**Impact on plan:** Fix was necessary for build to pass. No scope creep.

## Issues Encountered

- Git stash/pop during pre-existing-work investigation briefly reverted `portal-dashboard-content.tsx` — file was already correctly updated by the time of the Task 2 commit (confirmed via `git show`)

## Next Phase Readiness

- WhatsNextWidget is live on the client dashboard; clients can see current/next phase at a glance
- No blockers for plans 21-02 and 21-03

## Self-Check: PASSED

- `components/portal/portal-whats-next-widget.tsx` — FOUND
- `app/portal/portal-dashboard-content.tsx` — FOUND
- Commit `7101f36` (feat: create WhatsNextWidget) — FOUND
- Commit `6de1de2` (feat: integrate WhatsNextWidget) — FOUND

---

_Phase: 21-client-experience_
_Completed: 2026-03-10_
