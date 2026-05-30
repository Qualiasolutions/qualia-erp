# B1 — ERP auto-capture: implementation plan

> Goal (`docs/erp-goal.md` §B1): make the ERP reflect reality without anyone running a manual report.
> Today reports only arrive from a deliberate `/qualia-report`; half the team works off-rails and never
> runs it. B1 = reports become automatic at ship/session-end, tagged `source: "auto"` vs `"manual"`.
> Grounded against the real code; nothing here invents a contract.

## Scope split

- **ERP side (this repo)** — owns ingest + storage + display of the `source` flag. The API already has
  the full dedupe/idempotency/dry-run machinery; B1 adds one field end-to-end.
- **Framework side (`~/qualia-framework`, companion change)** — auto-POST at session-end. Tracked
  separately; coordinated via the same contract (`docs/framework-contract.md` ↔ framework `docs/erp-contract.md`).

---

## ERP side (qualia-erp) — 4 tasks

### T1 — Migration: add `source` to `session_reports`

`supabase/migrations/{ts}_session_reports_source.sql` (CLI-generated timestamp; never hand-edit remote):

```sql
alter table public.session_reports
  add column source text not null default 'manual'
  check (source in ('auto','manual'));
comment on column public.session_reports.source is
  'auto = observed at ship/session-end; manual = deliberate /qualia-report';
```

- `not null default 'manual'` → existing rows + any client that omits `source` stay correct (backward compatible). No index needed (the dedupe key `(framework_project_id, client_report_id)` is unchanged).
- Apply via `npx supabase` through CI/staging → production. Then `npx supabase gen types`.

### T2 — Ingest: accept `source` (`app/api/v1/reports/route.ts`)

- Add to `payloadSchema` (route.ts:56): `source: z.enum(['auto','manual']).optional().default('manual')`.
  Default `'manual'` preserves every existing caller.
- Add to the `row` object (route.ts:497–526): `source: body.source`.
- **Preserve unchanged** (acceptance-critical): the upsert dedupe on `(framework_project_id, client_report_id)` (route.ts:556), the Idempotency-Key 24h replay (route.ts:465), and `dry_run` handling (route.ts:191, 324, 526). `source` is additive — it does not enter the dedupe key.

### T3 — Reads: surface `source`

- `app/actions/reports.ts` + `app/actions/work-sessions.ts`: include `source` in the selected columns + the returned type so B2 dashboards can distinguish observed vs self-reported. Keep the default `.neq('dry_run', true)` filter.
- Regenerate DB types after T1 so `source` is typed end-to-end.

### T4 — Test

- Extend `__tests__/api/...reports...` (mirror existing route tests): POST with `source:'auto'` persists `source='auto'`; POST omitting `source` defaults to `'manual'`; an `auto` retry with the same `(framework_project_id, client_report_id)` still upserts (dedupe intact); `dry_run` still skips.

**ERP Done when:** a record posted with `source:'auto'` lands in `session_reports` tagged `auto`, idempotent on retry, dedupe/dry-run intact, and reads expose `source`.

---

## Framework side (qualia-framework) — companion change, separate branch

### F1 — `bin/report-payload.js`

- `buildPayload(options)` (report-payload.js:74) already assembles the payload (project_id, client_report_id, durations, commit hashes). Add `source: options.source || env.QUALIA_REPORT_SOURCE || 'manual'` to the returned payload. `/qualia-report` passes nothing → stays `'manual'`.

### F2 — Auto-POST at session-end (`hooks/stop-session-log.js`)

- Today this hook does **not** POST to the ERP (verified: no fetch/POST). Add: on session-end with shippable work, build the payload with `source:'auto'` and POST to `/api/v1/reports` using the existing contract — bearer `qlt_*` (or legacy `CLAUDE_API_KEY`), a fresh `Idempotency-Key` (uuid), and `client_report_id` sequencing so retries dedupe.
- **Guards:** no-op when no ERP token configured; honor existing dry-run; don't double-post if `/qualia-report` already ran this session (sequence by `client_report_id`). Fail-soft — a session must never fail because the ERP is unreachable.

**Framework Done when:** finishing real work in a repo produces a `session_reports` row with no manual command, idempotent on retry, tagged `source:'auto'`.

---

## Sequencing & risk

1. **T1 migration first** (staging → prod) — additive, backward compatible, reversible (`drop column`).
2. **T2 + T3 + T4** (ERP ingest/read/test) — one PR on a fresh branch off `master` _after the refactor PR #154 lands_ (avoid mixing).
3. **F1 + F2** (framework) — separate PR in `qualia-framework`; can develop in parallel but verify end-to-end against the deployed ERP `source` support.

- **Lowest-risk order**: ship ERP `source` support first (accepts both, defaults manual → zero impact on current manual reports), THEN turn on framework auto-POST. The ERP tolerates auto records before the framework sends them.
- Not in B1: B2 dashboards consume `source` — separate workstream, after this.
