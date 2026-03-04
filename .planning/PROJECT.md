# Qualia Portal & Trainee Execution System

## What This Is

Two interconnected features for the Qualia Internal Suite: a **Trainee Interactive Execution System** where Moayad follows GSD phases step-by-step with guided task checklists and phase-level review by Fawzi, and a **Client Portal** where clients log in to see their project roadmap, progress, shared files, and leave feedback. Both build on existing infrastructure: GSD templates, phase cards, pipeline constants, Supabase RLS, and auth middleware.

## Core Value

Moayad can independently execute project phases with clear guidance while Fawzi reviews at phase boundaries — and clients see real-time project progress without internal complexity.

## Requirements

### Validated

- ✓ Database tables created (phase_reviews, project_integrations, activity_log, client_projects, phase_comments) — v1.0
- ✓ project_files extended with phase_name, description, is_client_visible — v1.0
- ✓ user_role enum has 'client' value — v1.0
- ✓ is_client_of_project() RLS helper function — v1.0
- ✓ RLS policies on all new tables — v1.0
- ✓ Phase review server actions (submit, approve, request changes) — v1.0
- ✓ Phase review button component — v1.0
- ✓ Admin review panel component — v1.0
- ✓ Project integrations component (GitHub/Vercel links) — v1.0
- ✓ Admin reviews queue page (/admin/reviews) — v1.0
- ✓ PendingReviewsBadge in projects header — v1.0
- ✓ Interactive task checklist with helperText and GSD commands — v1.0
- ✓ Phase locking enforcement (can't start next phase until previous approved) — v1.0
- ✓ Project integrations wired into project detail page — v1.0
- ✓ Client auth & middleware role-based routing (client → /portal) — v1.0
- ✓ Portal layout (clean, no admin sidebar, Qualia branding) — v1.0
- ✓ Portal projects list (/portal) — v1.0
- ✓ Portal project roadmap view (/portal/[id]) — v1.0
- ✓ Shared files with visibility toggle and client download — v1.0
- ✓ Client comments on phases (internal vs external visibility) — v1.0
- ✓ Client activity feed (/portal/[id]/updates) — v1.0

### Active

- [ ] Apple-level design overhaul — portal and trainee system (animations, micro-interactions, pixel-perfect spacing)
- [ ] Complete email notifications (review workflow: submitted, approved, changes requested)
- [ ] Fix ghost comment on failure (optimistic rollback)
- [ ] Activity feed pagination (cursor-based with "Load more")
- [ ] Schedule grid consolidation (3 duplicates → 1 component)
- [ ] Mobile responsive perfection (portal + trainee on all screen sizes)
- [ ] Loading skeletons and polished empty states across all portal/trainee pages
- [ ] Code cleanup (duplicate constants, utility consolidation, date formatting)

### Out of Scope

- Screenshot/evidence uploads — trust GSD process + phase review
- GitHub/Vercel API integration — deferred to v1.2
- Real-time collaboration — not needed for 2-person team + clients
- Client editing or task visibility — read-only + comments
- Complex multi-step approval — simple approve/request changes
- Offline mode — web-first approach
- New features — v1.1 is polish only, no new capabilities

## Current Milestone: v1.1 Production Polish

**Goal:** Make the client portal and trainee system Apple-level polished, fully functional, and ready to ship to real clients.

**Target:**

- Apple-level design overhaul (both portal and trainee)
- Complete all incomplete features (emails, pagination, error handling)
- Fix all remaining bugs
- Consolidate duplicate code (~1,700 lines saved)
- Mobile responsive perfection

## Context

Shipped v1.0 with 94,314 LOC TypeScript. 6 quick tasks shipped post-v1.0 (14/24 TODO fixes, -835 lines).
Tech stack: Next.js 16, Supabase, Tailwind/shadcn, SWR.
53 files created/modified across 4 phases, 8 plans + 6 quick tasks.
Trainee system and client portal both functional but not premium quality.
10 TODO items remain from production hardening audit.

## Constraints

- **Stack**: Next.js 16 App Router, Supabase, Tailwind/shadcn — must use existing patterns
- **Auth**: Same Supabase auth for all roles (admin, employee, client) — middleware handles routing
- **Design**: Apple-level polish — every pixel considered, smooth animations, feels expensive
- **Security**: RLS on every table, auth.uid() derivation, no service_role client-side

## Key Decisions

| Decision                                                     | Rationale                                                           | Outcome |
| ------------------------------------------------------------ | ------------------------------------------------------------------- | ------- |
| Phase review is simple (approve/request changes + note)      | Complexity kills adoption — Moayad needs clarity not bureaucracy    | ✓ Good  |
| Single login page for all roles                              | Simpler auth flow, role detected from profile.role                  | ✓ Good  |
| GitHub/Vercel are URL links first                            | API integration comes later, start simple                           | ✓ Good  |
| Client portal is read-only + comments                        | No editing, no task visibility — clients see progress not internals | ✓ Good  |
| Activity log drives both admin overview and client feed      | Single table, is_client_visible flag filters what clients see       | ✓ Good  |
| Build trainee system first, client portal second             | Trainee system is higher priority, portal can ship later            | ✓ Good  |
| phase_items table is template-driven (not user-editable)     | Separates GSD workflow from ad-hoc tasks                            | ✓ Good  |
| Progress calculated from project_status for client view      | Simpler than phase-based calculation                                | ✓ Good  |
| Files default to internal-only for security                  | Explicit opt-in for client visibility                               | ✓ Good  |
| Client download requires client_projects + is_client_visible | Defense in depth security                                           | ✓ Good  |

| Apple-level design overhaul for v1.1 | Premium look builds client trust, differentiates Qualia | — Pending |

---

_Last updated: 2026-03-04 after v1.1 milestone start_
