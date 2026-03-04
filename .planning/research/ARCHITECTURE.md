# Architecture Research: Apple-Level Design Polish

**Domain:** Internal Project Management Platform (Client Portal + Trainee System)
**Researched:** 2026-03-04
**Confidence:** HIGH

## Executive Summary

Apple-level design polish integrates seamlessly with Next.js 16 App Router + shadcn/ui through three architectural patterns: **Client Component Wrappers** for Framer Motion animations, **Loading State Layering** with `loading.js` + Suspense boundaries, and **Component Consolidation** using CVA-powered configurable props. The existing system already has foundational design tokens (CSS variables, motion curves, elevation system), requiring enhancement rather than replacement.

The 3 duplicate schedule grids (~1,200 lines total) can be consolidated into a single `<ScheduleGrid />` component with configurable props for `viewMode` (day/unified), `userColumns` (Fawzi/Moayad/both), and `dataSource` (dashboard/schedule page/portal). This follows the **plugin-based architecture** pattern where core logic is extracted and variants are configured through props rather than duplicated code.

## Current Architecture (Qualia Internal Suite)

### Existing System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                     │
│                      (React 19)                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Server    │  │   Server    │  │   loading   │          │
│  │  Components │  │   Actions   │  │   /error    │          │
│  │  (pages)    │  │  (mutations)│  │    .tsx     │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
├─────────┴────────────────┴────────────────┴──────────────────┤
│                    Client Boundary                           │
│  'use client' → Framer Motion, SWR, Interactions             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐    │
│  │  shadcn/ui + CVA Variants + Design Tokens (CSS vars) │    │
│  └──────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │   SWR   │  │  Supabase│  │  Zod    │  │ Server  │         │
│  │  (45s)  │  │   (RLS)  │  │ Schemas │  │  Utils  │         │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Current Component Architecture

| Layer                    | Purpose                          | Examples                                            |
| ------------------------ | -------------------------------- | --------------------------------------------------- |
| **Server Components**    | Data fetching, initial rendering | `app/portal/[id]/page.tsx`, `app/schedule/page.tsx` |
| **Server Actions**       | Mutations, validation            | `app/actions.ts` (2,900 lines), `app/actions/*.ts`  |
| **Client Components**    | Interactivity, animations        | `components/*.tsx` with `'use client'`              |
| **SWR Hooks**            | Client-side data sync            | `lib/swr.ts` (45s auto-refresh when tab visible)    |
| **shadcn/ui Primitives** | Base components                  | `components/ui/button.tsx` (CVA variants)           |
| **Design Tokens**        | Theme consistency                | `globals.css` CSS variables + `tailwind.config.ts`  |

### Existing Design System Foundation

**Already in place:**

- **CSS Variables** for colors, spacing, elevation (`--ease-premium`, `--elevation-floating`)
- **CVA Variants** for component variations (see `button.tsx`)
- **Motion Curves** defined (`cubic-bezier(0.16,1,0.3,1)` as `--ease-premium`)
- **Elevation System** (5 tiers: resting → raised → floating → modal → max)
- **Z-index Scale** (dropdown: 40, modal: 50, toast: 70, command: 90)
- **Color Constants** in `lib/color-constants.ts` (696 lines of semantic colors)
- **Tailwind Animations** (fade-in, slide-up, modal-enter, stagger-in, etc.)

**What's missing:**

- Framer Motion integration (package installed but not systematically used)
- Loading skeletons for server component pages
- Stagger animations for list items
- Micro-interactions on hover/tap/focus
- Progressive enhancement patterns

## Recommended Architecture for Apple-Level Polish

### Pattern 1: Framer Motion Integration with Server Components

**What:** Wrap animated sections in Client Components while keeping Server Components intact.

**Implementation:**

