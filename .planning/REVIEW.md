---
date: 2026-03-24 04:10
mode: general
critical_count: 1
high_count: 4
medium_count: 9
low_count: 10
status: has_blockers
---

# Review — 2026-03-24

## Blockers (CRITICAL + HIGH)

- [components/client-table-view.tsx:662] `as unknown as Client` double cast hiding structural type mismatch — silent data corruption risk (CRITICAL)
- [app/admin/page.tsx:132] Password field uses `type="text"` instead of `type="password"` — plaintext visible (HIGH)
- [app/admin/page.tsx:177] `result.data as AdminProfile[]` unguarded cast on `unknown` — runtime crash if shape changes (HIGH)
- [components/project-table-view.tsx:321] Three-dot MoreVertical button is 28px (h-7 w-7), below 44px WCAG minimum touch target on mobile (HIGH)
- [components/client-table-view.tsx:276] Same 28px touch target issue as project table (HIGH)

## Recommendations (MEDIUM + LOW)

- [app/admin/page.tsx:34] `ROLE_CONFIG` typed `Record<string, ...>` should use `UserRole` enum (MEDIUM)
- [components/project-table-view.tsx:104-120] Local `PROJECT_STATUSES`/`PROJECT_TYPES` redeclare values from `types/database.ts` — drift risk (MEDIUM)
- [components/project-table-view.tsx:321] `md:opacity-0` doesn't remove from tab order — keyboard users tab to invisible button (MEDIUM)
- [components/client-table-view.tsx:458-504] Stats bar lacks `flex-wrap`, overflows on narrow viewports (MEDIUM)
- [components/client-table-view.tsx:396-413] `const` inside unblocked `switch` cases — lexical scoping footgun (MEDIUM)
- [components/admin/assignment-history-table.tsx:50] `min-w-[600px]` on table but no `overflow-x-auto` on parent CardContent (MEDIUM)
- [app/clients/[id]/page.tsx:16] `ClientDetailSkeleton` renders duplicate `<header>` that stacks during Suspense loading (MEDIUM)
- [app/payments/page.tsx:106] Content padding `p-4 sm:p-6` inconsistent with `p-5 sm:p-8` used on other list pages (MEDIUM)
- [components/status/status-dashboard.tsx:583] Mutable `sectionIndex` inside `.map()` callback — React concurrent mode corruption risk (MEDIUM)
- [components/page-header.tsx:33] Template literal className concat should use `cn()` utility (LOW)
- [components/page-header.tsx:41] `mr-1` on hamburger is redundant given parent `gap-2.5` (LOW)
- [components/page-header.tsx:49-57] Duplicate icon div branches — flatten with `iconBg ?? 'bg-primary/10'` (LOW)
- [app/admin/page.tsx:227] Admin page builds inline header instead of using PageHeader component (LOW)
- [app/admin/page.tsx:80-90] InviteDialog closes on failure — should only close on success (LOW)
- [app/inbox/inbox-view.tsx:390] Raw `<button>` instead of `Button` component for hamburger (LOW)
- [app/inbox/inbox-view.tsx:559] `filteredTasks[virtualRow.index]` can be undefined — needs guard (LOW)
- [components/project-table-view.tsx:229] Redundant `as string` cast on `result.error` (LOW)
- [components/client-table-view.tsx:362] Stats counts computed outside `useMemo` (LOW)
- [app/knowledge/knowledge-page-client.tsx:440] Guide count in "actions" slot — semantically misaligned (LOW)
- [components/status/status-dashboard.tsx:436] `parseFloat(m.all_time_uptime_ratio)` missing null safety (LOW)
