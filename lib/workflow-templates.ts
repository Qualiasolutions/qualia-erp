/**
 * Workflow Templates for Project Types
 * Maps project_type to prefilled phases and tasks.
 * Each template is a comprehensive 0-to-production blueprint.
 */

export type ProjectType = 'web_design' | 'ai_agent' | 'voice_agent' | 'ai_platform' | 'seo' | 'ads';

export interface WorkflowTask {
  title: string;
  description?: string;
  helperText?: string;
}

export interface WorkflowPhase {
  name: string;
  description: string;
  tasks: WorkflowTask[];
}

export interface WorkflowTemplate {
  projectType: ProjectType;
  phases: WorkflowPhase[];
}

// ============================================================================
// WEB DESIGN WORKFLOW
// ============================================================================
const WEB_DESIGN_WORKFLOW: WorkflowPhase[] = [
  {
    name: 'Discovery',
    description: 'Gather requirements, audit content, define scope',
    tasks: [
      {
        title: 'Client intake interview',
        description:
          'Goals, audience, brand guidelines, competitor references, and must-have features',
      },
      {
        title: 'Content inventory & audit',
        description: 'Catalog all existing content, images, and copy. Identify gaps.',
      },
      {
        title: 'Sitemap & information architecture',
        description: 'Define page hierarchy, navigation structure, and user flows',
      },
      {
        title: 'Scope document & sign-off',
        description: 'Deliverables, timeline, and acceptance criteria agreed with client',
      },
      {
        title: 'Domain & hosting setup',
        description: 'Register domain (if needed), configure DNS, create Vercel project',
      },
    ],
  },
  {
    name: 'Design',
    description: 'Wireframes, visual design, and client approval',
    tasks: [
      {
        title: 'Wireframes for key pages',
        description: 'Low-fidelity layouts for homepage, inner pages, and contact/CTA flow',
      },
      {
        title: 'Design system & typography',
        description: 'Color palette, font pairing, spacing scale, button/input styles',
      },
      {
        title: 'High-fidelity mockups',
        description: 'Full-resolution desktop designs for all unique page layouts',
      },
      {
        title: 'Mobile responsive designs',
        description: 'Adapt mockups for tablet and mobile breakpoints',
      },
      {
        title: 'Client design approval',
        description: 'Present designs, collect feedback, get final sign-off before development',
      },
    ],
  },
  {
    name: 'Development',
    description: 'Build the site end-to-end',
    tasks: [
      {
        title: 'Project scaffolding & config',
        description: 'Initialize Next.js/Vite project, Tailwind, ESLint, folder structure',
        helperText: 'npx create-next-app@latest --typescript --tailwind',
      },
      {
        title: 'Layout & navigation components',
        description: 'Header, footer, mobile nav, breadcrumbs, shared layout wrapper',
      },
      {
        title: 'Homepage build',
        description: 'Hero section, feature highlights, testimonials, CTAs',
      },
      {
        title: 'Inner pages build',
        description: 'About, services, portfolio/case studies, team, pricing',
      },
      {
        title: 'Contact form & backend',
        description:
          'Form UI, validation, server action or API route, email notification via Resend',
      },
      {
        title: 'Supabase schema & RLS',
        description: 'Tables for form submissions, blog posts, etc. RLS policies on every table.',
      },
      {
        title: 'CMS integration',
        description: 'Blog/content management if applicable (Supabase-backed or headless CMS)',
      },
      {
        title: 'Animations & micro-interactions',
        description: 'Scroll animations, page transitions, hover effects, loading states',
      },
    ],
  },
  {
    name: 'QA & Optimization',
    description: 'Test everything, optimize performance and SEO',
    tasks: [
      {
        title: 'Cross-browser testing',
        description: 'Chrome, Firefox, Safari, Edge — verify layout and functionality',
      },
      {
        title: 'Mobile & tablet testing',
        description: 'Test on real devices or emulators across breakpoints',
      },
      {
        title: 'Performance audit',
        description: 'Run Lighthouse, optimize images (WebP/AVIF), lazy loading, bundle size',
        helperText: 'npx next build && npx @next/bundle-analyzer',
      },
      {
        title: 'SEO fundamentals',
        description:
          'Meta titles/descriptions, Open Graph tags, sitemap.xml, robots.txt, structured data',
      },
      {
        title: 'Accessibility audit',
        description: 'Keyboard navigation, ARIA labels, color contrast, screen reader testing',
      },
      {
        title: 'Form & integration testing',
        description: 'Submit forms, verify emails arrive, check error states and edge cases',
      },
    ],
  },
  {
    name: 'Launch',
    description: 'Deploy to production, hand off to client',
    tasks: [
      {
        title: 'Environment variables in Vercel',
        description: 'Supabase URL/key, Resend API key, any third-party keys',
      },
      {
        title: 'Production deployment',
        description: 'Push to main branch, verify Vercel build succeeds',
        helperText: 'git push origin main',
      },
      {
        title: 'Custom domain & SSL',
        description: 'Point domain to Vercel, verify SSL certificate is active',
      },
      {
        title: 'Analytics setup',
        description: 'Google Analytics 4, Search Console verification, Vercel Analytics',
      },
      {
        title: 'Client handoff & training',
        description: 'Walk client through CMS, form submissions dashboard, analytics access',
      },
      {
        title: 'Post-launch monitoring',
        description: 'Monitor error logs, uptime, Core Web Vitals for first 48 hours',
      },
    ],
  },
];

