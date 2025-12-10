# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Qualia is a multi-tenant project management and issue tracking platform built with Next.js 15+ (App Router), Supabase, and the Vercel AI SDK. It features a Linear-inspired UI with sidebar navigation, command palette (Cmd+K), workspace switching, real-time collaboration hub, and a context-aware AI assistant with tool calling.

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint with Next.js + TypeScript rules
npx tsc --noEmit # TypeScript type checking

# Testing
npm test                        # Run all tests
npm run test:watch              # Watch mode for development
npm run test:coverage           # Generate coverage report
npm test -- path/to/file.test   # Run single test file

# Add shadcn/ui components
npx shadcn@latest add <component-name>

# Regenerate Supabase types after schema changes
npx supabase gen types typescript --project-id <project-id> > types/database.ts
```

## Testing

Jest with React Testing Library. Test files in `__tests__/` directory.

**Test utilities** (`__tests__/utils/render.tsx`):

- `render()` - Custom render with providers (ThemeProvider)
- Factory functions: `createMockUser()`, `createMockProject()`, `createMockIssue()`, `createMockTeam()`, `createMockClient()`, `createMockMeeting()`, `createMockPhase()`, `createMockPhaseItem()`

**Coverage thresholds**: 50% minimum for branches, functions, lines, statements.

**Pre-commit hooks**: Husky runs lint-staged on commit (ESLint fix + Prettier for `.ts/.tsx`, Prettier for `.json/.md/.css`).

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to master/main:

1. **Lint** - ESLint
2. **Type Check** - `tsc --noEmit`
3. **Test** - Jest with coverage (uploads to Codecov)
4. **Build** - Production build (runs after other jobs pass)

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-or-publishable-key>
GOOGLE_GENERATIVE_AI_API_KEY=<google-api-key>  # For AI chat (Gemini 2.0)

# VAPI Voice Assistant (optional)
NEXT_PUBLIC_VAPI_PUBLIC_KEY=<vapi-public-key>
NEXT_PUBLIC_VAPI_ASSISTANT_ID=<vapi-assistant-id>  # Optional, uses inline config if not set
NEXT_PUBLIC_APP_URL=<app-url>  # For VAPI webhook (e.g., https://qualia.app)
```

## Key Dependencies

- **Next.js**: `latest` (uses App Router with `proxy.ts` for auth instead of middleware)
- **Supabase**: `@supabase/ssr` + `@supabase/supabase-js` for auth, database, and Realtime
- **AI**: Vercel AI SDK (`ai`) with Google provider (`@ai-sdk/google`)
- **UI**: shadcn/ui components, Radix primitives, Tailwind CSS, `cmdk` for command palette
- **DnD**: `@dnd-kit/core` + `@dnd-kit/sortable` for Board drag-and-drop
- **Validation**: Zod schemas in `lib/validation.ts` (Zod available via AI SDK transitive deps)
- **Constants**: `lib/constants.ts` - Date formats, UI dimensions, status/priority colors, storage keys
- **Utilities**: `lib/utils.ts` - `cn()` (Tailwind merge), date formatting (`formatDate`, `formatDateTime`, `formatRelativeTime`), `truncate`, `getInitials`, `pluralize`
- **Timezone**: Uses `date-fns-tz` with `toZonedTime()` for Cyprus (Europe/Nicosia) and Jordan (Asia/Amman) timezone support in schedule views
- **SWR Hooks**: `lib/swr.ts` - Cached data fetching hooks (`useTeams`, `useProjects`, `useProfiles`, `useCurrentWorkspaceId`) with `invalidateCache()` and `invalidateAllCaches()` helpers
- **Rate Limiting**: `lib/rate-limit.ts` - In-memory rate limiter with `chatRateLimiter` (20/min) and `apiRateLimiter` (100/min)
- **VAPI**: `@vapi-ai/web` for voice assistant with ElevenLabs TTS and Deepgram transcription

## Architecture

### Multi-Tenant Workspaces

The app supports multiple workspaces (tenants). Core workspace tables:

- **workspaces** - Organizations/tenants with name, slug, logo
- **workspace_members** - Junction table linking profiles to workspaces with roles (owner/admin/member) and `is_default` flag

`WorkspaceProvider` (`components/workspace-provider.tsx`) provides React context for:

- `currentWorkspace` - The active workspace
- `setCurrentWorkspace()` - Switch workspaces (persists to DB)
- All data-fetching actions accept optional `workspaceId` parameter, falling back to user's default

