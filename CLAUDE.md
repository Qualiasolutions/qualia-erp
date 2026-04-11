# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Qualia Suite — project management, CRM, client portal, and AI assistant platform built with Next.js 16+, Supabase, and AI.

**Design**: Clean, professional UI like Linear/Plane. No flashy effects. See `.planning/DESIGN.md` for full design spec.

## Trainee Resources

- **Trainee Onboarding Guide**: `docs/trainee-onboarding.md` — Step-by-step project workflow
- **Starter Templates**: `templates/` — Boilerplate for new projects
  - `ai-agent-starter/` — Next.js + Gemini + Supabase
  - `platform-starter/` — Server Actions + SWR pattern
  - `voice-starter/` — Cloudflare Workers + VAPI
  - `website-starter/` — React + Vite + Tailwind

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
- **Styling**: Tailwind CSS + shadcn/ui (Radix primitives) + framer-motion
- **State**: SWR (45s auto-refresh when tab visible, stops when hidden)
- **AI**: Google Gemini + OpenRouter via AI SDK (`@ai-sdk/google`, `@ai-sdk/openai`)
- **Email**: Resend
- **Observability**: Sentry (`@sentry/nextjs`), Vercel Analytics + Speed Insights
- **GitHub**: Octokit (`@octokit/rest`) for repo integration
- **UI extras**: @dnd-kit (drag-and-drop), @tanstack/react-virtual (virtualization), cmdk (command menu), sonner (toasts), vaul (drawers), next-themes (dark mode), react-day-picker (calendar)
- **Validation**: Zod
- **Dates**: date-fns + date-fns-tz
- **Testing**: Jest (unit), Playwright (E2E — devDependency)

## Architecture

### Server Actions Pattern

All mutations in `app/actions/*.ts` (49 domain modules). `app/actions.ts` is a re-export router for backward compatibility. Return `ActionResult`:

```typescript
type ActionResult = { success: boolean; error?: string; data?: unknown };
```

Key action files:

| File                          | Purpose                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| `shared.ts`                   | `ActionResult` type, permission helpers                          |
| `index.ts`                    | Re-exports + authorization helpers (`isUserAdmin`, `canDelete*`) |
| `inbox.ts`                    | Task CRUD with inbox filtering                                   |
| `phases.ts`                   | Project roadmap phases                                           |
| `daily-flow.ts`               | Dashboard data aggregation                                       |
| `projects.ts`                 | Project CRUD                                                     |
| `clients.ts`                  | Client/CRM CRUD                                                  |
| `meetings.ts`                 | Meeting management                                               |
| `auto-assign.ts`              | Task auto-creation engine (phase items → tasks)                  |
| `project-assignments.ts`      | Employee ↔ project assignment                                    |
| `project-integrations.ts`     | GitHub/Vercel integration links                                  |
| `github-planning-sync.ts`     | Sync .planning/ from GitHub repos                                |
| `client-portal.ts`            | Client-facing portal data                                        |
| `client-invitations.ts`       | Portal invitation flow                                           |
| `client-requests.ts`          | Client feature requests                                          |
| `knowledge.ts`                | Knowledge base / guides                                          |
| `research.ts`                 | Research entries + findings                                      |
| `work-sessions.ts`            | Clock-in/out time tracking                                       |
| `checkins.ts`                 | Daily check-in system                                            |
| `owner-updates.ts`            | Team announcements                                               |
| `financials.ts`               | Invoices + payment tracking                                      |
| `deployments.ts`              | Project deployment management                                    |
| `notifications.ts`            | In-app notification CRUD                                         |
| `notification-preferences.ts` | Per-user notification settings                                   |
| `phase-comments.ts`           | Comments on project phases                                       |
| `phase-reviews.ts`            | Phase review/approval flow                                       |
| `task-attachments.ts`         | File attachments on tasks                                        |
| `ai-conversations.ts`         | AI chat persistence                                              |
| `ai-context.ts`               | AI user context/memory                                           |
| `team-dashboard.ts`           | Team task overview                                               |
| `health.ts`                   | Health monitoring + insights                                     |
| `seo.ts`                      | SEO management                                                   |
| `pipeline.ts`                 | Sales/project pipeline                                           |
| `logos.ts`                    | Logo upload (Supabase Storage)                                   |
| `project-files.ts`            | Project file upload/download                                     |
| `learning.ts`                 | Mentorship/training features                                     |
| `payments.ts`                 | Payment tracking                                                 |
| `zoho.ts`                     | Zoho integration                                                 |

