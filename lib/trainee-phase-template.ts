/**
 * Trainee Project Phase Template
 * 5 phases: Setup → Plan → Frontend → Backend → Ship
 * Tasks are prompts to Claude - copy and use
 */

export type ProjectCategory = 'ai_agent' | 'platform' | 'voice' | 'website';

export interface PhaseItem {
  title: string;
  description?: string;
}

export interface PhaseTemplate {
  name: string;
  description: string;
  items: PhaseItem[];
}

export const PROJECT_CATEGORIES: {
  value: ProjectCategory;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'ai_agent',
    label: 'AI Agent',
    description: 'Chat agents, AI personas, conversational AI',
    icon: 'Bot',
  },
  {
    value: 'platform',
    label: 'Platform',
    description: 'Internal tools, dashboards, web apps',
    icon: 'LayoutDashboard',
  },
  {
    value: 'voice',
    label: 'Voice Agent',
    description: 'Voice assistants, phone bots, IVR',
    icon: 'Phone',
  },
  {
    value: 'website',
    label: 'Website',
    description: 'Marketing sites, landing pages',
    icon: 'Globe',
  },
];

// Base phases used by all categories
const BASE_PHASES: PhaseTemplate[] = [
  {
    name: 'Setup',
    description: 'Get everything ready before coding',
    items: [
      { title: 'Create project folder locally' },
      { title: 'Create GitHub repo' },
      { title: 'Create Supabase project' },
      { title: 'Create Vercel project' },
      { title: 'Get client requirements' },
      { title: 'List MVP features' },
    ],
  },
  {
    name: 'Plan',
    description: 'Create the build plan',
    items: [
      { title: '/workflows:plan "[project] - [MVP features]"' },
      { title: 'Review plans/[project].md' },
      { title: 'Refine or approve plan' },
    ],
  },
  {
    name: 'Frontend',
    description: 'Build UI first, preview deploy',
    items: [
      { title: '/frontend-master --design "[main UI]"' },
      { title: '/frontend-master --build "[component]"' },
      { title: 'Prompt Claude to commit and push' },
      { title: 'Prompt Claude to deploy preview with Vercel CLI' },
      { title: 'Test preview URL' },
      { title: '/responsive (if needed)' },
      { title: 'Repeat for remaining UI' },
    ],
  },
  {
    name: 'Backend',
    description: 'Supabase MCP - prompt what you need',
    items: [
      { title: 'Prompt Claude to plan tables with Supabase MCP' },
      { title: 'Prompt Claude to create tables with RLS using Supabase MCP' },
      { title: 'Prompt Claude to generate TypeScript types with Supabase MCP' },
      { title: 'Connect frontend to backend' },
      { title: 'Prompt Claude to commit and push' },
      { title: 'Prompt Claude to deploy preview with Vercel CLI' },
      { title: 'Test full flow' },
    ],
  },
  {
    name: 'Ship',
    description: 'Test, review, production deploy',
    items: [
      { title: 'Prompt Claude to run tests' },
      { title: '/workflows:review' },
      { title: '/pr (production audit)' },
      { title: 'Verify env vars in Vercel dashboard' },
      { title: 'Prompt Claude to deploy production with Vercel CLI' },
      { title: 'Setup custom domain (if needed)' },
      { title: 'Test production URL' },
      { title: 'Send client production URL' },
      { title: '/workflows:compound' },
    ],
  },
];

