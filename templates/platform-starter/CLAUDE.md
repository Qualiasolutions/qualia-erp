# [Project Name] - Platform

## Overview
Internal platform/dashboard built for [Client Name].

## Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + Auth)
- **State**: SWR for client-side data fetching
- **Mutations**: Server Actions with Zod validation
- **UI**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Fill in Supabase credentials

# Run development server
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Jest watch mode |
| `npm run test:coverage` | Coverage report |

## Project Structure

```
├── app/
│   ├── actions.ts         # Main server actions
│   ├── actions/           # Domain-specific actions
│   ├── api/               # API routes
│   ├── (dashboard)/       # Dashboard routes
│   ├── auth/              # Auth pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── [feature]/         # Feature components
│   └── providers/         # Context providers
├── lib/
│   ├── supabase/          # Supabase clients
│   ├── validation.ts      # Zod schemas
│   ├── swr.ts             # SWR hooks
│   └── utils.ts           # Utilities
└── types/
    └── database.ts        # Supabase types
```

## Architecture

### Server Actions Pattern
All mutations use Server Actions with this pattern:

```typescript
// app/actions.ts
export type ActionResult<T = unknown> = {
  success: boolean
  error?: string
  data?: T
}

export async function createItem(formData: FormData): Promise<ActionResult> {
  // 1. Validate with Zod
  // 2. Execute Supabase query
  // 3. Revalidate path
  // 4. Return ActionResult
}
```

### Data Fetching
- **Server Components**: Direct Supabase queries
- **Client Components**: SWR hooks with auto-revalidation

### Validation
All input validated with Zod schemas in `lib/validation.ts`.

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deployment
- **Platform**: Vercel
- Set all environment variables in Vercel dashboard
- Auto-deploys from main branch

## Client
- **Name**: [Client Name]
- **Brand Color**: [Color]
