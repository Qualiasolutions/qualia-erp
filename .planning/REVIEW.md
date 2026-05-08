# Production Review — 2026-05-08

Project: Qualia ERP / Portal v2 — live at https://portal.qualiasolutions.net
Branch: `master` (clean) · Phase: M5 Rolling Polish · Last commit: `759caaf9`

**Scope:** `.planning/` hygiene + `.continue-here.md` + general code health (security, types, dead code).
**Replaces:** prior 2026-05-02 review (all 3 HIGH items in that review were closed in commit `1eb07a4a`).

## Summary

| Category              | Critical | High  | Medium | Low   | Score     |
| --------------------- | -------- | ----- | ------ | ----- | --------- |
| Security              | 0        | 0     | 0      | 0     | **5/5**   |
| Code Quality          | 0        | 0     | 0      | 2     | **5/5**   |
| Planning Hygiene      | 0        | 3     | 4      | 1     | **3/5**   |
| Performance (carried) | 0        | 4     | 5      | 5     | **3/5**   |
| **Total**             | **0**    | **7** | **9**  | **8** | **4.0/5** |

**Verdict:** PASS — no deploy blockers, prod is healthy. The findings cluster in **framework bookkeeping drift**, not code regressions. `.planning/` no longer reflects reality and the live `.continue-here.md` would mislead any future session that opens it. One commit can clean up most of it.

Performance findings (4 HIGH / 5 MEDIUM / 5 LOW) are carried forward from `OPTIMIZE.md` 2026-05-07 — they're tracked, scoped, and have explicit deferral reasons. Not new regressions.

---

## Findings

### CRITICAL (0)

None. Re-verified:

- `service_role` only in server-side files (lib/supabase/server.ts, server actions, API routes) — 0 client-side hits
- 0 `.env` files tracked in git
- 0 `dangerouslySetInnerHTML`, 0 `eval(`, 0 hardcoded `sk_live`/`eyJ`-style secrets
- `npx tsc --noEmit`: **0 errors**
- 0 empty catch blocks

### HIGH (3) — Planning hygiene

**P1. `.continue-here.md` is stale and would mislead a future session.**

- File timestamp: 2026-05-08 04:39
- Says current branch is `feat/sidebar-navigation-execution-2026-05-08` and "implementation is complete in working tree"
- Reality: working tree is clean on `master`; that work shipped as PRs #102, #103, #104 (`ab6c3c2a`, `0c07aff4`, `759caaf9`)
- Effect: a `/qualia-resume` or fresh session reading this file thinks there's pending work on a non-existent feature branch
- **Fix:** delete `.continue-here.md`. Use `/qualia-pause` to write a fresh one only when actually pausing mid-work.

**P2. `.planning/PROJECT.md` and `REQUIREMENTS.md` frozen at 2026-04-11 kickoff.**

- `PROJECT.md` mtime: 2026-04-11 — describes Portal v2 as "transform existing portal into Assembly-inspired hub" — that vision shipped in M1 (closed pre-2026-04)
- `REQUIREMENTS.md` mtime: 2026-04-11 — FR-1..FR-8 enumerate Portal Shell, Messaging, Files, Billing, Tasks, Admin Controls. All shipped through M2/M3/M4.
- Effect: any new contributor (human or agent) loading `PROJECT.md` for context gets a description of work already done, not the current product. Misleading.
- **Fix:** rewrite `PROJECT.md` to describe Qualia ERP as it exists today (the things in CLAUDE.md tech stack + actual surfaces). Mark `REQUIREMENTS.md` as `STATUS: M1–M4 SHIPPED — historical record` at the top, or move it to `.planning/archive/`.

**P3. `.planning/STATE.md` says "Last activity: 2026-05-02" — 6 days stale.**

