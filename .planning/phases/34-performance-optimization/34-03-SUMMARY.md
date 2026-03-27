---
phase: 34
plan: 03
subsystem: frontend-performance
tags: [framer-motion, lazy-loading, bundle-optimization, animation]
requires: []
provides: [lazy-motion-provider]
affects: [app/layout.tsx, all animated components]
tech-stack:
  added:
    - lib/lazy-motion.tsx (LazyMotionProvider + m + AnimatePresence re-exports)
  patterns:
    - LazyMotion with async features for true bundle splitting
    - m.div/m.span namespace instead of motion.div/motion.span
key-files:
  created:
    - lib/lazy-motion.tsx
  modified:
    - app/layout.tsx
    - components/page-transition.tsx
    - components/project-notes.tsx
    - components/project-team-view.tsx
    - components/project-metric-bar.tsx
    - components/ui/bento-card.tsx
    - components/login-left-panel.tsx
    - components/portal/portal-roadmap.tsx
    - components/new-task-modal.tsx
    - components/new-meeting-modal.tsx
    - components/sidebar-ai.tsx
    - components/today-dashboard/notes-widget.tsx
    - components/today-dashboard/ai-spotlight.tsx
    - components/today-dashboard/building-project-sheet.tsx
    - components/today-dashboard/inbox-widget.tsx
    - components/today-dashboard/dashboard-ai-chat.tsx
    - components/today-dashboard/tasks-widget.tsx
    - components/today-dashboard/admin-notes-widget.tsx
    - app/knowledge/knowledge-page-client.tsx
    - app/research/research-page-client.tsx
    - app/inbox/inbox-view.tsx
key-decisions:
  - useInView (portal-roadmap) kept importing from framer-motion directly — hooks not in domAnimation
  - HTMLMotionProps (bento-card) kept as type-only import from framer-motion directly
  - LazyMotionProvider placed outside ThemeProvider in layout — animations available to all providers
duration: 4 minutes
completed: 2026-03-27T00:55:53Z
---

# Phase 34 Plan 03: Lazy framer-motion Summary

**One-liner:** framer-motion domAnimation features now load asynchronously via LazyMotion provider — removed from the initial JS bundle across all 20 animated components.

## Performance

- **Start:** 2026-03-27T00:51:33Z
- **End:** 2026-03-27T00:55:53Z
- **Duration:** 4 minutes
- **Tasks completed:** 1/1
- **Files modified:** 22 (1 created, 21 updated)

## Accomplishments

1. Created `lib/lazy-motion.tsx` with a `LazyMotionProvider` using an async `loadFeatures` function — framer-motion's `domAnimation` features load asynchronously, not in the initial bundle.
2. Wrapped root `app/layout.tsx` body with `LazyMotionProvider` so all child components have animation context.
3. Migrated all 20 animated component files from the `motion` namespace to the `m` namespace (`m.div`, `m.span`, etc.).
4. Correctly kept two framer-motion direct imports: `useInView` in portal-roadmap (hook, not a motion component) and `HTMLMotionProps` in bento-card (type-only).
5. TypeScript `--noEmit` passes cleanly. Production build succeeds.

## Task Commits

| Task | Name                                               | Commit    | Key Files                                          |
| ---- | -------------------------------------------------- | --------- | -------------------------------------------------- |
| 1    | Create LazyMotion provider + migrate 20 components | `e2c248e` | lib/lazy-motion.tsx, app/layout.tsx, 20 components |

## Files

**Created:**

- `/home/qualia/Projects/qualia-erp/lib/lazy-motion.tsx`

**Modified (22 total):**

- `app/layout.tsx` — added LazyMotionProvider import + wrapper
- `components/page-transition.tsx` — motion → m
- `components/project-notes.tsx` — motion → m
- `components/project-team-view.tsx` — motion → m
- `components/project-metric-bar.tsx` — motion → m
- `components/ui/bento-card.tsx` — motion → m (kept HTMLMotionProps from framer-motion)
- `components/login-left-panel.tsx` — motion → m
- `components/portal/portal-roadmap.tsx` — motion → m (kept useInView from framer-motion)
- `components/new-task-modal.tsx` — motion → m
- `components/new-meeting-modal.tsx` — motion → m
- `components/sidebar-ai.tsx` — motion → m
- `components/today-dashboard/notes-widget.tsx` — motion → m
- `components/today-dashboard/ai-spotlight.tsx` — motion → m
- `components/today-dashboard/building-project-sheet.tsx` — motion → m
- `components/today-dashboard/inbox-widget.tsx` — motion → m
- `components/today-dashboard/dashboard-ai-chat.tsx` — motion → m
- `components/today-dashboard/tasks-widget.tsx` — motion → m
- `components/today-dashboard/admin-notes-widget.tsx` — motion → m
- `app/knowledge/knowledge-page-client.tsx` — motion → m
- `app/research/research-page-client.tsx` — motion → m
- `app/inbox/inbox-view.tsx` — motion → m

## Decisions

| #   | Decision                                           | Rationale                                                                                   |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | `useInView` stays in framer-motion import          | It's a hook, not a motion component — not covered by domAnimation                           |
| 2   | `HTMLMotionProps` stays in framer-motion import    | Type-only, no runtime cost                                                                  |
| 3   | `LazyMotionProvider` wraps ThemeProvider in layout | Ensures animation context is available to all providers including ThemeProvider transitions |

## Deviations from Plan

None — plan executed exactly as written.

## Issues

None.

## Next Phase Readiness

Phase 34 plans:

- 34-01: Complete (bundle analysis + image optimization)
- 34-02: Complete (SWR visibility + rate limiting)
- 34-03: Complete (lazy framer-motion) ← this plan

All three 34 plans are complete. Phase 34 is done.

## Self-Check: PASSED

- lib/lazy-motion.tsx: FOUND
- Commit e2c248e: FOUND
- Remaining motion.\* references in non-template files: 0
- Files importing from @/lib/lazy-motion: 21 (20 components + layout)