// ============================================================================
// AI AGENT WORKFLOW
// ============================================================================
const AI_AGENT_WORKFLOW: WorkflowPhase[] = [
  {
    name: 'Discovery & Scoping',
    description: 'Define agent purpose, capabilities, and constraints',
    tasks: [
      {
        title: 'Define agent persona & goals',
        description: 'Name, personality, tone, primary use case, target users',
      },
      {
        title: 'Map conversation flows',
        description: 'Happy paths, edge cases, fallback responses, escalation triggers',
      },
      {
        title: 'Identify tool/action requirements',
        description: 'What the agent needs to do: search, CRUD, send emails, call APIs',
      },
      {
        title: 'Data source inventory',
        description: 'Knowledge base content, RAG sources, structured data the agent accesses',
      },
      {
        title: 'Define guardrails & safety rules',
        description: 'What the agent must never do, content policies, response boundaries',
      },
    ],
  },
  {
    name: 'Architecture',
    description: 'Design system components and data flow',
    tasks: [
      {
        title: 'Choose LLM provider & model',
        description: 'Gemini, OpenAI, Claude — pick model based on cost, latency, capability',
      },
      {
        title: 'Design database schema',
        description: 'Conversations, messages, user sessions, tool call logs, feedback tables',
      },
      {
        title: 'Design tool/function calling schema',
        description: 'Define each tool: name, description, parameters, return shape',
      },
      {
        title: 'System prompt engineering',
        description: 'Craft the system prompt with persona, instructions, examples, constraints',
      },
      {
        title: 'RAG pipeline design',
        description:
          'Embedding model, chunking strategy, vector store setup (pgvector), retrieval logic',
      },
      {
        title: 'API route architecture',
        description: 'Streaming endpoint, auth middleware, rate limiting strategy',
      },
    ],
  },
  {
    name: 'Development',
    description: 'Build the agent end-to-end',
    tasks: [
      {
        title: 'Project setup & dependencies',
        description: 'Next.js project, AI SDK, Supabase client, required packages',
      },
      {
        title: 'Database tables & RLS policies',
        description:
          'Create all tables with proper RLS. Users can only access their own conversations.',
      },
      {
        title: 'Chat API route with streaming',
        description:
          'POST endpoint using AI SDK streamText, conversation history, tool definitions',
      },
      {
        title: 'Implement tool functions',
        description:
          'Build each tool the agent can call — database queries, API calls, calculations',
      },
      {
        title: 'RAG ingestion pipeline',
        description: 'Document upload, chunking, embedding generation, vector storage',
      },
      {
        title: 'Chat UI component',
        description:
          'Message list, streaming response display, input with send button, typing indicator',
      },
      {
        title: 'Conversation management',
        description: 'Create, list, switch, delete conversations. Persist to database.',
      },
      {
        title: 'Auth integration',
        description: 'Supabase auth, protect API routes, associate conversations with users',
      },
    ],
  },
  {
    name: 'Testing & Tuning',
    description: 'Evaluate quality, tune prompts, stress test',
    tasks: [
      {
        title: 'Prompt iteration & evaluation',
        description: 'Test 20+ diverse queries, grade responses, refine system prompt',
      },
      {
        title: 'Tool call accuracy testing',
        description: 'Verify agent calls correct tools with correct parameters',
      },
      {
        title: 'RAG retrieval quality check',
        description: 'Test retrieval relevance, adjust chunk size and similarity threshold',
      },
      {
        title: 'Edge case & adversarial testing',
        description: 'Prompt injection attempts, off-topic queries, malformed input',
      },
      {
        title: 'Latency & cost profiling',
        description: 'Measure response times, token usage per conversation, estimate monthly cost',
      },
    ],
  },
  {
    name: 'Deployment & Monitoring',
    description: 'Ship to production with observability',
    tasks: [
      {
        title: 'Environment variables in Vercel',
        description: 'LLM API key, Supabase keys, any third-party service keys',
      },
      {
        title: 'Production deployment',
        description: 'Deploy, smoke test the live agent, verify streaming works',
      },
      {
        title: 'Rate limiting & abuse protection',
        description: 'Per-user rate limits, input length caps, cost alerts',
      },
      {
        title: 'Logging & analytics',
        description: 'Log conversations, tool calls, errors. Track usage metrics.',
      },
      {
        title: 'Feedback collection mechanism',
        description: 'Thumbs up/down on responses, user feedback form, review queue',
      },
    ],
  },
];

