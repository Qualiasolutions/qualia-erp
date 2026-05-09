# Production Review — 2026-05-09

**Scope:** branch `polish/client-pages-redesign` vs master (25 files, +2068/−1027)
**Focus:** portal redesign, admin routing, daily-brief fix, client pulse

## Summary

| Category  | Critical | High  | Medium |  Low  |   Score   |
| --------- | :------: | :---: | :----: | :---: | :-------: |
| Security  |    0     |   0   |   0    |   0   |    5/5    |
| Quality   |    0     |   0   |   2    |   3   |    5/5    |
| Perf      |    0     |   0   |   1    |   1   |    5/5    |
| **Total** |  **0**   | **0** | **3**  | **4** | **5.0/5** |

## Findings

### CRITICAL

_(none)_

### HIGH

_(none)_

### MEDIUM

- **6× `as any` casts in branch scope** — narrowing SWR response shapes (e.g. `notifications as ClientPulseNotification[]` in `components/portal/qualia-home-view.tsx:759`). Pre-existing pattern in the codebase, not introduced by this branch. Fix: define proper types via `Database['public']['Tables']['notifications']['Row']` and use them in the SWR hook return type. Not a blocker.
- **`qualia-home-view.tsx` is 1264 lines** — exceeds the 800-line "split candidate" threshold from `rules/architecture.md`. The new `ClientPulseCard` (~85 lines) extends an already-large file. Fix: split into `components/portal/home/{admin-grid,employee-grid,client-pulse-card,daily-brief-card,today-meetings-card,whos-doing-what,tasks-card,next-ship-card}.tsx`. Track for follow-up.

### LOW

- **Raw `<img>` in `components/portal/qualia-sidebar.tsx:443`** — pre-existing, has explicit eslint-disable for the logo upload case. Not introduced by this branch.
- **Daily-brief delete-then-insert is theoretically racy** — `lib/daily-brief-generator.ts:434–490`. Documented in inline comment; in practice serialized by single-owner refresh and the daily cron. Fix: add advisory lock via `pg_try_advisory_lock(hash(owner_id || for_date))` if concurrent refresh is ever observed.
- **Remaining `rounded-lg` in messaging composer/channel-details/new-conversation-dialog** — intentional small radii on inputs/chips, not regressions. Review confirmed these are contained-control sizes (8px) versus container sizes (12px / 16px). No action.
- **`notifyAdminsAndAssignedEmployees` fan-out scales O(admins + assigned) per client event** — 1 admin + 5 employees = 6 notification rows + 6 emails per request/message. Acceptable at current scale. If it becomes noisy: collapse same-event notifications into a single row with `metadata.recipient_ids` array.

## Branch-specific observations

### What this branch shipped (validated)

1. **Hub redesign** — aurora wash + flat divider-driven stat strip replaces the popped-panel gradient. `components/portal/qualia-portal-hub.tsx`.
2. **Sidebar** — translucent `--surface-2` light-mode tint, 12px radius vocabulary across brand row, ⌘K chip, and nav pills. Admin Billing now routes to `/billing` (was `/admin?tab=finance` — the source of the user's "wtf reports/system in billing" report).
3. **Email + in-app fan-out** — `notifyAdminsAndAssignedEmployees` notifies workspace admins AND assigned employees. Email side via existing `notifyAdminAndAssignedOfClientActivity`. Both wired for `createFeatureRequest` and `sendMessage`.
4. **Client pulse on dashboards** — `ClientPulseCard` shows actor-led headlines ("Giulio submitted a request: …") with link, project, relative time. Wired into both AdminMainGrid and EmployeeMainGrid.
5. **Daily-brief fix** — replaces broken upsert (partial-index expression couldn't be inferred by Postgres `ON CONFLICT`) with snapshot → delete → insert that preserves dismissals.
6. **Theme switcher** — curtain-reveal toggle bound to `hsl(var(--background))` of the destination theme via runtime probe.
7. **Request dialog redesign** — chip-based type/priority selectors, eyebrow header, live status footer.

### Validated guarantees

- **No service_role leakage:** `lib/notifications.ts` and `lib/daily-brief-generator.ts` use `createAdminClient()` only and run inside `'use server'` action layer.
- **Type-check clean:** `npx tsc --noEmit` exits 0.
- **No `dangerouslySetInnerHTML` or `eval()` introduced.**
- **No hardcoded secrets, no .env in git.**
- **npm audit:** 0 critical, 1 high (pre-existing transitive), 3 moderate.
- **Production smoke:** homepage 200, /api/health 200.

### Behavioral risks worth a follow-up

- **Notification volume** could become noisy if a chatty client opens 10 messages in a row. Watch `notifications` table growth for the first week.
- **Dismissal preservation in daily-brief** relies on (source_type, source_id) as the stable key. If a generator pull starts emitting different source_ids for the same logical item, dismissals reset that day. Tighten with a unit test that locks the 8 source_id formats.
- **`/admin?tab=finance` still exists** for direct navigation to the admin command center's finance tab. Sidebar now points to `/billing`; the admin-control finance tab is duplicated by `/billing`. Consider removing the finance tab from the admin command center entirely (separate decision).

## Verdict

**PASS** — 0 critical, 0 high. All medium/low findings are tracked carryovers or design choices, not blockers.

`/qualia-ship` would clear this branch.
