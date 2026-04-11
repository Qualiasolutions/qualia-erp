# State — Portal v2

## Current Phase
Phase 4: Admin Controls

## Status
planned

## Progress
- [x] Research Assembly.com (explored every section via Playwright)
- [x] Audit existing portal codebase (22 components, 26+ actions, 7 tables)
- [x] Audit design system (tailwind config, colors, fonts, shadcn components)
- [x] Create planning files
- [x] Plan Phase 1
- [x] Build Phase 1
- [x] Verify Phase 1 — PASS (12/12 criteria, 2026-04-11)
- [x] Plan Phase 2
- [x] Build Phase 2
- [x] Verify Phase 2 — PASS (12/12 criteria, 2026-04-12)
- [x] Plan Phase 3 (Project Boards)
- [x] Build Phase 3
- [x] Verify Phase 3 — PASS (11/11 criteria, 2026-04-12)
- [x] Plan Phase 4 (Admin Controls)
- [ ] Build Phase 4
- [ ] Verify Phase 4

## Phases
1. Portal Shell & Foundation — verified ✅
2. Client Messaging — verified ✅
3. Project Boards + Files — verified ✅
4. Admin Controls — planned
5. Polish & Ship — pending

## Branch
feat/portal-v2-assembly

## Decisions
- Transform, don't delete — extend existing tables and actions
- Assembly-inspired sidebar with app-based navigation
- Supabase Realtime for messaging (Phase 2)
- Projects as the central organizing concept in portal
- Keep all internal ERP functionality untouched
- App config: workspace defaults + per-client overrides (Phase 4)
- Branding: workspace-level (logo, name, accent color) (Phase 4)
