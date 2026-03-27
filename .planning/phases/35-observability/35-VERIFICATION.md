---
phase: 35-observability
verified: 2026-03-27T01:01:31Z
re_verified: 2026-03-27
status: passed
score: 8/8 must-haves verified
re_verification: true
gaps: []
gap_fix: 'fix(35-01): save @sentry/nextjs to package.json — commit 0d25791'
---

# Phase 35: Observability Verification Report

**Phase Goal:** Production errors are tracked, page performance is measured, and uptime monitoring actually alerts.
**Verified:** 2026-03-27T01:01:31Z
**Status:** passed (gap fixed in commit 0d25791)
**Re-verification:** Yes — gap closure verified

## Goal Achievement

### Observable Truths

| #   | Truth                                                                               | Status   | Evidence                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Unhandled client-side exceptions are captured by Sentry in production               | VERIFIED | `sentry.client.config.ts` exists with guarded init, package in package.json (fixed in 0d25791)                                                      |
| 2   | Unhandled server-side exceptions are captured by Sentry in production               | VERIFIED | `sentry.server.config.ts` exists with guarded init, package in package.json                                                                         |
| 3   | Edge runtime errors are captured by Sentry                                          | VERIFIED | `sentry.edge.config.ts` exists with guarded init, package in package.json                                                                           |
| 4   | A global error boundary renders a user-friendly fallback page and reports to Sentry | VERIFIED | `app/global-error.tsx` 116 lines, calls `Sentry.captureException(error)` in useEffect, renders full fallback UI with Reload/Try Again buttons       |
| 5   | next.config.ts is wrapped with withSentryConfig                                     | VERIFIED | Line 109: `export default withSentryConfig(withBundleAnalyzer(nextConfig), {...})` with tunnelRoute, source map upload, tree-shake                  |
| 6   | Vercel Analytics and Speed Insights are active in root layout                       | VERIFIED | `<Analytics />` and `<SpeedInsights />` at lines 171-172 of `app/layout.tsx`, packages present in package.json                                      |
| 7   | Uptime monitoring checks every 15 minutes                                           | VERIFIED | `vercel.json` line 26: `"schedule": "*/15 * * * *"` for `/api/cron/uptime-check`                                                                    |
| 8   | Uptime monitoring fires email alerts on downtime                                    | VERIFIED | `app/api/cron/uptime-check/route.ts` (163 lines) queries UptimeRobot API, sends Resend emails to all admin users when monitors report down/degraded |

**Score: 8/8 truths verified**

### Required Artifacts

| Artifact                                        | Expected                             | Status   | Details                                                                                                     |
| ----------------------------------------------- | ------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------- |
| `sentry.client.config.ts`                       | Client-side Sentry init              | VERIFIED | 20 lines, real init with replay integration, guards on DSN                                                  |
| `sentry.server.config.ts`                       | Server-side Sentry init              | VERIFIED | 14 lines, real init, guards on DSN                                                                          |
| `sentry.edge.config.ts`                         | Edge runtime Sentry init             | VERIFIED | 13 lines, real init, guards on DSN                                                                          |
| `app/global-error.tsx`                          | Error boundary with Sentry reporting | VERIFIED | 116 lines, captureException wired, user-friendly fallback with two action buttons                           |
| `next.config.ts` with `withSentryConfig`        | Build plugin + source maps           | VERIFIED | withSentryConfig wraps full config, tunnelRoute=/monitoring, widenClientFileUpload, automaticVercelMonitors |
| `app/layout.tsx` with Analytics + SpeedInsights | Analytics in root layout             | VERIFIED | Both components imported from correct paths and rendered inside body                                        |
| `vercel.json` with `*/15 * * * *`               | 15-min uptime cron                   | VERIFIED | Schedule matches exactly                                                                                    |
| `package.json` with `@sentry/nextjs`            | Package declared                     | VERIFIED | `"@sentry/nextjs": "^10.46.0"` in dependencies (fixed in commit 0d25791)                                    |

### Key Link Verification

