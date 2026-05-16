# Roadmap — Qualia ERP / Portal v2

Source of truth for the milestone arc: `.planning/JOURNEY.md`.
Current state: `.planning/STATE.md`.

**Live in production** at https://portal.qualiasolutions.net.
**M1–M4 closed. M5 open — rolling polish.**

---

## Closed Milestones

### M1 · Foundation + Core Portal — CLOSED (pre-2026-04)

Phases 1–13. Original Portal v2 buildout — messaging, file management, project/task views, AI chat, framework-sync intake, security hardening.
Archive: scattered `.planning/phase-{5..13}-*.md` (predates v4 archive convention).

### M2 · UI Remake — CLOSED 2026-04-20

Phases 14–16.6. Design system foundation + 5 core surfaces (Today, Tasks, Projects, Roadmap, Schedule) + portal shell. Eight phases shipped in one day.
Archive: `.planning/archive/milestone-ui-remake/`.

### M3 · Remaining Surfaces — CLOSED 2026-04-25

Phases 17–18.1. Admin cockpit + control surface + portal hub + billing + requests.
Archive: `.planning/archive/milestone-remaining-surfaces/`.

### M4 · Polish + Hardening — CLOSED 2026-04-26

Phases 19–25. Secondary internal pages + roadmap side rail + final polish + meeting actions + hardening sweep (4 HIGH) + perf wins (chat parallel writes, AuthProvider dedup, RPC aggregation).
Archive: `.planning/archive/milestone-polish-hardening/`.

---

## M5 · OPEN — Operational Hardening + Polish (rolling)

Since 2026-04-26, ~25 feature commits on master without phase ceremony. The work is real and themed (time tracking, finance MCP, live presence, security advisor triage, knowledge redesign) — it just hasn't been wrapped in `/qualia-plan` ceremony because the velocity is right and nothing is gated.

See `.planning/STATE.md` for the full commit-grouped breakdown.

---

## Candidate sub-tracks (when M5 needs phase ceremony)

| #      | Sub-track                                        | Scope                                                                                                                                                                                                                                                                                                | Why now / why not                                                         | Forcing function                                                  |
| ------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 5a     | Manager role + project workflow                  | **Re-introduce** `manager` role (removed 2026-04-18 — see ADR 0001) between admin and employee; carve out workflow surfaces. Re-introduction must come with a behavior delta the admin role doesn't already cover.                                                                                   | Fawzi-flagged but intent not pinned down                                  | When Fawzi commits to scope + behavior delta                      |
| 5b     | God-module split + `use cache`                   | Split `app/actions/client-portal.ts` (2679 LOC) into 5 domain modules; add Next.js 16 `use cache` to hot reads                                                                                                                                                                                       | P2 tech debt; perf compounds with every new feature                       | When perf becomes user-visible                                    |
| 5c     | Test coverage push                               | 1.68% → 50% via characterization tests on most-used server actions + RLS smoke tests                                                                                                                                                                                                                 | P1 tech debt; raises refactor safety floor                                | Before next big refactor                                          |
| **5d** | **Dependabot vulnerability sweep**               | **24 transitive vulns — 3 critical / 6 high — npm audit + bump cycle**                                                                                                                                                                                                                               | **Security debt; only forcing function on this list**                     | **Inevitable — recommend tackling first when M5 needs structure** |
| **5e** | **Admin Modernization (in progress 2026-05-16)** | **Restructure admin IA: consolidate overlapping pages (audit/attendance/employee/[id]/reports), surface People view, relabel session_reports as Shift Submissions and decouple from task completion, make client/employee/admin relationships visible, uniform design system across admin surfaces** | **User-requested 2026-05-16 — drift in admin clarity + report semantics** | **Active — phases 29-32**                                         |

---

## Next Step

Three options. STATE.md elaborates.

1. **Stay rolling** — keep shipping polish/ops directly on master. Default mode. Producing real value.
2. **Pick 5d (Dependabot)** when ready to formalize — security is the only inevitable forcing function. `/qualia-plan` to draft phase 1.
3. **Close M5** as "Continuous Polish 2026-04-26 → {date}" once a deliberate next milestone is named.

---

## Status snapshot

- Production: live, healthy (last deploy from `master`)
- Vercel team: `qualia-glluztech` (transferred 2026-05-02)
- Tech debt P0: clear (was IDOR + auth + webhook secret — all closed)
- Tech debt P1: test coverage (1.68%)
- Tech debt P2: god-module split, N+1 audit
- Security: SECURITY DEFINER triage done; **24 Dependabot transitive vulns open**