### Key Directories

```
app/
├── actions.ts              # Re-export router
├── actions/                # 49 domain-specific action modules
├── api/chat/               # AI chat endpoint (Gemini)
├── api/github/webhook/     # GitHub push webhook → phase sync + auto-assign cascade
├── api/cron/               # 8 cron jobs (reminders, attendance, morning email, etc.)
├── api/webhooks/vercel/    # Vercel deploy webhook
├── api/claude/             # Claude session logging (project-status, session-feed, session-log)
├── today-page.tsx          # Homepage dashboard
├── inbox/                  # Full inbox view
├── projects/               # Project list + detail + roadmap + files
├── clients/                # CRM pages
├── portal/                 # Client-facing portal (dashboard, billing, requests, settings)
├── admin/                  # Admin panel (assignments, attendance, migrations)
├── schedule/               # Team schedule / calendar
├── knowledge/              # Knowledge base / guides
├── research/               # Research entries
├── seo/                    # SEO management
├── status/                 # Status dashboard
├── agent/                  # AI agent page
├── team/                   # Team members
├── payments/               # Payment tracking
├── settings/               # User settings + integrations + notification preferences

lib/
├── validation.ts           # Zod schemas for all entities
├── swr.ts                  # SWR hooks (37 hooks) + cache invalidation (33 functions)
├── server-utils.ts         # normalizeFKResponse() for Supabase FK arrays
├── supabase/server.ts      # Server-side Supabase client (use for ALL mutations)
├── supabase/client.ts      # Browser Supabase client (read-only in components)
├── color-constants.ts      # Centralized theme colors
├── schedule-utils.ts       # Date/time filtering utilities
├── project-phases.ts       # Phase/milestone helpers
├── email.ts                # Resend email notifications
├── notifications.ts        # In-app notification helpers
├── rate-limit.ts           # In-memory rate limiting (Redis TODO)
├── planning-sync-core.ts   # Core logic for syncing .planning/ to DB
├── planning-parser.ts      # Parse .planning/ file structure
├── portal-utils.ts         # Client portal helpers
├── portal-styles.ts        # Portal-specific styling
├── auth-utils.ts           # Auth helpers
├── integrations/            # Integration orchestrator
├── hooks/                  # Custom React hooks
├── ai/                     # AI tools for chat/voice
│   ├── tools/read-tools.ts # Read-only AI tools (search, stats)
│   ├── tools/write-tools.ts# Mutation AI tools (create, update)
│   └── system-prompt.ts    # AI system prompt

components/
├── ui/                     # shadcn/ui primitives (39 components)
├── today-dashboard/        # Dashboard components (25 files)
├── project-wizard/         # Multi-step project creation
├── portal/                 # Client portal components
├── admin/                  # Admin panel components
├── ai-assistant/           # AI chat components
├── auth/                   # Auth components
├── clients/                # Client management components
├── health-dashboard/       # Health dashboard components
├── onboarding/             # Onboarding flow components
├── project-deployments/    # Deployment management components
├── project-files/          # File management components
├── settings/               # Settings page components
├── status/                 # Status dashboard components
├── team/                   # Team management components
├── tutorial/               # Tutorial/guide components

types/database.ts           # Auto-generated Supabase types
```

### Data Flow

