/**
 * Phase templates for project roadmaps
 * Each project type has pre-defined phases with checklist items
 * Designed to be fun and clear for trainees!
 */

export type ProjectType = 'ai_agent' | 'voice_agent' | 'web_design' | 'seo' | 'ads';

export interface PhaseItemTemplate {
  templateKey: string;
  title: string;
  description?: string;
  helperText?: string;
}

export interface PhaseTemplate {
  templateKey: string;
  name: string;
  description?: string;
  helperText?: string;
  items: PhaseItemTemplate[];
}

export interface ProjectTypeConfig {
  projectType: ProjectType;
  label: string;
  description: string;
  phases: PhaseTemplate[];
}

// ============================================
// AI AGENT PROJECT TEMPLATE (Chatbots, Automation)
// ============================================
export const AI_AGENT_PHASES: PhaseTemplate[] = [
  {
    templateKey: 'ai_setup',
    name: '1. Setup & Research',
    description: "Get organized and understand what we're building",
    helperText: 'Take your time here - good planning = smooth building!',
    items: [
      {
        templateKey: 'create_repo',
        title: 'Create GitHub repo',
        description: 'New repo with README',
        helperText: 'Use a clear name like "client-name-ai-agent"',
      },
      {
        templateKey: 'setup_project',
        title: 'Initialize project folder',
        description: 'npm init, install dependencies',
        helperText: 'Start with: langchain, openai, dotenv',
      },
      {
        templateKey: 'understand_goal',
        title: 'Write down what the agent should do',
        description: 'Clear purpose in 2-3 sentences',
        helperText: 'Example: "Answer customer questions using our FAQ database"',
      },
      {
        templateKey: 'list_tools',
        title: 'List the tools/APIs needed',
        description: 'What external services will it use?',
        helperText: 'Database? Calendar? Email? CRM? List them all!',
      },
      {
        templateKey: 'find_examples',
        title: 'Find 2-3 similar examples',
        description: 'Research reference implementations',
        helperText: 'GitHub search + YouTube tutorials are your friends',
      },
    ],
  },
  {
    templateKey: 'ai_build',
    name: '2. Build the Agent',
    description: 'Time to code! Start simple, then add features',
    helperText: 'Get a basic version working first, then improve',
    items: [
      {
        templateKey: 'write_system_prompt',
        title: 'Write the system prompt',
        description: 'Define personality and rules',
        helperText: 'Be specific! Include examples of good responses',
      },
      {
        templateKey: 'create_basic_agent',
        title: 'Create basic agent that responds',
        description: 'Just get it talking first',
        helperText: 'Use Claude/GPT-4o, test in terminal',
      },
      {
        templateKey: 'add_tools',
        title: 'Add tools one by one',
        description: 'Database lookup, API calls, etc.',
        helperText: 'Test each tool individually before combining!',
      },
      {
        templateKey: 'setup_supabase',
        title: 'Connect to Supabase (if needed)',
        description: 'Database for memory/storage',
        helperText: 'Use for: conversation history, user data, knowledge base',
      },
      {
        templateKey: 'test_locally',
        title: 'Test everything locally',
        description: 'Run through all scenarios',
        helperText: 'Try to break it! Find edge cases now',
      },
    ],
  },
  {
    templateKey: 'ai_deploy',
    name: '3. Deploy & Connect',
    description: 'Ship it to the cloud!',
    helperText: 'Almost there! Make it live and accessible',
    items: [
      {
        templateKey: 'setup_env',
        title: 'Set up environment variables',
        description: 'API keys and secrets',
        helperText: 'NEVER commit .env files! Add to .gitignore',
      },
      {
        templateKey: 'deploy_vercel',
        title: 'Deploy to Vercel/Railway',
        description: 'Push and configure hosting',
        helperText: 'Vercel for Next.js, Railway for Python/Node APIs',
      },
      {
        templateKey: 'add_prod_secrets',
        title: 'Add secrets to production',
        description: 'Environment variables in dashboard',
        helperText: 'Double-check all keys are set correctly',
      },
      {
        templateKey: 'test_production',
        title: 'Test in production',
        description: 'Make sure it works live!',
        helperText: 'Test the actual deployed URL, not localhost',
      },
    ],
  },
  {
    templateKey: 'ai_polish',
    name: '4. Test & Polish',
    description: 'Make it bulletproof and professional',
    helperText: 'The details matter! Make it shine',
    items: [
      {
        templateKey: 'test_edge_cases',
        title: 'Test weird inputs',
        description: 'Empty messages, long text, emojis, other languages',
        helperText: 'Users will try everything - be ready!',
      },
      {
        templateKey: 'add_error_handling',
        title: 'Add friendly error messages',
        description: 'Handle failures gracefully',
        helperText: '"Sorry, I couldn\'t do that" is better than crashing',
      },
      {
        templateKey: 'improve_responses',
        title: 'Improve response quality',
        description: 'Tweak prompts based on testing',
        helperText: 'Iterate on the system prompt until it sounds natural',
      },
      {
        templateKey: 'write_readme',
        title: 'Write documentation',
        description: 'How to use and maintain',
        helperText: 'Future you will thank present you!',
      },
      {
        templateKey: 'demo_team',
        title: 'Demo to team/client',
        description: 'Show off your work!',
        helperText: 'Record a Loom video for async sharing',
      },
    ],
  },
];

