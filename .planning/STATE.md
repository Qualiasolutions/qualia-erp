# State — Portal v2

## Current Phase
Phase 4: Portal Apps (Files, Forms) — READY TO PLAN.
Optimization sweep complete. Resume with `/qualia-plan 4`.

## Status
setup

## Active Work
None — optimization sweep complete. Ready for Phase 4 planning.

## Optimization Sweep — Complete
All waves shipped. Full report in `.planning/OPTIMIZE.md`.

- ✅ Wave A — 6 CRITICAL + H1 — LIVE (commit `8fea8bc`)
- ✅ Wave B partial — H3..H8 LIVE (commit `7d4f862`); H2 deferred (needs Upstash)
- ✅ Wave C — H9..H14 + M13..M17 — LIVE (commits `24139c8`, `12e9cd0`, `d29c59e`)
- ✅ Wave D — H2 actor fix, M1..M5 security, M6..M12 frontend, M19..M22 perf — LIVE (commit `11052e0`)
- Deferred to Phase 5 (Polish): M16 (barrel exports), M18 (more virtualization), L1-L18 (low priority)

### Migrations
All applied to production (2026-04-14):
- `20260413000000_baseline_portal_messaging.sql` — 3 tables, 5 indexes, 9 RLS policies
- `20260413000100_baseline_task_attachments.sql` — 1 table, 2 indexes, 3 RLS policies
- `20260413000200_baseline_financial_tables.sql` — 2 tables, 3 indexes, 2 RLS policies (client invoice RLS bug fixed)

## Progress
- [x] Phase 1: Portal Shell & Foundation — DONE
- [x] Phase 2: Client Messaging — DONE
- [x] Phase 3: Project Boards — DONE (verified 2026-04-13)
- [x] Optimization sweep — ALL WAVES COMPLETE (2026-04-14)
- [ ] Phase 4: Portal Apps (Files, Forms) — READY TO PLAN
- [ ] Phase 5: Admin Controls
- [ ] Phase 6: Polish & Ship

## Phases
1. Portal Shell & Foundation — done
2. Client Messaging — done
3. Project Boards (GitHub Projects-style) — done
4. Portal Apps (Files, Forms) — ready to plan
5. Admin Controls — pending
6. Polish & Ship — pending

## Branch
master

## Last Deploy
commit `d29c59e` · 2026-04-13 10:14 · production healthy (Wave C-3 shipped)
Wave D committed locally (`11052e0`) — deploy pending.

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

## Infrastructure Notes (for next session)
- Production Vercel project: deployed via `vercel --prod --yes` (scope: qualiasolutionscy)
- Production URL: `portal.qualiasolutions.net` (307 → `/auth/login`)
- Supabase ref: `vbpzaiqovffpsroxaulv`
- Supabase MCP is linked to Sakani org, NOT Qualia — use Supabase CLI with access token for migrations.
- Three Vercel teams exist: `qualiasolutionscy` (dev), `qualiaproduction` (prod), `qualia-glluztech`.
