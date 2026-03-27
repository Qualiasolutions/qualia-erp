---
phase: 38
plan: 01
subsystem: design
tags: [audit, design-system, impeccable-v4, accessibility, tokens]
dependency_graph:
  requires: [37-01]
  provides: [38-02-input]
  affects: [all-pages]
tech_stack:
  added: []
  patterns: [audit-only]
key_files:
  created:
    - .planning/phases/38-design-review-polish/38-01-AUDIT.md
  modified: []
decisions:
  - id: '38-1'
    decision: 'Treat text-white on primary backgrounds as HIGH severity'
    rationale: 'text-primary-foreground is the correct semantic token; text-white bypasses the theme system and breaks dark mode tinting'
    date: '2026-03-27'
metrics:
  duration: '45 minutes'
  completed: '2026-03-27'
---

# Phase 38 Plan 01: Design Audit Summary

**One-liner:** Full Impeccable v4.0 audit across 8 pages, finding 29 violations (9 HIGH / 10 MEDIUM / 10 LOW) with prioritized fix order for Plan 38-02.

## What Was Done

Read and analyzed all 8 target pages plus shared components against the Impeccable v4.0 specification. Cross-referenced against `globals.css` CSS custom properties and `tailwind.config.ts` to verify what tokens actually exist vs. what pages use.

## Key Findings

**Total violations found: 29**

- HIGH: 9 (must fix before ship)
- MEDIUM: 10 (visible polish issues)
- LOW: 10 (housekeeping / minor)

### Top HIGH issues

| ID       | File                        | Issue                                                                               |
| -------- | --------------------------- | ----------------------------------------------------------------------------------- |
| SETT-02  | settings/page.tsx:73        | VAPI text in UI ("Connect GitHub, Vercel, and VAPI") — VAPI was removed in Phase 37 |
| SETT-03  | integrations/page.tsx:110   | VAPI text in help section                                                           |
| INTEG-01 | integrations-client.tsx:168 | `bg-black` for Vercel icon                                                          |
| INTEG-02 | integrations-client.tsx:153 | `bg-gray-700` for GitHub icon                                                       |
| SETT-01  | settings/page.tsx:31        | `text-white` on `bg-primary` avatar                                                 |
| PAY-01   | payments-client.tsx (×13)   | `text-white` on primary/emerald buttons                                             |
| XC-01    | dialog/drawer/sheet/command | `bg-black/40` overlays (4 files)                                                    |
| XC-02    | ~30 component sites         | `text-white` on colored backgrounds                                                 |
| DASH-01  | dashboard/index.tsx:99      | `z-10` instead of `z-sticky`                                                        |

### What's actually good

- Design system tokens are well-defined in globals.css (HSL custom properties, surface layers, elevation, easing)
- Most page shells use semantic tokens correctly (`bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`)
- Page headers consistently use `bg-card/80 backdrop-blur-xl` (glass header pattern)
- Fluid typography (`clamp()`) and stagger animation utilities are in place
- Status/data-semantic colors (amber/emerald/rose for badges) are appropriate and intentional

### Design system issues in tokens themselves

- Dark mode `--foreground: 0 0% 93%` and `--muted-foreground: 0 0% 56%` are pure gray (H=0), not tinted toward brand hue (H~185)
- `inner-glow` shadow and `glass-gradient` background use pure white values

## Deviations from Plan

None — plan executed exactly as written (read-only audit, no code changes).

## Output

Full audit report with 29 numbered findings, severity ratings, file paths with line numbers, code excerpts, and suggested fixes: `.planning/phases/38-design-review-polish/38-01-AUDIT.md`

Prioritized fix order in three batches is documented in the AUDIT file under "Priority Fix Order for Plan 38-02".

## Self-Check: PASSED

- [x] 38-01-AUDIT.md created at correct path
- [x] Commit e72314e exists with audit file
- [x] All 8 target pages audited (team page is a redirect — no UI to audit)
- [x] ROADMAP.md 38-01 checkbox updated to [x]