// ============================================
// VOICE AGENT PROJECT TEMPLATE (VAPI, ElevenLabs)
// ============================================
export const VOICE_AGENT_PHASES: PhaseTemplate[] = [
  {
    templateKey: 'voice_setup',
    name: '1. Setup & Planning',
    description: 'Get accounts ready and plan the voice experience',
    helperText: 'Voice agents need extra planning for natural conversation',
    items: [
      {
        templateKey: 'create_repo',
        title: 'Create GitHub repo',
        description: 'New repo for the project',
        helperText: 'Include webhook handlers and any web UI',
      },
      {
        templateKey: 'setup_vapi',
        title: 'Set up VAPI account',
        description: 'Create account at vapi.ai',
        helperText: 'Get your API keys from the dashboard',
      },
      {
        templateKey: 'choose_voice',
        title: 'Choose the voice',
        description: 'ElevenLabs, Deepgram, or VAPI voices',
        helperText: 'Test different voices - personality matters!',
      },
      {
        templateKey: 'write_personality',
        title: 'Define the agent personality',
        description: 'How should it sound? Formal? Friendly?',
        helperText: 'Write example conversations to capture the vibe',
      },
      {
        templateKey: 'list_capabilities',
        title: 'List what it can do',
        description: 'Schedule meetings? Answer questions? Take orders?',
        helperText: 'Each capability = one tool in VAPI',
      },
    ],
  },
  {
    templateKey: 'voice_build',
    name: '2. Build in VAPI',
    description: 'Create the assistant and tools',
    helperText: 'Start with a basic assistant, then add tools',
    items: [
      {
        templateKey: 'create_assistant',
        title: 'Create VAPI assistant',
        description: 'Basic setup in dashboard or API',
        helperText: 'Start simple - just get it talking first',
      },
      {
        templateKey: 'write_system_prompt',
        title: 'Write the system prompt',
        description: 'Personality, rules, conversation style',
        helperText: 'Voice prompts need to encourage SHORT responses',
      },
      {
        templateKey: 'set_first_message',
        title: 'Set the greeting message',
        description: 'What does it say when answering?',
        helperText: 'Keep it short! "Hi, this is [Name], how can I help?"',
      },
      {
        templateKey: 'test_basic_call',
        title: 'Test a basic call',
        description: 'Call it and have a conversation',
        helperText: 'Use the VAPI dashboard to test calls',
      },
      {
        templateKey: 'create_tools',
        title: 'Create tools for each capability',
        description: 'Function tools that call your webhook',
        helperText: 'Each tool = one thing the agent can DO',
      },
    ],
  },
  {
    templateKey: 'voice_webhook',
    name: '3. Build the Webhook',
    description: 'Handle tool calls from VAPI',
    helperText: 'This is where the magic happens!',
    items: [
      {
        templateKey: 'setup_webhook_route',
        title: 'Create webhook endpoint',
        description: '/api/vapi/webhook in Next.js',
        helperText: 'POST endpoint that receives tool calls',
      },
      {
        templateKey: 'handle_tool_calls',
        title: 'Handle each tool call',
        description: 'Switch statement for different tools',
        helperText: 'Return concise responses - this becomes speech!',
      },
      {
        templateKey: 'connect_database',
        title: 'Connect to Supabase',
        description: 'For reading/writing data',
        helperText: 'Calendar, customers, orders - whatever you need',
      },
      {
        templateKey: 'deploy_webhook',
        title: 'Deploy webhook to Vercel',
        description: 'Make it publicly accessible',
        helperText: 'You need a real URL for VAPI to call',
      },
      {
        templateKey: 'connect_vapi_webhook',
        title: 'Connect VAPI to webhook',
        description: 'Set server URL in assistant config',
        helperText: 'Test that VAPI can reach your webhook',
      },
    ],
  },
  {
    templateKey: 'voice_phone',
    name: '4. Phone Number Setup',
    description: 'Get a real phone number working',
    helperText: 'Optional but cool - make it callable!',
    items: [
      {
        templateKey: 'buy_number',
        title: 'Buy a phone number',
        description: 'Through VAPI, Twilio, or Vonage',
        helperText: 'VAPI has built-in number purchasing',
      },
      {
        templateKey: 'assign_assistant',
        title: 'Assign assistant to number',
        description: 'Link number to your assistant',
        helperText: 'Inbound calls will go to your agent',
      },
      {
        templateKey: 'test_real_call',
        title: 'Test with a real phone call',
        description: 'Call the number from your phone',
        helperText: 'This is the moment of truth!',
      },
      {
        templateKey: 'setup_outbound',
        title: 'Set up outbound calls (if needed)',
        description: 'For the agent to call out',
        helperText: 'Useful for appointment reminders, follow-ups',
      },
    ],
  },
  {
    templateKey: 'voice_polish',
    name: '5. Test & Optimize',
    description: 'Make conversations smooth and natural',
    helperText: 'Voice needs extra polish - latency and flow matter!',
    items: [
      {
        templateKey: 'test_conversations',
        title: 'Have 10+ test conversations',
        description: 'Different scenarios and edge cases',
        helperText: 'Try interrupting, asking weird things, speaking fast',
      },
      {
        templateKey: 'optimize_latency',
        title: 'Reduce response latency',
        description: 'Make responses faster',
        helperText: 'Use streaming, optimize webhook, shorter prompts',
      },
      {
        templateKey: 'improve_voice_settings',
        title: 'Tune voice settings',
        description: 'Speed, stability, clarity',
        helperText: 'Small tweaks make a big difference in naturalness',
      },
      {
        templateKey: 'add_fallbacks',
        title: 'Add graceful fallbacks',
        description: "When it doesn't understand",
        helperText: '"I didn\'t catch that, could you repeat?"',
      },
      {
        templateKey: 'demo_and_handoff',
        title: 'Demo and document',
        description: 'Show it off, write usage guide',
        helperText: 'Record a demo call for the client!',
      },
    ],
  },
];