// ============================================================================
// VOICE AGENT WORKFLOW
// ============================================================================
const VOICE_AGENT_WORKFLOW: WorkflowPhase[] = [
  {
    name: 'Discovery & Call Design',
    description: 'Define the voice experience and call flows',
    tasks: [
      {
        title: 'Define use case & call scenarios',
        description: 'Inbound vs outbound, appointment booking, lead qualification, support, etc.',
      },
      {
        title: 'Script conversation flows',
        description: 'Greeting, main dialog branches, confirmation, closing, error handling',
      },
      {
        title: 'Define voice persona',
        description: 'Voice provider (ElevenLabs), voice ID, tone, speaking pace, language',
      },
      {
        title: 'Map integration requirements',
        description: 'Calendar booking, CRM updates, SMS follow-up, email notifications',
      },
      {
        title: 'Compliance & disclosure requirements',
        description: 'Recording consent, AI disclosure, data handling policies',
      },
    ],
  },
  {
    name: 'Architecture & Setup',
    description: 'Configure VAPI, telephony, and backend',
    tasks: [
      {
        title: 'VAPI assistant configuration',
        description: 'Create assistant in VAPI dashboard, set model, voice, and first message',
      },
      {
        title: 'System prompt for voice context',
        description:
          'Craft prompt optimized for spoken conversation — short sentences, natural phrasing',
      },
      {
        title: 'Phone number provisioning',
        description: 'Buy/import number via VAPI or Telnyx, assign to assistant',
      },
      {
        title: 'Database schema design',
        description:
          'Calls table (call_id, phone, status, duration, transcript, outcome), related business tables',
      },
      {
        title: 'Webhook endpoint architecture',
        description: 'Plan handler for function-call, end-of-call-report, status-update events',
      },
      {
        title: 'Define function call tools',
        description:
          'Each tool the voice agent can invoke: book_appointment, lookup_customer, transfer_call, etc.',
      },
    ],
  },
  {
    name: 'Development',
    description: 'Build webhook handlers and integrations',
    tasks: [
      {
        title: 'Webhook route handler',
        description: 'POST endpoint for VAPI webhooks, request validation with webhook secret',
      },
      {
        title: 'Function call implementations',
        description: 'Build each tool: database lookups, calendar API, CRM updates, SMS via Telnyx',
      },
      {
        title: 'End-of-call processing',
        description:
          'Save transcript, extract structured data, update call record, trigger follow-ups',
      },
      {
        title: 'Database tables & RLS',
        description: 'Create all tables with RLS policies for multi-tenant data isolation',
      },
      {
        title: 'Call dashboard UI',
        description:
          'Call log with search/filter, call detail view with transcript, analytics summary',
      },
      {
        title: 'Outbound call triggering',
        description: 'API to initiate outbound calls via VAPI, scheduling, retry logic',
      },
      {
        title: 'Notification integrations',
        description: 'Email summaries via Resend, SMS confirmations, Slack/webhook alerts',
      },
    ],
  },
  {
    name: 'Testing & Call QA',
    description: 'Test calls, refine conversation quality',
    tasks: [
      {
        title: 'VAPI dashboard test calls',
        description: 'Run test calls from VAPI web interface, verify assistant responds correctly',
      },
      {
        title: 'Real phone call testing',
        description:
          'Call the number, test full flow including function calls and data persistence',
      },
      {
        title: 'Edge case scenarios',
        description: 'Caller interrupts, silence handling, invalid inputs, language switching',
      },
      {
        title: 'Prompt tuning for voice',
        description:
          'Adjust phrasing for spoken clarity — avoid long sentences, ambiguous questions',
      },
      {
        title: 'Webhook reliability testing',
        description: 'Verify all webhook events are handled, test with malformed payloads',
      },
      {
        title: 'Latency profiling',
        description: 'Measure response time for function calls, optimize slow operations',
      },
    ],
  },
  {
    name: 'Launch & Monitoring',
    description: 'Go live and monitor call quality',
    tasks: [
      {
        title: 'Environment variables in production',
        description: 'VAPI keys, Telnyx keys, Supabase keys, ElevenLabs keys, webhook secrets',
      },
      {
        title: 'Production deployment',
        description: 'Deploy webhook handlers, verify VAPI webhook URL is configured correctly',
      },
      {
        title: 'Webhook secret enforcement',
        description: 'Validate VAPI webhook signature on every request in production',
      },
      {
        title: 'Call quality monitoring',
        description: 'Review transcripts daily for first week, flag poor interactions',
      },
      {
        title: 'Cost tracking & alerts',
        description: 'Monitor per-call cost (VAPI + voice + telephony), set budget alerts',
      },
    ],
  },
];

