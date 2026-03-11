# Plan: 17 — Simplify and enhance Client Portal admin page UI/UX

**Mode:** quick
**Created:** 2026-03-11

## Problem Analysis

The current `portal-admin-panel.tsx` is 1535 lines with 3 stacked cards doing too many things:

1. **Create New Project** — doesn't belong here (projects are created from /projects page)
2. **Setup Client Access** — confusing 2-step wizard with bulk mode toggle
3. **Client Management** — table with nested export credentials, filters, bulk reset

Everything is visible at once, there's no hierarchy, and the user flow is unclear.

## Design: Tab-based layout with clear separation

**New layout:**

- Page header with "Add Client" button (opens dialog/inline section)
- **Tab 1: Clients** (default) — Clean client table with inline actions
- **Tab 2: Onboard** — Simplified single/bulk client onboarding
- Remove "Create New Project" entirely (use /projects for that)
- Simplify password actions to one button with tooltip

**Key UX improvements:**

- Primary view is the client list (what you need 90% of the time)
- Onboarding is a separate tab, not competing for attention
- Export credentials collapsed by default
- Cleaner visual hierarchy

## Task 1: Rewrite portal-admin-panel.tsx with tabbed layout

**What:** Complete rewrite of `components/portal/portal-admin-panel.tsx` with:

- Remove "Create New Project" card entirely
- Add tabs: "Clients" (default) and "Onboard New Client"
- Clients tab: clean table with filters at top, inline actions
- Onboard tab: simplified setup flow (single + bulk modes via toggle)
- Keep all existing server actions (no backend changes)
- Responsive, clean design matching Linear/Plane aesthetic
- Update parent page.tsx to remove project creation props if needed

**Files:**

- `components/portal/portal-admin-panel.tsx` — full rewrite
- `app/portal/page.tsx` — simplify props passed to admin panel

**Done when:** Page loads with clean tabbed interface, all existing functionality preserved