| From                 | To                       | Via                                                    | Status | Details                                                     |
| -------------------- | ------------------------ | ------------------------------------------------------ | ------ | ----------------------------------------------------------- |
| `next.config.ts`     | Sentry build plugin      | `withSentryConfig()` wrapper                           | WIRED  | Wraps withBundleAnalyzer(nextConfig)                        |
| `next.config.ts`     | Tunnel route             | `tunnelRoute: '/monitoring'`                           | WIRED  | Bypasses ad blockers                                        |
| `next.config.ts`     | CSP headers              | `connect-src https://*.ingest.sentry.io`               | WIRED  | Line 49                                                     |
| `global-error.tsx`   | Sentry exception capture | `Sentry.captureException(error)` in useEffect          | WIRED  | Reports on every error render                               |
| `app/layout.tsx`     | Vercel Analytics         | `<Analytics />` from `@vercel/analytics/next`          | WIRED  | Renders in body, auto-detects production                    |
| `app/layout.tsx`     | Speed Insights           | `<SpeedInsights />` from `@vercel/speed-insights/next` | WIRED  | Renders in body, auto-detects production                    |
| `vercel.json` cron   | uptime-check route       | `*/15 * * * *` schedule                                | WIRED  | Route exists at 163 lines with alert logic                  |
| `uptime-check route` | Email alerts             | Resend + admin user query                              | WIRED  | Fetches down monitors, queries admin profiles, sends emails |
| `sentry configs`     | `@sentry/nextjs` package | npm dependency                                         | WIRED  | Package declared in package.json (fixed in commit 0d25791)  |

### Requirements Coverage

| Requirement                                                   | Status    | Blocking Issue                                                  |
| ------------------------------------------------------------- | --------- | --------------------------------------------------------------- |
| Sentry captures unhandled exceptions (client + server + edge) | SATISFIED | @sentry/nextjs in package.json, all three runtime configs wired |
| Vercel Analytics shows page views and Core Web Vitals         | SATISFIED | Components wired in layout, packages declared in package.json   |
| Speed Insights active in production                           | SATISFIED | Component wired in layout                                       |
| Uptime monitoring fires alerts within 15 minutes              | SATISFIED | 15-min cron + email alert implementation verified               |

### Anti-Patterns Found

| File | Pattern | Severity | Impact                               |
| ---- | ------- | -------- | ------------------------------------ |
| —    | —       | —        | No anti-patterns found after gap fix |

No stubs, no TODOs, no placeholder patterns found in any modified files.

### Human Verification Required

#### 1. Sentry DSN Environment Variables

**Test:** Set NEXT_PUBLIC_SENTRY_DSN and SENTRY_DSN in Vercel project settings, redeploy, trigger a test error.
**Expected:** Error appears in Sentry dashboard with source-mapped stack trace.
**Why human:** Requires live Sentry project credentials and actual production deploy.

#### 2. Vercel Analytics Dashboard

**Test:** Visit Vercel dashboard > Analytics tab after production deployment.
**Expected:** Page view events and Web Vitals (LCP, FID, CLS) appear within minutes of real traffic.
**Why human:** Cannot verify dashboard data programmatically; requires browser session and real traffic.

#### 3. UptimeRobot API Key

**Test:** Confirm UPTIMEROBOT_API_KEY is set in Vercel env vars.
**Expected:** Cron executes every 15 minutes without the early-exit `500` on missing API key.
**Why human:** Requires checking Vercel project environment variables for the key's presence.

### Gaps Summary

One gap blocks full goal achievement: `@sentry/nextjs` was installed manually into node_modules (version 10.46.0 confirmed in node_modules) but was never persisted to `package.json` or `package-lock.json`. This means:

1. Any `npm install` (CI, fresh checkout, Vercel build step that re-runs npm install) will not install Sentry.
2. All three Sentry config files (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) import from a package that would be absent.
3. `next.config.ts` wrapping with `withSentryConfig` would fail at build time.

The fix is a single command: `npm install @sentry/nextjs@10.46.0 --save` followed by committing the updated `package.json` and `package-lock.json`.

Everything else is fully implemented: the three runtime configs are substantive and real (no stubs), the error boundary calls captureException, the build plugin is properly wired with tunnel route and source maps, Vercel Analytics and Speed Insights are correctly placed in root layout with proper package declarations, and the uptime cron runs every 15 minutes with real email-alert logic.

---

_Verified: 2026-03-27T01:01:31Z_
_Verifier: Claude (qualia-verifier)_
