# Project State

## Project

See: .planning/PROJECT.md

## Current Position

Phase: 30 of 32 — Reports = Shift Submissions
Status: queued
Assigned to: unassigned (Phase 29 closed 2026-05-27 on `refactor/admin-relationships-modernize`, PR #136 in flight)
Last activity: 2026-05-27 — Phase 29 closed. Wave 1 shipped: overlap audit (T1, `f12d3291`), People wired into AdminSectionNav + /admin/employee/[id] redirect (T2 absorbed into `3b936ee2`), sidebar admin dedup + /admin/assignments orphan delete (T3, `3b936ee2`). Bonus parallel work: OG meta fix (`a7c3e60e`), Resources+Files merged into single Attachments section in project sidebar (`04cb4871`).

Progress: [░░░░░░░░░░] 0%

## Roadmap

| #   | Phase                          | Goal                                                                 | Status   |
| --- | ------------------------------ | -------------------------------------------------------------------- | -------- |
| 29  | Admin IA consolidation         | One clear admin nav; overlapping pages merged; dead routes removed   | complete |
| 30  | Reports = Shift Submissions    | Relabel + decouple session_reports from task/milestone completion    | queued   |
| 31  | Relationships visible          | Client ↔ employee ↔ admin links surfaced; clients field cleanup; ADR | queued   |
| 32  | Admin design system uniformity | shadcn primitives everywhere on admin; oversized files split; polish | queued   |

## Blockers

None.

## Session

Last session: 2026-05-27
Last worked by: Fawzi Goussous (Claude on `refactor/admin-relationships-modernize`, PR #136 in flight)
Resume: —

## Phase 29 — Closed (2026-05-27)

| When       | Commit     | What                                                                                                                                                                      | Source                |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 2026-05-16 | `8eb7f196` | AdminSectionNav — sticky Dashboard/Reports/Sessions/Audit                                                                                                                 | Hasan                 |
| 2026-05-16 | `bdba0633` | Deleted 1256 LOC + 2 page stubs (assignments page.tsx, audit/[id] stub)                                                                                                   | Hasan                 |
| 2026-05-16 | `eb723683` | Killed dead /messages link in client portal hub                                                                                                                           | Hasan                 |
| 2026-05-16 | `579d33c4` | Consolidated role helpers, renamed canAccessProjectStrict                                                                                                                 | Hasan (cross-cutting) |
| 2026-05-16 | `ef251afe` | Scoped OPTIMIZE auto-fixes (3 perf + ts smoke tests)                                                                                                                      | Hasan                 |
| 2026-05-27 | `f12d3291` | T1 — Admin dashboard ↔ standalone page overlap audit (`.planning/phase-29-admin-overlap-audit.md`)                                                                        | Phase 29 plan         |
| 2026-05-27 | `3b936ee2` | T2+T3 — People wired into AdminSectionNav, /admin/employee/[id] redirects to /admin/people/[id], sidebar collapses 4 admin entries → 1, /admin/assignments orphan deleted | Phase 29 plan         |

Audit verdict (from T1): zero true merges required — Hasan's earlier work already resolved the overlap candidates. The dashboard tabs (Overview/Team/Finance/System) and standalone pages (`/admin/reports`, `/admin/attendance`, `/admin/people`, `/admin/audit`) cover distinct concerns. One out-of-matrix overlap (`/admin/employee/[id]` ↔ `/admin/people/[id]`) was handed to T2 and resolved by redirect.

## Phase 31 prep — bonus already shipped

`/admin/people` shell (index + `[id]/` detail with 4 tabs) was shipped early in commit `a13369a6` (Hasan, 2026-05-16). When Phase 31 planning begins, **do not re-plan the People shell**. Remaining Phase 31 scope:

- Cross-surface visibility of client ↔ employee ↔ admin relationships (e.g. surface assigned-team on client portal project view, surface client roster on employee profile)
- `clients` table field cleanup (deprecate / split / consolidate fields per the ADR)
- ADR-000N: write the Decision Record covering the relationship model
