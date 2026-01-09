# [Project Name] - AI Agent

## Overview
AI chat agent built for [Client Name].

## Stack
- **Framework**: Next.js 15 (App Router)
- **AI**: Google Gemini via AI SDK
- **Database**: Supabase (PostgreSQL + Auth)
- **UI**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Fill in Supabase and AI API keys

# Run development server
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Playwright tests |

## Project Structure

```
├── app/
│   ├── api/chat/          # AI chat endpoint
│   ├── auth/              # Auth pages
│   ├── (chat)/            # Chat interface
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── chat/              # Chat components
│   └── providers/         # Context providers
├── lib/
│   ├── ai/                # AI configuration
│   ├── supabase/          # Supabase clients
│   └── utils.ts           # Utilities
└── types/
    └── database.ts        # Supabase types
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# AI
GOOGLE_GENERATIVE_AI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Key Patterns

### AI Chat Endpoint
Located at `app/api/chat/route.ts`. Uses Vercel AI SDK with Google Gemini.

### Authentication
Supabase Auth with SSR support via `@supabase/ssr`.

### Streaming Responses
AI responses stream via the AI SDK's `streamText` function.

## Deployment
- **Platform**: Vercel
- Set all environment variables in Vercel dashboard
- Auto-deploys from main branch

## Client
- **Name**: [Client Name]
- **Brand Color**: [Color]
- **Persona**: [AI personality description]
