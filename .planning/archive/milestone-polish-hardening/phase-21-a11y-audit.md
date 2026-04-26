# Phase 21 -- Accessibility Audit

**Date:** 2026-04-21
**Scope:** Phase 14-20 components (QualiaControl, QualiaPortalHub, RoadmapSideRail, QualiaSidebar, QualiaToday, QualiaSchedule)

## Components Audited

- `components/portal/qualia-control.tsx`
- `components/portal/roadmap-side-rail.tsx`
- `components/portal/qualia-portal-hub.tsx`
- `components/portal/qualia-sidebar.tsx`
- `components/portal/qualia-today.tsx`
- `components/portal/qualia-schedule.tsx`

## Issues Found and Fixed

| Component | Issue | Fix |
|---|---|---|
| qualia-control | Already converted to WAI-ARIA tabs pattern in a prior commit | No changes needed -- role="tablist"/role="tab"/role="tabpanel" + aria-selected + aria-controls + roving tabindex + Left/Right/Home/End arrow handler already present |
| roadmap-side-rail | Outer aside element missing aria-label | Added `aria-label="Project details"` to `<aside>` |
| roadmap-side-rail | Resources, Files, Notes wrapper divs had no ARIA labels | Converted to `<section>` with aria-label="Project resources", "Project files", "Project notes" respectively |
| roadmap-side-rail | PersonnelSection and TeamSection already had aria-label + role="group" | No changes needed |
| qualia-schedule | "Event" button text hidden on mobile (`hidden sm:inline`) making it icon-only | Added `aria-label="New event"` and `aria-hidden` on Plus icon |
| qualia-schedule | Previous/Next week buttons already had aria-label | No changes needed |
| qualia-schedule | EventBlock buttons already had descriptive aria-label (title + time) | No changes needed |
| qualia-portal-hub | No unlabelled icon-only buttons found | No changes needed |
| qualia-portal-hub | Heading hierarchy correct (one h1, sequential h2s) | No changes needed |
| qualia-sidebar | All icon-only buttons have aria-labels (hamburger, account menu, tweaks/settings gear) | No changes needed |
| qualia-today | Heading hierarchy correct (one h1, two h2s) | No changes needed |
| qualia-today | No icon-only buttons without labels | No changes needed |

## Keyboard Navigation Coverage

- **QualiaControl tabs:** Tab (enter tablist), Left/Right (move between tabs with wrap), Home/End (first/last tab), Enter/Space (activate tab) -- full WAI-ARIA Tabs pattern
- **QualiaSidebar:** Tab navigation through nav items, focus-visible rings on all interactive elements
- **RoadmapSideRail:** Tab navigation through interactive elements (links, buttons within ProjectResources/ProjectFilesPanel/ProjectNotes)
- **QualiaSchedule:** Tab navigation through week nav buttons, event blocks (PopoverTrigger buttons), new event button. Focus-visible rings present.
- **QualiaPortalHub:** Tab navigation through engagement links, invoice/thread links. Focus-visible rings present.
- **QualiaToday:** Tab navigation through "All tasks" link, "triage" link, project cards. Focus-visible rings present.
- **Skip link:** Present in `app/(portal)/layout.tsx` with `href="#main-content"` targeting `<main id="main-content">`. Works correctly.

## Remaining Non-Critical Items

- Focus-visible ring styles vary slightly across components (some use `ring-primary/30`, others `ring-primary/40`, others `ring-[var(--accent-teal)]/40`) -- cosmetic inconsistency only, all provide visible focus indication.
- QualiaToday grid layout (`gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)'`) does not stack on very narrow viewports -- responsive breakpoint for single-column fallback could be added in a future pass.
- ProjectsTape cards in QualiaToday use `<Link>` which are keyboard accessible, but the progress bar inside has no text alternative -- the percentage is shown visually as text nearby, so this is informational only.