// ============================================================================
// AI PLATFORM WORKFLOW
// ============================================================================
const AI_PLATFORM_WORKFLOW: WorkflowPhase[] = [
  {
    name: 'Product Definition',
    description: 'Define the platform scope, users, and business model',
    tasks: [
      {
        title: 'User personas & use cases',
        description: 'Who uses the platform, what they do, what value they get',
      },
      {
        title: 'Feature prioritization (MVP)',
        description: 'Core features for launch vs. post-launch. Ruthless scope cutting.',
      },
      {
        title: 'Pricing & billing model',
        description: 'Free tier limits, paid plans, usage-based pricing, metering strategy',
      },
      {
        title: 'Competitive analysis',
        description: 'How existing solutions work, where to differentiate',
      },
      {
        title: 'Data model & entity relationships',
        description:
          'Core entities, relationships, multi-tenancy model (workspace-based vs user-based)',
      },
      {
        title: 'API surface design',
        description: 'Public API endpoints, authentication method, versioning strategy',
      },
    ],
  },
  {
    name: 'Architecture & Infrastructure',
    description: 'Set up the technical foundation',
    tasks: [
      {
        title: 'Project scaffolding',
        description: 'Next.js app with TypeScript, Tailwind, ESLint, folder structure, CI/CD',
      },
      {
        title: 'Supabase project & schema',
        description: 'Create project, design normalized schema, foreign keys, indexes',
      },
      {
        title: 'Authentication system',
        description: 'Supabase Auth with email/password, OAuth providers, workspace invites',
      },
      {
        title: 'Multi-tenancy & RLS',
        description:
          'Workspace isolation, RLS policies on every table checking workspace membership',
      },
      {
        title: 'AI pipeline architecture',
        description: 'LLM provider, streaming, tool calling, context management, token budgeting',
      },
      {
        title: 'File storage setup',
        description: 'Supabase Storage buckets, upload policies, CDN configuration',
      },
    ],
  },
  {
    name: 'Core Development',
    description: 'Build the main platform features',
    tasks: [
      {
        title: 'Auth flows & onboarding',
        description: 'Sign up, login, password reset, workspace creation, invite flow',
      },
      {
        title: 'Dashboard & navigation',
        description: 'App shell, sidebar, workspace switcher, breadcrumbs',
      },
      {
        title: 'Primary CRUD features',
        description: 'Build the core data management pages — list, detail, create, edit, delete',
      },
      {
        title: 'AI chat/processing feature',
        description: 'Streaming AI endpoint, chat UI, conversation history, tool integrations',
      },
      {
        title: 'Real-time features',
        description: 'Supabase Realtime subscriptions for live updates, presence, notifications',
      },
      {
        title: 'Billing integration',
        description: 'Stripe subscription, usage metering, plan enforcement, billing portal',
      },
      {
        title: 'Admin panel',
        description: 'User management, workspace oversight, usage stats, feature flags',
      },
    ],
  },
  {
    name: 'Polish & Security',
    description: 'Harden, optimize, and polish the experience',
    tasks: [
      {
        title: 'RLS audit on every table',
        description: 'Review and test every RLS policy. Verify no data leaks between workspaces.',
      },
      {
        title: 'Input validation with Zod',
        description: 'Server-side validation on every mutation. Sanitize all user input.',
      },
      {
        title: 'Error handling & edge cases',
        description: 'Global error boundary, toast notifications, retry logic, empty states',
      },
      {
        title: 'Performance optimization',
        description: 'Database indexes, query optimization, image optimization, code splitting',
      },
      {
        title: 'Responsive design pass',
        description: 'Test and fix all pages on mobile, tablet, desktop breakpoints',
      },
      {
        title: 'Loading states & skeleton UIs',
        description: 'Consistent loading patterns across all data-fetching components',
      },
    ],
  },
  {
    name: 'Launch Prep',
    description: 'Pre-launch checklist and staging validation',
    tasks: [
      {
        title: 'End-to-end testing',
        description: 'Full user journey: sign up, onboard, use features, upgrade plan, invite team',
      },
      {
        title: 'Cross-browser & device testing',
        description: 'Chrome, Firefox, Safari, Edge on desktop and mobile',
      },
      {
        title: 'Security penetration testing',
        description:
          'Auth bypass attempts, IDOR checks, XSS/injection testing, rate limit verification',
      },
      {
        title: 'Documentation & help content',
        description: 'API docs, onboarding tooltips, FAQ/help center content',
      },
      {
        title: 'Staging environment validation',
        description: 'Full deploy to staging, test with production-like data',
      },
    ],
  },
  {
    name: 'Launch & Growth',
    description: 'Deploy, monitor, iterate',
    tasks: [
      {
        title: 'Production environment setup',
        description: 'Vercel production env vars, Supabase production project, Stripe live keys',
      },
      {
        title: 'Custom domain & SSL',
        description: 'Configure domain, verify SSL, set up email domain for transactional emails',
      },
      {
        title: 'Monitoring & alerting',
        description: 'Error tracking (Sentry), uptime monitoring, usage dashboards, cost alerts',
      },
      {
        title: 'Analytics & product metrics',
        description: 'User signups, activation rate, feature usage, churn tracking',
      },
      {
        title: 'Launch communication',
        description: 'Landing page, Product Hunt, social media, email to waitlist',
      },
    ],
  },
];

