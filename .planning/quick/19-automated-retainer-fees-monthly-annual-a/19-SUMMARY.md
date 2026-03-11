---
phase: quick
plan: 19
subsystem: payments
tags: [payments, retainer, installments, bulk-generation]
dependency_graph:
  requires: [app/actions/payments.ts, app/payments/payments-client.tsx, app/payments/page.tsx]
  provides:
    [
      generateRetainerPayments,
      generateInstallmentPayments,
      RetainerGeneratorModal,
      InstallmentGeneratorModal,
    ]
  affects: [payments page]
tech_stack:
  added: []
  patterns: [bulk-insert, modal-form, preview-panel, datalist-autocomplete]
key_files:
  created: []
  modified:
    - app/actions/payments.ts
    - app/payments/payments-client.tsx
    - app/payments/page.tsx
decisions:
  - Monthly retainer generates exactly 12 entries from start month
  - Annual retainer generates exactly 1 entry on start date
  - Installment count configurable 2-6 with dynamic row form
  - Projects passed via datalist (autocomplete) not select, to allow free-text input
  - workspaceId cast to string (consistent with existing codebase pattern)
metrics:
  duration: ~4 min
  completed: 2026-03-11
---

# Quick Task 19: Automated retainer fees (monthly/annual) and project installment payments

**One-liner:** Bulk payment generators — 12-entry monthly retainer or single annual retainer, plus N-installment project payment splitter, both via Dialog modals with preview and validation.

## Tasks Completed

| #   | Task                                           | Commit  | Files                                      |
| --- | ---------------------------------------------- | ------- | ------------------------------------------ |
| 1   | Add server actions for bulk payment generation | 506c5a7 | app/actions/payments.ts                    |
| 2   | Add Retainer Fee Generator UI                  | 7410e4a | app/payments/payments-client.tsx           |
| 3   | Fetch projects list and pass to PaymentsClient | 7410e4a | app/payments/page.tsx, payments-client.tsx |

## What Was Built

### Server Actions (`app/actions/payments.ts`)

Two new bulk generation actions added after the existing CRUD functions:

- **`generateRetainerPayments(data)`** — Takes `client_id`, `amount`, `frequency` (`monthly`|`annual`), `start_date`, `description`. Monthly: inserts 12 rows with dates on the 1st of each month. Annual: inserts 1 row. All entries: `type=incoming`, `status=pending`.

- **`generateInstallmentPayments(data)`** — Takes `client_id`, `description`, `installments: [{amount, date}]`. Inserts one row per installment, appending `"— Installment N/total"` to the description. All entries: `type=incoming`, `status=pending`.

Both actions use `isAdminUser()` guard, `revalidatePath('/payments')`, and return `{ success, error?, count? }`.

### UI (`app/payments/payments-client.tsx`)

**RetainerGeneratorModal:**

- Frequency toggle (Monthly 12x / Annual 1x) with qualia brand styling
- Client dropdown
- Amount input + start month picker (`type="month"`)
- Optional description (auto-fills from client name)
- Expandable preview panel showing all generated entries with dates and amounts
- Total value calculation shown in preview header

**InstallmentGeneratorModal:**

- Client dropdown
- Description/project text input with `<datalist>` autocomplete from projects list
- Count selector buttons (2, 3, 4, 5, 6) — emerald accent
- Dynamic row table: #, amount, date per installment
- Running total footer
- All validation with inline error messages

**Trigger buttons** added in a flex row next to the existing "Add Payment" dashed button:

- Retainer button: `<Repeat2>` icon + "Retainer" label (qualia hover)
- Installments button: `<Layers>` icon + "Installments" label (emerald hover)
- Labels hidden on mobile (`hidden sm:inline`)

### Page (`app/payments/page.tsx`)

Updated `PaymentsLoader` to fetch projects in parallel with clients using `Promise.all`, then pass `projects` prop to `PaymentsClient`. `PaymentsClientProps` extended with `projects: Project[]`.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files exist

- app/actions/payments.ts — generateRetainerPayments and generateInstallmentPayments present
- app/payments/payments-client.tsx — RetainerGeneratorModal, InstallmentGeneratorModal present
- app/payments/page.tsx — projects fetch and prop pass present

### Commits exist

- 506c5a7 — Task 1 (server actions)
- 7410e4a — Tasks 2 + 3 (UI + page)

### TypeScript

- `npx tsc --noEmit` passed with zero errors

## Self-Check: PASSED
