# Production Audit — Qualia Suite

## Latest: Full Codebase Audit (2026-04-11)

Deep review across Security, Performance, Architecture, Code Quality, and Test Coverage.

---

### CRITICAL (2)

| # | Category | Finding | Where | Fix |
|---|----------|---------|-------|-----|
| C1 | Performance | N+1 query — `completePhase()` fetches same phase row twice | `app/actions/phases.ts:112-128` | Merge both queries into one `.select('id, project_id, sort_order, name')` |
| C2 | Code Quality | SWR `onErrorRetry` uses non-null assertion on possibly-undefined `.status` | `lib/swr.ts:104-107` | Add type guard: `isErrorWithStatus(error)` before comparison |

### HIGH (8)

| # | Category | Finding | Where | Fix |
|---|----------|---------|-------|-----|
| H1 | Performance | Loop N+1 — `updateIssue()` sends sequential notifications per assignee | `app/actions/issues.ts:229-247` | Use `Promise.all()` for parallel notification |
| H2 | Performance | Loop N+1 — `createComment()` sequential notification loop | `app/actions/issues.ts:407-440` | Combine into single `Promise.all()` |
| H3 | Performance | Aggressive SWR polling — 20+ hooks × 30-45s = 25+ API calls/min | `lib/swr.ts:123,1473,1622` | Increase to 60s default; consider WebSocket for team status |
| H4 | Performance | Barrel file `actions/index.ts` (247 lines) forces full module load | `app/actions/index.ts` | Import directly from domain files, not barrel |
| H5 | Architecture | SWR cache not invalidated after notification/activity actions | `app/actions/notifications.ts`, `activity-feed.ts` | Add `mutate(cacheKeys.notifications)` after mutations |
| H6 | Architecture | 5 components exceed 600 lines (project-workflow: 1314, day-view: 922) | `components/project-workflow.tsx`, `components/day-view.tsx` | Extract sub-components (RoadmapView, BoardView, etc.) |
| H7 | Code Quality | Fire-and-forget `.catch(() => {})` swallows errors silently (6+ instances) | `app/actions/checkins.ts:113`, `clients.ts:89`, `issues.ts:144` | Create `fireAndForget()` helper with console.error + Sentry |
| H8 | Testing | Auth actions (login, signup, admin check) have 0% test coverage | `app/actions/auth.ts` | Create `__tests__/actions/auth.test.ts` (~80 tests) |

### MEDIUM (13)

| # | Category | Finding | Where |
|---|----------|---------|-------|
| M1 | Security | Integration tokens stored in plaintext despite `encrypted_token` column name | `app/actions/integrations.ts:135` |
| M2 | Security | Vercel webhook uses ILIKE fuzzy match for project lookup (could match wrong project) | `app/api/webhooks/vercel/route.ts:97-101` |
| M3 | Security | View-as impersonation has no audit trail logging | `app/actions/view-as.ts:103-150` |
| M4 | Performance | `getClientById()` fetches all activities without pagination | `app/actions/clients.ts:161-181` |
| M5 | Performance | 44 `'use client'` components — many don't need interactivity | `components/` |
| M6 | Performance | `revalidatePath('/portal')` too broad — purges entire portal cache | `app/actions/phases.ts:176` (30+ places) |
| M7 | Architecture | Portal ↔ internal code duplication (ViewAsBanner, project views) | `components/view-as-banner.tsx` vs `components/portal/view-as-banner.tsx` |
| M8 | Architecture | WorkspaceProvider re-fetches data already available from server layout | `components/workspace-provider.tsx:35-99` |
| M9 | Architecture | Inconsistent parameter validation — mix of Zod, inline checks, none | `app/actions/notifications.ts`, `clients.ts` |
| M10 | Architecture | Ambiguous route coverage — some routes accessible from both portal and internal | `middleware.ts:78-94` |
| M11 | Code Quality | `client-portal.ts` is 2604 lines — god file with mixed concerns | `app/actions/client-portal.ts` |
| M12 | Code Quality | Missing return types on 37 SWR hooks | `lib/swr.ts` |
| M13 | Testing | Financials, file uploads, client invitations have 0% coverage | `app/actions/financials.ts`, `project-files.ts`, `client-invitations.ts` |

