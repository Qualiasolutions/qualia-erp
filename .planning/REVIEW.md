---
date: 2026-03-26 17:00
mode: web
critical_count: 2
high_count: 10
medium_count: 16
low_count: 11
status: has_blockers
---

# Web Production Audit — 2026-03-26

## Blockers (CRITICAL + HIGH)

### CRITICAL

- **[Security] No error tracking (Sentry) configured** — Zero visibility into production exceptions. No SDK, no alerting, no stack trace capture. (CRITICAL)
- **[Reliability] Test coverage 0.75% vs 50% threshold** — 2 failing tests in `__tests__/lib/voice-assistant-intelligence.test.ts`. Zero coverage on all action modules, AI, integrations. (CRITICAL)

### HIGH

- **[Security] Next.js CVEs including CSRF bypass on Server Actions** — `package.json` — 5 CVEs in installed Next.js version (16.0.0-beta → 16.1.6). GHSA-mq59-m269-xvcx allows null-origin CSRF on Server Actions. Fix: `npm install next@latest` (HIGH)
- **[Security] `undici` high-severity vulnerabilities** — `package.json` transitive via Next.js. WebSocket parser overflow + HTTP smuggling. Resolved by same Next.js upgrade. (HIGH)
- **[Security] Unparameterized `.or()` filter injection** — `app/api/webhooks/vercel/route.ts:90`, `lib/vapi-webhook-handlers.ts:399` — webhook payload values interpolated directly into PostgREST filter strings. (HIGH)
- **[Performance] Middleware: 2-3 DB queries on every authenticated request** — `middleware.ts:56-134` — profile role query + work_sessions query for employees on every navigation. Fix: store role in JWT custom claims. (HIGH)
- **[Performance] `reorderTasks` N+1 DB writes + sequential auth loop** — `app/actions/inbox.ts:515-543` — dragging 10 tasks = 20+ sequential auth queries then 10 parallel writes. Fix: batch query + single RPC. (HIGH)
- **[Performance] `isUserAdmin` no request-level caching** — `app/actions/shared.ts:38-49` — fresh DB query on every server action call. Fix: use React `cache()` or pass role. (HIGH)
- **[Performance] framer-motion (~50KB gz) + @vapi-ai/web not lazily loaded** — `components/qualia-voice.tsx:8`, 20+ component files — heavy bundles loaded on every page. Fix: `dynamic({ ssr: false })`. (HIGH)
- **[Observability] No analytics configured** — `app/layout.tsx` — no Vercel Analytics, Speed Insights, or any analytics. Zero CWV visibility. (HIGH)
- **[Deployment] API health endpoint: 2.55s latency (5x over 500ms threshold)** — `https://portal.qualiasolutions.net/api/health` — cold-start + DB query on every call. (HIGH)
- **[Performance] Chat API: 4 parallel DB queries on every message, no caching** — `app/api/chat/route.ts:78-93` — full context rebuild per message. (HIGH)

## Recommendations (MEDIUM + LOW)

### MEDIUM — Security

- `app/api/cron/*/route.ts` — Cron routes skip auth when `NODE_ENV !== 'production'`. Preview deploys are unauthenticated. (M1)
- `next.config.ts:45` — `unsafe-eval` in CSP weakens XSS protection. Investigate if VAPI truly needs it. (M2)
- `lib/rate-limit.ts:11` — In-memory rate limiter resets on cold starts, bypassable across serverless instances. (M3)
- `app/api/claude/*/route.ts` (3 files) — API key comparison not timing-safe. Use `crypto.timingSafeEqual()`. (M4)
- `app/actions/project-files.ts:38` — SVG uploads allowed, XSS risk if served inline. (M5)

### MEDIUM — Performance

- `app/today-page.tsx:19-30` — Sequential profile fetch before `Promise.all`. Include in parallel block. (M6)
- `app/actions/*.ts` (19 sites) — `select('*')` fetching all columns unnecessarily. (M7)
- `app/actions/daily-flow.ts:91-117` — Unbounded tasks query with no `.limit()`. (M8)
- `app/actions/health.ts:358-387` — 3 sequential queries that could be `Promise.all`. (M9)
- `app/api/chat/route.ts:89` — `assigned_to` column likely wrong (should be `assignee_id`). Silent zero results. (M10)

### MEDIUM — Reliability

- `app/api/cron/*/route.ts` — `String(error)` in responses can leak internal paths/messages. (M11)
- `lib/supabase/client.ts:10-11` — Browser Supabase client silently uses `''` fallback for missing env vars. (M12)
- Missing `error.tsx` for `/projects`, `/clients`, `/schedule`, `/payments`, `/inbox`, `/team`. (M13)

### MEDIUM — Observability

- Console-only logging, no persistent structured log aggregation (Axiom/Logtail). (M14)
- Uptime cron fires once daily — 23h blind window between checks. (M15)
- No alerting on cron job failures. (M16)

### MEDIUM — Deployment

- `.husky/pre-commit` missing `tsc --noEmit`. Type errors can be committed. (M17)
- Build warning: `/research` route uses cookies during static render. Needs `force-dynamic`. (M18)
- Duplicate migration timestamp `20260324000000` (claude_sessions + create_work_sessions). (M19)

### LOW

- `app/api/webhooks/vercel/route.ts:51` — SHA-1 HMAC (Vercel upstream limitation). (L1)
- `app/api/github/webhook/route.ts:31` — `timingSafeEqual` not length-guarded before call. (L2)
- No bundle analysis output committed despite analyzer installed. (L3)
- Only 1 `dynamic()` import in entire codebase (`new-project-modal.tsx`). (L4)
- `next.config.ts:88-97` — `optimizePackageImports` missing `@supabase/*`, `ai`, `resend`. (L5)
- No `Cache-Control` headers on API routes. (L6)
- `app/actions/payments.ts:7` — Hardcoded admin email check instead of `isUserAdmin()`. (L7)
- `lib/integrations/orchestrator.ts:132-134` — Passes empty strings for Supabase URL/key. (L8)
- 2 failing unit tests with stale Arabic phrase assertions. (L9)
- No `engines` field in `package.json`. (L10)
- `productionBrowserSourceMaps: false` redundant (already default). (L11)

## What's Actually Good

- RLS enabled on all 65 tables
- No hardcoded secrets in tracked source files
- `.env.local` properly gitignored
- No `dangerouslySetInnerHTML` or `eval()` in app code
- All user-facing API routes check auth server-side
- Webhook endpoints use HMAC/shared secret verification
- Security headers comprehensive (HSTS, X-Frame-Options: DENY, nosniff, Referrer-Policy, CSP)
- File uploads validate MIME type and size
- Signed URLs for file downloads (time-limited)
- TypeScript strict mode enabled, zero type errors
- Build passes cleanly
- Health endpoint checks DB connectivity with latency measurement
- Server actions consistently return `ActionResult` with sanitized errors
- `global-error.tsx` and root `error.tsx` present

---

Previous review (2026-03-25, general mode): 1 critical, 2 high — archived.
