# Phase 29 — Admin Dashboard ↔ Standalone Page Overlap Audit

**Date:** 2026-05-27
**Author:** Phase 29 / Task 1 (architect persona)
**Status:** complete — feeds Tasks 2 & 3 of the same phase

## Purpose

Phase 29's goal states "overlapping pages merged" but no written audit existed to justify which merges already happened, which are still pending, and which surfaces deliberately remain distinct. This file is that artifact.

Two surfaces overlap if **they call the same loader** OR **render the same primary entity at the same level of granularity**. Different timeframes, different aggregations, or different drill-depths over the same data are NOT overlap — they are progressive disclosure.

## Surfaces under audit

**Dashboard tabs** (rendered by `app/(portal)/admin/page.tsx:97` — `AdminControlPage` → `QualiaControl` switch in `app/(portal)/admin/page.tsx:63`):

- **Overview** — `loadOverviewTab()` + `getBillableClients()` at `app/(portal)/admin/page.tsx:65` → `ControlOverview` (`components/portal/control-overview.tsx`)
- **Team** — `loadTeamTab()` at `app/(portal)/admin/page.tsx:74` → `ControlTeam` (`components/portal/control-team.tsx`)
- **Finance** — `loadFinanceTab()` at `app/(portal)/admin/page.tsx:79` → `ControlFinance` (`components/portal/control-finance.tsx`)
- **System** — `loadSystemTab()` at `app/(portal)/admin/page.tsx:84` → `ControlSystem` (`components/portal/control-system.tsx`)

**Standalone pages** (each linked from `AdminSectionNav` at `components/portal/admin-section-nav.tsx:17`):

- **/admin/reports** — `reports/page.tsx:6` → `AdminReportsClient` (calls `getReportData`, `getEmployeeSessionDetail`, plus dynamic `FrameworkReportsTab`)
- **/admin/attendance** — `attendance/page.tsx:14` → `AdminAttendanceClient` (calls `getSessionsAdmin`, `getTeamMembers`)
- **/admin/people** — `people/page.tsx:145` → `getPeopleIndex()` (`app/actions/admin-control/people.ts:82`)
- **/admin/audit** — `audit/page.tsx:16` → `getAuditIndex()` + per-employee deep view at `audit/[id]/deep/page.tsx:17` → `getEmployeeAudit()`

Note: `/admin/audit` is currently **not in `AdminSectionNav`'s rendered set** for the People case — the Audit tab's match swallows `/admin/employee`, which Task 2 corrects. That is a navigation defect, not an overlap.

## Comparison matrix

### Overview (dashboard) vs. standalone pages

| Pair | Verdict |
|------|---------|
| **Overview × /admin/reports** | **NO OVERLAP** — Overview surfaces the *triaged action list* (overdue invoices, blockers, at-risk projects) built by `buildActionRows` at `components/portal/control-overview.tsx:59` over `loadCommandCenter`; `/admin/reports` surfaces *raw timesheet aggregations* per employee/project for a date range via `getReportData` (`app/(portal)/admin/reports/reports-client.tsx:30`). Different entity (action signals vs. hour totals), different cadence (live vs. report period). |
| **Overview × /admin/attendance** | **NO OVERLAP** — Overview shows live "who is clocked in right now" inside the action list (`clock-in` action type at `components/portal/control-overview.tsx:29`); `/admin/attendance` (`app/(portal)/admin/attendance/page.tsx:14`) is the auditable *session log* — every start/stop row for a date range. The Overview signal is a triage hint; the standalone page is the source of record. |
| **Overview × /admin/people** | **NO OVERLAP** — Overview never enumerates people; it lists *actions* with an `owner` string (`components/portal/control-overview.tsx:38`). `/admin/people` (`app/(portal)/admin/people/page.tsx:145`) is the directory of admins / employees / clients via `getPeopleIndex` (`app/actions/admin-control/people.ts:82`). One is a feed of work, the other is a roster. |
| **Overview × /admin/audit** | **NO OVERLAP** — Overview's `at-risk` and `stale` rows aggregate project / report signals; `/admin/audit` (`app/(portal)/admin/audit/page.tsx:16`) is per-employee *performance assessment* prepared for the May scope-planning interview (attendance %, report rate, assessment status). The audit page is interview-cycle scoped, not steady-state operational. |

