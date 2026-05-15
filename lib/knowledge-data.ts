// Quick reference data for Knowledge Hub

export interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  category: 'supabase' | 'nextjs' | 'swr' | 'validation' | 'auth' | 'deployment';
}

export interface QuickReferenceItem {
  id: string;
  title: string;
  description: string;
  category: 'supabase' | 'nextjs' | 'vercel' | 'ai' | 'patterns';
  content: string[];
  link?: string;
}

export const snippets: CodeSnippet[] = [
  // Supabase Server Client
  {
    id: 'sb-server-client',
    title: 'Supabase Server Client',
    description: 'Create Supabase client for server components/actions',
    code: `import { createClient } from '@/lib/supabase/server';

export async function getData() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('table_name')
    .select('id, name, created_at');

  if (error) throw new Error(error.message);
  return data;
}`,
    language: 'typescript',
    category: 'supabase',
  },
  // Supabase Client with RLS
  {
    id: 'sb-rls-policy',
    title: 'RLS Policy for User Data',
    description: 'Enable Row Level Security for user-isolated data',
    code: `-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view own data"
ON your_table
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert own data"
ON your_table
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
ON your_table
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own data
CREATE POLICY "Users can delete own data"
ON your_table
FOR DELETE
USING (auth.uid() = user_id);`,
    language: 'sql',
    category: 'supabase',
  },
  // Server Action Pattern
  {
    id: 'next-server-action',
    title: 'Server Action with Validation',
    description: 'Pattern for server actions with Zod validation',
    code: `'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
});

export async function createItem(formData: FormData) {
  const supabase = await createClient();

  // Get user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Validate
  const data = schema.safeParse(Object.fromEntries(formData));
  if (!data.success) {
    return { success: false, error: data.error.issues[0].message };
  }

  // Insert
  const { error } = await supabase
    .from('items')
    .insert({ ...data.data, user_id: user.id });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/items');
  return { success: true };
}`,
    language: 'typescript',
    category: 'nextjs',
  },
  // SWR Hook Pattern
  {
    id: 'swr-hook',
    title: 'SWR Hook with Auto-Refresh',
    description: 'Create SWR hook for data fetching with cache invalidation',
    code: `'use client';

import useSWR, { mutate } from 'swr';
import { cacheKeys, swrConfig } from '@/lib/swr';

// Auto-refresh when tab visible (45s), stop when hidden
const autoRefreshConfig = {
  ...swrConfig,
  revalidateOnFocus: true,
  refreshInterval: () => (document.visibilityState === 'visible' ? 45000 : 0),
};

export function useItems() {
  const { data, error, isLoading } = useSWR(
    cacheKeys.items,
    () => fetch('/api/items').then(r => r.json()),
    autoRefreshConfig
  );

  return {
    items: data || [],
    isLoading,
    error,
  };
}

// Invalidate cache after mutation
export function invalidateItems() {
  mutate(cacheKeys.items, undefined, { revalidate: true });
}`,
    language: 'typescript',
    category: 'swr',
  },
  // FK Normalization
  {
    id: 'fk-normalization',
    title: 'Normalize Supabase FK Arrays',
    description: 'Supabase returns foreign keys as arrays - normalize them',
    code: `// Supabase returns FKs as arrays - use this helper
type FKResponse<T> = T | T[] | null;

export function normalizeFKResponse<T extends Record<string, unknown>>(
  data: T,
  keys: (keyof T)[]
): T {
  const normalized = { ...data };

  for (const key of keys) {
    const value = normalized[key];
    if (Array.isArray(value) && value.length > 0) {
      normalized[key] = value[0] as T[Extract<keyof T, string>];
    } else if (Array.isArray(value)) {
      normalized[key] = null;
    }
  }

  return normalized;
}

// Usage
const project = normalizeFKResponse(data, ['client', 'lead', 'team']);
// project.client is now an object or null, not an array`,
    language: 'typescript',
    category: 'supabase',
  },
  // Auth Check
  {
    id: 'auth-check',
    title: 'Server-Side Auth Check',
    description: 'Check if user is authenticated in server components',
    code: `import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // User is authenticated - render page
  return <div>Protected content</div>;
}`,
    language: 'typescript',
    category: 'auth',
  },
  // Vercel Env Variables
  {
    id: 'vercel-env',
    title: 'Vercel Environment Variables',
    description: 'Required environment variables for Vercel deployment',
    code: `# Required for all projects
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Optional - only if using service role (NEVER client-side)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Integration
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Voice AI
VAPI_PUBLIC_KEY=your-vapi-public-key
VAPI_WEBHOOK_SECRET=your-webhook-secret

# Email
RESEND_API_KEY=re_...

# Always add these in Vercel Project Settings → Environment Variables`,
    language: 'bash',
    category: 'deployment',
  },
  // Zod Form Validation
  {
    id: 'zod-form',
    title: 'Zod Form Validation',
    description: 'Validate FormData with Zod schema',
    code: `import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email'),
  status: z.enum(['active', 'inactive', 'pending']),
});

export function parseFormData<T>(
  schema: z.ZodSchema<T>,
  formData: FormData
): { success: true; data: T } | { success: false; error: string } {
  const obj = Object.fromEntries(formData);

  // Handle empty strings as null
  for (const [key, value] of Object.entries(obj)) {
    if (value === '' || value === 'null') {
      obj[key] = null;
    }
  }

  const result = schema.safeParse(obj);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || 'Validation failed',
    };
  }

  return { success: true, data: result.data };
}

// Usage in server action
export async function handleSubmit(formData: FormData) {
  const parsed = parseFormData(schema, formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }
  // Use parsed.data
}`,
    language: 'typescript',
    category: 'validation',
  },
];

