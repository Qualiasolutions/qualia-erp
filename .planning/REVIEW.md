# Production Audit — 2026-04-11

Full audit across Employee, Client, and Admin roles. Covers security, permissions, UI/UX, silent errors, design, responsiveness.

## Fixed in This Pass (e34fa22)

| # | Finding | Fix | Severity |
|---|---------|-----|----------|
| 1 | View-as cookie httpOnly:false + 24h duration | Now httpOnly:true + 1h, server action for state | CRITICAL |
| 2 | AdminProvider read cookie client-side (XSS surface) | Resolves via getViewAsState() server action | CRITICAL |
| 3 | Employee sidebar missing Inbox/Schedule/Team | Added role-based nav items | CRITICAL |
| 4 | Middleware allows managers to /admin | Restricted to admin only | HIGH |
| 5 | Billing page accessible by employees via URL | Added server-side role redirect | HIGH |
| 6 | Sidebar Billing/Requests used hardcoded filters | Role-based visibility system | HIGH |
| 7 | Client projects page: no empty state | Added empty state with helpful message | HIGH |
| 8 | Client projects error state: no page header | Added consistent page header to error view | MEDIUM |
| 9 | Messages page: unhandled profile fetch error | Added error logging | MEDIUM |
| 10 | Invitation tokens never expire | 7-day expiration check | MEDIUM |
| 11 | getProjectStats: Promise.all blanks dashboard | Individual query catch wrappers | MEDIUM |
| 12 | Portal project list: no focus rings | Added focus-visible rings | MEDIUM |
| 13 | NavLink: no focus rings | Added focus-visible rings | MEDIUM |
| 14 | Project list touch targets < 44px | min-h-[44px] + min touch target | MEDIUM |
| 15 | Clock-in modal: breaks on mobile | Responsive width calc | LOW |

---

## Remaining: CRITICAL (4)

### C1. `canAccessProject()` blocks employees from `/portal/[id]` routes
- **Where**: `lib/portal-utils.ts:60-86`, `app/portal/[id]/page.tsx:23`
- **What**: Only checks `admin` role and `client_projects` table. Employees silently redirected.
- **Fix**: Add employee check via `project_assignments`.

### C2. Same block affects `/portal/[id]/features`, `/portal/[id]/files`, `/portal/[id]/updates`
- **Where**: Sub-routes of `/portal/[id]`
- **Fix**: Fixing C1 resolves all three.

### C3. Missing authorization in `getProjectActivityFeed`
- **Where**: `app/actions/activity-feed.ts:24-84`
- **What**: Any authenticated user can read any project's activity.
- **Fix**: Add `canAccessProject()` check.

### C4. Missing authorization in `getProjectTasks`
- **Where**: `app/actions/inbox.ts:584-634`
- **What**: Same as C3 for tasks.
- **Fix**: Add project access authorization check.

---

## Remaining: HIGH (9)

| # | Finding | Where |
|---|---------|-------|
| H1 | Employee mapped to 'client' role in project detail | `app/portal/[id]/page.tsx:35` |
| H2 | Files page returns empty for employees | `app/portal/files/page.tsx:51-79` |
| H4 | Requests page broken for employees | `app/portal/requests/page.tsx:23-24` |
| H6 | "Back to Projects" link drops workspace context | `app/portal/[id]/portal-project-content.tsx:73` |
| H7 | Dashboard links don't carry workspace params | `components/portal/portal-dashboard-v2.tsx:43-56` |
| H8 | Files/Billing/Messages/Settings don't handle view-as | Multiple pages |
| H9 | Invoice table overflows at sm breakpoint | `components/portal/portal-invoice-list.tsx:73` |
| H12 | Employees see ALL message channels | `app/actions/portal-messages.ts:87-102` |
| H13 | `getEmployeeAssignments` lacks authorization | `app/actions/project-assignments.ts:457-506` |

---

## Remaining: MEDIUM (10)

| # | Finding | Where |
|---|---------|-------|
| M3 | Admin stats grid 2-col at 320px too tight | `admin-dashboard-content.tsx:85` |
| M4 | Client stats row overflow | `portal-stats-row.tsx:69` |
| M5 | Project name overflow in header | `portal-project-content.tsx:80` |
| M6 | Title pushes status pill off-screen | `portal-page-header.tsx:54` |
| M7 | Sort/toggle buttons too small for touch | `portal-request-list.tsx:191` |
| M8 | Message thread back button 32px | `message-thread.tsx:69-74` |
| M10 | Internal badge dark mode styling | `phase-comment-thread.tsx:191-195` |
| M11 | Missing `loading.tsx` for messages | `app/portal/messages/` |
| H10 | Tab touch targets too small (32-36px) | `portal-tabs.tsx:29-37` |
| H11 | Comment delete button 24px | `phase-comment-thread.tsx:209-229` |

---

## Remaining: LOW (10)

| # | Finding | Where |
|---|---------|-------|
| L1 | Employee quick actions link outside portal | `employee-dashboard-content.tsx:38-49` |
| L2 | Employee project links inconsistent | `employee-dashboard-content.tsx:179` |
| L3 | Client-side date hydration mismatch risk | Multiple dashboard files |
| L5 | Missing error boundaries on portal sub-routes | `app/portal/*/` |
| L6 | Missing `loading.tsx` for files page | `app/portal/files/` |
| L7 | Portal error boundary exposes raw error | `app/portal/error.tsx:26` |
| L9 | Workspace grid needs intermediate breakpoint | `portal-workspace-grid.tsx:242` |
| L10 | Section spacing inconsistency | Multiple |
| L11 | ViewAsBanner z-index semantic mismatch | `view-as-banner.tsx:31` |
| L12 | `listUsers` capped at 1000 users | `portal-workspaces.ts:119` |

---

## Summary

| Severity | Fixed | Remaining |
|----------|-------|-----------|
| CRITICAL | 3 | 4 |
| HIGH | 4 | 9 |
| MEDIUM | 6 | 10 |
| LOW | 2 | 10 |
| **Total** | **15** | **33** |

**Deploy blockers**: C1-C4 remain (employee portal access + authorization gaps). These need a follow-up pass.