// ============================================================================
// SEO WORKFLOW
// ============================================================================
const SEO_WORKFLOW: WorkflowPhase[] = [
  {
    name: 'Audit & Baseline',
    description: 'Analyze current state and establish metrics baseline',
    tasks: [
      {
        title: 'Google Analytics & Search Console access',
        description: 'Get admin access to GA4 and GSC, verify site ownership',
      },
      {
        title: 'Technical site crawl',
        description: 'Run Screaming Frog or Sitebulb crawl, export all issues',
      },
      {
        title: 'Current rankings snapshot',
        description: 'Document ranking positions for target keywords using Ahrefs/SEMrush',
      },
      {
        title: 'Core Web Vitals baseline',
        description: 'Measure LCP, CLS, INP from CrUX data and PageSpeed Insights',
      },
      {
        title: 'Backlink profile analysis',
        description: 'Export backlinks, identify toxic links, assess domain authority',
      },
      {
        title: 'Competitor SEO benchmarking',
        description: 'Top 5 competitors: their rankings, content strategy, backlink sources',
      },
    ],
  },
  {
    name: 'Strategy & Research',
    description: 'Keyword research, content strategy, and priority mapping',
    tasks: [
      {
        title: 'Keyword research & clustering',
        description: 'Identify target keywords, group by intent and topic cluster',
      },
      {
        title: 'Search intent mapping',
        description: 'Categorize keywords: informational, navigational, commercial, transactional',
      },
      {
        title: 'Content gap analysis',
        description: 'Keywords competitors rank for that the client does not',
      },
      {
        title: 'Priority page mapping',
        description: 'Map high-value keywords to existing or new pages, prioritize by impact',
      },
      {
        title: 'Link building strategy',
        description: 'Identify outreach targets, guest post opportunities, broken link prospects',
      },
      {
        title: 'SEO roadmap document',
        description: 'Month-by-month action plan with KPIs, shared with client for sign-off',
      },
    ],
  },
  {
    name: 'Technical SEO',
    description: 'Fix crawling, indexing, and performance issues',
    tasks: [
      {
        title: 'Fix crawl errors & broken links',
        description: 'Resolve 404s, redirect chains, server errors from crawl report',
      },
      {
        title: 'XML sitemap & robots.txt',
        description: 'Generate clean sitemap, submit to GSC, configure robots.txt directives',
      },
      {
        title: 'Site speed optimization',
        description:
          'Image compression, lazy loading, font optimization, render-blocking resources',
      },
      {
        title: 'Mobile usability fixes',
        description: 'Fix mobile-specific issues: viewport, tap targets, horizontal scroll',
      },
      {
        title: 'Structured data implementation',
        description: 'Add JSON-LD schema: Organization, LocalBusiness, Product, FAQ, Breadcrumbs',
      },
      {
        title: 'Internal linking optimization',
        description: 'Fix orphan pages, add contextual internal links, improve crawl depth',
      },
    ],
  },
  {
    name: 'On-Page & Content',
    description: 'Optimize existing pages and create new content',
    tasks: [
      {
        title: 'Title tags & meta descriptions',
        description: 'Optimize for target keywords, compelling CTR copy, proper length',
      },
      {
        title: 'Heading structure optimization',
        description: 'H1-H6 hierarchy, keyword placement, readability improvements',
      },
      {
        title: 'Image optimization & alt text',
        description: 'Descriptive alt text, file name optimization, WebP conversion',
      },
      {
        title: 'Content updates for priority pages',
        description: 'Expand thin content, update outdated information, improve E-E-A-T signals',
      },
      {
        title: 'New content creation',
        description: 'Blog posts, landing pages, and resource pages targeting content gap keywords',
      },
      {
        title: 'Open Graph & social metadata',
        description: 'OG titles, descriptions, images for social sharing optimization',
      },
    ],
  },
  {
    name: 'Reporting & Ongoing',
    description: 'Track results, report to client, plan next iteration',
    tasks: [
      {
        title: 'Monthly ranking report',
        description: 'Track keyword positions, compare to baseline, highlight wins',
      },
      {
        title: 'Traffic & conversion analysis',
        description: 'Organic traffic trends, landing page performance, goal completions',
      },
      {
        title: 'GSC performance review',
        description: 'Impressions, clicks, CTR, average position trends by query and page',
      },
      {
        title: 'Technical health check',
        description: 'Re-crawl site, verify fixes held, identify new issues',
      },
      {
        title: 'Client progress presentation',
        description: 'Present results, ROI metrics, next-period recommendations',
      },
      {
        title: 'Next-period action plan',
        description: 'Updated keyword targets, new content calendar, link building targets',
      },
    ],
  },
];

