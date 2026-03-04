# Technology Stack — Apple-Level Design Polish

**Project:** Qualia Internal Suite (Client Portal + Trainee System)
**Researched:** 2026-03-04
**Focus:** Design polish additions for existing Next.js 16 + Tailwind + shadcn app

## Executive Summary

This milestone adds Apple-level design polish to an already functional app. The stack additions focus on **micro-interactions, smooth animations, premium loading states, and mobile responsiveness** without bloating the bundle or compromising performance.

**Key finding:** Most polish can be achieved with **minimal new dependencies** by leveraging existing infrastructure (Tailwind, shadcn/ui, CSS) and adding only 3 strategic libraries: Framer Motion for complex animations, Vaul for mobile drawers, and react-loading-skeleton for loading states.

**Bundle impact:** +65KB total (Framer Motion 60KB, Vaul 3KB, react-loading-skeleton 2KB)
**Performance strategy:** Prefer CSS animations for simple transitions, Framer Motion only for complex/gesture-driven interactions

---

## Already Installed (DO NOT ADD)

These dependencies are already in package.json and should be leveraged:

| Library                   | Current Version | Purpose             | Use For                             |
| ------------------------- | --------------- | ------------------- | ----------------------------------- |
| `framer-motion`           | 12.23.26        | Animation library   | **UPGRADE to 12.34.5** (latest)     |
| `next-themes`             | 0.4.6           | Dark mode           | Smooth theme transitions            |
| `sonner`                  | 2.0.7           | Toast notifications | **KEEP** — better than alternatives |
| `tailwindcss-animate`     | 1.0.7           | Animation utilities | Simple CSS animations               |
| `@tanstack/react-virtual` | 3.13.13         | Virtualization      | Performance for long lists          |

**Action required:** Update `framer-motion` from 12.23.26 → 12.34.5 (published Feb 2026, no breaking changes)

---

## New Dependencies to Add

### 1. Vaul (Mobile Drawers)

| Property     | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| **Package**  | `vaul`                                                       |
| **Version**  | Latest (1.x)                                                 |
| **Size**     | ~3KB                                                         |
| **Why**      | Mobile-optimized drawer/sheet component with gesture support |
| **Replaces** | Generic Dialog on mobile breakpoints                         |

**Rationale:** Apple-level mobile UX requires gesture-based drawers, not desktop modals. Vaul provides:

- Swipe-to-dismiss gestures
- Snap points for partial drawer states
- WAI-ARIA compliant via Radix UI (matches existing shadcn components)
- Integrates seamlessly with shadcn/ui Dialog

**When to use:**

- Forms on mobile (project creation, task editing)
- Filters and settings panels on tablet/mobile
- Bottom sheets for actions (share, export)

**Integration:**

```tsx
import { Drawer } from 'vaul';

// Use Drawer on mobile, Dialog on desktop
const isMobile = useMediaQuery('(max-width: 768px)');
return isMobile ? <Drawer.Root>...</Drawer.Root> : <Dialog>...</Dialog>;
```

**Sources:**

