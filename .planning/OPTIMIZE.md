---
date: 2026-05-16 22:00
mode: scoped (admin refactor branch only)
critical: 0
high: 0
medium: 3
low: 6
status: clean
branch: refactor/admin-relationships-modernize
pr: 136
---

# Optimization Report

**Project:** qualia-erp | **Mode:** scoped pre-ship | **Date:** 2026-05-16

## Summary

Pre-ship optimization gate on the admin refactor branch (PR #136). Two
parallel agents (performance-oracle, kieran-typescript-reviewer) scanned
ONLY the files touched by the refactor — not the whole codebase, which
would have been overkill for a 4-commit branch.

**Result: no ship-blockers.** All findings are MEDIUM or LOW. Three were
applied as auto-fixes; the remainder were deferred to a follow-up cleanup
(rationale per finding below).

## Critical Issues

_None._

## High Priority

_None._

## Medium Priority

| # | Dimension | Finding | Location | Disposition |
|---|-----------|---------|----------|-------------|
| 1 | Perf | `canAccessProjectStrict` makes two sequential Supabase roundtrips (profile lookup, then assignments check). A single RPC or a `role` pass-through param would halve the latency. | `lib/portal-utils.ts:22-56` | **Defer** — touches the function signature, callers would need updating; out of scope for auto-fix |
| 2 | Perf | `Intl.DateTimeFormat` instantiated on every call to `formatMeetingDate`, used inside a `.map()`. | `components/portal/qualia-portal-hub.tsx:418` | **Fixed** — hoisted to module-scope `MEETING_DATE_FMT` |
| 3 | TS | `canAccessProjectStrict` had zero unit test coverage despite being security-sensitive (gates file downloads + comments). | `__tests__/lib/portal-utils.test.ts` | **Partially fixed** — added admin-passthrough + error-path smoke tests. Full employee/client branch coverage deferred to a follow-up that rewrites the supabase mock chain for multi-call shapes |

## Low Priority

| # | Dimension | Finding | Location | Disposition |
|---|-----------|---------|----------|-------------|
| 1 | Perf | `AdminSectionNav` not wrapped in `memo()`. `usePathname()` re-renders the component on every navigation. | `components/portal/admin-section-nav.tsx:44` | **Defer** — 4 links, negligible cost; `memo` wouldn't help against `usePathname` re-renders anyway |
| 2 | Perf | `useMemo(() => getGreeting(new Date().getHours()), [])` — greeting frozen at mount, never updates across time boundaries. | `components/portal/qualia-portal-hub.tsx:119` | **Defer** — intentional; cosmetic |
| 3 | Perf | `workspace/page.tsx` pulls `portal-utils` for the synchronous `isPortalAdminRole`, dragging the module graph. | `app/(portal)/workspace/page.tsx:4` | **Defer** — tree-shaking should handle it; verify on a future bundle-analyze pass |
| 4 | TS | `enabledApps` prop on `QualiaPortalHubProps` is now unused after the `/messages` dead-link fix. Two callers still pass it. | `components/portal/qualia-portal-hub.tsx:70,110` | **Fixed** — removed the destructure binding. Prop kept on interface for backward-compat with the two callers |
| 5 | TS | `(result.data as string[])` cast bypasses TS narrowing; `Array.isArray` only narrows to `unknown[]`. Runtime is guarded so it's safe. | `lib/portal-utils.ts:152` | **Defer** — runtime safety holds; tightening the type would add ceremony for no behavioral gain |
| 6 | TS | `aria-hidden` on the icon in `AdminSectionNav` could be `aria-hidden="true"` for JSX strictness. | `components/portal/admin-section-nav.tsx:69` | **Defer** — ESLint config didn't flag it; React accepts bare `aria-hidden` |

## Why these were scoped

The branch is 4 commits / 20 files net -967 LOC. A full multi-wave
optimization (frontend + backend + perf + arch over the whole 130k-file
codebase) would have taken 20+ minutes and surfaced findings unrelated to
this PR. Two scoped agents covering only the touched files returned in
~80s each.

## What changed in this report's commit

- Hoisted `Intl.DateTimeFormat` to module scope (perf #2)
- Removed dead `enabledApps` destructure binding (TS #4)
- Added `canAccessProjectStrict` admin-passthrough + error-path tests (partial TS #3)

Net new tests: +2. Tests passing: 534 / 534. `npx tsc --noEmit` clean.
