# Domain Pitfalls: Adding Apple-Level Design Polish to Existing Next.js App

**Domain:** Design overhaul of working Next.js 16 + shadcn/ui application (client portal + trainee system)
**Researched:** 2026-03-04
**Overall Confidence:** HIGH (verified with official sources, 2026 documentation, and codebase analysis)

## Executive Summary

Adding Apple-level design polish to an existing Next.js app introduces **different failure modes than greenfield development**. The three most dangerous pitfalls are: (1) Framer Motion incompatibility with Server Components causing runtime crashes, (2) animation performance degradation from stacking micro-interactions on existing SWR auto-refresh logic, and (3) component consolidation breaking existing behavior due to incomplete state migration. Unlike building fresh, retrofitting polish means navigating **the interaction between new animation libraries and existing patterns** (SWR, dark mode, CSS transitions, server components).

The schedule grid consolidation (952 + 792 = 1,744 lines → 1 component) is a **critical regression risk zone**. You have two different timing systems (time slots vs. hour-based positioning), different interaction patterns (modal vs. inline editing), and different data refresh triggers. Merge conflicts here will manifest as **subtle timing bugs and missing features** rather than obvious crashes.

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Framer Motion + Server Components Runtime Crash

**What goes wrong:** Importing Framer Motion's `motion` component directly in Server Components causes runtime errors because motion components need DOM access. Next.js 16 App Router server components render on the server without DOM, causing "cannot read properties of undefined" or hydration mismatches.

**Why it happens:**

- Developers add `<motion.div>` to existing server components without adding `'use client'` directive
- Shared components used in both server and client contexts get motion wrappers
- Page transitions using AnimatePresence fail because Next.js App Router updates context frequently during navigation, causing components to unmount/remount abruptly and disrupting animation flow

**Consequences:**

