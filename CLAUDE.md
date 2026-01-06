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
npm run test:coverage    # Coverage report (50% threshold)
npm test -- path/to/test # Run single test file
```

## Tech Stack

- **Framework**: Next.js 16+ (App Router, React 19, TypeScript)
- **Database**: Supabase (PostgreSQL, pgvector for RAG)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: SWR (30s auto-refresh when tab visible)
- **AI**: Google Gemini via AI SDK, VAPI voice, Resend email
- **DnD**: @dnd-kit for drag-and-drop, @tanstack/react-virtual for virtualization

## Architecture

### Server Actions Pattern

All mutations in `app/actions.ts` (~2900 lines) + `app/actions/*.ts`. Return `ActionResult`:

```typescript
type ActionResult = { success: boolean; error?: string; data?: unknown };
```

Action files:

- `app/actions.ts` - Main actions (issues, projects, clients, meetings, workspaces)
- `app/actions/inbox.ts` - Task CRUD with inbox filtering
- `app/actions/daily-flow.ts` - Dashboard data aggregation
- `app/actions/timeline-dashboard.ts` - Timeline view data
- `app/actions/project-files.ts` - Project file upload/download
- `app/actions/learning.ts` - Mentorship/training features
- `app/actions/payments.ts` - Payment tracking
- `app/actions/health.ts` - Health check endpoint

### Key Directories

```
app/
├── actions.ts              # Main server actions
├── actions/                # Domain-specific actions
├── api/chat/              # AI chat endpoint (Gemini)
├── api/vapi/webhook/      # Voice AI webhooks
├── today-page.tsx         # Homepage dashboard
├── schedule/              # Team schedule page
├── projects/              # Project list + detail + roadmap
├── clients/               # CRM pages

lib/
├── validation.ts           # Zod schemas for all entities
├── swr.ts                  # SWR hooks + cache invalidation
├── supabase/server.ts      # Server-side Supabase client
├── supabase/client.ts      # Browser Supabase client
├── color-constants.ts      # Centralized theme colors
├── schedule-utils.ts       # Date/time filtering utilities
├── project-phases.ts       # Phase/milestone helpers
├── email.ts                # Resend email notifications

components/
├── ui/                     # shadcn/ui primitives
├── daily-flow/             # Dashboard components
├── project-wizard/         # Multi-step project creation

types/database.ts           # Auto-generated Supabase types + enum constants
```

### Data Flow

1. **Server Components** → Direct Supabase queries via server actions
2. **Client Components** → SWR hooks (`useInboxTasks`, `useProjects`, etc.)
3. **Mutations** → Server action → Zod validation → DB → `revalidatePath()` → Invalidate SWR

### SWR Hooks (lib/swr.ts)

```typescript
// Available hooks with auto-refresh
useInboxTasks(); // Tasks with show_in_inbox=true
useProjectTasks(id); // All tasks for a project
useDailyFlow(); // Dashboard aggregated data
useTimelineDashboard(); // Timeline with assignments
useTodaysTasks(); // Tasks due today/overdue
useTodaysMeetings(); // Meetings for today
useMeetings(); // All meetings
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
invalidateMeetings(true);
invalidateTodaysSchedule(true);
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

| Table            | Purpose                                                    |
| ---------------- | ---------------------------------------------------------- |
| `tasks`          | Tasks with `show_in_inbox`, `item_type`, `due_date`        |
| `issues`         | Legacy issues (being migrated to tasks)                    |
| `projects`       | Projects with `project_type`, `project_group`, `client_id` |
| `project_phases` | Phase milestones for project roadmaps                      |
| `phase_items`    | Items within phases                                        |
| `clients`        | CRM with `lead_status`, `last_contacted_at`                |
| `meetings`       | Calendar with `meeting_link`, `client_id`, attendees       |
| `profiles`       | Users with `role` (admin/employee)                         |
| `workspaces`     | Multi-tenant isolation                                     |
| `notifications`  | In-app notifications                                       |
| `activities`     | Activity feed                                              |
| `documents`      | Project file storage                                       |

### Type Helpers

```typescript
import { Tables, Enums, Task, Project, Client, Profile } from '@/types/database';

// Use generated types
const project: Tables<'projects'> = ...;
const status: Enums<'project_status'> = 'Active';

// Use constants (also exported from types/database.ts)
import { TASK_STATUSES, PROJECT_TYPES, LEAD_STATUSES, PROJECT_STATUSES } from '@/types/database';
```

### Key Enums

- `project_type`: `web_design`, `ai_agent`, `voice_agent`, `seo`, `ads`
- `project_status`: `Demos`, `Active`, `Launched`, `Delayed`, `Archived`, `Canceled`
- `task_status`: `Todo`, `In Progress`, `Done`, `Canceled`
- `lead_status`: `dropped`, `cold`, `hot`, `active_client`, `inactive_client`, `dead_lead`
- `user_role`: `admin`, `employee`
- `deployment_platform`: `vercel`, `squarespace`, `railway`, `meta`, `instagram`, `google_ads`, `tiktok`, `linkedin`, `none`

## Auth & Middleware

- `middleware.ts` - Protects all routes except `/auth/*` and `/api/*`
- Auth uses `supabase.auth.getClaims()` for session validation
- Redirects unauthenticated users to `/auth/login`

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
- Date handling: `date-fns` and `date-fns-tz` for timezone-aware operations
- Commits: `feat:`, `fix:`, `perf:`, `refactor:`, `style:`, `docs:`

## Environment Variables

Required (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `RESEND_API_KEY` - Email notifications
- `NEXT_PUBLIC_VAPI_PUBLIC_KEY` + `VAPI_WEBHOOK_SECRET` - Voice AI

## Deployment

- **Production**: https://qualia-erp.vercel.app (auto-deploy from master)
- **Pre-commit hooks**: ESLint, Prettier, TypeScript (via husky + lint-staged)
