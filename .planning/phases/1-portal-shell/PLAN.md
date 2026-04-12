---
phase: 1
goal: "New portal layout, sidebar, dashboard, and project views that match Assembly's quality"
tasks: 5
waves: 3
---

# Phase 1: Portal Shell & Foundation

Goal: The client portal loads with an Assembly-inspired sidebar layout, a modern dashboard with stats/action-items/projects, a redesigned projects list, a tabbed project detail view, and modernized billing/requests/settings pages. All existing data fetching and server actions continue to work. Dark mode and mobile responsive throughout.

## Task 1 -- Portal Design System

**Wave:** 1
**Files:**
- CREATE `.planning/DESIGN.md` -- portal-specific design system spec (exports: design tokens, component patterns, motion approach)

**Action:**
Generate `.planning/DESIGN.md` from the template at `~/.claude/qualia-templates/DESIGN.md`, filled with the Qualia ERP portal design system. Use these concrete values:

- **Brand tone:** clean-minimal, "Premium SaaS utility -- Linear meets Notion with warm teal identity"
- **Primary:** Qualia teal `#00A4AC` (already `qualia-500` in tailwind.config.ts). Primary hover: `qualia-600`. Primary subtle: `qualia-500/10`.
- **Accent:** same teal family -- no second accent color needed.
- **Neutrals:** HSL ~185-190 tinted grays already defined in the Tailwind config as `--background`, `--foreground`, `--muted`, `--card`, `--border` etc. Light bg: `#EDF0F0`, dark bg: `#121819`.
- **Typography:** GeistSans (display + body), GeistMono (mono). Already loaded via `next/font` in `app/layout.tsx`. No Google Fonts import needed.
- **Spacing:** 8px grid, fluid `clamp()` for section padding.
- **Motion:** Exponential deceleration only (`ease-out-quart`, `ease-out-expo`, `premium`). Stagger at 30ms. No bounce/spring/elastic.
- **Sidebar:** 256px wide desktop, full-height, bg matches `surface-1` tier. Dark sidebar option: `bg-[#121819]` in both modes for contrast.
- **Cards:** `rounded-xl`, `border border-border`, `bg-card`. No identical card grids.
- **Buttons:** shadcn/ui defaults. Primary: solid teal. Sizes: shadcn default (sm/md/lg).
- **Tabs:** Underline indicator style (not pill/filled). Active: `border-b-2 border-primary text-primary`. Inactive: `text-muted-foreground`.

Reference `tailwind.config.ts` and `lib/color-constants.ts` for existing values -- do not invent new tokens that conflict.

**Context:** Read `@tailwind.config.ts`, `@lib/color-constants.ts`, `@~/.claude/qualia-templates/DESIGN.md`, `@~/.claude/rules/frontend.md`
**Done when:** `.planning/DESIGN.md` exists with concrete CSS variable values (not placeholders), references existing Tailwind tokens, and covers palette, typography, spacing, motion, component patterns, and portal-specific sidebar/tab patterns.


## Task 2 -- Portal Layout Shell & Sidebar

**Wave:** 2 (after Task 1)
**Files:**
- CREATE `components/portal/portal-sidebar-v2.tsx` -- new Assembly-style sidebar component (~300 lines)
- MODIFY `app/portal/layout.tsx` -- swap `PortalSidebar` import to `PortalSidebarV2`, keep all server-side data fetching and admin banner logic

**Action:**
Build the new portal sidebar and update the layout to use it. The sidebar must:

