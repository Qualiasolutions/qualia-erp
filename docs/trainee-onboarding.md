# Qualia Project Workflow - Trainee Onboarding Guide

> Complete step-by-step workflow for building Qualia projects from scratch.

---

## Workflow Guides (Read These First)

Before diving into project phases, read these practical guides:

| Guide                                               | What it covers                                   |
| --------------------------------------------------- | ------------------------------------------------ |
| [Vercel Basics](./guides/vercel-basics.md)          | Deployments, env vars, domains, rollbacks        |
| [Supabase Basics](./guides/supabase-basics.md)      | Dashboard, API keys, auth setup, storage         |
| [Environment Variables](./guides/env-vars-guide.md) | Where keys come from, how to set them everywhere |
| [Qualia Commands](./guides/qualia-commands.md)      | Claude Code slash commands and daily workflows   |
| [Git Workflow](./guides/git-workflow.md)            | Branches, commits, PRs — the Qualia way          |
| [Troubleshooting](./guides/troubleshooting.md)      | When things break, check this first              |
| [Walkthroughs](./walkthroughs.md)                   | Real-world project scenarios step by step        |

---

## How to Use This Guide

1. **Start each project by copying the appropriate template** from `templates/`
2. **Fill out `PROGRESS.md`** at the start - this tracks your progress through each phase
3. **Update `PROGRESS.md` daily** - check off tasks as you complete them, add notes and blockers
4. **Manager can review `PROGRESS.md`** to see status and provide feedback

**Progress Tracker Location**: Each template includes a `PROGRESS.md` with phase-by-phase checklists.

---

## Quick Reference

| Phase       | Description                      | Time            |
| ----------- | -------------------------------- | --------------- |
| **Phase 0** | Client onboarding & requirements | Before starting |
| **Phase 1** | Project initialization           | Day 1           |
| **Phase 2** | Supabase setup                   | Day 1           |
| **Phase 3** | Core development                 | Ongoing         |
| **Phase 4** | Testing                          | Before deploy   |
| **Phase 5** | Pre-deployment checklist         | Before deploy   |
| **Phase 6** | Vercel deployment                | Deploy day      |
| **Phase 7** | Ongoing maintenance              | Post-launch     |

---

## Project Categories

| Category      | Stack                                                  | Template                      | Use Case                   |
| ------------- | ------------------------------------------------------ | ----------------------------- | -------------------------- |
| **AI Agents** | Next.js 15+ + OpenRouter/Gemini + Supabase + shadcn/ui | `templates/ai-agent-starter/` | Chat agents, AI personas   |
| **Platforms** | Next.js 16+ + Server Actions + SWR + VAPI              | `templates/platform-starter/` | Internal tools, dashboards |
| **Voice**     | VAPI + Cloudflare Workers (Deno)                       | `templates/voice-starter/`    | Voice assistants           |
| **Websites**  | React + Vite + Tailwind                                | `templates/website-starter/`  | Marketing sites            |

---

## Phase 0: Client Onboarding & Requirements

### 0.1 Initial Client Meeting

- [ ] Understand client's business and goals
- [ ] Identify target audience
- [ ] Define project scope (what's in, what's out)
- [ ] Determine project category (AI agent, platform, voice, website)

### 0.2 Gather Brand Assets

```bash
# Create Knowledge Base folder for client assets
mkdir -p "Knowledge Base/[client-name]"
```

**Required assets:**

- [ ] Logo (SVG, PNG, different variants)
- [ ] Brand colors (primary, secondary, accent)
- [ ] Typography (fonts, sizes)
- [ ] Tone of voice guidelines
- [ ] Existing website/materials for reference

### 0.3 Technical Requirements

- [ ] List of features/pages needed
- [ ] Integration requirements (CRM, email, payment, etc.)
- [ ] User roles and permissions
- [ ] Data to be stored/managed
- [ ] Third-party API credentials (if applicable)

### 0.4 Create Project Brief

```markdown
# [Project Name] - Brief

## Client: [Client Name]

## Category: [ai-agent | platform | voice | website]

## Start Date: [Date]

### Goals

- ...

### Features

- ...

### Brand

- Primary Color: #...
- Font: ...

### Technical Notes

- ...
```

Save to: `Knowledge Base/[client-name]/PROJECT_BRIEF.md`

---

