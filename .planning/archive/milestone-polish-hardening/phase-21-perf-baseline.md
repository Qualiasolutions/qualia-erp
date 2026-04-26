# Performance Baseline — Phase 21

**Date:** 2026-04-21
**Commit:** b1ec710
**Next.js version:** ^16.2.1 (built with 16.2.4, Turbopack)
**Purpose:** Frozen route-size snapshot at the close of the Remaining Surfaces milestone. Future phases should not increase any route's first-load JS by more than 15% without justification.

## Build Output (full route manifest)

```
Route (app)
┌ ◐ /
├ ○ /_not-found
├ ◐ /activity
├ ◐ /admin
├ ◐ /admin/assignments
├ ◐ /admin/attendance
├ ◐ /admin/reports
├ ◐ /admin/tasks
├ ◐ /agent
├ ƒ /api/admin/resync-planning
├ ƒ /api/chat
├ ƒ /api/claude/project-status
├ ƒ /api/claude/report-upload
├ ƒ /api/claude/session-feed
├ ƒ /api/claude/session-log
├ ƒ /api/cron/attendance-report
├ ƒ /api/cron/blog-tasks
├ ƒ /api/cron/cleanup-dry-run-reports
├ ƒ /api/cron/morning-email
├ ƒ /api/cron/reminders
├ ƒ /api/cron/research-tasks
├ ƒ /api/cron/supabase-check
├ ƒ /api/cron/uptime-check
├ ƒ /api/cron/weekly-digest
├ ƒ /api/cron/zoho-sync
├ ƒ /api/embeddings
├ ƒ /api/github/webhook
├ ƒ /api/health
├ ƒ /api/tts
├ ƒ /api/v1/reports
├ ƒ /api/webhooks/vercel
├ ƒ /auth/confirm
├ ◐ /auth/error
├ ○ /auth/login
├ ○ /auth/reset-password
├ ○ /auth/reset-password/confirm
├ ◐ /auth/signup
├ ◐ /billing
├ ◐ /clients
├ ◐ /clients/[id]
│ └ /clients/[id]
├ ◐ /files
├ ◐ /inbox
├ ◐ /knowledge
├ ○ /manifest.webmanifest
├ ◐ /messages
├ ○ /opengraph-image.png
├ ◐ /projects
├ ◐ /projects/[id]
│ └ /projects/[id]
├ ◐ /projects/[id]/files
│ └ /projects/[id]/files
├ ◐ /projects/[id]/roadmap
│ └ /projects/[id]/roadmap
├ ◐ /requests
├ ◐ /research
├ ○ /robots.txt
├ ◐ /schedule
├ ◐ /seo
├ ◐ /settings
├ ◐ /settings/integrations
├ ◐ /settings/notifications
├ ƒ /sitemap.xml
├ ◐ /status
├ ◐ /tasks
├ ◐ /team
├ ○ /twitter-image.png
├ ◐ /video-player/[slug]
│ └ /video-player/[slug]
└ ◐ /workspace

ƒ Proxy (Middleware)

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
ƒ  (Dynamic)            server-rendered on demand
```

**Note:** Next.js 16 with Turbopack does not display per-route size columns in the CLI route manifest. The per-route client JS analysis below was derived by parsing `.next/server/app/*.meta` files, which record the exact `scriptResources` and `styleResources` each route requires at first load.

## Top 10 Routes by First Load JS

| Rank | Route | Client JS | CSS | First Load Total | Kind |
|------|-------|-----------|-----|------------------|------|
| 1 | /projects/[id]/roadmap | 1840.7 kB | 166.5 kB | 2007.2 kB | ◐ (Partial Prerender) |
| 2 | /settings/integrations | 1793.1 kB | 166.5 kB | 1959.7 kB | ◐ (Partial Prerender) |
| 3 | /agent | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ (Partial Prerender) |
| 4 | /tasks | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ (Partial Prerender) |
| 5 | /projects | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ (Partial Prerender) |
| 6 | /projects/[id] | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ (Partial Prerender) |
| 7 | /projects/[id]/files | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ (Partial Prerender) |
| 8 | /team | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ (Partial Prerender) |
| 9 | /billing | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ (Partial Prerender) |
| 10 | /messages | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ (Partial Prerender) |

## All Page Routes by First Load JS

