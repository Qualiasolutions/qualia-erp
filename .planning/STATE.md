# State: Qualia ERP

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** One platform for all Qualia operations — internal team management, client-facing project delivery, and financial visibility.
**Current focus:** v4.0 Portal & Financials — Phase 40: Client File Uploads

## Current Position

Phase: 40 of 43 (Client File Uploads) — Complete
Plan: 40-02 complete (2/2)
Status: Phase 40 complete — all UPLOAD requirements satisfied (portal UI, storage, admin view, email)
Last activity: 2026-03-28 — Completed 40-02-PLAN.md (ERP admin client uploads view)

Progress: [##########] 40/43 phases complete | v4.0: 3/5 phases done

## Performance Metrics

**By Milestone:**

| Milestone                        | Phases | Plans | Shipped    |
| -------------------------------- | ------ | ----- | ---------- |
| v1.0 MVP                         | 3      | 8     | 2026-03-01 |
| v1.1 Production Polish           | 5      | 9     | 2026-03-04 |
| v1.2 Premium Animations          | 2      | 7     | 2026-03-04 |
| v1.3 Full ERP-Portal Integration | 5      | 13    | 2026-03-06 |
| v1.4 Admin Portal Onboarding     | 3      | 8     | 2026-03-09 |
| v1.5.1 Security Hardening        | 1      | 3     | 2026-03-10 |
| v2.0–v2.1 Attendance             | 4      | 14    | 2026-03-27 |
| v3.0 Production Hardening        | 6      | 13    | 2026-03-27 |
| v4.0 Portal & Financials         | 5      | TBD   | —          |

**Overall:** 8 milestones shipped, 38 phases complete

## Accumulated Context

### Pre-work (already shipped before v4.0 roadmap)

- Financial dashboard v1: Zoho KPIs, revenue chart, hide/delete invoices, upcoming payments, client balances
- Supabase tables: financial_invoices, financial_payments (synced from Zoho)
- Sidebar renamed "Payments" → "Financials"
- Old manual payment system deleted

### Key Decisions (v4.0)

| #   | Decision                                           | Rationale                                             | Date       |
| --- | -------------------------------------------------- | ----------------------------------------------------- | ---------- |
| 1   | Zoho Invoice as financial source of truth          | Real invoicing software, MCP-synced to Supabase       | 2026-03-28 |
| 2   | Remove Messages page entirely                      | One-way feed adds no value                            | 2026-03-28 |
| 3   | Full client impersonation (not admin preview)      | Admin sees exactly what client sees                   | 2026-03-28 |
| 4   | Expense tracking in ERP, not Zoho                  | Zoho expenses unused, manual entry is fine            | 2026-03-28 |
| 5   | Phase 41 (financials) can run parallel to 39-40    | Completely independent subsystem                      | 2026-03-28 |
| 6   | Client uploads stored in client-uploads/ subfolder | Separates from admin uploads, enables future policies | 2026-03-28 |

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-28
Stopped at: Phase 40 Plan 02 complete — ERP admin client uploads view shipped
Resume file: .planning/phases/40-client-file-uploads/40-02-SUMMARY.md
**Next action:** Start Phase 41 (financials)