// ============================================
// WEBSITE PROJECT TEMPLATE
// ============================================
export const WEBSITE_PHASES: PhaseTemplate[] = [
  {
    templateKey: 'web_setup',
    name: '1. Setup & Planning',
    description: 'Get organized before writing code',
    helperText: 'A little planning saves a lot of headaches!',
    items: [
      {
        templateKey: 'create_repo',
        title: 'Create GitHub repo',
        description: 'New repo with README',
        helperText: 'Use "client-name-website" format',
      },
      {
        templateKey: 'setup_nextjs',
        title: 'Set up Next.js project',
        description: 'npx create-next-app with TypeScript',
        helperText: 'Use App Router, Tailwind CSS, shadcn/ui',
      },
      {
        templateKey: 'gather_requirements',
        title: 'Write down what client wants',
        description: 'Pages, features, style preferences',
        helperText: 'Ask: "What should visitors DO on this site?"',
      },
      {
        templateKey: 'find_inspiration',
        title: 'Find 3-5 inspiration sites',
        description: 'Sites with vibes the client likes',
        helperText: 'Screenshot specific sections you like',
      },
      {
        templateKey: 'plan_pages',
        title: 'List all pages needed',
        description: 'Home, About, Services, Contact, etc.',
        helperText: 'Draw a simple sitemap on paper!',
      },
    ],
  },
  {
    templateKey: 'web_build',
    name: '2. Build the Site',
    description: 'Code it up! Start with layout, then pages',
    helperText: 'Get the structure right, then make it pretty',
    items: [
      {
        templateKey: 'build_layout',
        title: 'Build header and footer',
        description: 'Navigation, logo, links',
        helperText: 'These appear on every page - get them right!',
      },
      {
        templateKey: 'build_homepage',
        title: 'Build the homepage',
        description: 'Hero, features, CTA sections',
        helperText: 'This is the most important page - take your time',
      },
      {
        templateKey: 'build_other_pages',
        title: 'Build remaining pages',
        description: 'One by one, matching the design',
        helperText: "Reuse components - don't copy-paste code!",
      },
      {
        templateKey: 'add_content',
        title: 'Add real content',
        description: 'Replace lorem ipsum with actual text',
        helperText: 'Content makes or breaks the design',
      },
      {
        templateKey: 'connect_forms',
        title: 'Connect contact forms',
        description: 'Email notifications, database, etc.',
        helperText: 'Use Supabase or Resend for emails',
      },
    ],
  },
  {
    templateKey: 'web_polish',
    name: '3. Make it Perfect',
    description: 'Responsive, fast, and polished',
    helperText: 'The details separate good from great!',
    items: [
      {
        templateKey: 'mobile_responsive',
        title: 'Make it mobile-friendly',
        description: 'Test on actual phones!',
        helperText: 'Chrome DevTools + your real phone',
      },
      {
        templateKey: 'add_animations',
        title: 'Add subtle animations',
        description: 'Hover effects, scroll animations',
        helperText: "Less is more - don't overdo it!",
      },
      {
        templateKey: 'optimize_images',
        title: 'Optimize images',
        description: 'Compress, use next/image',
        helperText: 'Big images = slow site = bad SEO',
      },
      {
        templateKey: 'add_seo',
        title: 'Add SEO basics',
        description: 'Titles, descriptions, Open Graph',
        helperText: 'Every page needs unique title and description',
      },
      {
        templateKey: 'test_browsers',
        title: 'Test in different browsers',
        description: 'Chrome, Safari, Firefox, Edge',
        helperText: 'Safari is often the troublemaker!',
      },
    ],
  },
  {
    templateKey: 'web_deploy',
    name: '4. Deploy & Launch',
    description: 'Ship it to the world!',
    helperText: 'Launch day is exciting! Double-check everything',
    items: [
      {
        templateKey: 'deploy_vercel',
        title: 'Deploy to Vercel',
        description: 'Connect repo, auto-deploy',
        helperText: 'Vercel + Next.js = best friends',
      },
      {
        templateKey: 'setup_domain',
        title: 'Connect the domain',
        description: 'DNS settings, SSL automatic',
        helperText: 'Point nameservers or add CNAME records',
      },
      {
        templateKey: 'setup_analytics',
        title: 'Add analytics',
        description: 'Google Analytics or Plausible',
        helperText: 'Track visitors from day one!',
      },
      {
        templateKey: 'final_review',
        title: 'Final review with client',
        description: 'Walk through the live site',
        helperText: 'Fix any last-minute requests',
      },
      {
        templateKey: 'handoff',
        title: 'Handoff documentation',
        description: 'Login info, how to update content',
        helperText: 'Record a Loom walkthrough!',
      },
    ],
  },
];

