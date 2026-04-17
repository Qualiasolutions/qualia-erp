# State — Portal v2

## Current Phase
Phase 6: Polish & Ship — DONE.
Portal v2 roadmap complete. Shipped to production 2026-04-17.

## Status
done

## Active Work
None — Portal v2 all 6 phases complete. Ready for handoff / new milestone.

---

### Completed: Phase 6 built (2026-04-17)
5 tasks / 3 waves / 4 commits. Gates: tsc 0 / lint 0 errors / build success. Migration applied via Supabase MCP. `/admin/board` restored.

### Completed: Phase 5 verified PASS (2026-04-17)
4 tasks / 3 waves / 4 commits / 21 contracts all PASS / tsc clean / all 8 success criteria scored ≥3.

Commits:
- `177f35d` — portal_settings table migration + server actions + Zod schema
- `2de2fcf` — Client Access tab gap fix (wired to getPortalClientManagement)
- `39ce639` — SWR hook + cache key + invalidation
- `5774d76` — Portal Settings tab UI (auth / notification defaults / custom domain)

**Pending infrastructure (not a code gap):**
1. Apply migration: `npx supabase db push --linked` — writes `portal_settings` table
2. Regenerate types: `npx supabase gen types typescript --project-id vbpzaiqovffpsroxaulv > types/database.ts`
3. Browser QA blocked — Playwright MCP not connected. To enable: `claude mcp add playwright npx @playwright/mcp@latest` then re-run /qualia-verify 5.

Ready for Phase 6: Polish & Ship.

Out-of-band: framework v3.4.2-compat layer shipped to prod 2026-04-17 (commit `f907028`). Accepts per-user `qlt_*` tokens OR legacy `CLAUDE_API_KEY` (grandfathered until 2026-05-17). Polymorphic `gap_cycles`, 24h idempotency. Branch 2 (`feature/erp-v3.5-fields`) and branch 3 (`feature/erp-v3.6-cleanup`) still to go — gated on framework v3.5/v3.6 tags.

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
