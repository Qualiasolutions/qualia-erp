# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Qualia Internal Suite is a project management platform for Qualia Solutions. Built with Next.js 16 (App Router), Supabase, and AI capabilities including chat (Groq) and voice assistant (VAPI).

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

- **Framework**: Next.js 16 (App Router, React 19, TypeScript)
- **Database/Auth**: Supabase (PostgreSQL with pgvector for RAG)
- **Styling**: Tailwind CSS + shadcn/ui (Radix primitives)
- **AI**: Groq (chat), VAPI (voice), Google AI (embeddings)
- **State**: SWR for client caching, Supabase Realtime for live updates
- **Testing**: Jest + React Testing Library
- **Monitoring**: Sentry

## Architecture

### Server Actions (`app/actions.ts` + `app/actions/*.ts`)

All database mutations use server actions. ~2600 lines in main actions.ts file. Returns `ActionResult { success, error?, data? }` pattern.

### Key Directories

```
app/
├── actions.ts              # Main server actions (projects, tasks, clients, etc.)
├── actions/                # Specialized actions (health, roadmap, inbox, learning)
├── api/chat/route.ts       # AI chat agent with tools + RAG
├── api/embeddings/route.ts # Google AI embeddings generation
├── (dashboard)/            # Dashboard route group
├── clients/                # CRM section
├── inbox/                  # Task inbox (kanban/list)
├── projects/               # Project management
└── schedule/               # Calendar views

components/
├── ui/                     # shadcn/ui components
├── providers/              # Context providers (Theme, Workspace, Sidebar)
├── mentorship/             # Trainee mentorship system
├── skills/                 # Skills tracking
└── onboarding/             # User onboarding flow

lib/
├── supabase/               # Client (browser) and server Supabase instances
├── validation.ts           # Zod schemas for all entities
├── color-constants.ts      # Centralized color system
├── rate-limit.ts           # In-memory rate limiter (needs Redis upgrade)
├── vapi-webhook-handlers.ts # Voice assistant response handlers
└── phase-templates.ts      # Project phase templates
```

### Data Flow

1. **Server Components**: Direct Supabase queries for initial data
2. **Client Components**: SWR hooks for caching + Supabase subscriptions for realtime
3. **Mutations**: Server actions with Zod validation, return ActionResult

### AI Integration

- **Chat Agent** (`app/api/chat/route.ts`): Groq LLM with tools (create task, search knowledge, update project). Uses pgvector for semantic search via `match_documents()` RPC.
- **Voice Assistant**: VAPI integration with 11+ tools. Webhook handlers in `lib/vapi-webhook-handlers.ts`.

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

Pre-commit hooks enforce: ESLint, Prettier, TypeScript, no console.log, security scanning.

## Current Priorities

From `AGENT_PROMPT.md`:

1. Redis rate limiting (replace in-memory with Upstash)
2. Chat message history (persist conversations)
3. Voice call memory (store transcripts)
4. Response caching

## Conventions

- Server actions return `ActionResult { success, error?, data? }`
- Use Zod schemas from `lib/validation.ts` for input validation
- Components use `'use client'` directive for client-side interactivity
- Color system in `lib/color-constants.ts` - don't use hardcoded colors
- Tailwind for styling, no inline CSS
- Conventional commits: `feat:`, `fix:`, `perf:`, `refactor:`
