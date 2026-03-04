# Requirements: Qualia Portal & Trainee System

**Defined:** 2026-03-04
**Core Value:** Moayad executes project phases independently with clear guidance; clients see real-time progress without internal complexity

## v1.1 Requirements

Requirements for Apple-level production polish. Each maps to roadmap phases.

### Loading States

- [ ] **LOAD-01**: User sees content-shaped skeleton while portal pages load (not "Loading..." text)
- [ ] **LOAD-02**: User sees skeleton matching real content layout on roadmap, files, and activity pages
- [ ] **LOAD-03**: User sees smooth crossfade from skeleton to real content (no layout shift)
- [ ] **LOAD-04**: User sees Suspense boundaries on slow async components (granular loading)

### Page Transitions

- [ ] **TRANS-01**: User sees smooth fade transition when navigating between portal pages
- [ ] **TRANS-02**: User sees smooth fade transition when navigating between trainee/admin pages
- [ ] **TRANS-03**: User sees modal/dialog entrance animations on open and exit animations on close

### Micro-Interactions

- [ ] **MICRO-01**: User feels button press feedback (scale-down on click, lift on hover)
- [ ] **MICRO-02**: User sees card hover states (lift + shadow) on project cards, phase cards, task cards
- [ ] **MICRO-03**: User sees focus ring animations on form inputs
- [ ] **MICRO-04**: User sees success indicator animation when task is completed (checkmark fade-in)

### Empty States

- [ ] **EMPTY-01**: User sees styled empty state with contextual message on activity feed (no data)
- [ ] **EMPTY-02**: User sees styled empty state on portal projects list when no projects assigned
- [ ] **EMPTY-03**: User sees styled empty state on files page when no files shared

### Dark Mode

- [ ] **DARK-01**: User sees smooth color transition when toggling dark/light mode (no flash)

### Email Notifications

- [ ] **EMAIL-01**: Admin receives email when trainee submits a phase for review
- [ ] **EMAIL-02**: Trainee receives email when admin approves a phase
- [ ] **EMAIL-03**: Trainee receives email when admin requests changes on a phase

### Bug Fixes

- [ ] **FIX-01**: User sees failed comment removed from UI (optimistic rollback on error)
- [ ] **FIX-02**: Schedule grid handleComplete uses fresh task state (no stale closure)

### Schedule Grid Consolidation

- [ ] **GRID-01**: Dashboard, schedule page, and portal use single ScheduleGrid component
- [ ] **GRID-02**: ScheduleGrid supports configurable view modes (day, unified) via props
- [ ] **GRID-03**: ScheduleGrid preserves all existing features (drag-drop, modals, filters, backlog)
- [ ] **GRID-04**: Duplicate schedule grid files deleted after migration (save ~1,700 lines)

### Mobile Responsive

- [ ] **MOBILE-01**: Portal pages render correctly on mobile (375px) with no horizontal scroll
- [ ] **MOBILE-02**: Dialogs become mobile drawers on small screens (Vaul integration)
- [ ] **MOBILE-03**: Touch targets meet 44x44px minimum on all interactive elements
- [ ] **MOBILE-04**: Schedule grid collapses gracefully on mobile with single-column layout
- [ ] **MOBILE-05**: Portal admin panel tables are scrollable on mobile

### Accessibility

- [ ] **A11Y-01**: All animations respect prefers-reduced-motion (disabled for users who request it)

## v1.2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Differentiator Animations

- [x] **ANIM-01**: Stagger animations on list items (tasks, phases, files appear sequentially)
- [x] **ANIM-02**: Scroll-triggered reveals on roadmap phases
- [x] **ANIM-03**: Spring physics on interactive elements
- [x] **ANIM-04**: Gesture-based interactions (swipe to dismiss drawers)

### Additional Polish

- [ ] **POLISH-01**: Activity feed cursor-based pagination with "Load more"
- [ ] **POLISH-02**: Standardized date formatting across portal
- [ ] **POLISH-03**: useServerAction hook to reduce form submission boilerplate
- [ ] **POLISH-04**: Schedule utility file consolidation (3 files → 2)

## Out of Scope

| Feature                           | Reason                                  |
| --------------------------------- | --------------------------------------- |
| GitHub/Vercel API integration     | Deferred to v1.2 — URL links sufficient |
| Real-time collaboration           | Not needed for 2-person team + clients  |
| Client editing or task visibility | Read-only + comments by design          |
| 3D effects or parallax            | Anti-feature — hurts focus, dated UX    |
| Confetti/celebration animations   | Novelty wears off, slows power users    |
| New functional features           | v1.1 is polish only                     |
| Test coverage increase            | Important but separate effort — v1.2    |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.1 Requirements (Phases 4-8)

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| LOAD-01     | Phase 4 | Complete |
| LOAD-02     | Phase 4 | Complete |
| LOAD-03     | Phase 4 | Complete |
| LOAD-04     | Phase 4 | Complete |
| EMPTY-01    | Phase 4 | Complete |
| EMPTY-02    | Phase 4 | Complete |
| EMPTY-03    | Phase 4 | Complete |
| TRANS-01    | Phase 5 | Complete |
| TRANS-02    | Phase 5 | Complete |
| TRANS-03    | Phase 5 | Complete |
| DARK-01     | Phase 5 | Complete |
| A11Y-01     | Phase 5 | Complete |
| MICRO-01    | Phase 6 | Complete |
| MICRO-02    | Phase 6 | Complete |
| MICRO-03    | Phase 6 | Complete |
| MICRO-04    | Phase 6 | Complete |
| EMAIL-01    | Phase 6 | Complete |
| EMAIL-02    | Phase 6 | Complete |
| EMAIL-03    | Phase 6 | Complete |
| FIX-01      | Phase 6 | Complete |
| FIX-02      | Phase 6 | Complete |
| GRID-01     | Phase 7 | Complete |
| GRID-02     | Phase 7 | Complete |
| GRID-03     | Phase 7 | Complete |
| GRID-04     | Phase 7 | Complete |
| MOBILE-01   | Phase 8 | Complete |
| MOBILE-02   | Phase 8 | Complete |
| MOBILE-03   | Phase 8 | Complete |
| MOBILE-04   | Phase 8 | Complete |
| MOBILE-05   | Phase 8 | Complete |

### v1.2 Requirements (Phases 10-11)

| Requirement | Phase    | Status   |
| ----------- | -------- | -------- |
| ANIM-01     | Phase 10 | Complete |
| ANIM-02     | Phase 10 | Complete |
| ANIM-03     | Phase 10 | Complete |
| ANIM-04     | Phase 10 | Complete |
| POLISH-01   | Phase 11 | Pending  |
| POLISH-02   | Phase 11 | Pending  |
| POLISH-03   | Phase 11 | Pending  |
| POLISH-04   | Phase 11 | Pending  |

**Coverage:**

- v1.1 requirements: 30 total, all mapped, all complete
- v1.2 requirements: 8 total, all mapped (100% coverage)
- Unmapped: 0

---

_Requirements defined: 2026-03-04_
_Last updated: 2026-03-04 for v1.2 roadmap creation_
