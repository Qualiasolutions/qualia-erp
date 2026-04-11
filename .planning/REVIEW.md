# Production Audit — 2026-04-11

Full audit across Employee, Client, and Admin roles. Covers security, permissions, UI/UX, silent errors, design, responsiveness.

## Fixed — Pass 1 (e34fa22)

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

## Fixed — Pass 2 (089687d)

| # | Finding | Fix | Severity |
|---|---------|-----|----------|
| 16 | Requests page broken for employees | Redirect employees, fix admin project dropdown | HIGH |
| 17 | Files page doesn't handle view-as | Added resolveEffectiveUser() for correct scoping | HIGH |
| 18 | Invoice table overflows at sm breakpoint | Bumped grid breakpoint sm→md | HIGH |
| 19 | Comment delete button 24px touch target | min-h-[44px] min-w-[44px] | MEDIUM |
| 20 | Message thread back button 32px | min-h-[44px] min-w-[44px] | MEDIUM |
| 21 | Page header back button 32px | min-h-[44px] min-w-[44px] | MEDIUM |
| 22 | Project name overflow in headers | Added truncate + min-w-0 | MEDIUM |
| 23 | Title pushes status pill off-screen | Added truncate to h1 | MEDIUM |
| 24 | Sort buttons too small for touch | Increased padding | MEDIUM |
| 25 | Internal badge dark mode styling | Added dark: variants | MEDIUM |
| 26 | Missing loading.tsx for messages | Created skeleton loader | LOW |
| 27 | Missing loading.tsx for files | Created skeleton loader | LOW |
| 28 | Portal error boundary exposes raw error | Show generic message + digest ID only | LOW |
| 29 | ViewAsBanner z-index z-toast→z-sticky | Correct semantic layer | LOW |
| 30 | Employee project links go to /projects/ | Changed to /portal/ for consistency | LOW |

## Previously Fixed (confirmed in this audit)

- C1/C2: `canAccessProject()` — already handles employees via `project_assignments`
- C3/C4: `getProjectActivityFeed` + `getProjectTasks` — already have `canAccessProject()` checks
- H1: Employee role mapping — already maps to 'admin' (internal view)
- H2: Files page employee support — already has employee branch via `project_assignments`
- H6: "Back to Projects" workspace link — already reads from `useSearchParams()`
- H10: Tab touch targets — already has `min-h-[44px]`
- H12: Employee message access — already scoped via `project_assignments`
- H13: `getEmployeeAssignments` auth — already checks self/admin

---

## Remaining: LOW (5)

| # | Finding | Where |
|---|---------|-------|
| L3 | Client-side date hydration mismatch risk | Multiple dashboard files |
| L5 | Missing error boundaries on portal sub-routes | `app/portal/*/` |
| L9 | Workspace grid needs intermediate breakpoint | `portal-workspace-grid.tsx:242` |
| L10 | Section spacing inconsistency (space-y-6 vs space-y-8) | Multiple |
| L12 | `listUsers` capped at 1000 users | `portal-workspaces.ts:119` |

---

## Summary

| Severity | Fixed | Remaining |
|----------|-------|-----------|
| CRITICAL | 3 | 0 |
| HIGH | 7 | 0 |
| MEDIUM | 14 | 0 |
| LOW | 6 | 5 |
| **Total** | **30** | **5** |

**No deploy blockers remain.** All CRITICAL and HIGH findings resolved. Remaining 5 LOWs are cosmetic/edge-case.
