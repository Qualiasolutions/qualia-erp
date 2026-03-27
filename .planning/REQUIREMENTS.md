# Requirements: Qualia ERP v3.0

**Defined:** 2026-03-26
**Core Value:** Production-hardened internal suite — secure, performant, observable, with polished design

## v3.0 Requirements

Based on the 2026-03-26 web production audit (`.planning/REVIEW.md`) + design review + finish remaining v2.1 phases.

### Security (SEC)

- [ ] **SEC-01**: Next.js upgraded to latest stable, resolving all 5 CVEs including Server Action CSRF bypass
- [ ] **SEC-02**: Cron routes require CRON_SECRET auth in ALL environments (not just production)
- [ ] **SEC-03**: Unparameterized `.or()` filter injection in Vercel webhook handler is fixed with parameterized queries
- [ ] **SEC-04**: API key comparisons in `/api/claude/*` routes use `crypto.timingSafeEqual()`
- [ ] **SEC-05**: SVG uploads either removed from allowed types or served with Content-Disposition: attachment only
- [ ] **SEC-06**: CSP `unsafe-eval` confirmed removed (was for VAPI, now deleted)

### Performance (PERF)

- [ ] **PERF-01**: Middleware role check eliminated — user role stored in JWT custom claims via Supabase hook
- [ ] **PERF-02**: `reorderTasks` uses batch RPC or single upsert instead of N+1 writes
- [ ] **PERF-03**: `canModifyTask` loop in reorder is parallelized or replaced with single batch query
- [ ] **PERF-04**: `isUserAdmin` / `isUserManagerOrAbove` cached per-request using React `cache()`
- [ ] **PERF-05**: framer-motion lazily loaded in non-critical components via `dynamic()`
- [ ] **PERF-06**: Chat API caches enriched context per conversation (TTL 30-60s)
- [ ] **PERF-07**: Sequential queries in `getProjectHealth` and `today-page.tsx` parallelized with `Promise.all`
- [ ] **PERF-08**: `assigned_to` column reference in chat route fixed to correct `assignee_id`

### Observability (OBS)

- [ ] **OBS-01**: Sentry SDK installed and configured (`@sentry/nextjs` with client/server/edge configs)
- [ ] **OBS-02**: Vercel Analytics + Speed Insights added to `app/layout.tsx`
- [ ] **OBS-03**: Uptime cron frequency increased from daily to every 15 minutes, or removed in favor of UptimeRobot native alerting

### Reliability (REL)

- [ ] **REL-01**: Test coverage increased to 30%+ (from 0.75%) with focus on action modules
- [ ] **REL-02**: Failing voice assistant tests fixed or removed (stale Arabic phrase assertions)
- [ ] **REL-03**: Route-level `error.tsx` added for `/projects`, `/clients`, `/schedule`, `/payments`, `/inbox`, `/team`
- [ ] **REL-04**: Cron routes sanitize error responses (no `String(error)` leaking internal paths)
- [ ] **REL-05**: `tsc --noEmit` added to pre-commit or pre-push hook

### Deployment (DEP)

- [ ] **DEP-01**: Duplicate migration timestamp `20260324000000` renamed
- [ ] **DEP-02**: Health endpoint responds under 500ms (optimize or cache DB check)
- [ ] **DEP-03**: `/research` route marked `force-dynamic` to fix build warning

### Design (DES)

- [ ] **DES-01**: Full design audit of all pages against Impeccable v4.0 spec (tinted neutrals, fluid type, layered surfaces)
- [ ] **DES-02**: Dashboard homepage polished — spacing, hierarchy, visual density
- [ ] **DES-03**: Projects list and detail pages reviewed for consistency
- [ ] **DES-04**: Settings pages cleaned up (VAPI card removed, layout tightened)
- [ ] **DES-05**: Schedule page design consistency check

### Remaining v2.1 (V21)

- [ ] **V21-01**: Phase 30 — Live Status Dashboard (admin sees who's clocked in, project, duration)
- [ ] **V21-02**: Phase 31 — Clock-Out Enforcement (idle detection, planned logout, beforeunload)

## Out of Scope

| Feature                              | Reason                                                          |
| ------------------------------------ | --------------------------------------------------------------- |
| Redis rate limiting                  | P2 tech debt, in-memory sufficient for 3 users                  |
| Test coverage to 50%                 | 30% is the pragmatic first target                               |
| Structured logging (Axiom/Logtail)   | Sentry + Vercel Analytics covers most observability needs first |
| Database N+1 fix in `getProjectById` | Existing tech debt, not triggered by audit                      |
| Virtualization for TasksWidget       | Existing tech debt, not urgent                                  |

## Traceability

| Requirement | Phase    | Status  |
| ----------- | -------- | ------- |
| V21-01      | Phase 30 | Pending |
| V21-02      | Phase 31 | Pending |
| SEC-01      | Phase 33 | Done    |
| SEC-02      | Phase 33 | Done    |
| SEC-03      | Phase 33 | Done    |
| SEC-04      | Phase 33 | Done    |
| SEC-05      | Phase 33 | Done    |
| SEC-06      | Phase 33 | Done    |
| PERF-01     | Phase 34 | Pending |
| PERF-02     | Phase 34 | Pending |
| PERF-03     | Phase 34 | Pending |
| PERF-04     | Phase 34 | Pending |
| PERF-05     | Phase 34 | Pending |
| PERF-06     | Phase 34 | Pending |
| PERF-07     | Phase 34 | Pending |
| PERF-08     | Phase 34 | Pending |
| OBS-01      | Phase 35 | Pending |
| OBS-02      | Phase 35 | Pending |
| OBS-03      | Phase 35 | Pending |
| REL-01      | Phase 36 | Pending |
| REL-02      | Phase 36 | Pending |
| REL-03      | Phase 36 | Pending |
| REL-04      | Phase 36 | Pending |
| REL-05      | Phase 36 | Pending |
| DEP-01      | Phase 37 | Pending |
| DEP-02      | Phase 37 | Pending |
| DEP-03      | Phase 37 | Pending |
| DES-01      | Phase 38 | Pending |
| DES-02      | Phase 38 | Pending |
| DES-03      | Phase 38 | Pending |
| DES-04      | Phase 38 | Pending |
| DES-05      | Phase 38 | Pending |

**Coverage:**

- v3.0 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---

_Requirements defined: 2026-03-26_
_Last updated: 2026-03-26 after production audit_