```typescript
// ❌ WRONG: Can't use motion in Server Component
export default async function ProjectPage() {
  const data = await getProject();
  return <motion.div>{data.name}</motion.div>; // Error!
}

// ✅ CORRECT: Extract animation to Client Component
// app/projects/[id]/page.tsx (Server Component)
export default async function ProjectPage() {
  const data = await getProject();
  return <AnimatedProjectWrapper>{data.name}</AnimatedProjectWrapper>;
}

// components/animated-project-wrapper.tsx (Client Component)
'use client';
import { motion } from 'framer-motion';

export function AnimatedProjectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} // --ease-premium
    >
      {children}
    </motion.div>
  );
}
```

**Key Rules:**

1. Any file using `motion` components needs `'use client'`
2. Keep Server Components for data fetching, extract only animated sections
3. Use CSS variable easing curves: `ease: 'var(--ease-premium)'` doesn't work, use array format
4. Framer Motion 12.x is compatible with React 19 (verified in package.json)

### Pattern 2: Loading States with Suspense + Skeletons

**What:** Next.js `loading.js` convention + React Suspense for granular loading states.

**When to use each:**

| Pattern      | Use Case                   | Location                                           |
| ------------ | -------------------------- | -------------------------------------------------- |
| `loading.js` | Entire route loading       | `app/portal/[id]/loading.tsx`                      |
| `<Suspense>` | Specific component loading | Wrap slow async components                         |
| SWR fallback | Client-side data refresh   | Already implemented via `useMeetings(initialData)` |

**Implementation:**

```typescript
// app/portal/[id]/loading.tsx (automatic boundary)
export default function Loading() {
  return <PortalSkeleton />;
}

// app/portal/[id]/page.tsx (Server Component with granular Suspense)
import { Suspense } from 'react';

export default async function PortalPage({ params }: { params: { id: string } }) {
  // Fast data - render immediately
  const project = await getProject(params.id);

  return (
    <div>
      <PortalHeader project={project} />

      {/* Slow data - show skeleton while loading */}
      <Suspense fallback={<PhasesSkeleton />}>
        <ProjectPhases projectId={params.id} />
      </Suspense>

      <Suspense fallback={<FilesSkeleton />}>
        <ProjectFiles projectId={params.id} />
      </Suspense>
    </div>
  );
}

// components/portal-skeleton.tsx
export function PortalSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
```

**Skeleton Best Practices:**

1. Match real content layout exactly (prevent layout shift)
2. Use same border radius as final components (`--radius`)
3. Keep lightweight (instant render)
4. Use existing `animate-pulse` or custom `animate-shimmer` from `tailwind.config.ts`

### Pattern 3: Stagger Animations for List Items

**What:** Framer Motion's `staggerChildren` for sequential item animations.

**When:** Task lists, project cards, meeting items, phase items, file lists.

**Implementation:**

```typescript
'use client';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // 50ms delay between items (Apple-like timing)
      delayChildren: 0.1, // Start after 100ms
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1], // --ease-premium
    },
  },
};

export function AnimatedTaskList({ tasks }: { tasks: Task[] }) {
  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      {tasks.map((task) => (
        <motion.li key={task.id} variants={itemVariants}>
          <TaskCard task={task} />
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

**Optimal Timing:**

- `staggerChildren: 0.05-0.1s` feels natural (Apple uses 0.05s)
- `duration: 0.2-0.3s` for individual items
- Total animation under 1s for lists up to 10 items

### Pattern 4: Consolidating Duplicate Schedule Grids

**Current State:**

- `components/today-dashboard/daily-schedule-grid.tsx` (grid with day view)
- `components/schedule-block.tsx` (grid with unified/split toggle)
- `components/schedule-content.tsx` (wrapper for week/month/day views)
- Shared logic in `lib/schedule-utils.ts` and `lib/schedule-shared.ts`

**Problem:** ~1,200 lines of duplicate code across 3 files.

**Solution:** Single configurable `<ScheduleGrid />` component with variants.

**Architecture:**

```typescript
// components/schedule/schedule-grid.tsx (consolidated)
'use client';

type ViewMode = 'day' | 'unified';
type UserColumn = 'fawzi' | 'moayad' | 'both';
type DataSource = 'dashboard' | 'schedule' | 'portal';

