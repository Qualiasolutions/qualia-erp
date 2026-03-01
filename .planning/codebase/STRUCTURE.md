# Codebase Structure

**Analysis Date:** 2026-03-01

## Directory Layout

```
/home/qualia/Projects/websites/qualia/
├── app/                          # Next.js 16 App Router
│   ├── actions/                  # Domain-specific server actions
│   ├── api/                      # API routes (chat, webhooks, cron)
│   ├── auth/                     # Authentication pages
│   ├── [feature]/                # Feature pages (projects, clients, schedule, etc.)
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Homepage entry (→ today-page.tsx)
│   └── globals.css               # Global styles + Tailwind
├── components/                   # React components
│   ├── ui/                       # shadcn/ui primitives
│   ├── [feature]/                # Feature-specific components
│   ├── providers/                # Context providers
│   └── *.tsx                     # Shared components
├── lib/                          # Utilities and shared logic
│   ├── ai/                       # AI tools and system prompts
│   ├── supabase/                 # Supabase clients (server, client, middleware)
│   ├── hooks/                    # Custom React hooks
│   ├── swr.ts                    # SWR hooks and cache management
│   ├── validation.ts             # Zod schemas
│   └── *.ts                      # Utilities, constants, helpers
├── types/                        # TypeScript type definitions
│   └── database.ts               # Auto-generated Supabase types + enums
├── public/                       # Static assets
├── templates/                    # Starter templates for trainees
├── docs/                         # Documentation and audits
├── scripts/                      # Maintenance scripts
├── __tests__/                    # Jest tests
└── .planning/                    # GSD planning and codebase docs
```

## Directory Purposes

