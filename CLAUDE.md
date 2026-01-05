# CLAUDE.md

Qualia Internal Suite - Project management platform built with Next.js 16+, Supabase, and AI (Gemini 2.5 Flash chat, VAPI voice).

**Design**: Clean, professional UI like Linear/Plane. No flashy effects.

## Commands

```bash
npm run dev       # Dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
npm test          # Jest tests
```

## Tech Stack

- **Framework**: Next.js 16+ (App Router, React 19, TypeScript)
- **Database**: Supabase (PostgreSQL, pgvector for RAG)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: SWR (30s auto-refresh for tasks)
- **AI**: Gemini 2.5 Flash, VAPI voice, Google embeddings

## Architecture

### Server Actions

All mutations in `app/actions.ts` + `app/actions/*.ts`. Return `ActionResult`:

```typescript
type ActionResult = { success: boolean; error?: string; data?: unknown };
```

### Key Directories

```
app/
├── actions.ts           # Main server actions
├── actions/inbox.ts     # Task CRUD
├── api/chat/route.ts    # AI chat (15+ tools)
├── api/vapi/webhook/    # Voice webhooks

lib/
├── validation.ts        # Zod schemas
├── swr.ts               # SWR hooks + cache invalidation
├── ai/                  # AI processing

components/
├── ui/                  # shadcn/ui components
├── daily-flow/          # Dashboard components
├── project-wizard/      # Project creation wizard

types/database.ts        # Supabase types (Tables<>, Enums<>)
```

### Data Flow

1. Server Components → Direct Supabase queries
2. Client Components → SWR hooks for caching
3. Mutations → Server actions → Zod validation → ActionResult → Invalidate SWR

### Cache Invalidation

After mutations, always invalidate with `immediate: true`:

```typescript
invalidateInboxTasks(true);
invalidateProjectTasks(projectId, true);
invalidateDailyFlow(true);
```

## Database (Supabase MCP)

**ALWAYS use Supabase MCP tools for database operations** - never write raw SQL in code files.

```bash
mcp__supabase__list_tables        # View schema
mcp__supabase__execute_sql        # Run queries
mcp__supabase__apply_migration    # DDL changes (migrations)
mcp__supabase__get_logs           # Debug (api, postgres, auth)
mcp__supabase__get_advisors       # Security/performance checks
```

### Key Tables

| Table        | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| `tasks`      | Tasks with `project_id`, `show_in_inbox`, `item_type`        |
| `projects`   | Projects (type: web_design, ai_agent, voice_agent, seo, ads) |
| `clients`    | CRM with `lead_status`                                       |
| `meetings`   | Scheduled meetings                                           |
| `profiles`   | User profiles                                                |
| `workspaces` | Multi-tenant workspaces                                      |

Types: `Tables<'projects'>`, `Enums<'project_status'>`

## Styling

**Brand color**: `qualia-*` classes (teal #00A4AC)

**Z-index scale**: `z-dropdown: 40`, `z-modal: 50`, `z-popover: 55`, `z-toast: 70`, `z-command: 90`

Colors from `lib/color-constants.ts` - never hardcode.

## Conventions

- Server actions return `ActionResult { success, error?, data? }`
- Zod schemas in `lib/validation.ts`
- `'use client'` for interactive components
- `React.memo()` for list items
- Commits: `feat:`, `fix:`, `perf:`, `refactor:`

## Deployment & Access

- **Production**: https://qualia-erp.vercel.app (auto-deploy from master)
- **GitHub**: github.com/Qualiasolutions (has push access)
- **Vercel CLI**: Available for deployments and env management
- Pre-commit: ESLint, Prettier, TypeScript