1. **Server Components** → Direct Supabase queries via server actions
2. **Client Components** → SWR hooks (`useInboxTasks`, `useProjects`, etc.)
3. **Mutations** → Server action → Zod validation → DB → `revalidatePath()` → Invalidate SWR

### SWR Hooks (lib/swr.ts)

37 hooks total. Key ones:

```typescript
// Task hooks (45s auto-refresh when visible)
useInboxTasks();                     // Tasks with show_in_inbox=true
useProjectTasks(id);                 // All tasks for a project
useTodaysTasks();                    // Tasks due today/overdue
useTaskAttachments(taskId);          // File attachments

// Meeting hooks
useTodaysMeetings();                 // Meetings for today
useMeetings(initialData?);           // All meetings with optional SSR data

// Dashboard hooks
useDailyFlow();                      // Dashboard aggregated data
useTeamTaskDashboard(workspaceId);   // Team task overview
useOwnerUpdates(workspaceId);        // Team announcements

// Project hooks
useProjects();
useProjectStats(initialData?);
useProjectPhases(projectId);
useProjectHealth(projectId);
useProjectAssignments(projectId);
useProjectDeployments(projectId);
useProjectEnvironments(projectId);
useProvisioningStatus(projectId);

// Assignment hooks
useEmployeeAssignments(employeeId);
useAllAssignments();

// Portal hooks
usePortalProjectWithPhases(projectId);
usePortalDashboard(clientId);
useClientActionItems(clientId);

// Work session hooks
useActiveSession(workspaceId);
useTodaysSessions(workspaceId);
useSessionsAdmin(workspaceId, profileId, date);
usePlannedLogoutTime(workspaceId);
useTeamStatus(workspaceId);

// AI hooks
useConversations();
useConversationMessages(conversationId);
useAIUserContext(userId);

// Reference data (90s slower refresh)
useTeams();
useProfiles();
useScheduledTasks(initialData?);

// Notifications
useNotifications(workspaceId);
useUnreadNotificationCount(workspaceId);

// Utility
useCurrentWorkspaceId();
```

### Cache Invalidation

33 invalidation functions. After mutations, always call with `immediate: true`:

```typescript
// Core
invalidateInboxTasks(true);
invalidateProjectTasks(projectId, true);
invalidateDailyFlow(true);
invalidateMeetings(true);
invalidateTodaysSchedule(true);
invalidateNotifications(workspaceId, true);
invalidateProjectPhases(projectId);

// Projects
invalidateProjectStats();
invalidateProjectHealth(projectId);
invalidateProjectAssignments(projectId);
invalidateDeployments(projectId);
invalidateProvisioningStatus(projectId);

// Assignments
invalidateEmployeeAssignments(employeeId);
invalidateAllAssignments();

// Portal
invalidatePortalProjectWithPhases(projectId);
invalidatePortalDashboard(clientId);
invalidateClientActionItems(clientId);

// Sessions
invalidateActiveSession(workspaceId);
invalidateTodaysSessions(workspaceId);
invalidateTeamStatus(workspaceId);

// AI
invalidateConversations();
invalidateConversationMessages(conversationId);
invalidateAIUserContext(userId);

// Other
invalidateOwnerUpdates(workspaceId);
invalidateTeamDashboard(workspaceId);
invalidateCheckins();
invalidateTaskAttachments(taskId);
invalidateScheduledTasks();

// Nuclear option
invalidateAllCaches();
invalidateCache(key);
```

### Supabase FK Pattern

Supabase returns FKs as arrays. Use the helper or normalize manually:

```typescript
import { normalizeFKResponse } from '@/lib/server-utils';

// Normalize a single FK field (returns T | null)
const project = normalizeFKResponse(data.project);
const client = normalizeFKResponse(data.client);

// Manual: For inline cases
const assigned = Array.isArray(data.assigned_to) ? data.assigned_to[0] || null : data.assigned_to;
```

## Database

**Use Supabase MCP tools** — don't write raw SQL in code files.

