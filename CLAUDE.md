# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Qualia Internal Suite is a project management platform for Qualia Solutions. Built with Next.js 15+ (App Router), Supabase, and AI capabilities including chat (Groq) and voice assistant (VAPI).

## Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Jest tests
npm run test:watch   # Jest watch mode
npm run test:coverage # Coverage report
npx tsc --noEmit     # Type check without build
```

## Tech Stack

- **Framework**: Next.js 15+ (App Router, React 19, TypeScript)
- **Database/Auth**: Supabase (PostgreSQL with pgvector for RAG)
- **Styling**: Tailwind CSS + shadcn/ui (Radix primitives)
- **AI**: Groq (llama-3.1-8b-instant for chat), VAPI (voice), Google AI (embeddings)
- **State**: SWR for client caching (60s dedup, 30s auto-refresh for tasks with exponential backoff)
- **Drag & Drop**: @dnd-kit for kanban boards
- **Virtualization**: @tanstack/react-virtual for large lists
- **Testing**: Jest + React Testing Library
- **Monitoring**: Sentry

## Architecture

### Server Actions (`app/actions.ts` + `app/actions/*.ts`)

All database mutations use server actions. Returns `ActionResult` pattern:

```typescript
type ActionResult = { success: boolean; error?: string; data?: unknown };
```

Main actions file (~2600 lines) handles: issues, projects, teams, clients, meetings, milestones.
Specialized actions in `app/actions/`: health, inbox, learning, payments, shared (reusable utilities).

### Task System

Tasks are the unified work item system:

- **Tasks** (`tasks` table): All tasks belong to a project (required via `project_id`)
- **Inbox visibility**: Tasks can optionally appear in inbox via `show_in_inbox` boolean
- **Item types**: `task` | `issue` | `note` | `resource` (for kanban categorization)
- **Status**: Todo → In Progress → Done
- **Priority**: Hidden from UI, defaults to 'No Priority'

```typescript
// Task type from app/actions/inbox.ts
type Task = {
  id: string;
  project_id: string; // Required - every task belongs to a project
  show_in_inbox: boolean; // If true, appears in inbox AND project view
  status: 'Todo' | 'In Progress' | 'Done';
  item_type: 'task' | 'issue' | 'note' | 'resource';
  // ... other fields
};
```

### Key Directories

```
app/
├── actions.ts              # Main server actions
├── actions/inbox.ts        # Task CRUD, reordering, inbox toggle
├── api/chat/route.ts       # AI chat agent (15+ tools, 30s timeout)
├── api/vapi/webhook/       # Voice assistant webhooks
├── api/embeddings/route.ts # Google AI embeddings
├── error.tsx               # Global error boundary
├── clients/                # CRM section
├── inbox/                  # Personal task inbox (show_in_inbox=true tasks)
│   └── error.tsx           # Inbox-specific error boundary
├── payments/               # Hidden admin-only financial tracking (/payments)
├── projects/               # Project management (grouped list view)
└── schedule/               # Calendar views

lib/
├── supabase/server.ts      # Server-side Supabase client (always create fresh)
├── supabase/client.ts      # Browser-side Supabase client
├── swr.ts                  # SWR hooks with tab visibility + immediate invalidation
├── validation.ts           # Zod schemas for all entities
├── color-constants.ts      # Centralized Tailwind color classes (task/priority colors)
├── client-utils.ts         # Client types, status config, helper functions
├── rate-limit.ts           # API rate limiting utilities
└── vapi-webhook-handlers.ts # Voice tool handlers

components/
├── project-list-view.tsx   # Projects grouped list (by type: AI, Voice, Web, etc.)
├── project-task-kanban.tsx # Drag-and-drop task kanban for projects
├── new-task-modal.tsx      # Create task (requires project, optional inbox)
├── edit-task-modal.tsx     # Edit task details
├── task-card.tsx           # Reusable task card with memo optimization
├── inbox-kanban-view.tsx   # Kanban view for inbox tasks
├── inbox-list-view.tsx     # List view with drag-drop state sync
├── client-list.tsx         # Client list container with view toggle
├── client-card.tsx         # Memoized client card for grid view
├── client-row.tsx          # Memoized client row for list view
├── client-detail-modal.tsx # Client detail/edit modal
└── dashboard-activity-feed.tsx # Virtualized activity feed

hooks/
├── use-presence.tsx        # Real-time presence via Supabase (dev-only logging)
├── use-speech-recognition.ts # Browser speech recognition
└── use-voice-synthesis.ts  # Text-to-speech synthesis

types/
└── database.ts             # Auto-generated Supabase types (Tables<>, Enums<>)
```

### Data Flow

1. **Server Components**: Direct Supabase queries for initial data
2. **Client Components**: SWR hooks for caching + auto-refresh for tasks
3. **Mutations**: Server actions with Zod validation → returns ActionResult → invalidates SWR cache
4. **Real-time**: SWR auto-refresh every 30s for tasks (not Supabase Realtime)

### SWR Caching Strategy (`lib/swr.ts`)

```typescript
// Default config - infrequently changing data
swrConfig = {
  dedupingInterval: 60000, // 60s dedup window
  focusThrottleInterval: 5000, // Max 1 refetch per 5s on focus
  keepPreviousData: true, // Show stale while revalidating
};

// Auto-refresh config - tasks that change frequently
autoRefreshConfig = {
  refreshInterval: () => (isDocumentVisible() ? 30000 : 0), // 30s when visible, stops when hidden
  dedupingInterval: 15000, // 15s dedup for tasks
  revalidateOnFocus: true,
  onErrorRetry, // Exponential backoff (1s, 2s, 4s) on errors
};

// Immediate invalidation (prevents stale data after mutations)
invalidateInboxTasks(immediate: true);      // Force refetch now
invalidateProjectTasks(projectId, immediate: true);
```

### AI Chat Agent (`app/api/chat/route.ts`)

Uses Groq's llama-3.1-8b-instant with 15+ tools. Max duration: 30s.

**Read tools**: getDashboardStats, searchIssues, searchProjects, searchClients, getTeams, getRecentActivity, getUpcomingMeetings, getProjectDetails, getWorkspaceStats, searchKnowledgeBase (RAG)

**Write tools**: createTask, updateTaskStatus, addComment, createClient, createMeeting

RAG search uses `match_documents()` RPC with Google's text-embedding-004 model.

### Voice Assistant (VAPI)

Webhook at `app/api/vapi/webhook/route.ts`. Tool handlers in `lib/vapi-webhook-handlers.ts`.

## Performance Optimizations

### Bundle Size (`next.config.ts`)

- Tree-shaking via `optimizePackageImports` for: lucide-react, date-fns, @radix-ui/react-icons, framer-motion, @dnd-kit/core, @dnd-kit/sortable, @tanstack/react-virtual, zod
- Note: Keep list to ~8 packages to prevent build hangs with Turbopack
- `removeConsole: true` in production
- Source maps disabled in production
- Bundle analyzer available: `ANALYZE=true npm run build`

### Component Optimization

- `React.memo()` on frequently re-rendered components (TaskCard, ClientCard, ClientRow, ActivityItem)
- `useMemo()` for expensive computations and style objects
- Virtualization for large lists (>20 items) using @tanstack/react-virtual
- Split large components: `client-list.tsx` split into `client-card.tsx`, `client-row.tsx`, `client-detail-modal.tsx`

### Z-Index Scale (`tailwind.config.ts`)

Use semantic z-index values to prevent overlay conflicts:

```
z-dropdown: 40, z-sticky: 45, z-modal: 50, z-popover: 55, z-overlay: 60, z-toast: 70, z-tooltip: 80, z-command: 90
```

### Brand Colors

Use `qualia-*` classes for brand colors (teal #00A4AC):

```
text-qualia-400, bg-qualia-500/10, border-qualia-500/30
```

### API Optimization

- Chat API timeout reduced to 30s to prevent slow request accumulation
- Rate limiting: 20 req/min for chat, 100 req/min for API
- SWR exponential backoff on errors (1s, 2s, 4s delays)

### Database Optimization

RLS policies optimized to use `(SELECT auth.uid())` pattern for better performance:

```sql
-- BAD: Re-evaluates auth.uid() for each row
USING (profile_id = auth.uid())

-- GOOD: Evaluates once per query
USING (profile_id = (SELECT auth.uid()))
```

**Indexed foreign keys** for JOIN performance:

- All primary foreign keys have covering indexes
- Composite indexes for common query patterns (workspace + status, project + sort_order)

**Migrations applied**:

- `add_missing_foreign_key_indexes` - 15 indexes for FK constraints
- `optimize_rls_policies_initplan` - 40+ policies optimized
- `consolidate_duplicate_rls_policies` - Removed redundant policies

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
GROQ_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
NEXT_PUBLIC_VAPI_PUBLIC_KEY=
VAPI_WEBHOOK_SECRET=
```

## Database Access

This project has Supabase MCP configured. Use these tools:

- `mcp__supabase__list_tables` - See schema
- `mcp__supabase__execute_sql` - Run queries
- `mcp__supabase__apply_migration` - Schema changes (DDL)
- `mcp__supabase__get_logs` - Debug issues (api, postgres, auth)

Key database types are in `types/database.ts` - use `Tables<'tablename'>` for row types.

### Key Tables

| Table        | Description                                           |
| ------------ | ----------------------------------------------------- |
| `tasks`      | Tasks with `project_id`, `show_in_inbox`, `item_type` |
| `projects`   | Projects containing tasks                             |
| `clients`    | CRM clients with lead_status                          |
| `payments`   | Financial tracking (admin-only via RLS)               |
| `meetings`   | Scheduled meetings with attendees                     |
| `activities` | Activity feed (virtualized for performance)           |
| `profiles`   | User profiles linked to auth.users                    |
| `workspaces` | Multi-tenant workspaces                               |
| `documents`  | RAG documents with pgvector embeddings                |
| `issues`     | Legacy issue system (separate from tasks)             |

### Supabase Connection

- **Project URL**: `https://vbpzaiqovffpsroxaulv.supabase.co`
- **RLS**: Enabled on all tables (optimized with `(SELECT auth.uid())` pattern)
- **Realtime**: Available but SWR polling preferred for tasks

### Recent Migrations

```bash
# View applied migrations
mcp__supabase__list_migrations

# Check performance advisors
mcp__supabase__get_advisors type="performance"
```

Latest performance migrations:

- `add_missing_foreign_key_indexes` - FK indexes for JOIN performance
- `optimize_rls_policies_initplan` - RLS query optimization
- `consolidate_duplicate_rls_policies` - Remove policy redundancy

## Testing

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- path/to/test    # Single test file
```

Tests in `__tests__/` mirror source structure. Coverage threshold: 50%.

## Security

Security headers configured in `next.config.ts`:

- CSP with strict connect-src whitelist (Supabase, Groq, VAPI, Sentry)
- X-Frame-Options: DENY
- HSTS with includeSubDomains
- Microphone permission allowed (for voice assistant)

### Hidden Admin Pages

Some pages are hidden from navigation and restricted to specific users:

- `/payments` - Financial tracking, restricted to `info@qualiasolutions.net`
  - Uses RLS policy checking `auth.users.email`
  - Server-side redirect for unauthorized users
  - Not shown in sidebar navigation

## Deployment

- **Production**: https://qualia-erp.vercel.app
- **Platform**: Vercel (auto-deploy from master)
- **Build time**: ~9s compile + ~1s static generation (Turbopack)

## CI/CD

GitHub Actions workflows:

- `ci.yml` - Quick lint + type check on PR
- `ci-cd.yml` - Full pipeline (security, quality, test, build, deploy)
- `supabase.yml` - Database migration automation

Pre-commit hooks (Husky): ESLint, Prettier, TypeScript checks.

## Error Handling

### Error Boundaries

Next.js App Router error boundaries in `error.tsx` files:

```typescript
// app/inbox/error.tsx - Route-specific error boundary
'use client';
export default function InboxError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (/* Error UI with retry button */);
}
```

- `app/error.tsx` - Global fallback for unhandled errors
- `app/inbox/error.tsx` - Inbox-specific with contextual messaging
- Always include `reset()` button and optional page reload

### Server Action Errors

All server actions return `ActionResult`:

```typescript
type ActionResult = { success: boolean; error?: string; data?: unknown };

// Usage pattern
const result = await createTask(data);
if (!result.success) {
  toast.error(result.error || 'Something went wrong');
  return;
}
```

## Conventions

- Server actions return `ActionResult { success, error?, data? }`
- Use Zod schemas from `lib/validation.ts` for input validation
- Use types from `types/database.ts` (e.g., `Tables<'projects'>`, `Enums<'project_status'>`)
- Color classes from `lib/color-constants.ts` - never hardcode colors
- Client utilities from `lib/client-utils.ts` - status config, getInitials, etc.
- Components use `'use client'` directive for client-side interactivity
- Tailwind for styling, no inline CSS
- Conventional commits: `feat:`, `fix:`, `perf:`, `refactor:`
- Use `React.memo()` for list item components
- Invalidate SWR cache after mutations: `invalidateInboxTasks(true)`, `invalidateProjectTasks(id, true)`
- Wrap development-only console.logs: `if (process.env.NODE_ENV === 'development')`
