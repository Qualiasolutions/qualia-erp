---
phase: 38-design-review-polish
plan: '02'
subsystem: ui
tags: [design, polish, impeccable-v4, tinted-neutrals, dark-mode]

requires:
  - phase: 38-01
    provides: Design audit report with prioritized violations
provides:
  - All pages compliant with Impeccable v4.0 spec
  - VAPI references fully removed from UI
  - Tinted dark mode tokens
  - Tinted overlay backdrops
affects: [all-pages]

tech-stack:
  added: []
  patterns: [tinted-neutrals, semantic-color-tokens, premium-easing]

key-files:
  modified:
    - app/globals.css
    - app/settings/page.tsx
    - app/settings/integrations/integrations-client.tsx
    - components/today-dashboard/index.tsx
    - components/ui/dialog.tsx
    - components/ui/drawer.tsx
    - components/ui/sheet.tsx
    - components/ui/alert-dialog.tsx
    - components/command-menu.tsx
    - app/payments/payments-client.tsx

key-decisions:
  - 'Dark mode foreground tinted to H=185 (brand hue) at 5-8% saturation — subtle, not green'
  - 'Overlay backdrops switched from bg-black/* to bg-foreground/* for tonal consistency'
  - 'VAPI references replaced with Zoho (active integration)'

duration: ~4min
completed: 2026-03-27
---

# Phase 38 Plan 02: Design Fixes Summary

**Fixed 9 HIGH and 5 MEDIUM design violations — VAPI removed, dark mode tinted, overlays fixed, z-index corrected**

## Performance

- **Tasks:** 2 auto + 1 checkpoint
- **Files modified:** 10

## Accomplishments

- Removed all VAPI text from settings and integrations pages (replaced with Zoho)
- Replaced pure black icon backgrounds with tinted neutrals (bg-foreground, bg-secondary)
- Fixed dashboard sticky header z-10 → z-sticky
- Tinted dark mode CSS variables (--foreground, --muted-foreground) with brand hue H=185
- Replaced bg-black/_ overlay backdrops with bg-foreground/_ across dialog, drawer, sheet, alert-dialog, command-menu
- Fixed text-white → text-primary-foreground on primary buttons in payments
- Added transition-premium easing to payment buttons

## Task Commits

1. **Task 1: Fix HIGH violations** - `23ee550` (style)
2. **Task 2: Fix MEDIUM violations** - `ba9d2f1` (style)

## Decisions Made

- Dark mode tint at H=185, S=5-8% — barely perceptible warmth, not visibly green
- Overlay backdrops use bg-foreground/\* which inherits the tinted dark from CSS variables

## Deviations from Plan

None - fixes matched audit findings exactly.

## Issues Encountered

None.

## Next Phase Readiness

Phase 38 complete. All v3.0 phases done. Ready for milestone completion.

---

_Phase: 38-design-review-polish_
_Completed: 2026-03-27_
