# State: Qualia ERP

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Production-hardened internal suite — secure, performant, observable, polished design.
**Current focus:** v3.0 Production Hardening & Design (+ v2.1 carry-over phases 30-31)

## Current Position

Phase: 36 (Reliability & Testing) — 1/3 plans complete
Plans complete: 33-01, 33-02, 34-01, 34-02, 34-03, 35-01, 35-02, 36-01
Status: Phase 36 in progress
Last activity: 2026-03-27 — Completed 36-01 (test fixes, error boundaries, cron sanitization)

Progress: [████░░░░░░] 39% (v3.0 scope, 7/18 plans — 33x2, 34x3, 35x2, 36-01 done)

## Milestone Overview

v3.0 has 8 phases (30-31 carry-over + 33-38 new):

| Phase | Area                         | Plans | Can Parallel? |
| ----- | ---------------------------- | ----- | ------------- |
| 30    | Live Status Dashboard (v2.1) | 3     | Yes           |
| 31    | Clock-Out Enforcement (v2.1) | 2     | After 30      |
| 33    | Security Fixes               | 2     | Yes           |
| 34    | Performance Optimization     | 3     | Yes           |
| 35    | Observability                | 2     | Yes           |
| 36    | Reliability & Testing        | 3     | Yes           |
| 37    | Deployment Cleanup           | 1     | After 33      |
| 38    | Design Review & Polish       | 2     | Last          |

Phases 30, 33, 34, 35, 36 can all run in parallel. Phase 37 needs 33 first. Phase 38 is the final pass.

## Accumulated Context

### Key Decisions (v3.0)

| #   | Decision                             | Rationale                                                                   | Date       |
| --- | ------------------------------------ | --------------------------------------------------------------------------- | ---------- |
| 1   | VAPI removed entirely                | Unused, was ~9,500 lines of dead code + unsafe-eval in CSP                  | 2026-03-26 |
| 2   | Role in JWT claims (not DB query)    | Eliminates 1-2 DB queries from every middleware run                         | 2026-03-26 |
| 3   | 30% test coverage target (not 50%)   | Pragmatic first step — 50% threshold exists but 0.75% → 30% is the real win | 2026-03-26 |
| 4   | Sentry over custom logging           | Industry standard, zero-config with Next.js, already have MCP access        | 2026-03-26 |
| 5   | React cache() for role dedup         | Native per-request dedup, no manual Map needed, eliminates N role queries   | 2026-03-27 |
| 6   | Batch RPC SECURITY DEFINER           | Allows bypassing RLS for batch update but input is validated UUIDs only     | 2026-03-27 |
| 7   | Sentry 10% trace + error-only replay | Low-volume internal app — minimal cost, full error coverage                 | 2026-03-27 |

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-27
Stopped at: Phase 36 plan 01 complete — all must-haves verified.
Resume file: `.planning/phases/36-reliability-testing/36-01-SUMMARY.md`
**Next action:** Execute 36-02 (test coverage expansion) and 36-03 (remaining). Phases 30, 37 still pending. Phase 38 (Design) is last.