### Supabase Integration

Two Supabase clients for different contexts:

- `lib/supabase/server.ts` - Server-side client using `@supabase/ssr` with cookie handling. **Create a new client per request** (important for Fluid compute).
- `lib/supabase/client.ts` - Browser client for client components.

**Auth & Route Protection**: Uses Next.js middleware (`middleware.ts`) for session refresh and route protection. The middleware redirects unauthenticated users to `/auth/login` and authenticated users away from `/auth/login`.

### Type System (`types/database.ts`)

Supabase-generated types with added helper utilities:

- **Generic helpers**: `Tables<"table_name">`, `TablesInsert<>`, `TablesUpdate<>`, `Enums<>`
- **Entity aliases**: `Profile`, `Project`, `Issue`, `Client`, `Meeting`, `Milestone`, `Team`, `Workspace`, etc.
- **Enum types**: `IssueStatus`, `IssuePriority`, `ProjectGroup`, `ProjectType`, `ProjectStatus`, `LeadStatus`, `UserRole`
- **Constant arrays**: `ISSUE_STATUSES`, `ISSUE_PRIORITIES`, `PROJECT_GROUPS`, `PROJECT_TYPES`, etc.

### Validation (`lib/validation.ts`)

Zod schemas for all entity mutations with consistent patterns:

- **Create schemas**: `createIssueSchema`, `createProjectSchema`, `createTeamSchema`, `createClientSchema`, `createMeetingSchema`, `createMilestoneSchema`, `createCommentSchema`, `createWorkspaceSchema`
- **Update schemas**: `updateIssueSchema`, `updateProjectSchema`, `updateClientSchema`, `updateMilestoneSchema`
- **Helper functions**:
  - `parseFormData(schema, formData)` - Parses FormData, converts empty strings to null
  - `validateData(schema, data)` - Validates plain objects
- **Type exports**: `CreateIssueInput`, `UpdateProjectInput`, etc. (inferred from schemas)

### Server Actions (`app/actions.ts`)

All data mutations are server actions that:

- Accept validated input (via Zod schemas)
- Return `ActionResult` type: `{ success: boolean; error?: string; data?: unknown }`
- Call `revalidatePath()` to refresh relevant pages
- Log activities via `createActivity()` helper

**Action organization:**

- `app/actions.ts` - Main file with all server actions
- `app/actions/index.ts` - Re-exports for backward compatibility
- `app/actions/shared.ts` - Shared types and authorization helpers

**Authorization helpers** (`app/actions/shared.ts`):

- `isUserAdmin(userId)` - Check if user has admin role
- `canDeleteIssue(userId, issueId)` - Creator or admin check
- `canDeleteProject(userId, projectId)` - Lead or admin check
- `canDeleteMeeting(userId, meetingId)` - Creator or admin check
- `canDeleteClient(userId, clientId)` - Admin or workspace admin check
- `canDeletePhase(userId, phaseId)` - Project lead or admin check
- `canDeletePhaseItem(userId, itemId)` - Project lead or admin check
- `normalizeFKResponse<T>(response)` - Helper to normalize Supabase FK arrays

**Action categories:**

- **Workspace**: `getCurrentWorkspaceId`, `getUserWorkspaces`, `setDefaultWorkspace`, `createWorkspace`, `addWorkspaceMember`
- **CRUD**: `createIssue`, `createProject`, `createTeam`, `createMeeting`, `createClient`, `updateIssue`, `updateProject`, `updateClient`, `deleteIssue`, `deleteProject`, `deleteMeeting`, `createComment`
- **Project Phases**: `createPhase`, `updatePhase`, `deletePhase`, `getProjectPhases`, `updatePhaseItem`, `initializeProjectRoadmap`
- **Fetch by ID**: `getIssueById`, `getProjectById`, `getTeamById`, `getClientById` - Return hydrated entities with relations
- **List queries**: `getTeams`, `getProjects`, `getProfiles`, `getMeetings`, `getClients` - Accept optional `workspaceId`
- **Junction tables**: `addIssueAssignee`, `removeIssueAssignee`, `addMeetingAttendee`, `removeMeetingAttendee`
- **Activity**: `getRecentActivities` - Fetches activity feed with actor/project/issue/team relations

**Supabase FK normalization**: Foreign key joins may return arrays; use `normalizeFKResponse()` helper or manually:

```tsx
assignee: Array.isArray(issue.assignee) ? issue.assignee[0] || null : issue.assignee;
```

