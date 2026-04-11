# Design System — Qualia ERP Portal v2

> Generated during project setup. This is the source of truth for all frontend work.
> Builder agents read this before writing any component. Update it as design evolves.

## Brand

- **Tone:** clean-minimal
- **Personality:** Premium SaaS utility — Linear meets Notion with warm teal identity. Data-dense, professional, no decorative fluff. Every pixel earns its place.
- **Industry:** Professional services / project management SaaS

## Color System

Uses existing HSL CSS variables from `app/globals.css` and `tailwind.config.ts`. **Do not create new color tokens — use what exists.**

```css
:root {
  /* Primary — Qualia teal brand identity */
  /* Use Tailwind: bg-primary, text-primary, border-primary */
  --color-primary: hsl(174 60% 34%);         /* #00A4AC / qualia-500 */
  --color-primary-hover: hsl(174 60% 29%);   /* qualia-600 */
  --color-primary-subtle: hsl(174 60% 34% / 0.08);  /* bg-primary/[0.08] */

  /* Accent — same teal family, no second accent needed */
  --color-accent: hsl(290 40% 52%);          /* violet — use sparingly */

  /* Neutral — teal-tinted grays (already defined) */
  /* Light: */
  --background: hsl(185 5% 96%);             /* #EDF0F0 */
  --card: hsl(185 4% 99%);                   /* near white, warm */
  --muted: hsl(185 5% 91%);
  --border: hsl(185 4% 85%);
  --foreground: hsl(190 15% 13%);            /* near black */
  --muted-foreground: hsl(185 6% 35%);       /* gray text */

  /* Dark: */
  /* --background: hsl(240 13% 3%)           #121819 */
  /* --card: hsl(228 17% 6%)                 dark card */
  /* --border: hsl(228 14% 14%)              dark border */

  /* Surface layers (use for depth hierarchy) */
  /* surface-1: var(--card) — default card bg */
  /* surface-2: slightly darker — section backgrounds */
  /* surface-3: slightly darker — nested elements */

  /* Semantic — from lib/color-constants.ts */
  /* success: emerald (bg-emerald-50/500) */
  /* warning: amber */
  /* error: red (bg-red-50/500) */
  /* info: blue */
}
```

**Key Tailwind classes for portal:**
- Primary actions: `bg-primary text-primary-foreground`
- Primary subtle bg: `bg-primary/[0.06]` or `bg-primary/[0.08]`
- Cards: `bg-card border-border`
- Muted text: `text-muted-foreground`
- Hover states: `hover:bg-muted/50` or `hover:border-primary/20`

## Typography

Uses GeistSans (display + body) and GeistMono (mono), loaded via `next/font` in `app/layout.tsx`. **No Google Fonts import needed.**

```
Font stack:
  --font-geist-sans: GeistSans, system-ui, sans-serif
  --font-geist-mono: GeistMono, 'SF Mono', monospace

Hierarchy:
  Page title:     text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight
  Section title:  text-[clamp(1.25rem,1.1rem+0.75vw,1.625rem)] font-semibold tracking-tight
  Card title:     text-base font-semibold
  Body:           text-sm (14px) — default for dense UI
  Label:          text-xs font-medium uppercase tracking-wider text-muted-foreground
  Caption:        text-xs text-muted-foreground
  Mono/data:      font-mono tabular-nums
```

**Letter spacing:** `-0.02em` on large headings (≥text-xl), `tracking-wider` on labels/section markers.

## Spacing Scale

