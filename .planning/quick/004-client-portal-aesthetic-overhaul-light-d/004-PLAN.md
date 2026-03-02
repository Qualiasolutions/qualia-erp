---
phase: 004-client-portal-aesthetic-overhaul-light-d
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/portal/layout.tsx
  - components/portal/portal-header.tsx
  - components/portal/portal-projects-list.tsx
  - components/portal/portal-roadmap.tsx
  - components/portal/portal-tabs.tsx
  - components/portal/portal-admin-panel.tsx
  - components/portal/portal-file-list.tsx
  - components/portal/portal-activity-feed.tsx
  - components/portal/phase-comment-thread.tsx
  - app/portal/page.tsx
  - app/portal/[id]/page.tsx
  - app/portal/[id]/files/page.tsx
  - app/portal/[id]/updates/page.tsx
autonomous: true

must_haves:
  truths:
    - Client portal respects user's theme preference (light/dark)
    - All portal components use design system CSS variables
    - Status badges readable in both light and dark modes
    - Info banners work correctly in both themes
    - Theme toggle available in portal header
    - Portal visual quality matches admin UI (Linear/Plane aesthetic)
  artifacts:
    - path: 'components/portal/portal-header.tsx'
      provides: 'Theme toggle in header, design system colors'
      contains: 'ThemeToggle'
    - path: 'components/portal/portal-projects-list.tsx'
      provides: 'Project cards with theme-aware status badges'
      contains: 'bg-card'
    - path: 'app/portal/layout.tsx'
      provides: 'Theme-aware layout wrapper'
      contains: 'bg-background'
  key_links:
    - from: 'components/portal/portal-header.tsx'
      to: 'components/theme-toggle.tsx'
      via: 'import and render ThemeToggle'
      pattern: 'import.*ThemeToggle'
    - from: 'app/portal/layout.tsx'
      to: 'app/globals.css'
      via: 'CSS variables from design system'
      pattern: 'bg-background|bg-card|text-foreground'
    - from: 'components/portal/portal-projects-list.tsx'
      to: 'app/globals.css'
      via: 'Theme-aware status badge colors'
      pattern: 'dark:text-|bg-.*/15'
---

<objective>
Modernize client portal styling to match admin UI's professional design system with full light/dark mode support.

Purpose: Provide clients with a premium, accessible experience that respects their theme preferences and matches the visual quality of the admin interface.

Output: 13 portal files updated to use design system CSS variables, theme-aware status badges, and theme toggle in header.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/globals.css
@components/theme-toggle.tsx
@components/portal/portal-header.tsx
@components/portal/portal-projects-list.tsx
@components/portal/portal-roadmap.tsx
@app/portal/layout.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Migrate layout and header to design system</name>
  <files>
    app/portal/layout.tsx
    components/portal/portal-header.tsx
  </files>
  <action>
    **app/portal/layout.tsx:**
    - Replace `bg-neutral-50` → `bg-background`
    - Replace `bg-white` → `bg-card`
    - Replace `border-neutral-200` → `border-border`
    - Replace `text-neutral-600` → `text-muted-foreground`
    - Replace `text-qualia-600` → keep (brand color is fine)

    **components/portal/portal-header.tsx:**
    - Import `ThemeToggle` from `@/components/theme-toggle`
    - Add ThemeToggle button in header between logo and user menu
    - Replace `border-neutral-200` → `border-border`
    - Replace `bg-white` → `bg-card`
    - Replace `text-neutral-900` → `text-foreground`
    - Replace `text-neutral-700` → `text-muted-foreground`
    - Replace `text-neutral-600` → `text-muted-foreground`
    - Replace `text-neutral-500` → `text-muted-foreground/80`
    - Replace `hover:bg-neutral-100` → `hover:bg-muted/50`
    - Admin banner colors (qualia-*) can stay as-is (brand accent)

  </action>
  <verify>
    - `grep -E "bg-neutral-|text-neutral-|border-neutral-" app/portal/layout.tsx components/portal/portal-header.tsx` returns no hardcoded neutral colors
    - `grep "ThemeToggle" components/portal/portal-header.tsx` confirms import and usage
    - `npm run build` completes without errors
  </verify>
  <done>
    Layout and header use design system CSS variables, theme toggle present in header, no hardcoded neutral colors remaining.
  </done>
</task>