interface ScheduleGridProps {
  // Data
  tasks: Task[];
  meetings: MeetingWithRelations[];
  backlogTasks?: Task[];
  profiles?: Profile[];

  // Configuration
  viewMode?: ViewMode; // 'day' (default) or 'unified'
  userColumns?: UserColumn; // 'both' (default), 'fawzi', 'moayad'
  dataSource?: DataSource; // 'dashboard' (default), 'schedule', 'portal'

  // Features
  showBacklog?: boolean; // Show backlog section (default: true)
  showToggle?: boolean; // Show view mode toggle (default: true)
  showNewButtons?: boolean; // Show "New Task"/"New Meeting" (default: true)

  // Display
  startHour?: number; // Default: 8
  endHour?: number; // Default: 18
  hourHeight?: number; // Default: 84px
}

export function ScheduleGrid({
  tasks,
  meetings,
  backlogTasks = [],
  profiles = [],
  viewMode = 'day',
  userColumns = 'both',
  dataSource = 'dashboard',
  showBacklog = true,
  showToggle = true,
  showNewButtons = true,
  startHour = 8,
  endHour = 18,
  hourHeight = 84,
}: ScheduleGridProps) {
  // Consolidated grid logic here
}

// Usage in different contexts:

// 1. Dashboard (today-page.tsx)
<ScheduleGrid
  tasks={tasks}
  meetings={meetings}
  backlogTasks={backlog}
  viewMode="day"
  userColumns="both"
  dataSource="dashboard"
/>

// 2. Schedule Page (app/schedule/page.tsx)
<ScheduleGrid
  tasks={tasks}
  meetings={meetings}
  viewMode="unified"
  userColumns="both"
  dataSource="schedule"
  showBacklog={false}
/>

// 3. Portal (app/portal/[id]/page.tsx)
<ScheduleGrid
  tasks={projectTasks}
  meetings={projectMeetings}
  viewMode="day"
  userColumns="fawzi" // Only show client-relevant user
  dataSource="portal"
  showNewButtons={false} // Clients can't create tasks
/>
```

**Consolidation Strategy:**

```
Phase 1: Extract shared logic
  ├── components/schedule/use-schedule-grid.ts (hook with core logic)
  ├── components/schedule/schedule-types.ts (shared types)
  ├── components/schedule/schedule-helpers.ts (topPx, heightPx, etc.)
  └── components/schedule/schedule-items.tsx (MeetingCard, TaskCard)

Phase 2: Build configurable component
  └── components/schedule/schedule-grid.tsx (uses extracted logic + CVA for variants)

Phase 3: Migrate consumers
  ├── components/today-dashboard/daily-schedule-grid.tsx → <ScheduleGrid dataSource="dashboard" />
  ├── components/schedule-block.tsx → <ScheduleGrid dataSource="schedule" />
  └── Portal pages → <ScheduleGrid dataSource="portal" userColumns="fawzi" />

Phase 4: Delete duplicate files
  └── Remove old implementations after migration complete
```

**CVA Variant Pattern for Styles:**

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const scheduleGridVariants = cva(
  'relative rounded-lg border', // base styles
  {
    variants: {
      dataSource: {
        dashboard: 'bg-card shadow-sm',
        schedule: 'bg-background',
        portal: 'bg-card/50',
      },
      density: {
        compact: 'space-y-1',
        comfortable: 'space-y-2',
        spacious: 'space-y-4',
      },
    },
    defaultVariants: {
      dataSource: 'dashboard',
      density: 'comfortable',
    },
  }
);
```

### Pattern 5: Micro-Interactions (Apple Design Language)

**Principles from Apple HIG:**

- Duration: 100-500ms for most interactions
- Easing: Spring physics or premium curves (avoid linear)
- Feedback: Immediate visual response to all interactions
- Subtlety: Animations guide quietly, don't demand attention

**Implementation Checklist:**

