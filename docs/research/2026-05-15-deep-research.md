# Deep Research Report -- qualia-erp (2026-05-15)

## TL;DR

**Production Readiness: 47/100.** Three explosive findings demand immediate action: (1) middleware not compiled in production build -- auth redirects and role-blocking are absent in deployed code (`proxy.ts` incompatible with `--webpack` flag) [Security C1]; (2) RAG search is broken -- embedding column is vector(1536) but the active model produces 768 dimensions, making all knowledge-base queries return garbage [Database C1]; (3) SQL injection via `exec_sql` RPC with insufficient quote-escaping [Security C2]. Recommended order: fix the middleware build (30min), patch the SQL injection (15min), then tackle the embedding dimension migration (1-2h). After those three, shift to the structural debt: god-module splits, ActionResult contract enforcement, and test pyramid investment.

## Production Readiness Score: 47/100

| Area         | Score | /100 | Justification                                                                                                                    |
| ------------ | :---: | :--: | -------------------------------------------------------------------------------------------------------------------------------- |
| Security     |  1/5  |  20  | Middleware not compiled in prod (C1), SQL injection (C2), static scrypt salt (H1) -- [Security Report]                           |
| Performance  |  2/5  |  40  | GitHub webhook timeout risk (C1), N+1 in uptime cron (C2), 88% client components, zero route caching -- [Performance Report]     |
| Database     |  1/5  |  20  | Embedding dimension mismatch breaks RAG (C1), N+1 inserts, missing .limit() on 91% of queries -- [Database Report]               |
| Frontend     |  3/5  |  60  | Strong RSC/Suspense split, but god components (1610 LOC), unused virtualizer, React 19 primitives untouched -- [Frontend Report] |
| Backend      |  1/5  |  20  | Service-role obfuscation (C1), unauthenticated /api/health leaking infra (C2), 22 action files lack Zod -- [Backend Report]      |
| Code Quality |  3/5  |  60  | TypeScript strict, clean TODOs, but 1.68% test coverage, 0 e2e tests, ActionResult contract violations -- [Quality Report]       |

**Weighted average: 47/100** (security and backend drag hardest; frontend and quality foundations are solid).

## Critical Findings (P0 -- fix this week)

### 1. Middleware Not Compiled in Production Build

Production has no auth redirects or role-based route blocking. `.next/server/middleware-manifest.json` is `{"middleware":{}}`.

- **Evidence:** `proxy.ts` uses Next 16 `proxy` export; build script uses `next build --webpack`; Turbopack required for proxy.ts compilation -- [Security C1]
- **Fix:** Drop `--webpack` from build script, or rename `proxy.ts` to `middleware.ts` with standard `export function middleware`.
- **Effort:** 30 minutes.

### 2. SQL Injection via exec_sql RPC

`tableName` interpolated into SQL with only quote-escaping -- insufficient against multi-statement injection.

- **Evidence:** `lib/integrations/supabase-ops.ts:182` -- `AND tablename = '${tableName.replace(/'/g, "''")}'` -- [Security C2]
- **Fix:** Regex whitelist `^[a-zA-Z_][a-zA-Z0-9_]*$` before interpolation.
- **Effort:** 15 minutes.

### 3. Embedding Dimension Mismatch -- RAG Broken

Column is `vector(1536)` (OpenAI spec), but active model is Google `text-embedding-004` producing 768 dimensions. All similarity searches return garbage or error silently.

- **Evidence:** `20240101000000_initial_schema.sql:91` defines vector(1536); `app/api/embeddings/route.ts:139` uses 768-dim model; `lib/ai/tools/read-tools.ts:471-478` calls match_documents with gemini output -- [Database C1]
- **Fix:** Migration to `ALTER COLUMN embedding TYPE vector(768)`, recreate `match_documents` function, rebuild ivfflat/HNSW index, re-embed or delete existing rows.
- **Effort:** 1-2 hours.

### 4. Service-Role Key Obfuscation Defeats Security Scanning

Template-literal trick `process.env[\`${'SUPABASE'}\_SERVICE_ROLE_KEY\`]` in 3 API routes bypasses ESLint rules and grep audits.

