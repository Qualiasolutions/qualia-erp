---
phase: 38-design-review-polish
verified: 2026-03-27T23:55:00Z
status: gaps_found
score: 5/6 must-haves verified
re_verification: false
gaps:
  - truth: 'No CRITICAL or HIGH design issues remain on any audited page'
    status: partial
    reason: "XC-02 (HIGH severity) was identified in the audit as ~30 sites of 'bg-primary text-white' across shared components. Only payments-client.tsx bg-primary instances were fixed. Components used on the dashboard and other audited pages still have the violation."
    artifacts:
      - path: 'components/clock-out-modal.tsx'
        issue: 'bg-primary text-white on line 169 — should be text-primary-foreground'
      - path: 'components/today-dashboard/clock-in-modal.tsx'
        issue: 'bg-primary text-white on line 163 — should be text-primary-foreground'
      - path: 'components/dashboard-meetings.tsx'
        issue: 'bg-primary text-white on lines 217, 305 — should be text-primary-foreground'
      - path: 'components/filter-dropdown.tsx'
        issue: 'bg-primary text-white on line 66 — should be text-primary-foreground'
      - path: 'components/new-team-modal.tsx'
        issue: 'bg-primary text-white on line 143 — should be text-primary-foreground'
      - path: 'components/edit-task-modal.tsx'
        issue: 'bg-primary text-white on line 253 — should be text-primary-foreground'
    missing:
      - "Replace 'text-white' with 'text-primary-foreground' on all 'bg-primary' elements in components/ (non-portal, non-email)"
      - 'Specifically fix: clock-out-modal.tsx, clock-in-modal.tsx, dashboard-meetings.tsx, filter-dropdown.tsx, new-team-modal.tsx, edit-task-modal.tsx'
human_verification:
  - test: 'Visual cohesion check across dashboard'
    expected: 'All interactive surfaces (clock-in/out buttons, filter count badges, meeting join buttons) should have consistent teal-tinted foreground on primary backgrounds, not pure white'
    why_human: 'text-primary-foreground renders as hsl(var(--primary-foreground)) which visually may differ from text-white — needs eye check to confirm perceptibility of the change'
  - test: 'Dark mode toggle on dashboard'
    expected: 'Sticky header, overlays, and primary buttons all look warm/tinted in dark mode, not pure black/white'
    why_human: 'CSS variable tinting (H=185) is subtle (5-8% saturation) — needs visual confirmation it reads correctly'
---

# Phase 38: Design Review and Polish — Verification Report

**Phase Goal:** Every page matches the Impeccable v4.0 design spec — tinted neutrals, fluid type, layered surfaces, consistent spacing.
**Verified:** 2026-03-27T23:55:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                        | Status       | Evidence                                                                                                                      |
| --- | ------------------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Every key page has been audited against Impeccable v4.0 spec | VERIFIED     | `38-01-AUDIT.md` exists with 29 findings across 8 pages, all pages covered                                                    |
| 2   | VAPI references removed from settings pages                  | VERIFIED     | `settings/page.tsx:73` reads "Connect GitHub, Vercel, and Zoho"; integrations pages have no VAPI strings                      |
| 3   | Dark mode tokens tinted with brand hue (H~185)               | VERIFIED     | `globals.css` dark mode: `--foreground: 185 8% 93%`, `--muted-foreground: 185 5% 56%` — both tinted                           |
| 4   | Overlay backdrops use tinted colors (not bg-black)           | VERIFIED     | dialog.tsx, drawer.tsx, sheet.tsx, alert-dialog.tsx, command-menu.tsx all use `bg-foreground/40` or `bg-foreground/80`        |
| 5   | Dashboard z-index uses z-sticky                              | VERIFIED     | `components/today-dashboard/index.tsx:99` — `sticky top-0 z-sticky` confirmed                                                 |
| 6   | No CRITICAL or HIGH design issues remain                     | PARTIAL FAIL | 8 of 9 HIGH issues fixed; XC-02 partially fixed — bg-primary text-white remains in 6+ shared components used on audited pages |

**Score: 5/6 truths verified**

### Required Artifacts

| Artifact                                                  | Expected                                       | Status             | Details                                                                                                      |
| --------------------------------------------------------- | ---------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `.planning/phases/38-design-review-polish/38-01-AUDIT.md` | Structured audit with CRITICAL/HIGH/MEDIUM/LOW | VERIFIED           | 29 violations documented, severity-tagged, with file paths and line numbers                                  |
| `app/settings/page.tsx`                                   | VAPI mention removed                           | VERIFIED           | Line 73: "Connect GitHub, Vercel, and Zoho"                                                                  |
| `app/settings/integrations/integrations-client.tsx`       | VAPI removed, tinted icon colors               | VERIFIED           | Zoho replaces VAPI; bg-foreground for Vercel, bg-secondary for GitHub                                        |
| `app/globals.css`                                         | Dark mode tokens tinted H~185                  | VERIFIED           | All dark mode foreground vars use H=185                                                                      |
| `components/ui/dialog.tsx`                                | bg-foreground overlay, not bg-black            | VERIFIED           | `bg-foreground/40 backdrop-blur-[12px]`                                                                      |
| `components/ui/drawer.tsx`                                | bg-foreground overlay                          | VERIFIED           | `bg-foreground/40`                                                                                           |
| `components/ui/sheet.tsx`                                 | bg-foreground overlay                          | VERIFIED           | `bg-foreground/80`                                                                                           |
| `components/ui/alert-dialog.tsx`                          | bg-foreground overlay                          | VERIFIED           | `bg-foreground/50`                                                                                           |
| `components/command-menu.tsx`                             | bg-foreground overlay                          | VERIFIED           | `bg-foreground/40`                                                                                           |
| `components/today-dashboard/index.tsx`                    | z-sticky on header                             | VERIFIED           | `sticky top-0 z-sticky` on line 99                                                                           |
| `app/payments/payments-client.tsx`                        | text-primary-foreground on bg-primary          | VERIFIED (partial) | bg-primary buttons fixed; emerald/red with text-white remain (acceptable per audit — status-semantic colors) |