## Phase 1: Project Initialization

### 1.1 Create Repository

```bash
# Create GitHub repo (private by default)
gh repo create qualiasolutions/[project-name] --private

# Or via GitHub web UI at github.com/qualiasolutions
```

### 1.2 Create Local Folder

```bash
# Navigate to correct category
cd ~/Desktop/Projects/[category]/  # aiagents, platforms, voice, websites

# Clone the repo
git clone git@github.com:qualiasolutions/[project-name].git
cd [project-name]
```

### 1.3 Copy Starter Template

```bash
# Copy the appropriate template
cp -r ~/Desktop/Projects/platforms/qualia/templates/[category]-starter/* .

# Install dependencies
npm install
```

**OR initialize from scratch:**

```bash
# AI Agents / Platforms
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false

# Websites
npm create vite@latest . -- --template react-ts

# Voice (Cloudflare Workers)
npm create cloudflare@latest . -- --template hello-world-typescript
```

### 1.4 Setup shadcn/ui (Next.js projects only)

```bash
npx shadcn@latest init
# Select: New York style, Zinc color, CSS variables: yes

npx shadcn@latest add button card dialog dropdown-menu input label select textarea
```

### 1.5 Create CLAUDE.md

Edit the template CLAUDE.md with project-specific info:

- Project name and description
- Client name
- Specific features
- Environment variables needed

### 1.6 Setup Environment

```bash
# Copy example env
cp .env.example .env.local

# Fill in the values (get from Supabase dashboard)
```

### 1.7 First Commit

```bash
git add .
git commit -m "feat: initial project setup"
git push -u origin main
```

---

## Phase 2: Supabase Setup

### 2.1 Create Supabase Project

**Via Dashboard:**

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Select organization: Qualia Solutions
4. Name: `[project-name]`
5. Region: Frankfurt (eu-central-1) for EU clients

**Via Claude MCP:**

```
Use mcp__supabase__create_project with organization_id
```

### 2.2 Get Credentials

From Supabase Dashboard → Settings → API:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

Add to `.env.local`

### 2.3 Create Initial Schema