- **Evidence:** `app/api/claude/project-status/route.ts:32-38`, `app/api/github/webhook/route.ts:175-181`, `app/api/webhooks/vercel/route.ts:9` -- [Backend C1]; also flagged in `app/actions/financials.ts:349` as direct `createClient` with service key -- [Quality C2]; `lib/knowledge-data.ts:221` same pattern -- [Security L1]
- **Fix:** Replace all with `createAdminClient()` from `lib/supabase/server.ts`.
- **Effort:** 30 minutes.

### 5. Actions Throw Raw Errors Instead of ActionResult

12 `throw error` sites in `client-requests.ts` alone, plus `health.ts` (10), `notification-preferences` (3), `ui-preferences` (2). Bypasses the ActionResult contract, causing unhandled rejections and generic error UI.

- **Evidence:** `app/actions/client-requests.ts:63,183,273,306,367,405,425,478,499,505,827,906` -- [Quality C1]; also flagged as contract drift -- [Backend H1 (meetings.ts)]
- **Fix:** Replace `throw` with `return { success: false, error: e.message }` in each file.
- **Effort:** 1-2 hours across all affected files.

### 6. Unauthenticated /api/health Leaks Infrastructure

Returns Supabase URL, DB latency, git SHA, and missing env var names with no auth.

- **Evidence:** `app/api/health/route.ts:25-93` -- [Backend C2]
- **Fix:** Gate behind `CRON_SECRET` or strip sensitive fields.
- **Effort:** 15 minutes.

### 7. GitHub Webhook Timeout Risk + Sequential DB Writes

553-line handler with no `maxDuration` export. Sequential per-phase DB calls in loops (lines 382, 444, 456). 20 planning files = ~40 roundtrips. Timeout on Vercel Pro (60s) causes GitHub retries and duplicate processing.

- **Evidence:** `app/api/github/webhook/route.ts` -- no maxDuration, sequential loops at lines 382, 444, 456 -- [Performance C1]
- **Fix:** Add `export const maxDuration = 60`, batch upsert, idempotency guard.
- **Effort:** 1 hour.

## High Findings (P1 -- fix this sprint)

### H1. Static scrypt salt in token encryption

`lib/token-encryption.ts:13` -- `scryptSync(material, 'qualia-token-salt', 32)`. Same key derived across all environments. -- [Security H1]

### H2. Rate-limit gaps on 3 AI/admin routes

`/api/knowledge/chat` (AI, no limiter), `/api/health` (DoS probing), `/api/admin/resync-planning` (5-min maxDuration, no limiter). -- [Security H2]

### H3. 22 of 54 server-action modules have no Zod validation

activities, admin, ai-prompt-logs, auth, daily-brief, deployments, github-planning-sync, health, phase-comments, workspace, project-integrations, project-links, phase-reviews, others. -- [Backend H2]

### H4. meetings.ts mutations have zero try/catch blocks

All exported mutations lack error handling. Unhandled rejections instead of ActionResult. -- [Backend H1]

### H5. Missing file-upload MIME-type validation

`app/actions/project-files.ts:176-187` -- raw `formData.get('file') as File` without allowlist. Stored XSS risk via malicious HTML upload. -- [Security H3]

### H6. N+1 sequential inserts in client-portal and uptime-check

`app/actions/client-portal/admin.ts:740-750` (loop insert), `app/api/cron/uptime-check/route.ts:76-92` (per-admin insert). -- [Database H1, Performance C2]

### H7. Motion direct imports bypass LazyMotion (4 files)

`components/portal/client-chat-widget.tsx:5`, `components/employee-audit/audit-detail-client.tsx:4`, `components/employee-audit/audit-deep-view.tsx:4`. Pulls full ~33KB motion runtime. client-chat-widget loads on every client session. -- [Frontend H1, Performance H1]

### H8. Financial query runs before auth guard

`app/actions/financials.ts:46-117` -- `getFinancialSummary` queries DB before `checkAdmin` guard. -- [Backend H3]

### H9. ESLint React Compiler rules all disabled

6 rules off including error-boundaries, immutability, purity. These catch real React 19 bugs. -- [Quality H4]

