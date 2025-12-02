# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Qualia is a multi-tenant project management and issue tracking platform built with Next.js 15+ (App Router), Supabase, and the Vercel AI SDK. It features a Linear-inspired UI with sidebar navigation, command palette (Cmd+K), workspace switching, and a context-aware AI assistant with tool calling.

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint with Next.js + TypeScript rules

# Add shadcn/ui components
npx shadcn@latest add <component-name>

# Regenerate Supabase types after schema changes
npx supabase gen types typescript --project-id <project-id> > types/database.ts
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-or-publishable-key>
GOOGLE_GENERATIVE_AI_API_KEY=<google-api-key>  # For AI chat (Gemini 2.0)
```

## Key Dependencies

- **Next.js**: `latest` (uses App Router with `proxy.ts` for auth instead of middleware)
- **Supabase**: `@supabase/ssr` + `@supabase/supabase-js` for auth and database
- **AI**: Vercel AI SDK (`ai`) with Google provider (`@ai-sdk/google`)
- **UI**: shadcn/ui components, Radix primitives, Tailwind CSS, `cmdk` for command palette
- **Validation**: Zod schemas in `lib/validation.ts`

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

**Auth & Route Protection**: Uses Next.js 16 `proxy.ts` pattern (not middleware.ts). The proxy handles session refresh and redirects unauthenticated users to `/auth/login`.

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

**Action categories:**
- **Workspace**: `getCurrentWorkspaceId`, `getUserWorkspaces`, `setDefaultWorkspace`, `createWorkspace`, `addWorkspaceMember`
- **CRUD**: `createIssue`, `createProject`, `createTeam`, `createMeeting`, `createClient`, `updateIssue`, `updateProject`, `updateClient`, `deleteIssue`, `deleteProject`, `deleteMeeting`, `createComment`
- **Milestones**: `createMilestone`, `updateMilestone`, `deleteMilestone`, `getMilestones`
- **Fetch by ID**: `getIssueById`, `getProjectById`, `getTeamById`, `getClientById` - Return hydrated entities with relations
- **List queries**: `getTeams`, `getProjects`, `getProfiles`, `getMeetings`, `getClients` - Accept optional `workspaceId`
- **Junction tables**: `addIssueAssignee`, `removeIssueAssignee`, `addMeetingAttendee`, `removeMeetingAttendee`
- **Activity**: `getRecentActivities` - Fetches activity feed with actor/project/issue/team relations

**Supabase FK normalization**: Foreign key joins may return arrays; normalize with:
```tsx
assignee: Array.isArray(issue.assignee) ? issue.assignee[0] || null : issue.assignee
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
- `milestones` - Target dates, status (not_started/in_progress/completed/delayed), progress (0-100)
- `milestone_issues` - Links issues to milestones
- `issues` - Status, priority, parent/child hierarchy via `parent_id`
- `issue_assignees` - Many-to-many assignees
- `comments` - Issue comments

**Calendar & Activity:**
- `meetings` - Start/end times, linked to projects/clients
- `meeting_attendees` - RSVP status (pending/accepted/declined/tentative)
- `activities` - Feed with type enum and metadata JSON

**Knowledge Base:**
- `documents` - Vector embeddings (pgvector, 1536 dimensions) for RAG

**RBAC Functions:**
- `is_admin()`, `is_system_admin()`, `is_team_member(team_uuid)`, `is_workspace_admin(ws_id)`, `is_workspace_member(ws_id)`
- Admins: Full access; Employees: Access scoped to owned/assigned/team items
- See `20240104000000_add_role_based_access_control.sql` for policies

### Data Fetching Pattern

Pages use the async Server Component pattern with Suspense:
```tsx
// Page component (e.g., app/issues/[id]/page.tsx)
<Suspense fallback={<Skeleton />}>
  <DetailClient />  // Client component that fetches via server actions
</Suspense>
```

Detail pages (`/issues/[id]`, `/projects/[id]`, `/teams/[id]`) use a client component pattern that:
1. Extracts `id` from `useParams()`
2. Calls server action (e.g., `getIssueById`) in `useEffect`
3. Manages local loading/error state

### Provider Hierarchy

Root layout wraps the app in nested providers (`app/layout.tsx`):
```
ThemeProvider → WorkspaceProvider → SidebarProvider
```

### AI Integration

- Chat API: `app/api/chat/route.ts` using Vercel AI SDK with Google Gemini (`gemini-2.0-flash`)
- **Tool calling**: AI has tools for `getDashboardStats`, `searchIssues`, `searchProjects`, `getTeams`, `getRecentActivity`
- **Context-aware**: System prompt includes current user info (name, email, role)
- Uses `convertToModelMessages()` to transform `UIMessage[]` format, `stepCountIs(5)` limits tool call depth
- Chat component: `components/chat.tsx` - Client component using `useChat` hook
- Documents table supports RAG with pgvector embeddings (not yet implemented)

### Routing Structure

- `/` - Dashboard with stats and activity feed
- `/issues` - Issue list with filters
- `/issues/[id]` - Issue detail with comments and assignees
- `/projects` - Project grid with group tabs (Salman, Tasos, Active, Demos, Inactive)
- `/projects/[id]` - Project detail with issues list and milestone timeline
- `/clients` - Client/CRM list with lead status pipeline
- `/clients/[id]` - Client detail with contacts and activity log
- `/teams` - Team management
- `/teams/[id]` - Team detail with members and projects
- `/schedule` - Calendar view with meetings (list/calendar toggle)
- `/settings` - User settings
- `/auth/*` - Authentication flows
- `/api/chat` - AI chat streaming endpoint

## Styling

- Light/dark theme support via `next-themes` (dark default), toggle in header
- Custom dark palette: backgrounds #141414, #1C1C1C; borders #2C2C2C
- Brand color: `qualia` (#00A4AC teal) - use `bg-qualia-600`, `text-qualia-400`, etc.
- Tailwind CSS with tailwindcss-animate plugin
- Inter font family
