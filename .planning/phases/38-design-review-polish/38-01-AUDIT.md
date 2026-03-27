# Phase 38 Plan 01: Design Audit — Impeccable v4.0 Violations

**Audit Date:** 2026-03-27
**Auditor:** Claude Sonnet 4.6 (GSD executor)
**Scope:** 8 pages + shared components + design tokens
**Standard:** Impeccable v4.0 (CLAUDE.md design spec)

---

## Token Baseline (What Exists)

The design system is well-established:

- `globals.css` defines full HSL CSS variables (`--background`, `--foreground`, `--card`, `--muted`, `--primary`, surface layers, elevation, easing)
- `tailwind.config.ts` maps all tokens to semantic Tailwind classes
- Fluid spacing (`clamp()`), exponential easing, and stagger utilities are defined
- Geist Sans + Geist Mono fonts configured

**Critical token issues found in the design system itself:**

### DS-01 — MEDIUM: Dark mode `--foreground` and `--muted-foreground` are untinted

**File:** `app/globals.css`, lines 84 and 94
**Values:**

- `--foreground: 0 0% 93%` — pure white-ish, H=0 (no brand hue)
- `--muted-foreground: 0 0% 56%` — pure mid-gray, H=0 (no brand hue)

**Principle violated:** All neutrals should be tinted toward brand hue (HSL ~185-190).

**Suggested fix:**

```css
--foreground: 185 8% 93%; /* was 0 0% 93% */
--muted-foreground: 185 5% 56%; /* was 0 0% 56% */
```

### DS-02 — LOW: `inner-glow` shadow uses pure white

**File:** `tailwind.config.ts`, line 91
**Value:** `'inner-glow': 'inset 0 1px 0 0 hsl(0 0% 100% / 0.04)'`
**Suggested fix:** `'inset 0 1px 0 0 hsl(185 60% 90% / 0.06)'`

### DS-03 — LOW: `glass-gradient` background uses pure rgba(255,255,255)

**File:** `tailwind.config.ts`, line 112
**Value:** `'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'`
**Suggested fix:** Use `hsl(185 60% 95% / 0.03)` tinted toward brand.

---

## Page-by-Page Audit

---

### 1. Dashboard (`app/today-page.tsx` + `components/today-dashboard/`)

**Overall:** Good semantic token usage. Header uses `bg-card/80 backdrop-blur-xl`. Navigation tokens correct.

#### DASH-01 — HIGH: Header uses hardcoded `z-10` instead of design system z-index

**File:** `components/today-dashboard/index.tsx`, line 99
**Class:** `z-10` on sticky header
**Principle violated:** Z-index scale — should use `z-sticky` (value 45)
**Suggested fix:** Replace `z-10` with `z-sticky`

#### DASH-02 — MEDIUM: "Viewing as" banner uses non-system opacity value `bg-amber-500/6`

**File:** `components/today-dashboard/index.tsx`, line 217
**Class:** `bg-amber-500/6` — non-standard Tailwind opacity (not in the 5/10/20/25 scale)
**Principle violated:** Consistency, design token discipline
**Suggested fix:** Replace with `bg-amber-500/8` (matches other amber usage pattern)

#### DASH-03 — MEDIUM: `QuickStatsBar` uses semantic stat colors that bypass qualia brand palette

**File:** `components/today-dashboard/quick-stats-bar.tsx`, lines 17–41
**Values:** `text-amber-500`, `text-violet-500`, `text-sky-500`, `text-emerald-500`
**Context:** These are status-semantic colors, not brand tokens. This is acceptable for status coding (amber = caution, emerald = success), but sky-500 and violet-500 are not defined in the design token set as semantic status colors.
**Severity downgraded to MEDIUM** — acceptable as categorical status coding but violet and sky should align with `--accent` (violet already close) or `--info` (sky).
**Suggested fix:** Map `text-sky-500` → `text-info` where possible, `text-violet-500` → `text-accent`

#### DASH-04 — LOW: MeetingsSidebar uses `shadow-sm` not design system shadow

**File:** `components/today-dashboard/meetings-sidebar.tsx`, line 66
**Class:** `shadow-sm` — not from the elevation system
**Suggested fix:** Replace with `shadow-elevation-1` or CSS var `[box-shadow:var(--elevation-resting)]`

---

### 2. Projects List (`app/projects/page.tsx` + `projects-client.tsx`)

**Overall:** Strong semantic token usage. Pipeline columns use semantic colored accents appropriately for categorical data (violet/emerald/amber/sky for demo/building/pre-prod/live).

