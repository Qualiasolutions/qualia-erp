---
phase: 27-responsive-design-audit-and-fixes
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/page-header.tsx
  - app/clients/page.tsx
  - app/projects/page.tsx
  - app/projects/[id]/page.tsx
  - app/clients/[id]/page.tsx
  - app/schedule/page.tsx
  - app/payments/page.tsx
  - app/inbox/inbox-view.tsx
  - app/knowledge/page.tsx
  - app/status/page.tsx
  - app/admin/page.tsx
  - app/admin/layout.tsx
  - app/team/page.tsx
  - components/project-table-view.tsx
  - components/client-table-view.tsx
  - components/admin/assignment-history-table.tsx
autonomous: true

must_haves:
  truths:
    - "User can open sidebar navigation on mobile from every page"
    - "Tables scroll horizontally on mobile without breaking page layout"
    - "Action menus (three-dot) are accessible on touch devices without hover"
    - "Filter bars wrap properly on small screens without horizontal overflow"
  artifacts:
    - path: "components/page-header.tsx"
      provides: "Shared page header with mobile menu trigger"
      exports: ["PageHeader"]
    - path: "components/project-table-view.tsx"
      provides: "Touch-accessible project table"
    - path: "components/client-table-view.tsx"
      provides: "Touch-accessible client table"
  key_links:
    - from: "components/page-header.tsx"
      to: "components/sidebar-provider.tsx"
      via: "useSidebar().toggleMobile"
      pattern: "toggleMobile"
---

<objective>
Fix responsive design issues across all platform pages, focusing on mobile navigation access, table usability, and touch target accessibility.

Purpose: Most pages lack a hamburger menu button to open the sidebar on mobile, making navigation impossible. Tables use hover-only action buttons that are invisible on touch devices. Filter bars overflow on small screens.