- `tracking.json.last_updated`: 2026-05-08T00:34:50Z
- `STATE.md`: "Last session: 2026-05-02 / Last worked by: / Resume: —"
- 5 commits have shipped since 2026-05-02 (PRs #100–104)
- `state.js` reports `schema_errors: [{ field: "roadmap_table", message: "Roadmap table header not found" }]` — STATE.md format has drifted from what the router expects
- Effect: state.js routes correctly because it reads `tracking.json`, but humans reading `STATE.md` directly see the wrong picture. The schema warning will keep firing.
- **Fix:** regenerate `STATE.md` from `tracking.json` (or let `/qualia-pause`/`/qualia-report` do it). Reconcile the roadmap table header to whatever `state.js` parses.

### MEDIUM (4)

**P4. Loose phase artifacts at the root of `.planning/` — predate archive convention.**

20 files matching `phase-*.md` sit at the root: `phase-5-plan.md`, `phase-6..13-*.md`, `phase-18-verification.md`, `phase-admin-control-v2-research.md`. M2/M3/M4 followed the convention and live in `.planning/archive/milestone-*/`.

- Effect: clutter at the planning root, plus they reference shipped work + the removed `manager` role (15 hits in stale plan/verification files). Greppable but misleading.
- **Fix:** create `.planning/archive/milestone-foundation-core-portal/` and move the M1-era loose files into it. Mechanical, ~1 minute. Keep `phase-admin-control-v2-research.md` if active research; otherwise archive it too.

**P5. `.planning/decisions/` exists but is empty — ADRs not being written.**

CLAUDE.md, `rules/architecture.md`, and `JOURNEY.md` reference ADRs at `.planning/decisions/`. Three hard-to-reverse decisions in the last 30 days have no ADR:

- Manager role removal (2026-04-18)
- Vercel team transfer to `qualia-glluztech` (2026-05-02)
- Finance template system replacing manual Zoho stitching (2026-05-01, PR #92)
- Effect: future archaeology will need to mine commit messages + CLAUDE.md narrative to reconstruct intent. ADRs exist for exactly this.
- **Fix:** write 3 short ADRs (10 lines each) capturing the decision + reason + when. Going forward, draft an ADR whenever a hard-to-reverse call is made.

**P6. ROADMAP.md M5a contradicts the manager-role removal it depends on.**

`ROADMAP.md:43` lists sub-track 5a: _"Manager role + project workflow — Add `manager` role between admin and employee"_. But the manager role was **removed** 2026-04-18 (per CLAUDE.md). The sub-track is technically a _re-introduction_ of a deliberately-removed role, not a fresh add — but the wording reads like the role doesn't exist yet.

- Effect: future planner reads "Add manager role" and proceeds without realizing the role used to exist and was deleted. Ignores the rationale.
- **Fix:** restate as _"Re-introduce manager role (removed 2026-04-18) for project workflow — link to ADR explaining why removal happened first"_.

**P7. `.planning/codebase/` is a 2026-05-02 snapshot — likely stale.**

`.planning/codebase/{architecture,concerns,conventions,stack}.md` were generated by `/qualia-map` on 2026-05-02. Since then 5 PRs have shipped, including admin/reports simplification (#101) and sidebar refactor (#102/#103). The snapshot may still be roughly accurate, but it's not authoritative.

- Effect: anything reading these as "current architecture" will be slightly out of date.
- **Fix:** either re-run `/qualia-map` on a milestone close, or add a `STATUS: snapshot YYYY-MM-DD` header so readers know the freshness.

### LOW (2)

**P8. `.planning/reports/` has 23 files with no rotation policy.**

Will grow indefinitely. Today it's fine; in 6 months `ls .planning/reports/` won't be useful.

- **Fix:** monthly rollup — at month boundary, gzip month's reports into `.planning/reports/archive/2026-04.tar.gz` and keep last 30 days loose. Or do nothing — it's plain markdown, cheap to keep.

**P9. Code-quality smells (count-only, all LOW).**

- 18 `: any` / `as any` usages
- 27 `console.log` in production code paths
- 2 TODO/FIXME comments
- **Fix:** none required. Track if `any` count climbs past ~30.

---

## Performance findings — carried from `OPTIMIZE.md` 2026-05-07 (no scan re-run)

Already documented + scoped + deferred with reasons. Listing for completeness:

- **H1** Action preamble repeated 271 times across 56 modules → `withAuth(fn)` HOF in `app/actions/shared.ts`
- **H2** Silent mutations without `.select()` → 20+ sites where RLS-blocked deletes/updates report success
- **H3** `lib/swr.ts` 2337-LOC god module → split into `lib/swr/{keys,config,tasks,projects,portal,comms,team}.ts`
- **H4** God components bypassing SWR via `useEffect` → 7 components, largest is `project-workflow.tsx` (1420 LOC)

All four are P2 tech debt — own-PR scope, not blockers.

---

## Recommended cleanup commit

A single small commit closes most planning-hygiene HIGHs:

```
chore(planning): refresh STATE/PROJECT, archive M1 loose files, drop stale handoff

- Delete .continue-here.md (sidebar work shipped as #102/#103)
- Rewrite PROJECT.md to describe current ERP (was kickoff vision)
- Mark REQUIREMENTS.md as M1–M4 historical
- Regenerate STATE.md from tracking.json (fix roadmap_table schema warning)
- Move phase-{5..13,18,admin-control-v2}-*.md → .planning/archive/milestone-foundation-core-portal/
- Add 3 ADRs: manager-role-removal, vercel-team-transfer, finance-template-system
- Restate ROADMAP.md M5a as re-introduction (not fresh add)
```

## Next

`/qualia-task` to execute the cleanup commit above (touches `.planning/` only, low risk, atomic).
Or stay rolling on master — none of these block production. Prod is healthy.