### Team (dashboard) vs. standalone pages

| Pair | Verdict |
|------|---------|
| **Team × /admin/reports** | **NO OVERLAP** — Team surfaces the *roster + live presence + assignment load* via `loadTeamTab` returning `members` + `liveStatus` + `workload` (`app/actions/admin-control/team.ts:88`, fields at `:70-71`). Reports surfaces *historical hour aggregations* for a date range. Team is "who is here / what are they on right now"; Reports is "what did they do last month". |
| **Team × /admin/attendance** | **NO OVERLAP — adjacent, intentional** — Team shows compact `liveStatus` cards (currently clocked-in members with `TeamMemberStatus`) as a triage hint on the dashboard; `/admin/attendance` is the full session log with date-range filtering and CSV export. Team is real-time presence; Attendance is historical record. Phase 29 keeps both: the dashboard chip exists to make the Sessions link discoverable. |
| **Team × /admin/people** | **NO OVERLAP — but related** — Both render team members, but at different granularity and for different reasons. Team (`control-team.tsx:74`) shows *operational* state (role assignments, live status, project workload, role-change actions); /admin/people (`app/(portal)/admin/people/page.tsx:145`) is the *directory* that also lists clients (admins/employees/clients in three tabs) and is the entry-point to per-person detail pages at `/admin/people/[id]`. The Team tab is task-management; People is identity/roster + drill-down. |
| **Team × /admin/audit** | **NO OVERLAP** — Team shows current operational state; `/admin/audit` shows interview-cycle assessment status. The Audit deep view at `audit/[id]/deep/page.tsx:17` overlaps with `/admin/people/[id]` (both render per-employee detail) — but that overlap is between two *standalone* pages, not between dashboard-tab and standalone-page, so it is out of scope for this matrix and is addressed in Task 2 (people detail becomes the canonical employee surface; audit deep view remains the assessment workflow). |

### Finance (dashboard) vs. standalone pages

| Pair | Verdict |
|------|---------|
| **Finance × /admin/reports** | **NO OVERLAP** — Finance (`loadFinanceTab`, `app/actions/admin-control/finance.ts:158`) surfaces MRR, recurring payments, invoice aging, cash-flow buckets — money. Reports surfaces labour hours and framework session reports — work. The two never share a loader or a row. |
| **Finance × /admin/attendance** | **NO OVERLAP** — orthogonal domains (revenue vs. timesheet). No shared data source, no shared entity. |
| **Finance × /admin/people** | **NO OVERLAP** — Finance lists *clients as billing counterparties* via invoice/recurring rows (e.g. `FinanceClientHealthRow`); /admin/people lists *clients as CRM entities* (display name, lead status, phone). The shared `clients` table is queried with different projections and different intents (settle invoices vs. open profile). |
| **Finance × /admin/audit** | **NO OVERLAP** — completely disjoint domains. |

### System (dashboard) vs. standalone pages

