---
phase: quick-014
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/portal/portal-dashboard-content.tsx
  - components/portal/portal-dashboard-stats.tsx
  - components/portal/portal-projects-list.tsx
  - components/portal/portal-admin-panel.tsx
autonomous: true

must_haves:
  truths:
    - 'Dashboard stats feel premium — numbers are prominent, icons have visual depth, cards use subtle gradients'
    - 'Quick actions have clear visual hierarchy and are not generic icon+text boxes'
    - 'Project cards have layered visual interest beyond flat card borders'
    - 'Sidebar has subtle depth — background texture or gradient, not a flat white panel'
    - 'Admin panel setup flow uses visual emphasis for the credentials reveal'
  artifacts:
    - path: 'app/portal/portal-dashboard-content.tsx'
      provides: 'Enhanced welcome header, richer quick actions'
    - path: 'components/portal/portal-dashboard-stats.tsx'
      provides: 'Premium stat cards with gradient icon containers and number emphasis'
    - path: 'components/portal/portal-projects-list.tsx'
      provides: 'Project cards with type color accents and progress refinement'
    - path: 'components/portal/portal-admin-panel.tsx'
      provides: 'Refined setup card with better credentials reveal styling'
  key_links:
    - from: 'portal-dashboard-stats.tsx'
      to: 'qualia color tokens'
      via: 'qualia-* Tailwind classes'
      pattern: "qualia-\\d+"
---

<objective>
Visual quality enhancement pass on the client portal — stats, quick actions, project cards, sidebar depth, and admin panel. No functionality changes, only CSS/markup refinements to elevate perceived quality.

Purpose: Portal is the client-facing face of Qualia. It needs to feel as premium as the internal suite.
Output: Polished portal components that use depth, gradients, layering, and typographic hierarchy.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@~/.claude/skills/frontend-master/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Elevate dashboard stats, quick actions, and welcome header</name>
  <files>
    app/portal/portal-dashboard-content.tsx
    components/portal/portal-dashboard-stats.tsx
  </files>
  <action>
    **portal-dashboard-stats.tsx** — replace flat icon+number layout with premium stat cards:
    - Remove `bg-blue-500/10`, `bg-amber-500/10`, `bg-red-500/10` from icon containers — too generic
    - Use a consistent qualia-tinted icon container: `bg-gradient-to-br from-qualia-500/15 to-qualia-600/5 ring-1 ring-qualia-500/10` for all three stat icons. Differentiate with icon color only: projects=qualia-600, requests=amber-500, invoices=red-500
    - Make the stat number large and bold: `text-3xl font-bold tracking-tight tabular-nums` (up from text-2xl)
    - Add a thin bottom accent line to the card: `border-b-2 border-transparent hover:border-qualia-500/30 transition-colors duration-300`
    - Card: replace generic `card-interactive` with `card-interactive group relative overflow-hidden` and add a subtle background shimmer div: `<div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />`

    **portal-dashboard-content.tsx** — enhance welcome header and quick actions:
    - Welcome heading: keep h1 but add a subtle underline accent. Wrap the `{displayName}` in a `<span className="text-qualia-600">` so it pops
    - Date line: change to `text-xs font-medium text-muted-foreground/60 uppercase tracking-widest` for typographic interest
    - Quick actions section — add a section label above the grid: `<p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground/50">Quick Actions</p>`
    - Quick action cards: replace `bg-qualia-600/10` icon wrapper with `bg-gradient-to-br from-qualia-500/15 to-qualia-600/5 ring-1 ring-qualia-500/10` (same treatment as stats)
    - Add `group` to each Link and `group-hover:text-qualia-700 transition-colors duration-200` to the card's `<p className="text-sm font-medium">` text
    - Add a right-pointing indicator to each quick action card: after the text div add `<ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-qualia-600 group-hover:translate-x-0.5 transition-all duration-200" />` (import ArrowRight from lucide-react)

  </action>
  <verify>
    Visual: Run `npm run dev`, visit http://localhost:3000/portal, confirm stats have gradient icon containers and larger numbers, quick actions show arrow indicator on hover, displayName is teal-colored.
    Build: `npx tsc --noEmit` passes with no new errors.
  </verify>
  <done>
    Dashboard welcome names are accented teal, stats use gradient icon containers with tabular-nums large numbers, quick actions have ArrowRight hover indicator. No TypeScript errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Refine project cards and sidebar depth</name>
  <files>
    components/portal/portal-projects-list.tsx
    components/portal/portal-sidebar.tsx
  </files>
  <action>
    **portal-projects-list.tsx** — add visual layers to project cards:
    - Add a project type color accent bar at the top of each card. After `<Card ...>` opening tag, insert:
      ```tsx
      <div className="h-0.5 w-full bg-gradient-to-r from-qualia-500/40 via-qualia-600/60 to-qualia-500/20 rounded-t-[inherit]" />
      ```
    - Project name: change `text-lg font-semibold` to `text-base font-semibold tracking-tight` (tighter, more linear-style)
    - Add hover color transition to name: `group-hover:text-qualia-700 transition-colors duration-200`
    - Progress bar: change `className="h-2 bg-qualia-100"` to `className="h-1.5 bg-muted/50"` — thinner, more refined. Inner fill: `className="h-full bg-gradient-to-r from-qualia-500 to-qualia-600 transition-all duration-500 ease-out rounded-full"`
    - Progress percentage: make `text-xs font-semibold tabular-nums text-qualia-600`
    - Bottom row "View Details →": change to `text-xs font-medium text-qualia-600/70 group-hover:text-qualia-700 transition-colors duration-200` and replace `→` with an ArrowRight icon: `<ArrowRight className="h-3 w-3 inline ml-0.5 group-hover:translate-x-0.5 transition-transform duration-200" />` (import ArrowRight from lucide-react)

    **portal-sidebar.tsx** — add subtle depth:
    - `SidebarContent` outer div: change `bg-gradient-to-b from-card to-card/95` to `bg-gradient-to-b from-background to-background/98` plus add a right-edge subtle shadow: `after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-gradient-to-b after:from-transparent after:via-border/40 after:to-transparent relative`
    - Active nav link: add left accent bar instead of (or in addition to) the right dot. Replace the `<span className="absolute right-2 ...">` dot with a left accent: `<span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-qualia-600" />`
    - Active nav link background: change `bg-qualia-600/10` to `bg-gradient-to-r from-qualia-500/12 to-transparent` for a directional feel
    - Logo section: change `bg-qualia-600` Q badge to `bg-gradient-to-br from-qualia-500 to-qualia-700` — gives it more dimensionality
    - User avatar initial: change container from `bg-qualia-600/10` to `bg-gradient-to-br from-qualia-500/20 to-qualia-600/10 ring-1 ring-qualia-500/20`

  </action>
  <verify>
    Visual: Visit http://localhost:3000/portal/projects, confirm top accent bar on cards, refined progress bar, left accent on active sidebar item, gradient logo badge.
    Build: `npx tsc --noEmit` passes.
  </verify>
  <done>
    Project cards have qualia accent bar top, refined progress gradient, no TypeScript errors. Sidebar active items have left accent bar and directional gradient bg. Logo badge has gradient fill.
  </done>