### LOW (8)

| # | Category | Finding | Where |
|---|----------|---------|-------|
| L1 | Security | In-memory rate limiter doesn't persist across serverless instances | `lib/rate-limit.ts` |
| L2 | Performance | `getIssueAssignees()` over-fetches assigned_by profile columns | `app/actions/issues.ts:567-573` |
| L3 | Performance | No lazy-loading for AI assistant widget (12KB+) | `app/layout.tsx` |
| L4 | Code Quality | Magic numbers in SWR polling intervals (45000, 30000, 90000) | `lib/swr.ts:34,121,131` |
| L5 | Code Quality | `console.log` used for debugging (20 instances) | Various |
| L6 | Testing | Coverage at 31.6% statements, below 50% target | Global |
| L7 | Testing | No E2E tests configured (Playwright installed but unused) | No `playwright.config.ts` |
| L8 | Testing | Pre-commit hooks run lint/tsc only, not tests | `.husky/pre-commit` |

---

### Positive Findings (no action needed)

- **Auth**: Middleware properly validates sessions; API routes check auth independently
- **Webhooks**: GitHub/Vercel use HMAC-SHA256/SHA1 with timing-safe comparison
- **Authorization**: Server actions verify permissions (canAccessProject, canModifyTask, etc.)
- **Input validation**: Zod schemas in `lib/validation.ts` cover all core entities
- **No XSS vectors**: No `dangerouslySetInnerHTML`, `eval()`, or reflected input
- **File uploads**: MIME whitelist, 50MB limit, filename sanitization
- **Cron auth**: Bearer token validation on all cron endpoints
- **Service role isolation**: `SUPABASE_SERVICE_ROLE_KEY` never in client bundles
- **Security headers**: CSP, HSTS, X-Frame-Options properly configured
- **Error handling**: All 49 action modules return `ActionResult` consistently
- **Provider hierarchy**: Correct SSR-safe ordering in root layout
- **No circular dependencies**: Action modules form proper DAG
- **React patterns**: Proper keys, memoization on list items, Suspense boundaries
- **Accessibility**: Labels on forms, aria-hidden on decorative elements, skip link present
- **Font optimization**: Geist fonts via `next/font` (self-hosted, no layout shift)

---

### Quick Wins (do first)

1. **Fix completePhase() N+1** — 5 min, eliminates 1 DB round-trip per action
2. **Parallelize notification loops** — 10 min each, scales with team size
3. **Increase SWR polling to 60s** — 5 min, 30% fewer API calls
4. **Add type guard for SWR onErrorRetry** — 5 min, prevents runtime error
5. **Replace `.catch(() => {})` with logged helper** — 15 min, fixes silent failures

---

## Previous Audit (2026-04-11 — UI/UX/Security)

### Fixed — Pass 1 (e34fa22)

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

### Fixed — Pass 2 (089687d)

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

### Fixed — Pass 3 (2da290b)

| # | Finding | Fix | Severity |
|---|---------|-----|----------|
| 31 | Sidebar switching when clicking nav items | Portal sidebar links now stay within /portal/* layout | HIGH |
| 32 | Clock-in/out hidden for admin role | Restored for admin, added to portal sidebar | HIGH |
| 33 | /team link circular redirect | Removed from portal sidebar | LOW |

---

## Summary

| Severity | Fixed (prev) | New Findings | Deploy Blocker? |
|----------|-------------|--------------|-----------------|
| CRITICAL | 3 | 2 | Yes — fix before next deploy |
| HIGH | 10 | 8 | Yes — fix within 1 week |
| MEDIUM | 14 | 13 | No |
| LOW | 6 | 8 | No |
| **Total** | **33** | **31** | |

**Deploy status**: 2 CRITICAL findings (N+1 query, SWR type guard) should be fixed before next major deploy. Both are 5-minute fixes.
