# Qualia Workflow Walkthroughs

> Real-world scenarios you'll encounter at Qualia, walked through step by step.
> These complement the [Trainee Onboarding Guide](./trainee-onboarding.md) with hands-on examples.

---

## Table of Contents

1. [Building an AI Chat Agent End-to-End](#1-building-an-ai-chat-agent-end-to-end)
2. [Shipping a Voice Agent with Retell AI](#2-shipping-a-voice-agent-with-retell-ai)
3. [Adding a Feature to an Existing Project](#3-adding-a-feature-to-an-existing-project)
4. [Debugging a Production Bug](#4-debugging-a-production-bug)
5. [Database Migration & Schema Change](#5-database-migration--schema-change)
6. [Building a Client Website from Design to Deploy](#6-building-a-client-website-from-design-to-deploy)
7. [Handling a Client Hotfix](#7-handling-a-client-hotfix)

---

## 1. Building an AI Chat Agent End-to-End

**Scenario**: A new client (let's say "Bloom Clinic") wants an AI assistant on their website that answers questions about their services, books appointments, and speaks Arabic + English.

### Step 1: Gather requirements

Before touching code, nail down exactly what the agent needs to do.

```markdown
# Bloom Clinic - Project Brief

## Client: Bloom Clinic (Nicosia, Cyprus)

## Category: ai-agent

## Languages: English, Arabic

### Goals

- Answer FAQs about clinic services
- Help users book appointments
- Bilingual (detect language, respond accordingly)

### Data Sources

- Services list (PDF from client)
- Pricing sheet
- FAQ document

### Integrations

- Booking system API (REST)
- WhatsApp notifications (optional, phase 2)
```

Save this to `.planning/PROJECT.md` in the project root.

### Step 2: Scaffold the project

```bash
# Create the repo
gh repo create qualiasolutions/bloom-clinic --private

# Clone and set up
cd ~/Projects/aiagents/
git clone git@github.com:qualiasolutions/bloom-clinic.git
cd bloom-clinic

# Copy our AI agent starter template
cp -r ~/Projects/qualia-erp/templates/ai-agent-starter/* .

# Install dependencies
npm install

# Add AI SDK + Gemini
npm install ai @ai-sdk/google zod
```

### Step 3: Set up Supabase

```bash
# Create project via Supabase MCP or dashboard
# Get credentials, add to .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
```

Create the schema - tables for conversations, messages, and the knowledge base:

```sql
-- supabase/migrations/001_initial.sql

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  category TEXT,
  language TEXT DEFAULT 'en'
);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own conversations"
  ON conversations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users see own messages"
  ON messages FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );
```

### Step 4: Build the chat endpoint

The core of every AI agent is `app/api/chat/route.ts`:

```typescript
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { messages, conversationId } = await req.json();

  // Fetch relevant knowledge for the last user message
  const lastMessage = messages[messages.length - 1]?.content || '';
  const { data: docs } = await supabase.rpc('match_documents', {
    query_text: lastMessage,
    match_count: 5,
  });

  const context = docs?.map((d: { content: string }) => d.content).join('\n\n') || '';

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: `You are Bloom Clinic's assistant. You help patients learn about services and book appointments.

Context from knowledge base:
${context}

Rules:
- If the user writes in Arabic, respond in Arabic
- Be warm and professional
- For bookings, collect: name, phone, preferred date, service
- Never make up information not in the context`,
    messages,
  });

  return result.toDataStreamResponse();
}
```

### Step 5: Build the chat UI

Use shadcn/ui components. The chat interface needs:

- Message list with user/assistant bubbles
- Input field with send button
- RTL support for Arabic messages
- Typing indicator during streaming

### Step 6: Embed knowledge base

Load the client's PDFs and FAQ into the `knowledge_base` table with embeddings. Use the embeddings API route to generate vectors.

### Step 7: Test and deploy

```bash
# Local testing
npm run dev
# Test in both English and Arabic
# Test edge cases: gibberish input, very long messages, empty messages

# Build check
npm run build

# Deploy
vercel --prod

# Verify
curl -s -o /dev/null -w "%{http_code}" https://bloom-clinic.vercel.app
# Should return 200
```

### Step 8: Client handoff

- Walk the client through the chat interface
- Show them the Supabase dashboard (conversation logs)
- Provide the embed script if they want it on their existing site
- Document everything in the project README

---

## 2. Shipping a Voice Agent with Retell AI

**Scenario**: A restaurant chain ("Tasos Grill") needs a phone-based AI that takes reservations, answers menu questions, and handles both Greek and English callers.

### Step 1: Define the voice persona

This is the most important step for voice agents. Write it down before touching code:

```markdown
# Voice Persona

Name: "Sofia" (the restaurant's virtual hostess)
Personality: Warm, efficient, slightly casual
Languages: Greek (primary), English
Accent: Cypriot Greek
First message: "Yia sas! Welcome to Tasos Grill, I'm Sofia. How can I help you today?"

## Conversation flows:

1. Reservation → collect: name, date, time, party size, special requests
2. Menu inquiry → answer from menu knowledge base
3. Hours/location → provide info
4. Transfer to human → if request is beyond capability
```

### Step 2: Create the project

```bash
gh repo create qualiasolutions/tasos-voice --private
cd ~/Projects/voice/
git clone git@github.com:qualiasolutions/tasos-voice.git
cd tasos-voice

# Copy voice starter
cp -r ~/Projects/qualia-erp/templates/voice-starter/* .
npm install

# Initialize Supabase for call logging
supabase init
```

### Step 3: Configure Retell AI

In the [Retell AI dashboard](https://dashboard.retellai.com):

1. Create a new agent
2. Select an ElevenLabs voice (or clone a custom voice)
3. Set the LLM: use OpenRouter for model flexibility
4. Write the system prompt with the persona above
5. Set the first message / greeting
6. Configure language settings (Greek + English)

Save the agent ID and API key to your `.env.local`.

### Step 4: Define tools

Tools are what the voice agent can DO. Define them in your Retell agent's tool configuration:

```json
[
  {
    "name": "create_reservation",
    "description": "Create a restaurant reservation",
    "parameters": {
      "type": "object",
      "properties": {
        "customer_name": { "type": "string" },
        "date": { "type": "string", "description": "YYYY-MM-DD" },
        "time": { "type": "string", "description": "HH:MM" },
        "party_size": { "type": "integer" },
        "special_requests": { "type": "string" }
      },
      "required": ["customer_name", "date", "time", "party_size"]
    }
  },
  {
    "name": "check_availability",
    "description": "Check table availability for a given date and time",
    "parameters": {
      "type": "object",
      "properties": {
        "date": { "type": "string" },
        "time": { "type": "string" },
        "party_size": { "type": "integer" }
      },
      "required": ["date", "time", "party_size"]
    }
  }
]
```

### Step 5: Build the webhook handler

In `supabase/functions/voice-webhook/index.ts` (Supabase Edge Function):

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify Retell webhook secret
  const signature = req.headers.get('x-retell-signature');
  if (!signature || signature !== Deno.env.get('RETELL_WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Route by event type
  switch (body.event) {
    case 'call_started':
      await supabase.from('calls').insert({ retell_call_id: body.call.call_id, status: 'started' });
      return new Response(JSON.stringify({ ok: true }));

    case 'call_ended':
      await supabase
        .from('calls')
        .update({
          status: 'ended',
          transcript: body.call.transcript,
          duration: body.call.end_timestamp - body.call.start_timestamp,
        })
        .eq('retell_call_id', body.call.call_id);
      return new Response(JSON.stringify({ ok: true }));

    case 'tool_call':
      const { name, arguments: args } = body.tool_call;
      let result;
      switch (name) {
        case 'create_reservation':
          result = await createReservation(args, supabase);
          break;
        case 'check_availability':
          result = await checkAvailability(args, supabase);
          break;
        default:
          result = { error: 'Unknown tool' };
      }
      return new Response(JSON.stringify({ result }));

    default:
      return new Response(JSON.stringify({ ok: true }));
  }
});
```

### Step 6: Test the agent

```bash
# Deploy edge function
supabase functions deploy voice-webhook

# Set secrets
supabase secrets set RETELL_WEBHOOK_SECRET=your_secret
supabase secrets set RETELL_API_KEY=your_key

# Configure Retell webhook URL to: https://[project-ref].supabase.co/functions/v1/voice-webhook

# Test from Retell dashboard:
# 1. Simple reservation in English
# 2. Reservation in Greek
# 3. Menu question
# 4. Edge case: past date, party of 50, no availability
```

### Step 7: Go live

```bash
# Deploy edge function to production
supabase functions deploy voice-webhook --project-ref [prod-ref]

# Set production secrets
supabase secrets set RETELL_WEBHOOK_SECRET=prod_secret --project-ref [prod-ref]

# Update Retell agent with production webhook URL
# Connect phone number in Retell dashboard
# Make a real phone call to test
```

---

## 3. Adding a Feature to an Existing Project

**Scenario**: The Aquador platform (existing project, already live) needs a new "Client Portal" where clients can log in and see their project status, invoices, and communicate with their project manager.

### Step 1: Explore before you build

Never jump into code on an existing project. Understand the landscape first.

```bash
cd ~/Projects/platforms/aquador

# Read the project's CLAUDE.md
cat CLAUDE.md

# Check the current branch situation
git status && git branch -a

# Understand the current architecture
ls app/ components/ lib/
```

Key questions to answer before writing code:

- What auth system is already in place?
- How is data fetched (server actions? API routes? SWR?)
- What UI patterns are already established?
- Are there existing client/user role distinctions?

### Step 2: Create a feature branch

```bash
git checkout -b feature/client-portal
```

### Step 3: Plan the data model

Before writing code, sketch what you need in the database:

```sql
-- What already exists? Check profiles table for role column
-- Usually: role = 'admin' | 'employee'
-- Need to add: 'client' role

-- New tables needed:
-- client_portal_access: links clients to their projects
-- client_messages: communication thread between client and team
```

### Step 4: Build incrementally

Don't build everything at once. Ship in this order:

**4a. Database migration** - Add tables, RLS policies
**4b. Auth & middleware** - Client role, route protection
**4c. Server actions** - Data fetching for the portal
**4d. UI pages** - The actual portal interface
**4e. Notifications** - Email when project status changes

Each step should result in a commit:

```bash
git add supabase/migrations/xxx_client_portal.sql
git commit -m "feat: add client portal schema and RLS"

# ... build auth changes ...
git commit -m "feat: add client role to auth middleware"

# ... build server actions ...
git commit -m "feat: add client portal server actions"

# ... build UI ...
git commit -m "feat: add client portal pages and components"
```

### Step 5: Follow existing patterns

This is critical. Look at how the existing project does things and match that:

```typescript
// If the project uses server actions with ActionResult:
export async function getClientProjects(clientId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Always check auth first
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Match existing query patterns
  const { data, error } = await supabase
    .from('projects')
    .select('*, client:clients(*)')
    .eq('client_id', clientId);

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}
```

```typescript
// If the project uses SWR hooks, add a new one following the same pattern:
export function useClientProjects(clientId: string) {
  return useSWR(
    clientId ? `client-projects-${clientId}` : null,
    () => getClientProjects(clientId),
    { refreshInterval: 45000 }
  );
}
```

### Step 6: Test the feature

```bash
npm run build   # Must pass
npm run lint    # Must pass
npx tsc --noEmit  # Must pass (always do this after multi-file TS changes)
npm test        # Run existing tests, make sure nothing breaks
```

### Step 7: Deploy and verify

```bash
git push -u origin feature/client-portal

# Create a PR
gh pr create --title "feat: add client portal" --body "..."

# After review, merge and deploy
vercel --prod

# Verify the new feature works in production
# Check: can clients log in? can they see their projects? RLS working?
```

---

## 4. Debugging a Production Bug

**Scenario**: The Maud platform is live. A user reports: "When I click 'Complete Project', nothing happens. It worked yesterday."

### Step 1: Reproduce and gather info

Don't guess. Get facts.

```bash
cd ~/Projects/platforms/maud

# Check recent commits - what changed since "yesterday"?
git log --oneline -10

# Check if there was a recent deployment
vercel ls --app maud
```

Check production logs:

```bash
# Vercel function logs
vercel logs --app maud | grep -i error

# Supabase logs (via MCP or dashboard)
# Look for failed queries, RLS denials, or function errors
```

### Step 2: Reproduce locally

```bash
npm run dev
# Navigate to a project, try to click "Complete Project"
# Open browser DevTools → Console and Network tabs
# Look for: failed API calls, error messages, 403/500 responses
```

### Step 3: Trace the code path

Follow the click through the codebase:

```
Button onClick → server action → Supabase query → response
```

```bash
# Find where "Complete Project" lives
grep -r "Complete Project" components/ app/
# → Found in components/project/project-actions.tsx

# Find the action it calls
grep -r "completeProject" app/actions
# → Found in app/actions.ts line 847
```

Read the action, check:

- Is the Zod validation rejecting the input?
- Is the Supabase query correct?
- Did a column name change in a recent migration?
- Is RLS blocking the update?

### Step 4: Find the root cause

Common culprits (in order of likelihood):

1. **RLS policy changed** - A migration altered permissions
2. **Column renamed/removed** - Schema change without updating code
3. **Auth token expired** - Middleware issue
4. **Type mismatch** - Enum value changed

Example: You discover a recent migration added a `completed_by` NOT NULL column but the action doesn't set it:

```typescript
// Bug: missing completed_by field
const { error } = await supabase
  .from('projects')
  .update({ status: 'completed' }) // Missing completed_by!
  .eq('id', projectId);

// Fix:
const {
  data: { user },
} = await supabase.auth.getUser();
const { error } = await supabase
  .from('projects')
  .update({
    status: 'completed',
    completed_by: user!.id, // Add the required field
    completed_at: new Date().toISOString(),
  })
  .eq('id', projectId);
```

### Step 5: Fix, test, deploy

```bash
# Fix the bug
# Test locally - verify the button works now
npm run build  # Make sure build passes

# Commit on a fix branch
git checkout -b fix/complete-project-bug
git add app/actions.ts
git commit -m "fix: add completed_by field to completeProject action"
git push -u origin fix/complete-project-bug

# Deploy immediately (production bug)
vercel --prod

# Verify the fix
curl -s -o /dev/null -w "%{http_code}" https://maud.vercel.app
# Test the complete project flow in production
```

### Step 6: Prevent recurrence

After fixing, ask: "How do we stop this from happening again?"

- Add a test for the `completeProject` action
- If the issue was a migration without code update, add a CI check
- Document the incident briefly in your daily log

---

## 5. Database Migration & Schema Change

**Scenario**: The Qualia internal suite needs a new `payments` table and you need to add a `budget` column to the existing `projects` table. This is a live system with real data.

### Step 1: Plan the migration

Write the SQL migration BEFORE applying it. Think about:

- Will this break existing queries?
- Do I need a default value for the new column?
- What RLS policies are needed?
- Do I need to backfill data?

```sql
-- supabase/migrations/20240315_add_payments.sql

-- Add budget to existing projects table (safe: nullable, no default needed)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';

-- Create payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'canceled')),
  due_date DATE,
  paid_date DATE,
  invoice_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_payments_project ON payments(project_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with payments"
  ON payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'employee'
    )
  );
```

### Step 2: Test on a branch database (if available)

```bash
# If using Supabase branching:
# Create a branch, apply migration there first, test

# Otherwise, review the SQL carefully:
# - No DROP statements on existing tables
# - ALTER TABLE uses IF NOT EXISTS / IF EXISTS
# - New tables have RLS enabled
# - Foreign keys have appropriate ON DELETE behavior
```

### Step 3: Apply the migration

```bash
# Via Supabase MCP (preferred):
# Use mcp__supabase__apply_migration

# Or via CLI:
supabase db push
```

### Step 4: Regenerate TypeScript types

After any schema change, regenerate types immediately:

```bash
# Via Supabase MCP:
# Use mcp__supabase__generate_typescript_types
# Save output to types/database.ts
```

### Step 5: Update application code

Now update the codebase to use the new schema:

```typescript
// 1. Add Zod validation schema (lib/validation.ts)
export const createPaymentSchema = z.object({
  project_id: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('EUR'),
  status: z.enum(['pending', 'paid', 'overdue', 'canceled']).default('pending'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

// 2. Add server actions (app/actions/payments.ts)
// 3. Add SWR hooks (lib/swr.ts)
// 4. Build UI components
```

### Step 6: Verify everything still works

```bash
# Type check - catches mismatches between schema and code
npx tsc --noEmit

# Build - catches any broken imports
npm run build

# Test existing functionality hasn't broken
npm test
```

---

## 6. Building a Client Website from Design to Deploy

**Scenario**: A law firm ("Kypros Legal") needs a marketing website with: Home, About, Services, Team, Contact pages. They've sent brand guidelines and content.

### Step 1: Set up the project

```bash
gh repo create qualiasolutions/kypros-legal --private
cd ~/Projects/websites/
git clone git@github.com:qualiasolutions/kypros-legal.git
cd kypros-legal

cp -r ~/Projects/qualia-erp/templates/website-starter/* .
npm install

# Add animation library
npm install framer-motion
```

### Step 2: Set up the design system

Before building pages, establish the visual foundation in `tailwind.config.ts`:

```typescript
export default {
  theme: {
    extend: {
      colors: {
        // From client's brand guidelines
        primary: { DEFAULT: '#1B3A4B', light: '#2D5F7A' },
        accent: { DEFAULT: '#C8A96E', light: '#D4BE8E' },
        surface: { DEFAULT: '#F8F6F0', dark: '#E8E4DA' },
      },
      fontFamily: {
        // Distinctive fonts - never use Inter/Arial
        heading: ['Playfair Display', 'serif'],
        body: ['Source Sans 3', 'sans-serif'],
      },
    },
  },
};
```

Add the fonts in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link
  href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;600&display=swap"
  rel="stylesheet"
/>
```

### Step 3: Build the layout shell

Navigation + Footer first, then pages. Follow Qualia's frontend standards:

- Layered backgrounds, subtle gradients
- CSS transitions on interactive elements
- Staggered entrance animations
- No generic card grids

### Step 4: Build pages one by one

Work through each page, getting client approval before moving to the next:

1. **Home** - Hero with strong headline, services overview, CTA
2. **About** - Firm story, values, timeline
3. **Services** - Each practice area with details
4. **Team** - Attorney profiles with photos
5. **Contact** - Form (with validation), map, office info

For the contact form, keep it simple - use Resend or a form service:

```typescript
// No Supabase needed for a basic marketing site
// Use a serverless function or Resend for the contact form

async function handleSubmit(formData: FormData) {
  const res = await fetch('/api/contact', {
    method: 'POST',
    body: JSON.stringify({
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message'),
    }),
  });
  // Handle response
}
```

### Step 5: Performance and SEO

Websites need extra attention on SEO since they're public-facing:

```bash
# Check bundle size
npm run build
# Look at the output - aim for < 200KB initial JS

# Add meta tags to every page
# Add Open Graph tags for social sharing
# Add structured data (JSON-LD) for the law firm
# Create a sitemap.xml
# Set up proper robots.txt
```

### Step 6: Responsive testing

Test at every breakpoint. Law firm sites get traffic from all devices:

```
- Mobile: 375px (iPhone SE), 390px (iPhone 14)
- Tablet: 768px (iPad), 1024px (iPad Pro)
- Desktop: 1280px, 1440px, 1920px
```

### Step 7: Deploy with custom domain

```bash
# Deploy to Vercel
vercel link
vercel --prod

# Set up custom domain
# 1. Vercel Dashboard → Domains → Add "kyproslegal.com"
# 2. Client updates DNS:
#    - A record: 76.76.21.21
#    - CNAME: cname.vercel-dns.com (for www)
# 3. Wait for SSL provisioning (automatic)

# Verify
curl -s -o /dev/null -w "%{http_code}" https://kyproslegal.com
```

---

## 7. Handling a Client Hotfix

**Scenario**: It's 9 PM. A client messages: "Our website shows an error page to all visitors. Please fix ASAP." The site is live, customers can't access it.

### Step 1: Assess the damage (2 minutes max)

Don't investigate the root cause yet. First, confirm what's broken:

```bash
# Is the site actually down?
curl -s -o /dev/null -w "%{http_code}" https://clientsite.com
# 500 = server error, 404 = routing issue, 200 = maybe client-side error

# Check Vercel deployment status
vercel ls --app clientsite

# Check if Supabase is up
curl -s -o /dev/null -w "%{http_code}" https://xxxxx.supabase.co/rest/v1/
```

### Step 2: Check recent changes

```bash
cd ~/Projects/[category]/clientsite

# What changed recently?
git log --oneline -5

# Was there a deployment today?
vercel inspect [deployment-url]
```

90% of "it was working yesterday" bugs come from one of:

- A deployment with a build error that Vercel still served
- An environment variable that expired or was removed
- A Supabase migration that broke something
- A third-party API that changed or went down

### Step 3: Quick rollback if needed

If the site is completely down and you can't find the fix immediately, **roll back first, investigate second**:

```bash
# List recent deployments
vercel ls --app clientsite

# Promote a previous working deployment
vercel promote [previous-deployment-url] --yes

# Now the site is back up with the previous version
# You have breathing room to investigate
```

### Step 4: Find and fix the root cause

Now with the site back up (or if you skipped rollback because the issue is minor):

```bash
# Check Vercel function logs for errors
vercel logs --app clientsite 2>&1 | head -50

# Check build logs of the latest deployment
vercel inspect [latest-deployment] --logs

# Common quick fixes:

# 1. Environment variable issue
# Check Vercel Dashboard → Settings → Environment Variables
# Add any missing vars through the dashboard (NEVER use vercel env add)
# Then redeploy: vercel --prod

# 2. Build error - fix code and redeploy
npm run build  # Reproduce locally
# Fix the error
git checkout -b fix/production-error
git add .
git commit -m "fix: resolve production error in [component]"
git push -u origin fix/production-error
vercel --prod

# 3. Supabase issue - check via MCP
# Paused project? RLS blocking? Migration broke something?
```

### Step 5: Verify the fix

```bash
# Full verification checklist
curl -s -o /dev/null -w "%{http_code}" https://clientsite.com
# Must be 200

# Check key pages
curl -s -o /dev/null -w "%{http_code}" https://clientsite.com/about
curl -s -o /dev/null -w "%{http_code}" https://clientsite.com/services

# Check API latency
curl -w "%{time_total}" -s -o /dev/null https://clientsite.com
# Should be < 500ms
```

### Step 6: Communicate with the client

Once fixed, message the client:

- Confirm the fix is deployed
- Brief explanation of what happened (non-technical)
- What you did to prevent it from happening again

### Step 7: Post-mortem (next day)

Add a note to your daily log:

- What broke and why
- How long it was down
- What the fix was
- What to add to prevent this (monitoring, tests, CI checks)

---

## General Tips Across All Walkthroughs

### Always follow the commit convention

```
feat: new feature
fix: bug fix
refactor: code restructure (no behavior change)
style: formatting, CSS
docs: documentation
test: adding tests
chore: build, deps, config
```

### Always verify after deploying

```bash
curl -s -o /dev/null -w "%{http_code}" https://site.com  # HTTP 200
# Test auth flow
# Check console for errors
# Check API latency < 500ms
```

### When in doubt, read before writing

- Read the project's CLAUDE.md
- Read existing code patterns before adding new ones
- Read recent git history to understand context
- Read the error message carefully before guessing

### Use the right commands

| Situation                        | Command          |
| -------------------------------- | ---------------- |
| Most tasks (build, fix, improve) | `/qualia-quick`  |
| Premium UI work                  | `/qualia-design` |
| Plan a project phase             | `/qualia-plan`   |
| Execute a project phase          | `/qualia-build`  |
| Deploy to production             | `/qualia-ship`   |
| Code review                      | `/qualia-review` |
| Design/UX polish pass            | `/qualia-polish` |

Or just describe what you want and say "and ship" — no command needed.