#### PROJ-01 — MEDIUM: `StageColumn` uses `shadow-elevation-1` (correct) but `bg-muted/20` on header without `surface-2` context

**File:** `app/projects/projects-client.tsx`, line 91
**Class:** `bg-muted/20` on column header
**Principle violated:** Surface layer hierarchy — should use `bg-[hsl(var(--surface-2)/0.4)]` for secondary surface context
**Suggested fix:** Replace `bg-muted/20` with `bg-[hsl(var(--surface-2)/0.5)]`

#### PROJ-02 — LOW: `ProjectDetailSkeleton` uses `bg-card/80` on skeleton header without sticky class

**File:** `app/projects/[id]/page.tsx`, line 12
**Class:** No `sticky top-0` or `z-sticky` on the skeleton header
**Principle violated:** Header consistency — skeleton should match the real header layout
**Suggested fix:** Add `sticky top-0 z-sticky` to the skeleton header to prevent layout shift

---

### 3. Project Detail (`app/projects/[id]/page.tsx` + `project-detail-view.tsx`)

**Overall:** Good. Server component delegates to `ProjectDetailView`. Skeleton header uses correct `bg-card/80 backdrop-blur-xl`.

No critical violations found in the page shell. The detail view itself delegates to `ProjectDetailView` which is largely well-structured.

---

### 4. Schedule (`app/schedule/page.tsx`)

**Overall:** Clean. Uses `PageHeader` component correctly.

#### SCHED-01 — MEDIUM: Schedule icon uses `text-violet-500` instead of semantic accent token

**File:** `app/schedule/page.tsx`, line 95
**Class:** `text-violet-500` with `iconBg="bg-violet-500/10"`
**Principle violated:** Icon colors should come from design token palette. `violet-500` is close to `--accent` but not the same.
**Suggested fix:** Replace with `text-accent` and `bg-accent/10` to use the actual design token

#### SCHED-02 — LOW: `ScheduleSkeleton` uses `bg-secondary/50` for calendar day headers

**File:** `app/schedule/page.tsx`, line 68
**Class:** `bg-secondary/50` — this is semantically correct but `secondary` is a muted teal tone, not a table-header surface.
**Suggested fix:** Replace with `bg-[hsl(var(--surface-2)/0.5)]` for consistency with `.table-header` utility pattern.

---

### 5. Settings (`app/settings/page.tsx` + `app/settings/settings-layout.tsx`)

#### SETT-01 — HIGH: Avatar uses `text-white` on primary background

**File:** `app/settings/page.tsx`, line 31
**Class:** `text-white` inside `bg-primary`
**Principle violated:** No pure white — should use `text-primary-foreground` (which maps to `hsl(var(--primary-foreground))`)
**Suggested fix:**

```tsx
// Before
<div className="... bg-primary text-xl font-medium text-white">
// After
<div className="... bg-primary text-xl font-medium text-primary-foreground">
```

#### SETT-02 — HIGH: VAPI remnant in user-visible UI text