**app/actions/**

- Purpose: Domain-specific server actions organized by feature
- Contains: TypeScript modules with `'use server'` directive
- Key files:
  - `index.ts`: Re-export router for backward compatibility
  - `shared.ts`: ActionResult type, authorization helpers
  - `workspace.ts`, `teams.ts`, `projects.ts`, `clients.ts`, `meetings.ts`, `issues.ts`, `inbox.ts`, `notifications.ts`, `activities.ts`
  - `phases.ts`, `pipeline.ts`, `project-files.ts`, `logos.ts`
  - `learning.ts`, `payments.ts`, `health.ts`, `deployments.ts`
  - `ai-context.ts`, `ai-conversations.ts`, `zoho.ts`

**app/api/**

- Purpose: HTTP API endpoints for external integrations
- Contains: Route handlers (`route.ts`)
- Key files:
  - `chat/route.ts`: AI chat streaming (Gemini via OpenRouter)
  - `vapi/webhook/route.ts`: Voice AI webhooks (11+ tools)
  - `embeddings/route.ts`: Document embedding generation
  - `cron/reminders/route.ts`: Scheduled notifications
  - `health/route.ts`: Health check endpoint

**app/[feature]/**

- Purpose: Feature-specific pages and layouts
- Contains: `page.tsx`, `layout.tsx`, `loading.tsx`, `*-client.tsx`
- Key directories:
  - `projects/`: Project list, detail (`[id]/page.tsx`), roadmap redirect
  - `clients/`: Client CRM list and detail (`[id]/page.tsx`)
  - `schedule/`: Team schedule calendar
  - `inbox/`: Task inbox view
  - `payments/`: Payment tracking
  - `settings/`: User settings
  - `team/`: Team members
  - `admin/`: Admin-only pages

**components/**

- Purpose: Reusable UI components (client and server)
- Contains: TSX files with React components
- Key subdirectories:
  - `ui/`: shadcn/ui primitives (button, dialog, dropdown, etc.)
  - `today-dashboard/`: Dashboard widgets
  - `project-wizard/`: Multi-step project creation
  - `project-pipeline/`: Phase/milestone components
  - `team/`: Schedule grid components
  - `ai-assistant/`: AI chat widget
  - `health-dashboard/`: Health metrics
  - `providers/`: Context providers (learn-mode, theme, workspace)

**lib/**

- Purpose: Shared utilities, hooks, and business logic
- Contains: TypeScript utility modules
- Key files:
  - `swr.ts`: SWR hooks, cache keys, invalidation functions
  - `validation.ts`: Zod schemas for all entities
  - `server-utils.ts`: `normalizeFKResponse()` for Supabase FKs
  - `color-constants.ts`: Centralized theme colors
  - `schedule-utils.ts`: Date/time filtering
  - `project-phases.ts`: Phase/milestone helpers
  - `email.ts`: Resend email notifications
  - `rate-limit.ts`: In-memory rate limiting
  - `ai/system-prompt.ts`: AI system prompt builder
  - `ai/tools/`: AI function tools (read and write)
  - `supabase/server.ts`, `supabase/client.ts`, `supabase/middleware.ts`

**types/**

- Purpose: TypeScript type definitions
- Contains: `.d.ts` and `.ts` type files
- Key files:
  - `database.ts`: Auto-generated Supabase types, enum constants (`TASK_STATUSES`, `PROJECT_TYPES`, etc.)
  - `speech.d.ts`: Web Speech API types

**templates/**

- Purpose: Starter templates for trainee onboarding
- Contains: Four starter projects
- Key directories:
  - `ai-agent-starter/`: Next.js + Gemini + Supabase
  - `platform-starter/`: Server Actions + SWR pattern
  - `voice-starter/`: Cloudflare Workers + VAPI
  - `website-starter/`: React + Vite + Tailwind

## Key File Locations

**Entry Points:**

- `app/layout.tsx`: Root layout, provider tree
- `app/page.tsx`: Homepage (imports `today-page.tsx`)
- `app/today-page.tsx`: Dashboard server component
- `middleware.ts`: Auth middleware

**Configuration:**

- `package.json`: Dependencies, scripts
- `tsconfig.json`: TypeScript config
- `tailwind.config.ts`: Tailwind + shadcn config
- `next.config.ts`: Next.js config
- `.env.local`: Environment variables (NOT committed)
- `jest.config.ts`: Jest test config

**Core Logic:**

- `app/actions/index.ts`: Server action router
- `lib/swr.ts`: Client-side data fetching
- `lib/validation.ts`: Input validation schemas
- `lib/supabase/server.ts`: Server-side database client

**Testing:**

- `__tests__/lib/validation.test.ts`: Validation tests
- `__tests__/lib/voice-assistant-intelligence.test.ts`: Voice AI tests
- `jest.setup.ts`: Jest setup
- `__mocks__/supabase.ts`: Supabase mock

## Naming Conventions

**Files:**

- Server components: `page.tsx`, `layout.tsx`, `loading.tsx`
- Client components: `*-client.tsx`, `*-modal.tsx`, `*-widget.tsx`, `*-card.tsx`
- Server actions: Domain-named `.ts` files in `app/actions/`
- API routes: `route.ts` in `app/api/[name]/`
- Tests: `*.test.ts` in `__tests__/`

**Directories:**

- Dynamic routes: `[id]`, `[slug]`
- Feature directories: `kebab-case` (e.g., `today-dashboard`, `project-wizard`)
- Component groups: Descriptive names (e.g., `ai-assistant`, `health-dashboard`)

**Components:**

- UI primitives: `lowercase-with-dashes.tsx` (e.g., `button.tsx`, `dialog.tsx`)
- Feature components: `PascalCase` exported from `kebab-case.tsx` (e.g., `TodayDashboard` from `today-dashboard/index.tsx`)
- Modals: `*-modal.tsx` (e.g., `new-project-modal.tsx`)
- Providers: `*-provider.tsx` (e.g., `workspace-provider.tsx`)

**Functions:**

- Server actions: `camelCase` verbs (e.g., `createProject()`, `updateTask()`, `deleteClient()`)
- SWR hooks: `use*` prefix (e.g., `useProjects()`, `useInboxTasks()`)
- Utilities: `camelCase` (e.g., `normalizeFKResponse()`, `filterTodaysTasks()`)

## Where to Add New Code

**New Feature:**

- Primary code: `app/[feature]/page.tsx` (server component) + `app/[feature]/[feature]-client.tsx` (client component)
- Server actions: `app/actions/[feature].ts` with `'use server'`
- Components: `components/[feature]/` or `components/[feature]-*.tsx`
- Tests: `__tests__/[feature]/` or `__tests__/lib/[feature].test.ts`

**New Component/Module:**

- Implementation: `components/[name]/` with `index.tsx` as main export
- If single-file: `components/[name].tsx`
- If UI primitive: `components/ui/[name].tsx`

**New Server Action:**

- Domain-specific: Add to existing `app/actions/[domain].ts` or create new domain file
- Export from `app/actions/index.ts` for backward compatibility
- Add Zod schema to `lib/validation.ts` if needed

**New API Route:**

- Create `app/api/[name]/route.ts`
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`

**New SWR Hook:**

- Add hook to `lib/swr.ts`
- Add cache key to `cacheKeys` object
- Add invalidation function (e.g., `invalidate[Feature]()`)

**Utilities:**

- Shared helpers: `lib/[name].ts`
- Feature-specific: `lib/[feature]-utils.ts`
- Constants: `lib/constants/[name].ts` or `lib/[name]-constants.ts`

## Special Directories

**templates/**

- Purpose: Starter templates for trainee projects
- Generated: No
- Committed: Yes

**.planning/**

- Purpose: GSD planning documents and codebase analysis
- Generated: By GSD commands
- Committed: Yes

**.next/**

- Purpose: Next.js build output
- Generated: Yes (on build)
- Committed: No

**node_modules/**

- Purpose: npm dependencies
- Generated: Yes (on install)
- Committed: No

**public/**

- Purpose: Static assets served at `/`
- Generated: No (manually added)
- Committed: Yes
- Contains: `logos/`, `videos/`, `work/`, favicons

**coverage/**

- Purpose: Jest test coverage reports
- Generated: Yes (on `npm run test:coverage`)
- Committed: No

**docs/**

- Purpose: Documentation, audits, research
- Generated: Mixed (some manual, some generated)
- Committed: Yes

**scripts/**

- Purpose: One-off maintenance scripts (seeding, migrations, workflow analysis)
- Generated: No
- Committed: Yes

---

_Structure analysis: 2026-03-01_