### Database Schema & RLS

Migrations in `supabase/migrations/`. Core tables:

**User & Workspace:**

- `profiles` - Extends auth.users (trigger on signup), has `role` (admin/employee)
- `workspaces` - Multi-tenant organizations with slug
- `workspace_members` - Junction with roles (owner/admin/member) and `is_default` flag

**CRM:**

- `clients` - Lead tracking with `lead_status` enum (dropped/cold/hot/active_client/inactive_client)
- `client_contacts` - Multiple contacts per client
- `client_activities` - Activity log (calls, emails, meetings, notes)

**Project Management:**

- `teams` - Unique keys (e.g., "ENG"), scoped to workspace
- `team_members` - Junction with roles
- `projects` - `project_group` for organization, `project_type` (web_design/ai_agent/seo/ads), `status`
- `project_phases` - Roadmap phases with status (not_started/in_progress/completed/skipped), template_key for pre-defined phases
- `phase_items` - Checklist items within phases, with completion tracking and optional issue links
- `issues` - Status, priority, parent/child hierarchy via `parent_id`
- `issue_assignees` - Many-to-many assignees
- `comments` - Issue comments

**Phase Templates** (`lib/phase-templates.ts`):

Pre-defined roadmap templates for each project type with phases and checklist items:

- **AI Agent**: Research & Planning → Describe → Generate & Iterate → Integration → Deploy → Document & Share
- **Website**: Discovery → Design → Vibe Code → Polish → Deploy → Handoff
- **SEO**: Site Audit → Strategy → Technical Fixes → Content Optimization → Off-Page SEO → Report & Monitor
- **Ads**: Research & Strategy → Account Setup → Creative Development → Campaign Launch → Optimization → Reporting

Use `initializeProjectRoadmap(projectId, projectType)` to populate phases from templates.

**Calendar & Activity:**

- `meetings` - Start/end times, linked to projects/clients
- `meeting_attendees` - RSVP status (pending/accepted/declined/tentative)
- `activities` - Feed with type enum and metadata JSON

**Knowledge Base:**

- `documents` - Vector embeddings (pgvector, 1536 dimensions) for RAG

**Database Functions:**

- **RBAC**: `is_admin()`, `is_system_admin()`, `is_team_member(team_uuid)`, `is_workspace_admin(ws_id)`, `is_workspace_member(ws_id)`
- **Stats**: `get_project_stats(workspace_id)` - Returns project stats with milestone progress, issue counts
- **Phase Progress**: `calculate_phase_progress(phase_id)`, `calculate_roadmap_progress(project_id)` - Return 0-100 percentage
- **Vector Search**: `match_documents(query_embedding, match_threshold, match_count, filter_workspace_id)` - Cosine similarity search for RAG knowledge base with IVFFlat index
- Admins: Full access; Employees: Access scoped to owned/assigned/team items
- See `20240104000000_add_role_based_access_control.sql` for RLS policies

### Data Fetching Pattern

Detail pages (`/issues/[id]`, `/projects/[id]`, `/teams/[id]`, `/clients/[id]`) use a client component pattern:

1. Extract `id` from `useParams()`
2. Call server action (e.g., `getIssueById`) in `useEffect`
3. Manage local loading/error state

Modal components fetch dropdown data on-demand when opened via `useEffect`.

### Error Handling

- `app/global-error.tsx` - Root layout error boundary (full-page fallback with inline styles)
- `components/error-boundary.tsx` - Reusable components:
  - `ErrorBoundary` - Class component wrapper with retry
  - `InlineError` - Inline error message with optional retry
  - `PageError` - Full-page error display

### Provider Hierarchy (`app/layout.tsx`)

```
ThemeProvider → WorkspaceProvider → SidebarProvider
```

### AI Integration

- **Chat API**: `app/api/chat/route.ts` - Vercel AI SDK with Google Gemini (`gemini-2.0-flash`)
- **Tools**: `getDashboardStats`, `searchIssues`, `searchProjects`, `getTeams`, `getRecentActivity`
- **Context**: System prompt includes current user info (name, email, role)
- **Chat UI**: `components/chat.tsx` - Uses `useChat` hook, `convertToModelMessages()` for message format
- **RAG**: Documents table with pgvector embeddings (not yet implemented)

### Voice Assistant (VAPI)

Qualia voice assistant with bilingual support (Jordanian Arabic + English):

