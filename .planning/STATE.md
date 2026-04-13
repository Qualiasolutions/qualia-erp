# State — Portal v2

## Current Phase
Phase 4: Portal Apps (Files, Forms) — BLOCKED by mid-stream optimization sweep.
Resume Phase 4 planning only after the optimization waves below land.

## Status
optimization_in_progress

## Active Work
Multi-wave optimization run from `/qualia-optimize` 2026-04-13.
Full report + handoff instructions in `.planning/OPTIMIZE.md` (READ THIS FIRST).

- ✅ Wave A — 6 CRITICAL + H1 — LIVE (commit `8fea8bc`)
- 🟡 Wave B partial — H3..H8 LIVE (commit `7d4f862`); H2 still TODO (needs Upstash provisioning)
- ✅ Wave C — H9, H10, H11, H12, H13, H14, M13, M14, M15, M17 — LIVE (commits `24139c8`, `12e9cd0`, `d29c59e`). M16 deferred to Wave D (admin-only, not hot path).
- ⬜ Wave D — MEDIUM + LOW cleanup + H2 (Upstash) + M16 — NOT STARTED

### Migrations pending `supabase db push`
Committed to `supabase/migrations/` but not yet applied to live DB:
- `20260413000000_baseline_portal_messaging.sql`
- `20260413000100_baseline_task_attachments.sql`
- `20260413000200_baseline_financial_tables.sql`

Idempotent — safe to apply any time. Indexes + RLS policies for 6 orphan tables.

## Progress
- [x] Phase 1: Portal Shell & Foundation — DONE
- [x] Phase 2: Client Messaging — DONE
- [x] Phase 3: Project Boards — DONE (verified 2026-04-13)
- [ ] Optimization sweep — waves A done, B partial, C/D pending
- [ ] Phase 4: Portal Apps (Files, Forms) — AFTER optimization
- [ ] Phase 5: Admin Controls
- [ ] Phase 6: Polish & Ship

## Phases
1. Portal Shell & Foundation — done
2. Client Messaging — done
3. Project Boards (GitHub Projects-style) — done
4. Portal Apps (Files, Forms) — paused
5. Admin Controls — pending
6. Polish & Ship — pending

## Branch
master

## Last Deploy
commit `d29c59e` · 2026-04-13 10:14 · production healthy (Wave C-3 shipped)

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

## Infrastructure Notes (for next session)
- Production Vercel project: **`qualiaproduction/qualia-erp`** (NOT `qualiasolutionscy`).
  `.vercel/project.json` is linked to the prod project now.
- Production URL: `portal.qualiasolutions.net` (307 → `/auth/login`)
- Supabase ref: `vbpzaiqovffpsroxaulv`
- Supabase MCP is linked to Sakani org, NOT Qualia — use Supabase CLI with access token for migrations.
- Three Vercel teams exist: `qualiasolutionscy` (dev), `qualiaproduction` (prod), `qualia-glluztech`.
