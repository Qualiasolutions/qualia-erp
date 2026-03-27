---
phase: 35-observability
plan: 01
subsystem: observability
tags: [sentry, error-tracking, monitoring, source-maps]
dependency_graph:
  requires: []
  provides: [sentry-sdk, error-boundary, source-map-upload]
  affects: [next.config.ts, global-error.tsx, CSP-headers]
tech_stack:
  added: ['@sentry/nextjs@10.46.0']
  patterns: [tunnel-route, guarded-init, error-boundary-reporting]
key_files:
  created:
    - sentry.client.config.ts
    - sentry.server.config.ts
    - sentry.edge.config.ts
  modified:
    - next.config.ts
    - app/global-error.tsx
    - .env.example
decisions:
  - id: OBS-01
    decision: '10% tracesSampleRate, replay only on errors'
    rationale: 'Low-volume internal app — keeps costs minimal while catching all errors'
metrics:
  duration: '5 minutes'
  completed: 2026-03-27
---

# Phase 35 Plan 01: Sentry SDK Setup Summary

@sentry/nextjs v10.46.0 configured for client, server, and edge runtimes with guarded init, tunnel route for ad-blocker bypass, and error boundary reporting.

## What Was Done

### Task 1: Install @sentry/nextjs and Create Config Files

**Commit:** `083fcfe`

- Installed `@sentry/nextjs@10.46.0`
- Created `sentry.client.config.ts` with replay-on-error integration (replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 1.0)
- Created `sentry.server.config.ts` for Node.js runtime
- Created `sentry.edge.config.ts` for edge/middleware runtime
- All three configs guard `Sentry.init()` behind DSN presence — no-op in dev without env vars
- Added 5 Sentry env vars to `.env.example`

### Task 2: Wrap next.config.ts and Update global-error.tsx

**Commit:** `e05266e`

- Wrapped `next.config.ts` export with `withSentryConfig()` around existing `withBundleAnalyzer()`
- Configured source map upload (org, project from env), tunnel route at `/monitoring`
- Used non-deprecated `webpack.treeshake.removeDebugLogging` and `webpack.automaticVercelMonitors`
- Added `@sentry/nextjs` to `experimental.optimizePackageImports`
- Updated CSP `connect-src` to allow `https://*.ingest.sentry.io`
- Added `Sentry.captureException(error)` to existing `global-error.tsx` error boundary

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed deprecated Sentry config options**

- **Found during:** Task 2 (build output showed deprecation warnings)
- **Issue:** `disableLogger` and `automaticVercelMonitors` are deprecated top-level options in Sentry v10
- **Fix:** Moved to `webpack.treeshake.removeDebugLogging` and `webpack.automaticVercelMonitors`
- **Files modified:** `next.config.ts`
- **Commit:** `e05266e`

## Verification Results

- Build succeeds with Sentry plugin loaded (no errors, no deprecation warnings)
- All three sentry config files exist at project root
- `withSentryConfig` wraps the Next.js config export
- `captureException` called in global-error.tsx
- Pre-existing type errors in `login-left-panel.tsx` and `project-team-view.tsx` are unrelated

## User Setup Required

Sentry will be a no-op until env vars are configured. See `35-USER-SETUP.md` for instructions.

## Self-Check: PASSED

All 6 files verified present. Both commits (083fcfe, e05266e) verified in git log.
