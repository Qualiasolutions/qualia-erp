# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Qualia is a project management and issue tracking platform built with Next.js 15 (App Router), Supabase, and the Vercel AI SDK. It features a Linear-inspired dark UI with a sidebar navigation, command palette (Cmd+K), and an integrated AI assistant.

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
GOOGLE_GENERATIVE_AI_API_KEY=<google-api-key>  # For AI chat (Gemini)
```

## Architecture

### Supabase Integration

Two Supabase clients for different contexts:
- `lib/supabase/server.ts` - Server-side client using `@supabase/ssr` with cookie handling. **Create a new client per request** (important for Fluid compute).
- `lib/supabase/client.ts` - Browser client for client components.

**Note:** No middleware.ts exists yet - protected routes (`/protected/*`) have a separate layout but auth guard middleware is not implemented.

### Server Actions Pattern

`app/actions.ts` contains all server actions for data mutations:
- `createIssue`, `createProject`, `createTeam` - CRUD operations with auth checks
- `getTeams`, `getProjects`, `getProfiles` - Data fetching for forms
- All mutations call `revalidatePath()` to refresh relevant pages
- Returns `ActionResult` type: `{ success: boolean; error?: string; data?: unknown }`

Modal components (e.g., `NewIssueModal`) fetch dropdown data on-demand when opened via `useEffect`.

### Database Schema

Core entities in `supabase/migrations/`:
- **profiles** - User profiles (extends auth.users via trigger on signup)
- **clients** - Client organizations
- **teams** - Teams with unique keys (e.g., "ENG", "DES")
- **team_members** - Junction table for team membership with roles
- **projects** - Status enum: Demos, Active, Launched, Delayed, Archived, Canceled
- **issues** - Status (Backlog, Todo, In Progress, Done, Canceled), priority (No Priority, Urgent, High, Medium, Low), supports parent/child hierarchy via `parent_id`
- **comments** - Issue comments
- **documents** - Knowledge base with vector embeddings (pgvector, 1536 dimensions)

All tables have RLS enabled. The second migration (`20240102...`) optimizes RLS policies by wrapping `auth.uid()` in subqueries.

### Data Fetching Pattern

Pages use the async Server Component pattern with Suspense:
```tsx
// Page component
<Suspense fallback={<Skeleton />}>
  <DataLoader />  // async server component that fetches data
</Suspense>
```

Example: `app/issues/page.tsx` uses `IssueListLoader` to fetch issues with joined assignee data.

### AI Integration

- Chat API endpoint: `app/api/chat/route.ts` using Vercel AI SDK with Google Gemini (`gemini-1.5-flash`)
- Chat component: `components/chat.tsx` - Client component using `useChat` hook
- Documents table supports RAG with pgvector embeddings

### Routing Structure

- `/` - Dashboard with stats and activity
- `/issues` - Issue list with real-time Supabase data
- `/projects` - Project grid view
- `/teams` - Team management
- `/settings` - User settings
- `/auth/*` - Authentication flows
- `/api/chat` - AI chat streaming endpoint

## Styling

- Dark theme by default (`<html className="dark">`)
- Custom dark palette: backgrounds #141414, #1C1C1C; borders #2C2C2C
- Brand color: `qualia` (#00A4AC teal) - use `bg-qualia-600`, `text-qualia-400`, etc.
- Tailwind CSS with tailwindcss-animate plugin
- Inter font family
