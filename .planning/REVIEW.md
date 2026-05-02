# Production Review — 2026-05-02

Project: Qualia ERP / Portal v2 — live at https://portal.qualiasolutions.net
Branch: `feat/daily-brief-done-toggle` · Phase: M5 Rolling Polish

## Summary

| Category  | Critical | High  | Medium       | Low          | Score     |
| --------- | -------- | ----- | ------------ | ------------ | --------- |
| Security  | 0        | 0     | 0            | 0            | **5/5**   |
| Quality   | 0        | 0     | 1 (deferred) | 1 (accepted) | **5/5**   |
| Perf      | 0        | 1     | 2            | 1            | **4/5**   |
| **Total** | **0**    | **1** | **3**        | **2**        | **4.7/5** |

**Updated 2026-05-02 post-cleanup:** All 3 HIGH closed (commit `1eb07a4a`). M1, M2 closed in same commit. L5 fixed. L1/L3/L4 verified as false positives (re-graded). M3 explicitly deferred to M5b. M4/L2 accepted as-is.

**Verdict:** PASS — no critical, no security blockers. Quality has 3 HIGH findings worth fixing in a single commit (low-effort cleanup). Perf is fine at this scale; M5 candidate 5b (god-module split) addresses the bundle concern when it becomes user-visible.

---

## Findings

### CRITICAL (0)

None. Real positives worth noting:

- `service_role` only appears in server-side code (`lib/supabase/server.ts`, server actions, API routes) — verified via grep with client-side filter
- 0 `.env` files tracked in git
- 0 `dangerouslySetInnerHTML`, 0 `eval(`
- `npm audit`: 0 critical / 0 high / 0 moderate / 0 low (the "24 transitive Dependabot vulns" claim in JOURNEY.md M5d is **stale** — they've been resolved or never applied to this project's production lockfile; clean as of today)
- TypeScript: 0 errors
- ESLint: 0 errors, 1 warning (`react-hooks/exhaustive-deps` in `presence-broadcaster.tsx:51`)
- All 9 API routes under `app/api/` use auth/session/cron-secret/webhook-signature guards

### HIGH (3)

**H1. `supabase-check` cron exists but is NOT registered — silent fail.**

- `app/api/cron/supabase-check/route.ts` exists (full implementation)
- `vercel.json` registers 8 crons; `supabase-check` is not in the list
- Effect: the daily Supabase health check **never runs** in production. Whatever it was supposed to monitor has been silently invisible since this route was added.
- Fix: add `{ "path": "/api/cron/supabase-check", "schedule": "10 5 * * *" }` to `vercel.json` crons array, or delete the route if unused.

**H2. Manager role dead code in billing page — wrong access logic.**

- `app/(portal)/billing/page.tsx:27` — `const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';`
- Per CLAUDE.md and `types/database.ts`: `user_role` enum is `admin` / `employee` / `client` — manager was removed 2026-04-18.
- Effect: the `=== 'manager'` half is unreachable, but the intent is unclear — was this supposed to be a specific role check? Code reads like an admin-OR-something check that no longer makes sense.
- Fix: simplify to `const isAdmin = profile?.role === 'admin'`. Audit whether the `||` was a workaround for a prior bug.

**H3. Stale tests for `createTasksFromMilestone` (singular) — tests cover unused function.**

- `app/actions/auto-assign.ts:275` exports `createTasksFromMilestone` (singular). Production callers use `createTasksFromMilestones` (plural) everywhere (`project-assignments.ts:217`, `:398`, webhook).
- The singular is referenced ONLY in test files: `__tests__/actions/auto-assign.test.ts`, `__tests__/actions/project-assignments.test.ts`, `__tests__/api/github-webhook-cascade.test.ts`.
- Effect: ~30 test assertions exercise a function production never invokes. Test coverage that protects nothing real.
- Fix: pick one — either delete `createTasksFromMilestone` (singular) and the tests covering it, or migrate the tests to cover `createTasksFromMilestones` (plural) properly. The singular looks like an evolutionary leftover.

### MEDIUM (4)

**M1. `isManagerOrAbove` alias still exposed in admin-provider despite manager role gone.**

- `components/admin-provider.tsx:21` declares `isManagerOrAbove: boolean`, line 165: `const isManagerOrAbove = isAdmin;`
- 4 references to this alias remain. Confusing — readers expect a different role tier exists.
- Fix: rename to `isAdmin` everywhere and remove the alias. Pure search-and-replace.

**M2. `/inbox` route depends on next.config.ts redirect to not render blank.**

- `app/(portal)/inbox/page.tsx` returns `null`. The redirect is configured in `next.config.ts:redirects()`.
- It works today (verified — redirect block exists). But the page file is decoupled from its own behavior — if someone removes the redirect from `next.config.ts`, this becomes a silent blank page.
- Fix: either replace `return null` with a server-side `redirect('/tasks')` (Next.js `next/navigation`), making the contract explicit and self-contained, or add a comment block explicitly tying the file to the config-side redirect.