// Category-specific phase templates
export const PHASE_TEMPLATES: Record<ProjectCategory, PhaseTemplate[]> = {
  ai_agent: [
    BASE_PHASES[0], // Setup
    BASE_PHASES[1], // Plan
    BASE_PHASES[2], // Frontend
    {
      name: 'Backend',
      description: 'Supabase + AI API',
      items: [
        { title: 'Prompt Claude to plan tables with Supabase MCP' },
        { title: 'Prompt Claude to create tables with RLS using Supabase MCP' },
        { title: 'Prompt Claude to generate TypeScript types with Supabase MCP' },
        { title: 'Add AI API key to .env.local' },
        { title: 'Prompt Claude to create chat API endpoint' },
        { title: 'Connect frontend to backend' },
        { title: 'Prompt Claude to commit and push' },
        { title: 'Prompt Claude to deploy preview with Vercel CLI' },
        { title: 'Test full flow' },
      ],
    },
    BASE_PHASES[4], // Ship
  ],

  platform: [
    BASE_PHASES[0], // Setup
    BASE_PHASES[1], // Plan
    BASE_PHASES[2], // Frontend
    {
      name: 'Backend',
      description: 'Supabase + CRUD',
      items: [
        { title: 'Prompt Claude to plan tables with Supabase MCP' },
        { title: 'Prompt Claude to create tables with role-based RLS using Supabase MCP' },
        { title: 'Prompt Claude to generate TypeScript types with Supabase MCP' },
        { title: 'Prompt Claude to create server actions for CRUD' },
        { title: 'Connect frontend to backend' },
        { title: 'Prompt Claude to commit and push' },
        { title: 'Prompt Claude to deploy preview with Vercel CLI' },
        { title: 'Test full flow' },
      ],
    },
    BASE_PHASES[4], // Ship
  ],

  voice: [
    {
      name: 'Setup',
      description: 'Get everything ready',
      items: [
        { title: 'Create project folder locally' },
        { title: 'Create GitHub repo' },
        { title: 'Create Supabase project' },
        { title: 'Create VAPI assistant' },
        { title: 'Get client requirements' },
        { title: 'List MVP features' },
      ],
    },
    BASE_PHASES[1], // Plan
    {
      name: 'Voice Config',
      description: 'Configure VAPI assistant',
      items: [
        { title: 'Set voice provider (Cartesia/ElevenLabs)' },
        { title: 'Set LLM provider' },
        { title: 'Prompt Claude to create system prompt' },
        { title: 'Copy system prompt to VAPI dashboard' },
        { title: 'Test call - check personality' },
      ],
    },
    {
      name: 'Backend',
      description: 'Webhook + Supabase',
      items: [
        { title: 'Prompt Claude to create webhook handler' },
        { title: 'Prompt Claude to create tool functions' },
        { title: 'Prompt Claude to plan tables with Supabase MCP' },
        { title: 'Prompt Claude to create call_logs table with Supabase MCP' },
        { title: 'Add tool definitions to VAPI assistant' },
        { title: 'Prompt Claude to commit and push' },
        { title: 'Prompt Claude to deploy with Cloudflare Workers' },
        { title: 'Set webhook URL in VAPI dashboard' },
        { title: 'Test full call flow' },
      ],
    },
    {
      name: 'Ship',
      description: 'Go live',
      items: [
        { title: 'Test 3+ full calls' },
        { title: '/workflows:review' },
        { title: 'Setup phone number in VAPI/Telnyx' },
        { title: 'Test production call' },
        { title: 'Send client phone number' },
        { title: '/workflows:compound' },
      ],
    },
  ],

  website: [
    {
      name: 'Setup',
      description: 'Get everything ready',
      items: [
        { title: 'Create project folder locally' },
        { title: 'Create GitHub repo' },
        { title: 'Create Vercel project' },
        { title: 'Get client requirements' },
        { title: 'Get images/copy from client' },
        { title: 'List pages needed' },
      ],
    },
    BASE_PHASES[1], // Plan
    {
      name: 'Frontend',
      description: 'Build all pages',
      items: [
        { title: '/frontend-master --design "[hero section]"' },
        { title: '/frontend-master --build "[page]"' },
        { title: 'Prompt Claude to commit and push' },
        { title: 'Prompt Claude to deploy preview with Vercel CLI' },
        { title: 'Test preview URL' },
        { title: '/responsive' },
        { title: 'Repeat for remaining pages' },
      ],
    },
    {
      name: 'Backend (optional)',
      description: 'Only if contact form needed',
      items: [
        { title: 'Create Supabase project (if needed)' },
        { title: 'Prompt Claude to create contact_submissions table with Supabase MCP' },
        { title: 'Connect contact form to Supabase' },
        { title: 'Test form submission' },
      ],
    },
    {
      name: 'Ship',
      description: 'SEO, deploy, handoff',
      items: [
        { title: 'Prompt Claude to add meta titles/descriptions' },
        { title: 'Prompt Claude to create sitemap.xml' },
        { title: 'Prompt Claude to optimize images' },
        { title: '/pr (production audit)' },
        { title: 'Prompt Claude to deploy production with Vercel CLI' },
        { title: 'Setup custom domain' },
        { title: 'Test production URL' },
        { title: 'Send client production URL' },
        { title: '/workflows:compound' },
      ],
    },
  ],
};

// Legacy: Keep TRAINEE_PHASES for backwards compatibility
export const TRAINEE_PHASES: PhaseTemplate[] = PHASE_TEMPLATES.ai_agent;

/**
 * Get phases for a specific project category
 */
export function getPhasesForCategory(category: ProjectCategory): PhaseTemplate[] {
  return PHASE_TEMPLATES[category] || PHASE_TEMPLATES.ai_agent;
}

/**
 * Get phase by index
 */
export function getPhaseByIndex(
  index: number,
  category: ProjectCategory = 'ai_agent'
): PhaseTemplate | undefined {
  const phases = getPhasesForCategory(category);
  return phases[index];
}

/**
 * Calculate overall progress based on completed items across all phases
 */
export function calculateOverallProgress(completedItems: number, totalItems: number): number {
  if (totalItems === 0) return 0;
  return Math.round((completedItems / totalItems) * 100);
}

/**
 * Get total number of items across all phases for a category
 */
export function getTotalPhaseItems(category: ProjectCategory = 'ai_agent'): number {
  const phases = getPhasesForCategory(category);
  return phases.reduce((total, phase) => total + phase.items.length, 0);
}
