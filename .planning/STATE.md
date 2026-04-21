# State — Portal v2

## Current Phase
Between milestones. **UI Remake milestone CLOSED 2026-04-20** (phases 14 + 15 + 16.1 + 16.2 + 16.3 + 16.4 + 16.5 + 16.6 all shipped). Next milestone: **Remaining Surfaces** (Phase 17+) — redesign the rest of the app to match the new design system (admin pages, client portal pages, secondary internal pages).

## Status
shipped · milestone-closed

## Last deploy
- 2026-04-20 ~10:50 UTC
- Commit: `307c183`
- Alias: https://portal.qualiasolutions.net
- Deploy URL: `qualia-f06msxqj6-qualiasolutionscy.vercel.app`
- Post-deploy: `/` 307 (auth redirect), `/auth/login` 200, `/api/health` 200 @ 980ms (cold, DB 401ms)
- Health payload reports `version: 307c183` — perf harden commit live

## UI Remake milestone — summary (8 phases, 1 day)

All shipped 2026-04-20. See `.planning/archive/milestone-ui-remake/CLOSE.md` for full detail.

| Phase | Commit | What |
|---|---|---|
| 14 | `7e6a6b7` | Design System Foundation (tokens, motion, ease-premium, elevation) |
| 15 | `57521e0` · `99785f1` | Portal Shell — QualiaSidebar replaces PortalSidebarV2 |
| 16.1 | `22ac5d3` | Today page — QualiaToday (admin + employee) |
| 16.2 | `61f2029` | Tasks — QualiaTasksList single-column + inline composer |
| 16.3 | `0be99ff` | Projects — QualiaProjectsGallery editorial gallery + list toggle |
| 16.4 | `e3415a8` | Roadmap — QualiaRoadmap Gantt + breakdown (replaces redirect) |
| 16.5 | `beae6d6` | Schedule — QualiaSchedule week ribbon + TZ bands |
| 16.6 | `307c183` | Perf harden — virtualization · memo · skeleton · meetings date-range · color helpers |

## Next milestone: Remaining Surfaces

**Why now:** The 5 core work surfaces (Today, Tasks, Projects, Roadmap, Schedule) and the shell are done. The rest of the app still uses pre-remake UI, which creates a visual mismatch. This milestone brings everything else into the new design system.

**Sketch (to be detailed at `/qualia-plan 17`):**

- **Phase 17** — Admin pages (`/admin`, `/admin/assignments`, `/admin/attendance`, `/admin/reports`) + Control surface
- **Phase 18** — Client-facing portal pages (`/portal/*` — hub, billing, requests, settings)
- **Phase 19** — Secondary internal pages (`/clients`, `/team`, `/payments`, `/knowledge`, `/research`, `/seo`, `/status`, `/agent`, `/settings/*`)
- **Phase 20** — Roadmap side rail (lead/team/resources/files/notes — deferred from 16.4)
- **Phase 21** — Final polish + launch (SEO meta, empty-state copy sweep, a11y pass, performance baseline)

## Open follow-ups (not blockers)

- **OPTIMIZE.md Ph16-M1..M3 + L1..L3** — all closed in Phase 16.6 (commit `307c183`)
- **OPTIMIZE.md Phase 6 backlog** (BH1, BH2, BH5, medium/low items) — still deferred; fold into Phase 17 where relevant
- **Dependabot vulnerabilities** — 24 transitive (3 critical / 6 high). Separate track.
- **Manager role on project workflow** — Fawzi-flagged, intent decision deferred

## Project-state files (preserved in .planning/)

- `PROJECT.md` · `REQUIREMENTS.md` · `ROADMAP.md` · `DESIGN.md` · `OPTIMIZE.md`
- `.planning/archive/milestone-ui-remake/` — all 8 UI Remake phase plans + verifications + CLOSE.md

## Branch
master — up to date with origin, clean tree

## Infrastructure
- Vercel: deploy via `vercel --prod --yes` (scope: qualiasolutionscy)
- Production URL: `portal.qualiasolutions.net` (307 → `/auth/login`)
- Supabase ref: `vbpzaiqovffpsroxaulv`
- Three Vercel teams: `qualiasolutionscy` (dev, current), `qualiaproduction` (prod), `qualia-glluztech`

## Decisions carried forward

- Transform, don't delete — extend existing tables and actions
- Keep all existing server actions, SWR hooks, RLS policies unchanged through UI remakes
- Deterministic client-accent hue via `hueFromId` in `lib/color-constants.ts` (no per-client brand-color DB column)
- Full-width fluid layouts — no hardcoded max-width caps
- GeistSans/GeistMono only — no Inter/Arial/system-ui
- `ease-premium` (`cubic-bezier(0.16, 1, 0.3, 1)`) for general motion; no bounce/spring
- Component shim pattern for big callsite swaps (used for `tasks-view.tsx`, `projects-client.tsx` in Phase 16)
