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
- **State**: SWR for client caching (60s dedup, 10s auto-refresh for tasks)
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
Specialized actions in `app/actions/`: health, inbox, learning.

### Task System

Tasks are the unified work item system:

- **Tasks** (`tasks` table): All tasks belong to a project (required via `project_id`)
- **Inbox visibility**: Tasks can optionally appear in inbox via `show_in_inbox` boolean
- **Status**: Todo → In Progress → Done
- **Priority**: Hidden from UI, defaults to 'No Priority'

```typescript
// Task type from app/actions/inbox.ts
type Task = {
  id: string;
  project_id: string; // Required - every task belongs to a project
  show_in_inbox: boolean; // If true, appears in inbox AND project view
  status: 'Todo' | 'In Progress' | 'Done';
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
├── clients/                # CRM section
├── inbox/                  # Personal task inbox (show_in_inbox=true tasks)
├── projects/               # Project management with task kanban
└── schedule/               # Calendar views

lib/
├── supabase/server.ts      # Server-side Supabase client (always create fresh)
├── supabase/client.ts      # Browser-side Supabase client
├── swr.ts                  # SWR hooks with optimized caching config
├── validation.ts           # Zod schemas for all entities
├── color-constants.ts      # Centralized Tailwind color classes
└── vapi-webhook-handlers.ts # Voice tool handlers

components/
├── project-task-kanban.tsx # Drag-and-drop task kanban for projects
├── new-task-modal.tsx      # Create task (requires project, optional inbox)
├── edit-task-modal.tsx     # Edit task details
├── task-card.tsx           # Reusable task card with memo optimization
├── inbox-kanban-view.tsx   # Kanban view for inbox tasks
├── inbox-list-view.tsx     # List view for inbox tasks
└── dashboard-activity-feed.tsx # Virtualized activity feed

types/
└── database.ts             # Auto-generated Supabase types (Tables<>, Enums<>)
```

### Data Flow

1. **Server Components**: Direct Supabase queries for initial data
2. **Client Components**: SWR hooks for caching + auto-refresh for tasks
3. **Mutations**: Server actions with Zod validation → returns ActionResult → invalidates SWR cache
4. **Real-time**: SWR auto-refresh every 10s for tasks (not Supabase Realtime)

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
  refreshInterval: 10000, // Refresh every 10s
  dedupingInterval: 8000, // Tighter dedup for tasks
  revalidateOnFocus: true,
};
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

- Tree-shaking via `optimizePackageImports` for: lucide-react, date-fns, Radix UI, framer-motion, @dnd-kit, @tanstack/react-virtual, zod
- `removeConsole: true` in production
- Source maps disabled in production

### Component Optimization

- `React.memo()` on frequently re-rendered components (TaskCard, ActivityItem)
- `useMemo()` for expensive computations and style objects
- Virtualization for large lists (>20 items) using @tanstack/react-virtual

### API Optimization

- Chat API timeout reduced to 30s to prevent slow request accumulation
- Rate limiting: 20 req/min for chat, 100 req/min for API

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

- `tasks` - All tasks with `project_id` (required) and `show_in_inbox` flag
- `projects` - Projects that contain tasks
- `issues` - Legacy issue system (separate from tasks)
- `profiles` - User profiles
- `workspaces` - Multi-tenant workspaces

## Testing

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- path/to/test    # Single test file
```

Tests in `__tests__/` mirror source structure. Coverage threshold: 50%.

## CI/CD

GitHub Actions workflows:

- `ci.yml` - Quick lint + type check on PR
- `ci-cd.yml` - Full pipeline (security, quality, test, build, deploy)
- `supabase.yml` - Database migration automation

Pre-commit hooks (Husky): ESLint, Prettier, TypeScript checks.

## Conventions

- Server actions return `ActionResult { success, error?, data? }`
- Use Zod schemas from `lib/validation.ts` for input validation
- Use types from `types/database.ts` (e.g., `Tables<'projects'>`, `Enums<'project_status'>`)
- Color classes from `lib/color-constants.ts` - never hardcode colors
- Components use `'use client'` directive for client-side interactivity
- Tailwind for styling, no inline CSS
- Conventional commits: `feat:`, `fix:`, `perf:`, `refactor:`
- Use `React.memo()` for list item components
- Invalidate SWR cache after mutations: `invalidateInboxTasks()`, `invalidateProjectTasks(id)`
