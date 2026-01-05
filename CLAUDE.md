# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Qualia Internal Suite - Project management platform built with Next.js 16+, Supabase, and AI.

**Design**: Clean, professional UI like Linear/Plane. No flashy effects.

## Commands

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm test                 # Jest tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

## Tech Stack

- **Framework**: Next.js 16+ (App Router, React 19, TypeScript)
- **Database**: Supabase (PostgreSQL, pgvector for RAG)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: SWR (30s auto-refresh for tasks)
- **AI**: Gemini via OpenRouter, VAPI voice, Google embeddings

## Architecture

### Server Actions Pattern

All mutations in `app/actions.ts` + `app/actions/*.ts`. Return `ActionResult`:

```typescript
type ActionResult = { success: boolean; error?: string; data?: unknown };
```

Action files:

- `app/actions.ts` - Main actions (issues, projects, clients, meetings, workspaces)
- `app/actions/inbox.ts` - Task CRUD with inbox filtering
- `app/actions/daily-flow.ts` - Dashboard data aggregation
- `app/actions/timeline-dashboard.ts` - Timeline view data
- `app/actions/learning.ts` - Mentorship/training features
- `app/actions/payments.ts` - Payment tracking

### Key Directories

```
app/
├── actions.ts              # Main server actions (2900+ lines)
├── actions/                # Domain-specific actions
├── api/chat/route.ts       # AI chat endpoint
├── api/vapi/webhook/       # Voice AI webhooks
├── (routes)/               # Page routes

lib/
├── validation.ts           # Zod schemas for all entities
├── swr.ts                  # SWR hooks + cache invalidation
├── ai/ai-core.ts           # Shared AI processing
├── color-constants.ts      # Centralized theme colors
├── supabase/               # Supabase client setup

components/
├── ui/                     # shadcn/ui primitives
├── daily-flow/             # Dashboard components
├── project-wizard/         # Multi-step project creation

types/database.ts           # Auto-generated Supabase types
```

### Data Flow

1. **Server Components** → Direct Supabase queries via server actions
2. **Client Components** → SWR hooks (`useInboxTasks`, `useProjects`, etc.)
3. **Mutations** → Server action → Zod validation → DB → `revalidatePath()` → Invalidate SWR

### SWR Hooks (lib/swr.ts)

```typescript
// Available hooks
useInboxTasks(); // Tasks with show_in_inbox=true
useProjectTasks(id); // All tasks for a project
useDailyFlow(); // Dashboard aggregated data
useTimelineDashboard(); // Timeline with assignments
useTeams(); // Cached teams list
useProjects(); // Cached projects list
useProfiles(); // Cached user profiles
```

### Cache Invalidation

After mutations, always invalidate with `immediate: true`:

```typescript
invalidateInboxTasks(true);
invalidateProjectTasks(projectId, true);
invalidateDailyFlow(true);
invalidateTimeline(true);
```

### Supabase FK Pattern

Supabase returns FKs as arrays. Always normalize:

```typescript
// In server actions
return {
  ...data,
  project: Array.isArray(data.project) ? data.project[0] || null : data.project,
};
```

## Database

**Use Supabase MCP tools** - don't write raw SQL in code files.

### Key Tables

| Table           | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `tasks`         | Tasks with `show_in_inbox`, `item_type`, `due_date`        |
| `issues`        | Legacy issues (being migrated to tasks)                    |
| `projects`      | Projects with `project_type`, `project_group`, `client_id` |
| `clients`       | CRM with `lead_status`, `last_contacted_at`                |
| `meetings`      | Calendar with `meeting_link`, `client_id`                  |
| `profiles`      | Users with `role` (admin/employee)                         |
| `workspaces`    | Multi-tenant isolation                                     |
| `notifications` | In-app notifications                                       |
| `activities`    | Activity feed                                              |

### Type Helpers

```typescript
import { Tables, Enums, Task, Project, Client } from '@/types/database';

// Use generated types
const project: Tables<'projects'> = ...;
const status: Enums<'project_status'> = 'Active';

// Use constants
import { TASK_STATUSES, PROJECT_TYPES, LEAD_STATUSES } from '@/types/database';
```

### Key Enums

- `project_type`: `web_design`, `ai_agent`, `voice_agent`, `seo`, `ads`
- `project_status`: `Demos`, `Active`, `Launched`, `Delayed`, `Archived`, `Canceled`
- `task_status`: `Todo`, `In Progress`, `Done`, `Canceled`
- `lead_status`: `dropped`, `cold`, `hot`, `active_client`, `inactive_client`, `dead_lead`

## Styling

**Brand color**: `qualia-*` classes (teal #00A4AC)

**Z-index scale** (from tailwind.config.ts):

- `z-dropdown: 40`
- `z-modal: 50`
- `z-popover: 55`
- `z-toast: 70`
- `z-command: 90`

Colors from `lib/color-constants.ts` - use `ISSUE_STATUS_COLORS`, `ISSUE_PRIORITY_COLORS`, etc.

## Conventions

- Server actions return `ActionResult { success, error?, data? }`
- Zod schemas in `lib/validation.ts` - use `parseFormData()` or `validateData()`
- `'use client'` directive for interactive components
- `React.memo()` for list item components
- Commits: `feat:`, `fix:`, `perf:`, `refactor:`, `style:`, `docs:`

## Deployment

- **Production**: https://qualia-erp.vercel.app (auto-deploy from master)
- **Pre-commit hooks**: ESLint, Prettier, TypeScript (via husky + lint-staged)
