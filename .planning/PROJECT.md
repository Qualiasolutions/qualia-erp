# Qualia Internal Suite

## What This Is

Internal operations platform for Qualia Solutions: project management, CRM, team attendance, AI assistant, and a **Client Portal** where clients track project progress, upload files, and interact with Qualia. Includes a **Financial Dashboard** powered by Zoho Invoice for revenue tracking, invoicing, and expense management. Built with Next.js 16, Supabase, premium design (Impeccable v4.0).

## Core Value

One platform for all Qualia operations — internal team management and client-facing project delivery, with real financial visibility.

## Requirements

### Validated

- ✓ Trainee execution system with GSD-guided task checklists — v1.0
- ✓ Client portal with auth, project views, files, comments, activity — v1.0
- ✓ Premium animations (stagger, spring, gesture drawers) — v1.2
- ✓ Full ERP-portal sync with employee assignments and notifications — v1.3
- ✓ Admin portal onboarding (import, invite, auto-signup) — v1.4
- ✓ Security hardening (IDOR fixes, token auth, input validation) — v1.5.1
- ✓ Team attendance (session-based clock-in/out, live dashboard) — v2.0/v2.1
- ✓ Production hardening (Sentry, analytics, test coverage, design polish) — v3.0
- ✓ Zoho-powered financial dashboard with KPIs, revenue chart, hide/delete — v4.0 (pre-work)

### Active

- [ ] Financial dashboard: expense tracking, retainers/recurring view
- [ ] Client portal: file uploads per project (client → Qualia)
- [ ] Client portal: modern design refresh (premium UX overhaul)
- [ ] Client portal: better onboarding flow for new clients
- [ ] Admin portal: quick actions panel (post update, share file, send invoice)
- [ ] Admin portal: client health overview (last login, overdue invoices, stale projects)
- [ ] Admin portal: full "view as client" mode (exact client perspective, no admin UI)
- [ ] Admin portal: hide/archive inactive clients from hub
- [ ] Remove Messages page (irrelevant, one-way feed not useful)
- [ ] Portal navigation cleanup

### Out of Scope

- GitHub/Vercel API integration — URL links sufficient
- Real-time collaboration — not needed for small team
- Client editing or task visibility — read-only + comments by design
- 3D effects or parallax — anti-feature, hurts focus
- Offline mode — web-first approach
- Learning/mentorship/XP system — deleted in v2.0
- Supabase Realtime subscriptions — SWR polling sufficient
- AI weekly recap — nice-to-have, not this milestone
- Push notifications — not needed yet
- Two-way chat/messaging — removed, clients communicate via comments and email
- Invoice payment collection — clients pay via bank/cash, not online checkout

## Context

9 milestones shipped (v1.0–v3.0). 38 phases completed, 60+ plans executed.
Tech stack: Next.js 16, Supabase, Tailwind/shadcn, SWR, Framer Motion, Vaul, Resend.
Team: Fawzi (admin/owner), Moayad (employee), Hasan (employee).
External: Zoho Invoice MCP connected for financial data sync.
Financial dashboard v1 already shipped (Zoho sync, KPIs, hide/delete, upcoming).
Client portal has 10 routes, 25 components — functional but needs UX refresh.

## Current Milestone: v4.0 Portal & Financials

**Goal:** Overhaul the client portal experience (design, file uploads, onboarding), give admins powerful management tools (health dashboard, impersonation, quick actions), and complete the financial dashboard with expenses and retainers.

**Target features:**

- Financial: Expense tracking, retainers/recurring revenue view
- Client portal: File uploads, modern design refresh, better onboarding
- Admin portal: Quick actions, client health overview, full view-as-client, hide/archive clients
- Cleanup: Remove Messages page, streamline navigation

## Constraints

- **Stack**: Next.js 16 App Router, Supabase, Tailwind/shadcn — existing patterns
- **Auth**: Same Supabase auth for all roles — middleware handles routing
- **Design**: Impeccable v4.0 — tinted neutrals, fluid type, layered surfaces
- **Security**: RLS on every table, auth.uid() derivation, no service_role client-side
- **Financial data**: Zoho Invoice is source of truth, synced to Supabase cache tables

## Key Decisions

| Decision                                             | Rationale                                                             | Outcome   |
| ---------------------------------------------------- | --------------------------------------------------------------------- | --------- |
| Single login page for all roles                      | Simpler auth flow, role detected from profile.role                    | ✓ Good    |
| Client portal is read-only + comments + file uploads | Clients see progress, upload assets, but don't edit project internals | ✓ Good    |
| Activity log with is_client_visible flag             | Unified ERP/portal timeline with selective visibility                 | ✓ Good    |
| Zoho Invoice as financial source of truth            | Real invoicing software, MCP-synced to Supabase cache                 | ✓ Good    |
| Remove Messages page                                 | One-way feed adds no value, clients use comments on phases            | ✓ Good    |
| Financial tracking starts from 2026-01-15            | Clean start date for Zoho data                                        | ✓ Good    |
| Session-based attendance replaces check-ins          | Multi-session is more accurate                                        | ✓ Good    |
| Hybrid server-client pattern for portal              | Auth on server, SWR on client for real-time sync                      | ✓ Good    |
| Full client impersonation for admins                 | Complete preview of client experience, not partial admin view         | — Pending |
| Expense tracking in ERP (not Zoho)                   | Manual entry for now, Zoho expenses not being used                    | — Pending |

---

_Last updated: 2026-03-28 after v4.0 milestone start_
