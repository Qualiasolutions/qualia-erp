# ADR 0004 — Admin / Employee / Client — binary RBAC, two gates

**id:** 0004
**title:** "Admin / Employee / Client — binary RBAC, two gates"
**status:** accepted
**date:** 2026-05-16
**decider:** Fawzi Goussous
**supersedes:**
**superseded_by:**

## Context

The ERP's role model has been changed twice: the original four-value enum (`admin | manager | employee | client`) was simplified to three values when the `manager` role was removed (ADR-0001, 2026-04-18). In practice, every `manager` check was identical to `admin`; the extra tier added surface area without a behavior delta.

Since that removal, multiple planning sessions have re-proposed intermediate tiers — "superadmin", "project-lead", per-permission grants. Each proposal was rejected because the ERP serves a single small operator (Fawzi) who needs full admin, a handful of employees who execute within their assignments, and external clients who view their own project data. No legitimate use case has emerged that requires granularity between these three levels.

This ADR formalizes the constraint so future builders stop re-proposing what has already been decided.

## Decision

The `profiles.role` column is an enum with exactly three values:

```
admin | employee | client
```

**Rules:**

1. No `manager`, no `superadmin`, no per-permission grants, no capability bitmasks.
2. If a future feature seems to need an intermediate tier, that is a sign the feature should be split into admin-side and employee-side parts — not that a new role should be added.
3. Role assignment is manual (admin sets it in the team management UI). There is no self-escalation path.

**Two enforcement gates:**

### Gate 1 — Server gate (Next.js layout)

`app/(portal)/admin/layout.tsx` reads the user's profile and checks `profile?.role !== 'admin'`; non-admins are redirected to `/dashboard`. Server actions that mutate admin-only data re-check via `isUserAdmin(userId)` (defined in `app/actions/shared.ts:50`) which queries `profiles.role` through React's `cache()` deduplication.

### Gate 2 — DB gate (Supabase RLS)

The SQL function `is_admin()` (defined in `supabase/migrations/20240104000000_add_role_based_access_control.sql`) is used in RLS policies for INSERT, UPDATE, and DELETE on admin-only tables (clients, teams, projects, issues). It checks:

```sql
SELECT EXISTS (
  SELECT 1 FROM profiles
  WHERE id = (SELECT auth.uid())
  AND role = 'admin'
);
```

Both gates must agree. The server gate prevents UI access; the DB gate prevents direct API/SDK abuse. Neither alone is sufficient.

## Consequences

**Positive:**

- Clarity for builders: the role model is a closed set; no need to guess or propose.
- Simplicity in tests: auth test fixtures need only three profiles (one per role).
- RLS policies stay readable — a single `is_admin()` call covers the admin check everywhere.
- No migration risk from enum expansion; adding enum values to PostgreSQL is append-only but removing them requires careful migration (learned from the `manager` removal).

**Negative / trade-offs:**

- Any future need for an "in-between" permission level forces a feature redesign rather than a quick role addition. This is intentional — it prevents role sprawl but increases design effort for edge cases.
- A single `admin` tier means Fawzi and any future co-admin have identical permissions. If fine-grained admin scoping is ever needed, this ADR must be explicitly superseded.

## Alternatives Considered

### Add a `manager` tier

Rejected. Tried and removed — see ADR-0001 (`0001-manager-role-removal.md`). Every check that tested for `manager` also tested for `admin`; the role provided no behavioral distinction. Re-adding it would re-introduce the same dead code paths.

### Add per-permission grants (capability-based)

Rejected. A permission table (`user_permissions`) with rows like `can_edit_projects`, `can_manage_billing` would require: a join on every auth check, a management UI for grant assignment, and migration tooling when permissions are renamed. The ERP has one admin user; the complexity is not justified by the scale.

### Add a `superadmin` role

Rejected. There is one operator (Fawzi). A `superadmin` above `admin` implies multiple admin tiers — but there is no second admin whose access needs restricting. If a second admin is ever onboarded with limited scope, the correct response is to supersede this ADR with a scoped-admin model, not to bolt on a tier above.
