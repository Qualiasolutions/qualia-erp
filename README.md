# Qualia ERP

Internal project management platform for [Qualia Solutions](https://qualiasolutions.net). Built with Next.js, Supabase, and AI.

**Production**: [portal.qualiasolutions.net](https://portal.qualiasolutions.net)

## Stack

- **Framework**: Next.js 16+ (App Router, React 19, TypeScript)
- **Database**: Supabase (PostgreSQL, pgvector for RAG)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: SWR with auto-refresh
- **AI**: Google Gemini via AI SDK, VAPI voice assistant
- **Email**: Resend
- **Hosting**: Vercel
- **Monitoring**: Sentry

## Features

- Task management with inbox, scheduling, and drag-and-drop
- Project tracking with roadmap phases and milestones
- CRM with lead pipeline and client portal
- Team schedule with timezone support (Cyprus/Jordan)
- Payment tracking with retainer automation
- AI chat assistant with tool calling
- Voice AI assistant via VAPI webhooks
- Knowledge base with RAG (document embeddings)
- Real-time notifications
- Employee clock-in/clock-out with session tracking
- Client portal with workspace isolation

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase and API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm test                 # Jest tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

## Project Structure

```
app/
  actions/          # Server actions (45 domain modules)
  api/              # API routes (chat, voice, cron, health)
  (routes)/         # Page routes

components/
  ui/               # shadcn/ui primitives
  today-dashboard/  # Dashboard widgets
  project-wizard/   # Multi-step project creation

lib/
  supabase/         # Supabase clients (server + browser)
  ai/               # AI tools and system prompts
  swr.ts            # SWR hooks and cache invalidation
  validation.ts     # Zod schemas

types/
  database.ts       # Auto-generated Supabase types

templates/          # Starter templates for new projects
  ai-agent-starter/
  platform-starter/
  voice-starter/
  website-starter/

scripts/            # Database seed and migration scripts
```

## Environment Variables

See `.env.example` for the full list. Required:

- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_VAPI_PUBLIC_KEY` + `VAPI_WEBHOOK_SECRET`

## Deployment

```bash
vercel --prod --scope archivedqualia
```

## License

MIT
