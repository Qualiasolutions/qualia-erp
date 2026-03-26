# Roadmap: Qualia ERP

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-03-01)
- ✅ **v1.1 Production Polish** - Phases 4-8 (shipped 2026-03-04)
- ✅ **v1.2 Premium Animations** - Phases 10-11 (shipped 2026-03-04)
- ✅ **v1.3 Full ERP-Portal Integration** - Phases 12-16 (shipped 2026-03-06)
- ✅ **v1.4 Admin Portal Onboarding** - Phases 17-19 (shipped 2026-03-09)
- ✅ **v1.5.1 Security Hardening** - Phase 25 (shipped 2026-03-10)
- ✅ **v2.0 Team Efficiency & Owner Oversight** - Phase 26 (shipped 2026-03-15)
- 🚧 **v2.1 Attendance & Live Oversight** - Phases 28-31 (carry-over: 30-31)
- 🚧 **v3.0 Production Hardening & Design** - Phases 33-38 (new)

## Phases

<details>
<summary>✅ v1.0–v2.0 (Phases 1-29) — SHIPPED</summary>

Phases 1-29 complete. See MILESTONES.md for full history.

Phase 28-29: v2.1 DB migration, session clock-in/clock-out — complete.

</details>

---

### 🚧 v2.1 Carry-Over (In Progress)

#### Phase 30: Live Status Dashboard

**Goal:** Fawzi can see at a glance who is currently working, on which project, for how long — and can drill into session history for any employee.

**Depends on:** Phase 29 (complete)
**Requirements:** V21-01

**Success Criteria:**

1. Admin dashboard shows each employee's current status: clocked in (green, project name, duration ticking) or offline (grey, time since last session)
2. Status indicators refresh automatically via SWR polling
3. Admin can select any employee and date to view their session history

**Plans:** 3 plans

Plans:

- [ ] 30-01: Live status data action + SWR hook
- [ ] 30-02: Live status panel UI on admin dashboard
- [ ] 30-03: Session history view (per-employee, per-date)

#### Phase 31: Clock-Out Enforcement

**Goal:** Employees who forget to clock out are caught — idle detection, planned logout reminders, browser exit warnings.

**Depends on:** Phase 29 (complete)
**Requirements:** V21-02

**Success Criteria:**

1. After configurable idle period, "Are you still working?" prompt appears
2. If planned logout time passes while clocked in, banner reminder appears
3. Closing browser tab while clocked in shows native beforeunload warning
4. Extended idle auto-closes session with inactivity note

**Plans:** 2 plans

Plans:

- [ ] 31-01: Idle detection hook + "still working?" prompt + auto clock-out
- [ ] 31-02: Planned logout banner + beforeunload warning

---

### 🚧 v3.0 Production Hardening & Design (New)

**Milestone Goal:** Close all CRITICAL and HIGH findings from the 2026-03-26 production audit, add observability, increase test coverage, and polish the design to match Impeccable v4.0 spec.

#### Phase 33: Security Fixes

**Goal:** All security vulnerabilities from the audit are resolved — CVEs patched, injection vectors closed, auth hardened.

**Depends on:** None (can start immediately)
**Requirements:** SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06

**Success Criteria:**

1. `npm audit --omit=dev` shows zero high/critical vulnerabilities
2. All cron endpoints require auth in every environment (no `NODE_ENV` guard)
3. Vercel webhook `.or()` uses parameterized filters — no string interpolation of user input
4. `/api/claude/*` routes use `crypto.timingSafeEqual()` for API key comparison
5. SVG removed from allowed MIME types in `project-files.ts`
6. CSP has no `unsafe-eval` directive

**Plans:** 2 plans

Plans:

- [ ] 33-01: Next.js upgrade + npm audit fix + cron auth hardening + CSP cleanup
- [ ] 33-02: Fix Vercel webhook filter injection + claude API timing-safe + SVG upload removal

#### Phase 34: Performance Optimization

**Goal:** Middleware is fast (no DB query for role), reorder is efficient, and AI chat doesn't rebuild context on every message.

**Depends on:** None (can run parallel to Phase 33)
**Requirements:** PERF-01 through PERF-08

**Success Criteria:**

1. Middleware makes zero DB queries for authenticated users (role in JWT claims)
2. `reorderTasks` sends at most 2 DB queries regardless of task count (1 auth check, 1 batch update)
3. `isUserAdmin()` uses React `cache()` — verified by checking only 1 profiles query per request
4. `framer-motion` not in initial page bundle (lazy loaded)
5. Chat route uses `assignee_id` (not `assigned_to`) and caches context per conversation
6. `getProjectHealth` and `today-page.tsx` use `Promise.all` for parallel queries