8px grid: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96`

- **Within components:** `p-4` to `p-6` (16–24px)
- **Between related elements:** `gap-3` to `gap-4` (12–16px)
- **Between sections:** `gap-6` to `gap-8` (24–32px)
- **Page padding:** `p-6 lg:p-8` (24–32px)
- **Sidebar width:** `w-64` (256px)

## Motion

- **Approach:** subtle — purposeful, never decorative
- **Timing functions (exponential deceleration ONLY):**
  - `transition-[property]` + `duration-200` + default ease (micro-interactions)
  - `ease-[premium]` = `cubic-bezier(0.16, 1, 0.3, 1)` (general movement)
  - `ease-[ease-out-expo]` = `cubic-bezier(0.19, 1, 0.22, 1)` (modals, drawers)
  - `ease-[ease-out-quart]` = `cubic-bezier(0.25, 1, 0.5, 1)` (tooltips)
- **Hover/focus:** 150ms ease-out
- **Expand/collapse:** 250ms ease-in-out
- **Page load stagger:** 30ms delay between elements (classes: `stagger-1` through `stagger-8`)
- **Entrance animation:** `animate-fade-in` (0.2s) or `animate-slide-up` (0.25s)
- **No bounce, spring, or elastic easing — ever**
- **Reduced motion:** `prefers-reduced-motion: reduce` disables all non-essential animation

## Component Patterns

### Portal Sidebar
- Width: `w-64` desktop, Sheet on mobile (`md:hidden`)
- Background: `bg-card` (light) / uses surface-1 token (dark)
- Border: `border-r border-border`
- Nav items: `h-10 px-3 gap-3 text-sm font-medium rounded-lg`
- Active state: `border-l-2 border-primary bg-primary/[0.06] text-primary`
- Inactive: `text-muted-foreground hover:bg-muted/50 hover:text-foreground`
- Icons: Lucide, `h-4 w-4`
- Company branding at top, user menu at bottom

### Tabs (Underline Style)
- Container: `border-b border-border flex gap-6`
- Active tab: `border-b-2 border-primary text-primary font-medium pb-3`
- Inactive tab: `text-muted-foreground hover:text-foreground pb-3 transition-colors duration-150`
- **Not pill/filled — underline only**

### Cards
- Default: `rounded-xl border border-border bg-card`
- Padding: `p-5` or `p-6`
- Interactive: `hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer`
- **No identical card grids** — vary content and emphasis

### Stat Cards
- Container: `rounded-xl border bg-card p-5`
- Label: `text-xs font-medium uppercase tracking-wider text-muted-foreground`
- Value: `text-2xl font-bold tabular-nums text-foreground`
- Icon: top-right, `text-muted-foreground/20`

### Status Badges
Use shadcn `Badge` component with variants:
- Active/Done: `bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400`
- In Progress: `bg-primary/10 text-primary`
- Pending/Todo: `bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400`
- Delayed/Overdue: `bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400`
- Cancelled: `bg-muted text-muted-foreground`

### Progress Bars
- Track: `h-1.5 rounded-full bg-border/30`
- Fill: `bg-primary rounded-full transition-all duration-500`
- With percentage: `text-xs tabular-nums text-muted-foreground` next to bar

### Empty States
- Centered vertically and horizontally
- Icon: `h-12 w-12 text-muted-foreground/30`
- Title: `text-base font-medium text-foreground`
- Description: `text-sm text-muted-foreground`
- CTA button if applicable

### Buttons
- Primary: `bg-primary text-primary-foreground rounded-lg` (shadcn default)
- Secondary: `bg-secondary text-secondary-foreground rounded-lg`
- Ghost: `hover:bg-muted/50 rounded-lg`
- Sizes: shadcn defaults (sm/default/lg)

### Inputs
- shadcn defaults with existing focus ring styles
- Focus: `ring-primary/30 border-primary/50`
- Height: `h-10` (default), `h-9` (compact)

## Responsive Approach

- **Strategy:** mobile-first with Tailwind breakpoints
- **Breakpoints:** `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- **Sidebar:** hidden on mobile, Sheet drawer. Visible on `md:`
- **Grids:** `grid-cols-1` → `md:grid-cols-2` → `lg:grid-cols-3` or `lg:grid-cols-4`
- **Two-column layouts:** stack on mobile, side-by-side on `lg:`
- **Touch targets:** 44px minimum on mobile
- **Page padding:** `p-4 md:p-6 lg:p-8`

## Visual Effects

- **Elevation:** Use existing 5-tier system (`elevation-1` through `elevation-5`)
- **Glow:** `shadow-glow-sm` on focused interactive elements
- **Glass:** Sticky headers get `backdrop-blur-lg bg-background/80`
- **No noise textures, no gradient meshes, no decorative shapes**
- **Keep it clean and data-focused**

## Anti-Patterns (Don't Do This)

- No Inter, Roboto, Arial, system-ui fonts — GeistSans only
- No blue-purple gradients — teal is the brand
- No identical card grids — vary layout and emphasis
- No generic stock-photo heroes — data-dense utility
- No hardcoded max-width containers — use fluid layouts
- No gray-on-gray low-contrast text — respect WCAG AA (4.5:1)
- No bounce/spring/elastic animations — exponential deceleration only
- No gradient text on headings — clean solid colors
- No cards wrapping cards — flat hierarchy
- No emoji as icons — Lucide icons only