// ============================================
// SEO PROJECT TEMPLATE
// ============================================
export const SEO_PHASES: PhaseTemplate[] = [
  {
    templateKey: 'seo_audit',
    name: '1. Audit & Research',
    description: "Understand where we're starting from",
    helperText: "Can't improve what you don't measure!",
    items: [
      {
        templateKey: 'technical_audit',
        title: 'Run technical SEO audit',
        description: 'Use Screaming Frog or Ahrefs',
        helperText: 'Look for: broken links, slow pages, missing tags',
      },
      {
        templateKey: 'check_rankings',
        title: 'Check current rankings',
        description: 'Google Search Console data',
        helperText: 'What keywords are they already ranking for?',
      },
      {
        templateKey: 'competitor_research',
        title: 'Research competitors',
        description: 'Who ranks for target keywords?',
        helperText: 'Analyze their content and backlinks',
      },
      {
        templateKey: 'keyword_research',
        title: 'Do keyword research',
        description: 'Find opportunities with good volume + low difficulty',
        helperText: 'Use Ahrefs, SEMrush, or Ubersuggest',
      },
    ],
  },
  {
    templateKey: 'seo_fix',
    name: '2. Technical Fixes',
    description: 'Fix the foundation issues',
    helperText: 'Technical SEO enables everything else',
    items: [
      {
        templateKey: 'fix_errors',
        title: 'Fix crawl errors',
        description: '404s, redirects, broken links',
        helperText: 'Priority: errors that affect important pages',
      },
      {
        templateKey: 'improve_speed',
        title: 'Improve page speed',
        description: 'Core Web Vitals optimization',
        helperText: 'Target: LCP < 2.5s, FID < 100ms, CLS < 0.1',
      },
      {
        templateKey: 'mobile_fix',
        title: 'Fix mobile issues',
        description: 'Mobile-friendly test',
        helperText: 'Google uses mobile-first indexing!',
      },
      {
        templateKey: 'add_schema',
        title: 'Add schema markup',
        description: 'Organization, FAQ, breadcrumbs',
        helperText: 'Rich results = more clicks',
      },
    ],
  },
  {
    templateKey: 'seo_content',
    name: '3. Content Optimization',
    description: 'Make pages rank-worthy',
    helperText: 'Content is king (still)!',
    items: [
      {
        templateKey: 'optimize_titles',
        title: 'Optimize page titles',
        description: 'Include target keywords, under 60 chars',
        helperText: 'Make them clickable and accurate',
      },
      {
        templateKey: 'optimize_metas',
        title: 'Write meta descriptions',
        description: 'Compelling, 150-160 characters',
        helperText: 'This is your ad in search results!',
      },
      {
        templateKey: 'improve_content',
        title: 'Improve page content',
        description: 'Add depth, answer questions',
        helperText: 'Be the best answer on the internet',
      },
      {
        templateKey: 'internal_linking',
        title: 'Add internal links',
        description: 'Connect related pages',
        helperText: 'Help Google understand site structure',
      },
    ],
  },
  {
    templateKey: 'seo_ongoing',
    name: '4. Monitor & Report',
    description: 'Track progress and keep improving',
    helperText: 'SEO is a marathon, not a sprint',
    items: [
      {
        templateKey: 'setup_tracking',
        title: 'Set up rank tracking',
        description: 'Monitor target keywords',
        helperText: 'Weekly checks, monthly reports',
      },
      {
        templateKey: 'setup_gsc',
        title: 'Set up Search Console alerts',
        description: 'Get notified of issues',
        helperText: 'Catch problems early!',
      },
      {
        templateKey: 'create_report',
        title: 'Create monthly report',
        description: 'Rankings, traffic, wins',
        helperText: 'Show the value of your work',
      },
      {
        templateKey: 'plan_next',
        title: "Plan next month's work",
        description: 'New content, more fixes',
        helperText: 'SEO never stops - always improving',
      },
    ],
  },
];

