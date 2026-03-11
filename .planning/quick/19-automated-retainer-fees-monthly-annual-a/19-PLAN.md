# Plan: 19 — Automated retainer fees (monthly/annual) and project installment payments

**Mode:** quick
**Created:** 2026-03-11

## Task 1: Add server actions for bulk payment generation

**What:** Add two new server actions in `app/actions/payments.ts`:

1. `generateRetainerPayments(data)` — takes client_id, amount, frequency (monthly/annual), start_date, description. Generates 12 monthly or 1 annual pending payment entries in the `payments` table.
2. `generateInstallmentPayments(data)` — takes client_id, project_id, installments array [{amount, date}], description. Creates one pending payment entry per installment.

**Files:** `app/actions/payments.ts`
**Done when:** Both actions create bulk `payments` rows with status='pending' and appropriate dates.

## Task 2: Add Retainer Fee Generator UI and Project Installment Generator UI

**What:** Add two new modal dialogs to `app/payments/payments-client.tsx`:

1. **Retainer Generator Modal** — Form with: client select, amount, frequency toggle (Monthly/Annual), start month picker, description. On submit calls `generateRetainerPayments`. Shows preview of payments before creating.
2. **Installment Generator Modal** — Form with: client select, project name/description, number of installments (2-6), then dynamic rows for each installment (amount + date). On submit calls `generateInstallmentPayments`.

Add two buttons in the payments page header area (next to "Add Payment") to open these modals.

**Files:** `app/payments/payments-client.tsx`
**Done when:** Both modals work, create payments correctly, and the page refreshes to show new entries.

## Task 3: Fetch projects list for installment form

**What:** Pass projects data to `PaymentsClient` so the installment form can show a project dropdown. Update `page.tsx` to fetch projects and pass them down.

**Files:** `app/payments/page.tsx`, `app/payments/payments-client.tsx`
**Done when:** Project dropdown works in the installment modal.
