# State: Qualia ERP

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** One platform for all Qualia operations — internal team management, client-facing project delivery, and financial visibility.
**Current focus:** v4.0 Portal & Financials

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-28 — Milestone v4.0 started

Progress: [░░░░░░░░░░] 0%

## Accumulated Context

### Pre-work (already shipped before roadmap)

- Financial dashboard v1: Zoho-powered KPIs, revenue chart, hide/delete invoices, upcoming payments, client balances
- Supabase tables: financial_invoices, financial_payments (synced from Zoho)
- Sidebar renamed "Payments" → "Financials"
- Old manual payment system deleted (-1,500 lines)

### Key Decisions (v4.0)

| #   | Decision                                      | Rationale                                       | Date       |
| --- | --------------------------------------------- | ----------------------------------------------- | ---------- |
| 1   | Zoho Invoice as financial source of truth     | Real invoicing software, MCP-synced to Supabase | 2026-03-28 |
| 2   | Remove Messages page entirely                 | One-way feed adds no value                      | 2026-03-28 |
| 3   | Full client impersonation (not admin preview) | Admin sees exactly what client sees             | 2026-03-28 |
| 4   | Expense tracking in ERP, not Zoho             | Zoho expenses unused, manual entry is fine      | 2026-03-28 |
| 5   | Financial tracking starts 2026-01-15          | Clean start date                                | 2026-03-28 |

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-28
Stopped at: Milestone v4.0 initialized, defining requirements
Resume file: —
**Next action:** Finish requirements → create roadmap