<task type="auto">
  <name>Task 2: Migrate project list, roadmap, tabs, and admin panel components</name>
  <files>
    components/portal/portal-projects-list.tsx
    components/portal/portal-roadmap.tsx
    components/portal/portal-tabs.tsx
    components/portal/portal-admin-panel.tsx
  </files>
  <action>
    **For all 4 components, apply these replacements:**
    - `bg-white` → `bg-card`
    - `bg-neutral-50` → `bg-background`
    - `bg-neutral-100` → `bg-muted`
    - `text-neutral-900` → `text-foreground`
    - `text-neutral-800` → `text-foreground`
    - `text-neutral-700` → `text-muted-foreground`
    - `text-neutral-600` → `text-muted-foreground`
    - `text-neutral-500` → `text-muted-foreground/80`
    - `text-neutral-400` → `text-muted-foreground/60`
    - `border-neutral-200` → `border-border`
    - `border-neutral-300` → `border-border`
    - `hover:bg-neutral-50` → `hover:bg-muted/50`
    - `hover:bg-neutral-100` → `hover:bg-muted`

    **Status badge color functions** (in portal-projects-list.tsx and portal-roadmap.tsx):
    Update `getStatusColor()` functions to return theme-aware classes:
    - `Active`: `bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20`
    - `Launched`: `bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20`
    - `Demos`: `bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20`
    - `Delayed`: `bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20`
    - `Archived`: `bg-muted text-muted-foreground border-border`
    - `Canceled`: `bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20`

    **Empty states** (portal-projects-list.tsx):
    - Icon container: `bg-muted` instead of `bg-neutral-100`
    - Icon color: `text-muted-foreground/60` instead of `text-neutral-400`
    - Border: `border-border` instead of `border-neutral-200`
    - Background: `bg-muted/50` instead of `bg-neutral-50`

  </action>
  <verify>
    - `grep -E "bg-neutral-|text-neutral-|border-neutral-" components/portal/portal-projects-list.tsx components/portal/portal-roadmap.tsx components/portal/portal-tabs.tsx components/portal/portal-admin-panel.tsx` returns no hardcoded neutral colors
    - `grep -E "bg-green-100|bg-blue-100|bg-yellow-100" components/portal/portal-projects-list.tsx components/portal/portal-roadmap.tsx` returns no old status badge colors
    - `npm run build` completes without TypeScript errors
  </verify>
  <done>
    All 4 components use design system CSS variables, status badges have dark mode variants with opacity-based colors, empty states theme-aware.
  </done>
</task>

<task type="auto">
  <name>Task 3: Migrate remaining components and page files</name>
  <files>
    components/portal/portal-file-list.tsx
    components/portal/portal-activity-feed.tsx
    components/portal/phase-comment-thread.tsx
    app/portal/page.tsx
    app/portal/[id]/page.tsx
    app/portal/[id]/files/page.tsx
    app/portal/[id]/updates/page.tsx
  </files>
  <action>
    **For all 7 files, apply these replacements:**
    - `bg-white` → `bg-card`
    - `bg-neutral-50` → `bg-background`
    - `bg-neutral-100` → `bg-muted`
    - `bg-neutral-200` → `bg-muted`
    - `text-neutral-900` → `text-foreground`
    - `text-neutral-700` → `text-muted-foreground`
    - `text-neutral-600` → `text-muted-foreground`
    - `text-neutral-500` → `text-muted-foreground/80`
    - `text-neutral-400` → `text-muted-foreground/60`
    - `border-neutral-200` → `border-border`

    **Info banners** (in files/page.tsx and updates/page.tsx):
    Replace `bg-blue-50 border-blue-200 text-blue-900` with:
    `bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300`

    **Comment thread highlights** (phase-comment-thread.tsx):
    Replace `border-amber-200 bg-amber-50` with:
    `border-amber-500/30 bg-amber-500/10 dark:border-amber-500/20 dark:bg-amber-500/5`

  </action>
  <verify>
    - `grep -E "bg-neutral-|text-neutral-|border-neutral-" components/portal/portal-file-list.tsx components/portal/portal-activity-feed.tsx components/portal/phase-comment-thread.tsx app/portal/page.tsx app/portal/[id]/page.tsx app/portal/[id]/files/page.tsx app/portal/[id]/updates/page.tsx` returns no hardcoded neutral colors
    - `grep -E "bg-blue-50|border-blue-200|bg-amber-50|border-amber-200" components/portal/phase-comment-thread.tsx app/portal/[id]/files/page.tsx app/portal/[id]/updates/page.tsx` returns no old info banner colors
    - `npm run build` completes without errors
    - Manual verification: Visit `/portal` in browser, toggle theme, confirm all elements render correctly in both light and dark modes
  </verify>
  <done>
    All remaining portal components and pages use design system CSS variables, info banners work in both themes, comment highlights have dark mode support. Client portal fully theme-aware.
  </done>
</task>

</tasks>

<verification>
**Build verification:**
- `npm run build` passes with no TypeScript errors
- No console warnings about missing CSS variables

**Code verification:**

- No hardcoded `bg-neutral-*`, `text-neutral-*`, or `border-neutral-*` classes in any portal files
- Status badge functions return theme-aware opacity-based colors
- ThemeToggle imported and rendered in portal header

**Visual verification (manual):**

- Visit `/portal` in light mode: clean, professional appearance
- Toggle to dark mode: all elements readable, proper contrast
- Project cards: status badges visible in both themes
- Info banners: proper colors in both themes
- Comment highlights: visible but not jarring in both themes
- No flash of unstyled content on theme change
  </verification>

<success_criteria>

- All 13 portal files use design system CSS variables exclusively
- ThemeToggle present in portal header and functional
- Status badges use opacity-based colors with dark mode variants
- Info banners and highlights work correctly in both light and dark themes
- Visual quality matches admin UI (Linear/Plane aesthetic)
- Production build succeeds with no errors
- Client portal respects user's theme preference
  </success_criteria>

<output>
After completion, create `.planning/quick/004-client-portal-aesthetic-overhaul-light-d/004-01-SUMMARY.md`
</output>
