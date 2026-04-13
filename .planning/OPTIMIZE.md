---
date: 2026-04-13 21:20
mode: full
critical: 5
high: 15
medium: 22
low: 18
status: critical_issues
---

# Optimization Report

**Project:** qualia-erp | **Mode:** full | **Date:** 2026-04-13

## Summary

60 findings across 3 specialist agents (frontend, backend/security, performance). 5 critical security issues need immediate attention — missing auth checks on mutation endpoints and a stored XSS vector. 15 high-priority issues include broken authorization, SSRF risk, overly permissive RLS policies, N+1 query loops, and unbounded queries. The revalidatePath removal (269 calls) was already completed this session.

## Critical Issues

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| C1 | Security | Missing auth in `upsertIntegration` + `deleteIntegration` — any authenticated user can modify GitHub/Vercel integrations for any project | `app/actions/project-integrations.ts:145-239` | Add `supabase.auth.getUser()` + admin check |
| C2 | Security | Missing auth in `removeProjectLink` — any authenticated user can delete integration links by ID | `app/actions/project-links.ts:75-90` | Add auth check + project access verification |
| C3 | Security | Stored XSS via `dangerouslySetInnerHTML` in owner updates — regex transforms re-introduce raw HTML from user content | `components/today-dashboard/owner-updates-banner.tsx:73-91` | Replace with React elements instead of HTML string |
| C4 | Performance | N+1 query loop in `linkTasksToPhases` — individual UPDATE per task (200 tasks = 200 round-trips) | `app/actions/pipeline.ts:816-828` | Batch UPDATE by phaseId using `.in('id', batchIds)` |
| C5 | Performance | N+1 query loop in `migrateAllProjectsToGSD` — 5-8 sequential DB ops per project | `app/actions/pipeline.ts:1213-1330` | Restructure as batch operation |

## High Priority

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| H1 | Security | Broken authz in logos.ts — uses `user_id` instead of `profile_id` for workspace_members check | `app/actions/logos.ts:63-67,213-217` | Change `.eq('user_id',...)` to `.eq('profile_id',...)` |
| H2 | Security | Actor ID spoofing in `createActivityLogEntry` — caller can impersonate any user | `app/actions/activity-feed.ts:114-149` | Always use `user.id`, remove `actorId` parameter |
| H3 | Security | SSRF in `checkEnvironmentHealth` — fetches arbitrary URL from `project_environments.url` | `app/actions/deployments.ts:133-185` | Validate URL against whitelist, reject private IPs |
| H4 | Security | Notification targeting — any user can send notifications to any other user | `app/actions/notifications.ts:22-55` | Restrict to admin/manager or internal-only |
| H5 | Security | Overly permissive RLS — core tables use `USING (true)` allowing any authenticated user to read/delete everything | `supabase/migrations/20240101000000_initial_schema.sql` | Scope to workspace membership |
| H6 | Security | Meetings table RLS is `USING (true)` — clients can access all internal meetings | `supabase/migrations/20251130000000_add_meetings.sql` | Scope to workspace members |
| H7 | Frontend | Missing `error.tsx` on 11+ portal routes — errors wipe entire UI | `app/(portal)/billing/`, `schedule/`, `inbox/`, etc. | Add route-level error boundaries |
| H8 | Frontend | Hydration mismatch — `new Date().getHours()` in 3 client components differs server vs client | `admin-dashboard-content.tsx:15`, `employee-dashboard-content.tsx:294`, `portal-dashboard-v2.tsx:77` | Move to useEffect + useState |
| H9 | Frontend | Form labels not linked to inputs in project settings dialog (6 labels, 0 htmlFor) | `projects/[id]/project-detail-view.tsx:463-548` | Add `id` + `htmlFor` to all form controls |
| H10 | Performance | N+1 stale session loop in `clockIn` — individual UPDATE per stale session | `app/actions/work-sessions.ts:76-87` | Bulk update with `.in('id', staleIds)` |
| H11 | Performance | `getProjectById` uses `select('*')` + fetches ALL issues unbounded | `app/actions/projects.ts:357-404` | Explicit columns + `.limit(50)` on issues |
| H12 | Performance | Sequential role+assignment queries on every poll for non-admin users | `app/actions/projects.ts:162-176,283-297` | Use cached role lookup from `shared.ts` |
| H13 | Performance | `getScheduledTasks` no pagination, no date filter, includes completed | `app/actions/inbox.ts:938-1014` | Add date range + exclude Done + limit 100 |
| H14 | Performance | `useTodaysTasks` fetches 200 tasks then filters client-side | `lib/swr.ts:637-638` | Create dedicated `getTodaysTasks()` with DB filter |
| H15 | Performance | N+1 prerequisite UPDATE per phase in `initializeProjectPipeline` | `app/actions/pipeline.ts:404-411` | Batch update or RPC |