**File:** `app/settings/page.tsx`, line 73
**Text:** `"Connect GitHub, Vercel, and VAPI"`
**Context:** This text appears in an integrations link card visible to all admin users. VAPI was removed (Decision #1 in STATE.md: "VAPI removed entirely").
**Principle violated:** No stale product references in UI
**Suggested fix:** Replace with `"Connect GitHub, Vercel, and Zoho"` (reflecting actual current integrations)

#### SETT-03 — HIGH: VAPI remnant in Integrations page help text

**File:** `app/settings/integrations/page.tsx`, line 110
**Text:** `"VAPI: Creates a voice assistant for Voice Agent projects"`
**Context:** This appears in the "How it works" help section visible to admins.
**Suggested fix:** Remove or replace with Zoho description: `"Zoho: Creates invoices and manages client contacts"`

#### SETT-04 — MEDIUM: Settings icon uses `bg-muted` not a branded surface

**File:** `app/settings/settings-layout.tsx`, line 34
**Class:** `bg-muted` for the Settings gear icon container
**Principle violated:** Icon containers should use `bg-primary/10` for consistency with other page headers
**Suggested fix:** Replace `bg-muted` with `bg-primary/10` and `text-muted-foreground` with `text-primary`

#### SETT-05 — MEDIUM: `SettingsLayout` content card uses bare `border` without `/40` opacity

**File:** `app/settings/settings-layout.tsx`, line 93
**Class:** `rounded-lg border bg-card p-6` — border is full opacity
**Principle violated:** Borders should use `border-border/40` for the refined barely-there aesthetic
**Suggested fix:** `rounded-lg border border-border/40 bg-card p-6`

---

### 6. Settings Integrations (`app/settings/integrations/page.tsx` + `integrations-client.tsx`)

#### INTEG-01 — HIGH: Vercel icon uses `bg-black` (pure black)

**File:** `app/settings/integrations/integrations-client.tsx`, line 168
**Value:** `iconColor="bg-black"`
**Principle violated:** No pure black — this is a critical Impeccable violation. Black icon backgrounds will look out of place in light mode and extremely harsh in both modes.
**Suggested fix:** Replace with `bg-foreground` (tinted near-black) or `bg-[hsl(var(--foreground)/0.9)]`

#### INTEG-02 — HIGH: GitHub icon uses `bg-gray-700` (untinted gray)

**File:** `app/settings/integrations/integrations-client.tsx`, line 153
**Value:** `iconColor="bg-gray-700"`
**Principle violated:** No untinted gray classes — should use tinted neutrals
**Suggested fix:** Replace with `bg-secondary` or `bg-muted` (tinted alternatives from design system)

---

### 7. Clients (`app/clients/page.tsx`)

**Overall:** Page shell is clean, uses `PageHeader` correctly.

#### CLI-01 — MEDIUM: Clients icon uses `text-emerald-500` (same as Payments icon)

**File:** `app/clients/page.tsx`, line 96
**Class:** `text-emerald-500` with `iconBg="bg-emerald-500/10"`
**Context:** Both Clients and Payments pages use emerald-500. This creates visual identity collision.
**Principle violated:** Unique visual identity per page section
**Suggested fix:** Change Clients to `text-[hsl(var(--info))]` and `bg-[hsl(var(--info)/0.1)]` (uses the `--info` token which is a teal-blue)

#### CLI-02 — LOW: `ClientTableSkeleton` uses `bg-secondary/50` for table header

**File:** `app/clients/page.tsx`, line 58
**Class:** `bg-secondary/50` — same pattern as Schedule, should use `surface-2`

---

### 8. Team (`app/team/page.tsx`)

Team page is a redirect to `/`. No UI to audit.

---

### 9. Payments (`app/payments/page.tsx` + `payments-client.tsx`)

**Overall:** Page shell clean. Client has numerous `text-white` instances.

#### PAY-01 — HIGH: Multiple `text-white` used on colored button backgrounds

**File:** `app/payments/payments-client.tsx`, lines 134, 147, 260, 375, 384, 397, 406, 532, 698, 765, 987, 1000, 1081
**Pattern:**

- `bg-primary text-white` (×3) — should be `bg-primary text-primary-foreground`
- `bg-emerald-500 text-white` (×3) — acceptable for status (emerald with white is very readable), but inconsistent
- `bg-white/20 text-white` (×2) — on a colored background; contextually this is overlay text, acceptable
  **Principle violated:** No pure white — should use semantic foreground tokens
  **Suggested fix for primary buttons:**

```tsx
// Before
className = '... bg-primary text-white ...';
// After
className = '... bg-primary text-primary-foreground ...';
```

#### PAY-02 — MEDIUM: Payments uses `transition-colors` without `ease-premium`

**File:** `app/payments/payments-client.tsx`, lines 253, 525, 758
**Pattern:** `transition-colors` used alone, no custom easing
**Principle violated:** All transitions should use `--ease-premium` easing
**Suggested fix:** Use `transition-premium` utility class from globals.css or add `ease-premium` to transition

#### PAY-03 — LOW: PaymentsClient has custom rounded button classes duplicating the `.btn-primary` utility

**File:** `app/payments/payments-client.tsx`, multiple lines
**Pattern:** `"rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"` — this is manually written `.btn-primary` code
**Principle violated:** Use design system utilities to avoid drift
**Suggested fix:** Replace with `className="btn-primary"` or use `<Button variant="default">`

---

## Cross-Cutting Issues

### XC-01 — HIGH: `bg-black` used for modal/overlay backdrops

**Files:**

- `components/ui/dialog.tsx`, line 33: `bg-black/40`
- `components/ui/drawer.tsx`, line 25: `bg-black/40`
- `components/ui/sheet.tsx`, line 23: `bg-black/80`
- `components/command-menu.tsx`, line 186: `bg-black/40`

**Principle violated:** No pure black. Even at low opacity `bg-black/40` produces an untinted overlay. On a warm-tinted UI, a pure black scrim feels tonally wrong.
**Suggested fix:** Replace `bg-black/40` with `bg-foreground/40` (tinted near-black) and `bg-black/80` with `bg-foreground/80`

### XC-02 — HIGH: `text-white` used extensively on colored icon/button contexts

**Scope:** ~30+ instances across `components/`
**Pattern:** `text-white` used as foreground on `bg-primary`, `bg-emerald-500`, `bg-violet-500`, etc.
**Principle violated:** No pure white — tokens like `text-primary-foreground` should be used on primary backgrounds
**Priority files to fix:**

- `components/clock-out-modal.tsx`: `bg-primary text-white`
- `components/today-dashboard/clock-in-modal.tsx`: `bg-primary text-white`
- `components/notification-panel.tsx`: `bg-red-500 text-white` notification badge
- `components/filter-dropdown.tsx`: `bg-primary px-1.5 text-white` count badge
- `components/new-team-modal.tsx`: `bg-primary text-xs text-white`

### XC-03 — MEDIUM: `z-10` used as ad-hoc z-index bypassing z-index scale

**Files:**

- `components/today-dashboard/index.tsx`, line 99: `z-10` on sticky header (should be `z-sticky`)
- `components/today-dashboard/building-project-sheet.tsx`, line 215: `z-10`
- `components/today-dashboard/timeline-sidebar.tsx`, line 85: `z-10`
- `components/today-dashboard/daily-schedule-grid.tsx`, lines 132, 249: `z-10`

**Principle violated:** Use design system z-index scale (`z-sticky`, `z-dropdown`, etc.), not raw Tailwind numeric values
**Suggested fix:** Audit each usage and map to closest semantic z-index tier

### XC-04 — MEDIUM: Categorical icon colors use raw Tailwind color classes instead of design tokens

**Scope:** Multiple files (`projects-client.tsx`, `quick-stats-bar.tsx`, `schedule/page.tsx`, `payments/page.tsx`, `clients/page.tsx`)
**Pattern:** `text-violet-500`, `text-emerald-500`, `text-sky-500`, `text-amber-500` for page/section icons
**Principle violated:** Colors should trace to CSS custom properties for dark/light mode correctness. These raw values don't adapt gracefully.
**Note:** These are acceptable for data-semantic colors (status badges) but page-level icons should use design tokens.
**Suggested fix:** Map page icons to design tokens:

- Schedule: `text-accent` (violet is close to `--accent: 290 40% 52%`)
- Clients: `text-info` (sky maps to `--info: 200 70% 44%`)
- Payments: `text-success` (emerald maps to `--success: 155 55% 38%`)

### XC-05 — LOW: `project-files/file-list.tsx` uses extensive `text-neutral-*` classes

**File:** `components/project-files/file-list.tsx`, lines 58, 76, 145–230
**Classes:** `text-neutral-400`, `text-neutral-500`, `text-neutral-600`, `text-neutral-900`
**Principle violated:** Untinted gray classes — should use `text-muted-foreground`, `text-foreground`, etc.
**Suggested fix:** Map all neutral classes to semantic tokens

### XC-06 — LOW: `projects/[id]/files/page.tsx` uses `text-neutral-*` throughout

**File:** `app/projects/[id]/files/page.tsx`, lines 80, 93–94, 110
**Classes:** `border-neutral-200`, `text-neutral-600`, `text-neutral-900`
**Suggested fix:** Replace with `border-border`, `text-muted-foreground`, `text-foreground`

---

## Summary Matrix

| ID       | Severity | Page/File                   | Issue                                             | Lines     |
| -------- | -------- | --------------------------- | ------------------------------------------------- | --------- |
| DS-01    | MEDIUM   | globals.css                 | Dark mode foreground tokens untinted              | 84, 94    |
| DS-02    | LOW      | tailwind.config.ts          | `inner-glow` uses pure white                      | 91        |
| DS-03    | LOW      | tailwind.config.ts          | `glass-gradient` uses pure rgba white             | 112       |
| DASH-01  | HIGH     | dashboard/index.tsx         | `z-10` instead of `z-sticky` on header            | 99        |
| DASH-02  | MEDIUM   | dashboard/index.tsx         | Non-standard opacity `bg-amber-500/6`             | 217       |
| DASH-03  | MEDIUM   | quick-stats-bar.tsx         | Raw color classes for stat icons                  | 17–41     |
| DASH-04  | LOW      | meetings-sidebar.tsx        | `shadow-sm` not from elevation system             | 66        |
| PROJ-01  | MEDIUM   | projects-client.tsx         | Column header `bg-muted/20` vs surface-2          | 91        |
| PROJ-02  | LOW      | projects/[id]/page.tsx      | Skeleton header missing sticky + z-index          | 12        |
| SCHED-01 | MEDIUM   | schedule/page.tsx           | `text-violet-500` vs `text-accent` token          | 95        |
| SCHED-02 | LOW      | schedule/page.tsx           | `bg-secondary/50` vs surface-2 in skeleton        | 68        |
| SETT-01  | HIGH     | settings/page.tsx           | `text-white` on primary avatar                    | 31        |
| SETT-02  | HIGH     | settings/page.tsx           | VAPI text in integrations link                    | 73        |
| SETT-03  | HIGH     | integrations/page.tsx       | VAPI text in help section                         | 110       |
| SETT-04  | MEDIUM   | settings-layout.tsx         | Settings icon uses `bg-muted` not `bg-primary/10` | 34        |
| SETT-05  | MEDIUM   | settings-layout.tsx         | Content card border full opacity                  | 93        |
| INTEG-01 | HIGH     | integrations-client.tsx     | `bg-black` for Vercel icon                        | 168       |
| INTEG-02 | HIGH     | integrations-client.tsx     | `bg-gray-700` for GitHub icon                     | 153       |
| CLI-01   | MEDIUM   | clients/page.tsx            | Emerald icon collision with Payments              | 96        |
| CLI-02   | LOW      | clients/page.tsx            | Skeleton header `bg-secondary/50`                 | 58        |
| PAY-01   | HIGH     | payments-client.tsx         | `text-white` on primary buttons                   | Multiple  |
| PAY-02   | MEDIUM   | payments-client.tsx         | `transition-colors` without `ease-premium`        | Multiple  |
| PAY-03   | LOW      | payments-client.tsx         | Duplicates `.btn-primary` utility inline          | Multiple  |
| XC-01    | HIGH     | dialog/drawer/sheet/command | `bg-black` overlays                               | Multiple  |
| XC-02    | HIGH     | Multiple components         | `text-white` on colored backgrounds               | ~30 sites |
| XC-03    | MEDIUM   | today-dashboard/            | `z-10` bypassing z-index scale                    | Multiple  |
| XC-04    | MEDIUM   | Multiple pages              | Raw color classes for page icons                  | Multiple  |
| XC-05    | LOW      | file-list.tsx               | `text-neutral-*` throughout                       | Multiple  |
| XC-06    | LOW      | files/page.tsx              | `text-neutral-*` and `border-neutral-*`           | Multiple  |

---

## Priority Fix Order for Plan 38-02

### Batch 1 — CRITICAL/HIGH (do first)

1. **SETT-02 + SETT-03**: Remove VAPI text references (2 quick string replacements)
2. **INTEG-01 + INTEG-02**: Fix `bg-black` and `bg-gray-700` icon colors
3. **SETT-01 + PAY-01 + XC-02**: Bulk replace `text-white` → `text-primary-foreground` on primary/brand buttons
4. **XC-01**: Replace `bg-black/*` overlays with `bg-foreground/*`
5. **DASH-01 + XC-03**: Fix `z-10` to use `z-sticky`/`z-dropdown`

### Batch 2 — MEDIUM polish

6. **DS-01**: Fix dark mode untinted foreground tokens in globals.css
7. **SETT-04 + SETT-05**: Settings layout icon + border polish
8. **SCHED-01 + XC-04**: Map icon colors to design tokens
9. **DASH-02 + PAY-02**: Fix non-standard opacity + easing

### Batch 3 — LOW/housekeeping

10. **XC-05 + XC-06**: Replace neutral classes in file-related pages
11. **DS-02 + DS-03**: Fix inner-glow and glass-gradient pure white
12. **Remaining LOWs**: DASH-04, PROJ-02, SCHED-02, CLI-02, PAY-03

---

## Notes

- **Semantic color use for data badges is acceptable.** `bg-amber-500/10 text-amber-500` for "Delayed" status badges is correct — these are data-semantic colors, not UI chrome colors.
- **Auth pages excluded.** Login/signup pages use `text-white` on full-bleed brand imagery — this is intentional and correct.
- **Email templates excluded.** `lib/email.ts` uses pure white/black for email HTML compatibility — correct as email clients don't support CSS variables.
- **`video-player` page excluded.** `bg-black` for a video player background is semantically correct and expected.
- **Portal pages partially excluded.** `/portal/*` and `/app/portal/*` routes are client-facing (not internal ERP). Portal design may intentionally diverge from internal aesthetic.