**Plans:** 3 plans

Plans:

- [ ] 34-01: JWT custom claims for role in middleware (Supabase auth hook + middleware rewrite)
- [ ] 34-02: Batch reorder RPC + React cache() for auth helpers + Promise.all for parallel queries + fix assignee_id
- [ ] 34-03: Lazy-load framer-motion + chat context caching

#### Phase 35: Observability

**Goal:** Production errors are tracked, page performance is measured, and uptime monitoring actually alerts.

**Depends on:** None (can run parallel)
**Requirements:** OBS-01, OBS-02, OBS-03

**Success Criteria:**

1. Sentry captures unhandled exceptions in production (client + server + edge)
2. Vercel Analytics dashboard shows page views and Core Web Vitals
3. Speed Insights active in production
4. Uptime monitoring fires alerts within 15 minutes of downtime (either via cron or UptimeRobot native)

**Plans:** 2 plans

Plans:

- [ ] 35-01: Install @sentry/nextjs, configure client/server/edge, create Sentry project
- [ ] 35-02: Add @vercel/analytics + @vercel/speed-insights to layout + fix uptime cron frequency

#### Phase 36: Reliability & Testing

**Goal:** Test coverage reaches 30%+, error boundaries cover all routes, and build pipeline catches type errors.

**Depends on:** None (can run parallel)
**Requirements:** REL-01 through REL-05

**Success Criteria:**

1. `npm test -- --coverage` shows 30%+ statement coverage
2. Every top-level route under `app/` has an `error.tsx`
3. Cron route error responses are sanitized (no internal paths)
4. Pre-commit or pre-push hook runs `tsc --noEmit`
5. All existing tests pass (`npm test` exits 0)

**Plans:** 3 plans

Plans:

- [ ] 36-01: Fix/remove failing tests + add error.tsx to all routes + tsc hook + sanitize cron errors
- [ ] 36-02: Write tests for core action modules (inbox, projects, phases, daily-flow)
- [ ] 36-03: Write tests for auth helpers, integrations, server-utils

#### Phase 37: Deployment Cleanup

**Goal:** Build is clean, migrations are ordered correctly, and health endpoint is fast.

**Depends on:** Phase 33 (needs Next.js upgrade first)
**Requirements:** DEP-01, DEP-02, DEP-03

**Success Criteria:**

1. No duplicate migration timestamps — all migration files have unique timestamps
2. `/api/health` responds under 500ms consistently
3. `npm run build` produces zero warnings
4. Full deploy to Vercel + post-deploy verification passes

**Plans:** 1 plan

Plans:

- [ ] 37-01: Rename duplicate migration + optimize health endpoint + force-dynamic on /research + deploy + verify

#### Phase 38: Design Review & Polish

**Goal:** Every page matches the Impeccable v4.0 design spec — tinted neutrals, fluid type, layered surfaces, consistent spacing.

**Depends on:** All other phases (final pass)
**Requirements:** DES-01 through DES-05

**Success Criteria:**

1. Dashboard homepage has clear visual hierarchy, consistent spacing, no orphan elements
2. Projects list/detail pages use tinted neutrals (no pure gray) and consistent surface layers
3. Settings pages are clean (no VAPI remnants, tight layout)
4. Schedule page matches dashboard design language
5. `/critique` audit on 3 key pages shows no CRITICAL or HIGH design issues

**Plans:** 2 plans

Plans:

- [ ] 38-01: Design audit all pages with `/critique` — document findings
- [ ] 38-02: Implement design fixes across dashboard, projects, settings, schedule

---

## Progress

| Phase                        | Milestone | Plans Complete | Status      | Completed  |
| ---------------------------- | --------- | -------------- | ----------- | ---------- |
| 1-29                         | v1.0–v2.1 | All            | Complete    | 2026-03-25 |
| 30. Live Status Dashboard    | v2.1      | 0/3            | Not started | -          |
| 31. Clock-Out Enforcement    | v2.1      | 0/2            | Not started | -          |
| 33. Security Fixes           | v3.0      | 0/2            | Not started | -          |
| 34. Performance Optimization | v3.0      | 0/3            | Not started | -          |
| 35. Observability            | v3.0      | 0/2            | Not started | -          |
| 36. Reliability & Testing    | v3.0      | 0/3            | Not started | -          |
| 37. Deployment Cleanup       | v3.0      | 0/1            | Not started | -          |
| 38. Design Review & Polish   | v3.0      | 0/2            | Not started | -          |
