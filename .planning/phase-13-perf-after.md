# Phase 13 — Performance After-Measurement (post-change)

Captured after Phase 13 code changes + indexes landed.
Commits in chain: `28ac55a` (cached reads + SWR + JOIN), `747f57f` (middleware + deps), `972b22b` (portal-cache adoption), `0d5199c` (SWR revert — cached-reads can't cross the client boundary). DB indexes applied via `phase13_performance_indexes` migration.

**NOTE:** Post-measurement runs against production. The code commits above are NOT YET DEPLOYED to prod — they'll go out via the production deploy at the end of the phase chain. Indexes ARE live (applied directly via Supabase MCP). So this capture measures **index-only improvement** against the same prod codebase used for phase-13-perf-baseline.md.

A second post-deploy capture will be taken after the production deploy lands.

## Method
`curl -w` timing, 5 runs per endpoint, same method as baseline.

## Endpoints & runs

(appended by the measurement script below)
### `/`

| Run | HTTP | time_total |
|---|---|---|
| 1 | 307 | 0.344898s |
| 2 | 307 | 0.206577s |
| 3 | 307 | 0.384326s |
| 4 | 307 | 0.200549s |
| 5 | 307 | 0.256426s |

### `/auth/login`

| Run | HTTP | time_total |
|---|---|---|
| 1 | 200 | 0.351171s |
| 2 | 200 | 0.217248s |
| 3 | 200 | 0.229156s |
| 4 | 200 | 0.244090s |
| 5 | 200 | 0.253142s |

### `/api/health`

| Run | HTTP | time_total |
|---|---|---|
| 1 | 200 | 1.454349s |
| 2 | 200 | 0.725927s |
| 3 | 200 | 0.712780s |
| 4 | 200 | 0.425803s |
| 5 | 200 | 0.512223s |