// ============================================================================
// ADS WORKFLOW
// ============================================================================
const ADS_WORKFLOW: WorkflowPhase[] = [
  {
    name: 'Strategy & Setup',
    description: 'Define goals, configure accounts, install tracking',
    tasks: [
      {
        title: 'Campaign objectives & KPIs',
        description: 'Define goals (leads, sales, traffic), target CPA/ROAS, monthly budget',
      },
      {
        title: 'Ad account setup & access',
        description: 'Create or get access to Google Ads, Meta Ads, LinkedIn, TikTok accounts',
      },
      {
        title: 'Conversion tracking installation',
        description: 'Install GTM, Google Ads tag, Meta Pixel, conversion events on key actions',
      },
      {
        title: 'Audience research & segmentation',
        description: 'Define target demographics, interests, custom audiences, lookalikes',
      },
      {
        title: 'Competitor ad analysis',
        description: 'Review competitor ads in Meta Ad Library, Google Ads Transparency, SpyFu',
      },
      {
        title: 'Budget allocation plan',
        description: 'Split budget across platforms, campaigns, and testing vs scaling',
      },
    ],
  },
  {
    name: 'Campaign Architecture',
    description: 'Structure campaigns, ad sets, and targeting',
    tasks: [
      {
        title: 'Campaign structure design',
        description: 'Campaign > ad set > ad hierarchy, naming conventions, UTM parameters',
      },
      {
        title: 'Keyword research (search ads)',
        description: 'Target keywords, negative keywords, match types, ad group themes',
      },
      {
        title: 'Audience targeting setup',
        description: 'Custom audiences, interest targeting, retargeting pixels, exclusions',
      },
      {
        title: 'Landing page strategy',
        description: 'Map each campaign to a dedicated landing page, define CTA and offer',
      },
      {
        title: 'A/B test plan',
        description: 'Define test variables: headlines, creatives, audiences, landing pages',
      },
      {
        title: 'Bid strategy selection',
        description: 'Choose bidding: manual CPC, target CPA, maximize conversions, ROAS target',
      },
    ],
  },
  {
    name: 'Build & Launch',
    description: 'Create ads, landing pages, and go live',
    tasks: [
      {
        title: 'Ad creative production',
        description: 'Design images/videos for each platform, multiple sizes and formats',
      },
      {
        title: 'Ad copy writing',
        description: 'Headlines, descriptions, CTAs for each ad variation. Test different angles.',
      },
      {
        title: 'Landing page build',
        description: 'Build/optimize landing pages with clear CTA, social proof, fast load time',
      },
      {
        title: 'Campaign build in ad platforms',
        description: 'Create campaigns, ad sets, ads in each platform with proper settings',
      },
      {
        title: 'Tracking verification',
        description: 'Use Tag Assistant, Meta Pixel Helper to verify all events fire correctly',
      },
      {
        title: 'Launch campaigns',
        description: 'Enable campaigns, set daily budgets, verify ads are approved and serving',
      },
    ],
  },
  {
    name: 'Optimization',
    description: 'Monitor, test, and optimize performance',
    tasks: [
      {
        title: 'Daily performance monitoring',
        description: 'Check spend, impressions, clicks, CTR, conversions, CPA daily',
      },
      {
        title: 'Search term review (Google Ads)',
        description: 'Add negative keywords, find new keyword opportunities from search terms',
      },
      {
        title: 'Creative performance analysis',
        description: 'Identify winning creatives, pause underperformers, iterate on top performers',
      },
      {
        title: 'Audience performance review',
        description: 'Analyze which audiences convert, adjust targeting, expand lookalikes',
      },
      {
        title: 'Bid & budget adjustments',
        description: 'Shift budget to winning campaigns, adjust bids based on performance data',
      },
      {
        title: 'Landing page optimization',
        description: 'A/B test headlines, CTAs, page layout based on conversion data',
      },
    ],
  },
  {
    name: 'Reporting & Scale',
    description: 'Report results, scale winners, plan next phase',
    tasks: [
      {
        title: 'Performance report',
        description:
          'Monthly report: spend, impressions, clicks, conversions, CPA, ROAS by campaign',
      },
      {
        title: 'Attribution analysis',
        description: 'Review multi-touch attribution, assisted conversions, customer journey',
      },
      {
        title: 'ROI & profitability analysis',
        description: 'Calculate true ROI including ad spend, landing page costs, team time',
      },
      {
        title: 'Client presentation',
        description: 'Present results, insights, learnings, and recommendations',
      },
      {
        title: 'Scale winning campaigns',
        description: 'Increase budgets on profitable campaigns, expand to new audiences/platforms',
      },
      {
        title: 'Next-period strategy',
        description: 'New test hypotheses, seasonal adjustments, expanded platform coverage',
      },
    ],
  },
];

// ============================================================================
// WORKFLOW TEMPLATES MAPPING
// ============================================================================
export const WORKFLOW_TEMPLATES: Record<ProjectType, WorkflowPhase[]> = {
  web_design: WEB_DESIGN_WORKFLOW,
  ai_agent: AI_AGENT_WORKFLOW,
  voice_agent: VOICE_AGENT_WORKFLOW,
  ai_platform: AI_PLATFORM_WORKFLOW,
  seo: SEO_WORKFLOW,
  ads: ADS_WORKFLOW,
};

/**
 * Get workflow template for a project type
 */
export function getWorkflowTemplate(projectType: ProjectType | string | null): WorkflowPhase[] {
  if (!projectType) return WEB_DESIGN_WORKFLOW;
  return WORKFLOW_TEMPLATES[projectType as ProjectType] || WEB_DESIGN_WORKFLOW;
}

/**
 * Get total task count for a project type
 */
export function getWorkflowTaskCount(projectType: ProjectType | string | null): number {
  const phases = getWorkflowTemplate(projectType);
  return phases.reduce((total, phase) => total + phase.tasks.length, 0);
}
