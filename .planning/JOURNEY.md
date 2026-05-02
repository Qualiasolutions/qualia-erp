# Journey — Qualia ERP / Portal v2

The full arc from kickoff to current. Internal Qualia project — no external client handoff. Production live at `portal.qualiasolutions.net`.

This file is retroactive (written 2026-04-26 to repair drifted framework bookkeeping). Past milestones are captured from archive evidence.

## Milestone arc

| # | Milestone | Status | Phases | Closed |
|---|---|---|---|---|
| 1 | Foundation + Core Portal | CLOSED | 1–13 | pre-2026-04 |
| 2 | UI Remake | CLOSED | 14, 15, 16.1–16.6 | 2026-04-20 |
| 3 | Remaining Surfaces | CLOSED | 17, 17.1, 18, 18.1 | 2026-04-25 |
| 4 | Polish + Hardening | CLOSED | 19–25 | 2026-04-26 |
| 5 | Operational Hardening + Polish | OPEN | rolling | — |

---

## Milestone 1 · Foundation + Core Portal — CLOSED

Built the original Portal v2 — Assembly-inspired client hub on top of the existing 63-table Supabase schema. Phases 1–13 shipped messaging, file management, project/task views, AI chat, framework-sync intake, security hardening.

Archive: scattered `.planning/phase-{5..13}-*.md` (kept loose, predates v4 archive convention).

## Milestone 2 · UI Remake — CLOSED 2026-04-20

Rebuilt the 5 core work surfaces (Today, Tasks, Projects, Roadmap, Schedule) and the portal shell against a new design-system foundation (tokens, motion, ease-premium, elevation).

Archive: `.planning/archive/milestone-ui-remake/`.

## Milestone 3 · Remaining Surfaces — CLOSED 2026-04-25

Brought the rest of the app into the v4.1 design system — admin cockpit + control surface, portal hub, billing, requests.

Archive: `.planning/archive/milestone-remaining-surfaces/`.

## Milestone 4 · Polish + Hardening — CLOSED 2026-04-26

Closed the long tail from Remaining Surfaces (deferred phases 19, 20, 21) and shipped two optimization-audit cycles (HIGH items in Phase 23, MEDIUM items in Phase 24, perf wins in Phase 25), plus schedule-meeting actions (Phase 22).

**Phases:**
- Phase 19 — Secondary internal pages (`/clients`, `/knowledge`, `/research`, `/settings`)
- Phase 20 — Roadmap side rail (lead/team/resources/files/notes)
- Phase 21 — Final polish + launch readiness (SEO, empty-states, a11y, perf baseline)
- Phase 22 — Schedule meeting actions + public booking sync
- Phase 23 — Post-Remaining-Surfaces hardening sweep (4 HIGH items)
- Phase 24 — Perf + UX polish (4 MEDIUM items)
- Phase 25 — Performance sweep (chat parallel writes, AuthProvider dedup, RPC aggregation)

Archive: `.planning/archive/milestone-polish-hardening/`.

## Milestone 5 · Operational Hardening + Polish — OPEN (rolling, since 2026-04-26)

Direct-to-master polish + ops mode. ~25 feature commits since the M4 cutoff, clustered into themes: time tracking + clock flow, admin/employee dashboard polish, finance template system + 5 MCP tools (PR #92), assignment deadlines + completion flow, live presence, knowledge/research redesign, framework report wiring, SECURITY DEFINER advisor triage, operational hardening. Real user value, no phase ceremony — and that is fine for the current velocity.

See `.planning/STATE.md` for the commit-grouped breakdown.

**Candidate focused sub-tracks (when M5 needs phase ceremony):**
- **5a — Manager role + project workflow** (Fawzi-flagged, intent decision deferred)
- **5b — God-module split + use-cache** (P2 tech debt, perf compounding)
- **5c — Test coverage push** (1.68% → 50%, P1 tech debt)
- **5d — Dependabot vulnerability sweep** (24 transitive: 3 critical / 6 high) — **only inevitable forcing function on the list, recommend first when ready to formalize**

`/qualia-plan` opens any of them. Until then, rolling polish stays on master without ceremony.

## Notes

- Project shipped. No external client handoff — Handoff milestone is N/A; treat each closed milestone as a shipped release.
- `.planning/JOURNEY.md` is the source of truth for milestone arc going forward.
- `.planning/STATE.md` tracks current phase only — refer here for the full picture.