1. **Structure** (top to bottom):
   - Company branding area: Qualia logo (`/logo.webp` via `next/image`) + "QUALIA" text, plus client's `companyName` below if available
   - Navigation section with Lucide icons:
     - Home (`House`) -- `/` (exact match)
     - Projects (`FolderKanban`) -- `/projects`
     - Messages (`MessageSquare`) -- `/messages` (link only, no page yet -- show "Coming soon" tooltip)
     - Files (`Files`) -- `/files` (link only, no page yet -- show "Coming soon" tooltip)
     - Billing (`Receipt`) -- `/billing`
     - Requests (`Lightbulb`) -- `/requests`
     - Settings (`Settings`) -- `/settings`
   - User area at bottom: avatar initial circle + name + email + ThemeSwitcher + dropdown menu (profile, theme toggle, sign out, "Exit preview" for admins)

2. **Styling:**
   - Width: `w-64` (256px) on desktop, hidden on mobile
   - Background: `bg-card` light / `bg-[#121819]` dark (or use existing surface-1 pattern)
   - Active nav item: left border accent (`border-l-2 border-primary`) + `bg-primary/[0.06]` + `text-primary`
   - Inactive: `text-muted-foreground hover:bg-muted/50 hover:text-foreground`
   - Nav items: `h-10 px-3 gap-3 text-sm font-medium rounded-lg` with icon size `h-4 w-4`
   - Transitions: 150ms ease-out on all hover/active states

3. **Mobile:** Use shadcn `Sheet` component (already imported in current sidebar). Hamburger menu button fixed top-left on `md:hidden`. Sheet slides from left with full sidebar content.

4. **Props interface:** Same as current `PortalSidebarProps` -- `displayName`, `displayEmail`, `isAdminViewing`, `companyName`. Keep exact same data contract so `layout.tsx` changes are minimal.

5. **Layout update:** In `app/portal/layout.tsx`, change `import { PortalSidebar }` to `import { PortalSidebarV2 }` and update the JSX. Keep ALL existing server-side logic (auth check, role check, profile fetch, companyName fetch, admin banner). Keep `PageTransition` wrapper.

**Context:** Read `@.planning/DESIGN.md`, `@components/portal/portal-sidebar.tsx` (current implementation to match props), `@app/portal/layout.tsx`, `@components/theme-switcher.tsx`
**Done when:**
- Portal loads at `/` with the new sidebar layout
- Sidebar shows all 7 nav items with correct icons
- Active route is highlighted with primary color left border
- Mobile: hamburger opens sheet with full sidebar
- Admin banner still shows for admin/manager users
- User dropdown at bottom works (sign out, exit preview)
- Dark mode renders correctly
- `npx tsc --noEmit` passes with no new errors


## Task 3 -- Portal Dashboard (Home Page)

**Wave:** 2 (after Task 1, parallel with Task 2)
**Files:**
- CREATE `components/portal/portal-dashboard-v2.tsx` -- new dashboard content component (~350 lines)
- CREATE `components/portal/portal-stats-row.tsx` -- stats row component (~120 lines)
- MODIFY `app/portal/portal-dashboard-content.tsx` -- replace component body with `PortalDashboardV2`, keep same props interface and SWR data fetching

**Action:**
Build the new Assembly-inspired portal dashboard. Reuse ALL existing data fetching (the `usePortalDashboard` hook and its return shape).

1. **Greeting section:**
   - Date line: `text-sm font-medium uppercase tracking-widest text-muted-foreground` showing "FRIDAY, APRIL 11"
   - Greeting: `text-3xl font-semibold tracking-tight` with "Good morning, {firstName}" where name gets `text-primary` color (NOT gradient -- clean and simple)

2. **Stats row** (`portal-stats-row.tsx`):
   - 4 stat cards in a responsive grid: `grid-cols-2 lg:grid-cols-4 gap-4`
   - Each card: `rounded-xl border bg-card p-5` with:
     - Label: `text-xs font-medium uppercase tracking-wider text-muted-foreground`
     - Value: `text-2xl font-bold tabular-nums text-foreground`
     - Subtle icon in top-right corner at `text-muted-foreground/20`
   - Stats: Active Projects (`FolderKanban`), Pending Tasks (`CircleCheck`), Messages (`MessageSquare`, hardcode "0" for now), Outstanding (`Receipt`, format as currency)
   - Loading state: skeleton rectangles matching the card layout
   - Props: `stats: DashboardStats | null`, `isLoading: boolean`

