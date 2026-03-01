# External Integrations

**Analysis Date:** 2026-03-01

## APIs & External Services

**AI/ML Providers:**

- **OpenRouter** - Primary AI gateway for Gemini 3 Flash Preview and Gemini 2.5 Flash
  - SDK/Client: `@ai-sdk/openai` via custom OpenRouter client
  - Auth: `OPENROUTER_API_KEY` environment variable
  - Implementation: `lib/ai/gemini-client.ts`
  - Usage: Chat completions, tool calling, streaming responses
  - Headers: HTTP-Referer and X-Title set to qualia-erp.vercel.app

- **Google Generative AI** - Direct Gemini API for embeddings
  - SDK/Client: `@ai-sdk/google`
  - Auth: `GOOGLE_GENERATIVE_AI_API_KEY`
  - Implementation: `lib/ai/gemini-client.ts`, `app/api/embeddings/route.ts`
  - Usage: text-embedding-004 model for RAG/document embeddings

- **VAPI (Voice AI)** - Real-time voice assistant platform
  - SDK/Client: `@vapi-ai/web` for client-side calls
  - Auth: `NEXT_PUBLIC_VAPI_PUBLIC_KEY` (public), `VAPI_WEBHOOK_SECRET` (server)
  - Implementation: `app/api/vapi/webhook/route.ts`, `lib/integrations/vapi.ts`, `lib/vapi-webhook-handlers.ts`
  - Webhooks: Tool calls for projects, issues, team, schedule, knowledge base, client info
  - CSP: Requires `https://api.vapi.ai`, `wss://api.vapi.ai`, `https://cdn.vapi.ai`
  - Usage: Voice assistant with 11+ tools, intelligent context handling

- **ElevenLabs** - Text-to-speech API
  - SDK/Client: Direct REST API calls
  - Auth: `ELEVENLABS_API_KEY`
  - Implementation: `app/api/tts/route.ts`
  - CSP: `https://elevenlabs.io` for scripts, `https://api.elevenlabs.io` for API
  - Usage: Voice synthesis for TTS features

**Communication:**

- **Resend** - Transactional email delivery
  - SDK/Client: `resend` npm package (6.6.0)
  - Auth: `RESEND_API_KEY`
  - Implementation: `lib/email.ts`
  - From: `Qualia Platform <notifications@qualiasolutions.net>`
  - Usage: Admin notifications (task/project/meeting/client/issue creation), daily digest reminders

**Developer Tools:**

- **GitHub** - Repository management and integration
  - SDK/Client: `@octokit/rest` (22.0.1)
  - Auth: Workspace-scoped tokens stored in `workspace_integrations` table (encrypted)
  - Implementation: `lib/integrations/github.ts`
  - Usage: Org-level operations, repo creation from templates, workspace-based client caching

**Business Tools:**

- **Zoho Books/Mail** - Accounting and email integration
  - SDK/Client: Custom REST client
  - Auth: `ZOHO_CLIENT_SECRET` + OAuth token management
  - Implementation: `lib/integrations/zoho.ts`
  - Usage: Invoice creation, contact management, email sending
  - API Base: https://www.zohoapis.com

**Deployment:**

- **Vercel** - Hosting and deployment automation
  - SDK/Client: Custom REST API integration
  - Auth: Workspace-scoped tokens in `workspace_integrations` (encrypted), `VERCEL_WEBHOOK_SECRET`
  - Implementation: `lib/integrations/vercel.ts`, `app/api/webhooks/vercel/route.ts`
  - Webhooks: Deployment status updates (HMAC SHA-1 signature verification)
  - CSP: `https://vercel.live` for previews
  - Usage: Project provisioning, deployment webhooks, team-level operations

## Data Storage

**Databases:**

- **Supabase PostgreSQL**
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - Client: `@supabase/supabase-js` (2.86.0), `@supabase/ssr` (0.8.0)
  - Implementation: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server), `lib/supabase/middleware.ts` (auth)
  - Extensions: pgvector for embeddings (text-embedding-004)
  - Tables: tasks, issues, projects, project_phases, phase_items, clients, meetings, profiles, workspaces, workspace_members, workspace_integrations, notifications, activities, documents, project_health, health_insights, conversations, conversation_messages
  - CSP: `https://*.supabase.co`, `wss://*.supabase.co`

**File Storage:**

- **Supabase Storage** - Blob storage for project files and logos
  - Bucket: `project-files`
  - Implementation: `app/actions/project-files.ts`, `app/actions/logos.ts`
  - Paths: `logos/projects/{projectId}/logo.{ext}`, `logos/clients/{clientId}/logo.{ext}`
  - Public URLs with cache-busting: `?t=${Date.now()}`

- **Vercel Blob** - Video/large file uploads
  - SDK/Client: `@vercel/blob` (2.2.0)
  - Implementation: `app/api/upload-video/route.ts`

**Caching:**

- **SWR** - Client-side data fetching and caching
  - Implementation: `lib/swr.ts`
  - Strategy: 45s auto-refresh when tab visible, stops when hidden
  - Hooks: `useInboxTasks`, `useTodaysTasks`, `useProjectTasks`, `useMeetings`, `useDailyFlow`, `useTimelineDashboard`, `useTeams`, `useProjects`, `useProfiles`, `useNotifications`
  - Cache invalidation: Server actions call `invalidate*()` with `immediate: true`