### H10. Missing .limit() on 91% of queries

75 of 773 `.from()` calls have `.limit()`. Unbounded result risk, especially `daily-brief.ts:79,135`. -- [Database H2]

## Medium Findings (P2 -- fix this quarter)

**Validation & Contracts:** Legacy `CLAUDE_API_KEY` sunset overdue (2026-05-17) -- [Security M1]. Missing CHECK constraints on text-typed status columns -- [Database M1]. Hardcoded enum strings in 20+ files -- [Database M2]. Inconsistent action naming conventions -- [Quality M3].

**Observability & Security:** Sentry not configured for PII scrubbing -- [Security M2]. CSP allows `unsafe-inline` for scripts -- [Security M3]. No audit_log table -- [Security M4]. Sentry only captures request-boundary errors; zero `captureException` in server actions -- [Backend M3]. `app/error.tsx:16` logs to console only, not Sentry -- [Frontend L3].

**Performance & Frontend:** Only 3 `next/dynamic()` imports across entire app -- [Frontend M3, Performance H2]. PPR not enabled -- [Performance M5]. React 19 `useOptimistic`/`useActionState` unused -- [Frontend M4]. @tanstack/react-virtual declared but unused -- [Frontend H2]. Z-index violations in portal-welcome-tour.tsx -- [Frontend M2]. `@phosphor-icons/react` and `react-day-picker` missing from optimizePackageImports -- [Performance M1, M2]. No `sizes` prop on most next/image usage -- [Performance H4].

**Database:** FKs without ON DELETE on 10+ columns -- [Database H3]. pgvector ivfflat with lists=100 on small dataset; HNSW preferred -- [Database M4]. 142 migrations are squash candidates -- [Database L2].

**Code Organization:** 33 of 54 action files not re-exported from index.ts -- [Quality H2]. 17 `any` usages -- [Quality H3]. 30 eslint-disable comments -- [Quality M1]. date-fns-tz underused (5 imports vs 40 plain date-fns) -- [Quality M2].

## Low Findings (P3 -- backlog)

- 393 console.log/error/warn calls across server actions -- [Backend L1]
- God components mixing data+render+mutation (5 files >1000 LOC) -- [Frontend L1]
- Flat components/ organization with partial feature folders -- [Frontend L2]
- `/api/webhooks/vercel` GET returns 200 with no auth -- [Backend L2]
- `safeCompare` early-returns on length mismatch (minor timing oracle) -- [Security L2]
- Rate limiter silently passes when Redis missing -- [Security L3, Backend M2]
- 1 raw `<img>` tag -- [Performance L2]
- `revalidatePath('/')` in checkins.ts:151 too broad -- [Performance L4]
- 5 dead code suppressions -- [Quality M4]
- 1 legitimate TODO at employee-audit.ts:133 -- [Quality L2]

## Cross-Cutting Patterns

### 1. God Modules (Frontend + Quality + Backend)

Six action files exceed 900 LOC (pipeline.ts 1236, work-sessions.ts 1191, employee-audit.ts 1164) -- [Quality H1]. Five components exceed 1000 LOC (qualia-knowledge-view 1610, audit-detail-client 1319) -- [Frontend L1]. `lib/swr.ts` at 2050 LOC with 41 hooks + 36 invalidation functions -- [Frontend H3]. Root cause: no code-splitting discipline or module-size lint rule.

### 2. Service-Role Key / Adapter Bypass (Backend + Quality + Security)

Template-literal obfuscation in 3 API routes -- [Backend C1]. Direct `createClient` import with manual service key in financials.ts -- [Quality C2]. Same pattern in `knowledge-data.ts:221` -- [Security L1]. Root cause: `createAdminClient()` adapter exists but is not enforced.

### 3. ActionResult Contract Drift (Backend + Quality)

`client-requests.ts` throws raw errors at 12 sites -- [Quality C1]. `meetings.ts` has zero try/catch -- [Backend H1]. `notification-preferences` and `ui-preferences` also throw -- [Quality C1]. Root cause: no lint rule enforcing ActionResult returns in action files.

### 4. Caching/RSC Underuse (Performance + Frontend)

