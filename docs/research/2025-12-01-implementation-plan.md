# Implementation Plan: Qualia Platform Improvements

**Created:** December 1, 2025
**Based on:** Deep Research Report 2025-12-01
**Estimated Duration:** 5 weeks

---

## Phase 1: Critical Security Fixes (Priority: BLOCKER)

### 1.1 Create Root Middleware
**File:** `/middleware.ts` (new)

**Problem:** Route protection functions exist in `lib/supabase/middleware.ts` and `lib/supabase/proxy.ts` but are never invoked. All routes are currently unprotected.

**Tasks:**
- [ ] Create `/middleware.ts` at project root
- [ ] Import and call `updateSession` from proxy
- [ ] Configure matcher to exclude static assets and auth routes
- [ ] Test protected routes redirect to login when unauthenticated
- [ ] Test authenticated users can access protected routes

**Acceptance Criteria:**
- Unauthenticated requests to `/projects`, `/issues`, `/teams`, `/clients`, `/schedule` redirect to `/auth/login`
- Authenticated requests pass through normally
- Static assets (`_next/static`, images) are not blocked
- Auth routes (`/auth/login`, `/auth/confirm`) are accessible without auth

**Code:**
```typescript
// middleware.ts
import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|auth).*)',
  ],
}
```

---

### 1.2 Fix Open Redirect Vulnerability
**File:** `/app/auth/confirm/route.ts`

**Problem:** The `next` parameter is used directly in `redirect()` without validation, allowing attackers to redirect users to malicious sites.

**Tasks:**
- [ ] Create allowlist of valid redirect paths
- [ ] Validate `next` parameter starts with `/` and doesn't start with `//`
- [ ] Default to `/` for invalid paths
- [ ] Add unit test for redirect validation

**Acceptance Criteria:**
- `?next=/projects` redirects to `/projects`
- `?next=https://evil.com` redirects to `/`
- `?next=//evil.com` redirects to `/`
- `?next=/auth/login` redirects to `/auth/login`
- Missing `next` param redirects to `/`

**Code:**
```typescript
// app/auth/confirm/route.ts
function getSafeRedirectPath(next: string | null): string {
  if (!next) return '/';
  // Must start with / but not // (protocol-relative URL)
  if (next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/';
}

// Usage:
const next = searchParams.get("next");
const safePath = getSafeRedirectPath(next);
redirect(safePath);
```

---

### 1.3 Fix Environment Variable Mismatch
**File:** `/lib/supabase/middleware.ts`

**Problem:** Uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` but actual env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

**Tasks:**
- [ ] Update middleware.ts to use correct env var name
- [ ] Verify proxy.ts uses correct env var name
- [ ] Update .env.example if needed
- [ ] Test middleware authentication works

**Acceptance Criteria:**
- Middleware successfully authenticates users
- No "undefined" API key errors in logs
- Session refresh works correctly

---

### 1.4 Fix Overly Permissive RLS Policies
**Files:** Supabase migrations

**Problem:** `meetings`, `meeting_attendees`, `issue_assignees`, `documents` use `USING (true)` allowing any authenticated user full access to any record.

**Tasks:**
- [ ] Create migration to drop permissive policies
- [ ] Create workspace-scoped SELECT policies
- [ ] Create ownership/membership-based INSERT/UPDATE/DELETE policies
- [ ] Test users can only access their workspace's data
- [ ] Test cross-workspace access is denied

**Acceptance Criteria:**
- Users can only view meetings in their workspaces
- Users can only add attendees to meetings they own or are admin of
- Users can only assign issues in their workspace
- Documents are scoped to workspace

**Migration:**
```sql
-- 20251201000000_fix_permissive_rls.sql

-- Meetings: scope to workspace
DROP POLICY IF EXISTS "Authenticated users can view all meetings" ON meetings;
DROP POLICY IF EXISTS "Authenticated users can insert meetings" ON meetings;
DROP POLICY IF EXISTS "Authenticated users can update meetings" ON meetings;
DROP POLICY IF EXISTS "Authenticated users can delete meetings" ON meetings;

