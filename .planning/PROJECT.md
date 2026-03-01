# Qualia Portal & Trainee Execution System

## What This Is

Two interconnected features for the Qualia Internal Suite: a **Trainee Interactive Execution System** where Moayad follows GSD phases step-by-step with guided task checklists and phase-level review by Fawzi, and a **Client Portal** where clients log in to see their project roadmap, progress, shared files, and leave feedback. Both build on existing infrastructure: GSD templates, phase cards, pipeline constants, Supabase RLS, and auth middleware.

## Core Value

Moayad can independently execute project phases with clear guidance while Fawzi reviews at phase boundaries — and clients see real-time project progress without internal complexity.

## Requirements

### Validated

- ✓ Database tables created (phase_reviews, project_integrations, activity_log, client_projects, phase_comments) — existing
- ✓ project_files extended with phase_name, description, is_client_visible — existing
- ✓ user_role enum has 'client' value — existing
- ✓ is_client_of_project() RLS helper function — existing
- ✓ RLS policies on all new tables — existing
- ✓ Phase review server actions (submit, approve, request changes) — existing
- ✓ Phase review button component — existing
- ✓ Admin review panel component — existing
- ✓ Project integrations component (GitHub/Vercel links) — existing
- ✓ Admin reviews queue page (/admin/reviews) — existing
- ✓ PendingReviewsBadge in projects header — existing

### Active

- [ ] Interactive task checklist with helperText and GSD commands per phase (task-instruction-card)
- [ ] Phase locking enforcement in server actions (can't start EXECUTE before PLAN approved)
- [ ] Wire project integrations into project detail page
- [ ] Client auth & middleware role-based routing (client → /portal)
- [ ] Portal layout (clean, no admin sidebar)
- [ ] Portal projects list (/portal)
- [ ] Portal project roadmap view (/portal/[id]) — simplified phases, no task details
- [ ] Shared files — file upload widget with visibility toggle, client download page
- [ ] Client comments on phases (internal vs external visibility)
- [ ] Client activity feed (/portal/[id]/updates)
- [ ] Portal styling — clean, minimal, mobile-responsive, Qualia branding
- [ ] Email notifications (phase approved/changes requested, submitted for review, client updates)
- [ ] Mobile responsiveness testing (portal on phone, admin on tablet)

### Out of Scope

- Screenshot/evidence uploads — trust GSD process + phase review
- Full GitHub/Vercel OAuth — URL links only for now
- Real-time collaboration — not needed for 2-person team + clients
- Client editing or task visibility — read-only + comments
- Complex multi-step approval — simple approve/request changes

## Context

- **Existing codebase**: Next.js 16 + Supabase ERP with 30+ tables, server actions, SWR hooks
- **Partially built**: Phase 0 (database) complete, Phase 1 ~40% frontend done (review workflow, integrations, admin overview components exist but some not wired in)
- **Not built**: Entire client portal (Phase 2), task instruction cards (Phase 1.1), email notifications (Phase 3)
- **Trainee**: Moayad — employee role, follows GSD pipeline phases
- **Key files**: `components/project-pipeline/phase-card.tsx`, `app/actions/phase-reviews.ts`, `lib/gsd-templates.ts`, `lib/pipeline-constants.ts`

## Constraints

- **Stack**: Next.js 16 App Router, Supabase, Tailwind/shadcn — must use existing patterns
- **Auth**: Same Supabase auth for all roles (admin, employee, client) — middleware handles routing
- **Design**: Clean, professional like Linear/Plane — no flashy effects (per project CLAUDE.md)
- **Security**: RLS on every table, auth.uid() derivation, no service_role client-side

## Key Decisions

| Decision                                                | Rationale                                                           | Outcome   |
| ------------------------------------------------------- | ------------------------------------------------------------------- | --------- |
| Phase review is simple (approve/request changes + note) | Complexity kills adoption — Moayad needs clarity not bureaucracy    | — Pending |
| Single login page for all roles                         | Simpler auth flow, role detected from profile.role                  | — Pending |
| GitHub/Vercel are URL links first                       | API integration comes later, start simple                           | — Pending |
| Client portal is read-only + comments                   | No editing, no task visibility — clients see progress not internals | — Pending |
| Activity log drives both admin overview and client feed | Single table, is_client_visible flag filters what clients see       | — Pending |
| Build trainee system first, client portal second        | Trainee system is higher priority, portal can ship later            | — Pending |

---

_Last updated: 2026-03-01 after initialization_
