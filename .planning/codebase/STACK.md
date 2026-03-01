# Technology Stack

**Analysis Date:** 2026-03-01

## Languages

**Primary:**

- TypeScript 5.x - All application code (strict mode enabled)
- JavaScript - Configuration files (.mjs, .js)

**Secondary:**

- HTML/JSX - React components via TSX
- CSS - Via Tailwind utility classes

## Runtime

**Environment:**

- Node.js 25.6.1

**Package Manager:**

- npm (package-lock.json present)
- Lockfile: Present and committed

## Frameworks

**Core:**

- Next.js 16.0.10 - App Router, React 19, Server Actions, middleware
- React 19.2.1 - UI library with concurrent features
- React DOM 19.2.1 - Browser rendering

**Testing:**

- Jest 30.2.0 - Test runner with jsdom environment
- @testing-library/react 16.3.0 - Component testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers
- @testing-library/user-event 14.6.1 - User interaction simulation
- Playwright 1.57.0 - E2E testing (configured but minimal usage)

**Build/Dev:**

- TypeScript 5.x - Type checking and compilation (target: ES2017)
- Vercel - Deployment platform (auto-deploy from master branch)
- Husky 9.1.7 - Git hooks management
- lint-staged 16.2.7 - Pre-commit file linting
- @next/bundle-analyzer 16.1.1 - Bundle size analysis (ANALYZE=true)

## Key Dependencies

**Critical:**

- @supabase/supabase-js 2.86.0 - PostgreSQL database client
- @supabase/ssr 0.8.0 - Server-side rendering auth helpers
- ai 5.0.104 - Vercel AI SDK for streaming and tool calling
- @ai-sdk/google 2.0.51 - Google Gemini integration
- @ai-sdk/openai 2.0.74 - OpenRouter/OpenAI compatibility layer
- swr 2.3.7 - Data fetching and cache management (45s refresh)
- zod 4.3.5 - Schema validation for all mutations

**UI Framework:**

- Tailwind CSS 3.4.1 - Utility-first styling
- tailwindcss-animate 1.0.7 - Animation utilities
- @radix-ui/\* (14 packages) - Headless UI primitives (avatars, dialogs, dropdowns, selects, etc.)
- shadcn/ui pattern - Components built on Radix + Tailwind
- framer-motion 12.23.26 - Animation library
- lucide-react 0.511.0 - Icon system
- cmdk 1.1.1 - Command palette component
- sonner 2.0.7 - Toast notifications

**AI/Voice:**

- @vapi-ai/web 2.5.2 - Voice AI SDK for real-time calls
- resend 6.6.0 - Transactional email delivery

**Date/Time:**

- date-fns 4.1.0 - Date manipulation and formatting
- date-fns-tz 3.2.0 - Timezone-aware operations
- react-day-picker 9.11.3 - Calendar component

**DnD & Virtualization:**

- @dnd-kit/core 6.3.1 - Drag-and-drop core
- @dnd-kit/sortable 10.0.0 - Sortable lists
- @dnd-kit/utilities 3.2.2 - DnD helpers
- @tanstack/react-virtual 3.13.13 - Virtual scrolling for large lists

**Integrations:**

- @octokit/rest 22.0.1 - GitHub API client
- @vercel/blob 2.2.0 - Blob storage for file uploads

**Infrastructure:**

- next-themes 0.4.6 - Dark mode theming
- geist 1.5.1 - Vercel's Geist font family
- class-variance-authority 0.7.1 - Type-safe component variants
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.4.0 - Tailwind class merging

## Configuration

**Environment:**

- Environment variables via `.env.local` (gitignored)
- `.env.example` template provided (not accessible in current session)
- Required variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Public anon key
  - `NEXT_PUBLIC_VAPI_PUBLIC_KEY` - VAPI public key for voice
  - `VAPI_WEBHOOK_SECRET` - Webhook signature verification
  - `RESEND_API_KEY` - Email sending
  - `OPENROUTER_API_KEY` - AI model access via OpenRouter
  - `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini embeddings
  - `ELEVENLABS_API_KEY` - Text-to-speech
  - `CRON_SECRET` - Vercel cron job authentication
  - `VERCEL_WEBHOOK_SECRET` - Vercel deployment webhooks
  - `ZOHO_CLIENT_SECRET` - Zoho Books/Mail integration
  - `NEXT_PUBLIC_APP_URL` - Application base URL

**Build:**

- `next.config.ts` - Security headers (CSP, HSTS, X-Frame-Options), image optimization (AVIF/WebP), bundle optimization, console removal in prod
- `tsconfig.json` - Strict mode, ES2017 target, path alias `@/*`
- `tailwind.config.ts` - Custom Qualia brand colors, Geist fonts, z-index scale, dark mode class strategy
- `postcss.config.mjs` - Tailwind and Autoprefixer
- `eslint.config.mjs` - Next.js core-web-vitals + TypeScript rules
- `.prettierrc` - 100 char width, single quotes, 2-space tabs, Tailwind plugin
- `jest.config.ts` - jsdom environment, 50% coverage threshold, path alias support
- `vercel.json` - Framework detection, cron jobs (reminders at 9am, blog/research tasks at 3am)

## Platform Requirements

**Development:**

- Node.js 25.6.1 or compatible
- npm 10+ (implied by lock format)
- Git with Husky hooks enabled

**Production:**

- Vercel deployment platform
- Auto-deploy from `master` branch
- Production URL: https://qualia-erp.vercel.app
- Environment variables configured in Vercel dashboard
- Cron jobs run via Vercel Cron (authenticated with `CRON_SECRET`)

---

_Stack analysis: 2026-03-01_
