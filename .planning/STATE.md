# State — Portal v2

## Current Phase
Phase 5: Admin Controls — READY TO PLAN.
Phase 4 shipped to production 2026-04-14.

## Status
setup

## Active Work
None — Phase 4 shipped. Ready for Phase 5 planning.

## Progress
- [x] Phase 1: Portal Shell & Foundation — DONE
- [x] Phase 2: Client Messaging — DONE
- [x] Phase 3: Project Boards — DONE (verified 2026-04-13)
- [x] Optimization sweep — ALL WAVES COMPLETE (2026-04-14)
- [x] Phase 4: Portal Apps — DONE (shipped 2026-04-14, commit `e02c3b8`)
- [ ] Phase 5: Admin Controls
- [ ] Phase 6: Polish & Ship

## Phase 4 Deliverables
- **Client Task Board**: Read-only ProjectBoard for clients + standalone /tasks route with cross-project view
- **Feature Request Comments**: request_comments table + comment thread UI replacing single admin_response
- **Files Improvements**: Phase-based sub-grouping + inline image/PDF preview modal
- **Activity Feed**: Standalone /activity route with cross-project feed + enhanced dashboard activity

## Phases
1. Portal Shell & Foundation — done
2. Client Messaging — done
3. Project Boards (GitHub Projects-style) — done
4. Portal Apps (Tasks, Files, Requests, Activity) — done
5. Admin Controls — ready to plan
6. Polish & Ship — pending

## Branch
master

## Last Deploy
commit `e02c3b8` · 2026-04-14 · production healthy (Phase 4 shipped)

## Decisions
- Transform, don't delete — extend existing tables and actions
- Assembly-inspired sidebar with app-based navigation (Inbox promoted to slot 2 for internal users)
- Supabase Realtime for messaging
- Projects as the central organizing concept in portal
- GitHub Projects-style boards for task management (kanban + table + list views)
- Keep all internal ERP functionality untouched
- View-as impersonation adopts `effectiveRole`/`effectiveUserId` across layout + sidebar
- N+1 in messaging hot path collapsed via `computeUnreadCounts` bulk-fetch + JS bucketing
- Defer Upstash rate limiting until Upstash is provisioned (Fawzi decision)
- M16 barrel export migration deferred — 39 files, high risk, negligible real bundle impact
- Skip folder hierarchy for files MVP — phase-based grouping is sufficient

## Infrastructure Notes (for next session)
- Production Vercel project: deployed via `vercel --prod --yes` (scope: qualiasolutionscy)
- Production URL: `portal.qualiasolutions.net` (307 → `/auth/login`)
- Supabase ref: `vbpzaiqovffpsroxaulv`
- Supabase MCP is linked to Sakani org, NOT Qualia — use Supabase CLI with access token for migrations.
- Three Vercel teams exist: `qualiasolutionscy` (dev), `qualiaproduction` (prod), `qualia-glluztech`.
