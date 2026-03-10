---
phase: 21-client-experience
plan: 03
subsystem: ui
tags: [portal, progress-bar, phases, react, tailwind]

# Dependency graph
requires:
  - phase: 20-portal-foundation-fixes
    provides: portal project pages, phase data via usePortalProjectWithPhases
provides:
  - Progress bars on portal projects list (mobile inline + desktop column)
  - Phase progress indicator in project detail header
affects: [22-admin-operations, 24-polish-branding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'progressMap[clientProject.project_id] ?? progressMap[project.id] checked in both orientations'
    - 'Inline mobile progress bar md:hidden pairs with desktop column hidden md:flex'
    - 'Portal header extended with optional completedPhases/totalPhases; renders nothing when totalPhases=0'

key-files:
  created: []
  modified:
    - components/portal/portal-projects-list.tsx
    - components/portal/portal-page-header.tsx
    - app/portal/[id]/portal-project-content.tsx

key-decisions:
  - 'Added mobile inline bar (md:hidden) inside project info div, leaving desktop column intact — two breakpoint paths rather than one responsive bar'
  - 'Desktop zero-phase bar shows dash instead of 0% to avoid meaningless percentage display'
  - "Phase completion filter checks status === 'completed' || status === 'done' matching the existing calculateProjectsProgress logic"

patterns-established:
  - 'Progress bar pattern: h-1 rounded-full bg-border/40 track + bg-qualia-600 fill with transition-all duration-500'
  - 'Conditional rendering: progress > 0 guard prevents broken 0% bars on zero-phase projects'

# Metrics
duration: 12min
completed: 2026-03-10
---

# Phase 21 Plan 03: Portal Progress Bars Summary

**h-1 qualia-600 progress bars added to portal projects list (mobile + desktop) and project detail header with X-of-Y phase count, all conditional on actual phase data existing**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-10T00:00:00Z
- **Completed:** 2026-03-10T00:12:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Projects list now shows progress bar inline on mobile (inside project info div) and in the existing desktop column — zero-phase projects show no bar on mobile and a dash on desktop
- Project detail header extended with optional `completedPhases`/`totalPhases` props; renders "X of Y phases complete" with a matching h-1 progress bar
- `portal-project-content.tsx` computes phase counts from the existing `phases` array before rendering the header

## Task Commits

Each task was committed atomically:

1. **Task 1: Progress bars on projects list** - `f36ea31` (feat)
2. **Task 2: Progress indicator in project detail header** - `a2bcef3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `components/portal/portal-projects-list.tsx` - Added inline mobile progress bar inside project info div; desktop column now conditionally renders fill and shows dash for 0%; progress lookup checks `clientProject.project_id` first
- `components/portal/portal-page-header.tsx` - Added `completedPhases`/`totalPhases` optional props; renders bar + text when `totalPhases > 0`
- `app/portal/[id]/portal-project-content.tsx` - Derives `totalPhases` and `completedPhases` from `phases` array, passes to `PortalPageHeader`

## Decisions Made

- Mobile inline bar added as `md:hidden` inside the project info block, pairing with the existing `hidden md:flex` desktop column. This keeps both surfaces clean without a single bar that awkwardly resizes.
- Desktop zero-phase entry displays a dash (`—`) rather than `0%` — more informative for projects where phases haven't been set up yet.
- Phase count filter matches the server-side `calculateProjectsProgress` logic: `status === 'completed' || status === 'done'`.

## Deviations from Plan

None - plan executed exactly as written, with one small enhancement: the desktop progress column was also improved to show `—` for zero-phase projects rather than a static `0%` text (zero-bar track was already rendering, just the label was always showing `0%`).

## Issues Encountered

- Build lock file present from a prior interrupted build. Removed `.next/lock` before re-running `npm run build`. Build passed cleanly.

## Next Phase Readiness

- Progress bars are live on both portal surfaces
- `portal-page-header.tsx` is now extensible for additional metadata props if needed in phase 24 branding work
- No blockers for remaining phase 21 plans

---

_Phase: 21-client-experience_
_Completed: 2026-03-10_

## Self-Check: PASSED

- `components/portal/portal-projects-list.tsx` — FOUND
- `components/portal/portal-page-header.tsx` — FOUND
- `app/portal/[id]/portal-project-content.tsx` — FOUND
- Commit `f36ea31` — FOUND
- Commit `a2bcef3` — FOUND