```typescript
// Button hover (already in button.tsx via transition-all)
<Button className="transition-all hover:scale-[1.02]" />

// Card hover
const cardVariants = cva('transition-all duration-200', {
  variants: {
    interactive: {
      true: 'hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer',
      false: '',
    },
  },
});

// Input focus
<Input className="transition-all focus:ring-4 focus:ring-ring/20" />

// Status badge pulse (for "new" or "updated" items)
<Badge className="animate-pulse-subtle" />

// Toast entrance (already defined in tailwind.config)
<Toast className="animate-slide-up" />

// Modal entrance (already defined in tailwind.config)
<Dialog>
  <DialogContent className="animate-modal-enter" />
</Dialog>

// Checkbox check animation
<Checkbox className="data-[state=checked]:animate-scale-in" />
```

**Where to apply:**

- Portal roadmap phase cards (hover lift)
- Task items in schedule grid (hover highlight)
- File upload dropzone (drag-over state)
- Meeting cards (hover shows actions)
- Phase review button (pulse when pending)
- Project cards (subtle float animation)

## Integration Points with Existing System

### New Components Needed

| Component               | Purpose                         | Location                       | Dependencies         |
| ----------------------- | ------------------------------- | ------------------------------ | -------------------- |
| `AnimatedPortalWrapper` | Wraps portal pages with fade-in | `components/portal/`           | Framer Motion        |
| `PortalSkeleton`        | Loading state for portal pages  | `components/portal/`           | shadcn Skeleton      |
| `PhasesSkeleton`        | Loading state for roadmap       | `components/portal/`           | shadcn Skeleton      |
| `AnimatedTaskList`      | Stagger animation for tasks     | `components/`                  | Framer Motion        |
| `AnimatedPhaseCards`    | Stagger animation for phases    | `components/project-pipeline/` | Framer Motion        |
| `ScheduleGrid`          | Consolidated schedule component | `components/schedule/`         | Extract from 3 files |
| `use-schedule-grid`     | Shared schedule logic hook      | `components/schedule/`         | Extract from 3 files |

### Modified Components

| Component                                            | Modifications                        | Why                     |
| ---------------------------------------------------- | ------------------------------------ | ----------------------- |
| `components/portal/portal-roadmap.tsx`               | Add stagger animation to phase cards | Apple-level polish      |
| `components/project-pipeline/phase-card.tsx`         | Add hover lift micro-interaction     | Feedback on interaction |
| `app/portal/[id]/page.tsx`                           | Wrap in `<Suspense>` boundaries      | Granular loading states |
| `app/schedule/page.tsx`                              | Use new `<ScheduleGrid>`             | Consolidate duplicates  |
| `components/today-dashboard/daily-schedule-grid.tsx` | Replace with `<ScheduleGrid>`        | Consolidate duplicates  |
| `components/schedule-block.tsx`                      | Replace with `<ScheduleGrid>`        | Consolidate duplicates  |

### Data Flow Changes

**No major data flow changes required.** Enhancements work with existing architecture:

```
Server Components (data fetching)
    ↓
AnimatedWrapper (client boundary)
    ↓
Existing Component Logic
    ↓
Framer Motion animations (visual enhancement only)
```

SWR hooks remain unchanged. Server Actions remain unchanged. Only presentation layer gets polish.

## Build Order (Dependency Aware)

### Phase 1: Foundation (No Dependencies)

**Duration:** 1 day

1. Add `loading.tsx` files to portal routes
   - `app/portal/loading.tsx`
   - `app/portal/[id]/loading.tsx`
   - `app/portal/[id]/files/loading.tsx`

2. Create skeleton components
   - `components/portal/portal-skeleton.tsx`
   - `components/portal/phases-skeleton.tsx`
   - `components/portal/files-skeleton.tsx`

3. Test Suspense boundaries (wrap one slow component)

### Phase 2: Animation System (Depends on Phase 1)

**Duration:** 2 days

1. Create animation wrapper components
   - `components/animated/animated-wrapper.tsx` (generic fade-in)
   - `components/animated/animated-list.tsx` (stagger for lists)
   - `components/animated/animated-card.tsx` (hover lift)

2. Create reusable motion variants file
   - `lib/motion-variants.ts` (fadeIn, slideUp, stagger, lift)