CREATE POLICY "Users can view meetings in workspace" ON meetings
FOR SELECT TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE profile_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can create meetings in workspace" ON meetings
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE profile_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can update own meetings or admin" ON meetings
FOR UPDATE TO authenticated
USING (
  created_by = (SELECT auth.uid()) OR is_admin()
);

CREATE POLICY "Users can delete own meetings or admin" ON meetings
FOR DELETE TO authenticated
USING (
  created_by = (SELECT auth.uid()) OR is_admin()
);

-- Meeting Attendees: scope to meeting access
DROP POLICY IF EXISTS "Authenticated users can manage meeting attendees" ON meeting_attendees;

CREATE POLICY "Users can view attendees for accessible meetings" ON meeting_attendees
FOR SELECT TO authenticated
USING (
  meeting_id IN (
    SELECT id FROM meetings WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE profile_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Meeting creators can manage attendees" ON meeting_attendees
FOR ALL TO authenticated
USING (
  meeting_id IN (
    SELECT id FROM meetings
    WHERE created_by = (SELECT auth.uid())
  ) OR is_admin()
);

-- Issue Assignees: scope to issue access
DROP POLICY IF EXISTS "Authenticated users can manage issue assignees" ON issue_assignees;

CREATE POLICY "Users can view assignees for accessible issues" ON issue_assignees
FOR SELECT TO authenticated
USING (
  issue_id IN (
    SELECT id FROM issues WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE profile_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Issue creators and admins can manage assignees" ON issue_assignees
FOR ALL TO authenticated
USING (
  issue_id IN (
    SELECT id FROM issues
    WHERE creator_id = (SELECT auth.uid())
  ) OR is_admin()
);

-- Documents: scope to workspace
DROP POLICY IF EXISTS "Authenticated users can manage documents" ON documents;

CREATE POLICY "Users can view documents in workspace" ON documents
FOR SELECT TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE profile_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can create documents in workspace" ON documents
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE profile_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Admins can update documents" ON documents
FOR UPDATE TO authenticated
USING (is_admin());

CREATE POLICY "Admins can delete documents" ON documents
FOR DELETE TO authenticated
USING (is_admin());
```

---

### 1.5 Add Missing Authentication Checks
**File:** `/app/actions.ts`

**Problem:** `updateMilestone`, `deleteMilestone`, `removeIssueFromMilestone` have no authentication checks.

**Tasks:**
- [ ] Add auth check to `updateMilestone` (line ~1779)
- [ ] Add auth check to `deleteMilestone` (line ~1812)
- [ ] Add auth check to `removeIssueFromMilestone` (line ~1854)
- [ ] Add auth check to `addIssueToMilestone` if missing

**Acceptance Criteria:**
- Unauthenticated calls return `{ success: false, error: "Not authenticated" }`
- Authenticated calls proceed normally

**Code Pattern:**
```typescript
export async function updateMilestone(
  milestoneId: string,
  data: { ... }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  // ... rest of function
}
```

---

## Phase 2: Type Safety & Validation

### 2.1 Generate Supabase TypeScript Types
**File:** `/types/database.ts` (new)

**Tasks:**
- [ ] Run `npx supabase gen types typescript --project-id <id> > types/database.ts`
- [ ] Update Supabase client to use generated types
- [ ] Export commonly used types (Issue, Project, Profile, etc.)

**Acceptance Criteria:**
- `types/database.ts` exists with all table types
- Supabase client is typed: `createClient<Database>()`
- No more inline type definitions for database entities

---

### 2.2 Add Zod Validation to Server Actions
**Files:** `/lib/validation.ts` (new), `/app/actions.ts`

**Tasks:**
- [ ] Create `/lib/validation.ts` with Zod schemas
- [ ] Create schemas for: Issue, Project, Team, Meeting, Client, Milestone
- [ ] Update server actions to validate FormData before processing
- [ ] Return validation errors in ActionResult

**Acceptance Criteria:**
- Invalid data returns descriptive error message
- Empty required fields are caught before database call
- Type assertions (`as string`) are replaced with Zod parsing

**Code:**
```typescript
// lib/validation.ts
import { z } from 'zod';

export const createIssueSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(['Yet to Start', 'Todo', 'In Progress', 'Done', 'Canceled']).default('Yet to Start'),
  priority: z.enum(['No Priority', 'Urgent', 'High', 'Medium', 'Low']).default('No Priority'),
  team_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  workspace_id: z.string().uuid().optional().nullable(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(['Yet to Start', 'In Progress', 'Done', 'On Hold', 'Canceled']).default('Yet to Start'),
  project_group: z.enum(['salman_kuwait', 'tasos_kyriakides', 'active', 'demos', 'inactive', 'finished', 'other']).optional().nullable(),
  project_type: z.enum(['web_design', 'ai_agent', 'seo', 'ads']).optional().nullable(),
  team_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  workspace_id: z.string().uuid().optional().nullable(),
});

// ... more schemas

export function parseFormData<T>(schema: z.ZodSchema<T>, formData: FormData): { success: true; data: T } | { success: false; error: string } {
  const obj = Object.fromEntries(formData);
  const result = schema.safeParse(obj);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }
  return { success: true, data: result.data };
}
```

---

### 2.3 Replace `any` Types
**Files:** `/app/actions.ts`, `/components/project-milestones.tsx`, `/app/projects/page.tsx`

**Tasks:**
- [ ] Find all `any` usages: `grep -n ": any" app/ components/`
- [ ] Replace with proper types from generated database types
- [ ] Add `@typescript-eslint/no-explicit-any: error` to ESLint

**Locations to fix:**
- `app/actions.ts:1131` - `(a: any)` in client activities map
- `app/actions.ts:1669` - `(mi: any)` in milestone issues map
- `app/actions.ts:1713` - `(mi: any)` in milestone issues map
- `app/projects/page.tsx:30` - `(p: any)` in projects map
- `components/project-milestones.tsx:45` - `issues?: any[]`
- `components/project-milestones.tsx:219` - `(i: any)` in issues filter
- `components/project-milestones.tsx:293` - `value as any`
- `components/project-milestones.tsx:368` - `(issue: any)` in map

**Acceptance Criteria:**
- Zero `any` types in codebase
- ESLint fails on new `any` usage
- All maps/filters have properly typed callbacks

---

## Phase 3: Performance Optimizations

### 3.1 Fix Font Loading (Critical)
**Files:** `/app/globals.css`, `/app/layout.tsx`

**Problem:** CSS `@import` for Google Fonts blocks rendering, hurting LCP.

**Tasks:**
- [ ] Remove `@import` from globals.css
- [ ] Add `next/font/google` imports to layout.tsx
- [ ] Apply font CSS variables to body
- [ ] Update Tailwind config if needed
- [ ] Test fonts load correctly with no FOUT

**Acceptance Criteria:**
- No external CSS imports in globals.css
- Fonts preload correctly (check Network tab)
- No layout shift from font loading
- LCP improves (measure with Lighthouse)

**Code:**
```typescript
// app/layout.tsx
import { Inter, DM_Sans, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
}
```

```css
/* globals.css - REMOVE this line */
/* @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'); */
```

---

### 3.2 Lazy Load Chat Component
**File:** `/components/sidebar.tsx`

**Problem:** Chat component with AI SDK dependencies loads with sidebar, bloating initial bundle.

**Tasks:**
- [ ] Convert Chat import to dynamic import
- [ ] Add loading skeleton for Chat
- [ ] Ensure Chat only loads when AI panel is opened
- [ ] Verify bundle size reduction

**Acceptance Criteria:**
- Initial page load doesn't include Chat chunk
- Chat loads on-demand when AI Assistant is clicked
- Loading state shown while Chat loads
- Bundle size reduced by ~50KB+

**Code:**
```typescript
// components/sidebar.tsx
import dynamic from 'next/dynamic'

const Chat = dynamic(() => import('@/components/chat'), {
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading AI Assistant...</div>
    </div>
  ),
  ssr: false,
})
```

---

### 3.3 Add Missing Database Indexes
**File:** New migration

**Tasks:**
- [ ] Create migration for missing indexes
- [ ] Apply to database
- [ ] Verify with EXPLAIN ANALYZE on common queries

**Migration:**
```sql
-- 20251201000001_add_missing_indexes.sql

-- Activity feed ordering
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- Meeting scheduling
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_workspace_start ON meetings(workspace_id, start_time);

-- Client filtering
CREATE INDEX IF NOT EXISTS idx_clients_lead_status ON clients(lead_status);

-- Milestone ordering
CREATE INDEX IF NOT EXISTS idx_milestones_display_order ON milestones(display_order);

-- Project filtering
CREATE INDEX IF NOT EXISTS idx_projects_project_group ON projects(project_group);

-- Foreign keys missing indexes
CREATE INDEX IF NOT EXISTS idx_activities_comment_id ON activities(comment_id);
CREATE INDEX IF NOT EXISTS idx_activities_issue_id ON activities(issue_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_created_by ON client_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_issue_assignees_assigned_by ON issue_assignees(assigned_by);
CREATE INDEX IF NOT EXISTS idx_milestone_issues_added_by ON milestone_issues(added_by);
CREATE INDEX IF NOT EXISTS idx_milestones_created_by ON milestones(created_by);
CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);

-- Remove duplicate indexes
DROP INDEX IF EXISTS idx_activities_workspace;
DROP INDEX IF EXISTS idx_clients_workspace;
DROP INDEX IF EXISTS idx_issues_workspace;
DROP INDEX IF EXISTS idx_projects_workspace;
DROP INDEX IF EXISTS idx_teams_workspace;
```

---

### 3.4 Optimize Detail Page Data Fetching
**Files:** `/app/projects/[id]/page.tsx`, `/app/projects/[id]/client.tsx`

**Problem:** Detail pages fetch all data client-side via useEffect, losing SSR benefits.

**Tasks:**
- [ ] Refactor page.tsx to fetch data server-side
- [ ] Pass data as props to client component
- [ ] Add not-found.tsx for 404 handling
- [ ] Remove useEffect data fetching from client

**Acceptance Criteria:**
- Data is fetched on server, passed to client
- Page renders with data immediately (no loading flash)
- 404 shows proper not-found page
- Client component is purely for interactivity

**Code:**
```typescript
// app/projects/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getProjectById, getTeams, getProfiles, getMilestones } from '@/app/actions';
import ProjectDetailClient from './client';

export default async function ProjectDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  const [project, teams, profiles, milestones] = await Promise.all([
    getProjectById(id),
    getTeams(),
    getProfiles(),
    getMilestones(id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <ProjectDetailClient
      initialProject={project}
      teams={teams}
      profiles={profiles}
      milestones={milestones}
    />
  );
}
```

```typescript
// app/projects/[id]/not-found.tsx
import Link from 'next/link';
import { FolderX } from 'lucide-react';

export default function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
      <FolderX className="w-16 h-16 text-muted-foreground" />
      <h2 className="text-2xl font-semibold">Project Not Found</h2>
      <p className="text-muted-foreground">The project you're looking for doesn't exist or has been deleted.</p>
      <Link
        href="/projects"
        className="text-qualia-500 hover:text-qualia-400 hover:underline"
      >
        Back to Projects
      </Link>
    </div>
  );
}
```

---

## Phase 4: Testing Infrastructure

### 4.1 Set Up Vitest + React Testing Library
**Files:** `vitest.config.ts`, `package.json`, `setupTests.ts`

**Tasks:**
- [ ] Install dependencies: `vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom`
- [ ] Create vitest.config.ts
- [ ] Create setupTests.ts
- [ ] Add test script to package.json
- [ ] Create first smoke test

**Acceptance Criteria:**
- `npm test` runs Vitest
- React components can be tested with RTL
- Jest-dom matchers available

**Code:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './setupTests.ts',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

```typescript
// setupTests.ts
import '@testing-library/jest-dom'
```

```json
// package.json (add to scripts)
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

