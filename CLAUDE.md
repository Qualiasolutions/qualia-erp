# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Qualia Internal Suite - Project management platform built with Next.js 16+, Supabase, and AI.

**Design**: Clean, professional UI like Linear/Plane. No flashy effects.

## Trainee Resources

- **Trainee Onboarding Guide**: `docs/trainee-onboarding.md` - Step-by-step project workflow
- **Starter Templates**: `templates/` - Boilerplate for new projects
  - `ai-agent-starter/` - Next.js + Gemini + Supabase
  - `platform-starter/` - Server Actions + SWR pattern
  - `voice-starter/` - Cloudflare Workers + VAPI
  - `website-starter/` - React + Vite + Tailwind

Each template includes a `PROGRESS.md` for tracking tasks through phases.

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
- **State**: SWR (45s auto-refresh when tab visible, stops when hidden)
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
- `app/actions/index.ts` - Re-exports + authorization helpers (`isUserAdmin`, `canDelete*`)
- `app/actions/shared.ts` - `ActionResult` type, permission helpers
- `app/actions/inbox.ts` - Task CRUD with inbox filtering
- `app/actions/phases.ts` - Project roadmap phases (`getProjectPhases`, etc.)
- `app/actions/daily-flow.ts` - Dashboard data aggregation
- `app/actions/timeline-dashboard.ts` - Timeline view data
- `app/actions/project-files.ts` - Project file upload/download
- `app/actions/logos.ts` - Logo upload for projects/clients (Supabase Storage)
- `app/actions/learning.ts` - Mentorship/training features
- `app/actions/payments.ts` - Payment tracking
- `app/actions/health.ts` - Health monitoring + insights

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
├── server-utils.ts         # normalizeFKResponse() for Supabase FK arrays
├── supabase/server.ts      # Server-side Supabase client
├── supabase/client.ts      # Browser Supabase client
├── color-constants.ts      # Centralized theme colors
├── schedule-utils.ts       # Date/time filtering utilities
├── project-phases.ts       # Phase/milestone helpers
├── email.ts                # Resend email notifications
├── rate-limit.ts           # In-memory rate limiting (Redis TODO)
├── ai/                     # AI tools for chat/voice
│   ├── tools/read-tools.ts # Read-only AI tools (search, stats)
│   ├── tools/write-tools.ts# Mutation AI tools (create, update)
│   └── system-prompt.ts    # AI system prompt

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
// Task hooks (45s auto-refresh when visible)
useInboxTasks();           // Tasks with show_in_inbox=true
useProjectTasks(id);       // All tasks for a project
useTodaysTasks();          // Tasks due today/overdue

// Meeting hooks
useTodaysMeetings();       // Meetings for today
useMeetings(initialData?); // All meetings with optional SSR data

// Dashboard hooks
useDailyFlow();            // Dashboard aggregated data
useTimelineDashboard();    // Timeline with assignments

// Reference data (90s slower refresh)
useTeams();
useProjects();
useProfiles();

// Notifications
useNotifications(workspaceId);
useUnreadNotificationCount(workspaceId);
useProjectPhases(projectId);
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
invalidateNotifications(workspaceId, true);
invalidateProjectPhases(projectId);
```

### Supabase FK Pattern

Supabase returns FKs as arrays. Use the helper or normalize manually:

```typescript
import { normalizeFKResponse } from '@/lib/server-utils';

// Preferred: Use the helper
const normalized = normalizeFKResponse(data, ['project', 'client', 'assigned_to']);