3. Integrate into portal
   - Wrap portal pages in `<AnimatedWrapper>`
   - Add stagger to roadmap phase cards
   - Add hover lift to phase cards

### Phase 3: Schedule Consolidation (Depends on Phase 2)

**Duration:** 3 days

1. Extract shared logic
   - `components/schedule/use-schedule-grid.ts`
   - `components/schedule/schedule-types.ts`
   - `components/schedule/schedule-helpers.ts`

2. Build `<ScheduleGrid>` component
   - Configurable props (viewMode, userColumns, dataSource)
   - CVA variants for styling
   - Test in isolation

3. Migrate consumers one by one
   - Dashboard → `<ScheduleGrid dataSource="dashboard" />`
   - Schedule page → `<ScheduleGrid dataSource="schedule" />`
   - Portal (if used) → `<ScheduleGrid dataSource="portal" />`

4. Delete old implementations
   - `components/today-dashboard/daily-schedule-grid.tsx`
   - `components/schedule-block.tsx`
   - Parts of `components/schedule-content.tsx`

### Phase 4: Micro-Interactions (Depends on Phase 2)

**Duration:** 2 days

1. Add hover states to cards
   - Portal project cards
   - Phase cards
   - Task cards
   - Meeting cards

2. Add focus states to inputs
   - Form fields in portal
   - Search inputs

3. Add button animations
   - Phase review button pulse
   - New task/meeting buttons

4. Add transitions to modals/dialogs
   - Already defined in `tailwind.config.ts`, just apply classes

### Phase 5: Polish & Optimization (Depends on All)

**Duration:** 1 day

1. Performance check
   - Ensure animations don't block main thread
   - Check Lighthouse scores
   - Profile Framer Motion render cost

2. Accessibility audit
   - `prefers-reduced-motion` support
   - Keyboard navigation with animations
   - Screen reader announcements

3. Cross-browser testing
   - Safari (Apple target)
   - Chrome
   - Firefox

**Total Duration:** 9 days

## Scaling Considerations

| Scale                   | Approach                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------ |
| **Current (2-5 users)** | Existing architecture is perfect. Framer Motion overhead negligible.                 |
| **10-50 users**         | Consider lazy-loading Framer Motion (`React.lazy()` for animated components).        |
| **50+ users**           | Replace Framer Motion with CSS-only animations for lists, keep for page transitions. |

**Animation Performance Tips:**

- Use `transform` and `opacity` (GPU-accelerated)
- Avoid animating `width`, `height`, `top`, `left` (triggers layout)
- Use `will-change` sparingly (only on active animations)
- `layoutId` in Framer Motion is expensive (avoid for large lists)

## Anti-Patterns to Avoid

### Anti-Pattern 1: Animation Overload

**What people do:** Add motion to every element because "Apple uses animations."

**Why it's wrong:** Creates visual noise. Apple animations are purposeful and subtle.

**Do this instead:**

- Animate page transitions (fade-in on mount)
- Animate list items (stagger on initial render)
- Animate interactions (hover, focus, tap)
- **Don't animate:** Static text, images, logos, navigation (unless transitioning)

### Anti-Pattern 2: Blocking Server Components

**What people do:** Try to add `motion.div` directly in Server Components.

**Why it's wrong:** Framer Motion requires client-side JavaScript. Server Components can't use it.

**Do this instead:**

- Keep Server Components for data fetching
- Create thin Client Component wrappers for animation
- Pass data down as props

### Anti-Pattern 3: Premature Consolidation

**What people do:** Try to consolidate 3 schedule grids into 1 with 50+ props.

**Why it's wrong:** Over-engineering. 50 optional props = unmaintainable.

**Do this instead:**

- Extract shared logic first (hooks, helpers)
- Build component with 8-10 key props
- Accept some duplication in edge cases (portal may need custom component)

### Anti-Pattern 4: Ignoring Reduced Motion

**What people do:** Force animations on all users.

**Why it's wrong:** Accessibility issue. Some users get motion sickness.

**Do this instead:**

