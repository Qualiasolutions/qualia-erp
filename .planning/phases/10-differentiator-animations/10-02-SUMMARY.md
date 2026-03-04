---
phase: 10-differentiator-animations
plan: 02
subsystem: ui
tags: [framer-motion, spring-physics, css-animations, micro-interactions]

# Dependency graph
requires:
  - phase: 06-micro-interactions-email-notifications
    provides: data-slot button selectors and card-interactive patterns
provides:
  - Spring physics on button interactions via CSS cubic-bezier curves
  - Spring-based card hover states for phase cards, task items, and portal projects
  - Elastic, natural movement replacing linear transitions
affects: [10-01-stagger-scroll, 10-03-gesture-interactions, v1.2-animations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Spring physics via cubic-bezier(0.34, 1.56, 0.64, 1) for elastic feel
    - Framer Motion whileHover with spring config (stiffness: 300, damping: 20)
    - CSS-based spring animations work with Slot.Root pattern

key-files:
  created: []
  modified:
    - app/globals.css
    - components/project-pipeline/phase-card.tsx
    - components/project-pipeline/task-item.tsx

key-decisions:
  - "SPRING-01: Use CSS spring curves for buttons instead of Framer Motion wrapper - preserves existing Slot.Root pattern, works with all variants"
  - "SPRING-02: Framer Motion whileHover for cards with spring config (stiffness 300, damping 20) - provides natural elastic hover lift"
  - "SPRING-03: Portal projects inherit spring animations via card-interactive class - no code changes needed, automatic consistency"

patterns-established:
  - "Spring physics pattern: CSS cubic-bezier for simple interactions, Framer Motion springs for complex hover states"
  - "Spring configuration standard: stiffness 300, damping 20 for card hover interactions"
  - "Accessibility: Framer Motion v12+ auto-respects prefers-reduced-motion, CSS override from Phase 5"

# Metrics
duration: 1min
completed: 2026-03-04
---

# Phase 10 Plan 02: Spring Physics Summary

**Spring physics on buttons and cards using CSS cubic-bezier curves and Framer Motion hover states for elastic, natural movement**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-04T21:10:44Z
- **Completed:** 2026-03-04T21:11:39Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Button active state now uses spring-like cubic-bezier curve for elastic press feedback
- Card interactive hover enhanced with subtle scale and spring-based lift
- Phase cards and task items use Framer Motion spring physics for natural hover movement
- Portal project cards automatically inherit spring animations via card-interactive class

## Task Commits

Each task was committed atomically:

1. **Task 1: Add spring physics to button component** - `d100079` (feat)
2. **Task 2: Add spring physics to card hover states** - `92a22f5` (feat)

## Files Created/Modified

- `app/globals.css` - Enhanced button active state with spring curve, card-interactive hover with spring lift and scale
- `components/project-pipeline/phase-card.tsx` - Added whileHover with spring physics (y: -4, stiffness: 300, damping: 20)
- `components/project-pipeline/task-item.tsx` - Added subtle whileHover spring lift (y: -2, same spring config)

## Decisions Made

**SPRING-01: CSS spring curves for buttons**

- Rationale: Button uses Slot.Root pattern for asChild prop. Wrapping with motion.button would break this. CSS-based spring animation via data-slot selector works with ALL variants including asChild, maintains Phase 6 architecture, and provides spring-like feel without React changes.

**SPRING-02: Framer Motion whileHover for cards**

- Rationale: Cards already use motion.div, making whileHover the natural choice. Spring config (stiffness 300, damping 20) provides elastic feel without excessive bounce. Separate from CSS transition for maximum control.

**SPRING-03: Portal projects inherit via card-interactive class**

- Rationale: portal-projects-list.tsx already uses card-interactive class. CSS-based spring hover applies automatically, ensuring consistent behavior across all card types without code duplication.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Spring physics foundation complete for v1.2 milestone
- Ready for gesture-based interactions (Plan 10-03) and scroll-triggered reveals (Plan 10-01)
- All animations respect prefers-reduced-motion via Framer Motion v12+ and Phase 5 CSS overrides
- Pattern established: CSS for simple springs, Framer Motion for complex hover states

## Self-Check: PASSED

All claimed files verified:

- ✓ app/globals.css
- ✓ components/project-pipeline/phase-card.tsx
- ✓ components/project-pipeline/task-item.tsx

All claimed commits verified:

- ✓ d100079 (Task 1)
- ✓ 92a22f5 (Task 2)

Note: Plan 10-01 also modified phase-card.tsx (adding scroll-triggered reveals with useInView). Both plans coexist without conflicts - 10-01 handles scroll reveal, 10-02 handles spring hover physics.

---

_Phase: 10-differentiator-animations_
_Completed: 2026-03-04_
