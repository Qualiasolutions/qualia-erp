# Architecture

**Analysis Date:** 2026-03-01

## Pattern Overview

**Overall:** Server Actions + Client SWR (Next.js 16 App Router)

**Key Characteristics:**

- Server-first mutations with type-safe server actions
- Client-side caching and real-time updates via SWR hooks
- Multi-tenant workspace isolation enforced at the database level
- AI-powered features integrated through streaming responses
- Action-result pattern for consistent error handling

## Layers

**Presentation Layer (Client Components):**

- Purpose: Interactive UI with optimistic updates and real-time data
- Location: `components/`, `app/**/page.tsx`, `app/**/*-client.tsx`
- Contains: React 19 components, SWR hooks, form interactions, drag-and-drop interfaces
- Depends on: SWR hooks (`lib/swr.ts`), server actions (`app/actions/`), UI primitives (`components/ui/`)
- Used by: End users through browser

**Server Layer (Server Components + Actions):**

- Purpose: Data fetching, mutations, authentication, business logic
- Location: `app/actions/`, `app/**/page.tsx` (server components), `lib/supabase/server.ts`
- Contains: Server actions, Zod validation, database queries, email notifications
- Depends on: Supabase client, validation schemas, utilities
- Used by: Client components via server actions, direct SSR in pages

**Data Layer (Supabase PostgreSQL):**

- Purpose: Persistent storage with RLS, foreign key relationships, pgvector for RAG
- Location: External Supabase instance
- Contains: 30+ tables (tasks, projects, clients, meetings, profiles, workspaces, activities, notifications, etc.)
- Depends on: RLS policies, database functions, triggers
- Used by: Server layer via Supabase client (`@supabase/ssr`)

**Integration Layer (API Routes):**

- Purpose: External webhooks, AI streaming, scheduled jobs, third-party integrations
- Location: `app/api/`
- Contains: Chat endpoint (Gemini), VAPI webhooks, cron jobs, embedding generation
- Depends on: OpenRouter API, VAPI, Resend, Supabase
- Used by: External services (webhooks), client components (AI chat), Vercel Cron

## Data Flow

**Task Mutation Flow:**

1. User interacts with client component (e.g., `edit-task-modal.tsx`)
2. Component calls server action `updateTask()` from `app/actions/inbox.ts`
3. Server action validates input with Zod schema (`lib/validation.ts`)
4. Server action queries Supabase with authorization check (`canModifyTask()`)
5. Database updates task row, triggers RLS policies
6. Server action calls `revalidatePath()` to invalidate Next.js cache
7. Server action returns `ActionResult { success: true, data: task }`
8. Component invalidates SWR cache with `invalidateProjectTasks(projectId, true)`
9. SWR refetches data immediately, re-renders UI with fresh data

**AI Chat Flow:**

1. User sends message in AI chat widget (`components/ai-assistant/`)
2. Client POSTs to `/api/chat/route.ts` with messages array and conversationId
3. API route authenticates user, checks rate limit, fetches enriched context
4. Route loads memory context (previous summaries, admin notes, work context)
5. Route builds system prompt with user context (`lib/ai/system-prompt.ts`)
6. Route streams response from OpenRouter (Gemini 3 Flash)
7. Route updates conversation summary and interaction count in database
8. Client receives streaming response, displays incrementally

**State Management:**

- Server state: Next.js cache + SWR cache (45s auto-refresh when tab visible)
- Client state: React 19 state hooks, form state in modals
- Global state: Context providers (WorkspaceProvider, AdminProvider, ThemeProvider)

## Key Abstractions

**ActionResult:**

- Purpose: Standardized return type for all server actions
- Examples: `app/actions/shared.ts`
- Pattern: `{ success: boolean; error?: string; data?: T }`

**SWR Hooks:**

- Purpose: Client-side data fetching with automatic revalidation
- Examples: `useInboxTasks()`, `useProjects()`, `useTodaysMeetings()` in `lib/swr.ts`
- Pattern: `useSWR(cacheKey, fetcher, config)` with custom invalidation functions

**Server Actions:**

- Purpose: Type-safe server-side mutations callable from client
- Examples: `createProject()`, `updateTask()`, `deleteClient()` in `app/actions/`
- Pattern: `'use server'` directive, Zod validation, ActionResult return, revalidatePath

**Workspace Isolation:**

- Purpose: Multi-tenant data segregation
- Examples: All queries filtered by `workspace_id`, RLS policies enforce isolation
- Pattern: `getCurrentWorkspaceId()` at start of every server action

**FK Normalization:**

- Purpose: Handle Supabase's array-wrapped foreign key responses
- Examples: `normalizeFKResponse()` in `lib/server-utils.ts`
- Pattern: Convert `{ project: [{ id, name }] }` to `{ project: { id, name } }`

## Entry Points

**Root Layout:**

- Location: `app/layout.tsx`
- Triggers: All page loads
- Responsibilities: Provider tree (Theme, SWR, Workspace, Admin, LearnMode, AIAssistant), sidebar, command menu, accessibility

**Homepage (Today Dashboard):**

- Location: `app/page.tsx` → `app/today-page.tsx`
- Triggers: User navigates to `/`
- Responsibilities: Fetch meetings, tasks, project stats in parallel; render dashboard widgets

**Server Action Entry:**

- Location: `app/actions.ts` (re-export router)
- Triggers: Client component imports action
- Responsibilities: Route to domain-specific action module (workspace, teams, projects, clients, meetings, issues, notifications)

**AI Chat API:**

- Location: `app/api/chat/route.ts`
- Triggers: POST from AI assistant widget
- Responsibilities: Authenticate, rate limit, enrich context, stream Gemini response

**Middleware:**

- Location: `middleware.ts`
- Triggers: Every request (except static files, API routes)
- Responsibilities: Auth session refresh, redirect unauthenticated users to `/auth/login`

## Error Handling

**Strategy:** Fail gracefully with user-friendly messages, log errors server-side

**Patterns:**

- Server actions: Wrap in try/catch, return `{ success: false, error: 'User-friendly message' }`
- Client components: Use Error Boundaries (`components/error-boundary.tsx`), toast notifications (Sonner)
- API routes: Return JSON error responses with appropriate HTTP status codes (400, 401, 429, 500)
- Validation: Zod schema errors mapped to field-specific messages
- SWR: Exponential backoff retry with `onErrorRetry`, don't retry 4xx errors

## Cross-Cutting Concerns

**Logging:** Console.error server-side, Supabase activity log for user actions (`createActivity()`)

**Validation:** Zod schemas in `lib/validation.ts`, validated in server actions before DB operations

**Authentication:** Middleware checks session (`supabase.auth.getClaims()`), server actions verify user via `createClient()`, RLS enforces row-level security

**Authorization:** Helper functions in `app/actions/shared.ts` (`isUserAdmin()`, `canDeleteProject()`, `canModifyTask()`), checked before mutations

**Rate Limiting:** In-memory rate limiter (`lib/rate-limit.ts`) for AI chat (10 requests/min), TODO: Redis for production

**Activity Tracking:** `createActivity()` logs all mutations to `activities` table with actor, type, metadata

**Notifications:** `notifyTaskAssigned()` creates in-app notifications, email via Resend (`lib/email.ts`)

---

_Architecture analysis: 2026-03-01_
