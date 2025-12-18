# Production Readiness Audit

**Project:** Qualia - Multi-tenant Project Management Platform
**Date:** 2025-12-18
**Platform:** Vercel + Supabase
**Overall Score:** 65/100

---

## Summary

| Area          | Score  | Critical | High | Medium |
| ------------- | ------ | -------- | ---- | ------ |
| Security      | 78/100 | 2        | 4    | 3      |
| Performance   | 72/100 | 0        | 2    | 5      |
| Reliability   | 72/100 | 0        | 3    | 6      |
| Observability | 32/100 | 3        | 2    | 3      |
| Deployment    | 68/100 | 3        | 4    | 5      |
| Data          | 68/100 | 3        | 4    | 4      |

---

## BLOCKERS (Fix Before Deploy)

### 1. CRITICAL: Hardcoded VAPI Token in `.mcp.json`

- **File:** `.mcp.json:10`
- **Issue:** VAPI API token hardcoded in tracked file
- **Fix:** Move to environment variables, add `.mcp.json` to `.gitignore`

### 2. CRITICAL: VAPI Webhook Has No Authentication

- **File:** `app/api/vapi/webhook/route.ts:416`
- **Issue:** Publicly accessible endpoint processes tool calls without signature verification
- **Fix:** Implement VAPI webhook signature verification or add secret token validation

### 3. CRITICAL: No Health Check Endpoint

- **File:** Missing `app/api/health/route.ts`
- **Issue:** CI/CD pipeline references `/api/health` that doesn't exist
- **Fix:** Create health check endpoint returning database connectivity status

### 4. CRITICAL: No Error Tracking Service

- **File:** `app/global-error.tsx:17`
- **Issue:** Only `console.error` - no Sentry or similar
- **Fix:** Install `@sentry/nextjs` and configure error reporting

### 5. CRITICAL: Secret Exposed in `.env.production`

- **File:** `.env.production:2`
- **Issue:** Vercel OIDC token committed to repository
- **Fix:** Remove file, add to `.gitignore`, rotate token

### 6. CRITICAL: TypeScript Build Errors Ignored

- **File:** `next.config.ts:69-71`
- **Issue:** `ignoreBuildErrors: true` masks potential runtime errors
- **Fix:** Remove setting and fix all TypeScript errors

---

## High Priority Issues

### Security

1. **Missing HSTS Header** - `next.config.ts` - Add `Strict-Transport-Security` header
2. **Weak CSP** - `next.config.ts:34` - Remove `unsafe-inline` and `unsafe-eval` if possible
3. **Super Admin Email Hardcoded** - `app/actions.ts:1979` - Move to environment variable
4. **API Routes Bypass Middleware** - `middleware.ts:44-48` - Document or add individual auth

### Performance

1. **No Lazy Loading** - Heavy components (VAPI, framer-motion) load on initial page
2. **No React.memo** - List components (`TaskCard`, `ProjectCard`) re-render unnecessarily

### Reliability

1. **No Retry Logic** - Database operations fail immediately without retry
2. **In-Memory Rate Limiter** - `lib/rate-limit.ts:11` - Won't work across serverless instances
3. **Missing try-catch** - `app/api/admin/update-progress/route.ts` lacks error handling

### Observability

1. **No Structured Logging** - 100+ `console.log/error` scattered throughout
2. **No Performance Monitoring** - Missing Vercel Analytics/Speed Insights

### Deployment

1. **CI References Missing Scripts** - `test:e2e`, `test:smoke` not defined in package.json
2. **GROQ_API_KEY Missing from .env.example** - Required key not documented
3. **CI Uses Wrong API Key** - `ci-cd.yml:177` references Google AI instead of Groq

### Data

1. **No GDPR Data Export** - Missing user data export functionality
2. **No Account Deletion** - GDPR non-compliance for EU users
3. **Hard Deletes Only** - No soft delete, data recovery impossible
4. **Notifications Table Missing** - `app/actions.ts:2454` uses table with no migration

---

## Pre-Deploy Checklist

- [ ] Remove hardcoded VAPI token from `.mcp.json`
- [ ] Add VAPI webhook authentication
- [ ] Create `/api/health` endpoint
- [ ] Install and configure Sentry
- [ ] Remove `.env.production` from repo and add to `.gitignore`
- [ ] Remove `ignoreBuildErrors: true` and fix TypeScript errors
- [ ] Add HSTS security header
- [ ] Add `GROQ_API_KEY` to `.env.example`
- [ ] Create missing npm scripts or remove from CI
- [ ] Verify all required env vars in Vercel dashboard

---

## Post-Deploy Checklist

- [ ] Verify app loads at production URL
- [ ] Test login flow
- [ ] Test creating a project
- [ ] Test creating an issue
- [ ] Verify AI chat works
- [ ] Check Sentry for errors
- [ ] Verify Vercel Analytics active
- [ ] Monitor database connections

---

## Detailed Scores by Category

### Security (78/100)