Zero `export const revalidate` on any route -- [Performance H5]. Only 4 `'use cache'` functions -- [Performance strengths]. 88% of components are client components -- [Performance H3]. React 19 `useOptimistic` unused -- [Frontend M4]. PPR not enabled -- [Performance M5]. Root cause: app grew organically without caching strategy.

### 5. Testing Gap (Quality + Database)

1.68% coverage, 0 e2e, 0 integration tests. All 25 test files mock Supabase entirely. 1 component test for 44,242 LOC -- [Quality H5, test coverage section]. No DB-level constraint tests. Root cause: over-mocking pattern established early; never corrected.

## Implementation Roadmap (Week-by-Week)

### Week 1 -- Stop the Bleed (P0)

| #   | Fix                                                               | File                                                                                                                                         | Effort |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Drop `--webpack` from build or rename proxy.ts to middleware.ts   | `package.json`, `proxy.ts`                                                                                                                   | 30min  |
| 2   | Regex whitelist tableName in exec_sql                             | `lib/integrations/supabase-ops.ts:182`                                                                                                       | 15min  |
| 3   | Gate /api/health behind CRON_SECRET                               | `app/api/health/route.ts`                                                                                                                    | 15min  |
| 4   | Replace service-role obfuscation with createAdminClient (4 files) | `app/api/claude/project-status/route.ts`, `app/api/github/webhook/route.ts`, `app/api/webhooks/vercel/route.ts`, `app/actions/financials.ts` | 30min  |
| 5   | Embedding dimension migration (vector(768) + rebuild)             | `supabase/migrations/`, `match_documents` function                                                                                           | 1-2h   |
| 6   | Add maxDuration=60 + batch upsert on GitHub webhook               | `app/api/github/webhook/route.ts`                                                                                                            | 1h     |
| 7   | Fix ActionResult throws in client-requests.ts (12 sites)          | `app/actions/client-requests.ts`                                                                                                             | 45min  |

**Total: ~5-6 hours of focused work.**

### Week 2 -- Sprint 1 (P1)

| #   | Fix                                                                    | Files                                        |
| --- | ---------------------------------------------------------------------- | -------------------------------------------- |
| 1   | Add try/catch to meetings.ts mutations                                 | `app/actions/meetings.ts`                    |
| 2   | Add Zod validation to 22 unvalidated action files                      | `app/actions/{activities,admin,auth,...}.ts` |
| 3   | Move financial query behind checkAdmin guard                           | `app/actions/financials.ts:46-117`           |
| 4   | Generate random salt for scryptSync                                    | `lib/token-encryption.ts:13`                 |
| 5   | Add rate limiters to knowledge/chat, health, admin/resync              | 3 route files                                |
| 6   | MIME-type allowlist on file uploads                                    | `app/actions/project-files.ts:176-187`       |
| 7   | Batch inserts in client-portal/admin.ts + uptime-check cron            | 2 files                                      |
| 8   | Fix motion direct imports (4 files) + add ESLint no-restricted-imports | 4 component files + `.eslintrc`              |

### Weeks 3-4 -- Sprint 2 (remaining P1 + top P2)

- Re-enable ESLint React Compiler rules, fix violations
- Add `.limit()` to top-20 unbounded queries
- Remove legacy `CLAUDE_API_KEY` path (past sunset date)
- Configure Sentry PII scrubbing (`beforeSend` hook)
- Add `Sentry.captureException` to server action catch blocks
- Fix `app/error.tsx` to use Sentry
- Add Phosphor + react-day-picker to optimizePackageImports
- Add `sizes` prop to 8 next/image usages
- Set `revalidate` on /status, /knowledge routes

### Month 2 -- Structural

- **God-module splits:** `lib/swr.ts` into domain modules, `pipeline.ts`/`work-sessions.ts`/`employee-audit.ts` into focused files -- [Frontend H3, Quality H1]
- **Test pyramid investment:** Service-level tests on top-10 files (~7,500 LOC) using local Supabase + 5 Playwright e2e flows (login per role, create project, submit request, generate invoice, work session) -- [Quality pyramid recommendation]
- **PPR/RSC migration:** Enable `experimental.ppr`, audit 135 client components, convert pure-display ones to RSC -- [Performance H3, M5]
- **Migration squash:** Consolidate 142 migrations into baseline + archive -- [Database L2]
- **Dynamic imports:** Add `next/dynamic()` for AI chat panel, DnD kanban, calendar views, admin tabs -- [Frontend M3, Performance H2]