export const quickReferences: QuickReferenceItem[] = [
  // Supabase
  {
    id: 'sb-create-table',
    title: 'Create a New Table',
    description: 'Steps to add a new database table',
    category: 'supabase',
    content: [
      'Open Supabase dashboard → Table Editor',
      'Click "New Table"',
      'Enter table name and columns',
      'Enable Row Level Security (RLS)',
      'Add policies for auth.uid() checks',
      'Run: npx supabase gen types types/database.ts to update types',
    ],
  },
  {
    id: 'sb-migration',
    title: 'Run Migration',
    description: 'Apply database migration',
    category: 'supabase',
    content: [
      'Write migration in supabase/migrations/',
      'Run: npx supabase db push',
      'Or apply specific migration: npx supabase db apply <name>',
      'Generate types: npx supabase gen types types/database.ts',
    ],
  },
  // Next.js
  {
    id: 'next-route-pattern',
    title: 'App Router Structure',
    description: 'File-based routing in Next.js App Router',
    category: 'nextjs',
    content: [
      'app/page.tsx → / (homepage)',
      'app/about/page.tsx → /about',
      'app/blog/[slug]/page.tsx → /blog/my-post',
      'app/api/hello/route.ts → /api/hello',
      'app/layout.tsx → Root layout (wraps all pages)',
      'app/(auth)/login/page.tsx → /login (route group)',
    ],
  },
  {
    id: 'next-rsc',
    title: 'Server vs Client Components',
    description: 'When to use Server vs Client Components',
    category: 'nextjs',
    content: [
      'Server Components (default): Fast, secure, no JS to client',
      'Use for: data fetching, forms, static content',
      'Client Components: Need "use client" at top',
      'Use for: interactivity, hooks (useState, useEffect), browser APIs',
    ],
  },
  // Vercel
  {
    id: 'vercel-deploy',
    title: 'Deploy to Vercel',
    description: 'Quick deployment checklist',
    category: 'vercel',
    content: [
      'Push code to GitHub',
      'Go to Vercel → Add New Project',
      'Import from GitHub',
      'Add environment variables',
      'Click Deploy',
      'Custom domain: Settings → Domains → Add',
    ],
  },
  // AI Integration
  {
    id: 'ai-gemini',
    title: 'Gemini AI Integration',
    description: 'Use Google Gemini in Next.js',
    category: 'ai',
    content: [
      'Install: npm install @ai-sdk/google ai',
      'Set: GOOGLE_GENERATIVE_AI_API_KEY in .env',
      'Create route: app/api/chat/route.ts',
      'Use streamText from ai/sdk/google',
      'See: https://sdk.vercel.ai/providers/google',
    ],
  },
  {
    id: 'ai-vapi',
    title: 'VAPI Voice Agent',
    description: 'Set up VAPI voice assistant',
    category: 'ai',
    content: [
      'Create account at vapi.ai',
      'Create assistant with system prompt',
      'Add functions/tools to assistant',
      'Set webhook URL to your endpoint',
      'Copy VAPI_PUBLIC_KEY to .env',
      'Webhook receives: message.type === "tool-calls"',
    ],
  },
];

export function getSnippetsByCategory(category: CodeSnippet['category']): CodeSnippet[] {
  return snippets.filter((s) => s.category === category);
}

export function getQuickRefsByCategory(
  category: QuickReferenceItem['category']
): QuickReferenceItem[] {
  return quickReferences.filter((r) => r.category === category);
}
