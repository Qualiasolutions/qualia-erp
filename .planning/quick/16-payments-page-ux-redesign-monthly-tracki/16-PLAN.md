# Plan: 16 — Payments page UX redesign — monthly tracking, income/expenses, per-client view

**Mode:** quick
**Created:** 2026-03-11

## Task 1: Add Payments to sidebar nav (admin-only)

**What:** Add Payments link to the admin nav section in sidebar.tsx
**Files:** `components/sidebar.tsx`
**Done when:** Payments link appears in Admin section for admin/manager users

## Task 2: Redesign payments-client.tsx with monthly view

**What:** Rebuild the payments client component with:

- Month navigator (prev/next month buttons with current month label)
- Monthly summary cards (this month's income, expenses, net, pending)
- "Upcoming This Month" section showing pending payments for selected month
- Transaction list filtered by selected month with month grouping
- Client balances panel showing per-client totals (filtered to selected month)
- Keep existing add payment form and edit/delete functionality

**Files:** `app/payments/payments-client.tsx`
**Done when:** Page shows monthly breakdown with easy navigation between months, upcoming payments section, and per-client tracking
