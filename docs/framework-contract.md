# Framework ↔ ERP Contract

> **Source of truth:** this document is a vendored copy of
> [`qualia-framework/docs/erp-contract.md`](https://github.com/Qualiasolutions/qualia-framework/blob/main/docs/erp-contract.md).
> Update it there first, then sync here with `cp ~/qualia-framework/docs/erp-contract.md docs/framework-contract.md`.
>
> **Last synced:** 2026-04-19 (framework v4.0.4).

This document specifies the API shape between the Qualia Framework (client)
and this ERP (`portal.qualiasolutions.net`). Every `/qualia-report` run from
a framework project POSTs a structured payload to `POST /api/v1/reports`
on this backend.

## Configuration

Stored in `~/.claude/.qualia-config.json`:

```json
{
  "erp": {
    "enabled": true,
    "url": "https://portal.qualiasolutions.net",
    "api_key_file": ".erp-api-key"
  }
}
```

The API key is read from `~/.claude/.erp-api-key` (file mode 0600).

## Endpoints

### POST /api/v1/reports

Upload a session report.

**Headers:**

```
Authorization: Bearer <api-key>
Content-Type: application/json
Idempotency-Key: <uuid>   # optional; 24h replay window — see below
```

**Idempotency-Key behavior (v3.6+):**
When present, must be a valid UUID. Replays of the same key within 24h return
the original `report_id` with `Idempotent-Replay: true` response header and
200 status — no new row is created. Invalid UUID format returns 400.
Independent of `client_report_id` UPSERT (both can be used together; see
below).

**Request Body:**

```json
{
  "project": "client-project-name",
  "project_id": "qs-acme-portal",
  "team_id": "qualia-solutions",
  "git_remote": "github.com/QualiasolutionsCY/acme-portal",
  "client": "Client Name",
  "client_report_id": "QS-REPORT-03",
  "milestone": 2,
  "milestone_name": "Core Product",
  "milestones": [
    {
      "num": 1,
      "name": "Foundation",
      "closed_at": "2026-04-10T18:00:00Z",
      "phases_completed": 3,
      "tasks_completed": 12
    }
  ],
  "phase": 2,
  "phase_name": "Authentication & Dashboard",
  "total_phases": 4,
  "status": "built",
  "tasks_done": 5,
  "tasks_total": 5,
  "verification": "pass",
  "gap_cycles": 0,
  "build_count": 12,
  "deploy_count": 3,
  "deployed_url": "https://client.vercel.app",
  "lifetime": {
    "tasks_completed": 23,
    "phases_completed": 8,
    "milestones_completed": 1,
    "total_phases": 8,
    "last_closed_milestone": 1
  },
  "session_started_at": "2026-04-12T13:45:00Z",
  "session_duration_minutes": 45,
  "last_pushed_at": "2026-04-12T14:25:00Z",
  "commits": ["abc1234", "def5678"],
  "notes": "Completed auth flow, dashboard layout, and API routes.",
  "submitted_by": "Fawzi Goussous",
  "submitted_at": "2026-04-12T14:30:00Z"
}
```

**`gap_cycles` polymorphism (v3.5+):** in `tracking.json` (the file the ERP
reads from git for passive monitoring) `gap_cycles` is an OBJECT keyed by
phase number — `{"1": 0, "2": 1}`. In the POST `/api/v1/reports` body,
`/qualia-report` flattens to a NUMBER for the current phase. Receivers must
accept both shapes: if object, use `gap_cycles[String(phase)] || 0`.

**Response (200 OK):**

```json
{
  "ok": true,
  "report_id": "QS-REPORT-03",
  "message": "Report received"
}
```

`report_id` semantics:

- **v4.0.4+ payloads** (`client_report_id` present): ERP echoes the
  `client_report_id` string back as `report_id` for display consistency.
  Example: request sends `client_report_id: "QS-REPORT-03"` → response
  returns `report_id: "QS-REPORT-03"`.
- **Legacy payloads** (no `client_report_id`): ERP returns its internal UUID
  (e.g. `"a5304d8b-a5ac-4e22-b0c0-fed5f50299bb"`) as `report_id`.

**Idempotent UPSERT on retry (v4.0.4+):**
When BOTH `project_id` and `client_report_id` are present, the ERP treats
`(project_id, client_report_id)` as a unique key and UPSERTs. Retries after
a transient failure produce the same row and return the same `report_id`
— no duplicate. This is stronger than the 24h Idempotency-Key window (which
is exact-replay only) because `client_report_id` uniqueness is enforced
permanently.

**Response (401 Unauthorized):**

```json
{
  "ok": false,
  "error": "INVALID_API_KEY",
  "message": "API key is invalid or expired"
}
```

**Response (422 Unprocessable Entity):**

```json
{
  "ok": false,
  "error": "VALIDATION_FAILED",
  "message": "Missing required field: project"
}
```

### GET /api/v1/reports/:project

Retrieve reports for a project.

**Headers:**

```
Authorization: Bearer <api-key>
```

**Response (200 OK):**

```json
{
  "ok": true,
  "reports": [
    {
      "report_id": "rpt_abc123def456",
      "phase": 2,
      "status": "built",
      "submitted_at": "2026-04-12T14:30:00Z",
      "submitted_by": "Fawzi Goussous"
    }
  ]
}
```

### GET /api/v1/tracking/:project

Retrieve current tracking state (same shape as tracking.json).

**Headers:**

```
Authorization: Bearer <api-key>
```

**Response (200 OK):**

```json
{
  "ok": true,
  "tracking": {
    "project": "client-project-name",
    "milestone": 2,
    "phase": 2,
    "total_phases": 4,
    "status": "built",
    "last_updated": "2026-04-12T14:30:00Z",
    "lifetime": {
      "tasks_completed": 23,
      "phases_completed": 8,
      "milestones_completed": 1,
      "total_phases": 8
    }
  }
}
```

## Behavior

- When `erp.enabled` is `false`, `/qualia-report` skips the upload silently.
- When the API key file is missing or empty, the upload is skipped with a warning.
- Network failures are non-blocking — the report is saved locally regardless.
- The ERP reads `tracking.json` directly from git for real-time status (no API call needed for passive monitoring).
- Reports are append-only — no PUT/PATCH/DELETE endpoints exist for
  external callers. Internal idempotent UPSERT on `(project_id,
client_report_id)` retries is the one exception (see "Idempotent UPSERT
  on retry" above).
- **`dry_run` retention (v4.0.4+):** The ERP deletes rows where
  `dry_run = true AND submitted_at < now() - 7 days` via a daily cron at
  03:00 UTC. Production report views (list, project tree, email digests)
  exclude `dry_run = true` rows at read time by default. Admins can opt in
  via `includeDryRun: true` on the server-action readers for diagnostics.
- `tracking.json` includes `milestone` and `lifetime` fields (added in v3.4). These survive across milestone resets and `state.js init` calls. For aggregate reporting, use `lifetime.total_phases` + current `total_phases` for the grand total across all milestones.
- Backward compatibility: if `lifetime` is absent in tracking.json, treat all counters as 0 and `milestone` as 1.

## Required Fields

| Field              | Type    | Required              | Description                                                                                                                                                                                                      |
| ------------------ | ------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| project            | string  | yes                   | Project slug from tracking.json                                                                                                                                                                                  |
| phase              | number  | yes                   | Current phase number                                                                                                                                                                                             |
| status             | string  | yes                   | Current status (setup, planned, built, verified, etc.)                                                                                                                                                           |
| submitted_by       | string  | yes                   | Team member name                                                                                                                                                                                                 |
| submitted_at       | string  | yes                   | ISO 8601 timestamp                                                                                                                                                                                               |
| milestone          | number  | recommended           | Current milestone number (1-indexed)                                                                                                                                                                             |
| milestone_name     | string  | recommended (v4+)     | Human name of the current milestone — from JOURNEY.md / tracking.json                                                                                                                                            |
| milestones         | array   | recommended (v4+)     | Array of closed milestone summaries: `{num, name, closed_at, phases_completed, tasks_completed}`. Renders the journey tree on the ERP.                                                                           |
| lifetime           | object  | recommended           | Cumulative counters — tasks_completed, phases_completed, milestones_completed, total_phases, last_closed_milestone                                                                                               |
| project_id         | string  | recommended (v3.6+)   | Stable per-project identifier — preferred dedupe key over `project` slug. Survives directory renames.                                                                                                            |
| team_id            | string  | recommended (v3.6+)   | Installation's team identifier. Composite `(team_id, project_id)` is the canonical project key.                                                                                                                  |
| git_remote         | string  | optional (v3.6+)      | e.g. `github.com/QualiasolutionsCY/foo`. Lets the ERP correlate tracking with the source repo.                                                                                                                   |
| session_started_at | string  | optional (v3.6+)      | ISO 8601 — when the current Claude Code session began.                                                                                                                                                           |
| last_pushed_at     | string  | optional (v3.6+)      | ISO 8601 — distinct from `last_updated` (which fires on local writes too).                                                                                                                                       |
| build_count        | number  | optional (v3.6+)      | Lifetime build counter.                                                                                                                                                                                          |
| deploy_count       | number  | optional (v3.6+)      | Lifetime deploy counter.                                                                                                                                                                                         |
| client_report_id   | string  | recommended (v4.0.4+) | Client-side sequential identifier: `QS-REPORT-01`, `QS-REPORT-02`, … per-project. Stable across retries. Preferred dedupe key over the ERP-generated `report_id`; safe to adopt as the ERP's primary report key. |
| dry_run            | boolean | optional (v4.0.4+)    | `true` marks a synthetic ping (from `qualia-framework erp-ping`). Receivers should filter these out of production report views.                                                                                  |

All other fields are optional but recommended for complete reporting.

## Rate Limits

- 60 requests per minute per API key
- Report body max size: 64KB
- No batch endpoint — one report per request

## Security

- API keys are per-user, not per-project
- Keys expire after 90 days (re-issue via Fawzi)
- All traffic is HTTPS-only
- No PII beyond team member names is transmitted

---

## ERP-side implementation notes

Mapping from contract fields to this ERP's schema. See
`app/api/v1/reports/route.ts` for the full ingest handler and
`supabase/migrations/20260418160000_*`, `20260419120000_*`,
`20260419130000_*` for the schema evolution.

### Database

All reports land in `session_reports` (RLS: service_role-only).
Payload fields map as follows:

| Contract field                  | DB column                                     | Notes                                                                   |
| ------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| `project`                       | `project_name`                                | Human display name                                                      |
| `project_id`                    | `framework_project_id`                        | Framework's stable slug                                                 |
| `team_id`                       | `team_id`                                     |                                                                         |
| `client_report_id`              | `client_report_id`                            | Format `QS-REPORT-NN`, per-project sequential                           |
| `dry_run`                       | `dry_run`                                     | `boolean NOT NULL DEFAULT false`                                        |
| `milestones`                    | `milestones`                                  | `jsonb`                                                                 |
| `gap_cycles` (number or object) | `gap_cycles` (int) + `gap_cycles_raw` (jsonb) | Polymorphism flattened to current phase; full shape preserved in `_raw` |
| everything else                 | same-name column                              | See `types/database.ts` → `session_reports.Row`                         |

### Unique constraints

- `session_reports_client_report_id_uniq` — plain UNIQUE on
  `(framework_project_id, client_report_id)`. Plain (not partial) so
  Supabase's `.upsert({...}, { onConflict: 'framework_project_id,client_report_id' })`
  resolves correctly. Composite-UNIQUE NULL semantics (pre-PG15 default)
  allow multiple rows where either column is NULL — so legacy v3.x payloads
  coexist with v4.0.4 UPSERT rows.

### Read-path filter

Every production read of `session_reports` applies `.neq('dry_run', true)`
by default. Exported readers accept an `{ includeDryRun?: boolean }` option
for admin diagnostics:

- `getFrameworkReports`, `getFrameworkReportsStats`, `getFrameworkReportsProjects` (in `app/actions/reports.ts`)
- `hasStructuredReportForSession`, `getSessionReportsForProject` (in `app/actions/work-sessions.ts`)

### Retention

`app/api/cron/cleanup-dry-run-reports/route.ts` deletes `dry_run=true` rows
where `submitted_at < now() - 7 days`. Runs daily at 03:00 UTC via
`vercel.json`. Partial index `session_reports_dry_run_expiry_idx` keeps
the DELETE cheap.

### Admin UI

`app/(portal)/admin/reports/framework-reports-tab.tsx` renders reports with
a "Report" column showing `client_report_id` when present (format
`QS-REPORT-NN`, font-mono tabular), or a short UUID prefix in muted style
for legacy rows.

### Auth

`app/api/v1/reports/route.ts` accepts two auth paths:

1. `qlt_*` bearer tokens from `api_tokens` (per-user, preferred)
2. Legacy `CLAUDE_API_KEY` shared key (grandfathered; responses include
   `Deprecation` + `Sunset` headers per RFC 8594)

### gap_cycles polymorphism

Implemented in `app/api/v1/reports/route.ts` via `flattenGapCycles()` —
accepts either a number (legacy) or `{[phase]: cycles}` object. Stores
the current phase's number in `gap_cycles` (int column) and the full
object in `gap_cycles_raw` (jsonb) for audit.

---

## Rolling the ERP forward with a new framework version

1. Read the updated `docs/erp-contract.md` in the framework repo
2. Diff against this file to find the new fields or response shape changes
3. For each schema change: write a new migration in `supabase/migrations/`
4. For each field: update the Zod schema in `app/api/v1/reports/route.ts`
5. If a new identifier format is introduced: update the Framework Reports
   admin tab to render it
6. Run the 4 verification curl round-trips against staging / prod before
   declaring the sync shipped
7. `cp ~/qualia-framework/docs/erp-contract.md docs/framework-contract.md`
   to refresh this vendored copy
