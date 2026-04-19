# CLAUDE.md

Qualia Suite — project management, CRM, client portal, and AI assistant platform.

**Design**: Clean, professional UI like Linear/Plane. No flashy effects. See `.planning/DESIGN.md` for full design spec.

## Commands

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm test                 # Jest
npm run test:coverage    # Coverage (50% threshold)
npx tsc --noEmit         # Type check (run after multi-file TS changes)
```

## Tech Stack

- **Framework**: Next.js 16+ (App Router, React 19, TypeScript)
- **Database**: Supabase (PostgreSQL, pgvector for RAG)
- **Styling**: Tailwind + shadcn/ui (Radix) + framer-motion
- **State**: SWR (45s refresh when tab visible, stops when hidden)
- **AI**: Google Gemini + OpenRouter via AI SDK
- **Email**: Resend · **Observability**: Sentry + Vercel Analytics
- **Validation**: Zod · **Dates**: date-fns + date-fns-tz
- **UI extras**: @dnd-kit, @tanstack/react-virtual, cmdk, sonner, vaul, next-themes

## Architecture

### Server Actions Pattern

All mutations live in `app/actions/*.ts` (53 domain modules). `app/actions.ts` is a re-export router. Every action returns:

```typescript
type ActionResult = { success: boolean; error?: string; data?: unknown };
```

Discover domain files via `ls app/actions/`. Auth helpers (`isUserAdmin`, `canDelete*`, `canModifyTask`, `canAccessProject`) live in `app/actions/index.ts` and `app/actions/shared.ts`.

### Key Libraries

| File                        | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `lib/validation.ts`         | Zod schemas — use `parseFormData()`            |
| `lib/swr.ts`                | 37 SWR hooks + 33 cache invalidation fns       |
| `lib/server-utils.ts`       | `normalizeFKResponse()` for Supabase FK arrays |
| `lib/supabase/server.ts`    | Server client — **use for ALL mutations**      |
| `lib/supabase/client.ts`    | Browser client — read-only                     |
| `lib/color-constants.ts`    | `ISSUE_STATUS_COLORS`, `ISSUE_PRIORITY_COLORS` |
| `lib/rate-limit.ts`         | In-memory rate limiting (Redis TODO)           |
| `lib/planning-sync-core.ts` | Sync `.planning/` from GitHub → DB             |
| `lib/ai/tools/`             | Read/write tools for AI chat                   |
| `types/database.ts`         | Auto-generated — run `npx supabase gen types`  |

### Data Flow

1. **Server Components** → direct Supabase via server actions
2. **Client Components** → SWR hooks (`useInboxTasks`, `useProjects`, …)
3. **Mutations** → server action → Zod → DB → `revalidatePath()` → invalidate SWR with `immediate: true`

### Supabase FK Pattern

Supabase returns FK joins as arrays. Always normalize:

```typescript
import { normalizeFKResponse } from '@/lib/server-utils';
const project = normalizeFKResponse(data.project);
```

### Unified Tasks Page

`/tasks` serves all three roles via server-side mode resolution in `app/(portal)/tasks/page.tsx`:

- **Employees:** `scope=mine` (default) — own assigned/created tasks, `inboxOnly=true`
- **Admins:** `scope=mine` (default) with Mine/All toggle; `?scope=all` reveals workspace-wide view with bulk assign/done/delete
- **Clients:** `getClientVisibleTasks` — read-only, `is_client_visible=true` tasks for linked projects

`/inbox` redirects to `/tasks`. `/admin/tasks` redirects to `/tasks?scope=all` (admin) or `/tasks` (non-admin).

## Database

**63 tables + 1 view.** Use Supabase MCP tools — don't write raw SQL in code. Migrations go in `supabase/migrations/`.

Domain groupings (grep tables via MCP `list_tables` for full list):

- **Core**: `tasks`, `issues` (legacy), `projects`, `project_phases`, `phase_items`, `clients`, `meetings`, `profiles`, `teams`, `workspaces`
- **Project mgmt**: `project_assignments`, `project_integrations`, `project_deployments`, `project_files`, `task_attachments`, `task_time_logs`
- **Client portal**: `client_projects`, `client_activities`, `client_feature_requests`, `client_invoices`, `client_action_items`
- **AI**: `ai_conversations`, `ai_messages`, `ai_user_context`, `ai_user_memory`, `documents` (pgvector)
- **Financial**: `financial_invoices`, `financial_payments`, `expenses`
- **Work tracking**: `work_sessions`, `daily_checkins`, `claude_sessions`

Enum values live in `types/database.ts` — check there before using string literals. Key enums: `project_status`, `task_status`, `task_priority`, `user_role` (`admin`/`employee`/`client` — `manager` removed 2026-04-18), `lead_status`.

## Auth & Middleware

- `middleware.ts` protects all routes except `/auth/*` and `/api/*`
- Session via `supabase.auth.getClaims()` (JWT custom claims through `custom_access_token_hook`)
- **Role-based routing** (three roles):
  - `client` → blocked from `/schedule`, `/agent`; sees `/tasks` in client mode (read-only, `is_client_visible` only), portal hub, billing, requests, settings
  - `employee` → all internal routes except `/admin/*`, `/clients`, `/workspace`, `/seo`, `/tasks` shows own assigned tasks (inbox default)
  - `admin` → everything, `/tasks` default is own tasks; `?scope=all` for workspace-wide view
- **API routes are NOT middleware-protected** — each must implement its own auth check

## Routes (high level)

- **Internal**: `/`, `/tasks` (unified — inbox default, `?scope=all` for admin workspace view), `/projects`, `/projects/[id]/{roadmap,files}`, `/clients`, `/schedule`, `/team`, `/payments`, `/knowledge`, `/research`, `/seo`, `/status`, `/agent`, `/settings/{integrations,notifications}`
- **Admin-only**: `/admin`, `/admin/{assignments,attendance,migrate}`
- **Portal**: `/portal`, `/portal/[id]/{features,files,updates}`, `/portal/{billing,requests,settings}`
- **Auth**: `/auth/{login,signup,reset-password,error}`

API routes: `app/api/{chat,embeddings,tts,health}/` · `app/api/{github,webhooks}/` · `app/api/claude/{project-status,session-feed,session-log}/` · `app/api/cron/*` (8 jobs)

## Styling

**Brand color**: `qualia-*` (teal #00A4AC, scale 50–950 in `tailwind.config.ts`).

**Z-index scale**: `z-inline-edit:35` · `z-dropdown:40` · `z-sticky:45` · `z-modal:50` · `z-popover:55` · `z-overlay:60` · `z-assistant:65` · `z-toast:70` · `z-tooltip:80` · `z-command:90` · `z-max:100`

**Elevation**: five tiers (`elevation-1`–`5`). **Easing**: `premium`, `ease-out-expo/quart/quint` only — no bounce/spring.

Dark mode via `next-themes`. Light: teal-tinted off-white (#EDF0F0). Dark: teal-tinted deep (#121819).

## Conventions

- Server actions return `ActionResult { success, error?, data? }`
- Zod schemas in `lib/validation.ts` — use `parseFormData()` or `validateData()`
- `React.memo()` list items · date-fns/date-fns-tz for TZ-aware work
- Commits: `feat:`, `fix:`, `perf:`, `refactor:`, `style:`, `docs:`
- Feature branches only — never push directly to main/master
- RLS on every table · derive user from `auth.uid()` · never trust client IDs
- `service_role` key is server-only — never import in client code
- Full-width layouts — no hardcoded 1200/1280px caps. Fluid widths.

## Environment

Required in `.env.local` (see `.env.example`):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENROUTER_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `VERCEL_WEBHOOK_SECRET`. Optional: `ZOHO_*`, `SENTRY_*`.

Always `vercel env pull` to sync locally — never create `.env` manually.

## Deployment

- **Vercel team**: `qualiasolutionscy` (Qualia Solutions - Development)
- **Production**: https://portal.qualiasolutions.net
- **Deploy**: `vercel --prod --yes` (default scope)
- **Supabase ref**: `vbpzaiqovffpsroxaulv`
- Pre-commit: ESLint + Prettier via husky/lint-staged
- Post-deploy checklist: HTTP 200, auth flow, console errors, API latency <500ms (see `~/.claude/rules/deployment.md`)

## GitHub Integration & Auto-Assignment

1. **Webhook** (`app/api/github/webhook/route.ts`) — push events → match repo to project via `project_integrations` → sync `.planning/` into `project_phases`
2. **Auto-assign engine** (`app/actions/auto-assign.ts`) — converts phase items into inbox tasks on assignment. Idempotent via `source_phase_item_id` unique constraint. Key fns: `getActiveMilestone`, `createTasksFromMilestone`, `handleReassignment`, `markMilestoneTasksDone`
3. **Hook point**: `app/actions/project-assignments.ts`

## Qualia Framework Integration (`/api/v1/reports`)

Every engineer runs `/qualia-report` at clock-out; the qualia-framework POSTs a structured session report to this ERP.

- **Contract**: `docs/framework-contract.md` — vendored copy of `qualia-framework/docs/erp-contract.md`. Sync with `cp ~/qualia-framework/docs/erp-contract.md docs/framework-contract.md` after upstream changes.
- **Ingest**: `app/api/v1/reports/route.ts` — Zod-validated, dual auth (qlt\_\* bearer or legacy `CLAUDE_API_KEY`), `Idempotency-Key` 24h replay window.
- **Schema**: `session_reports` (service_role-only RLS). Key columns: `framework_project_id`, `client_report_id` (QS-REPORT-NN, v4.0.4+), `dry_run`, `milestones` (jsonb), `gap_cycles` + `gap_cycles_raw` (polymorphism).
- **Dedupe**: `(framework_project_id, client_report_id)` is an UPSERT key via unique index `session_reports_client_report_id_uniq`. Retries are idempotent.
- **dry_run filter**: all production reads apply `.neq('dry_run', true)` by default. Readers expose `{ includeDryRun?: boolean }` for admin diagnostics. See `app/actions/reports.ts` + `app/actions/work-sessions.ts`.
- **Retention**: `app/api/cron/cleanup-dry-run-reports/route.ts` deletes `dry_run=true` rows older than 7 days (daily 03:00 UTC).
- **Admin UI**: `app/(portal)/admin/reports/framework-reports-tab.tsx` — Framework Reports tab with `QS-REPORT-NN` column.

## File Storage

Logos and project files use Supabase Storage bucket `project-files`. Pattern in `app/actions/logos.ts`:

```typescript
const storagePath = `logos/projects/${projectId}/logo.${ext}`;
await supabase.storage.from('project-files').upload(storagePath, file, { upsert: true });
const {
  data: { publicUrl },
} = supabase.storage.from('project-files').getPublicUrl(storagePath);
const logoUrl = `${publicUrl}?t=${Date.now()}`; // cache-bust
```

## Planning Workflow

Project uses Qualia `.planning/` structure:

```
.planning/
├── PROJECT.md REQUIREMENTS.md ROADMAP.md STATE.md REVIEW.md DESIGN.md
└── phases/1-phase-name/{PLAN,SUMMARY,VERIFICATION}.md
```

**Guards**: Read `DESIGN.md` before any frontend change. Check `REVIEW.md` freshness before deploy.

## Technical Debt

| Priority | Issue                       | Status  |
| -------- | --------------------------- | ------- |
| P1       | Test coverage (1.68% → 50%) | Pending |
| P2       | God-module splits           | Pending |

DONE: P0 items (IDOR in file downloads, `deleteTask` auth, webhook secret). P2 N+1 in `getProjectById` (parallelized via `Promise.all`). Token encryption hardened + rotated (2026-04-19). v4.0.4 framework sync contract (`client_report_id`, `dry_run` + 7-day retention). Redis rate-limiting via `@upstash/ratelimit` + Vercel Marketplace Upstash integration (2026-04-19, commit `789b801`).

## Trainee Resources

- **Onboarding**: `docs/trainee-onboarding.md`
- **Templates**: `templates/{ai-agent,platform,voice,website}-starter/` — each with `PROGRESS.md`
