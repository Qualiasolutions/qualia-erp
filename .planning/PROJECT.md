# Qualia Portal & Trainee Execution System

## What This Is

Two interconnected features for the Qualia Internal Suite: a **Trainee Interactive Execution System** where Moayad follows GSD phases step-by-step with guided task checklists and phase-level review by Fawzi, and a **Client Portal** where clients log in to see their project roadmap, progress, shared files, and leave feedback. Both built with premium Apple-level animation polish including stagger reveals, spring physics, gesture-based drawers, and smooth page transitions.

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
- ✓ Content-shaped loading skeletons across all portal pages — v1.1
- ✓ Smooth crossfade transitions from skeleton to content — v1.1
- ✓ Styled empty states on activity feed, projects list, files page — v1.1
- ✓ Page transitions between portal and trainee/admin pages — v1.1
- ✓ Modal/dialog entrance and exit animations — v1.1
- ✓ Dark mode smooth transition — v1.1
- ✓ Button press feedback and card hover states — v1.1
- ✓ Task completion success animation — v1.1
- ✓ Phase review email notifications (submit, approve, changes) — v1.1
- ✓ Optimistic rollback fix for failed comments — v1.1
- ✓ Schedule grid consolidation (3 → 1 component, ~1,700 lines saved) — v1.1
- ✓ Mobile responsive perfection (375px, touch targets, drawers) — v1.1
- ✓ Accessibility: prefers-reduced-motion support — v1.1
- ✓ Stagger animations on task/inbox lists — v1.2
- ✓ Scroll-triggered reveals on roadmap phases — v1.2
- ✓ Spring physics on buttons and cards — v1.2
- ✓ Gesture-based mobile drawers (Vaul) — v1.2
- ✓ Activity feed cursor-based pagination — v1.2
- ✓ Standardized date formatting across portal — v1.2
- ✓ useServerAction hook for form boilerplate reduction — v1.2
- ✓ Schedule utility consolidation (3 → 2 files) — v1.2
- ✓ Employee-project assignment with automatic notifications — v1.3
- ✓ Unified notification system via Resend for all stakeholder interactions — v1.3
- ✓ Complete client portal design overhaul (Apple-like aesthetic matching ERP) — v1.3
- ✓ All portal pages functional: roadmap, features, UI, invoices, requests, settings — v1.3
- ✓ Two-way project synchronization (portal ↔ ERP + client mapping) — v1.3
- ✓ Real-time status sync between ERP and portal systems — v1.3
- ✓ Admin can import ERP projects and configure portal settings — v1.4
- ✓ Admin can send branded invitation emails with lifecycle tracking — v1.4
- ✓ Client can create account via invitation link with auto-login — v1.4
- ✓ Client gains immediate access to project portal after signup — v1.4

### Active

(None — plan next milestone)

### Out of Scope

- GitHub/Vercel API integration — URL links sufficient for now
- Real-time collaboration — not needed for 2-person team + clients
- Client editing or task visibility — read-only + comments by design
- 3D effects or parallax — anti-feature, hurts focus
- Offline mode — web-first approach
- Test coverage increase — important but separate effort

## Context

Shipped v1.5.1 with 158,543 LOC TypeScript. 6 milestones complete (v1.0 MVP, v1.1 Production Polish, v1.2 Premium Animations, v1.3 Full ERP-Portal Integration, v1.4 Admin Portal Onboarding, v1.5.1 Security Hardening).
Tech stack: Next.js 16, Supabase, Tailwind/shadcn, SWR, Framer Motion, Vaul, Resend.
25 phases completed across 6 milestones, 49 plans executed.
Trainee system and client portal fully functional with complete ERP integration, real-time sync, unified notifications, Apple-like design system, end-to-end client onboarding flow, and production-ready security hardening.
All IDOR vulnerabilities patched, token-based invitations, Zod input validation, and production observability in place.
Ready for next milestone planning.

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
| Apple-level design overhaul for v1.1                         | Premium look builds client trust, differentiates Qualia             | ✓ Good  |
| CSS spring curves for buttons, Framer Motion for cards       | Preserves Slot.Root pattern, natural elastic feel                   | ✓ Good  |
| Vaul for gesture drawers over custom implementation          | Built-in gesture physics, accessibility, matches shadcn patterns    | ✓ Good  |
| Cursor-based pagination over offset-based                    | Prevents duplicate/missing items with real-time data                | ✓ Good  |
| useServerAction hook for form state standardization          | 50%+ boilerplate reduction, consistent patterns                     | ✓ Good  |
| Schedule-shared.ts merged into schedule-utils.ts             | Single source of schedule logic, reduced file count                 | ✓ Good  |
| Soft delete pattern for project assignments                  | Preserves complete audit trail, enables reassignment history        | ✓ Good  |
| Database view for integration mappings                       | portal_project_mappings avoids N+1 queries                          | ✓ Good  |
| 45s SWR refresh interval for portal                          | Balances real-time feel with API efficiency                         | ✓ Good  |
| Notification routing via project_assignments                 | Leverages Phase 12 foundation, routes to assigned employees         | ✓ Good  |
| Activity log with is_client_visible flag                     | Enables unified ERP/portal timeline with selective visibility       | ✓ Good  |
| Default all notification types enabled                       | Ensures users don't miss critical notifications                     | ✓ Good  |
| Silent failure pattern for email notifications               | Delivery failures don't block user actions                          | ✓ Good  |
| Hybrid server-client pattern for portal pages                | Auth on server, SWR on client for real-time sync                    | ✓ Good  |
| Portal settings in project.metadata JSONB                    | Flexible schema, no new table needed                                | ✓ Good  |
| Secure token with crypto.randomUUID()                        | Built-in Node.js, cryptographically secure                          | ✓ Good  |
| Idempotent invitation creation                               | Returns existing if already sent, prevents duplicates               | ✓ Good  |
| Admin client for profile creation during signup              | New users have no RLS permissions, must use service role            | ✓ Good  |
| window.location.href for post-signup redirect                | Hard navigation ensures session cookies transfer                    | ✓ Good  |
| Role-based routing reads from database (not JWT)             | Real-time role enforcement, no stale claims                         | ✓ Good  |
| canAccessProject from lib/portal-utils for auth gates        | Single source of truth, avoids duplicate auth logic                 | ✓ Good  |
| Token-based invitation lookups vs UUID PKs                   | Prevents enumeration attacks with opaque tokens                     | ✓ Good  |
| removeConsole.exclude preserves error/warn in production     | Maintains observability while reducing log noise                    | ✓ Good  |
| Health endpoint returns 503 for degraded states              | Enables reliable monitoring and alerting                            | ✓ Good  |
| Best-effort orphan rollback pattern                          | Cleanup failures logged but don't mask original errors              | ✓ Good  |

---

_Last updated: 2026-03-10 after v1.5.1 milestone completion_