### Tables (63 tables + 1 view)

**Core**:

| Table               | Purpose                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `tasks`             | Tasks with `show_in_inbox`, `item_type`, `due_date`, `source_phase_item_id` (auto-assign) |
| `issues`            | Legacy issues (being migrated to tasks)                                                   |
| `projects`          | Projects with `project_type`, `project_group`, `client_id`                                |
| `project_phases`    | Phase milestones for project roadmaps                                                     |
| `phase_items`       | Items within phases                                                                       |
| `phase_comments`    | Comments on phases                                                                        |
| `phase_reviews`     | Phase review/approval records                                                             |
| `phase_resources`   | Resources attached to phases                                                              |
| `phase_templates`   | Reusable phase templates                                                                  |
| `clients`           | CRM with `lead_status`, `last_contacted_at`                                               |
| `meetings`          | Calendar with `meeting_link`, `client_id`                                                 |
| `meeting_attendees` | Meeting participant join table                                                            |
| `profiles`          | Users with `role` (admin/manager/employee/client)                                         |
| `teams`             | Team definitions                                                                          |
| `team_members`      | Team membership join table                                                                |
| `workspaces`        | Multi-tenant isolation                                                                    |
| `workspace_members` | Workspace membership                                                                      |
| `workspace_notes`   | Per-workspace notes                                                                       |

**Project management**:

| Table                  | Purpose                                |
| ---------------------- | -------------------------------------- |
| `project_assignments`  | Employee ↔ project assignment tracking |
| `project_integrations` | GitHub/Vercel links per project        |
| `project_deployments`  | Deployment history                     |
| `project_environments` | Environment configs (staging/prod)     |
| `project_provisioning` | Auto-provisioning status               |
| `project_files`        | File attachments                       |
| `project_notes`        | Internal project notes                 |
| `task_attachments`     | File attachments on tasks              |
| `task_time_logs`       | Time tracking per task                 |
| `issue_assignees`      | Issue assignment join table            |
| `issue_skills`         | Skills tagged on issues                |
| `comments`             | Generic comments                       |

**Client portal**:

| Table                     | Purpose                       |
| ------------------------- | ----------------------------- |
| `client_projects`         | Portal project access mapping |
| `client_activities`       | Client-visible activity feed  |
| `client_contacts`         | Contact people per client     |
| `client_feature_requests` | Feature requests from clients |
| `client_invitations`      | Portal invitation tracking    |
| `client_invoices`         | Client invoice records        |
| `client_action_items`     | Action items for clients      |

**Financial**:

| Table                | Purpose                 |
| -------------------- | ----------------------- |
| `financial_invoices` | Invoice records         |
| `financial_payments` | Payment records         |
| `payments`           | Legacy payment tracking |
| `expenses`           | Expense tracking        |

**AI & knowledge**:

| Table               | Purpose                         |
| ------------------- | ------------------------------- |
| `ai_conversations`  | AI chat sessions                |
| `ai_messages`       | Messages within AI chats        |
| `ai_user_context`   | AI context per user             |
| `ai_user_memory`    | AI persistent memory per user   |
| `ai_reminders`      | AI-set reminders                |
| `documents`         | Project docs (pgvector for RAG) |
| `knowledge_guides`  | Knowledge base articles         |
| `research_entries`  | Research tracking               |
| `research_findings` | Findings per research entry     |

**Activity & notifications**:

| Table                      | Purpose                         |
| -------------------------- | ------------------------------- |
| `activities`               | Internal activity feed          |
| `activity_log`             | Client-visible activity log     |
| `notifications`            | In-app notifications            |
| `notification_preferences` | Per-user notification settings  |
| `owner_updates`            | Team announcements              |
| `owner_update_reads`       | Read tracking for announcements |
| `reminders`                | Scheduled reminders             |
| `messages`                 | Internal messaging              |

**Work tracking**:

| Table                    | Purpose                      |
| ------------------------ | ---------------------------- |
| `work_sessions`          | Clock-in/out sessions        |
| `daily_checkins`         | Daily check-in entries       |
| `time_entries`           | Time tracking entries        |
| `dashboard_notes`        | Dashboard sticky notes       |
| `lead_follow_ups`        | CRM follow-up reminders      |
| `blog_posts`             | Blog content                 |
| `trainee_daily_logs`     | Trainee daily progress       |
| `trainee_progress`       | Trainee overall progress     |
| `claude_sessions`        | Claude Code session logs     |
| `workspace_integrations` | Workspace-level integrations |

**Views**: `portal_project_mappings`

### Type Helpers

```typescript
import { Tables, Enums } from '@/types/database';

const project: Tables<'projects'> = ...;
const status: Enums<'project_status'> = 'Active';
```

### Enums

| Enum                           | Values                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project_type`                 | `web_design`, `ai_agent`, `voice_agent`, `seo`, `ads`, `ai_platform`, `app`                                                                                                     |
| `project_status`               | `Demos`, `Active`, `Launched`, `Delayed`, `Archived`, `Canceled`, `Done`                                                                                                        |
| `project_group`                | `salman_kuwait`, `tasos_kyriakides`, `finished`, `inactive`, `active`, `demos`, `other`                                                                                         |
| `task_status`                  | `Todo`, `In Progress`, `Done`, `Canceled`                                                                                                                                       |
| `task_priority`                | `No Priority`, `Urgent`, `High`, `Medium`, `Low`                                                                                                                                |
| `task_item_type`               | `task`, `issue`, `note`, `resource`                                                                                                                                             |
| `issue_status`                 | `Yet to Start`, `Todo`, `In Progress`, `Done`, `Canceled`                                                                                                                       |
| `issue_priority`               | `No Priority`, `Urgent`, `High`, `Medium`, `Low`                                                                                                                                |
| `lead_status`                  | `dropped`, `cold`, `hot`, `active_client`, `inactive_client`, `dead_lead`                                                                                                       |
| `user_role`                    | `admin`, `manager`, `employee`, `client`                                                                                                                                        |
| `deployment_platform`          | `vercel`, `squarespace`, `railway`, `meta`, `instagram`, `google_ads`, `tiktok`, `linkedin`, `none`                                                                             |
| `integration_provider`         | `github`, `vercel`, `vapi`                                                                                                                                                      |
| `invitation_status`            | `sent`, `resent`, `opened`, `accepted`, `expired`                                                                                                                               |
| `notification_delivery_method` | `email`, `in_app`, `both`                                                                                                                                                       |
| `provisioning_status`          | `not_started`, `pending`, `in_progress`, `completed`, `partial_failure`, `failed`                                                                                               |
| `activity_type`                | `project_created`, `project_updated`, `issue_created`, `issue_updated`, `issue_completed`, `issue_assigned`, `comment_added`, `team_created`, `member_added`, `meeting_created` |

## Routes

### Internal (admin/employee)

| Route                     | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `/`                       | Dashboard — tasks, meetings, daily flow, team status |
| `/inbox`                  | Full inbox view                                      |
| `/projects`               | Project list                                         |
| `/projects/[id]`          | Project detail — tasks, team, activity, integrations |
| `/projects/[id]/roadmap`  | Project roadmap — phases, milestones                 |
| `/projects/[id]/files`    | Project files                                        |
| `/clients`                | CRM list                                             |
| `/clients/[id]`           | Client detail — contacts, activities                 |
| `/schedule`               | Team schedule / calendar view                        |
| `/team`                   | Team members                                         |
| `/payments`               | Payment tracking                                     |
| `/knowledge`              | Knowledge base / guides                              |
| `/research`               | Research entries                                     |
| `/seo`                    | SEO management                                       |
| `/status`                 | Status dashboard                                     |
| `/agent`                  | AI agent page                                        |
| `/settings`               | User settings                                        |
| `/settings/integrations`  | Integration management                               |
| `/settings/notifications` | Notification preferences                             |
| `/video-player/[slug]`    | Video player                                         |

### Admin-only

| Route                | Description                    |
| -------------------- | ------------------------------ |
| `/admin`             | Admin panel                    |
| `/admin/assignments` | Employee ↔ project assignments |
| `/admin/attendance`  | Attendance management          |
| `/admin/migrate`     | Data migration tools           |

### Client portal

| Route                   | Description                  |
| ----------------------- | ---------------------------- |
| `/portal`               | Client dashboard             |
| `/portal/projects`      | Client project list          |
| `/portal/[id]`          | Project detail (client view) |
| `/portal/[id]/features` | Feature request board        |
| `/portal/[id]/files`    | Project files (client view)  |
| `/portal/[id]/updates`  | Project updates timeline     |
| `/portal/billing`       | Billing / invoices           |
| `/portal/requests`      | Feature requests             |
| `/portal/settings`      | Portal settings              |

### Auth

| Route                          | Description                 |
| ------------------------------ | --------------------------- |
| `/auth/login`                  | Login page                  |
| `/auth/signup`                 | Signup page                 |
| `/auth/reset-password`         | Password reset              |
| `/auth/reset-password/confirm` | Password reset confirmation |
| `/auth/error`                  | Auth error page             |

## Auth & Middleware

- `middleware.ts` — Protects all routes except `/auth/*` and `/api/*`
- Auth uses `supabase.auth.getClaims()` for session validation (JWT custom claims via `custom_access_token_hook`)
- Redirects unauthenticated users to `/auth/login`
- **Role-based routing**:
  - `client` users → redirected to `/portal` if accessing internal routes
  - `manager` users → restricted route access (projects, clients, schedule, status, knowledge, research, portal)
  - `admin` + `manager` → can access `/admin/*`
  - `employee` → all internal routes except `/admin/*`
- **API routes are NOT protected by middleware** — each API route must implement its own auth checks

## API Routes

| Route                                     | Purpose                                                |
| ----------------------------------------- | ------------------------------------------------------ |
| `app/api/chat/route.ts`                   | AI chat endpoint (Gemini via AI SDK)                   |
| `app/api/github/webhook/route.ts`         | GitHub push webhook — phase sync + auto-assign cascade |
| `app/api/webhooks/vercel/route.ts`        | Vercel deployment webhook                              |
| `app/api/embeddings/route.ts`             | Document embedding generation (RAG)                    |
| `app/api/tts/route.ts`                    | Text-to-speech                                         |
| `app/api/gsd/update-phase/route.ts`       | Phase update from GSD system                           |
| `app/api/health/route.ts`                 | Health check endpoint                                  |
| `app/api/claude/project-status/route.ts`  | Claude session — project status                        |
| `app/api/claude/session-feed/route.ts`    | Claude session — feed                                  |
| `app/api/claude/session-log/route.ts`     | Claude session — logging                               |
| `app/api/cron/reminders/route.ts`         | Scheduled reminder notifications                       |
| `app/api/cron/morning-email/route.ts`     | Daily morning email digest                             |
| `app/api/cron/weekly-digest/route.ts`     | Weekly summary digest                                  |
| `app/api/cron/attendance-report/route.ts` | Attendance report generation                           |
| `app/api/cron/blog-tasks/route.ts`        | Blog task automation                                   |
| `app/api/cron/research-tasks/route.ts`    | Research task automation                               |
| `app/api/cron/supabase-check/route.ts`    | Supabase health check                                  |
| `app/api/cron/uptime-check/route.ts`      | Uptime monitoring                                      |

## Styling

**Brand color**: `qualia-*` classes (teal #00A4AC, full scale 50-950 in tailwind.config.ts)

**Z-index scale** (from tailwind.config.ts):
`z-inline-edit: 35` · `z-dropdown: 40` · `z-sticky: 45` · `z-modal: 50` · `z-popover: 55` · `z-overlay: 60` · `z-assistant: 65` · `z-toast: 70` · `z-tooltip: 80` · `z-command: 90` · `z-max: 100`

**Elevation system**: Five tiers (`elevation-1` through `elevation-5`), depth shadows (`depth-1` through `depth-4`), glow variants.

**Custom animations**: float, shimmer, pulse-glow, modal-enter, stagger-in, tooltip-pop. Easing: `premium`, `ease-out-expo`, `ease-out-quart`, `ease-out-quint`.

Colors from `lib/color-constants.ts` — use `ISSUE_STATUS_COLORS`, `ISSUE_PRIORITY_COLORS`, etc.

Dark mode via `next-themes`. Full dual-mode: light (teal-tinted off-white #EDF0F0) and dark (teal-tinted deep #121819).

## Conventions

- Server actions return `ActionResult { success, error?, data? }`
- Zod schemas in `lib/validation.ts` — use `parseFormData()` or `validateData()`
- `'use client'` directive for interactive components
- `React.memo()` for list item components
- Date handling: `date-fns` and `date-fns-tz` for timezone-aware operations
- Commits: `feat:`, `fix:`, `perf:`, `refactor:`, `style:`, `docs:`
- Feature branches only — never commit directly to main/master
- Use `lib/supabase/server.ts` for all mutations, never `lib/supabase/client.ts`
- Enable RLS on every table. Derive user from `auth.uid()`, never trust client IDs
- Never expose `service_role` key client-side. Never hardcode keys. Never commit `.env`
- Full-width layouts — no hardcoded 1200px/1280px caps. Use fluid widths with sensible padding
- Design workflow: Build feature → `/critique` → `/polish` → `/harden` → ship

## Environment Variables

Required (see `.env.example`):

| Variable                                | Purpose                                 |
| --------------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`              | Supabase project URL                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | Supabase anon key                       |
| `SUPABASE_SERVICE_ROLE_KEY`             | Supabase service role key (server-only) |
| `NEXT_PUBLIC_APP_URL`                   | App base URL                            |
| `NEXT_PUBLIC_SITE_URL`                  | Site URL                                |
| `GOOGLE_GENERATIVE_AI_API_KEY`          | Gemini AI                               |
| `OPENROUTER_API_KEY`                    | OpenRouter AI                           |
| `RESEND_API_KEY`                        | Email notifications                     |
| `CRON_SECRET`                           | Cron job auth                           |
| `VERCEL_WEBHOOK_SECRET`                 | Vercel deploy webhook                   |
| `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` | Zoho integration (optional)             |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_*`   | Sentry observability                    |

## Deployment

- **Vercel Team**: `archivedqualia` (Archived) — NOT `qualiasolutionscy`
- **Production**: https://portal.qualiasolutions.net (deploy via `vercel --prod --scope archivedqualia`)
- **Supabase Ref**: `vbpzaiqovffpsroxaulv`
- **Pre-commit hooks**: ESLint + Prettier (via husky + lint-staged). Run `npx tsc --noEmit` manually for TypeScript checks.
- **Post-deploy checklist**: HTTP 200, auth flow, console errors, API latency <500ms (see `rules/deployment.md`)

## Technical Debt & Remediation

| Priority | Issue                                       | Status                                                            |
| -------- | ------------------------------------------- | ----------------------------------------------------------------- |
| P0       | IDOR in file downloads (`project-files.ts`) | DONE (canAccessProject/canDeleteProjectFile)                      |
| P0       | Missing auth in `deleteTask()`              | DONE (canModifyTask check)                                        |
| P0       | Webhook secret enforcement                  | DONE (conditional — rejects if secret is set and signature fails) |
| P1       | Split `actions.ts` into domain files        | DONE (49 files in app/actions/)                                   |
| P1       | Increase test coverage (1.68% → 50%)        | Pending                                                           |
| P2       | Fix N+1 query in `getProjectById`           | Pending                                                           |
| P2       | Add virtualization to TasksWidget           | DONE (@tanstack/react-virtual in tasks-widget + inbox-widget)     |
| P2       | Implement Redis rate limiting               | Pending                                                           |

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

## GitHub Integration & Auto-Assignment

The platform integrates with GitHub via webhooks and the auto-assignment engine:

1. **Webhook** (`app/api/github/webhook/route.ts`): Receives push events, matches repo to ERP project via `project_integrations`, syncs `.planning/` phase state into `project_phases`
2. **Auto-assign engine** (`app/actions/auto-assign.ts`): Converts phase items into real inbox tasks when someone is assigned to a project. Key functions:
   - `getActiveMilestone(projectId)` — finds current active milestone
   - `createTasksFromMilestone(projectId, milestoneNumber, assigneeId, trigger)` — batch-creates tasks from phase items (idempotent via `source_phase_item_id` unique constraint)
   - `handleReassignment(projectId, fromUserId, toUserId)` — transfers or creates tasks on reassignment
   - `markMilestoneTasksDone(projectId, milestoneNumber)` — bulk-closes auto-created tasks
3. **Assignment integration** (`app/actions/project-assignments.ts`): Hooks auto-assign into the assignment flow

## Planning Workflow

This project uses the Qualia `.planning/` workflow:

```
.planning/
├── PROJECT.md              # Project definition
├── REQUIREMENTS.md         # Functional + non-functional requirements
├── ROADMAP.md              # Phase breakdown with milestones
├── STATE.md                # Current phase/status tracker
├── REVIEW.md               # Latest review/audit results
├── DESIGN.md               # Design system spec (read before frontend changes)
├── phases/                 # Per-phase plans, summaries, verification
│   ├── 1-phase-name/
│   │   ├── PLAN.md
│   │   ├── SUMMARY.md
│   │   └── VERIFICATION.md
│   └── ...
```

**Guards**: Read `DESIGN.md` before frontend changes. Check `REVIEW.md` freshness before deploying.

## Design Context

### Users

Internal team (Fawzi, trainees, employees) + external clients (portal). Auth-gated with role-based access. Four roles: admin, manager, employee, client.

### Brand Personality

Clean, professional, premium utility. "Like Linear/Plane — no flashy effects." Design system v4.0: "Impeccable. Tinted. Fluid. Premium."

### Aesthetic Direction (Impeccable v4.0)

Warm teal (#00A4AC) as brand accent. All neutrals tinted toward brand hue (never pure gray/black/white). Light: teal-tinted off-white (#EDF0F0). Dark: teal-tinted deep (#121819). Geist Sans + Geist Mono (Vercel fonts). shadcn/ui + Radix primitives. Three surface layers for depth. Five-tier elevation system. Fluid type scale with `clamp()`. Fluid spacing with `clamp()`. Exponential deceleration easing only (ease-out-quart/expo) — no bounce/spring. Stagger animations in 30ms increments. Backdrop-blur glass headers.

### Design Principles

1. **Teal is the brand** — qualia-500 (#00A4AC) for all primary actions, focus rings, active states
2. **Tinted neutrals** — every gray picks up brand hue (HSL ~185-190). Never pure black/white
3. **Full dual-mode** — light (warm teal-tinted) and dark (warm teal-tinted deep), both fully specified
4. **Linear/Plane aesthetic** — data-dense, no decorative heroes, sidebar + content layout
5. **Layered surfaces** — three surface tiers + five elevation tiers create depth without heavy shadows
6. **Smooth deceleration** — ease-out-quart/expo only. No bounce, spring, or elastic easing
7. **Fluid everything** — type scale and spacing use `clamp()` for natural breathing across viewports
8. **Full-width layouts** — no hardcoded max-width caps. Fluid widths with sensible padding
9. **No anti-patterns** — no cards wrapping cards, no gray-on-color text, no uniform spacing monotony
