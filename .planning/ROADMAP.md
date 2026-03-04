# Roadmap: Qualia Portal & Trainee System

## Milestones

- ✅ **v1.0 MVP** - Phases 0-3 (shipped 2026-03-01)
- ✅ **v1.1 Production Polish** - Phases 4-8 (shipped)
- 🚧 **v1.2 Premium Animations** - Phases 10-11 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 0-3) - SHIPPED 2026-03-01</summary>

### Phase 0: Database Foundation

**Goal**: Database schema and RLS policies support trainee execution and client portal
**Plans**: 1 plan

Plans:

- [x] 00-01: Create tables, extend files table, add RLS policies, create helper function

### Phase 1: Trainee Execution System

**Goal**: Trainee can execute project phases with interactive guidance and submit for review
**Plans**: 2 plans

Plans:

- [x] 01-01: Phase review workflow (server actions, button component, admin panel)
- [x] 01-02: Interactive task checklist with GSD commands and phase locking

### Phase 2: Project Context

**Goal**: Project integrations visible in project detail pages
**Plans**: 1 plan

Plans:

- [x] 02-01: Project integrations component wired into project detail page

### Phase 3: Client Portal

**Goal**: Clients can log in and view project progress, files, and updates
**Plans**: 4 plans

Plans:

- [x] 03-01: Client auth, middleware routing, portal layout
- [x] 03-02: Portal projects list and roadmap view
- [x] 03-03: Shared files with visibility toggle and client download
- [x] 03-04: Client comments and activity feed

</details>

<details>
<summary>✅ v1.1 Production Polish - SHIPPED</summary>

**Milestone Goal:** Make client portal and trainee system Apple-level polished, fully functional, and ready to ship to real clients

#### Phase 4: Loading & Empty States Foundation

**Goal**: Users see polished loading skeletons and empty states across all portal and trainee pages

**Depends on**: Phase 3 (v1.0 shipped)

**Requirements**: LOAD-01, LOAD-02, LOAD-03, LOAD-04, EMPTY-01, EMPTY-02, EMPTY-03

**Success Criteria** (what must be TRUE):

1. User sees content-shaped skeleton while any portal page loads (never "Loading..." text)
2. User sees smooth crossfade from skeleton to real content with no layout shift
3. User sees contextual empty state message when activity feed has no data
4. User sees contextual empty state message when no projects assigned in portal
5. User sees contextual empty state message when no files shared on files page

**Plans**: 3 plans

Plans:

- [x] 04-01-PLAN.md — Portal skeleton components and loading.tsx files
- [x] 04-02-PLAN.md — Crossfade transitions from skeleton to content
- [x] 04-03-PLAN.md — Polish empty states to Apple-level quality

#### Phase 5: Animation System Infrastructure

**Goal**: Portal and trainee pages have smooth page transitions and dark mode toggle with motion infrastructure in place

**Depends on**: Phase 4

**Requirements**: TRANS-01, TRANS-02, TRANS-03, DARK-01, A11Y-01

**Success Criteria** (what must be TRUE):

1. User sees smooth fade transition when navigating between portal pages (no flash)
2. User sees smooth fade transition when navigating between trainee/admin pages
3. User sees modal/dialog entrance and exit animations on all dialogs
4. User sees smooth color transition when toggling dark/light mode (no flash)
5. All animations respect prefers-reduced-motion setting (disabled for users who request it)

**Plans**: 1 plan

Plans:

- [x] 05-01-PLAN.md — Enable page transitions, dark mode transitions, and reduced motion support

#### Phase 6: Micro-Interactions & Email Notifications

**Goal**: Users feel premium interaction feedback on every click/hover and all stakeholders receive email notifications for phase review workflow

**Depends on**: Phase 5

**Requirements**: MICRO-01, MICRO-02, MICRO-03, MICRO-04, EMAIL-01, EMAIL-02, EMAIL-03, FIX-01, FIX-02

**Success Criteria** (what must be TRUE):

1. User feels button press feedback (scale-down on click, lift on hover) on all buttons
2. User sees card hover states (lift + shadow) on project cards, phase cards, and task cards
3. User sees success indicator animation when task is completed (checkmark fade-in)
4. Admin receives email when trainee submits phase for review
5. Trainee receives email when admin approves or requests changes on phase
6. User sees failed comment removed from UI immediately (optimistic rollback works)

**Plans**: 2 plans

Plans:

- [x] 06-01-PLAN.md — Button press feedback, card hover states, focus ring animations, task completion success indicator
- [x] 06-02-PLAN.md — Phase review email notifications (submit, approve, changes requested) + bug fixes (comment rollback, schedule closure)

