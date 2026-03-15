# Summary: 25 — Payments UX overhaul

## Changes Made

### 1. Removed "Upcoming This Month" yellow container

- Deleted the amber-colored upcoming payments section that duplicated info already in the transactions list
- The "Upcoming" stat card in the header still shows the count

### 2. Default transactions to "Pending" view

- Changed `statusFilter` initial state from `'all'` to `'pending'`
- Users see pending payments first (most actionable view)

### 3. Replaced 3 action buttons with smart dropdown

- Removed separate "Add Payment", "Retainer", and "Installments" buttons
- Single "Add Payment" button now opens a dropdown with 3 options:
  - One-time Payment (opens inline form)
  - Retainer (Monthly/Annual) (opens retainer modal)
  - Project Installments (opens installment modal)
- Cleaner layout, containers align properly, no width competition

## Files Modified

- `app/payments/payments-client.tsx`