// ============================================
// ADS PROJECT TEMPLATE
// ============================================
export const ADS_PHASES: PhaseTemplate[] = [
  {
    templateKey: 'ads_setup',
    name: '1. Setup & Strategy',
    description: 'Get accounts ready and plan the approach',
    helperText: 'Good planning = good results',
    items: [
      {
        templateKey: 'define_goals',
        title: 'Define campaign goals',
        description: 'Leads? Sales? Brand awareness?',
        helperText: 'Be specific: "50 leads at $20 each"',
      },
      {
        templateKey: 'setup_accounts',
        title: 'Set up ad accounts',
        description: 'Google Ads, Meta Business Suite',
        helperText: "Use client's business manager if possible",
      },
      {
        templateKey: 'install_tracking',
        title: 'Install tracking pixels',
        description: 'Google Tag, Meta Pixel',
        helperText: 'Test with Tag Assistant before launching!',
      },
      {
        templateKey: 'audience_research',
        title: 'Research target audience',
        description: 'Demographics, interests, behaviors',
        helperText: 'Who is the ideal customer?',
      },
    ],
  },
  {
    templateKey: 'ads_create',
    name: '2. Create Ads',
    description: 'Build the creative assets',
    helperText: 'Good creative = good performance',
    items: [
      {
        templateKey: 'write_copy',
        title: 'Write ad copy',
        description: 'Headlines, descriptions, CTAs',
        helperText: 'Write 5+ variations to test',
      },
      {
        templateKey: 'create_visuals',
        title: 'Create visual assets',
        description: 'Images, videos, carousels',
        helperText: 'Video usually wins! Even simple ones',
      },
      {
        templateKey: 'build_landing',
        title: 'Check/build landing page',
        description: 'Where does the ad go?',
        helperText: 'Landing page must match ad message!',
      },
      {
        templateKey: 'setup_conversions',
        title: 'Set up conversion tracking',
        description: 'Track leads, purchases, signups',
        helperText: "Can't optimize without data",
      },
    ],
  },
  {
    templateKey: 'ads_launch',
    name: '3. Launch & Monitor',
    description: 'Go live and watch closely',
    helperText: 'First week = learning phase',
    items: [
      {
        templateKey: 'build_campaigns',
        title: 'Build campaign structure',
        description: 'Campaigns > Ad Sets > Ads',
        helperText: 'Keep it simple to start',
      },
      {
        templateKey: 'set_budget',
        title: 'Set initial budget',
        description: 'Start small, scale winners',
        helperText: "Don't spend big until you have data",
      },
      {
        templateKey: 'launch',
        title: 'Launch campaigns!',
        description: 'Hit publish and monitor',
        helperText: 'Check daily for first week',
      },
      {
        templateKey: 'check_delivery',
        title: 'Verify ads are delivering',
        description: 'Spending? Getting impressions?',
        helperText: 'Catch issues early!',
      },
    ],
  },
  {
    templateKey: 'ads_optimize',
    name: '4. Optimize & Report',
    description: 'Improve performance over time',
    helperText: 'The magic is in the optimization',
    items: [
      {
        templateKey: 'analyze_results',
        title: 'Analyze performance data',
        description: "What's working? What's not?",
        helperText: 'Wait for statistical significance',
      },
      {
        templateKey: 'kill_losers',
        title: 'Pause underperforming ads',
        description: 'Cut the losers fast',
        helperText: "Don't throw good money after bad",
      },
      {
        templateKey: 'scale_winners',
        title: 'Scale winning ads',
        description: 'Increase budget on what works',
        helperText: 'Scale gradually - 20% at a time',
      },
      {
        templateKey: 'send_report',
        title: 'Send weekly/monthly reports',
        description: 'Results, insights, next steps',
        helperText: 'Clients love seeing ROI!',
      },
    ],
  },
];