3. **Two-column layout below stats:**
   - Left (2/5 width on `lg`): Action items section
     - Reuse existing `PortalActionItems` component from `@components/portal/portal-action-items.tsx` (it already takes `clientId` prop)
   - Right (3/5 width on `lg`): Projects overview
     - Show each project as a compact row/card: project name, status badge, progress bar, current phase name
     - Link each to `/projects/${project.id}`
     - Use the `projects` array from `usePortalDashboard` return (type: `ProjectWithPhases[]`)
     - Empty state: "No active projects" with link to `/projects`

4. **Quick actions row** (below two-column):
   - 3 cards: "Submit a request" (Lightbulb), "View projects" (FolderKanban), "Contact support" (Headphones)
   - Each: `rounded-xl border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200`
   - Keep the same links as current implementation

5. **Stagger animations:** Use existing `fadeInClasses` and `getStaggerDelay` from `@lib/transitions.ts`. Apply stagger-in on greeting (0), stats (1), two-column (2), quick actions (3).

6. **Modification to `portal-dashboard-content.tsx`:** Replace the JSX body with the new `PortalDashboardV2` component. Keep the `usePortalDashboard` hook call and all existing data extraction. Pass `stats`, `projects`, `isLoading`, `isError`, `isValidating`, `clientId`, `displayName`, `companyName` as props. Keep `PortalWelcomeTour` at the top.

**Context:** Read `@.planning/DESIGN.md`, `@app/portal/portal-dashboard-content.tsx`, `@components/portal/portal-dashboard-stats.tsx`, `@components/portal/portal-action-items.tsx`, `@components/portal/portal-whats-next-widget.tsx`, `@lib/swr.ts` (search for `usePortalDashboard`)
**Done when:**
- Dashboard shows greeting with client name and current date
- 4 stat cards render with correct data from `usePortalDashboard`
- Action items section shows (reusing existing component)
- Projects overview shows project names with progress bars
- Quick actions row renders 3 cards with correct links
- Loading state shows skeletons (not blank)
- Error state shows error banner
- Stagger animation plays on load
- Mobile: stats go to 2-column grid, two-column layout stacks vertically
- Dark mode renders correctly


## Task 4 -- Projects List & Project Detail (Tabbed)

**Wave:** 2 (after Task 1, parallel with Tasks 2 and 3)
**Files:**
- CREATE `components/portal/portal-projects-grid.tsx` -- new projects grid component (~200 lines)
- CREATE `components/portal/portal-project-tabs.tsx` -- new tabbed project detail component (~250 lines)
- MODIFY `app/projects/page.tsx` -- swap `PortalProjectsList` for `PortalProjectsGrid`
- MODIFY `app/portal/[id]/portal-project-content.tsx` -- use new tabbed layout instead of current tabs + roadmap-only view

**Action:**