## Authentication & Identity

**Auth Provider:**

- **Supabase Auth**
  - Implementation: Server-side via middleware, SSR-compatible cookie handling
  - Flow: Email/password, magic links (OTP type: signup, recovery, email_change)
  - Session: JWT claims via `auth.getClaims()`, cookies managed by `@supabase/ssr`
  - Middleware: `middleware.ts` - Protects all routes except `/auth/*` and `/api/*`
  - Redirect: Unauthenticated users → `/auth/login`, authenticated on login page → `/`
  - Confirmation: `app/auth/confirm/route.ts` handles email confirmation callbacks

**Authorization:**

- Row-Level Security (RLS) in Supabase
- Role-based access: `profiles.role` (`admin` | `employee`)
- Multi-tenant: `workspace_id` isolation via `workspace_members` table
- Authorization helpers: `app/actions/index.ts` (`isUserAdmin`, `canDelete*`)

## Monitoring & Observability

**Error Tracking:**

- None (console-based logging)

**Logs:**

- Server-side: Node.js console output (stripped in production via Next.js compiler)
- Client-side: Browser console (production source maps disabled)
- Pattern: `console.log`, `console.error`, `console.warn` with context tags like `[functionName]`

## CI/CD & Deployment

**Hosting:**

- Vercel (production URL: https://qualia-erp.vercel.app)
- Auto-deploy from `master` branch
- Framework: Next.js 16+ (App Router)

**CI Pipeline:**

- Git Hooks: Husky + lint-staged for pre-commit checks
  - ESLint auto-fix on `*.{ts,tsx}`
  - Prettier formatting on all staged files
  - Runs via `.husky/pre-commit` → `npx lint-staged`
- No external CI (GitHub Actions, CircleCI, etc.) - relies on Vercel build pipeline

**Cron Jobs:**

- Vercel Cron (configured in `vercel.json`)
  - Daily reminders: `/api/cron/reminders` at 9:00 AM (0 9 \* \* \*)
  - Blog tasks: `/api/cron/blog-tasks` at 3:00 AM (0 3 \* \* \*)
  - Research tasks: `/api/cron/research-tasks` at 3:05 AM (5 3 \* \* \*)
  - Auth: `CRON_SECRET` header verification

## Environment Configuration

**Required env vars:**

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Public anon key
- `NEXT_PUBLIC_VAPI_PUBLIC_KEY` - VAPI public key
- `NEXT_PUBLIC_APP_URL` - Application base URL (defaults to https://qualia-erp.vercel.app)
- `VAPI_WEBHOOK_SECRET` - Webhook signature verification
- `RESEND_API_KEY` - Email sending
- `OPENROUTER_API_KEY` - AI model access
- `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini embeddings
- `ELEVENLABS_API_KEY` - Text-to-speech
- `CRON_SECRET` - Cron job authentication
- `VERCEL_WEBHOOK_SECRET` - Deployment webhook verification
- `ZOHO_CLIENT_SECRET` - Zoho OAuth

**Secrets location:**

- Development: `.env.local` (gitignored)
- Production: Vercel environment variables dashboard
- Template: `.env.example` (committed, no secrets)

## Webhooks & Callbacks

**Incoming:**

- `POST /api/vapi/webhook` - VAPI tool calls (signature: `VAPI_WEBHOOK_SECRET`)
  - Handles: get_projects, create_issue, get_team_members, get_schedule, search_knowledge_base, get_client_info
  - Implementation: `app/api/vapi/webhook/route.ts`, `lib/vapi-webhook-handlers.ts`

- `POST /api/webhooks/vercel` - Vercel deployment events (HMAC SHA-1: `VERCEL_WEBHOOK_SECRET`)
  - Implementation: `app/api/webhooks/vercel/route.ts`

- `GET /app/auth/confirm` - Supabase email confirmation (type: signup, recovery, email_change)
  - Implementation: `app/auth/confirm/route.ts`

**Outgoing:**

- None (all integrations use request-response pattern, not webhooks)

## Content Security Policy (CSP)

**Configured in:** `next.config.ts`

**Key Directives:**

- `script-src`: VAPI CDN, ElevenLabs, Vercel Live, unsafe-inline/eval for AI SDK
- `connect-src`: Supabase (HTTP/WSS), OpenRouter, Gemini API, VAPI (HTTP/WSS), ElevenLabs, Telnyx (WSS), Vercel Live
- `media-src`: Blob, HTTPS, mediastream (for VAPI voice calls)
- `img-src`: Supabase Storage (\*.supabase.co), data URIs, HTTPS, blob
- `worker-src`: Blob (for Web Workers)

**Permissive Exceptions:**

- `unsafe-inline`, `unsafe-eval` - Required for AI SDK streaming and VAPI initialization
- Microphone: `(self)` - VAPI voice input
- Camera: `()` - Disabled
- Geolocation: `()` - Disabled

---

_Integration audit: 2026-03-01_