## Medium Priority

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| M1 | Security | Missing Zod validation in 37+ mutation functions (raw string params) | `phases.ts`, `dashboard-notes.ts`, `owner-updates.ts`, etc. | Add Zod schemas for all mutation inputs |
| M2 | Security | Missing auth in `startProvisioning` — triggers GitHub/Vercel resource creation | `app/actions/integrations.ts:385-443` | Add auth + admin check |
| M3 | Security | Missing auth in `getProjectPhases` and `getProjectIntegrations` | `phases.ts:10-23`, `project-integrations.ts:125-140` | Add `supabase.auth.getUser()` |
| M4 | Security | Cron route auth uses plain string comparison (not timing-safe) | All `app/api/cron/*/route.ts` | Use `crypto.timingSafeEqual()` |
| M5 | Security | Sequential queries in `canModifyTask` — up to 4 round-trips per task mutation | `app/actions/shared.ts:168-209` | Combine into single RPC or Promise.all |
| M6 | Frontend | No `React.memo` on any portal list item components | `portal-dashboard-v2.tsx`, `portal-roadmap.tsx`, `portal-request-list.tsx` | Wrap list items in React.memo |
| M7 | Frontend | Billing page lacks Suspense boundary for progressive streaming | `app/(portal)/billing/page.tsx:28-29` | Extract async into `BillingLoader` + Suspense |
| M8 | Frontend | Requests page lacks Suspense (4 sequential DB queries block render) | `app/(portal)/requests/page.tsx:8-84` | Extract async + Suspense |
| M9 | Frontend | Messages page doesn't use portal-cache helpers (redundant auth query) | `app/(portal)/messages/page.tsx:12-26` | Use `getPortalAuthUser()` + `getPortalProfile()` |
| M10 | Frontend | `PortalStatsRow` hardcodes USD currency for Outstanding stat | `components/portal/portal-stats-row.tsx:39-47` | Derive currency from invoice data |
| M11 | Frontend | `framer-motion` full bundle imported for `useInView` only | `components/portal/portal-roadmap.tsx:7` | Import from `motion/react` or use Intersection Observer |
| M12 | Frontend | Inbox page fetches 200 tasks server-side, filters in JS | `app/(portal)/inbox/page.tsx:22-28` | Move filter to DB query + add Suspense |
| M13 | Frontend | Non-interactive action items look clickable (hover state but no handler) | `components/portal/portal-action-items.tsx:121-148` | Add Link/button or remove hover styling |
| M14 | Frontend | `ProjectDetailView` has 11 useState + useEffect on every keystroke | `projects/[id]/project-detail-view.tsx:152-184` | Use useRef for change detection, extract form |
| M15 | Performance | Financials `select('*')` on 3 tables simultaneously, no limit | `app/actions/financials.ts:112-115` | Explicit columns + date range filter |
| M16 | Performance | Barrel export re-exports cause bundle inflation for client components | `app/actions.ts` + 38 client component imports | Migrate to direct domain imports |
| M17 | Performance | No dynamic imports for heavy components (AI chat, health charts) | Only 1 `next/dynamic` usage in entire codebase | Wrap heavy components in `dynamic()` |
| M18 | Performance | Virtualization only in 2 of N list views | Only `inbox-view.tsx` uses `useVirtualizer` | Add to project tasks, notifications |
| M19 | Performance | Sequential project+issues queries in `getProjectById` | `app/actions/projects.ts:356-404` | Use `Promise.all()` |
| M20 | Performance | `getWorkspaceHealthDashboard` refreshes materialized view on every read | `app/actions/health.ts:81` | Remove refresh from read path |
| M21 | Performance | Client-side Supabase query in `usePortalProjectWithPhases` SWR hook | `lib/swr.ts:1277-1325` | Create server action, call from SWR |
| M22 | Security | N+1 in `syncGitHubWebhooks` — sequential GitHub API calls per repo | `app/actions/integrations.ts:562-598` | `Promise.allSettled()` with batching |

## Low Priority

| # | Dimension | Finding | Location | Fix |
|---|-----------|---------|----------|-----|
| L1-L18 | Mixed | 18 low-priority findings including missing React.memo, select('*') on polled endpoints, date formatting inconsistencies, touch target sizes, dead animation code, service enumeration endpoints | Various | See individual findings in agent reports |