```typescript
// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const variants = {
  hidden: { opacity: prefersReducedMotion ? 1 : 0 },
  visible: { opacity: 1 },
};

// Or use Framer Motion's built-in support
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
/>
```

### Anti-Pattern 5: Skeleton Mismatch

**What people do:** Generic skeleton that doesn't match real content.

**Why it's wrong:** Layout shift when real content loads. Jarring UX.

**Do this instead:**

- Match skeleton dimensions exactly to real content
- Use same spacing, same border radius
- Preview real content → measure dimensions → build skeleton to match

## Sources

**Next.js + Framer Motion Integration:**

- [How to Use Framer Motion with Next.js Server Components](https://www.hemantasundaray.com/blog/use-framer-motion-with-nextjs-server-components) (MEDIUM confidence - verified with official Next.js 16 compatibility)
- [Solving Framer Motion Page Transitions in Next.js App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router)
- [framer-motion for Next.js 15.0.2 Discussion](https://github.com/vercel/next.js/discussions/72228) (HIGH confidence - official Next.js repo)

**Apple Design Principles:**

- [Motion | Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/motion) (HIGH confidence - official Apple HIG)
- [iOS 26 Motion Design Guide](https://medium.com/@foks.wang/ios-26-motion-design-guide-key-principles-and-practical-tips-for-transition-animations-74def2edbf7c) (MEDIUM confidence)
- [Hot iOS 2025 UX Trends](https://medium.com/@bhumibhuva18/hot-ios-2025-ux-trends-micro-interactions-fluid-animations-and-design-principles-developers-b52673769cd6)
- [Designing Fluid Interfaces - WWDC18](https://developer.apple.com/videos/play/wwdc2018/803/) (HIGH confidence - official Apple)

**Loading States & Skeletons:**

- [File-system conventions: loading.js | Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/loading) (HIGH confidence - official Next.js docs, updated Feb 27, 2026)
- [The Next.js 15 Streaming Handbook](https://www.freecodecamp.org/news/the-nextjs-15-streaming-handbook/) (MEDIUM confidence)
- [Skeleton - shadcn/ui](https://ui.shadcn.com/docs/components/radix/skeleton) (HIGH confidence - official shadcn docs)
- [Shadcn/ui React Series: Skeleton](https://blog.stackademic.com/shadcn-ui-react-series-part-14-skeleton-enhancing-ux-with-elegant-skeleton-loaders-8ff3b8496709)

**Component Consolidation Patterns:**

- [Building Scalable Plugin-Based React Components](https://medium.com/@mansibegerhotta/building-scalable-plugin-based-react-components-a-deep-dive-into-configurable-architecture-cf404861a818) (MEDIUM confidence)
- [Balancing Reuse and Duplication with React](https://www.jnielson.com/balancing-reuse-and-duplication-with-react) (MEDIUM confidence)
- [React Design Patterns for 2026 Projects](https://www.sayonetech.com/blog/react-design-patterns/) (MEDIUM confidence)
- [33 React JS Best Practices For 2026](https://technostacks.com/blog/react-best-practices/)

**Design Tokens & CVA:**

- [Class Variance Authority](https://cva.style/docs) (HIGH confidence - official CVA docs)
- [Enterprise Component Architecture with CVA](https://www.thedanielmark.com/blog/enterprise-component-architecture-type-safe-design-systems-with-class-variance-authority) (MEDIUM confidence)
- [CSS Variables Guide: Design Tokens & Theming](https://www.frontendtools.tech/blog/css-variables-guide-design-tokens-theming-2025) (MEDIUM confidence)

**Stagger Animations:**

- [Creating Staggered Animations with Framer Motion](https://medium.com/@onifkay/creating-staggered-animations-with-framer-motion-0e7dc90eae33) (MEDIUM confidence)
- [stagger — Stagger the delay of multiple animations | Motion](https://motion.dev/docs/stagger) (HIGH confidence - official Motion docs)

---

_Architecture research for: Qualia Internal Suite - Apple-level design polish_
_Researched: 2026-03-04_
_Confidence: HIGH (verified with official docs for Next.js, Apple HIG, Framer Motion, shadcn/ui)_