```sql
-- supabase/migrations/20240101000000_initial_schema.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger for new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2.4 Apply Migration

**Via Claude MCP:**

```
Use mcp__supabase__apply_migration
```

**Via Supabase CLI:**

```bash
supabase db push
```

### 2.5 Generate TypeScript Types

**Via Claude MCP:**

```
Use mcp__supabase__generate_typescript_types
```

Save output to `types/database.ts`

### 2.6 Verify Setup

```bash
npm run dev
# Check that Supabase connection works
```

---

## Phase 3: Core Development

### 3.1 Server Actions Pattern (Next.js)

Create `app/actions.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Standard ActionResult type
export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// Example: Create item with Zod validation
const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export async function createItem(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const parsed = createItemSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const { data, error } = await supabase.from('items').insert(parsed.data).select().single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/items');
  return { success: true, data };
}
```

### 3.2 Zod Validation Schemas

Create `lib/validation.ts`:

```typescript
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  client_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'active', 'completed']).default('draft'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// Add more schemas as needed
```

### 3.3 SWR Hooks (Client-side data)

Create `lib/swr.ts`:

```typescript
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useProjects() {
  return useSWR('/api/projects', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
}

export function invalidateProjects() {
  mutate('/api/projects');
}
```

### 3.4 Component Structure

```
components/
├── ui/                    # shadcn/ui primitives
├── [feature]/             # Feature-specific components
│   ├── [feature]-list.tsx
│   ├── [feature]-card.tsx
│   ├── [feature]-form.tsx
│   └── [feature]-dialog.tsx
└── providers/             # Context providers
```

### 3.5 Useful Skills

| Task                  | Command |
| --------------------- | ------- |
| Design distinctive UI | `/fd`   |
| Build components      | `/fb`   |
| New feature workflow  | `/nf`   |
| Debug issues          | `/dd`   |

---

## Phase 4: Testing

### 4.1 Setup Testing Framework

**Platforms (Jest):**

```bash
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
```

**Websites (Vitest):**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**E2E (Playwright):**

```bash
npm install -D @playwright/test
npx playwright install
```

### 4.2 Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### 4.3 Coverage Target

Aim for **50% coverage minimum** before deployment.

---

## Phase 5: Pre-Deployment Checklist

### Security

- [ ] RLS policies on ALL tables
- [ ] No hardcoded secrets in code
- [ ] Environment variables set in Vercel
- [ ] Pre-commit hook validates (no secrets, no console.log)

### Performance

- [ ] Images optimized (WebP/AVIF)
- [ ] Bundle size analyzed: `ANALYZE=true npm run build`
- [ ] Database indexes on frequently queried columns

### Code Quality

- [ ] TypeScript strict mode passing
- [ ] ESLint/Biome passing: `npm run lint`
- [ ] Tests passing: `npm test`
- [ ] Build passing: `npm run build`

### Documentation

- [ ] CLAUDE.md complete with architecture
- [ ] README.md updated
- [ ] Environment variables documented in .env.example

### Skill to Use

```
/pr  # Run production-audit for comprehensive check
```

---

## Phase 6: Vercel Deployment

### 6.1 Connect to Vercel

```bash
vercel link
# Select: Qualia Solutions org
# Link to existing project or create new
```

### 6.2 Set Environment Variables

**Via Dashboard:**

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all variables from .env.example

**Via CLI:**

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# ... repeat for all variables
```

### 6.3 Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### 6.4 Verify Deployment

- [ ] Site loads correctly
- [ ] Auth flow works (login, logout)
- [ ] Database operations work (CRUD)
- [ ] No console errors
- [ ] Mobile responsive

### 6.5 Custom Domain (if needed)

1. Vercel Dashboard → Project → Settings → Domains
2. Add domain
3. Update DNS records at registrar

---

## Phase 7: Ongoing Maintenance

### 7.1 Git Workflow

```bash
# Always check status first
git status && git branch

# Create feature branch
git checkout -b feature/[name]

# Make changes...

# Commit with conventional commits
git add .
git commit -m "feat: add new feature"
# or: fix:, docs:, refactor:, test:, chore:

# Push and create PR
git push -u origin feature/[name]
```

### 7.2 Useful Git Skills

```
/gf  # Smart git workflow
```

### 7.3 Update Qualia Internal Suite

After learning new patterns or fixing issues:

```bash
cd ~/Desktop/Projects/platforms/qualia

# Update relevant files
# - docs/ for documentation
# - templates/ for starter templates

git add .
git commit -m "docs: update from [project-name] learnings"
git push
```

### 7.4 Regular Maintenance

```bash
# Run cleanup script weekly
~/.claude/scripts/cleanup.sh

# Update dependencies monthly
npm update
npm audit fix
```

---

## Quick Skills Reference

| Task             | Skill  | Description                        |
| ---------------- | ------ | ---------------------------------- |
| Design UI        | `/fd`  | frontend-master --design           |
| Build components | `/fb`  | frontend-master --build            |
| Modernize legacy | `/fm`  | frontend-master --modernize        |
| Debug issues     | `/dd`  | deep-debug                         |
| Auto-fix         | `/sf`  | smart-fix                          |
| New feature      | `/nf`  | new-feature (plan→TDD→impl→commit) |
| Deploy           | `/dep` | full-deploy                        |
| Production audit | `/pr`  | production-audit                   |
| Database ops     | `/sb`  | supabase                           |
| Voice agent      | `/va`  | voice-agent                        |
| Git workflow     | `/gf`  | git-flow                           |
| Stack research   | `/sr`  | stack-researcher                   |

**List all skills:**

```bash
ls ~/.claude/skills/
```

---

## Troubleshooting

### Supabase Connection Issues

1. Check .env.local has correct values
2. Verify project is not paused in Supabase dashboard
3. Check RLS policies aren't blocking access

### Build Failures

1. Run `npm run lint` for errors
2. Run `npx tsc --noEmit` for type errors
3. Check for missing environment variables

### Deployment Failures

1. Check Vercel build logs
2. Verify all env vars are set in Vercel
3. Check for hardcoded localhost URLs

### Need Help?

- Read project CLAUDE.md first
- Check similar projects in ~/Desktop/Projects/
- Use `/dd` (deep-debug) skill

---

## Templates Location

All starter templates are at:

```
~/Desktop/Projects/platforms/qualia/templates/
├── ai-agent-starter/
├── platform-starter/
├── voice-starter/
└── website-starter/
```

Copy the appropriate one when starting a new project.