| Category                       | Score | Notes                        |
| ------------------------------ | ----- | ---------------------------- |
| Authentication & Authorization | 18/20 | Proper checks in all routes  |
| Secrets & Environment          | 10/20 | Hardcoded tokens, .env files |
| Input Validation               | 20/20 | Comprehensive Zod schemas    |
| XSS Prevention                 | 10/10 | No vulnerabilities found     |
| SQL Injection Prevention       | 10/10 | Parameterized queries        |
| Security Headers               | 8/10  | Missing HSTS, weak CSP       |
| Supabase RLS                   | 10/10 | Workspace-scoped policies    |

### Performance (72/100)

| Category           | Score | Notes                          |
| ------------------ | ----- | ------------------------------ |
| Image Optimization | 10/10 | next/image used correctly      |
| Font Loading       | 3/5   | Using geist package            |
| Lazy Loading       | 0/15  | No dynamic imports             |
| React Keys         | 10/10 | Proper keys in lists           |
| Memoization        | 7/10  | useMemo present, no React.memo |
| SWR/Caching        | 8/10  | Good client config             |
| Query Efficiency   | 6/10  | Some N+1 patterns              |
| Bundle Size        | 6/10  | Heavy deps, no analyzer        |
| Route Strategy     | 4/10  | No explicit config             |
| Loading States     | 8/10  | Good coverage                  |

### Reliability (72/100)

| Category             | Score | Notes                       |
| -------------------- | ----- | --------------------------- |
| Error Boundaries     | 20/20 | Global and component-level  |
| Server Action Errors | 15/20 | Consistent ActionResult     |
| API Route Errors     | 12/15 | One route missing try-catch |
| Form & User Input    | 15/15 | Proper validation/loading   |
| Database Resilience  | 5/15  | No retry logic              |
| Edge Cases           | 10/10 | Good null handling          |
| Logging              | 2/10  | No structured logging       |

### Observability (32/100)

| Category               | Score  | Notes                 |
| ---------------------- | ------ | --------------------- |
| Logging                | 1.5/15 | Only console.log      |
| Error Tracking         | 1/20   | No Sentry             |
| Monitoring             | 0/15   | No health check       |
| Analytics              | 0/10   | Not installed         |
| Performance Monitoring | 0/15   | No Web Vitals         |
| Alerting               | 0/10   | None configured       |
| Debugging              | 1/5    | Basic Jest            |
| Audit Trail            | 8.5/10 | Good activities table |

### Deployment (68/100)

| Category              | Score  | Notes             |
| --------------------- | ------ | ----------------- |
| Vercel Configuration  | 60/100 | Minimal config    |
| CI/CD Pipeline        | 70/100 | Missing scripts   |
| Environment Variables | 50/100 | Secret exposed    |
| Build Configuration   | 55/100 | TS errors ignored |
| TypeScript/ESLint     | 90/100 | Strict mode       |
| Security Scanning     | 85/100 | npm audit, Snyk   |
| Documentation         | 40/100 | Generic README    |

### Data (68/100)

| Category             | Score | Notes                  |
| -------------------- | ----- | ---------------------- |
| RLS Implementation   | 17/20 | All tables protected   |
| Data Access Patterns | 14/15 | Good workspace scoping |
| Data Validation      | 15/15 | Zod schemas            |
| Foreign Keys         | 8/10  | Proper cascades        |
| Backup & Recovery    | 2/10  | Not documented         |
| Sensitive Data       | 6/10  | PII not encrypted      |
| Data Retention       | 3/10  | Hard deletes only      |
| DB Functions         | 8/10  | SECURITY DEFINER ok    |
| Migration Quality    | 6/10  | No rollbacks           |
| GDPR Compliance      | 2/10  | No export/deletion     |

---

## Recommended Action Plan

### Immediate (Before Production)

1. Fix all 6 critical blockers listed above
2. Add HSTS header
3. Document backup strategy

### Week 1

4. Install Vercel Analytics and Speed Insights
5. Add dynamic imports for heavy components
6. Implement Redis-based rate limiting (Upstash)
7. Create missing npm scripts or update CI

### Week 2-3

8. Add React.memo to list components
9. Implement structured logging (Pino)
10. Add retry logic for database operations
11. Update README with project-specific docs

### Month 1

12. Implement GDPR data export
13. Add soft delete for critical tables
14. Strengthen CSP (remove unsafe-eval)
15. Add route-specific error.tsx files

---

## Files Requiring Immediate Attention

| File                            | Line  | Issue                   |
| ------------------------------- | ----- | ----------------------- |
| `.mcp.json`                     | 10    | Hardcoded VAPI token    |
| `app/api/vapi/webhook/route.ts` | 416   | No authentication       |
| `next.config.ts`                | 69-71 | ignoreBuildErrors: true |
| `app/global-error.tsx`          | 17    | No Sentry               |
| `.env.production`               | 2     | Exposed secret          |
| `middleware.ts`                 | 44-48 | API routes unprotected  |
| `lib/rate-limit.ts`             | 11    | In-memory store         |

---

**Report Generated:** 2025-12-18
**Auditor:** Claude Code (6 Parallel Opus Agents)