### Ongoing -- Hygiene

- Monthly `ANALYZE=true` bundle audit; enforce no route JS over 200KB first-load -- [Performance bundle roadmap]
- CSP nonce migration to replace `unsafe-inline` -- [Security M3]
- Audit log table for admin mutations -- [Security M4]
- CHECK constraints on text-typed status columns -- [Database M1]
- FK ON DELETE cleanup migration -- [Database H3]
- Security review cadence: quarterly OWASP mapping refresh

## Quick Wins Punch-List

Every item below is completable in 30 minutes or less:

- `proxy.ts` -- rename to `middleware.ts` or drop `--webpack` from `package.json` build script -- [Security C1]
- `lib/integrations/supabase-ops.ts:182` -- regex whitelist `^[a-zA-Z_][a-zA-Z0-9_]*$` for tableName -- [Security C2]
- `app/api/health/route.ts` -- add CRON_SECRET auth gate -- [Backend C2]
- `app/api/github/webhook/route.ts` -- add `export const maxDuration = 60` -- [Performance C1]
- `app/api/cron/uptime-check/route.ts:76-92` -- bulk insert replacing loop -- [Performance C2]
- `app/actions/financials.ts:4,349` -- replace `createClient` + manual key with `createAdminClient()` -- [Quality C2]
- `app/api/claude/project-status/route.ts:32-38` -- replace template-literal key with `createAdminClient()` -- [Backend C1]
- `app/api/github/webhook/route.ts:175-181` -- same fix -- [Backend C1]
- `app/api/webhooks/vercel/route.ts:9` -- same fix -- [Backend C1]
- `components/portal/client-chat-widget.tsx:5` -- change `from 'motion/react'` to `from '@/lib/lazy-motion'` -- [Frontend H1]
- `components/employee-audit/audit-detail-client.tsx:4` -- same fix -- [Frontend H1]
- `components/employee-audit/audit-deep-view.tsx:4` -- same fix -- [Frontend H1]
- `next.config.ts:115` -- add `@phosphor-icons/react`, `react-day-picker` to optimizePackageImports -- [Performance M1, M2]
- `app/(portal)/status/page.tsx`, `knowledge/page.tsx` -- add `export const revalidate = 60` -- [Performance H5]
- `app/actions/checkins.ts:151` -- narrow `revalidatePath('/')` to `/admin` -- [Performance L4]
- `app/error.tsx:16` -- replace `console.error` with `Sentry.captureException` -- [Frontend L3]
- `lib/api-auth.ts:143-144` -- remove legacy CLAUDE_API_KEY path (past sunset) -- [Security M1]
- `app/actions/financials.ts:46-117` -- move DB query below checkAdmin call -- [Backend H3]
- Delete 5 dead suppressed functions in pipeline.ts, work-sessions.ts, activities.ts, phase-comments.ts -- [Quality M4]

## Resources & References

- **Next.js 16 PPR / cacheComponents:** https://nextjs.org/docs/app/building-your-application/rendering/partial-prerendering
- **Next.js 16 proxy.ts vs middleware.ts:** https://nextjs.org/docs/app/building-your-application/routing/middleware
- **Supabase Row-Level Security guide:** https://supabase.com/docs/guides/auth/row-level-security
- **pgvector HNSW vs ivfflat:** https://supabase.com/docs/guides/ai/vector-indexes
- **OWASP Top 10 (2021):** Security report maps qualia-erp against all 10 categories -- 4 categories flagged NEEDS ATTENTION (A01, A02, A03, A04)
- **React 19 useOptimistic / useActionState:** https://react.dev/reference/react/useOptimistic
- **Qualia architecture rules:** `rules/architecture.md` -- deep modules, adapter isolation, test-the-seam guidance

---

_Generated 2026-05-15 from 6 specialist audit reports. All file:line citations preserved from source reports._
