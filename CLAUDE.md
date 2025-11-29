# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Qualia is a project management and issue tracking platform built with Next.js 15 (App Router), Supabase, and the Vercel AI SDK. It features a Linear-inspired dark UI with a sidebar navigation, command palette (Cmd+K), and an integrated AI assistant powered by OpenAI.

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint with Next.js + TypeScript rules

# Add shadcn/ui components
npx shadcn@latest add <component-name>
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-or-publishable-key>
GOOGLE_GENERATIVE_AI_API_KEY=<google-api-key>  # For AI chat functionality (Gemini)
```

## Architecture

### Supabase Integration

Two Supabase clients for different contexts:
- `lib/supabase/server.ts` - Server-side client using `@supabase/ssr` with cookie handling. **Create a new client per request** (important for Fluid compute).
- `lib/supabase/client.ts` - Browser client for client components.

**Note:** No middleware.ts exists yet - protected routes (`/protected/*`) have a separate layout but auth guard middleware is not implemented.

### Database Schema

Core entities defined in `supabase/migrations/20240101000000_initial_schema.sql`:
- **profiles** - User profiles (extends auth.users via trigger)
- **clients** - Client organizations
- **teams** - Teams with unique keys (e.g., "ENG", "DES")
- **projects** - Projects with status enum: Demos, Active, Launched, Delayed, Archived, Canceled
- **issues** - Issues with status (Backlog, Todo, In Progress, Done, Canceled) and priority (No Priority, Urgent, High, Medium, Low), supports parent/child hierarchy
- **comments** - Issue comments
- **documents** - Knowledge base with vector embeddings (pgvector, 1536 dimensions for OpenAI)

All tables have RLS enabled with basic authenticated user policies.

### AI Integration

- Chat API endpoint: `app/api/chat/route.ts` using Vercel AI SDK with Google Gemini (`gemini-1.5-flash`)
- Chat component: `components/chat.tsx` - Client component using `useChat` hook
- Documents table supports RAG with pgvector embeddings

### UI Components

- shadcn/ui configured in `components.json` (new-york style, neutral base color)
- UI primitives in `components/ui/` (button, card, input, label, checkbox, dropdown-menu, badge)
- Icons: lucide-react

### Key Components

- `components/sidebar.tsx` - Main navigation (Dashboard, Issues, Projects, Teams, Settings)
- `components/command-menu.tsx` - Cmd+K command palette using cmdk
- `components/issue-list.tsx` - Issue list with status/priority icons (**currently static data - needs Supabase integration**)
- `components/project-list.tsx` - Project cards with progress (**currently static data - needs Supabase integration**)

### Routing Structure

- `/` - Dashboard with stats and activity
- `/issues` - Issue list view
- `/projects` - Project grid view
- `/auth/*` - Authentication flows (login, sign-up, forgot-password, update-password)
- `/protected/*` - Authenticated routes with separate layout
- `/api/chat` - AI chat streaming endpoint

## Styling

- Dark theme by default (`<html className="dark">`)
- Custom dark palette: backgrounds #141414, #1C1C1C; borders #2C2C2C
- Brand color: `qualia` (#00A4AC teal) - primary accent color via `bg-qualia-500`, `text-qualia-400`, etc.
- Logo: `/public/logo.webp` (500x500 WebP)
- Tailwind CSS with tailwindcss-animate plugin
- Inter font family
