# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Qualia is a multi-tenant project management and issue tracking platform built with Next.js 15 (App Router), Supabase, and the Vercel AI SDK. It features a Linear-inspired UI with sidebar navigation, command palette (Cmd+K), workspace switching, and a context-aware AI assistant with tool calling.

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint with Next.js + TypeScript rules

# Add shadcn/ui components
npx shadcn@latest add <component-name>
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-or-publishable-key>
GOOGLE_GENERATIVE_AI_API_KEY=<google-api-key>  # For AI chat (Gemini 2.0)
```

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

### Server Actions Pattern

`app/actions.ts` contains all server actions for data mutations:
- **Workspace**: `getCurrentWorkspaceId`, `getUserWorkspaces`, `setDefaultWorkspace`, `createWorkspace`, `addWorkspaceMember`
- **CRUD operations**: `createIssue`, `createProject`, `createTeam`, `createMeeting`, `updateIssue`, `updateProject`, `deleteIssue`, `deleteProject`, `deleteMeeting`, `createComment`
- **Fetch by ID**: `getIssueById`, `getProjectById`, `getTeamById` - Return fully hydrated entities with related data
- **List queries**: `getTeams`, `getProjects`, `getProfiles`, `getMeetings` - Accept optional `workspaceId`
- **Assignees/Attendees**: `addIssueAssignee`, `removeIssueAssignee`, `addMeetingAttendee`, `removeMeetingAttendee`
- **Activity**: `getRecentActivities` - Fetches activity feed with actor/project/issue/team relations
- All mutations call `revalidatePath()` to refresh relevant pages
- Returns `ActionResult` type: `{ success: boolean; error?: string; data?: unknown }`

**Important pattern for Supabase joins**: Foreign key relationships may return arrays. Actions normalize this:
```tsx
assignee: Array.isArray(issue.assignee) ? issue.assignee[0] || null : issue.assignee
```

**Activity logging**: Mutations call `createActivity()` helper to record activities for the feed.

Modal components (e.g., `NewIssueModal`) fetch dropdown data on-demand when opened via `useEffect`.

### Database Schema & RLS

Core entities in `supabase/migrations/`:
- **profiles** - User profiles (extends auth.users via trigger on signup), has `role` field (`admin`/`employee`)
- **workspaces** - Multi-tenant organizations
- **workspace_members** - Junction table for workspace membership with roles and default workspace tracking
- **clients** - Client organizations
- **teams** - Teams with unique keys (e.g., "ENG", "DES"), scoped to workspace
- **team_members** - Junction table for team membership with roles
- **projects** - Status enum: Demos, Active, Launched, Delayed, Archived, Canceled
- **issues** - Status (Backlog, Todo, In Progress, Done, Canceled), priority (No Priority, Urgent, High, Medium, Low), supports parent/child hierarchy via `parent_id`
- **issue_assignees** - Many-to-many for multiple assignees per issue
- **comments** - Issue comments
- **meetings** - Calendar meetings with start/end times, linked to projects
- **meeting_attendees** - Junction table with RSVP status (pending/accepted/declined/tentative)
- **activities** - Activity feed records with type enum and metadata JSON
- **documents** - Knowledge base with vector embeddings (pgvector, 1536 dimensions)

**Role-Based Access Control (RBAC)**:
- Helper functions: `is_admin()`, `is_team_member(team_uuid)`
- **Admins**: Full access to all records
- **Employees**: Can only see/edit issues they created, are assigned to, or belong to their teams
- Delete operations are admin-only for issues, projects, teams
- See migration `20240104000000_add_role_based_access_control.sql` for complete policy definitions

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
- `/projects` - Project grid view
- `/projects/[id]` - Project detail with issues list
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