### Key Link Verification

| From                             | To                          | Via                             | Status | Details                                                                     |
| -------------------------------- | --------------------------- | ------------------------------- | ------ | --------------------------------------------------------------------------- |
| `app/globals.css` dark mode vars | page components             | CSS custom properties H=185     | WIRED  | Verified tinted values in globals.css; consumed by tailwind semantic tokens |
| `tailwind.config.ts` z-sticky    | `today-dashboard/index.tsx` | class `z-sticky`                | WIRED  | Confirmed on header element                                                 |
| `bg-foreground` token            | overlay components          | `bg-foreground/40,/80` Tailwind | WIRED  | All 5 overlay components verified                                           |

### Requirements Coverage

| Requirement                                                                      | Status    | Blocking Issue                                                                           |
| -------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| DES-01: Dashboard polished — spacing, hierarchy, visual density consistent       | SATISFIED | DASH-01 (z-10→z-sticky) fixed; MEDIUM issues (DASH-02/03/04) remain but are not blockers |
| DES-02: Dashboard clear visual hierarchy, consistent spacing, no orphan elements | SATISFIED | Header fixed, surface tokens in use                                                      |
| DES-03: Projects list/detail use tinted neutrals and consistent surface layers   | SATISFIED | No CRITICAL/HIGH found in projects; MEDIUM PROJ-01 (bg-muted/20) remains                 |
| DES-04: Settings pages clean — no VAPI remnants, tight layout                    | SATISFIED | All VAPI strings removed and replaced with Zoho                                          |
| DES-05: Schedule page matches dashboard design language                          | SATISFIED | SCHED-01 (violet-500) is MEDIUM only — no HIGH violations                                |
| DES-XX: No CRITICAL or HIGH issues remain                                        | PARTIAL   | XC-02 HIGH partially addressed — bg-primary text-white in shared components unfixed      |

### Anti-Patterns Found

| File                                            | Line     | Pattern                 | Severity     | Impact                                                                |
| ----------------------------------------------- | -------- | ----------------------- | ------------ | --------------------------------------------------------------------- |
| `components/clock-out-modal.tsx`                | 169      | `bg-primary text-white` | HIGH (XC-02) | Pure white on primary bypasses theme system; breaks dark mode tinting |
| `components/today-dashboard/clock-in-modal.tsx` | 163      | `bg-primary text-white` | HIGH (XC-02) | Same                                                                  |
| `components/dashboard-meetings.tsx`             | 217, 305 | `bg-primary text-white` | HIGH (XC-02) | Same                                                                  |
| `components/filter-dropdown.tsx`                | 66       | `bg-primary text-white` | HIGH (XC-02) | Count badge visible on dashboard                                      |
| `components/new-team-modal.tsx`                 | 143      | `bg-primary text-white` | HIGH (XC-02) | Avatar badge                                                          |
| `components/edit-task-modal.tsx`                | 253      | `bg-primary text-white` | HIGH (XC-02) | Avatar fallback                                                       |

Note: `bg-emerald-500/red-500 text-white` in payments is acceptable — the audit explicitly noted emerald/red with text-white is readable and serves as status-semantic color. Portal components (`/components/portal/`) are excluded as portal has a separate design intent per AUDIT.md.

### Human Verification Required

#### 1. Primary button foreground contrast

**Test:** Visit dashboard, open clock-in modal, click a filter, open a meeting card
**Expected:** All primary-colored interactive elements show consistent foreground (after XC-02 fix would be `text-primary-foreground`)
**Why human:** The visual difference between text-white and text-primary-foreground is subtle at the current hsl(var(--primary-foreground)) value — needs eye check

#### 2. Dark mode tinting perceptibility

**Test:** Toggle dark mode on dashboard and settings pages
**Expected:** Surfaces and text should feel warm/teal-tinted, not pure black/grey
**Why human:** The H=185 tint at 5-8% saturation is very subtle — needs confirmation it reads as intended

### Gaps Summary

One gap blocking the goal's full achievement:

**XC-02 partial fix.** The audit identified HIGH severity `bg-primary text-white` across ~30 sites. The 38-02 executor fixed it only in `payments-client.tsx` (the explicit task file). Six shared components used on the dashboard and other audited pages still carry the violation: `clock-out-modal.tsx`, `clock-in-modal.tsx` (dashboard), `dashboard-meetings.tsx` (dashboard), `filter-dropdown.tsx` (dashboard toolbar), `new-team-modal.tsx`, and `edit-task-modal.tsx`. This is a HIGH violation per the audit spec (pure white bypasses the theme's tinting system and breaks dark mode fidelity).

The fix is mechanical: replace `text-white` with `text-primary-foreground` on every `bg-primary` element in the six files above. No functionality changes. Estimated effort: 5 minutes.

---

_Verified: 2026-03-27T23:55:00Z_
_Verifier: Claude (qualia-verifier)_
