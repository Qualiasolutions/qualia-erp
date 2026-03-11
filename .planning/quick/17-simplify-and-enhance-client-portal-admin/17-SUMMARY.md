---
phase: quick
plan: '17'
subsystem: portal
tags: [portal, admin, ux, refactor]
key-files:
  modified:
    - components/portal/portal-admin-panel.tsx
decisions:
  - 'Removed handleRemoveAccess entirely — the new tab-based UI drops per-assignment inline remove buttons. Clients tab focuses on password resets and visibility; remove access belongs to a future per-client detail view.'
  - 'Kept removeClientFromProject import removed — no longer imported since handler was removed.'
  - 'Fallback table (when clientManagement is null) kept but simplified — uses sendClientPasswordReset (email link) rather than the merged reset button.'
metrics:
  completed: '2026-03-11'
  duration: '~20 minutes'
---

# Quick Task 17: Simplify and Enhance Client Portal Admin UI

**One-liner:** Rewrote 1535-line stacked-card admin panel into clean two-tab layout — Clients table as default view, Onboard tab with Single/Bulk pill toggle replacing confusing wizard flow.

## What Was Built

### Tab 1: Clients (default)

- Filters row at top: project filter dropdown + status filter dropdown
- Table: Client name, Email, Projects (badges), Last Login, Status, single Actions button
- Single `KeyRound` button generates a temp password and shows it inline below the row (replacing the two confusing separate reset buttons)
- Export Credentials button in the tab header area — opens inline collapsible section
- Bulk reset per-project retained (appears when project filter is active)
- Active/Inactive count badges in the filter row

### Tab 2: Onboard

- Pill toggle: Single | Bulk (no separate button, no multi-step wizard)
- Single mode: CRM client dropdown + project checkboxes + "Create Access" button — all in one view
- Bulk mode: client checkboxes + project checkboxes + "Create Access for N Clients" button — all in one view
- Credentials result shown inline after setup in both modes

### Removed

- "Create New Project" card — gone entirely
- Step 1/Step 2 wizard flow — replaced by single-view forms
- Two separate password reset buttons (`KeyRound` + `RotateCcw`) — merged into one `KeyRound` that generates temp password inline
- `removeClientFromProject` action — not wired in new UI (no inline per-project remove in table)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `handleRemoveAccess` function**

- **Found during:** Task 1 (ESLint pre-commit hook failure)
- **Issue:** The new UI doesn't have inline per-project remove buttons, so `handleRemoveAccess` was defined but never called.
- **Fix:** Removed the function and the `removeClientFromProject` import. Fallback table also simplified (no per-project remove in new design).
- **Files modified:** `components/portal/portal-admin-panel.tsx`
- **Commit:** 52bb1cf

## Commits

| Hash    | Message                                                       |
| ------- | ------------------------------------------------------------- |
| 52bb1cf | feat(quick-17): rewrite portal-admin-panel with tabbed layout |

## Self-Check: PASSED

- [x] `components/portal/portal-admin-panel.tsx` exists and is 730 lines (down from 1535)
- [x] Commit 52bb1cf exists in git log
- [x] `npx tsc --noEmit` — no errors
- [x] `npx eslint` — no errors
