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
- **State**: SWR for client caching, Supabase Realtime for live updates
- **Testing**: Jest + React Testing Library
- **Monitoring**: Sentry

## Architecture

### Server Actions (`app/actions.ts` + `app/actions/*.ts`)

All database mutations use server actions. Returns `ActionResult` pattern:

```typescript
type ActionResult = { success: boolean; error?: string; data?: unknown };
```

Main actions file (~2600 lines) handles: issues, projects, teams, clients, meetings, milestones.
Specialized actions in `app/actions/`: health, roadmap, inbox, learning.

### Entity System

Two task-like entities exist:

- **Issues** (`issues` table): Project-level tasks with full workflow (Yet to Start → Todo → In Progress → Done → Canceled)
- **Tasks** (`tasks` table): Personal inbox items with simpler status (Todo → In Progress → Done)

### Key Directories

```
app/
├── actions.ts              # Main server actions
├── actions/                # Specialized actions (health, roadmap, inbox, learning)
├── api/chat/route.ts       # AI chat agent (15+ tools)
├── api/vapi/webhook/       # Voice assistant webhooks
├── api/embeddings/route.ts # Google AI embeddings
├── clients/                # CRM section
├── inbox/                  # Personal task inbox
├── projects/               # Project management with roadmaps
└── schedule/               # Calendar views

lib/
├── supabase/server.ts      # Server-side Supabase client (always create fresh)
├── supabase/client.ts      # Browser-side Supabase client
├── validation.ts           # Zod schemas for all entities
├── color-constants.ts      # Centralized Tailwind color classes
└── vapi-webhook-handlers.ts # Voice tool handlers

types/
└── database.ts             # Auto-generated Supabase types (Tables<>, Enums<>)

components/
├── dashboard-client.tsx    # Main dashboard layout and state
├── dashboard-objectives.tsx # 2025 Objectives project checklist
├── dashboard-meetings.tsx  # Upcoming meetings widget
├── dashboard-notes.tsx     # Team notes with realtime sync
└── dashboard-ai-input.tsx  # AI chat input
```

### Dashboard Structure

The main dashboard (`app/dashboard-page.tsx` + `components/dashboard-client.tsx`) uses a modern layout:

```
┌─────────────────────────────────────────────────┐
│              HERO SECTION (Center)              │
│  - QualiaVoiceInline (voice assistant)          │
│  - Greeting + Date                              │
│  - DashboardAIInput (AI chat)                   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│           MEETINGS ROW (Compact)                │
│              DashboardMeetings                  │
└─────────────────────────────────────────────────┘
                      ↓
┌────────────────────────┬────────────────────────┐
│   2025 Objectives      │     Team Notes         │
│                        │                        │
│  DashboardObjectives   │   DashboardNotes       │
│  - Active projects     │   - Realtime notes     │
│  - Click to complete   │   - CRUD operations    │
└────────────────────────┴────────────────────────┘
```

**DashboardObjectives**: Shows active projects (`status = 'Active'`) as a checklist. Clicking marks project as `Completed`. Fetches from `projects` table filtered by workspace.

**DashboardNotes**: Team notes with Supabase realtime subscriptions. Users can add/edit/delete their own notes. Data in `workspace_notes` table.

### Data Flow

1. **Server Components**: Direct Supabase queries for initial data
2. **Client Components**: SWR hooks for caching + Supabase subscriptions for realtime
3. **Mutations**: Server actions with Zod validation → returns ActionResult
4. **AI Tools**: Direct Supabase queries within tool execute functions

### AI Chat Agent (`app/api/chat/route.ts`)

Uses Groq's llama-3.1-8b-instant with 15+ tools:

**Read tools**: getDashboardStats, searchIssues, searchProjects, searchClients, getTeams, getRecentActivity, getUpcomingMeetings, getProjectDetails, getWorkspaceStats, searchKnowledgeBase (RAG)

**Write tools**: createTask, updateTaskStatus, addComment, createClient, createMeeting

**Roadmap tools**: updateRoadmap, addRoadmapItem, deleteRoadmapItem, deleteRoadmap

RAG search uses `match_documents()` RPC with Google's text-embedding-004 model.

### Voice Assistant (VAPI)

Webhook at `app/api/vapi/webhook/route.ts`. Tool handlers in `lib/vapi-webhook-handlers.ts`.

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