| Pair | Verdict |
|------|---------|
| **System × /admin/reports** | **PARTIAL OVERLAP — intentional summary-vs-detail relationship; NO MERGE** — System (`control-system.tsx:54-58`) renders a *mini* `FrameworkReportsMini` and `FrameworkCompletenessPanel` from `loadSystemTab` (`auditEntries`, `frameworkReports` at `app/actions/admin-control/system.ts:47-48`). The Reports page hosts the *full* Framework Reports tab via `dynamic(FrameworkReportsTab)` (`reports-client.tsx:39`). System gives the at-a-glance pulse; Reports is the drilling surface. **Verdict: NO OVERLAP (merge), keep both** — the System mini is a recognised summary widget, not a duplicate of the full tab. Phase 29 makes no change here. |
| **System × /admin/attendance** | **NO OVERLAP** — System surfaces deploy log + framework reports + API tokens; Attendance surfaces work sessions. Distinct concerns. |
| **System × /admin/people** | **NO OVERLAP** — System's `ApiTokensPanel` (`control-system.tsx:60`) lists *token-assignable profiles* as a sub-component of token management, not a directory. /admin/people is the directory. The two share `profiles` rows but at completely different intent (who has a `qlt_*` token vs. who is on the team). |
| **System × /admin/audit** | **NO OVERLAP** — System's `AuditLogTable` (`components/portal/control-system.tsx:69`) is the *deploy audit log* (Vercel/Supabase change events); `/admin/audit` is the *employee performance audit* for interview prep. Same English word "audit", entirely different domains. The naming collision is unfortunate but the data sources do not overlap. |

## Summary

- **16 cells evaluated; 6 collapsed N/A combos (Finance vs. attendance/audit, System vs. attendance, Overview vs. people pair, etc. are inherently disjoint and were resolved as "NO OVERLAP" without lengthy rationale).**
- **0 cells found to be true duplicates that demand a merge.** All adjacencies are either (a) summary-vs-detail (System mini ↔ /admin/reports framework tab; Team live ↔ /admin/attendance) which is a deliberate IA pattern, or (b) different intent over a shared table (Finance vs. People over `clients`; System tokens vs. People over `profiles`).
- **1 cell flagged as "PARTIAL — keep both"** (System × /admin/reports) — justified above; no action required.
- **1 standalone-vs-standalone overlap** noted out of scope but actionable: `/admin/employee/[id]` (legacy 4-tab shell) vs `/admin/people/[id]` (new 4-tab shell). Task 2 of this phase makes `/admin/people/[id]` canonical and redirects the legacy path.

## Decisions

Phase 29's Task 2 and Task 3 take the following actions; the audit above is the justification:

1. **No dashboard-tab ↔ standalone-page merges.** Every pair is either disjoint or a deliberate summary-vs-detail relationship. Hasan's prior consolidation work was correct; nothing further is required at the tab/page boundary.
2. **People wired into `AdminSectionNav`** (Task 2) — the absence of `/admin/people` from the section nav (`components/portal/admin-section-nav.tsx:17`) is an IA defect, not an overlap. People becomes the second section-nav entry after Dashboard.
3. **Audit tab no longer claims `/admin/employee` namespace** (Task 2) — current match at `components/portal/admin-section-nav.tsx:40` (`p.startsWith('/admin/employee')`) is a leftover from before People shipped; it now collides with People's namespace. Audit's match narrows to `/admin/audit` only.
4. **Legacy `/admin/employee/[id]` redirects to `/admin/people/[id]`** (Task 2) — this IS a true duplicate (two 4-tab employee profile shells). Per audit decision, `/admin/people/[id]` is canonical; the legacy path becomes an admin-gated redirect that preserves `tab` and `period` query params.
5. **Sidebar admin sub-section links collapsed to a single "Admin" entry** (Task 3) — `qualia-sidebar.tsx`'s four admin entries (`admin-overview`, `admin-people`, `admin-operations`, `admin-finance`) compete with AdminSectionNav for within-admin navigation. The contract Phase 29 commits to: **sidebar owns app-level switching, AdminSectionNav owns within-admin navigation.** Sidebar collapses to one `admin-dashboard` entry pointing at `/admin`.
6. **Dead `app/(portal)/admin/assignments/` folder deleted** (Task 3) — `loading.tsx` orphan without a `page.tsx` triggers a wasted suspense boundary and a 404. Not an overlap, but a cleanup that lives in the same phase.

No code changes are made by this audit task itself — the markdown file is the deliverable. Tasks 2 and 3 implement the decisions above.