// Manual: For simple cases
return {
  ...data,
  project: Array.isArray(data.project) ? data.project[0] || null : data.project,
};
```

## Database

**Use Supabase MCP tools** - don't write raw SQL in code files.

### Key Tables

| Table             | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `tasks`           | Tasks with `show_in_inbox`, `item_type`, `due_date`        |
| `issues`          | Legacy issues (being migrated to tasks)                    |
| `projects`        | Projects with `project_type`, `project_group`, `client_id` |
| `project_phases`  | Phase milestones for project roadmaps                      |
| `phase_items`     | Items within phases                                        |
| `clients`         | CRM with `lead_status`, `last_contacted_at`                |
| `meetings`        | Calendar with `meeting_link`, `client_id`, attendees       |
| `profiles`        | Users with `role` (admin/employee)                         |
| `workspaces`      | Multi-tenant isolation                                     |
| `notifications`   | In-app notifications                                       |
| `activities`      | Activity feed                                              |
| `documents`       | Project file storage (pgvector for RAG)                    |
| `project_health`  | Health metrics snapshots                                   |
| `health_insights` | AI-generated health insights                               |

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
- `project_group`: `salman_kuwait`, `tasos_kyriakides`, `finished`, `inactive`, `active`, `demos`, `other`
- `task_status`: `Todo`, `In Progress`, `Done`, `Canceled`
- `task_priority`: `No Priority`, `Urgent`, `High`, `Medium`, `Low`
- `lead_status`: `dropped`, `cold`, `hot`, `active_client`, `inactive_client`, `dead_lead`
- `user_role`: `admin`, `employee`
- `deployment_platform`: `vercel`, `squarespace`, `railway`, `meta`, `instagram`, `google_ads`, `tiktok`, `linkedin`, `none`

Use exported constants for type safety: `TASK_STATUSES`, `PROJECT_TYPES`, `LEAD_STATUSES`, `PROJECT_STATUSES`, `PROJECT_GROUPS`, `DEPLOYMENT_PLATFORMS`

## Routes

| Route                    | Page                | Description                                |
| ------------------------ | ------------------- | ------------------------------------------ |
| `/`                      | `today-page.tsx`    | Dashboard with tasks, meetings, daily flow |
| `/projects`              | List all projects   |                                            |
| `/projects/[id]`         | Project detail      | Tasks, team, activity                      |
| `/projects/[id]/roadmap` | Project roadmap     | Phases, milestones                         |
| `/clients`               | CRM list            |                                            |
| `/clients/[id]`          | Client detail       | Contacts, activities                       |
| `/schedule`              | Team schedule       | Calendar view                              |
| `/team`                  | Team members        |                                            |
| `/payments`              | Payment tracking    |                                            |
| `/documents`             | Document management |                                            |
| `/settings`              | User settings       |                                            |

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

## Technical Debt & Remediation

**Active Plan**: `~/.claude/plans/encapsulated-wibbling-fox.md`

| Priority | Issue                                              | Status                          |
| -------- | -------------------------------------------------- | ------------------------------- |
| P0       | IDOR in file downloads (`project-files.ts`)        | Pending                         |
| P0       | Missing auth in `deleteTask()`                     | Pending                         |
| P0       | Webhook secret enforcement in prod                 | Pending                         |
| P1       | Split `actions.ts` (2,940 lines) into domain files | DONE (44 files in app/actions/) |
| P1       | Increase test coverage (1.68% → 50%)               | Pending                         |
| P2       | Fix N+1 query in `getProjectById`                  | Pending                         |
| P2       | Add virtualization to TasksWidget                  | Pending                         |
| P2       | Implement Redis rate limiting                      | Pending                         |

## API Routes

- `app/api/chat/route.ts` - AI chat endpoint (Gemini via AI SDK)
- `app/api/vapi/webhook/route.ts` - Voice AI webhooks (11+ tools)
- `app/api/embeddings/route.ts` - Document embedding generation (RAG)
- `app/api/cron/reminders/route.ts` - Scheduled reminder notifications
- `app/api/health/route.ts` - Health check endpoint

## File Storage

Logos and project files use Supabase Storage bucket `project-files`:

```typescript
// Upload pattern (see app/actions/logos.ts)
const storagePath = `logos/projects/${projectId}/logo.${ext}`;
await supabase.storage.from('project-files').upload(storagePath, file, { upsert: true });

// Get public URL with cache-busting
const {
  data: { publicUrl },
} = supabase.storage.from('project-files').getPublicUrl(storagePath);
const logoUrl = `${publicUrl}?t=${Date.now()}`;
```

## Design Context

### Users

Internal — Fawzi (founder) + trainees/employees. Auth-gated project management, CRM, payments, AI assistant, mentorship. Job: manage all Qualia operations in one place.

### Brand Personality

Clean, professional, premium utility. "Like Linear/Plane — no flashy effects." Design system v4.0: "Impeccable. Tinted. Fluid. Premium."

### Aesthetic Direction (Impeccable v4.0)

Warm teal (#00A4AC) as brand accent. All neutrals tinted toward brand hue (never pure gray/black/white). Light: teal-tinted off-white (#EDF0F0). Dark: teal-tinted deep (#121819). Geist Sans + Geist Mono (Vercel fonts). shadcn/ui + Radix primitives. Three surface layers for depth. Five-tier elevation system. Fluid type scale with `clamp()`. Fluid spacing with `clamp()`. Exponential deceleration easing only (ease-out-quart/expo) — no bounce/spring. Stagger animations in 30ms increments. Backdrop-blur glass headers.

### Design Principles (Impeccable)

1. **Teal is the brand** — qualia-500 (#00A4AC) for all primary actions, focus rings, active states
2. **Tinted neutrals** — every gray picks up brand hue (HSL ~185-190). Never pure black/white
3. **Full dual-mode** — light (warm teal-tinted) and dark (warm teal-tinted deep), both fully specified
4. **Linear/Plane aesthetic** — data-dense, no decorative heroes, sidebar + content layout
5. **Layered surfaces** — three surface tiers + five elevation tiers create depth without heavy shadows
6. **Smooth deceleration** — ease-out-quart/expo only. No bounce, spring, or elastic easing
7. **Fluid everything** — type scale and spacing use `clamp()` for natural breathing across viewports
8. **No anti-patterns** — no cards wrapping cards, no gray-on-color text, no uniform spacing monotony