### 4.2 Add Server Action Unit Tests
**File:** `/app/actions.test.ts` (new)

**Tasks:**
- [ ] Mock Supabase client
- [ ] Test createIssue with valid data
- [ ] Test createIssue with invalid data
- [ ] Test authentication failure handling
- [ ] Test at least one action per domain

**Acceptance Criteria:**
- Server actions can be tested in isolation
- Supabase calls are mocked
- Error cases are covered

---

### 4.3 Add Component Smoke Tests
**Files:** `components/__tests__/` (new directory)

**Tasks:**
- [ ] Test Sidebar renders without crashing
- [ ] Test NewIssueModal opens and closes
- [ ] Test ProjectList renders with mock data
- [ ] Test IssueList renders with mock data

**Acceptance Criteria:**
- Core components render without errors
- Basic interactions work (open/close modal)
- No console errors during tests

---

## Phase 5: Code Organization & DevOps

### 5.1 Split Actions into Modules
**Files:** `/app/actions/` (new directory)

**Tasks:**
- [ ] Create `/app/actions/workspace.ts`
- [ ] Create `/app/actions/issues.ts`
- [ ] Create `/app/actions/projects.ts`
- [ ] Create `/app/actions/teams.ts`
- [ ] Create `/app/actions/clients.ts`
- [ ] Create `/app/actions/meetings.ts`
- [ ] Create `/app/actions/milestones.ts`
- [ ] Create `/app/actions/index.ts` (re-exports)
- [ ] Update all imports throughout codebase

