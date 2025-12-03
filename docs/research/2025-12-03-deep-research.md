# Deep Research Analysis: Qualia Platform

**Date:** December 3, 2025
**Analyzed by:** 6 Parallel Opus 4.5 Research Agents
**Stack:** Next.js 15+ | React 19 | Supabase | Tailwind CSS | Vercel AI SDK

---

## Executive Summary

The Qualia platform is a well-architected multi-tenant project management application with solid foundations. However, the deep analysis by 6 specialized agents uncovered **1 critical security vulnerability**, **8 high-priority improvements**, and numerous optimization opportunities.

### Overall Scores by Category

| Category               | Score  | Status                                |
| ---------------------- | ------ | ------------------------------------- |
| Frontend Architecture  | 6.3/10 | Good foundation, underutilized RSC    |
| Backend Architecture   | 7/10   | Solid patterns, missing rate limiting |
| Database & RLS         | 6/10   | Good schema, RLS gaps identified      |
| Security & DevOps      | 5/10   | **Critical: No active middleware**    |
| Performance            | 6/10   | Good basics, data waterfalls          |
| Code Quality & Testing | 7.5/10 | Strong types, low test coverage       |

---

## Critical Issues (Blockers)

### CRITICAL-1: Route Protection Not Active

**Location:** Root directory (missing `middleware.ts`)

The codebase has route protection logic in `proxy.ts` but Next.js requires a file named `middleware.ts` with an export named `middleware`. **All routes are currently accessible without authentication.**

**Impact:** Any unauthenticated user can access `/projects`, `/issues`, `/clients`, etc. by navigating directly.

**Fix:** Create `middleware.ts` at project root:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && !request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
```

---

## High Priority Improvements

### HIGH-1: Add Rate Limiting to AI Chat Endpoint

**Location:** `app/api/chat/route.ts`
**Risk:** Cost abuse, DoS attacks

```typescript
// Install: npm install @upstash/ratelimit @upstash/redis
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});

// Add at start of POST handler:
const { success } = await ratelimit.limit(user.id);
if (!success) {
  return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
}
```

### HIGH-2: Add Security Headers

**Location:** `next.config.ts` (currently empty)

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};
```

### HIGH-3: Fix Workspace RLS Policies

**Issue:** `workspaces` and `workspace_members` tables have unknown RLS status - no migration files define their policies.

**Fix:** Create migration to add explicit RLS:

```sql
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspaces" ON workspaces
FOR SELECT TO authenticated
USING (
  is_admin() OR
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspaces.id AND wm.profile_id = auth.uid())
);
```

### HIGH-4: Add Missing Database Indexes

**Impact:** Slow RLS policy evaluation on every query

```sql
-- Critical for RLS helper functions
CREATE INDEX idx_team_members_team_profile ON team_members(team_id, profile_id);
CREATE INDEX idx_workspace_members_workspace_profile ON workspace_members(workspace_id, profile_id);
CREATE INDEX idx_issue_assignees_issue_profile ON issue_assignees(issue_id, profile_id);

-- Common query patterns
CREATE INDEX idx_issues_workspace_status ON issues(workspace_id, status);
CREATE INDEX idx_projects_workspace_group ON projects(workspace_id, project_group);
```

### HIGH-5: Convert Detail Pages to Server Components

**Location:** `app/issues/[id]/client.tsx`, `app/projects/[id]/client.tsx`
**Issue:** Client-side data fetching loses RSC benefits, causes waterfalls

**Current Pattern:**

```typescript
useEffect(() => {
  const [issueData, teamsData] = await Promise.all([getIssueById(id), getTeams()]);
}, [id]);
```

**Recommended Pattern:**

```typescript
// app/issues/[id]/page.tsx (Server Component)
async function IssueLoader({ id }: { id: string }) {
  await connection();
  const [issue, teams] = await Promise.all([getIssueById(id), getTeams()]);
  return <IssueDetailView issue={issue} teams={teams} />;
}

export default function IssuePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<IssueDetailSkeleton />}>
      <IssueLoader id={params.id} />
    </Suspense>
  );
}
```

### HIGH-6: Add Client-Side Data Caching

**Issue:** Every navigation re-fetches data, no deduplication

**Solution:** Add SWR or TanStack Query:

```typescript
// hooks/use-issue.ts
import useSWR from 'swr';

export function useIssue(id: string) {
  return useSWR(id ? ['issue', id] : null, () => getIssueById(id), {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });
}
```