</task>

<task type="auto">
  <name>Task 3: Polish admin panel credentials reveal and section headers</name>
  <files>
    components/portal/portal-admin-panel.tsx
  </files>
  <action>
    The admin panel is internal-facing but should still feel intentional.

    **Setup Client Access card:**
    - Card header: wrap the CardTitle icon in `<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qualia-500/10">` so `<UserPlus className="h-4 w-4 text-qualia-600" />` is contained in a badge-style container. Move it outside CardTitle inline, restructure to: icon badge + text column layout.
    - `Create Client` Button: add `bg-qualia-600 hover:bg-qualia-700 text-white` explicit classes (ensure it uses qualia brand color, not generic default)

    **Credentials reveal block** — make it feel like a success moment, not just a green box:
    - Change container from `rounded-lg border border-green-500/30 bg-green-500/5 p-4` to `rounded-xl border border-qualia-500/20 bg-gradient-to-br from-qualia-500/5 to-transparent p-4 ring-1 ring-qualia-500/10`
    - Add a success icon header row: before the "Client credentials for..." paragraph, insert:
      ```tsx
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-qualia-500/15">
          <Check className="h-3.5 w-3.5 text-qualia-600" />
        </div>
        <span className="text-sm font-semibold text-foreground">Client access created</span>
      </div>
      ```
    - Change credentials paragraph text color from `text-green-700 dark:text-green-400` to `text-muted-foreground text-sm`
    - Credentials code block: change `bg-background p-3 font-mono text-sm` to `bg-muted/50 rounded-lg p-3 font-mono text-xs border border-border/40`

    **Client Accounts card header:**
    - Wrap the `<Users>` icon in same badge treatment: `<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-qualia-500/10"><Users className="h-3.5 w-3.5 text-qualia-600" /></div>`
    - Table header row cells: add `text-xs uppercase tracking-wider` to make them feel more intentional

  </action>
  <verify>
    Visit http://localhost:3000/portal/admin (as admin), verify setup card has badge-style icon, credentials reveal has success header with qualia styling, client table headers are uppercase-tracked.
    Build: `npx tsc --noEmit` passes.
  </verify>
  <done>
    Admin panel setup card uses qualia-brand button and icon badge. Credentials reveal uses qualia gradient container with success icon header. Table headers are uppercase tracked. No TypeScript errors.
  </done>
</task>

</tasks>

<verification>
Run `npx tsc --noEmit` from project root — zero new TypeScript errors.
Run `npm run build` — production build completes without errors.
Visual walk-through: dashboard, /portal/projects, /portal/admin — all three feel elevated with consistent depth and qualia brand use.
</verification>

<success_criteria>

- All three tasks complete with zero TypeScript errors
- Portal dashboard stats display gradient icon containers and large tabular numbers
- Quick actions have ArrowRight hover indicator
- Project cards have teal accent bar and gradient progress fill
- Sidebar active items use left accent bar + directional gradient background
- Admin credentials reveal uses qualia-tinted container with success header
- No functionality regressions — all links, actions, and data display unchanged
  </success_criteria>

<output>
After completion, create `.planning/quick/14-enhance-client-portal-ui-ux-design-layou/014-SUMMARY.md`
</output>
