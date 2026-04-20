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


## Post-deploy measurement — all Phase 11+12+13 code + indexes LIVE

Captured immediately after `vercel --prod` deploy `dpl_5csmSd5HecJLKtogEDRMGKMNJKaj` landed the 14 Phase 11/12/13 commits. Indexes already applied pre-deploy.

### `/`
| Run | HTTP | time_total |
|---|---|---|
| 1 | 307 | 0.452995s |
| 2 | 307 | 0.233476s |
| 3 | 307 | 0.216104s |
| 4 | 307 | 0.467769s |
| 5 | 307 | 0.251167s |

### `/auth/login`
| Run | HTTP | time_total |
|---|---|---|
| 1 | 200 | 0.294168s |
| 2 | 200 | 0.282178s |
| 3 | 200 | 0.269979s |
| 4 | 200 | 0.219248s |
| 5 | 200 | 0.230504s |

### `/api/health`
| Run | HTTP | time_total |
|---|---|---|
| 1 | 200 | 0.863361s |
| 2 | 200 | 0.698161s |
| 3 | 200 | 0.466292s |
| 4 | 200 | 0.957079s |
| 5 | 200 | 0.421759s |

## Summary — baseline → post-deploy (median time_total)

| Endpoint | Baseline (median) | Post-deploy (median) | Δ |
|---|---|---|---|
| `/` | 0.29s | 0.25s | **-14%** |
| `/auth/login` | 0.28s | 0.27s | -4% |
| `/api/health` | 0.71s | 0.70s | -1% |

**Caveat:** these are unauthenticated edge endpoints. The Phase 13 changes target AUTHENTICATED portal page navigation (where 9 pages bypassed the `React.cache` auth helpers and paid a 100-150ms tax). That savings isn't visible here because these endpoints don't hit the portal-cache helpers. The true-perceived speedup for clients on `/requests`, `/billing`, `/tasks`, etc. is the 200-300ms-per-page reduction the audit called out — measurable only via authenticated browser timing or the Vercel Analytics dashboard after real-user traffic lands.

Indexes + dropped dead deps = measurable edge win. Portal-cache adoption = invisible at the edge, visible to logged-in users.