**Acceptance Criteria:**
- No file over 500 lines
- Related actions grouped together
- All existing functionality preserved
- No import changes needed in consuming code (via index.ts re-exports)

---

### 5.2 Add Security Headers
**File:** `/next.config.ts`

**Tasks:**
- [ ] Add security headers configuration
- [ ] Test headers appear in responses
- [ ] Verify no broken functionality

**Code:**
```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
```

---

### 5.3 Create GitHub Actions CI/CD
**File:** `.github/workflows/ci.yml` (new)

**Tasks:**
- [ ] Create workflow file
- [ ] Add lint step
- [ ] Add type check step
- [ ] Add test step
- [ ] Add build step

**Code:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Test
        run: npm test -- --run

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
```

---

### 5.4 Implement Rate Limiting
**File:** `/app/api/chat/route.ts`

**Tasks:**
- [ ] Install `@upstash/ratelimit` and `@upstash/redis` (or use Vercel KV)
- [ ] Add rate limiting to chat endpoint
- [ ] Return 429 with retry-after header when exceeded
- [ ] Log rate limit hits

**Code:**
```typescript
// Option 1: Using Upstash
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  analytics: true,
});

export async function POST(req: Request) {
  // Rate limit by user ID or IP
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      }
    });
  }

  // ... rest of handler
}
```

---

## Checklist Summary

### Phase 1: Critical Security (Week 1)
- [ ] 1.1 Create root middleware.ts
- [ ] 1.2 Fix open redirect vulnerability
- [ ] 1.3 Fix environment variable mismatch
- [ ] 1.4 Fix overly permissive RLS policies
- [ ] 1.5 Add missing authentication checks

### Phase 2: Type Safety (Week 2)
- [ ] 2.1 Generate Supabase TypeScript types
- [ ] 2.2 Add Zod validation to server actions
- [ ] 2.3 Replace all `any` types

### Phase 3: Performance (Week 3)
- [ ] 3.1 Fix font loading with next/font
- [ ] 3.2 Lazy load Chat component
- [ ] 3.3 Add missing database indexes
- [ ] 3.4 Optimize detail page data fetching

### Phase 4: Testing (Week 4)
- [ ] 4.1 Set up Vitest + React Testing Library
- [ ] 4.2 Add server action unit tests
- [ ] 4.3 Add component smoke tests

### Phase 5: DevOps (Week 5)
- [ ] 5.1 Split actions into modules
- [ ] 5.2 Add security headers
- [ ] 5.3 Create GitHub Actions CI/CD
- [ ] 5.4 Implement rate limiting

---

*Implementation plan generated from Deep Research Report 2025-12-01*