- **Components**: `components/qualia-voice.tsx` (full-screen modal), `components/qualia-voice-inline.tsx` (compact inline)
- **Webhook**: `app/api/vapi/webhook/route.ts` - Handles tool execution for voice commands
- **Voice**: ElevenLabs multilingual v2 with custom Qualia voice (`4wf10lgibMnboGJGCLrP`)
- **Transcription**: Deepgram Nova-2 with multi-language support and Arabic/English keyword boosting
- **Model**: GPT-4o for voice conversation with comprehensive Jordanian Arabic system prompt

**Voice Tools (11 total):**

| Tool                    | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `get_projects`          | Retrieve projects with status/type filtering             |
| `get_issues`            | Get tasks with status/priority filtering                 |
| `create_issue`          | Create new tasks                                         |
| `update_issue`          | Update task status/priority/assignee                     |
| `get_team_members`      | Team information                                         |
| `get_schedule`          | Meetings and calendar (today/tomorrow/this week)         |
| `create_meeting`        | Schedule new meetings with natural language time parsing |
| `search_knowledge_base` | Company documents and built-in knowledge                 |
| `get_client_info`       | CRM/lead information                                     |
| `send_notification`     | Send messages to team members (logged as activities)     |
| `web_search`            | DuckDuckGo instant answers for external info             |

**Personalized Context:**

- **Fawzi** (founder): Technical assistant mode - direct, efficient, deadline-focused
- **Moayad** (co-founder): Learning-friendly explanations - simplified technical concepts, encouragement

**Built-in Knowledge Base:**
The webhook includes a comprehensive knowledge base with 10 categories: company info, team, services, AI agents, development process, pricing, tech stack, contact info, industries served, and value propositions.

**Voice Configuration:**

```typescript
voice: {
  provider: '11labs',
  voiceId: '4wf10lgibMnboGJGCLrP',
  model: 'eleven_multilingual_v2',
  stability: 0.6,
  similarityBoost: 0.8,
  speed: 0.9,
}
transcriber: {
  provider: 'deepgram',
  model: 'nova-2',
  language: 'multi',
  keywords: ['Qualia:5', 'Fawzi:5', 'Moayad:5', 'كواليا:5', 'فوزي:5', 'مؤيد:5', ...]
}
```

### Realtime Features

Custom hooks for Supabase Realtime:

- **`usePresence`** (`hooks/use-presence.tsx`) - Online presence tracking with channel subscriptions, status updates (online/away/busy)

### Board (`/board`)

Kanban-style task board (`components/board/`) with drag-and-drop:

- **BoardContent** - Main container with DnD context (@dnd-kit/core)
- **BoardColumn** - Status columns (Backlog → To Do → In Progress → Done)
- **BoardCard** - Draggable task cards with priority badges
- **OnlineUsers** - Real-time presence indicators via `usePresence` hook
- **CreateTaskModal** / **TaskDetailModal** - Task CRUD modals

Uses `getBoardTasks()` action for workspace-scoped task fetching with Supabase Realtime subscriptions for live updates.

### Routes

| Route                         | Description                                                           |
| ----------------------------- | --------------------------------------------------------------------- |
| `/`                           | Dashboard with stats and activity feed                                |
| `/board`                      | Kanban board with drag-and-drop, real-time presence                   |
| `/issues`, `/issues/[id]`     | Issue list and detail with comments/assignees                         |
| `/projects`, `/projects/[id]` | Project grid (group tabs) and detail with roadmap                     |
| `/clients`, `/clients/[id]`   | CRM list (lead pipeline) and detail with contacts                     |
| `/teams`, `/teams/[id]`       | Team management and detail with members                               |
| `/schedule`                   | Schedule views (list/week/month) with timezone toggle (Cyprus/Jordan) |
| `/settings`                   | User settings                                                         |
| `/auth/*`                     | Authentication flows                                                  |
| `/api/chat`                   | AI chat streaming endpoint                                            |
| `/api/vapi/webhook`           | VAPI voice assistant tool execution webhook                           |

## Styling

- **Theme**: Light/dark via `next-themes` (dark default), toggle in header
- **Dark palette**: Backgrounds #141414, #1C1C1C; borders #2C2C2C
- **Brand color**: `qualia` (#00A4AC teal) - `bg-qualia-600`, `text-qualia-400`, etc.
- **Stack**: Tailwind CSS + tailwindcss-animate, Inter font
- **Path alias**: `@/*` maps to project root (see `tsconfig.json`)