### HIGH-7: Add Pagination to List Queries

**Location:** `app/actions.ts` - `getClients`, `getTeams`, etc.
**Issue:** Fetches all records, no limits

```typescript
// Add to all list queries
.range(offset, offset + limit - 1)
```

### HIGH-8: Verify Delete Action Authorization

**Location:** `app/actions.ts:855-895`
**Issue:** `deleteIssue`, `deleteProject` check auth but not workspace membership

```typescript
// Add workspace verification before delete
const { data: issue } = await supabase
  .from('issues')
  .select('workspace_id, creator_id')
  .eq('id', id)
  .single();

if (!issue || !is_workspace_member(issue.workspace_id)) {
  return { success: false, error: 'Permission denied' };
}
```

---

## Medium Priority Enhancements

### Performance Optimizations

| Issue                         | Location                 | Solution                                |
| ----------------------------- | ------------------------ | --------------------------------------- |
| N+1 queries in getProjectById | actions.ts:657-714       | Combine into single query with subquery |
| No React.memo usage           | All list item components | Add memoization to prevent re-renders   |
| 64 client components          | Various                  | Convert data-only components to RSC     |
| Empty next.config.ts          | Root                     | Add bundle optimization, image config   |
| get_project_stats N+1         | DB function              | Rewrite with CTE for bulk progress calc |

### Code Quality Improvements

| Issue                         | Location       | Solution                                     |
| ----------------------------- | -------------- | -------------------------------------------- |
| Large actions.ts (2162 lines) | app/actions.ts | Split by domain (issues, projects, etc.)     |
| Low test coverage (~2 files)  | **tests**/     | Add tests for server actions, key components |
| Duplicate formatTimeAgo       | Multiple files | Use existing `formatRelativeTime` from utils |
| Console-only error logging    | Multiple       | Add Sentry or structured logging             |
| Missing JSDoc comments        | Components     | Document exported functions                  |

### Database Improvements

| Issue                      | Location                           | Solution                            |
| -------------------------- | ---------------------------------- | ----------------------------------- |
| Cross-tenant risk in RLS   | Team-based policies                | Add workspace check to all policies |
| Activities INSERT spoofing | activities table                   | Restrict actor_id to auth.uid()     |
| Missing FK indexes         | client_contacts, client_activities | Add indexes on foreign keys         |
| No vector index            | documents.embedding                | Add IVFFlat index for RAG           |

---

## Implementation Roadmap

### Week 1: Critical Security Fixes

- [ ] Create `middleware.ts` for route protection
- [ ] Add security headers to `next.config.ts`
- [ ] Add rate limiting to `/api/chat`
- [ ] Audit and fix workspace RLS policies

### Week 2: Database Optimization

- [ ] Add missing junction table indexes
- [ ] Add workspace verification to delete actions
- [ ] Fix cross-tenant RLS policies
- [ ] Add pagination to list queries

### Week 3: Performance

- [ ] Convert detail pages to RSC pattern
- [ ] Add client-side caching (SWR)
- [ ] Optimize bundle with `modularizeImports`
- [ ] Refactor N+1 queries

### Week 4: Code Quality

- [ ] Split `actions.ts` by domain
- [ ] Expand test coverage to 50%+
- [ ] Add error monitoring (Sentry)
- [ ] Remove duplicate utilities

---

## Quick Wins (Can Do Today)

1. **Create middleware.ts** - Copy from proxy.ts, rename function
2. **Add security headers** - Copy config to next.config.ts
3. **Add database indexes** - Single migration file
4. **Remove duplicate utilities** - Use existing `formatRelativeTime`

---

## Resources & References

### Next.js 15

- [App Router Docs](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

### Supabase

- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Performance Tips](https://supabase.com/docs/guides/database/postgres/indexes)

### Security

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)

### Testing

- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest with Next.js](https://nextjs.org/docs/app/building-your-application/testing/jest)

---

## Next Steps

Choose your path:

1. **Create Implementation Plan** - Detailed step-by-step for all fixes
2. **Deep Dive Specific Area** - Focus on security, performance, or database
3. **Start Fixing Critical Issues** - Begin with middleware.ts immediately
4. **Compare to Specific Standard** - OWASP, WCAG, etc.

---

_Report generated by Deep Research analysis using 6 parallel Opus 4.5 agents_