**M3. Heaviest files exceed 1500 LOC — god-modules.** **DEFERRED → M5b.**

- `lib/email.ts` — 2404 LOC
- `lib/swr.ts` — 2300 LOC (37 hooks + 33 invalidation fns; documented in CLAUDE.md)
- `app/actions/inbox.ts` — 1820 LOC
- `components/project-workflow.tsx` — 1420 LOC
- `lib/qualia-framework-templates.ts` — 1370 LOC
- Splitting these is a multi-hour planned refactor with regression risk, not cleanup. Lives as **M5b "God-module split + use-cache"** in JOURNEY.md until perf becomes user-visible.

**M4. 35 `eslint-disable` comments** — accepting as-is. Spot-checked sample: most are legitimate (test type casts, intentional dep-array exclusions, JSON.parse `any`, third-party gaps). Adding `// reason:` to all 35 is busywork without clear payoff; revisit if a specific disable is suspected of hiding a real bug.

### LOW (5)

**L1. 25 console.log** — **FALSE POSITIVE.** All are intentional structured ops logs in cron/webhook routes (e.g. `[cron/blog-tasks]`, `[Vercel Webhook]`). Vercel captures them in function logs; they're load-bearing for observability. No action needed.

**L2. 18 `any` type usages** — accepting as-is. Mostly third-party type gaps (e.g. Supabase chain types, jest mock casts). Tightening would require investigation per-site for marginal gain.

**L3. 25 TODO/FIXME/HACK/XXX markers** — **FALSE POSITIVE.** Re-grep with proper regex returns 0 matches; the original count was a tooling artifact. No action needed.

**L4. 2 raw `<img>` tags** — **FALSE POSITIVE.** Both (`portal-welcome-tour.tsx:344`, `qualia-sidebar.tsx:464`) already have `// eslint-disable-next-line @next/next/no-img-element` with intentional reason: dynamic cache-bust URLs don't fit `next/image`'s known-dimensions pattern. No action needed.

**L5. ESLint warning** in `presence-broadcaster.tsx:51` — **FIXED 2026-05-02.** Added `eslint-disable-next-line react-hooks/exhaustive-deps` with a reason comment explaining why `pathname` is intentionally excluded (the second useEffect handles route changes without re-subscribing).

---

## Things that DO NOT work / silent fails — explicit list

User's specific ask. Above findings restated as a punch-list:

1. **`supabase-check` daily cron — not running.** Code exists, schedule does not. Silent.
2. **Manager-role check in billing page — vestigial.** Compiles, runs, never matches the missing half.
3. **Singular `createTasksFromMilestone` + its tests — orphan.** Production never reaches it; tests assert behavior that doesn't ship.
4. **`/inbox` page — blank without next.config.ts.** Implicit cross-file dependency.
5. **`isManagerOrAbove` everywhere — naming lie.** Maps to plain `isAdmin`.

---

## Duplication & dead code — verified non-issues (worth noting)

These looked suspicious but check out:

- **`task-detail-dialog.tsx` ×2** — `components/task-detail-dialog.tsx` (329 LOC, admin) and `components/portal/task-detail-dialog.tsx` (178 LOC, employee read-only) are **intentionally split by role**, both actively imported. By design.
- **Two `chat` API routes** — `/api/chat` (general AI) and `/api/knowledge/chat` (knowledge base RAG). Different surfaces. By design.
- **`createTasksFromPhases = createTasksFromMilestones` alias** — backwards-compat re-export for old callers. Cheap, intentional.

---

## Recommended cleanup commit

One commit, one PR, ~30 minutes work. Closes H1, H2, H3, M1, M2 (5 findings, all HIGH + 2 MEDIUM):

```
fix(cleanup): retire manager-role dead code, register supabase-check cron, drop orphan singular createTasksFromMilestone

- vercel.json: register supabase-check cron
- app/(portal)/billing/page.tsx: drop ` || profile?.role === 'manager'`
- components/admin-provider.tsx: rename isManagerOrAbove → isAdmin everywhere, remove alias
- app/actions/auto-assign.ts: delete singular createTasksFromMilestone
- __tests__/: drop the 3 stale test blocks covering the singular
- app/(portal)/inbox/page.tsx: replace `return null` with `redirect('/tasks')` (server-side)
```

That single commit takes the project from 3.7/5 to ≈4.5/5.

---

## What I did NOT find

- No `service_role` leakage to client
- No tracked secrets
- No XSS sinks (`dangerouslySetInnerHTML` / `eval`)
- No `.env*` in git
- No empty `catch {}` blocks
- No npm audit vulnerabilities
- No TS errors
- No ESLint errors (1 warning only)
- No unauthenticated API routes

This codebase is in healthy shape. The findings above are housekeeping, not firefighting.