Output: Every page gets a mobile menu trigger, tables become touch-friendly, filter bars wrap properly.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/sidebar-provider.tsx
@components/sidebar.tsx
@components/header-actions.tsx
@app/layout.tsx
@~/.claude/skills/responsive/SKILL.md
@~/.claude/skills/frontend-master/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add mobile menu trigger to all page headers</name>
  <files>
    components/page-header.tsx
    app/clients/page.tsx
    app/projects/page.tsx
    app/projects/[id]/page.tsx
    app/clients/[id]/page.tsx
    app/schedule/page.tsx
    app/payments/page.tsx
    app/inbox/inbox-view.tsx
    app/knowledge/page.tsx
    app/status/page.tsx
    app/admin/page.tsx
    app/admin/layout.tsx
    app/team/page.tsx
  </files>
  <action>
    Create a reusable `PageHeader` component at `components/page-header.tsx` that:
    - Accepts `icon`, `iconColor`, `iconBg`, `title`, and `children` (for right-side actions) props
    - Renders a hamburger menu button (Menu icon from lucide-react) that calls `useSidebar().toggleMobile`, visible only on mobile (`md:hidden`)
    - Uses the same header styling pattern: `flex items-center justify-between border-b border-border/40 bg-card/80 px-6 py-4 backdrop-blur-xl sm:px-8`
    - The hamburger button must be min 44x44px touch target: `min-h-[44px] min-w-[44px]` (matching the today-dashboard pattern)

    Then refactor these pages to use `PageHeader` instead of their inline `<header>`:
    - `app/clients/page.tsx` (icon: Building2, emerald)
    - `app/projects/page.tsx` (icon: Folder)
    - `app/projects/[id]/page.tsx` (has back button - keep back button, add menu trigger)
    - `app/clients/[id]/page.tsx` (has back button - keep back button, add menu trigger)
    - `app/schedule/page.tsx` (icon: Calendar)
    - `app/payments/page.tsx` (icon: Wallet)
    - `app/knowledge/page.tsx`
    - `app/status/page.tsx`
    - `app/admin/page.tsx` or `app/admin/layout.tsx`
    - `app/team/page.tsx`

    For `app/inbox/inbox-view.tsx`, it's a client component — add the menu trigger to its header area.

    NOTE: The `app/settings/settings-layout.tsx` and `components/today-dashboard/index.tsx` ALREADY have mobile menu triggers — do NOT touch those.

    The `components/header-actions.tsx` already exists with a mobile menu button but is NOT imported anywhere. Either integrate it into PageHeader or deprecate it.

    For detail pages with back buttons (`projects/[id]`, `clients/[id]`), add the menu trigger BEFORE the back button with `md:hidden`.
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no type errors. Grep for `toggleMobile` to confirm it appears in all page files or through PageHeader import. Verify no page header is missing the mobile trigger by grepping for inline `<header` tags that don't use PageHeader.
  </verify>
  <done>
    Every page in the app has a visible hamburger menu button on mobile (below md breakpoint) that opens the sidebar Sheet. Touch target is minimum 44x44px.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix touch accessibility and filter bar responsiveness</name>
  <files>
    components/project-table-view.tsx
    components/client-table-view.tsx
    components/admin/assignment-history-table.tsx
  </files>
  <action>
    Fix hover-only action buttons across table views:

    1. **Project table (`components/project-table-view.tsx`)**:
       - The three-dot menu button has `opacity-0 group-hover:opacity-100` which makes it invisible on touch devices
       - Change to: `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 touch-action:opacity-100` OR simpler: just make it always visible with reduced opacity `opacity-40 hover:opacity-100` on mobile. Use `md:opacity-0 md:group-hover:opacity-100` so it's always visible on mobile but hover-reveals on desktop.
       - The filter bar `<div className="flex flex-wrap items-center gap-3">` is already using flex-wrap which is good. But the search input has `min-w-[200px]` — reduce to `min-w-[160px]` for very small screens or use `min-w-0 w-full sm:min-w-[200px] sm:max-w-xs sm:flex-1` to make it full-width on mobile and inline on desktop.
       - The select triggers use fixed `w-[130px]` and `w-[140px]` — keep these but ensure they stack properly by making the filter container `flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3`.

    2. **Client table (`components/client-table-view.tsx`)**:
       - Same three-dot menu fix: `md:opacity-0 md:group-hover:opacity-100` instead of `opacity-0 group-hover:opacity-100`
       - Same filter bar improvements as project table
       - The stats bar pills at top should wrap on mobile — they already use flex but check they don't overflow

    3. **Assignment history table (`components/admin/assignment-history-table.tsx`)**:
       - Uses the shared `Table` component which already has `overflow-x-auto` wrapper — verify this works properly
       - If the table has many columns that get cramped, add `min-w-[600px]` to the table element

    Do NOT change the `min-w-[950px]` on the project/client tables — horizontal scroll is the correct pattern for data tables on mobile. The overflow-x-auto wrapper already handles this correctly.
  </action>
  <verify>
    Run `npx tsc --noEmit`. Visually verify by reading the final className strings that:
    1. Action buttons use `md:opacity-0 md:group-hover:opacity-100` (visible on mobile)
    2. Filter containers use responsive flex direction
    3. Search inputs go full-width on mobile
  </verify>
  <done>
    Three-dot action menus visible on touch devices without hover. Filter bars stack vertically on mobile and wrap on tablet. No horizontal overflow on filter bar area.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors
2. Every page except auth/portal has a mobile menu trigger (grep for `toggleMobile` or `PageHeader` usage)
3. No `opacity-0 group-hover:opacity-100` without `md:` prefix remains in table action buttons
4. Filter bars use responsive direction (`flex-col sm:flex-row` or equivalent)
</verification>

<success_criteria>
- All 10+ pages have a working hamburger menu on mobile to open sidebar
- Table action menus accessible on touch without hover
- Filter bars don't overflow on 320px screens
- `npx tsc --noEmit` passes
</success_criteria>

<output>
After completion, create `.planning/quick/27-responsive-design-audit-and-fixes-across/27-01-SUMMARY.md`
</output>