#### Phase 7: Schedule Grid Consolidation

**Goal**: Dashboard, schedule page, and portal use single unified ScheduleGrid component with all features preserved

**Depends on**: Phase 6

**Requirements**: GRID-01, GRID-02, GRID-03, GRID-04

**Success Criteria** (what must be TRUE):

1. Dashboard, schedule page, and portal use single ScheduleGrid component (no duplicates)
2. ScheduleGrid supports configurable view modes (day, unified) via props
3. All existing schedule features work (drag-drop, modals, filters, backlog, time slots)
4. Approximately 1,700 lines of duplicate code removed from codebase

**Plans**: Complete

#### Phase 8: Mobile Responsive Polish

**Goal**: Portal and trainee system render perfectly on mobile devices with touch-optimized interactions

**Depends on**: Phase 7

**Requirements**: MOBILE-01, MOBILE-02, MOBILE-03, MOBILE-04, MOBILE-05

**Success Criteria** (what must be TRUE):

1. Portal pages render correctly on mobile (375px) with no horizontal scroll
2. Dialogs become mobile drawers on small screens (smooth slide-up animation)
3. All interactive elements meet 44x44px minimum touch target size
4. Schedule grid collapses gracefully on mobile with single-column layout
5. Portal admin panel tables are horizontally scrollable on mobile

**Plans**: Complete

</details>

### 🚧 v1.2 Premium Animations (In Progress)

**Milestone Goal:** Add premium differentiator animations and complete final polish items

**Created:** 2026-03-04
**Depth:** Quick
**Requirements:** 8 total (ANIM-01 to 04, POLISH-01 to 04)

#### Phase 10: Differentiator Animations

**Goal**: Users experience premium, Apple-level animation polish throughout portal and trainee interfaces

**Depends on**: Phase 8 (v1.1 shipped)

**Requirements**: ANIM-01, ANIM-02, ANIM-03, ANIM-04

**Success Criteria** (what must be TRUE):

1. User sees task/phase/file list items appear sequentially with staggered timing (not all at once)
2. User sees roadmap phases reveal smoothly as they scroll into view (scroll-triggered animations)
3. User feels natural spring physics on buttons, cards, and interactive elements (elastic movement on press/release)
4. User can swipe to dismiss mobile drawers with gesture-based interaction (touch-friendly)
5. All animations respect prefers-reduced-motion and degrade gracefully

**Plans**: 3 plans

Plans:

- [x] 10-01-PLAN.md — Stagger animations on lists + scroll-triggered reveals on roadmap
- [x] 10-02-PLAN.md — Spring physics on buttons and cards
- [x] 10-03-PLAN.md — Gesture-based drawer interactions with Vaul

#### Phase 11: Additional Polish

**Goal**: Portal and trainee system have production-grade data handling, formatting consistency, and reduced code duplication

**Depends on**: None (independent from Phase 10)

**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04

**Success Criteria** (what must be TRUE):

1. User can load more activity feed items incrementally without full page reload (cursor-based pagination)
2. User sees consistent date formatting across all portal pages (standardized display)
3. User experiences instant form submission feedback via useServerAction hook (reduced boilerplate, better UX)
4. Codebase has consolidated schedule utilities with no duplicate logic (3 files reduced to 2)

**Plans**: TBD

Plans:

- [ ] 11-01: [TBD during planning]

## Progress

| Phase                         | Milestone | Plans Complete | Status      | Completed  |
| ----------------------------- | --------- | -------------- | ----------- | ---------- |
| 0. Database Foundation        | v1.0      | 1/1            | Complete    | 2026-03-01 |
| 1. Trainee Execution          | v1.0      | 2/2            | Complete    | 2026-03-01 |
| 2. Project Context            | v1.0      | 1/1            | Complete    | 2026-03-01 |
| 3. Client Portal              | v1.0      | 4/4            | Complete    | 2026-03-01 |
| 4. Loading & Empty States     | v1.1      | 3/3            | Complete    | 2026-03-04 |
| 5. Animation System           | v1.1      | 1/1            | Complete    | 2026-03-04 |
| 6. Micro-Interactions & Email | v1.1      | 2/2            | Complete    | 2026-03-04 |
| 7. Schedule Consolidation     | v1.1      | Complete       | Complete    | -          |
| 8. Mobile Responsive          | v1.1      | Complete       | Complete    | -          |
| 10. Differentiator Animations | v1.2      | 3/3            | Complete    | 2026-03-04 |
| 11. Additional Polish         | v1.2      | 0/TBD          | Not started | -          |

**v1.2 Progress:** 1/2 phases complete (50%)

---

_Last updated: 2026-03-04_