- [Vaul npm package](https://www.npmjs.com/package/vaul)
- [Vaul documentation](https://vaul.emilkowal.ski/)

---

### 2. react-loading-skeleton (Premium Loading States)

| Property     | Value                                                 |
| ------------ | ----------------------------------------------------- |
| **Package**  | `react-loading-skeleton`                              |
| **Version**  | 3.5.0 (latest)                                        |
| **Size**     | ~2KB                                                  |
| **Why**      | Auto-sizing skeleton screens that match content shape |
| **Replaces** | Generic "Loading..." text                             |

**Rationale:** Apple products never show "Loading..." — they show skeletons that mimic the content structure. This library:

- Automatically sizes to match content (no manual width/height)
- Supports React Server Components and Next.js 13+
- Respects `prefers-reduced-motion` accessibility settings
- Customizable theme (integrates with Tailwind colors)

**When to use:**

- Dashboard widgets loading (tasks, meetings, activity feed)
- Project roadmap phases loading
- Client list loading
- Empty states transitioning to populated states

**Implementation pattern:**

```tsx
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

{
  isLoading ? (
    <Skeleton
      count={5}
      baseColor="hsl(var(--muted))"
      highlightColor="hsl(var(--muted-foreground))"
    />
  ) : (
    <TasksList tasks={tasks} />
  );
}
```

**Sources:**

- [react-loading-skeleton npm](https://www.npmjs.com/package/react-loading-skeleton)
- [LogRocket tutorial (Feb 2026)](https://blog.logrocket.com/handling-react-loading-states-react-loading-skeleton/)

---

## Libraries to AVOID

| Library             | Why Not                                                  |
| ------------------- | -------------------------------------------------------- |
| **react-hot-toast** | Already have Sonner (better DX, smaller bundle)          |
| **Aceternity UI**   | Pre-built components conflict with existing shadcn/ui    |
| **GSAP**            | Overkill for this project, heavyweight license           |
| **Motion One**      | Framer Motion already installed, no need for alternative |
| **Lottie**          | No requirement for complex vector animations             |
| **react-spring**    | Framer Motion covers all use cases                       |

---

## Animation Strategy (CSS vs Framer Motion)

**Rule:** Use CSS for simple transitions, Framer Motion for complex interactions.

### Use CSS Animations (via tailwindcss-animate) For:

- Hover states (button hovers, card lifts)
- Fade in/out (modals appearing, toast notifications)
- Simple slides (dropdown menus, tooltips)
- Loading spinners

**Performance:** CSS runs on compositor thread (GPU-accelerated), doesn't block main thread.

**Example classes:**

```tsx
className = 'animate-in fade-in slide-in-from-bottom-4 duration-300';
className = 'transition-all hover:scale-105 hover:shadow-lg';
```

### Use Framer Motion For:

- Page transitions (route changes)
- Drag-and-drop interactions (existing @dnd-kit + motion)
- Scroll-triggered animations (roadmap phases appearing)
- Gesture-based interactions (swipe to delete, long press)
- Layout animations (list reordering, expanding cards)
- Orchestrated sequences (multi-step onboarding)

**Performance:** Framer Motion uses `requestAnimationFrame` + GPU acceleration, performs as well as CSS for most cases. Bundle size justified by DX + functionality.

**Example:**

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
>
  {content}
</motion.div>;
```

**Sources:**

- [CSS vs Framer Motion performance (2026)](https://medium.com/@theekshanachamodhya/why-framer-motion-still-beats-css-animations-in-2025-16b3d74eccbd)
- [Framer Motion Tailwind integration](https://motion.dev/docs/react-tailwind)

---

## Page Transitions (Next.js 16 + React 19)

**Two approaches available:**

### 1. React 19 View Transitions API (Experimental)

| Property            | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| **Status**          | Experimental in React 19.2 (Feb 2026)                  |
| **Setup**           | Enable `experimental.viewTransition` in next.config.js |
| **Bundle**          | 0KB (native browser API)                               |
| **Browser support** | 85-95% (stable in Chrome, Safari, Firefox)             |

**Rationale:** Native browser API means zero JavaScript cost. Good for simple fade/slide transitions between routes.

**Configuration:**

```js
// next.config.js
module.exports = {
  experimental: {
    viewTransition: true,
  },
};
```

**Usage:**

```tsx
import { ViewTransition } from 'react';

<ViewTransition>{children}</ViewTransition>;
```

**Limitations:**

- Limited control over animation details
- No gesture-based navigation transitions
- Experimental flag required

**Sources:**

- [Next.js 16 viewTransition config](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)
- [React 19 View Transitions guide](https://rebeccamdeprey.com/blog/view-transition-api)

### 2. Framer Motion AnimatePresence (Recommended)

| Property   | Value                                         |
| ---------- | --------------------------------------------- |
| **Status** | Production-ready                              |
| **Setup**  | Use `AnimatePresence` + frozen router pattern |
| **Bundle** | Included in framer-motion (already installed) |

**Rationale:** More control, works in all browsers, integrates with existing Framer Motion animations.

**Implementation pattern:**

```tsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
  >
    {children}
  </motion.div>
</AnimatePresence>;
```

**Challenge:** Next.js App Router updates context frequently, disrupting animations. Solution: Use FrozenRouter pattern (keeps context stable during transitions).

**Sources:**

- [Solving Framer Motion page transitions in App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router)
- [Next.js App Router Framer Motion issue](https://github.com/vercel/next.js/issues/49279)

**Recommendation:** Start with React 19 View Transitions for simple fades, upgrade to Framer Motion if custom transitions needed.

---

## Micro-Interactions Patterns (2026 Best Practices)

Based on [Apple's "Liquid Glass" design system](https://developer.apple.com/videos/play/wwdc2025/356/) and [2026 UI/UX trends research](https://primotech.com/ui-ux-evolution-2026-why-micro-interactions-and-motion-matter-more-than-ever/):

### 1. Button Interactions

```tsx
// CSS approach (simple)
<button className="transition-all active:scale-95 hover:scale-105 hover:shadow-lg">
  Submit
</button>

// Framer Motion approach (complex)
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  Submit
</motion.button>
```

### 2. Card Hover States

```tsx
<motion.div
  className="rounded-lg border p-4"
  whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
  transition={{ duration: 0.2 }}
>
  {content}
</motion.div>
```

### 3. Loading States (Progressive Disclosure)

```tsx
import Skeleton from 'react-loading-skeleton';

// Match actual content structure
{
  isLoading ? (
    <div className="space-y-2">
      <Skeleton width={200} height={24} /> {/* Title */}
      <Skeleton count={3} /> {/* Body text */}
      <Skeleton width={100} height={36} /> {/* Button */}
    </div>
  ) : (
    <ActualContent />
  );
}
```

### 4. Scroll-Triggered Animations

```tsx
<motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-100px' }}
  transition={{ duration: 0.6, ease: 'easeOut' }}
>
  {content}
</motion.div>
```

### 5. Empty States

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  className="py-12 text-center"
>
  <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
    📭
  </motion.div>
  <p className="mt-4 text-muted-foreground">No tasks yet</p>
</motion.div>
```

**Sources:**

- [Apple HIG Liquid Glass system](https://developer.apple.com/design/human-interface-guidelines/)
- [Micro-interactions 2026 trends](https://www.techqware.com/blog/motion-design-micro-interactions-what-users-expect)

---

## Dark Mode Transitions

Already installed: `next-themes` 0.4.6

**Enhancement:** Add smooth theme transition animations using CSS.

**Implementation:**

```css
/* globals.css */
* {
  transition:
    background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
```

**Best practice:** Respect `prefers-reduced-motion` — never force animations on users who disabled them.

**Sources:**

- [next-themes GitHub](https://github.com/pacocoursey/next-themes)
- [Next.js 16 dark mode guide](https://ui.shadcn.com/docs/dark-mode/next)

---

## Performance Optimizations

### 1. CSS Containment

Modern CSS containment improves animation performance by isolating subtrees:

```css
.card {
  contain: layout style paint;
}

.virtualized-list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 200px;
}
```

**Impact:** 50-100KB less JavaScript by replacing scroll/tooltip libraries with native CSS. Time to Interactive improved by 0.8s on mobile in benchmarks.

**Sources:**

- [CSS Containment MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Using)
- [CSS in 2026 performance guide](https://blog.logrocket.com/css-in-2026/)

### 2. Animation Performance Checklist

- ✅ Only animate `transform` and `opacity` (GPU-accelerated)
- ✅ Use `will-change: transform` sparingly (only during animation)
- ✅ Prefer CSS transitions for simple state changes
- ✅ Use Framer Motion's layout animations (avoid width/height animations)
- ✅ Virtualize long lists with @tanstack/react-virtual (already installed)
- ✅ Lazy load heavy components with `React.lazy()` + `Suspense`

**Sources:**

- [CSS Animation Performance 2026](https://devtoolbox.dedyn.io/blog/css-animations-complete-guide)
- [Framer Motion Layout Animations](https://www.framer.com/motion/layout-animations/)

---

## Installation Commands

```bash
# Upgrade existing dependency
npm install framer-motion@latest  # 12.23.26 → 12.34.5

# Add new dependencies
npm install vaul react-loading-skeleton

# Install types (if needed)
npm install -D @types/react-loading-skeleton
```

**Post-install:** Import skeleton CSS in root layout:

```tsx
// app/layout.tsx
import 'react-loading-skeleton/dist/skeleton.css';
```

---

## Integration with Existing Stack

### shadcn/ui Components

Vaul is designed to work alongside shadcn's Dialog component:

```tsx
// components/responsive-dialog.tsx
const ResponsiveDialog = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return <Drawer.Root>...</Drawer.Root>; // Vaul
  }

  return <Dialog>...</Dialog>; // shadcn
};
```

### Tailwind CSS

All animations use Tailwind utility classes (via tailwindcss-animate):

```tsx
<div className="duration-300 animate-in slide-in-from-bottom">
  <Skeleton count={3} />
</div>
```

### SWR Data Fetching

Loading states integrate with existing SWR hooks:

```tsx
const { data: tasks, isLoading } = useInboxTasks();

{
  isLoading ? <Skeleton count={5} /> : <TasksList tasks={tasks} />;
}
```

---

## Bundle Size Analysis

| Library                | Size (gzip) | Justification                                    |
| ---------------------- | ----------- | ------------------------------------------------ |
| framer-motion          | ~60KB       | Complex animations, layout transitions, gestures |
| vaul                   | ~3KB        | Mobile drawer UX requirement                     |
| react-loading-skeleton | ~2KB        | Premium loading states                           |
| **Total Added**        | **~65KB**   | **Acceptable for polish milestone**              |

**Context:** Next.js 16 bundle already includes React 19 (70KB), Radix UI primitives (~40KB), date-fns (20KB). Adding 65KB for comprehensive animation support is justified for Apple-level polish.

**Mitigation:**

- Tree-shake Framer Motion (only import used features)
- Lazy load Vaul drawers (code-split mobile-only components)
- CSS animations cover 70% of use cases (0KB)

---

## Confidence Assessment

| Area                   | Confidence | Sources                                                                                     |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| Framer Motion          | **HIGH**   | npm package (12.34.5 published Feb 2026), official docs, Next.js 16 compatibility confirmed |
| Vaul                   | **HIGH**   | npm package (active Feb 2026), official docs, shadcn integration verified                   |
| react-loading-skeleton | **HIGH**   | npm package (3.5.0 stable), React 19 + Next.js 13+ support confirmed                        |
| View Transitions API   | **MEDIUM** | Experimental in React 19.2, 85-95% browser support, production usage verified               |
| CSS Containment        | **HIGH**   | MDN docs, stable browser releases, performance benchmarks from LogRocket                    |
| Animation Patterns     | **HIGH**   | Apple HIG official docs, multiple 2026 UI/UX trend sources                                  |

**Overall:** HIGH confidence. All recommendations based on official documentation, current npm packages, and 2026 web standards.

---

## Alternatives Considered

| Category         | Recommended                      | Alternative     | Why Not                                       |
| ---------------- | -------------------------------- | --------------- | --------------------------------------------- |
| Animation        | Framer Motion + CSS              | react-spring    | Framer Motion already installed, better DX    |
| Animation        | Framer Motion + CSS              | GSAP            | Commercial license required, heavyweight      |
| Loading States   | react-loading-skeleton           | Custom CSS      | Auto-sizing feature saves dev time            |
| Mobile Drawers   | Vaul                             | Sheet component | Vaul has gesture support, Radix UI-compatible |
| Toasts           | Sonner (existing)                | react-hot-toast | Sonner smaller bundle, better TypeScript      |
| Page Transitions | View Transitions + Framer Motion | Router events   | Deprecated in Next.js App Router              |

---

## Next Steps (Implementation Order)

1. **Upgrade Framer Motion** (12.23.26 → 12.34.5) — 5 minutes
2. **Install new dependencies** (vaul, react-loading-skeleton) — 5 minutes
3. **Add skeleton CSS import** to root layout — 2 minutes
4. **Create animation constants** (easings, durations, spring configs) — 15 minutes
5. **Build ResponsiveDialog wrapper** (Desktop Dialog vs Mobile Drawer) — 30 minutes
6. **Replace loading states** with Skeleton components — 1 hour
7. **Add micro-interactions** to buttons/cards (Tailwind classes) — 2 hours
8. **Implement page transitions** (View Transitions or AnimatePresence) — 1 hour
9. **Add scroll-triggered animations** to roadmap phases — 1 hour
10. **Test performance** (Lighthouse, bundle analyzer) — 30 minutes

**Total estimated effort:** 6-8 hours

---

## Sources

**Official Documentation:**

- [Framer Motion](https://motion.dev)
- [Vaul](https://vaul.emilkowal.ski/)
- [react-loading-skeleton](https://github.com/dvtng/react-loading-skeleton)
- [Next.js 16 View Transitions](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [tailwindcss-animate](https://github.com/jamiebuilds/tailwindcss-animate)
- [next-themes](https://github.com/pacocoursey/next-themes)

**Research Articles (2026):**

- [Why Framer Motion Still Beats CSS Animations in 2025](https://medium.com/@theekshanachamodhya/why-framer-motion-still-beats-css-animations-in-2025-16b3d74eccbd)
- [UI/UX Evolution 2026: Micro-Interactions & Motion](https://primotech.com/ui-ux-evolution-2026-why-micro-interactions-and-motion-matter-more-than-ever/)
- [CSS in 2026: New Features Reshaping Frontend](https://blog.logrocket.com/css-in-2026/)
- [Solving Framer Motion Page Transitions in Next.js App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router)
- [Top 9 React Notification Libraries in 2026](https://knock.app/blog/the-top-notification-libraries-for-react)
- [React Loading Skeleton Tutorial (LogRocket, Feb 2026)](https://blog.logrocket.com/handling-react-loading-states-react-loading-skeleton/)

**npm Packages:**

- [framer-motion](https://www.npmjs.com/package/framer-motion) — v12.34.5
- [vaul](https://www.npmjs.com/package/vaul)
- [react-loading-skeleton](https://www.npmjs.com/package/react-loading-skeleton) — v3.5.0
- [tailwindcss-animate](https://github.com/jamiebuilds/tailwindcss-animate)
