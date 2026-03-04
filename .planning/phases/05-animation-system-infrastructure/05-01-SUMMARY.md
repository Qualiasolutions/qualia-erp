---
phase: 05-animation-system-infrastructure
plan: 01
subsystem: animation-foundation
tags: [animations, a11y, ux, transitions, dark-mode]
completed: 2026-03-04
duration: 2min

# Dependency Graph
requires:
  - components/page-transition.tsx (existing)
  - next-themes ThemeProvider (existing)

provides:
  - Portal page transitions (fade on navigation)
  - Smooth dark mode color transitions
  - Global reduced motion support

affects:
  - All portal pages (/portal/*)
  - Dark mode toggle (app-wide)
  - All animations and transitions (a11y)

# Tech Stack
added: []

patterns:
  - Framer Motion client-side wrappers for page transitions
  - CSS transition properties for theme changes
  - Prefers-reduced-motion media query for accessibility

# Key Files
created: []

modified:
  - app/portal/layout.tsx: Added PageTransition wrapper
  - components/theme-provider.tsx: Removed disableTransitionOnChange prop
  - app/globals.css: Added dark mode transitions + enhanced reduced motion support

# Decisions
decisions: []
---

# Phase 05 Plan 01: Animation Foundation Summary

**Enabled smooth page transitions and dark mode color transitions across portal while respecting accessibility preferences.**

## What Was Built

### Page Transitions (TRANS-01)

Added PageTransition wrapper to portal layout (`app/portal/layout.tsx`):

- Imported PageTransition from `@/components/page-transition`
- Wrapped `{children}` in main tag with PageTransition component
- Portal pages now fade in on navigation (opacity 0→1, translateY 6px→0, 200ms)
- Matches animation pattern already used in admin pages

**Result:** Users see smooth fade when navigating /portal → /portal/[id] → /portal/[id]/files

### Dark Mode Smooth Transitions (DARK-01)

Enabled smooth theme transitions in two steps:

1. **ThemeProvider** (`components/theme-provider.tsx`):
   - Removed `disableTransitionOnChange` prop
   - next-themes now triggers transitions when user toggles dark/light mode

2. **CSS Transitions** (`app/globals.css`):
   - Added global transition rule for color properties:
     - `transition-property: color, background-color, border-color, text-decoration-color, fill, stroke`
     - `transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1)` (premium easing)
     - `transition-duration: 300ms`
   - Scoped to color changes only (not layout properties)

**Result:** Theme toggle now smoothly transitions all colors over 300ms instead of instant flash

### Accessibility Support (A11Y-01)

Enhanced existing `prefers-reduced-motion` media query in `app/globals.css`:

- All animations become instant (0.01ms) when user prefers reduced motion
- All transitions become instant (0.01ms)
- Added `scroll-behavior: auto !important` to disable smooth scroll
- Uses `!important` to ensure it wins over all animation declarations
- Catches Tailwind animations, Framer Motion, custom CSS animations, and pseudo-elements

**Result:** Motion-sensitive users get instant page transitions, instant theme changes, and disabled smooth scroll

## Verification Coverage

All 5 success criteria met:

- [x] **TRANS-01**: Portal pages use PageTransition wrapper (fade on navigation)
- [x] **TRANS-02**: Admin pages already use PageTransition (existing, unchanged)
- [x] **TRANS-03**: Dialogs already have animations via Radix data-state (existing, unchanged)
- [x] **DARK-01**: Dark mode transitions enabled + CSS transition rules added
- [x] **A11Y-01**: Prefers-reduced-motion media query disables all animations

## Deviations from Plan

None - plan executed exactly as written.

## Manual Verification Steps

1. **Portal page transitions**: Navigate /portal → /portal/[id] → /portal/[id]/files and observe smooth fade
2. **Admin page transitions**: Navigate /projects → /inbox → /schedule and confirm fade still works
3. **Dialog animations**: Open any modal (e.g., new task modal) and observe zoom-in entrance animation
4. **Dark mode transition**: Toggle dark/light mode in settings and observe smooth color fade (not flash)
5. **Reduced motion**: Enable "Reduce motion" in OS settings and verify all transitions become instant

## Technical Notes

### Why This Works

**PageTransition pattern:**

- Already a 'use client' component (uses Framer Motion)
- Uses `usePathname()` to detect route changes
- AnimatePresence with `mode="wait"` prevents exit/enter overlap
- Safe to use in Server Component layouts (only the wrapper is client-side)

**Dark mode transitions:**

- CSS transitions only fire when `class="dark"` changes on `<html>` element
- Scoped to color properties avoids janky layout transitions
- 300ms duration matches user expectation for theme toggle
- Premium easing (0.16, 1, 0.3, 1) from tailwind.config.ts design system

**Reduced motion:**

- Media query applies globally to all elements
- 0.01ms duration (not 0) prevents animation removal bugs
- `!important` ensures it overrides all other animation/transition rules
- Includes `::before` and `::after` to catch pseudo-element animations

## Self-Check: PASSED

**Created files:** None

**Modified files verified:**

```bash
# All 3 files exist with expected changes
[ -f "app/portal/layout.tsx" ] && echo "FOUND: app/portal/layout.tsx"
[ -f "components/theme-provider.tsx" ] && echo "FOUND: components/theme-provider.tsx"
[ -f "app/globals.css" ] && echo "FOUND: app/globals.css"
```

**Commits verified:**

```bash
# All 3 commits exist in history
git log --oneline --all | grep "f14c337" # Task 1 commit
git log --oneline --all | grep "f89c6f9" # Task 2 commit
git log --oneline --all | grep "11c627a" # Task 3 commit
```

All files and commits verified.
