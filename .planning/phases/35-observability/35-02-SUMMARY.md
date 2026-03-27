---
phase: 35-observability
plan: 02
subsystem: observability
tags: [analytics, web-vitals, uptime, cron, vercel]
dependency_graph:
  requires: []
  provides: [page-view-tracking, web-vitals-collection, 15min-uptime-checks]
  affects: [app/layout.tsx, vercel.json]
tech_stack:
  added: ['@vercel/analytics@^2.0.1', '@vercel/speed-insights@^2.0.0']
  patterns: [vercel-analytics-auto-detect, cron-schedule]
key_files:
  created: []
  modified: [app/layout.tsx, vercel.json, package.json]
decisions: []
metrics:
  duration: '3m 19s'
  completed: 2026-03-27
---

# Phase 35 Plan 02: Vercel Analytics + Uptime Cron Summary

Vercel Analytics and Speed Insights components added to root layout for production page-view and Web Vitals tracking; uptime cron increased from daily to every 15 minutes.

## Tasks Completed

| Task | Name                                              | Commit    | Key Changes                                                                                                                   |
| ---- | ------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1    | Install and add Vercel Analytics + Speed Insights | `f740df9` | Installed @vercel/analytics + @vercel/speed-insights, added `<Analytics />` and `<SpeedInsights />` to body in app/layout.tsx |
| 2    | Increase uptime check cron frequency              | `85b3c7f` | Changed vercel.json cron schedule from `0 8 * * *` to `*/15 * * * *`                                                          |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` -- zero type errors
- `npm run build` -- passes cleanly
- Analytics and SpeedInsights components present in app/layout.tsx
- Cron schedule updated to `*/15 * * * *` in vercel.json
- Both @vercel/analytics and @vercel/speed-insights in package.json

## Notes

- Analytics and SpeedInsights auto-detect production vs development -- no conditional rendering or env config needed
- The uptime-check cron route (`app/api/cron/uptime-check/route.ts`) was not modified -- only the schedule frequency changed
- Vercel Pro plan (archivedqualia team) supports unlimited crons, so 15-min interval is fine
- Actual analytics data will appear in Vercel dashboard after next production deployment

## Self-Check: PASSED

All files exist, all commits found, all verification markers present.
