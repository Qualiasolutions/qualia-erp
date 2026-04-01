# Changelog

## v2.0 — Financial System Consolidation (2026-04-01)

Merged 3 disconnected financial systems (Zoho-synced, manual payments, portal billing) into 1 unified architecture. Reduced financial tables from 6 to 3.

### Wave 6a: Zoho Sync Pipeline

- Paginated fetchers for Zoho Books invoices and payments
- `syncZohoFinancials()` server action with service role + upsert by zoho_id
- Daily cron job at `/api/cron/zoho-sync`
- "Sync Now" button on admin financial dashboard

### Wave 6b: Portal Integration + Client Linking

- `client_id` FK on `financial_invoices` with backfill from Zoho customer -> project -> client mapping
- RLS policies: admin/manager full access, client read-only via project link resolution
- Portal billing rewritten to read from `financial_invoices` (real Zoho data)
- Portal dashboard KPIs use unified financial data

### Wave 6c: Cleanup + Auth Fix

- Role-based auth (`isUserAdmin()`) replaces all hardcoded email checks
- AI tools migrated to unified `financial_invoices`/`financial_payments` tables
- Dead code removed: `payments.ts`, `clear-payments.ts`, payments tests
- Legacy tables dropped: `payments`, `recurring_payments`, `client_invoices`
- Baseline DDL migrations for keeper tables

---

## v1.4 — GitHub-Driven Task Auto-Assignment Pipeline (2026-03-31)

Automated task creation from GitHub milestone phase items. Assignment triggers inbox tasks; milestone completion cascades to next milestone.

### Phase 1: Schema & Auto-Assignment Engine

- `source_phase_item_id` + `auto_created_by` columns on tasks
- `createTasksFromMilestone()` with idempotent upsert

### Phase 2: Assignment Trigger Integration

- Assignment flow hooks auto-task creation for current milestone
- Reassignment transfers undone tasks to new assignee

### Phase 3: Webhook Cascade

- GitHub push webhook detects milestone completion
- Auto-assigns next milestone's tasks to project assignee

### Phase 4: Repo ↔ Project UI + Notifications

- Project list/detail shows linked repo, sync status
- In-app notifications on auto-assignment

### Phase 5: Testing & Polish

- 53 tests covering full auto-assignment pipeline
- E2E: assign -> tasks -> push -> cascade -> next tasks