// ============================================
// TEMPLATE REGISTRY
// ============================================
export const PROJECT_PHASE_TEMPLATES: Record<ProjectType, ProjectTypeConfig> = {
  ai_agent: {
    projectType: 'ai_agent',
    label: 'AI Agent',
    description: 'Chatbots, automation, text-based AI assistants',
    phases: AI_AGENT_PHASES,
  },
  voice_agent: {
    projectType: 'voice_agent',
    label: 'Voice Agent',
    description: 'Phone bots, voice assistants (VAPI, ElevenLabs)',
    phases: VOICE_AGENT_PHASES,
  },
  web_design: {
    projectType: 'web_design',
    label: 'Website',
    description: 'Landing pages, business sites, web apps',
    phases: WEBSITE_PHASES,
  },
  seo: {
    projectType: 'seo',
    label: 'SEO',
    description: 'Search engine optimization campaigns',
    phases: SEO_PHASES,
  },
  ads: {
    projectType: 'ads',
    label: 'Ads',
    description: 'Google Ads, Meta Ads, paid advertising',
    phases: ADS_PHASES,
  },
};

/**
 * Get phase templates for a project type
 */
export function getPhaseTemplates(projectType: ProjectType | null): PhaseTemplate[] {
  if (!projectType || !PROJECT_PHASE_TEMPLATES[projectType]) {
    return [];
  }
  return PROJECT_PHASE_TEMPLATES[projectType].phases;
}

/**
 * Get project type configuration
 */
export function getProjectTypeConfig(projectType: ProjectType): ProjectTypeConfig | null {
  return PROJECT_PHASE_TEMPLATES[projectType] || null;
}

/**
 * Count total items across all phases for a template
 */
export function countTemplateItems(phases: PhaseTemplate[]): number {
  return phases.reduce((sum, phase) => sum + phase.items.length, 0);
}

/**
 * Get all project types with their configs
 */
export function getAllProjectTypes(): ProjectTypeConfig[] {
  return Object.values(PROJECT_PHASE_TEMPLATES);
}
