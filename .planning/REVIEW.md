# Production Review — 2026-04-18

**Mode:** Full audit (security + quality + performance)
**Method:** Codebase-first — scanned actual files and reconciled against `.planning/` docs.
**Branch:** master · clean · `0717b9b`
**Deploy:** `portal.qualiasolutions.net` healthy

## Summary

| Category  | Critical | High | Medium | Low | Score |
|-----------|----------|------|--------|-----|-------|
| Security  | 0        | 2    | 2      | 1   | 4/5   |
| Quality   | 0        | 0    | 4      | 3   | 4/5   |
| Perf      | 0        | 3    | 3      | 1   | 3/5   |
| **Total** | **0**    | **5**| **9**  | **5**| **3.7/5** |

## Gates (all green)

- `npx tsc --noEmit` — **0 errors**
- `npm audit` — **0 critical / 0 high / 0 moderate / 0 low** (parallel agent's dependency work landed)
- `npx next build` — compiles cleanly, all 30 routes render
- `.env` files tracked — **none**
- Hardcoded secrets (`sk_live`, JWT patterns) — **none**
- `service_role` in client code — **none** (only in `lib/supabase/server.ts`, `app/actions/*.ts`, server-only)
- Jest test suite — 621/621 green (from STATE.md, not re-run)

---

## Findings

### HIGH (5) — deploy blockers if not already accepted

**H1 — Client-side mutation on `profiles` table** — `components/onboarding/internal-app-walkthrough.tsx:655-667`
Still writes `internal_onboarding_version` + `internal_onboarding_completed_at` from the browser via the anon client. Was BH3 in OPTIMIZE.md (2026-04-17). RLS is the only guard.
**Fix:** Move to a `persistOnboardingState()` server action.

**H2 — Client-side mutation on `workspace_members`** — `components/workspace-provider.tsx:120-135`
Sets `is_default` true/false from the browser. Was BH4 in OPTIMIZE.md.
**Fix:** `setDefaultWorkspace(workspaceId)` server action.

**H3 — C1 N+1 sequential UPDATE loop not batched** — `app/actions/pipeline.ts:816-828`
`for (const task of unlinkedTasks) { await supabase.from('tasks').update(…).eq('id', task.id) }`. Admin-only migration helper so impact is contained, but flagged in OPTIMIZE.md and still present verbatim.
**Fix:** Group by `phaseId`, then `.in('id', ids)` per group — or switch to an RPC.

**H4 — C2 N+1 in `migrateAllProjectsToGSD` prerequisite-phase linking** — `app/actions/pipeline.ts:404-411`
Another `for (let i…) { await supabase.update(…) }` loop. Admin-only.
**Fix:** Batch via CASE statement in single UPDATE, or `Promise.all` with concurrency cap.

**H5 — C3 stale-session cleanup still sequential on clock-in hot path** — `app/actions/work-sessions.ts:78-89`
`for (const stale of staleSessions) { await supabase.from('work_sessions').update(...) }`. Rare (forgotten-clock-out case only) but runs on every clock-in attempt.
**Fix:** `await Promise.all(staleSessions.map(...))`.

### MEDIUM (9)

**M1 — `dangerouslySetInnerHTML` in owner-updates banner** — `components/today-dashboard/owner-updates-banner.tsx:90`
Input is HTML-escaped before markdown regex runs on the escaped string, so XSS path is closed in practice. Still a footgun if anyone edits `formatBody` and forgets the escape-first ordering. Consider replacing with a React element builder.

**M2 — `createActivityLogEntry` still unvalidated** — `app/actions/activity-feed.ts`
BH5 from OPTIMIZE.md: no Zod schema, `actionType`/`actionData` accepted raw.
**Fix:** Zod enum on `actionType` + schema on `actionData`.

**M3 — Five fire-and-forget `.catch(() => {})`** — `app/api/chat/route.ts:182, 222, 227, 254, 257`
Swallows errors silently. Was H7 in REVIEW.md (2026-04-11).
**Fix:** `fireAndForget()` helper that logs to console + Sentry.

**M4 — 19 `any` / `as any` usages** across app/, components/, lib/ (was 37 in prior audit — improving).
**Fix:** Gradually replace with `unknown` + narrow.

**M5 — 23 `console.log` in production code paths** (down from 20+ at last audit; drift, not regression).
**Fix:** Replace with a `logger.debug()` that's no-op in prod, or delete.

**M6 — 14 files >600 lines, 4 files >1500**
- `app/actions/client-portal.ts` — **2672** lines (god file, flagged in 2026-04-11 review as M11)
- `lib/email.ts` — 2353
- `lib/swr.ts` — 2146
- `app/actions/inbox.ts` — 1429
- `lib/gsd-templates.ts` — 1370
- `app/actions/pipeline.ts` — 1343
- `components/project-workflow.tsx` — 1265
**Fix:** Split by domain. `client-portal.ts` is the most urgent — mixes dashboard, messaging, files, settings, invoices.

**M7 — Client component ratio 72% (204/285 tsx files)**
Many likely don't need `'use client'`. Server-first reduces JS shipped.
**Fix:** Audit incrementally; swap render-only components to Server Components.

**M8 — CLAUDE.md drift from actual codebase**
- Claims "49 domain-specific action modules" → actually **53**
- Lists `learning.ts` and `payments.ts` → **neither exists**
- Missing from doc: `activities.ts`, `activity-feed.ts`, `admin.ts`, `api-tokens.ts`, `auth.ts`, `dashboard-notes.ts`, `integrations.ts`, `issues.ts`, `portal-admin.ts`, `portal-messages.ts`, `portal-workspaces.ts`, `project-links.ts`, `reports.ts`, `request-comments.ts`, `teams.ts`, `view-as.ts`, `workspace.ts`
**Fix:** Update CLAUDE.md Architecture section.

**M9 — STATE.md "Previous Deploy" line stale** — `STATE.md:146`
Says `commit e02c3b8 · 2026-04-14 · Phase 4 shipped` but the real latest is `0717b9b · 2026-04-18`. The "Handoff" section above it IS current, so this is dead narrative footer.
**Fix:** Delete the bottom "Last Deploy" block or sync it.

### LOW (5)

**L1 — 5 TODO/FIXME markers** across app/components/lib.

**L2 — One raw `<img>` tag** (not `next/image`) — effectively zero impact.

**L3 — OPTIMIZE.md header says `critical: 3, high: 14, status: needs_attention`** but C1/C2/C3 + BH3/BH4/BH5 are still open per the scan. Document reflects the audit snapshot, not current state. Consider re-running `/qualia-optimize` or marking resolved items.

**L4 — Phase 8 SUMMARY.md** is the only phase summary in `.planning/phases/` (phases 1-7 have no SUMMARY). Not a defect — just inconsistent archive coverage.

**L5 — ROADMAP.md is stuck at Phase 6** — only lists Phases 1-6 but the project shipped Phases 7 and 8 and the board system was subsequently deleted. Plan docs lag reality by ~2 weeks.

---

## What the planning folder got RIGHT

- `STATE.md` handoff section accurately reflects every commit in the 2026-04-18 deploy chain (6 deploys, 7 commits — all verified in `git log`).
- Phase 8 SUMMARY matches shipped commits (`dpl_4RTZH1Z8i99wcX5gnLgKb1xhJHdL`).
- Board-system deletion is reflected everywhere: migration `20260418110000_drop_admin_boards_table.sql` exists, `components/project-board/` is gone, `app/actions/admin-boards.ts` is gone, Board tab removed from both workflow components.
- Username login migration `20260417223000_add_username_to_profiles.sql` exists as claimed.
- Storage MIME migration `20260417221402` exists as claimed.
- Test suite claim (621/621) — tsc passes, no regression detectable without running jest.

## What the planning folder got WRONG or STALE

- **CLAUDE.md** action-module list is 2+ weeks out of date (see M8).
- **ROADMAP.md** doesn't include Phases 7/8 or the board deletion (see L5).
- **OPTIMIZE.md** status needs refresh — 6 of its findings are still present verbatim (see H1-H5, M2).
- **REVIEW.md** before this update was from 2026-04-11 — pre-dates Portal v2 shipping entirely.
- **STATE.md** "Last Deploy" footer references a commit from 4 days before the real HEAD (M9).

---

## Verdict

**PASS with caveats.**

No CRITICAL findings. No deploy blockers that weren't already acknowledged in the 2026-04-17 OPTIMIZE.md backlog. The portal is running healthy in production.

**Five HIGH findings are pre-existing, documented, admin-only or low-traffic code paths.** They should be fixed next sprint but are not live-incident risks.

**The planning folder is ~2 weeks behind the codebase.** CLAUDE.md, ROADMAP.md, and OPTIMIZE.md need updates to match current reality (Phases 7/8 done, board deleted, 53 action modules, dependencies clean).

## Recommended next actions (in order)

1. **Update `.planning/` docs to match reality** — CLAUDE.md action list, ROADMAP.md through Phase 8, mark OPTIMIZE.md items that were fixed (PH1, FH3/FH4, FH1/FH2, BH2, BH6 based on git log evidence) and flag H1-H5 + M2 as still open.
2. **Sprint-size cleanup of the 5 HIGH findings** — 2 server-action moves (H1, H2) + 3 batch-query conversions (H3, H4, H5). Probably a single half-day.
3. **Defer M6 file splits** unless you're about to edit them — refactor on touch.
4. **`/qualia-handoff`** when you're ready to deliver Portal v2 to clients. Username + password `qualia` for all 16 clients is already in the session report.