| Route | Client JS | CSS | First Load Total | Kind |
|-------|-----------|-----|------------------|------|
| /projects/[id]/roadmap | 1840.7 kB | 166.5 kB | 2007.2 kB | ◐ Partial Prerender |
| /auth/login | 1799.6 kB | 166.5 kB | 1966.1 kB | ○ Static |
| /auth/reset-password/confirm | 1796.2 kB | 166.5 kB | 1962.7 kB | ○ Static |
| /auth/reset-password | 1794.8 kB | 166.5 kB | 1961.3 kB | ○ Static |
| /settings/integrations | 1793.1 kB | 166.5 kB | 1959.7 kB | ◐ Partial Prerender |
| /agent | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ Partial Prerender |
| /billing | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ Partial Prerender |
| /messages | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ Partial Prerender |
| /projects | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ Partial Prerender |
| /projects/[id] | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ Partial Prerender |
| /projects/[id]/files | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ Partial Prerender |
| /tasks | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ Partial Prerender |
| /team | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ Partial Prerender |
| /workspace | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ Partial Prerender |
| /activity | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ Partial Prerender |
| /files | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ Partial Prerender |
| /seo | 1781.7 kB | 166.5 kB | 1948.3 kB | ◐ Partial Prerender |
| /video-player/[slug] | 1781.6 kB | 166.5 kB | 1948.2 kB | ◐ Partial Prerender |
| /admin | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /admin/assignments | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /admin/attendance | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /admin/reports | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /admin/tasks | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /clients | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /clients/[id] | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /inbox | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| / | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /knowledge | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /requests | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /research | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /schedule | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /settings | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /settings/notifications | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /status | 1779.8 kB | 166.5 kB | 1946.3 kB | ◐ Partial Prerender |
| /_not-found | 1768.5 kB | 166.5 kB | 1935.0 kB | ○ Static |
| /auth/signup | 1692.4 kB | 166.5 kB | 1859.0 kB | ◐ Partial Prerender |
| /auth/error | 1665.9 kB | 166.5 kB | 1832.4 kB | ◐ Partial Prerender |

## Chunk Analysis

### Shared JS (loaded by every route)

24 shared chunks totaling **1658.5 kB** are included in every page's first load. Top shared chunks:

| Chunk | Size |
|-------|------|
| 0zwn79-my~0-q.js | 488.5 kB |
| 12ql2zvy40yq9.js | 227.6 kB |
| 0895i5vyrf.fi.js | 219.7 kB |
| 0sri18k7o8whi.js | 104.7 kB |
| 1410pz-6di8qn.js | 64.9 kB |
| 0xwntg3w.6amc.js | 57.6 kB |
| 0twgc~.2gw~2n.js | 52.9 kB |
| 146ppd58.of.0.js | 48.9 kB |
| 08u21tywygbqp.js | 47.8 kB |
| 04ocm_kw~2o8z.js | 44.2 kB |

### Static Asset Totals

| Category | Size |
|----------|------|
| Total client JS (98 chunks) | 3.0 MB |
| Total CSS | 166.5 kB |
| Shared JS (24 chunks, all routes) | 1658.5 kB |
| Route-specific JS (19 chunks) | 233.6 kB |
| Static output (.next/static/) | 4.1 MB |
| Server output (.next/server/) | 78 MB |
| Font files (.next/static/media/) | 704 kB |

## Summary

- **Total routes:** 64 (8 Static, 32 Partial Prerender, 24 Dynamic)
- **Total page routes (non-API):** 37
- **Shared JS chunks:** 1658.5 kB (loaded by every page)
- **CSS:** 166.5 kB (single shared stylesheet)
- **Largest page:** `/projects/[id]/roadmap` at 2007.2 kB first-load total (1840.7 kB JS + 166.5 kB CSS), driven by 2 extra route-specific chunks for the roadmap side-rail component
- **Smallest page:** `/auth/error` at 1832.4 kB first-load total
- **Observation:** The shared JS baseline of 1658.5 kB is elevated for a portal application -- the three largest shared chunks (488 kB, 228 kB, 220 kB) account for 56% of shared JS and likely correspond to React runtime, Supabase client, and the SWR/UI library bundle. Per-route differentiation is low (most routes vary by only ~120 kB above the shared baseline), which indicates good code-splitting for route-specific logic but a heavy shared foundation. The overall JS budget is acceptable for an internal portal with PPR (Partial Prerender) mitigating first-paint impact, but the shared baseline would benefit from investigation in a future optimization phase -- particularly the 488 kB top chunk which alone exceeds the recommended 200 kB per-chunk guideline.

## Usage

This baseline is the regression threshold for the Launch milestone. Future phases should not increase any route's first-load JS by more than 15% without justification. Re-measure with `npm run build` after significant structural changes. To investigate chunk contents, run `ANALYZE=true npm run build` to generate a bundle analysis report.
