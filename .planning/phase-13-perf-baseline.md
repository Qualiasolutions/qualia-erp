# Phase 13 — Performance Baseline (pre-change)

Captured 2026-04-19T21:43:18Z against production **before** Phase 13 code changes landed.
Post-Phase-12 state: commit 6c66a28 · cacheComponents enabled (Phase 10) · 9 portal pages still bypass portal-cache helpers · no indexes on client_projects.

## Method
`curl -w` timing, 5 runs per endpoint, no caching primed between runs. Measured on the unauthenticated edge (portal home 307→login, health 200, login 200). Authenticated page TTFB would require a session cookie; edge timings are a good proxy for portal chrome cost.

## Endpoints & runs

### `/`

| Run | HTTP | time_total |
|---|---|---|
| 1 | 307 | 0.582485s |
| 2 | 307 | 0.379307s |
| 3 | 307 | 0.372445s |
| 4 | 307 | 0.243188s |
| 5 | 307 | 0.297574s |

### `/auth/login`

| Run | HTTP | time_total |
|---|---|---|
| 1 | 200 | 0.617612s |
| 2 | 200 | 0.286485s |
| 3 | 200 | 0.300464s |
| 4 | 200 | 0.216043s |
| 5 | 200 | 0.284635s |

### `/api/health`

| Run | HTTP | time_total |
|---|---|---|
| 1 | 200 | 1.520248s |
| 2 | 200 | 0.713504s |
| 3 | 200 | 0.535199s |
| 4 | 200 | 0.975661s |
| 5 | 200 | 0.545338s |