### A. Projects Grid (`portal-projects-grid.tsx`)
Replace the flat list with a card grid:
- Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5`
- Each project card: `rounded-xl border bg-card p-6 hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer` wrapped in `Link` to `/projects/${project.id}`
  - Project type icon (map `project_type` to Lucide icons: `web_design` -> `Globe`, `ai_agent` -> `Bot`, `voice_agent` -> `Phone`, `seo` -> `Search`, `ads` -> `Megaphone`, `ai_platform` -> `Brain`, `app` -> `Smartphone`, default -> `Folder`)
  - Project name: `text-base font-semibold`
  - Status badge: use existing status color mapping or simple `Badge` from shadcn with variant
  - Description: `text-sm text-muted-foreground line-clamp-2` (if available)
  - Progress bar at bottom: `h-1.5 rounded-full bg-border/30` with fill `bg-primary`
  - Phase info: `text-xs text-muted-foreground` showing "Phase {n}/{total} -- {current phase name}"
- Search/filter bar at top: shadcn `Input` with `Search` icon, filters by project name (client-side)
- Empty state: centered message with `FolderOpen` icon, "No projects yet", muted description
- Props: accept the same data shape as current `PortalProjectsList` (the `projects` array with nested `project` objects + `progressMap`)

### B. Project Detail Tabs (`portal-project-tabs.tsx`)
Replace the current tab pills with an underline tab component:
- Tab bar: `border-b border-border flex gap-6` (not gap-1)
- Tab items: Overview, Roadmap, Files, Updates (rename "Features" to appear under Requests in sidebar)
- Active tab: `border-b-2 border-primary text-primary font-medium pb-3`
- Inactive tab: `text-muted-foreground hover:text-foreground pb-3`
- Tabs are client-side state (useState), NOT route-based. All content renders in the same page component.
- Tab content:
  - **Overview:** Project info card (name, type, status, description), team members (if available from project data), phase progress summary (X of Y phases complete, progress bar)
  - **Roadmap:** Render existing `PortalRoadmap` component as-is (pass same props: `project`, `phases`, `userRole`, `currentUserId`, `isLoading`, `isValidating`)
  - **Files:** Render content from current `app/portal/[id]/files/page.tsx` -- import and use `PortalFileList` + `PortalClientUpload` components. Fetch files using the same server action pattern (call `getProjectFiles` via SWR or inline).
  - **Updates:** Render content from current `app/portal/[id]/updates/page.tsx` -- reuse whatever activity rendering exists.

### C. Modify `app/projects/page.tsx`:
- Replace `import { PortalProjectsList }` with `import { PortalProjectsGrid }`
- Pass same data (keep all server-side fetching unchanged)
- Update heading style to match design system

### D. Modify `app/portal/[id]/portal-project-content.tsx`:
- Remove imports of `PortalTabs` and `PortalPageHeader`
- Import `PortalProjectTabs`
- Build a new header inline: back link (`ChevronLeft` to `/projects`), project name, status badge, progress bar
- Render `<PortalProjectTabs>` with all needed data

**Context:** Read `@.planning/DESIGN.md`, `@components/portal/portal-projects-list.tsx`, `@components/portal/portal-tabs.tsx`, `@components/portal/portal-page-header.tsx`, `@app/projects/page.tsx`, `@app/portal/[id]/portal-project-content.tsx`, `@components/portal/portal-roadmap.tsx` (first 50 lines for props), `@components/portal/portal-file-list.tsx` (first 30 lines for props), `@app/portal/[id]/files/page.tsx`, `@app/portal/[id]/updates/page.tsx`
**Done when:**
- `/projects` shows card grid with search bar
- Each card shows project type icon, name, status badge, progress bar, phase info
- Empty state renders when no projects
- Click a project card navigates to `/portal/{id}`
- Project detail shows underline tabs: Overview, Roadmap, Files, Updates
- Overview tab shows project info and phase progress
- Roadmap tab renders existing `PortalRoadmap` correctly
- Files tab shows file list (reusing existing components)
- Updates tab shows activity feed
- Mobile: project grid goes single-column, tabs remain horizontal with scroll
- Dark mode renders correctly
- `npx tsc --noEmit` passes


## Task 5 -- Billing, Requests, Settings Modernization

**Wave:** 3 (after Tasks 2, 3, 4)
**Files:**
- MODIFY `app/billing/page.tsx` -- update heading styles and layout to match new design
- MODIFY `components/portal/portal-billing-summary.tsx` -- modernize card styles (rounded-xl, new typography, stat layout)
- MODIFY `components/portal/portal-invoice-list.tsx` -- modernize table/list styles, status badges
- MODIFY `app/requests/page.tsx` -- update heading styles
- MODIFY `components/portal/portal-request-list.tsx` -- modernize list cards, status/priority badges
- MODIFY `components/portal/portal-request-dialog.tsx` -- modernize dialog styling
- MODIFY `app/settings/page.tsx` -- update heading styles (minimal change, settings-content.tsx does the work)
- MODIFY `app/settings/settings-content.tsx` -- modernize form sections and card layout
- MODIFY `components/portal/portal-skeletons.tsx` -- update skeleton styles to match new rounded-xl cards

**Action:**
Bring billing, requests, and settings pages up to the same visual standard as the new dashboard and project views. NO data fetching or server action changes -- only styling.

1. **Billing page:**
   - Page heading: match dashboard style (`text-[clamp(1.25rem,3vw,1.5rem)] font-bold tracking-tight`)
   - Summary cards: update to `rounded-xl border bg-card p-5` with label/value pattern matching stats row
   - Invoice list: if table, update to `rounded-xl border overflow-hidden` wrapper. Status badges: use consistent coloring (paid = green, pending = amber, overdue = red). Amount: `tabular-nums font-semibold`.

2. **Requests page:**
   - Page heading: match style
   - Request cards: `rounded-xl border bg-card p-5 hover:border-primary/20 transition-colors`
   - Status badges: consistent with project status badges
   - Priority badges: `Urgent` = red, `High` = amber, `Medium` = blue, `Low` = gray
   - Request dialog: update button to `rounded-lg`, form inputs with proper focus rings

3. **Settings page:**
   - Section cards: `rounded-xl border bg-card p-6` with section headings `text-base font-semibold`
   - Form inputs: ensure focus ring uses `ring-primary/30`
   - Save buttons: `bg-primary text-primary-foreground rounded-lg`
   - Toggle switches: keep shadcn defaults

4. **Skeletons:**
   - Update skeleton shapes in `portal-skeletons.tsx` to use `rounded-xl` and match new card dimensions
   - Skeleton color: `bg-muted/50` (lighter than content)

5. **Consistent patterns across all three pages:**
   - All page headings use same typography
   - All cards use `rounded-xl border bg-card`
   - All status badges use consistent color mapping
   - All pages use `fadeInClasses` for entrance animation
   - All pages have proper empty states

**Context:** Read `@.planning/DESIGN.md`, `@app/billing/page.tsx`, `@components/portal/portal-billing-summary.tsx`, `@components/portal/portal-invoice-list.tsx`, `@app/requests/page.tsx`, `@components/portal/portal-request-list.tsx`, `@components/portal/portal-request-dialog.tsx`, `@app/settings/settings-content.tsx`, `@components/portal/portal-skeletons.tsx`
**Done when:**
- Billing page: summary cards use new card style, invoice list has status badges with correct colors
- Requests page: request cards match new design, dialog is modernized
- Settings page: form sections use card layout with proper inputs
- Skeletons: match new card dimensions and use `rounded-xl`
- All three pages visually consistent with dashboard and project views
- Dark mode renders correctly on all three pages
- Mobile responsive on all three pages
- No TypeScript errors


## Success Criteria

- [ ] Portal loads with new Assembly-style sidebar (7 nav items, company branding, user menu)
- [ ] Dashboard shows greeting with client name, 4 stat cards, action items, projects overview, quick actions
- [ ] Projects list displays as card grid with search, type icons, progress bars
- [ ] Project detail has working tabbed interface (Overview, Roadmap, Files, Updates)
- [ ] Billing page modernized with consistent card styles and status badges
- [ ] Requests page modernized with consistent card styles and badges
- [ ] Settings page modernized with card-based form sections
- [ ] Dark mode works correctly on all portal pages
- [ ] Mobile responsive: sidebar collapses to hamburger, grids stack, tabs scroll
- [ ] No TypeScript errors (`npx tsc --noEmit` passes)
- [ ] Existing server actions and SWR data fetching continue to work unchanged
- [ ] Admin "preview" mode still functions (admin banner, exit preview link)