- Build passes but production crashes at runtime
- Hydration errors flood console, hard to debug which component caused it
- AnimatePresence exit animations never fire due to premature unmounting
- Shared layout animations (Framer's layoutId feature) don't work at all in App Router per [GitHub Issue #1850](https://github.com/framer/motion/issues/1850)

**Prevention:**

1. **Create client-only motion wrappers** (MotionDiv, MotionH1, etc.) with `'use client'` directive
2. **Use FrozenRouter pattern** for page transitions to prevent context updates during animations
3. **Audit all motion usage** before deploying - grep for `motion\.` and verify `'use client'` appears above imports
4. **Test SSR specifically** - disable JavaScript in dev tools and reload to catch server/client mismatches

**Detection:**

- Warning sign: "Cannot read properties of undefined (reading 'style')" in production logs
- Warning sign: Exit animations work in dev but not production
- Tool: Run `npm run build && npm start` locally to catch SSR issues before deploy

**Sources:**

- [GitHub Issue #49279 - App router issue with Framer Motion shared layout animations](https://github.com/vercel/next.js/issues/49279)
- [How to use Framer Motion with Next.js Server Components](https://www.hemantasundaray.com/blog/use-framer-motion-with-nextjs-server-components)
- [App Router pitfalls: common Next.js mistakes and practical ways to avoid them](https://imidef.com/en/2026-02-11-app-router-pitfalls)

---

### Pitfall 2: Animation Performance Degradation from Too Many Micro-Interactions

**What goes wrong:** Stacking Framer Motion animations on components that already re-render frequently (SWR 45s auto-refresh, dashboard live updates) causes frame drops, scroll stutter, and UI freezes. Each micro-interaction adds CPU cost, and when combined with existing state updates, the main thread becomes blocked.

**Why it happens:**

- Animating components during high-frequency state changes (SWR revalidation, live data updates, dashboard filters)
- Using layout animations (automatic, convenient) instead of transform animations (GPU-accelerated)
- Not memoizing animated components with React.memo, causing re-renders to cascade through animation tree
- Animating CSS variables which always trigger paint, not just composite

**Consequences:**

- Dashboard feels sluggish, especially on older devices
- Scroll performance degrades (target 60fps → actual 30fps or worse)
- Task list animations stutter when SWR refreshes data
- High CPU usage causes battery drain on mobile

**Prevention:**

1. **Performance budget:** Limit to 3-5 animated elements per view, test on low-end device
2. **Use transform/opacity only** for animations (GPU-accelerated), avoid animating width/height/colors
3. **Wrap animated list items in React.memo** to prevent cascade re-renders
4. **Disable animations during data refresh** - pause Framer Motion animations when `isValidating` is true
5. **Use MotionValues instead of state** for frame-by-frame animations to avoid React reconciliation
6. **Schedule animations in requestAnimationFrame**, cancel with cancelAnimationFrame on unmount

**Detection:**

- Warning sign: Chrome DevTools Performance tab shows "Long Task" warnings (>50ms) during animations
- Warning sign: FPS counter (Chrome DevTools → Rendering → Frame Rendering Stats) shows <60fps
- Tool: React DevTools Profiler - look for components re-rendering >10 times per second
- Tool: Lighthouse performance audit - watch for "Avoid large layout shifts" warnings

**Sources:**

- [Complex animations can greatly enhance user engagement in React applications...](https://www.zigpoll.com/content/can-you-explain-the-best-practices-for-optimizing-web-performance-when-implementing-complex-animations-in-react)
- [React App Performance Optimization Guide: 2026 Expert Tips](https://www.zignuts.com/blog/react-app-performance-optimization-guide)
- [Vercel Releases React Best Practices Skill with 40+ Performance Rules for AI Agents](https://www.infoq.com/news/2026/02/vercel-react-best-practices/)

---

### Pitfall 3: Schedule Grid Consolidation State Loss

**What goes wrong:** Merging `schedule-block.tsx` (952 lines) and `daily-schedule-grid.tsx` (792 lines) into one component causes subtle state bugs - tasks don't toggle status, meetings don't update, modals don't close, drag-and-drop positioning calculates wrong times.

**Why it happens:**

- **Different timing systems:** schedule-block uses discrete TIME_SLOTS array (`['8 AM', '9 AM', ...]`), daily-schedule-grid uses continuous hour positioning (`START_HOUR = 8, HOUR_HEIGHT = 84`)
- **Different interaction patterns:** schedule-block opens EditTaskModal, daily-schedule-grid uses inline NewTaskModalControlled
- **Different invalidation triggers:** schedule-block calls `invalidateScheduledTasks()`, daily-schedule-grid calls `invalidateTodaysSchedule()`
- **Incomplete state migration:** One component tracks `selectedMember` filter, other doesn't - merged version loses filter capability
- **Conflicting useTransition hooks:** Both components use `useTransition` for optimistic updates but with different pending states

**Consequences:**

- Tasks created in unified grid don't appear immediately (SWR cache not invalidated)
- Time slot calculations break - meetings render at wrong vertical position
- Drag-drop feature works in one view mode but not others
- Modal state leaks between day/week/month views
- Filter by team member stops working

**Prevention:**

1. **Feature parity audit BEFORE refactoring:** Create spreadsheet listing every feature in both components, ensure merged version has all
2. **Extract shared logic into hooks first:** Create `useScheduleGrid`, `useTaskToggle`, `useScheduleInvalidation` hooks, test in isolation
3. **Keep both components during migration:** Mark old ones deprecated, run parallel for 1 week, compare behavior
4. **Write integration tests:** Test task creation → SWR refresh → modal close flow end-to-end
5. **Preserve all invalidation calls:** Unified component must call ALL cache invalidation functions (scheduled, inbox, daily flow, meetings, today's schedule)

**Detection:**

- Warning sign: "Task created successfully" toast shows but task not visible until manual refresh
- Warning sign: Different behavior between day/week views of same data
- Tool: React DevTools Components tab - inspect SWR cache to verify invalidation happens
- Test: Create task → wait 2 seconds → verify appears without page refresh

**Sources:**

- [Common Sense Refactoring of a Messy React Component](https://alexkondov.com/refactoring-a-messy-react-component/)
- [Balancing Reuse and Duplication with React](https://www.jnielson.com/balancing-reuse-and-duplication-with-react)
- Codebase analysis: `/home/qualia/Projects/live/qualia/components/schedule-block.tsx` (952 lines), `/home/qualia/Projects/live/qualia/components/today-dashboard/daily-schedule-grid.tsx` (792 lines)

---

## Moderate Pitfalls

### Pitfall 4: Loading Skeleton Flash of Content (FOUC)

**What goes wrong:** Beautiful loading skeletons flash briefly then show unstyled content before styles apply, creating jarring visual experience. Happens when CSS loads after HTML renders or when Framer Motion animations trigger before styles are ready.

**Why it happens:**

- Dynamic imports with CSS Modules in Next.js App Router load CSS too late
- Third-party UI library styles (shadcn/ui) imported in components instead of root layout
- Dark mode SSR mismatch - server doesn't know user's preferred color scheme, renders default theme, then hydration applies dark mode

**Prevention:**

1. **Import all stylesheets in `app/layout.tsx`** before components render
2. **Preload critical CSS** for above-the-fold components
3. **Match skeleton to final content shape** - same border-radius, same spacing, same z-index
4. **Use hydration wrapper** for client-side-only features to prevent SSR/client mismatch
5. **Add `data-theme` attribute to `<html>` tag** via script in head to prevent dark mode flash

**Detection:**

- Warning sign: White flash before dark mode applies on page load
- Warning sign: Skeleton animates correctly but final content has different layout
- Tool: Network throttling in DevTools (Slow 3G) makes FOUC more visible

**Sources:**

- [Understanding & Fixing FOUC in Next.js App Router (2025 Guide)](https://dev.to/amritapadhy/understanding-fixing-fouc-in-nextjs-app-router-2025-guide-ojk)
- [Fixing Dark Mode Flickering (FOUC) in React and Next.js](https://notanumber.in/blog/fixing-react-dark-mode-flickering)
- [How to Prevent Flash of Unstyled Content (FOUC) in Next.js](https://medium.com/@mohantaankit2002/how-to-prevent-flash-of-unstyled-content-fouc-in-next-js-78fb7c1b0b74)

---

### Pitfall 5: CSS Transitions Conflicting with Framer Motion

**What goes wrong:** Existing CSS transitions (hover effects, fade-ins) fight with new Framer Motion animations, causing stuttering, double animations, or animations that don't complete. Element animates via CSS, Framer tries to animate same property, values conflict.

**Why it happens:**

- Component has `transition: all 0.3s ease` in CSS, then Framer adds `animate={{ opacity: 1 }}` on same element
- Tailwind utility classes include transitions (`transition-colors`, `hover:scale-105`) that override Framer's spring animations
- AnimatePresence combined with CSS Modules causes issues in production builds

**Prevention:**

1. **Remove CSS transitions from elements using Framer Motion** - use Framer's transition prop instead
2. **Audit Tailwind classes** - search codebase for `transition-`, `duration-`, `ease-` and remove from Framer-animated elements
3. **Use Framer for complex animations, CSS for simple state changes** (hover, focus)
4. **Avoid animating CSS variables with Framer** - they always trigger paint, use MotionValues instead
5. **Test with Tailwind + Framer together** - AnimatePresence works better with Tailwind than CSS Modules

**Detection:**

- Warning sign: Animation plays twice (CSS then Framer) or gets "sticky" at intermediate state
- Warning sign: Spring animation feels linear instead of bouncy
- Tool: Chrome DevTools → Elements → Computed styles - look for multiple transition properties

**Sources:**

- [Do you still need Framer Motion?](https://motion.dev/blog/do-you-still-need-framer-motion)
- [CSS / JS Animation Trends 2026: Motion & Micro-Interactions](https://webpeak.org/blog/css-js-animation-trends/)
- [Fuck Framer Motion, I'm going to CSS instead](https://blog.ryanaque.com/fuck-framer-motion-im-going-to-css-instead/)

---

### Pitfall 6: Design Token Migration Breaking Existing Dark Mode

**What goes wrong:** Introducing new design tokens (CSS variables for colors, spacing) conflicts with existing portal dark mode implementation. Hard-coded color values don't switch with theme, causing light text on light background or other contrast violations.

**Why it happens:**

- Portal has `data-color-mode` attribute for dark mode, new design tokens use different `data-theme` attribute
- Existing components use hard-coded Tailwind colors (`bg-violet-500`), new tokens use semantic names (`bg-primary`)
- Migration happens incrementally - some components use tokens, others don't, creating inconsistent theming
- Design tokens not 1:1 match with old color system, requires manual reconciliation

**Consequences:**

- Mixed theming - some buttons use new system, others use old
- Contrast violations - text becomes unreadable in dark mode
- Components flash between old and new theme during page transitions
- Increased bundle size from shipping both old and new color systems

**Prevention:**

1. **Centralize all colors in one place first** (`lib/color-constants.ts` already exists) - audit usage before adding tokens
2. **Use semantic token names** from the start (`primary`, `surface`, `border`) not specific (`violet-500`)
3. **Run automated migration** with linters/codemods if available (e.g., @atlaskit/eslint-plugin-design-system)
4. **Never commit partial migration** - entire component must use new system or old, not mixed
5. **Test both themes** after every component migration - automated screenshot tests help

**Detection:**

- Warning sign: `data-color-mode` and `data-theme` attributes both present on `<html>` tag
- Warning sign: CSS variables undefined in dark mode (check DevTools → Computed)
- Tool: Accessibility checker - look for contrast ratio failures in dark mode

**Sources:**

- [Dark mode with design tokens](https://uxdesign.cc/dark-mode-with-design-tokens-8d7b9d9753a)
- [How to Manage Breaking Changes in Design Tokens](https://designtokens.substack.com/p/how-to-manage-breaking-changes-in)
- [Why Dark Mode is Mandatory in 2026 The Ultimate Design Guide](https://www.sivadesigner.in/blog/dark-mode-evolution-modern-web-design/)

---

### Pitfall 7: shadcn/ui Base UI Migration Breaking Components

**What goes wrong:** shadcn/ui recently migrated from Radix UI primitives to Base UI (January-February 2026). Adding new components after migration can pull in old dependencies, or existing components break when upgraded to new Base UI API.

**Why it happens:**

- CLI still uses old import pattern even after migration command runs
- Base UI has different API - `asChild` keyword removed, `checked` requires boolean, `value` requires array
- Select component completely different between Radix and Base UI (doesn't map 1:1)
- Base UI Select needs `items` prop instead of deriving from children (SSR + performance improvement but breaking change)

**Consequences:**

- New components fail to render with cryptic errors about missing props
- Existing dropdowns/selects break after upgrade
- Build passes but runtime errors in production
- Need to re-run migration command repeatedly to fix auto-generated components

**Prevention:**

1. **Check shadcn/ui changelog before adding components** - verify if Base UI migration is complete
2. **Run migration in isolated branch** - test thoroughly before merging to main
3. **Avoid "big bang" migration** - replace components incrementally, one at a time
4. **Read Base UI migration guide** - API differences documented in official docs
5. **Pin shadcn/ui version** during active migration period to prevent CLI drift

**Detection:**

- Warning sign: `npm install` adds both `@radix-ui/*` and `@base-ui/*` packages
- Warning sign: Console errors about `asChild` prop not recognized
- Tool: Check `package.json` dependencies - should be either Radix OR Base UI, not both

**Sources:**

- [February 2026 - Unified Radix UI Package - shadcn/ui](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui)
- [January 2026 - Base UI Documentation - shadcn/ui](https://ui.shadcn.com/docs/changelog/2026-01-base-ui)
- [Shadcn UI Migration Guide: Transitioning from Radix UI to Base UI](https://github.com/shadcn-ui/ui/discussions/9562)
- [[bug]: After migration to new radix style, components are still added as old](https://github.com/shadcn-ui/ui/issues/9547)

---

## Minor Pitfalls

### Pitfall 8: Mobile Responsive Regressions During Redesign

**What goes wrong:** Desktop design looks polished but mobile breaks - overlapping elements, truncated text, unclickable buttons, horizontal scroll on narrow screens.

**Why it happens:**

- Designers work in Figma desktop view, don't provide mobile specs
- Framer Motion animations use fixed pixel values instead of responsive units
- Complex grid layouts (schedule grid) don't collapse gracefully on mobile
- Touch targets too small (<44px) for mobile, work fine with mouse

**Prevention:**

1. **Mobile-first CSS** - write base styles for mobile, use `@media (min-width:)` for desktop
2. **Visual regression testing** across device sizes (use tools like Percy, Chromatic)
3. **Test on real devices** - simulator doesn't catch all touch interaction issues
4. **Use Tailwind responsive prefixes** consistently (`sm:`, `md:`, `lg:`)
5. **Check touch target sizes** - minimum 44x44px per WCAG guidelines

**Sources:**

- [Visual Regression Testing in Mobile QA: The 2026 Guide](https://www.getpanto.ai/blog/visual-regression-testing-in-mobile-qa)
- [Mastering Responsive Design in 2026](https://mobiview.github.io/mastering-responsive-design)

---

### Pitfall 9: SWR Auto-Refresh Interrupting Animation States

**What goes wrong:** User clicks task to expand details, animation starts, SWR revalidates (45s interval), task re-renders mid-animation, animation resets or element disappears.

**Why it happens:**

- SWR revalidates data while user actively interacting with UI
- Framer Motion animation state stored in component, SWR refresh causes remount
- Optimistic updates + SWR revalidation race condition

**Prevention:**

1. **Use layoutId for persistent animations** across re-renders
2. **Pause SWR revalidation during active animations** - set `revalidateOnFocus: false` temporarily
3. **Store animation state in URL params or ref** not component state
4. **Use SWR's `mutate` for optimistic updates** to prevent race conditions

**Sources:**

- [SWR Documentation](https://swr.vercel.app/)

---

### Pitfall 10: Z-Index Conflicts Between Modals and Animations

**What goes wrong:** Animated elements appear above modals/popovers, or modals get stuck behind other elements. New animations introduce new stacking contexts that break existing z-index hierarchy.

**Why it happens:**

- Framer Motion creates new stacking context with transforms
- Existing z-index scale not documented (project uses z-dropdown: 40, z-modal: 50, z-popover: 55, z-toast: 70, z-command: 90)
- Developers pick arbitrary z-index values (999, 9999) instead of using scale

**Prevention:**

1. **Use centralized z-index scale** from `tailwind.config.ts` - never use arbitrary values
2. **Audit z-index usage** before adding animations - search codebase for `z-[`, `z-999`
3. **Portals for modals** - render modals at document root to escape stacking context issues
4. **Document z-index scale** in design system - make it easy to find correct value

**Sources:**

- Codebase: `tailwind.config.ts` defines z-index scale (z-dropdown: 40, z-modal: 50, etc.)

---

## Phase-Specific Warnings

| Phase Topic                              | Likely Pitfall                       | Mitigation                                                                           |
| ---------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| **Phase 1: Framer Motion Setup**         | Server component crashes             | Create motion wrappers with 'use client', test SSR build locally before deploy       |
| **Phase 2: Loading Skeletons**           | FOUC on dark mode toggle             | Import styles in root layout, add data-theme script to HTML head                     |
| **Phase 3: Micro-Interactions**          | Performance degradation on dashboard | Performance budget (max 5 animated elements), test on low-end device, use React.memo |
| **Phase 4: Schedule Grid Consolidation** | State loss during merge              | Feature parity audit, extract hooks first, keep both components parallel for 1 week  |
| **Phase 5: Design Token Migration**      | Dark mode contrast violations        | Migrate entire component at once (not partial), test both themes, use semantic names |
| **Phase 6: Mobile Polish**               | Responsive regressions               | Mobile-first CSS, visual regression tests, real device testing                       |

---

## Testing Checklist After Design Changes

### Functionality Tests

- [ ] Create task → verify appears without page refresh (SWR cache invalidated)
- [ ] Toggle task status → verify optimistic update works
- [ ] Create meeting → verify appears in schedule grid
- [ ] Filter by team member → verify tasks/meetings filtered correctly
- [ ] Switch day/week/month view → verify all data loads

### Performance Tests

- [ ] Chrome DevTools Performance tab → no Long Tasks >50ms during animations
- [ ] FPS counter → maintains 60fps during scroll and interactions
- [ ] React DevTools Profiler → no components re-rendering >10 times/second
- [ ] Lighthouse audit → Performance score >90

### Visual Tests

- [ ] Dark mode toggle → no FOUC, all colors switch correctly
- [ ] Loading skeletons → match final content shape and position
- [ ] Animations → no double-animation or stuttering
- [ ] Mobile (375px width) → no horizontal scroll, touch targets >44px
- [ ] Tablet (768px width) → layout collapses gracefully

### SSR/Hydration Tests

- [ ] `npm run build && npm start` → no hydration errors in console
- [ ] Disable JavaScript in DevTools → page structure still makes sense
- [ ] Slow 3G throttling → skeletons appear, no blank screen

### Integration Tests

- [ ] Create task while SWR revalidating → no race condition
- [ ] Animate element then trigger SWR refresh → animation doesn't reset
- [ ] Open modal then navigate → modal closes, no portal leak
- [ ] Drag task to new time slot → position calculates correctly

---

## Confidence Assessment

| Area                              | Confidence | Notes                                                                         |
| --------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| Framer Motion + Server Components | HIGH       | Official docs, GitHub issues, recent 2026 articles confirm pitfalls           |
| Animation Performance             | HIGH       | Multiple verified sources, Vercel official best practices                     |
| Component Consolidation           | HIGH       | Codebase analysis shows exact line counts and different patterns              |
| FOUC/Loading Skeletons            | HIGH       | Next.js 16 specific documentation and 2025-2026 guides                        |
| CSS Transitions Conflicts         | MEDIUM     | Community articles, not official Framer docs                                  |
| Design Token Migration            | MEDIUM     | shadcn/ui migration ongoing, documentation evolving                           |
| shadcn Base UI                    | HIGH       | Official changelog confirms breaking changes                                  |
| Mobile Responsive                 | MEDIUM     | General best practices, not Next.js specific                                  |
| SWR Conflicts                     | LOW        | No specific documentation found, based on general state management principles |
| Z-Index Conflicts                 | HIGH       | Codebase analysis of existing z-index scale                                   |

---

## Gaps to Address

### Topics Needing Deeper Research Later

1. **SWR + Animation State Conflicts** - No official documentation found about SWR revalidation interrupting Framer Motion animations. May need empirical testing during implementation to document specific patterns.

2. **shadcn/ui Base UI Migration Timeline** - Migration announced January 2026, still ongoing as of March 2026. Final API may change. Re-check official docs before Phase 5.

3. **Mobile Device Testing Matrix** - Need to define specific devices for testing (iOS Safari, Android Chrome versions). Visual regression testing tools need evaluation (Percy vs. Chromatic vs. self-hosted).

4. **Performance Budget Numbers** - "Max 5 animated elements" is guideline, not tested. Need to establish actual FPS benchmarks on target low-end device during Phase 3.

5. **Lighthouse Performance Score Baseline** - Current score unknown. Need baseline before adding animations to measure regression.

### Areas Where Research Was Inconclusive

- **Exact SWR configuration to pause revalidation during animations** - SWR docs don't cover this use case explicitly
- **Best visual regression testing tool for Next.js 16** - multiple options, no clear 2026 winner
- **Dark mode flash prevention with App Router** - multiple solutions suggested, unclear which is most reliable

---

## Key Takeaways for Roadmap Planning

1. **Phase 1 must include motion wrapper creation** - Don't start adding animations before this infrastructure exists, or you'll have to refactor everything when Server Component crashes happen.

2. **Schedule grid consolidation (Phase 4) is highest risk** - 1,744 lines of critical functionality. Needs 2-3x time estimate of greenfield build. Consider keeping both components longer than planned.

3. **Performance testing must happen in Phase 3** - Don't wait until all animations added. Test incrementally, establish budget early.

4. **shadcn/ui Base UI migration is moving target** - Lock version, check changelog weekly, defer component additions until migration stabilizes.

5. **Mobile testing can't be last phase** - Responsive issues compound. Test mobile after each major addition (skeletons, animations, grid).

6. **Design tokens must be all-or-nothing per component** - Never commit partial migration. Creates unfixable theming inconsistencies.
