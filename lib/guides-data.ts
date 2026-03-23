// Guide data for Qualia workflow walkthroughs
// Each guide is a comprehensive step-by-step walkthrough of the real Qualia workflow

export type GuideCategory = 'greenfield' | 'brownfield' | 'workflow' | 'checklist';
export type ProjectType =
  | 'website'
  | 'ai-agent'
  | 'voice-agent'
  | 'ai-platform'
  | 'mobile-app'
  | 'workflow';

export interface GuideStep {
  id: string;
  title: string;
  description?: string;
  commands?: string[];
  tips?: string[];
  warning?: string;
  isMilestone?: boolean;
}

export interface GuideChecklist {
  title: string;
  items: string[];
}

export interface Guide {
  slug: string;
  title: string;
  subtitle: string;
  category: GuideCategory;
  projectType: ProjectType;
  steps: GuideStep[];
  checklist: GuideChecklist;
}

export const guides: Guide[] = [
  // ==================== GREENFIELD: NEW WEBSITE ====================
  {
    slug: 'greenfield-website',
    title: 'Build a New Website',
    subtitle: 'Full walkthrough: Next.js + Supabase + Vercel from zero to production',
    category: 'greenfield',
    projectType: 'website',
    steps: [
      // --- SETUP ---
      {
        id: 'nw-1',
        title: 'Create Your Project Folder',
        description:
          'Open your terminal and create a new directory for the project. This is where all your code will live.',
        commands: ['cd ~/Projects', 'mkdir my-website', 'cd my-website'],
      },
      {
        id: 'nw-2',
        title: 'Start Claude Code',
        description:
          'Launch Claude Code inside your project folder. This is your AI development partner for the entire build.',
        commands: ['claude'],
      },
      // --- NEW PROJECT ---
      {
        id: 'nw-3',
        title: 'Initialize the Qualia Project',
        description:
          "This kicks off the structured project setup. Claude will ask you deep questions about what you're building — your audience, features, pages, design preferences, and goals. Answer thoroughly; this shapes the entire project.",
        commands: ['/qualia:new-project'],
        tips: [
          'Be specific about what you\'re building. Example: "A landing page for a dental clinic with hero section, services grid, team profiles, testimonials carousel, contact form with Supabase, and Google Maps embed. RTL Arabic support. Modern, clean design with blue/white palette."',
          'Mention your stack preferences if any — Claude defaults to Next.js 16+, React 19, TypeScript, Tailwind v4, Supabase, Vercel.',
          'If you have reference sites, mention them: "Similar layout to stripe.com but for healthcare"',
        ],
        isMilestone: true,
      },
      {
        id: 'nw-4',
        title: 'Claude Creates PROJECT.md',
        description:
          'After the Q&A, Claude writes PROJECT.md — a document capturing your requirements, constraints, and decisions. It also picks a project template (website template with ~6 phases) and writes ROADMAP.md with all the phases.',
        tips: [
          "Read through PROJECT.md when Claude shows it. Correct anything that's off — this is the source of truth for the whole build.",
          'The roadmap typically has: Foundation (auth + layout), Core Pages, Dynamic Content, Forms & Interactions, Polish & SEO, Deploy.',
        ],
      },
      {
        id: 'nw-5',
        title: 'Environment Setup',
        description:
          'Claude detects which services you need (Supabase, Vercel, env vars) and walks you through setup. It will ask if you have these configured.',
        tips: [
          'Have your Supabase project URL and anon key ready (from supabase.com dashboard).',
          'Have your Vercel account linked to your Git repo.',
          'Claude creates .env.local with your keys — never commit this file.',
        ],
        warning:
          'If you skip environment setup, things will break during execution. Better to set it up now.',
      },
      // --- PHASE 1: FOUNDATION ---
      {
        id: 'nw-6',
        title: 'Discuss Phase 1 (Foundation)',
        description:
          'Before planning, Claude helps you think through gray areas — decisions that affect implementation. For a website foundation, this might be: navigation style, auth flow, color scheme, layout structure.',
        commands: ['/qualia:discuss-phase 1'],
        tips: [
          'Claude identifies gray areas and lets you pick which to discuss.',
          'For each area, describe how you imagine it: "I want a sticky header with logo left, nav links center, and a CTA button right"',
          'Say "Claude\'s Discretion" for areas you don\'t have strong opinions on.',
          'This creates CONTEXT.md — a decision document that feeds into planning.',
        ],
      },
      {
        id: 'nw-7',
        title: 'Clear Context Window',
        description:
          'Discussion filled up context. Clear it before planning so Claude has room to work.',
        commands: ['/clear'],
        warning:
          'Always /clear between major phases (discuss → plan → execute). This is important — a full context window leads to worse output.',
      },
      {
        id: 'nw-8',
        title: 'Plan Phase 1',
        description:
          'Claude reads your CONTEXT.md decisions and ROADMAP.md goals, then creates detailed implementation plans. Plans are grouped into waves that can execute in parallel. Each plan has specific tasks, acceptance criteria, and skill references.',
        commands: ['/qualia:plan-phase 1'],
        tips: [
          'Claude spawns a planner agent, then a checker agent to verify the plans.',
          'If the checker finds issues, they loop (up to 3 times) until plans are solid.',
          'Plans reference skills like @supabase and @frontend-master so the executor knows HOW to build.',
        ],
      },
      {
        id: 'nw-9',
        title: 'Clear Context Window',
        commands: ['/clear'],
      },
      {
        id: 'nw-10',
        title: 'Execute Phase 1',
        description:
          'Claude reads the plans and executes them wave by wave. Parallel tasks run simultaneously via subagents. Each completed plan gets a SUMMARY.md documenting what was built.',
        commands: ['/qualia:execute-phase 1'],
        tips: [
          'This is where actual code gets written — components, layouts, auth, database setup.',
          'Claude follows the skill files (Supabase patterns, frontend conventions) automatically.',
          'Each plan execution commits code to git with a descriptive message.',
          'If something fails, Claude retries up to 3 times before flagging it.',
        ],
        isMilestone: true,
      },
      {
        id: 'nw-11',
        title: 'Clear Context Window',
        commands: ['/clear'],
      },
      {
        id: 'nw-12',
        title: 'Verify Phase 1',
        description:
          "Claude runs automated tests (if they exist), then walks you through manual UAT — one test at a time. It tells you what SHOULD happen, and you confirm or describe what's different.",
        commands: ['/qualia:verify-work 1'],
        tips: [
          'Open your app in the browser first: npm run dev',
          'For each test, Claude describes expected behavior. Type "pass" if it works, or describe the issue.',
          'Claude infers severity from your description — no need to rate things yourself.',
          'If issues are found, Claude automatically diagnoses root causes and plans fixes.',
        ],
      },
      // --- PHASES 2-6: REPEAT ---
      {
        id: 'nw-13',
        title: 'Clear Context Window',
        commands: ['/clear'],
      },
      {
        id: 'nw-14',
        title: 'Repeat for Phase 2 (Core Pages)',
        description:
          'Same cycle: discuss → clear → plan → clear → execute → clear → verify. Phase 2 typically builds your main pages — homepage sections, about, services, etc.',
        commands: [
          '/qualia:discuss-phase 2',
          '/clear',
          '/qualia:plan-phase 2',
          '/clear',
          '/qualia:execute-phase 2',
          '/clear',
          '/qualia:verify-work 2',
        ],
        tips: [
          'Each phase builds on the previous one. Phase 1 gave you the shell; Phase 2 fills it with content.',
          'If you need to stop mid-project, just close the terminal. Run /qualia:resume-work next time.',
        ],
      },
      {
        id: 'nw-15',
        title: 'Continue Through Remaining Phases',
        description:
          'Repeat the discuss → plan → execute → verify cycle for each remaining phase. A typical website has 5-6 phases covering dynamic content, forms, polish/SEO, and final integration.',
        commands: [
          '/qualia:discuss-phase 3',
          '/qualia:plan-phase 3',
          '/qualia:execute-phase 3',
          '/qualia:verify-work 3',
        ],
        tips: [
          'Later phases handle: dynamic data, contact forms, SEO meta tags, Open Graph images, responsive polish.',
          "Don't forget /clear between each major step.",
          'If you skip discuss-phase and go straight to plan, Claude will plan without your context input — works but less tailored.',
        ],
      },
      // --- COMPLETION ---
      {
        id: 'nw-16',
        title: 'Complete the Milestone',
        description:
          'When all phases are done, run complete-milestone. Claude checks all summaries, ensures everything is verified, deploys to production (via /ship-website), creates a git tag, and updates STATE.md.',
        commands: ['/qualia:complete-milestone'],
        tips: [
          'Claude runs the full deploy pipeline: TypeScript check → ESLint → Build → SEO check → Responsive check → Preview deploy → Production deploy → Post-deploy verification.',
          'If any quality gate fails, Claude stops and tells you what to fix.',
        ],
        isMilestone: true,
      },
      {
        id: 'nw-17',
        title: 'Post-Deploy Verification',
        description:
          "After deployment, Claude verifies: HTTP 200, auth flow, no console errors, API latency under 500ms, SEO tags present in live HTML. You'll get a full report.",
        tips: [
          'Run Lighthouse for a detailed performance/SEO audit: npx lighthouse https://your-site.com',
          'Test on mobile — resize browser or use Chrome DevTools device mode.',
          'Check that all environment variables are set in Vercel dashboard.',
        ],
      },
      {
        id: 'nw-18',
        title: 'Your Website is Live!',
        description:
          'The project is tagged, deployed, and verified. Your .planning/ folder contains the full history — PROJECT.md, ROADMAP.md, all phase plans, summaries, and UAT results.',
        tips: [
          'To resume work later or add features, use the "Add Feature to Production" walkthrough.',
          'Your rollback plan: vercel rollback (instant revert to previous deploy).',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Production Readiness Checklist',
      items: [
        'All phases verified with /qualia:verify-work',
        'TypeScript compiles with zero errors (npx tsc --noEmit)',
        'No ESLint warnings (npx eslint . --max-warnings 0)',
        'Site works on mobile (responsive)',
        'All links work and forms submit correctly',
        'SEO meta tags present (viewport, og:title, og:description)',
        'Environment variables set in Vercel dashboard',
        'Supabase RLS policies enabled on all tables',
        'No console errors in production',
        'Lighthouse score above 90 for performance',
      ],
    },
  },

  // ==================== GREENFIELD: NEW AI AGENT ====================
  {
    slug: 'greenfield-ai-agent',
    title: 'Build a New AI Chat Agent',
    subtitle: 'Full walkthrough: conversational AI with memory, tools, and safety guardrails',
    category: 'greenfield',
    projectType: 'ai-agent',
    steps: [
      {
        id: 'na-1',
        title: 'Create Your Project Folder',
        commands: ['cd ~/Projects', 'mkdir my-ai-agent', 'cd my-ai-agent'],
      },
      {
        id: 'na-2',
        title: 'Start Claude Code',
        commands: ['claude'],
      },
      {
        id: 'na-3',
        title: 'Initialize the Qualia Project',
        description:
          "Describe your AI agent in detail — what it does, who it's for, what data it accesses, what actions it can take.",
        commands: ['/qualia:new-project'],
        tips: [
          'Example: "A customer support agent for an e-commerce store. It answers questions about orders, shipping, returns, and products. It connects to our Supabase database to look up real order data. Uses Claude as the LLM. Has a chat widget that embeds on our website."',
          'Mention if the agent needs: tool calling, RAG (retrieval), conversation memory, multi-turn context, admin dashboard.',
          'Specify safety needs: "Agent should never make promises about refunds without checking policy"',
        ],
        isMilestone: true,
      },
      {
        id: 'na-4',
        title: 'Claude Creates Your Project Structure',
        description:
          'Claude picks the AI agent template (~6 phases) and creates PROJECT.md + ROADMAP.md. The AI agent template phases typically cover: Foundation, AI Core (LLM integration), Conversation Management, Tools & Actions, Safety & Guardrails, Deploy.',
        tips: [
          'The AI agent template includes production resilience by default: token limits, circuit breakers, timeout protection.',
          "Review ROADMAP.md — if you need RAG, make sure there's a phase for document ingestion.",
        ],
      },
      {
        id: 'na-5',
        title: 'Environment Setup',
        description:
          'Set up API keys for your LLM provider, Supabase, and any external services the agent will call.',
        tips: [
          "You'll need: ANTHROPIC_API_KEY or OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY.",
          'If using tool calling with external APIs, have those keys ready too.',
        ],
        warning:
          'AI agents are expensive to run without token limits. Claude configures maxTokens on all AI calls by default.',
      },
      // --- PHASE CYCLE ---
      {
        id: 'na-6',
        title: 'Discuss Phase 1 (Foundation)',
        description:
          'For an AI agent, foundation gray areas include: chat UI style, message persistence, user identification, streaming vs. non-streaming responses.',
        commands: ['/qualia:discuss-phase 1'],
      },
      {
        id: 'na-7',
        title: 'Clear → Plan → Clear → Execute → Clear → Verify',
        description: 'Run the full cycle for Phase 1. Always clear context between steps.',
        commands: [
          '/clear',
          '/qualia:plan-phase 1',
          '/clear',
          '/qualia:execute-phase 1',
          '/clear',
          '/qualia:verify-work 1',
        ],
        tips: [
          'Phase 1 builds: Next.js app shell, Supabase connection, conversation storage, basic chat UI.',
          'After verify, Claude diagnoses any issues and plans fixes automatically.',
        ],
        isMilestone: true,
      },
      {
        id: 'na-8',
        title: 'Phase 2: AI Core',
        description:
          'The LLM integration phase — connecting to your AI provider, setting up the chat completion flow, handling streaming, managing system prompts.',
        commands: [
          '/qualia:discuss-phase 2',
          '/clear',
          '/qualia:plan-phase 2',
          '/clear',
          '/qualia:execute-phase 2',
          '/clear',
          '/qualia:verify-work 2',
        ],
        tips: [
          'During discuss, specify: "I want streaming responses with a typing indicator" or "batch responses are fine".',
          'Claude configures token limits and timeout protection on all AI API routes.',
          'The system prompt is critical — discuss it in detail during discuss-phase.',
        ],
      },
      {
        id: 'na-9',
        title: 'Phase 3: Conversation Management',
        description:
          'Multi-turn context, conversation history, message threading, conversation list/sidebar.',
        commands: [
          '/qualia:discuss-phase 3',
          '/clear',
          '/qualia:plan-phase 3',
          '/clear',
          '/qualia:execute-phase 3',
          '/clear',
          '/qualia:verify-work 3',
        ],
      },
      {
        id: 'na-10',
        title: 'Phase 4: Tools & Actions',
        description:
          'If your agent needs to DO things (look up orders, check inventory, send emails), this phase adds tool calling. Claude sets up function definitions, tool execution, and result formatting.',
        commands: [
          '/qualia:discuss-phase 4',
          '/clear',
          '/qualia:plan-phase 4',
          '/clear',
          '/qualia:execute-phase 4',
          '/clear',
          '/qualia:verify-work 4',
        ],
        tips: [
          'During discuss: list every action the agent should be able to take.',
          'Claude adds circuit breakers on external API calls to prevent cascading failures.',
        ],
      },
      {
        id: 'na-11',
        title: 'Phase 5: Safety & Guardrails',
        description:
          'Content filtering, prompt injection protection, rate limiting, usage tracking, admin monitoring dashboard.',
        commands: [
          '/qualia:discuss-phase 5',
          '/clear',
          '/qualia:plan-phase 5',
          '/clear',
          '/qualia:execute-phase 5',
          '/clear',
          '/qualia:verify-work 5',
        ],
        warning:
          'Never skip the safety phase for production AI agents. Unguarded agents can be exploited.',
      },
      {
        id: 'na-12',
        title: 'Phase 6: Deploy & Production Hardening',
        description:
          'Final polish, performance optimization, error monitoring (Sentry), production deployment.',
        commands: [
          '/qualia:discuss-phase 6',
          '/clear',
          '/qualia:plan-phase 6',
          '/clear',
          '/qualia:execute-phase 6',
          '/clear',
          '/qualia:verify-work 6',
        ],
      },
      {
        id: 'na-13',
        title: 'Complete the Milestone',
        description:
          'Claude runs the full production deploy pipeline including: TypeScript check, lint, build, webhook idempotency check, timeout protection check, circuit breaker check, token limits check, Sentry configuration check.',
        commands: ['/qualia:complete-milestone'],
        tips: [
          "The AI agent ship pipeline checks production resilience patterns that don't apply to simple websites.",
          'Run a load test if your agent will handle concurrent users.',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'AI Agent Production Checklist',
      items: [
        'All phases verified with /qualia:verify-work',
        'Token limits set on all AI API calls (maxTokens)',
        'Timeout protection on API routes (export const maxDuration)',
        'Circuit breakers on external API calls',
        'Webhook idempotency implemented (deduplication logic)',
        'Rate limiting configured per user/IP',
        'System prompt reviewed for injection vulnerabilities',
        "Conversation history has size limits (don't send 100K tokens per request)",
        'Error monitoring active (Sentry configured)',
        'Supabase RLS policies enabled on all tables',
        'Environment variables set in production',
        'Streaming responses handle disconnections gracefully',
      ],
    },
  },

  // ==================== GREENFIELD: NEW VOICE AGENT ====================
  {
    slug: 'greenfield-voice-agent',
    title: 'Build a New Voice Agent',
    subtitle:
      'Full walkthrough: real-time voice AI with telephony, transcription, and response generation',
    category: 'greenfield',
    projectType: 'voice-agent',
    steps: [
      {
        id: 'nv-1',
        title: 'Create Your Project Folder',
        commands: ['cd ~/Projects', 'mkdir my-voice-agent', 'cd my-voice-agent'],
      },
      {
        id: 'nv-2',
        title: 'Start Claude Code',
        commands: ['claude'],
      },
      {
        id: 'nv-3',
        title: 'Initialize the Qualia Project',
        description:
          'Describe your voice agent — what calls it handles, what language(s), what integrations, what the conversation flow looks like.',
        commands: ['/qualia:new-project'],
        tips: [
          'Example: "A voice agent for a restaurant that handles reservations. It answers the phone, asks how many guests, preferred date/time, and name. It checks availability against our Supabase database and confirms or suggests alternatives. Supports English and Arabic. Uses Twilio for telephony, Deepgram for transcription, and Claude for response generation."',
          'Specify latency requirements — voice needs sub-500ms response time.',
          'Mention if you need: call recording, sentiment analysis, handoff to human, outbound calling.',
        ],
        isMilestone: true,
      },
      {
        id: 'nv-4',
        title: 'Claude Creates Your Project Structure',
        description:
          'Claude picks the voice agent template (~6 phases). Typical phases: Foundation, Telephony Integration, Speech Pipeline (STT + TTS), Conversation Logic, Call Management, Deploy.',
        tips: [
          'Voice agents need edge functions for low latency — Claude uses Supabase Edge Functions or Vercel Edge.',
          'The template includes latency budgets and real-time WebSocket patterns.',
        ],
      },
      {
        id: 'nv-5',
        title: 'Environment Setup',
        description:
          'Voice agents need more API keys than typical projects — telephony provider, speech-to-text, text-to-speech, LLM.',
        tips: [
          'Typical keys needed: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, DEEPGRAM_API_KEY, ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.',
          'Some providers (like Vapi or Retell) bundle telephony + speech into one SDK.',
        ],
        warning:
          'Voice API costs add up fast. Set up usage alerts in your provider dashboards before going live.',
      },
      {
        id: 'nv-6',
        title: 'Phase 1: Foundation',
        description:
          'Base infrastructure — Next.js app, Supabase connection, webhook endpoints, basic call routing.',
        commands: [
          '/qualia:discuss-phase 1',
          '/clear',
          '/qualia:plan-phase 1',
          '/clear',
          '/qualia:execute-phase 1',
          '/clear',
          '/qualia:verify-work 1',
        ],
        isMilestone: true,
      },
      {
        id: 'nv-7',
        title: 'Phase 2: Telephony Integration',
        description:
          'Connect to Twilio/Vonage/Vapi — handle inbound calls, set up WebSocket streams, configure phone numbers.',
        commands: [
          '/qualia:discuss-phase 2',
          '/clear',
          '/qualia:plan-phase 2',
          '/clear',
          '/qualia:execute-phase 2',
          '/clear',
          '/qualia:verify-work 2',
        ],
        tips: [
          'During discuss: specify your telephony provider and whether you need inbound, outbound, or both.',
          'Test with your actual phone — Claude will set up ngrok or a tunnel for local testing.',
        ],
      },
      {
        id: 'nv-8',
        title: 'Phase 3: Speech Pipeline',
        description:
          'Speech-to-text transcription and text-to-speech synthesis. Real-time audio streaming, language detection, voice selection.',
        commands: [
          '/qualia:discuss-phase 3',
          '/clear',
          '/qualia:plan-phase 3',
          '/clear',
          '/qualia:execute-phase 3',
          '/clear',
          '/qualia:verify-work 3',
        ],
        tips: [
          'During discuss: pick your voices (male/female, language, accent).',
          'If supporting Arabic: specify dialect (Gulf, Levantine, Egyptian, MSA).',
          'Latency is critical here — Claude configures streaming transcription, not batch.',
        ],
      },
      {
        id: 'nv-9',
        title: 'Phase 4: Conversation Logic',
        description:
          'The AI brain — system prompt, conversation state machine, decision making, tool calling (database lookups, booking actions).',
        commands: [
          '/qualia:discuss-phase 4',
          '/clear',
          '/qualia:plan-phase 4',
          '/clear',
          '/qualia:execute-phase 4',
          '/clear',
          '/qualia:verify-work 4',
        ],
        tips: [
          'Map out the conversation flow: greeting → identify intent → gather info → take action → confirm → goodbye.',
          'Handle interruptions — users talk over the agent. Discuss how to handle this.',
          'Set timeouts — if user goes silent for 10 seconds, what happens?',
        ],
      },
      {
        id: 'nv-10',
        title: 'Phase 5: Call Management',
        description:
          'Call recording, logging, analytics, admin dashboard, human handoff, call queue management.',
        commands: [
          '/qualia:discuss-phase 5',
          '/clear',
          '/qualia:plan-phase 5',
          '/clear',
          '/qualia:execute-phase 5',
          '/clear',
          '/qualia:verify-work 5',
        ],
      },
      {
        id: 'nv-11',
        title: 'Phase 6: Deploy & Production Hardening',
        description:
          'Edge function deployment for low latency, monitoring, error handling, load testing.',
        commands: [
          '/qualia:discuss-phase 6',
          '/clear',
          '/qualia:plan-phase 6',
          '/clear',
          '/qualia:execute-phase 6',
          '/clear',
          '/qualia:verify-work 6',
        ],
      },
      {
        id: 'nv-12',
        title: 'Complete the Milestone',
        description:
          'Full deploy pipeline including voice-specific checks: edge function latency, WebSocket stability, telephony webhook verification.',
        commands: ['/qualia:complete-milestone'],
        tips: [
          'Claude checks that edge functions respond under 200ms.',
          'Webhook endpoints are verified with actual test calls.',
          'Call quality metrics are baseline-tested before going live.',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Voice Agent Production Checklist',
      items: [
        'All phases verified with /qualia:verify-work',
        'Edge functions deploy successfully and respond under 200ms',
        'Telephony webhooks are idempotent (handle duplicate events)',
        'WebSocket connections handle disconnects gracefully',
        'Timeout protection on all API routes',
        'Circuit breakers on external APIs (Twilio, Deepgram, LLM)',
        'Token limits set on LLM calls',
        'Call recording complies with local laws (consent requirements)',
        'Silence/timeout handling tested',
        'Human handoff path tested end-to-end',
        'Load tested with concurrent call simulation',
        'Error monitoring active (Sentry)',
        'Usage alerts configured on telephony and speech providers',
      ],
    },
  },

  // ==================== GREENFIELD: NEW MOBILE APP ====================
  {
    slug: 'greenfield-mobile-app',
    title: 'Build a New Mobile App',
    subtitle: 'Full walkthrough: React Native Expo + NestJS + Supabase from zero to app stores',
    category: 'greenfield',
    projectType: 'mobile-app',
    steps: [
      {
        id: 'nm-1',
        title: 'Create Your Project Folder',
        commands: ['cd ~/Projects', 'mkdir my-app', 'cd my-app'],
      },
      {
        id: 'nm-2',
        title: 'Start Claude Code',
        commands: ['claude'],
      },
      {
        id: 'nm-3',
        title: 'Initialize the Qualia Project',
        description:
          'Describe your mobile app — what it does, target platform (iOS/Android/both), key screens, user roles, and any backend requirements.',
        commands: ['/qualia:new-project'],
        tips: [
          'Example: "A property management app for HOAs in Saudi Arabia. Tenants can view their unit, pay dues, submit maintenance requests, and see announcements. Admins can manage properties, verify tenants, process payments, and send notifications. RTL Arabic + English. Uses Expo for mobile, NestJS for backend API, Supabase for database and auth."',
          'Mention if you need: push notifications, offline support, camera/gallery access, maps, payment processing.',
          'Specify platform: "iOS and Android via Expo" — Claude uses the mobile-app template.',
        ],
        isMilestone: true,
      },
      {
        id: 'nm-4',
        title: 'Claude Creates Your Project Structure',
        description:
          'Claude picks the mobile-app template. This is a monorepo structure with separate folders for the Expo app and NestJS backend. Typical phases: Foundation, Auth & User Management, Core Features, Payments & Financial, Notifications, App Store Prep.',
        tips: [
          'The monorepo has: /apps/mobile (Expo), /apps/api (NestJS), /packages/shared (types, utils).',
          'Claude configures Expo Router for file-based navigation.',
          'RTL support is built in from Phase 1 if you mentioned Arabic.',
        ],
      },
      {
        id: 'nm-5',
        title: 'Environment Setup',
        description:
          'Mobile apps need more setup than web — Expo account, Firebase for push notifications, payment provider keys.',
        tips: [
          'Keys needed: SUPABASE_URL, SUPABASE_ANON_KEY, EXPO_PROJECT_ID.',
          'For push notifications: FIREBASE_PROJECT_ID, google-services.json (Android), GoogleService-Info.plist (iOS).',
          'For payments: STRIPE_SECRET_KEY or HYPERPAY_ENTITY_ID depending on region.',
        ],
        warning:
          'iOS builds require a Mac with Xcode. Android builds work anywhere. Expo EAS handles both.',
      },
      {
        id: 'nm-6',
        title: 'Phase 1: Foundation',
        description:
          'Expo project setup, navigation structure, Supabase connection, NestJS API scaffold, shared types package, RTL configuration.',
        commands: [
          '/qualia:discuss-phase 1',
          '/clear',
          '/qualia:plan-phase 1',
          '/clear',
          '/qualia:execute-phase 1',
          '/clear',
          '/qualia:verify-work 1',
        ],
        tips: [
          'During discuss: specify your navigation pattern — tab bar? drawer? stack-only?',
          'Claude sets up Expo Router with typed routes from the start.',
          'Foundation includes: i18n setup (Arabic + English), theme system, base components.',
        ],
        isMilestone: true,
      },
      {
        id: 'nm-7',
        title: 'Phase 2: Auth & User Management',
        description:
          'Login/signup flows (OTP, email, social), role-based access (tenant vs admin), profile management, tenant verification.',
        commands: [
          '/qualia:discuss-phase 2',
          '/clear',
          '/qualia:plan-phase 2',
          '/clear',
          '/qualia:execute-phase 2',
          '/clear',
          '/qualia:verify-work 2',
        ],
        tips: [
          'Supabase Auth handles the heavy lifting. Claude wires up the mobile auth flow.',
          'For Saudi apps: OTP via SMS is standard. Discuss which SMS provider to use.',
          'RBAC is configured at the NestJS API level with guards + Supabase RLS at the database level.',
        ],
      },
      {
        id: 'nm-8',
        title: 'Phase 3: Core Features',
        description:
          'The main screens and functionality — whatever makes your app useful. For a property app: unit dashboard, maintenance requests, announcements, document viewer.',
        commands: [
          '/qualia:discuss-phase 3',
          '/clear',
          '/qualia:plan-phase 3',
          '/clear',
          '/qualia:execute-phase 3',
          '/clear',
          '/qualia:verify-work 3',
        ],
        tips: [
          'During discuss: walk through each screen in detail. What does the user see? What can they tap?',
          'Claude uses React Native best practices: FlatList for lists, proper keyboard avoidance, platform-specific styling.',
        ],
      },
      {
        id: 'nm-9',
        title: 'Phase 4: Payments & Financial',
        description:
          'Payment processing, dues tracking, receipts, payment history. Uses your chosen provider (Stripe, HyperPay, etc.).',
        commands: [
          '/qualia:discuss-phase 4',
          '/clear',
          '/qualia:plan-phase 4',
          '/clear',
          '/qualia:execute-phase 4',
          '/clear',
          '/qualia:verify-work 4',
        ],
        tips: [
          'Payments go through the NestJS backend, never directly from the mobile app.',
          'Claude sets up a financial ledger pattern — every money movement is double-entry recorded.',
          'Test with sandbox/test credentials before going live.',
        ],
        warning:
          'Never store card numbers in your database. Use tokenized payments through your provider.',
      },
      {
        id: 'nm-10',
        title: 'Phase 5: Notifications',
        description:
          'Push notifications via Firebase Cloud Messaging, in-app notification center, device token management.',
        commands: [
          '/qualia:discuss-phase 5',
          '/clear',
          '/qualia:plan-phase 5',
          '/clear',
          '/qualia:execute-phase 5',
          '/clear',
          '/qualia:verify-work 5',
        ],
        tips: [
          'During discuss: list every notification type (payment due, maintenance update, new announcement, etc.).',
          'Claude configures Firebase for both iOS and Android.',
          'Notification preferences (per-type opt-in/out) are handled in the app settings screen.',
        ],
      },
      {
        id: 'nm-11',
        title: 'Phase 6: App Store Prep & Deploy',
        description:
          'App icons, splash screens, app store screenshots, EAS Build configuration, production API deployment, store submission.',
        commands: [
          '/qualia:discuss-phase 6',
          '/clear',
          '/qualia:plan-phase 6',
          '/clear',
          '/qualia:execute-phase 6',
          '/clear',
          '/qualia:verify-work 6',
        ],
        tips: [
          'Expo EAS Build handles the native builds — no Xcode/Android Studio needed for CI.',
          'Claude generates app.json with proper bundle identifiers, version numbers, and permissions.',
          'Store submission is manual — Claude prepares all the assets and metadata you need.',
        ],
      },
      {
        id: 'nm-12',
        title: 'Complete the Milestone',
        description:
          'Full deploy: NestJS API to production, Expo build via EAS, Supabase migrations pushed, git tagged.',
        commands: ['/qualia:complete-milestone'],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Mobile App Production Checklist',
      items: [
        'All phases verified with /qualia:verify-work',
        'TypeScript compiles with zero errors',
        'App runs on both iOS and Android (test via Expo Go or dev build)',
        'RTL layout works correctly for Arabic',
        'Push notifications work on real devices',
        'Payments tested in sandbox mode end-to-end',
        'Offline graceful degradation (no crashes without network)',
        'Deep links work correctly',
        'App icons and splash screen configured',
        'EAS Build succeeds for both platforms',
        'API rate limiting and auth guards active',
        'Supabase RLS policies enabled on all tables',
        'App store metadata and screenshots prepared',
        'Privacy policy and terms of service URLs set',
      ],
    },
  },

  // ==================== BROWNFIELD: ADD FEATURE TO PRODUCTION ====================
  {
    slug: 'brownfield-add-feature',
    title: 'Add a Feature to a Live Project',
    subtitle: 'Safely add features to production without breaking what works',
    category: 'brownfield',
    projectType: 'workflow',
    steps: [
      {
        id: 'bf-1',
        title: 'Open Your Existing Project',
        description: "Navigate to your existing project that's already in production.",
        commands: ['cd ~/Projects/my-existing-app'],
      },
      {
        id: 'bf-2',
        title: 'Start Claude Code',
        commands: ['claude'],
      },
      {
        id: 'bf-3',
        title: 'Resume Your Project',
        description:
          'If this project was built with Qualia, use resume-work to restore full context. Claude reads STATE.md, finds where you left off, and shows you the project status.',
        commands: ['/qualia:resume-work'],
        tips: [
          'Claude shows: project name, current phase/milestone, progress bar, any incomplete work.',
          "If the project wasn't built with Qualia, Claude offers to map the existing codebase first.",
        ],
      },
      {
        id: 'bf-4',
        title: 'Map the Codebase (If Needed)',
        description:
          'If this is the first time using Qualia on an existing project, map the codebase so Claude understands the architecture.',
        commands: ['/qualia:map-codebase'],
        tips: [
          'This creates a CODEBASE.md that documents: file structure, key patterns, database schema, routing, auth approach.',
          'Claude reads this before planning any changes — prevents it from introducing patterns that conflict with existing code.',
        ],
      },
      {
        id: 'bf-5',
        title: 'Create a New Milestone for the Feature',
        description:
          'Start a new milestone (project phase) for the feature you want to add. Describe what the feature is.',
        commands: ['/qualia:new-project'],
        tips: [
          'Example: "Add a notification system to the existing dashboard. Users should get real-time notifications for new orders, low inventory alerts, and team mentions. Include a notification bell in the header, a dropdown panel, and a full notification history page."',
          'Claude will detect the existing .planning/ folder and create a new milestone (not overwrite).',
          'For small features, this might be a single-phase milestone. For large features, it could be 3-4 phases.',
        ],
        warning:
          'Always work on a git branch for production changes. Claude creates one for you during execution.',
      },
      {
        id: 'bf-6',
        title: 'Discuss the Feature',
        description:
          'Claude identifies gray areas specific to adding this feature to your existing codebase — integration points, data model changes, UI placement, migration strategy.',
        commands: ['/qualia:discuss-phase 1'],
        tips: [
          'Brownfield discuss is more focused than greenfield — Claude asks about how the new feature fits with what exists.',
          'Key questions will be about: where in the UI it lives, what existing tables it relates to, how it affects existing API routes.',
          'Mention any constraints: "Don\'t change the existing header component, add a slot for the notification bell instead"',
        ],
      },
      {
        id: 'bf-7',
        title: 'Clear → Plan',
        description:
          'Claude plans the implementation, taking care to work with existing patterns rather than introducing new ones.',
        commands: ['/clear', '/qualia:plan-phase 1'],
        tips: [
          'The planner reads CODEBASE.md to understand existing patterns.',
          'Plans will reference existing files to modify rather than creating parallel structures.',
          "Database migrations are additive — Claude won't modify existing tables, only add new ones or add columns.",
        ],
      },
      {
        id: 'bf-8',
        title: 'Clear → Execute',
        description:
          'Claude builds the feature, committing to git as it goes. Each plan execution is a separate commit.',
        commands: ['/clear', '/qualia:execute-phase 1'],
        tips: [
          "Claude creates a feature branch automatically if you're on main.",
          'Watch for: import changes to existing files, new migration files, new API routes.',
          'If TypeScript errors appear in existing code, Claude flags them rather than silently changing behavior.',
        ],
        isMilestone: true,
      },
      {
        id: 'bf-9',
        title: 'Clear → Verify',
        description:
          'Test that the new feature works AND that existing functionality is not broken.',
        commands: ['/clear', '/qualia:verify-work 1'],
        tips: [
          'Claude runs existing tests first — if they fail, something broke.',
          'Then walks you through manual UAT of the new feature.',
          'Test the integration points specifically: does the new feature play nicely with existing pages?',
        ],
        warning:
          'If existing tests break, fix them before deploying. This is the whole point of brownfield safety.',
      },
      {
        id: 'bf-10',
        title: 'Preview Deploy',
        description:
          'Deploy to a preview URL first. Test the feature in a production-like environment before going live.',
        tips: [
          'Claude runs: vercel (without --prod) to get a preview URL.',
          'If Supabase migrations exist, Claude tests them on a branch database first.',
          'Share the preview URL with your team for review.',
        ],
      },
      {
        id: 'bf-11',
        title: 'Ship to Production',
        description: 'Complete the milestone, which includes the full production deploy pipeline.',
        commands: ['/qualia:complete-milestone'],
        tips: [
          'Full pipeline: TypeScript → ESLint → Build → Preview → Production deploy → Post-deploy checks.',
          'Claude verifies the live site responds correctly after deploy.',
          'Git tag is created marking this version.',
        ],
        isMilestone: true,
      },
      {
        id: 'bf-12',
        title: 'Rollback Plan',
        description: "If something goes wrong in production, here's how to revert instantly.",
        tips: [
          'Vercel: vercel rollback — instantly reverts to the previous deployment.',
          'Supabase: create a reverse migration with supabase migration new rollback_feature_name.',
          'Emergency: Vercel dashboard → Deployments → click "..." on previous working deploy → "Promote to Production".',
          'Git: the previous tag marks the last known-good state.',
        ],
      },
    ],
    checklist: {
      title: 'Brownfield Safety Checklist',
      items: [
        'Existing tests still pass after changes',
        'New feature verified with /qualia:verify-work',
        'Database migrations are additive (no destructive changes)',
        'Existing API endpoints not broken (test with curl)',
        'Preview deploy tested before production',
        'TypeScript compiles with zero errors',
        'No new ESLint warnings introduced',
        'Feature branch merged (not force-pushed to main)',
        'Rollback tested or documented',
        'Post-deploy verification passed (HTTP 200, no console errors)',
      ],
    },
  },
  // ==================== WORKFLOW: QUALIA COMMANDS ====================
  {
    slug: 'qualia-commands',
    title: 'Claude Code Commands',
    subtitle: 'Slash commands and daily workflows',
    category: 'workflow',
    projectType: 'workflow',
    steps: [
      {
        id: 'qc-1',
        title: 'Starting Claude Code',
        description:
          'Open your terminal, navigate to the project folder, and type "claude". Claude reads the project\'s CLAUDE.md file to understand the codebase.',
        commands: ['cd ~/Projects/[project]', 'claude'],
      },
      {
        id: 'qc-2',
        title: 'Building Features (Qualia Workflow)',
        description: 'These commands manage the full build cycle:',
        commands: [
          '/qualia:new-project — Start a brand new project',
          '/qualia:discuss-phase 1 — Talk through gray areas before planning',
          '/qualia:plan-phase 1 — Plan what to build',
          '/qualia:execute-phase 1 — Build it',
          '/qualia:verify-work 1 — Check everything works',
          '/qualia:complete-milestone — Deploy and tag',
          '/qualia:resume-work — Pick up where you left off',
        ],
        tips: [
          'Always /clear between discuss → plan → execute → verify to free context.',
          'The number after each command is the phase number from your ROADMAP.md.',
        ],
      },
      {
        id: 'qc-3',
        title: 'Specialist Commands',
        description: 'Call in specialists for specific work:',
        commands: [
          '/frontend-master — Build UI components and design',
          '/supabase — Database operations (tables, RLS, migrations)',
          '/voice-agent — Build/modify voice agents',
          '/debug — Fix bugs systematically',
          '/responsive — Fix mobile/tablet layout issues',
        ],
      },
      {
        id: 'qc-4',
        title: 'Deployment Commands',
        description: 'Get your code live:',
        commands: [
          '/ship-website — Full website deploy pipeline',
          '/ship-agent — Deploy AI agent with resilience checks',
          '/ship-voice — Deploy voice agent with latency checks',
          '/deploy — Deploy to Vercel',
          '/deploy-verify — Run post-deploy checks',
        ],
        tips: [
          'All /ship commands include: TypeScript check → ESLint → Build → Preview deploy → Production deploy → Post-deploy verification.',
          'They also include rollback plans if something goes wrong.',
        ],
      },
      {
        id: 'qc-5',
        title: 'Quality Commands',
        description: 'Check code quality:',
        commands: [
          '/review — Code review and security audit',
          '/audit — Quick project health check',
          '/test-runner — Run tests and generate coverage',
        ],
      },
      {
        id: 'qc-6',
        title: 'Daily Workflow',
        description: 'A typical workday using Claude Code:',
        tips: [
          '1. Open terminal → cd to project → "claude"',
          '2. Check where you left off: /qualia:resume-work',
          '3. Build: /qualia:execute-phase or /qualia:quick for small tasks',
          '4. Test: /qualia:verify-work',
          '5. Deploy: /qualia:complete-milestone (or /ship-website for quick deploys)',
          '6. Always /clear between major steps',
        ],
      },
      {
        id: 'qc-7',
        title: 'Talking to Claude',
        description: 'You can just talk to Claude in plain English:',
        tips: [
          '"Add a contact form to the homepage" — Claude builds it',
          '"This button doesn\'t work" — Claude debugs it',
          '"Make this look better on mobile" — Claude fixes responsive',
          '"Deploy this to production" — Claude runs the deploy pipeline',
          'Be specific about what you want. More detail = better results.',
        ],
      },
    ],
    checklist: {
      title: 'Commands Quick Reference',
      items: [
        'Know the build cycle: discuss → plan → execute → verify',
        'Know specialist commands for UI, DB, voice',
        'Know how to deploy: /ship-website or /qualia:complete-milestone',
        'Know how to resume: /qualia:resume-work',
        'Always /clear between major workflow steps',
      ],
    },
  },

  // ==================== WORKFLOW: VERCEL BASICS ====================
  {
    slug: 'vercel-basics',
    title: 'Vercel — How We Deploy',
    subtitle: 'Deployments, env vars, domains, rollbacks',
    category: 'workflow',
    projectType: 'workflow',
    steps: [
      {
        id: 'vb-1',
        title: 'What is Vercel?',
        description:
          'Vercel hosts our websites and apps. When you push code to GitHub, Vercel automatically builds and deploys it. Every project gets a URL like yourproject.vercel.app.',
      },
      {
        id: 'vb-2',
        title: 'Deploying Your Project',
        description: 'The normal way: push to GitHub and Vercel auto-deploys from the main branch.',
        commands: ['git push origin main'],
        tips: [
          'For manual deploy: vercel --prod',
          'Preview deploys happen on every branch push — use them to test before merging',
        ],
      },
      {
        id: 'vb-3',
        title: 'Adding Environment Variables',
        description:
          'Go to Vercel → Your Project → Settings → Environment Variables. Add each variable your app needs (Supabase URL, API keys, etc.).',
        tips: [
          'Select which environments need it: Production, Preview, Development',
          'After adding vars, you must redeploy for them to take effect',
          'Never put secrets in your code — always use env vars',
        ],
      },
      {
        id: 'vb-4',
        title: 'Pulling Env Vars Locally',
        description: 'Instead of copying vars one by one, pull them all at once:',
        commands: ['npx vercel env pull .env.local'],
        tips: ['.env.local is gitignored — it never gets committed'],
      },
      {
        id: 'vb-5',
        title: 'Custom Domains',
        description:
          'Vercel → Project → Settings → Domains → Add your domain. Then update DNS at the registrar:',
        tips: [
          'A record → 76.76.21.21',
          'CNAME (www) → cname.vercel-dns.com',
          'SSL is automatic — just wait a few minutes after DNS propagates',
        ],
      },
      {
        id: 'vb-6',
        title: 'Checking Deployment Status',
        commands: ['vercel ls', 'vercel inspect [deployment-url]'],
        tips: [
          'Green = deployed successfully',
          'Red = build failed — check the build logs',
          'Every push creates a unique deployment URL you can share for testing',
        ],
      },
      {
        id: 'vb-7',
        title: 'Rolling Back if Something Breaks',
        description:
          "If a deploy breaks the site, don't panic. Promote the previous working deployment:",
        commands: ['vercel ls', 'vercel promote [previous-deployment-url] --yes'],
        tips: ['This instantly restores the old version while you figure out the fix'],
      },
    ],
    checklist: {
      title: 'Vercel Quick Reference',
      items: [
        'All env vars set in Vercel dashboard',
        'Production branch is correct (usually main/master)',
        'Custom domain DNS configured',
        'Build passes before pushing',
        'Know how to rollback if needed',
      ],
    },
  },

  // ==================== WORKFLOW: SUPABASE BASICS ====================
  {
    slug: 'supabase-basics',
    title: 'Supabase — Our Database',
    subtitle: 'Dashboard, API keys, auth setup, storage',
    category: 'workflow',
    projectType: 'workflow',
    steps: [
      {
        id: 'sb-1',
        title: 'What is Supabase?',
        description:
          'Supabase is our database + auth + file storage. Every project gets its own Supabase project with a PostgreSQL database, user authentication, and file storage.',
      },
      {
        id: 'sb-2',
        title: 'Finding Your API Keys',
        description: 'Supabase Dashboard → Settings → API. You need two keys for every project:',
        tips: [
          'Project URL: https://[ref].supabase.co — goes in NEXT_PUBLIC_SUPABASE_URL',
          'anon/public key: goes in NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — safe for frontend',
          'service_role key: NEVER in frontend code — only for server-side or admin scripts',
        ],
        warning: 'The service_role key bypasses all security. Never expose it in client-side code.',
      },
      {
        id: 'sb-3',
        title: 'Setting Up Auth Redirect URLs',
        description:
          'This is the #1 thing trainees forget. Go to: Authentication → URL Configuration',
        tips: [
          'Site URL: set to your production URL (https://yourproject.vercel.app)',
          'Redirect URLs: add https://yourproject.vercel.app/** AND http://localhost:3000/**',
          'Without these, login/signup will fail or redirect to the wrong place',
        ],
      },
      {
        id: 'sb-4',
        title: 'Checking Your Tables',
        description:
          'Table Editor shows all your data. Use it to verify data is being saved correctly, check if tables exist, and debug "no data showing" issues.',
      },
      {
        id: 'sb-5',
        title: 'Storage (File Uploads)',
        description:
          'Supabase Storage handles file uploads (logos, documents, images). Go to Storage in the dashboard to see buckets and files.',
        tips: [
          'Files are organized in buckets (like folders)',
          'Each bucket has its own access policies',
          'Public buckets = anyone can view. Private = need auth token',
        ],
      },
      {
        id: 'sb-6',
        title: 'Paused Projects',
        description:
          'Free-tier projects pause after 7 days of inactivity. If a site suddenly stops loading data, check if the Supabase project is paused.',
        tips: [
          'Go to the Supabase Dashboard → the project will show a "Restore" button',
          'Paid projects never pause',
        ],
      },
      {
        id: 'sb-7',
        title: 'Logs (When Things Go Wrong)',
        description:
          'Database → Logs shows all queries, errors, and auth events. Check here when data queries fail or auth stops working.',
      },
    ],
    checklist: {
      title: 'Supabase Quick Reference',
      items: [
        'Know where to find API keys (Settings → API)',
        'Auth redirect URLs configured for both local and production',
        'Understand anon key vs service_role key',
        'Know how to check if project is paused',
        'Know where to find logs',
      ],
    },
  },

  // ==================== WORKFLOW: ENV VARS ====================
  {
    slug: 'env-vars-guide',
    title: 'Environment Variables',
    subtitle: 'Where keys come from, how to set them everywhere',
    category: 'workflow',
    projectType: 'workflow',
    steps: [
      {
        id: 'ev-1',
        title: 'What Are Env Vars?',
        description:
          'Environment variables are secrets (API keys, database URLs) that your app needs but should never be in your code. They live in .env files locally and in Vercel for production.',
      },
      {
        id: 'ev-2',
        title: 'Local Setup (.env.local)',
        description:
          'Create a .env.local file in your project root. This file is gitignored — it stays on your machine only.',
        commands: ['cp .env.example .env.local'],
        tips: [
          'Or pull from Vercel: npx vercel env pull .env.local',
          'After changing .env.local, restart your dev server (npm run dev)',
        ],
      },
      {
        id: 'ev-3',
        title: 'The NEXT_PUBLIC_ Rule',
        description:
          'Variables that start with NEXT_PUBLIC_ are visible in the browser. Everything else is server-only.',
        tips: [
          "NEXT_PUBLIC_SUPABASE_URL — OK in browser (it's just a URL)",
          'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — OK in browser (read-only key)',
          'SUPABASE_SERVICE_ROLE_KEY — NEVER public (full database access)',
          'OPENAI_API_KEY — NEVER public (costs money if leaked)',
        ],
        warning:
          'If a secret key starts with NEXT_PUBLIC_, anyone can see it. Double-check before adding.',
      },
      {
        id: 'ev-4',
        title: 'Where Each Key Comes From',
        description: 'Quick reference for finding API keys:',
        tips: [
          'Supabase URL + anon key → Supabase Dashboard → Settings → API',
          'Supabase service_role → same place, keep it secret',
          'OpenAI/Anthropic AI keys → Their developer dashboards',
          'VAPI keys → VAPI Dashboard → Settings',
          'Resend (email) → Resend Dashboard → API Keys',
        ],
      },
      {
        id: 'ev-5',
        title: 'Adding to Vercel',
        description:
          'Vercel → Project → Settings → Environment Variables. Add each one and select which environments need it.',
        tips: [
          'You MUST redeploy after adding/changing env vars',
          'Use "vercel env ls" to see what\'s currently set',
        ],
      },
      {
        id: 'ev-6',
        title: 'Common Problems',
        description: "If your app can't connect to the database or an API:",
        tips: [
          "Check if the var exists in Vercel (maybe it's only local)",
          'Check for typos in the variable name',
          'Check if you redeployed after adding the var',
          'Check if the key is expired or revoked',
          'Check .env.example to see what vars are needed',
        ],
      },
    ],
    checklist: {
      title: 'Env Vars Checklist',
      items: [
        '.env.local exists and has all needed vars',
        'Same vars are in Vercel for production',
        'No secrets start with NEXT_PUBLIC_',
        '.env.local is in .gitignore',
        'Redeployed after changing Vercel vars',
      ],
    },
  },

  // ==================== WORKFLOW: GIT WORKFLOW ====================
  {
    slug: 'git-workflow',
    title: 'Git & GitHub Workflow',
    subtitle: 'Branches, commits, PRs — the Qualia way',
    category: 'workflow',
    projectType: 'workflow',
    steps: [
      {
        id: 'gw-1',
        title: 'The Golden Rule',
        description: 'Never commit directly to main/master. Always use a feature branch.',
        warning:
          'Pushing broken code to main breaks the live site (Vercel auto-deploys from main).',
      },
      {
        id: 'gw-2',
        title: 'Starting New Work',
        description: 'Always start from the latest main branch:',
        commands: [
          'git checkout main',
          'git pull origin main',
          'git checkout -b feature/what-youre-building',
        ],
        tips: [
          'Branch names: feature/xyz for new stuff, fix/xyz for bug fixes',
          'Keep branch names short and descriptive',
        ],
      },
      {
        id: 'gw-3',
        title: 'Saving Your Work (Commits)',
        description: 'Commit often with clear messages:',
        commands: ['git add [specific files]', 'git commit -m "feat: add contact form"'],
        tips: [
          'feat: = new feature',
          'fix: = bug fix',
          'style: = CSS/visual changes',
          'docs: = documentation',
          'refactor: = restructuring code (no behavior change)',
        ],
      },
      {
        id: 'gw-4',
        title: 'Pushing to GitHub',
        commands: ['git push -u origin feature/your-branch-name'],
        tips: [
          'The -u flag links your local branch to the remote one',
          'After the first push, just "git push" works',
          'Pushing creates a preview deployment on Vercel automatically',
        ],
      },
      {
        id: 'gw-5',
        title: 'Creating a Pull Request',
        description: 'After pushing, create a PR to merge your work into main:',
        commands: [
          'gh pr create --title "feat: add contact form" --body "Added contact form with validation"',
        ],
        tips: [
          'Or go to GitHub → your repo → "Compare & pull request" button',
          'Write a short description of what you changed and why',
        ],
      },
      {
        id: 'gw-6',
        title: 'After PR is Approved',
        commands: ['gh pr merge', 'git checkout main', 'git pull origin main'],
        tips: ['Vercel auto-deploys when main is updated'],
      },
      {
        id: 'gw-7',
        title: 'Common Situations',
        description: 'Things that happen and how to handle them:',
        tips: [
          'Wrong branch? git stash → git checkout right-branch → git stash pop',
          'Behind main? git checkout main → git pull → git checkout your-branch → git merge main',
          'Need to undo last commit? git reset --soft HEAD~1',
          'Messed everything up? Ask Fawzi before doing anything destructive',
        ],
      },
    ],
    checklist: {
      title: 'Git Quick Reference',
      items: [
        'Working on a feature branch (not main)',
        'Commits have clear prefix messages',
        'Pushed to GitHub before EOD',
        'PR created for review',
        'No .env files in the commit',
      ],
    },
  },

  // ==================== WORKFLOW: TROUBLESHOOTING ====================
  {
    slug: 'troubleshooting',
    title: 'When Things Break',
    subtitle: 'Systematic checklist for common problems',
    category: 'workflow',
    projectType: 'workflow',
    steps: [
      {
        id: 'ts-1',
        title: 'White Screen / "Application Error"',
        description: 'Usually a build error or missing env var.',
        tips: [
          'Run "npm run build" locally — does it pass?',
          'Check Vercel → Deployments → build logs for errors',
          'Check Vercel → Settings → Environment Variables — all vars present?',
          'Common: a file was deleted but still imported somewhere',
        ],
      },
      {
        id: 'ts-2',
        title: "Login Doesn't Work",
        description: 'Almost always a Supabase auth URL issue.',
        tips: [
          'Supabase → Authentication → URL Configuration',
          'Site URL must be your production URL (not localhost)',
          'Redirect URLs must include both production/** and localhost:3000/**',
          'After changing these, test in an incognito window',
        ],
      },
      {
        id: 'ts-3',
        title: "Data Doesn't Load",
        description: 'Could be Supabase connection, RLS, or paused project.',
        tips: [
          'Is the Supabase project paused? (free tier pauses after 7 days)',
          'Are the env vars correct? (check project ref matches)',
          'Is the table actually empty? Check Table Editor',
          'Is RLS blocking? Ask your lead to check policies',
        ],
      },
      {
        id: 'ts-4',
        title: '500 Server Error',
        description: 'A server action or API route is crashing.',
        tips: [
          'Check Vercel function logs: "vercel logs"',
          'Run locally: "npm run dev" and reproduce the error',
          'Look at the terminal — the error message tells you the cause',
          'Common: missing env var, changed DB column, expired API key',
        ],
      },
      {
        id: 'ts-5',
        title: 'Site Looks Broken (CSS Issues)',
        description: 'CSS not loading or layout messed up.',
        tips: [
          'Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)',
          "Check if it's only the custom domain (open vercel URL directly)",
          'Redeploy: "vercel --prod"',
          'For mobile issues use: /responsive',
        ],
      },
      {
        id: 'ts-6',
        title: 'Site is Completely Down',
        description: 'Could be Vercel or Supabase outage.',
        tips: [
          'Check vercel-status.com and status.supabase.com',
          'Check if someone deployed recently: "vercel ls"',
          'Check if an env var was deleted: "vercel env ls"',
          'Nuclear option: rollback to previous deployment',
        ],
      },
      {
        id: 'ts-7',
        title: 'Emergency Rollback',
        description: "If the site is down for a client and you can't find the fix:",
        commands: ['vercel ls', 'vercel promote [previous-working-url] --yes'],
        tips: [
          'This restores the old version instantly',
          'Then investigate the root cause calmly',
          'Always tell Fawzi when you do an emergency rollback',
        ],
      },
      {
        id: 'ts-8',
        title: 'When to Escalate',
        description: "Don't spend more than 30 minutes stuck. Reach out to Fawzi with:",
        tips: [
          "What's broken (specific error message or behavior)",
          'What you tried (list what you checked)',
          'Screenshots (error, logs, browser console)',
          'A clear bug report saves everyone time',
        ],
      },
    ],
    checklist: {
      title: 'Troubleshooting Quick Reference',
      items: [
        'Identify the symptom first (white screen? no data? 500 error?)',
        'Check the obvious things (env vars, build, Supabase status)',
        'Read error messages carefully — they usually tell you the cause',
        "Don't guess — investigate systematically",
        'Escalate after 30 minutes if stuck',
        'Know how to rollback in emergencies',
      ],
    },
  },

  // ==================== WORKFLOW: DAILY RESEARCH ====================
  {
    slug: 'daily-research',
    title: 'Daily AI Research',
    subtitle: 'Use Gemini Deep Research + NotebookLM to research daily',
    category: 'workflow',
    projectType: 'workflow',
    steps: [
      {
        id: 'dr-1',
        title: "Check Your Inbox for Today's Research Task",
        description:
          "Open the Qualia dashboard. You'll see a daily research task in your inbox with today's topic.",
      },
      {
        id: 'dr-2',
        title: 'Open Gemini',
        description: 'Go to gemini.google.com in your browser.',
        commands: ['https://gemini.google.com'],
      },
      {
        id: 'dr-3',
        title: 'Use Deep Research',
        description:
          'Click "Deep Research" and paste today\'s topic. Gemini will search the web and compile a comprehensive report.',
        tips: [
          'Be specific with your topic for better results',
          'Wait for the full report to generate',
        ],
      },
      {
        id: 'dr-4',
        title: 'Copy the Research Output',
        description: 'Select all the research output from Gemini and copy it to your clipboard.',
      },
      {
        id: 'dr-5',
        title: 'Open NotebookLM',
        description: 'Go to notebooklm.google.com in your browser.',
        commands: ['https://notebooklm.google.com'],
      },
      {
        id: 'dr-6',
        title: 'Create a Notebook & Paste Research',
        description: 'Create a new notebook, then paste the Gemini research as a source document.',
        tips: ["Name the notebook with today's date and topic"],
      },
      {
        id: 'dr-7',
        title: 'Ask NotebookLM to Summarize',
        description: 'Ask NotebookLM to summarize the key findings and extract action items.',
        tips: [
          '"Summarize the top 5 key findings from this research"',
          '"What are the actionable next steps for an AI agency?"',
        ],
      },
      {
        id: 'dr-8',
        title: 'Go to Research Page in Qualia',
        description: 'Navigate to /research in the Qualia app.',
        commands: ['/research'],
      },
      {
        id: 'dr-9',
        title: 'Log Your Research',
        description:
          'Click "Log Research" and fill in the form with your findings, key takeaways, action items, and source links.',
        tips: ['Use the category that matches your topic', 'Add source links for reference'],
      },
      {
        id: 'dr-10',
        title: 'Mark Task Done',
        description: 'Go back to your inbox and mark the research task as Done.',
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Daily Research Checklist',
      items: [
        "Checked inbox for today's topic",
        'Used Gemini Deep Research',
        'Pasted into NotebookLM',
        'Extracted key findings',
        'Logged in /research page',
        'Added source links',
        'Marked task as Done',
      ],
    },
  },
  // ==================== CHECKLIST: WEBSITE ====================
  {
    slug: 'checklist-website',
    title: 'Website Shipping Checklist',
    subtitle: 'Everything to check before shipping a website — homepage to deployment',
    category: 'checklist',
    projectType: 'website',
    steps: [
      // --- HOMEPAGE ---
      {
        id: 'cw-1',
        title: 'Homepage — Hero Section',
        description:
          'The first thing visitors see. Must grab attention and explain what the business does in 5 seconds.',
        tips: [
          'Clear headline that says what the business does (not a vague tagline)',
          'Subheadline with more detail or value proposition',
          'One strong Call-to-Action button (Contact Us, Get Started, Book Now)',
          'Hero image or background that matches the brand',
          'Works on mobile — text is readable, button is tappable',
        ],
      },
      {
        id: 'cw-2',
        title: 'Homepage — Navigation',
        description: 'The menu bar at the top. Must work on all screen sizes.',
        tips: [
          'Logo links back to homepage',
          'All nav links work (click each one)',
          'Mobile: hamburger menu opens and closes correctly',
          'Mobile: menu items are tappable (44x44px minimum touch target)',
          'Sticky header stays visible when scrolling (if designed that way)',
          'Active page is highlighted in the nav',
        ],
      },
      {
        id: 'cw-3',
        title: 'Homepage — Content Sections',
        description: 'Services, features, about snippet, testimonials, etc.',
        tips: [
          'Each section has a clear heading (H2)',
          'Content is real (no Lorem Ipsum left behind)',
          'Images load properly and have alt text',
          'Animations are smooth (no janky transitions)',
          'Sections look good on mobile (stack vertically, no overflow)',
        ],
      },
      {
        id: 'cw-4',
        title: 'Homepage — Footer',
        description: 'Bottom of every page. Contact info, links, legal.',
        tips: [
          'Business name, phone, email, address (if applicable)',
          'Social media links open in new tab and go to the right profiles',
          'Footer links work (Privacy Policy, Terms, etc.)',
          'Copyright year is current (use dynamic year, not hardcoded)',
          'Footer looks good on mobile',
        ],
      },
      // --- NORMAL PAGES ---
      {
        id: 'cw-5',
        title: 'About Page',
        description: 'Who the business is, what they do, why they do it.',
        tips: [
          'Content is real and proofread',
          'Team photos are optimized (WebP, proper size)',
          'Page has unique title and meta description',
          'Breadcrumbs or clear navigation back to homepage',
        ],
      },
      {
        id: 'cw-6',
        title: 'Services / Products Pages',
        description: 'What the business offers. Each service/product should be clear.',
        tips: [
          'Each service has a clear description',
          'Pricing is shown if applicable',
          'Call-to-action on each service (Contact, Book, Buy)',
          'If multiple services, they link to individual detail pages',
          'Images are relevant and optimized',
        ],
      },
      {
        id: 'cw-7',
        title: 'Contact Page',
        description: 'How to reach the business. Usually has a form.',
        tips: [
          'Contact form submits successfully (test it!)',
          'Form shows success message after submission',
          'Form shows error messages for invalid input',
          'Required fields are marked',
          'Email/phone links are clickable (mailto: and tel:)',
          'Google Maps embed works (if included)',
          'Business hours are listed (if applicable)',
        ],
      },
      {
        id: 'cw-8',
        title: 'All Other Pages',
        description: 'Gallery, FAQ, blog, portfolio — whatever the site has.',
        tips: [
          'Every page has a unique page title (<title> tag)',
          'Every page has a meta description (150-160 characters)',
          'No broken links anywhere (click every link on every page)',
          'No dead-end pages (always a way back to homepage)',
          '404 page exists and looks good (type a random URL to test)',
        ],
      },
      // --- FORMS & PAYMENTS ---
      {
        id: 'cw-9',
        title: 'Forms — Validation',
        description: 'Every form on the site must handle valid and invalid input correctly.',
        tips: [
          'Submit empty form — should show validation errors',
          'Enter invalid email — should reject',
          'Enter valid data — should submit and show success',
          'Button shows loading state while submitting',
          "Can't double-submit by clicking fast (button disables after click)",
        ],
        commands: ['npx tsc --noEmit — check TypeScript types are correct'],
      },
      {
        id: 'cw-10',
        title: 'Forms — Data Storage',
        description: 'If forms save to Supabase, verify the data arrives.',
        tips: [
          'Submit the form, then check Supabase Table Editor — is the data there?',
          'Check that sensitive data is not exposed (passwords hashed, etc.)',
          'If form sends email notifications, test that emails arrive',
        ],
        warning:
          'Never store passwords in plain text. Supabase Auth handles password hashing automatically.',
      },
      {
        id: 'cw-11',
        title: 'Payments (if applicable)',
        description: 'If the site accepts payments (Stripe, HyperPay, etc.).',
        tips: [
          'Test payment with sandbox/test card (Stripe: 4242 4242 4242 4242)',
          'Success: user sees confirmation page or message',
          'Failure: user sees clear error ("Card declined")',
          'Check that payment appears in payment provider dashboard',
          'Check that payment is recorded in your database',
          'Webhook receives payment confirmation from provider',
          'Refund flow works (if applicable)',
        ],
        warning:
          'Never store card numbers in your database. Use tokenized payments through your provider.',
      },
      // --- SEO ---
      {
        id: 'cw-12',
        title: 'SEO — Meta Tags',
        description: 'Search engines need these to show your site correctly in results.',
        tips: [
          'Every page has a unique <title> tag (shown in browser tab)',
          'Every page has a meta description (shown in Google results)',
          'Open Graph tags set: og:title, og:description, og:image',
          'Favicon exists (the small icon in the browser tab)',
          'Heading hierarchy: one H1 per page, then H2, H3 in order',
        ],
        commands: [
          'curl -s https://yoursite.com | grep -i "<title>" — check title tag',
          'curl -s https://yoursite.com | grep -i "og:" — check OG tags',
        ],
      },
      {
        id: 'cw-13',
        title: 'SEO — Technical',
        description: 'Files that help search engines find and index your site.',
        tips: [
          'robots.txt exists and allows crawling (visit /robots.txt)',
          'sitemap.xml exists (visit /sitemap.xml)',
          'JSON-LD structured data on homepage (Organization or LocalBusiness)',
          'All images have alt text (describe what the image shows)',
          'No broken links (search engines penalize broken links)',
        ],
      },
      // --- RESPONSIVE ---
      {
        id: 'cw-14',
        title: 'Responsive — Mobile (375px)',
        description: 'Test every page on a phone-sized screen.',
        tips: [
          'Open Chrome DevTools (F12) > Toggle device toolbar (Ctrl+Shift+M)',
          'Select iPhone SE or set width to 375px',
          'All text is readable without zooming (minimum 16px body text)',
          'No horizontal scrollbar (nothing overflows the screen)',
          'Buttons and links are tappable (minimum 44x44px)',
          'Images scale down properly (not stretched or cropped)',
          "Forms are usable (inputs are full width, keyboard doesn't cover them)",
        ],
      },
      {
        id: 'cw-15',
        title: 'Responsive — Tablet (768px) & Desktop (1280px)',
        description: 'Test layout at tablet and desktop sizes.',
        tips: [
          'Tablet (768px): layout adjusts — maybe 2 columns instead of 1 or 3',
          "Desktop (1280px): content doesn't stretch too wide (use max-width)",
          'No awkward empty space or squished elements',
          'Navigation switches between mobile hamburger and desktop menu at the right breakpoint',
        ],
      },
      // --- VISUAL QUALITY ---
      {
        id: 'cw-16',
        title: 'Visual Quality',
        description: 'The site should look professional, not like a template.',
        tips: [
          'Distinctive fonts loaded (NOT Inter, Arial, or system default)',
          'Brand colors applied consistently (same palette everywhere)',
          'Hover effects on all buttons and links',
          'Animations are smooth (no jank, no layout shift)',
          'No orphaned text (single words alone on a line in headings)',
          'Images are crisp (not blurry or pixelated)',
          'Consistent spacing between sections',
        ],
      },
      // --- SECURITY ---
      {
        id: 'cw-17',
        title: 'Security',
        description: 'Protect the site and its data.',
        tips: [
          'No API keys or secrets hardcoded in source code',
          'No .env files committed to git',
          '.env.example exists with variable names (no values)',
          'All env vars set in Vercel dashboard',
          'No eval() or dangerouslySetInnerHTML in code',
          'If site has auth: server-side auth checks on all mutations',
          'If site has database: RLS enabled on every table',
          'CORS not set to * in production',
        ],
        commands: [
          'git log --all --full-history -- "*.env*" — should return nothing',
          'grep -r "service_role" app/ components/ src/ — should return nothing',
        ],
      },
      // --- CODE QUALITY ---
      {
        id: 'cw-18',
        title: 'Code Quality',
        description: 'Clean code before shipping.',
        commands: [
          'npx tsc --noEmit — TypeScript check (zero errors)',
          'npm run lint — ESLint check (zero warnings)',
          'npm run build — build check (completes successfully)',
        ],
        tips: [
          'No console.log left in production code',
          'No TODO or FIXME comments left unresolved',
          'No commented-out code blocks',
          'CLAUDE.md is complete and accurate',
          'README.md has setup instructions',
        ],
      },
      // --- DEPLOYMENT ---
      {
        id: 'cw-19',
        title: 'Deploy to Production',
        description: 'Push the site live.',
        commands: [
          'git push origin main — push code to GitHub',
          'vercel --prod — deploy to production',
        ],
        tips: [
          'Custom domain configured in Vercel (if applicable)',
          'SSL certificate active (HTTPS works)',
          'All environment variables set in Vercel',
        ],
        isMilestone: true,
      },
      {
        id: 'cw-20',
        title: 'Post-Deploy Verification',
        description: 'After deploying, run these checks on the LIVE site.',
        commands: [
          'curl -s -o /dev/null -w "%{http_code}" https://yoursite.com — should return 200',
          'curl -w "%{time_total}" https://yoursite.com — should be under 3 seconds',
        ],
        tips: [
          'Homepage loads successfully (HTTP 200)',
          'Auth flow works (login/signup if applicable)',
          'No JavaScript errors in browser console (F12 > Console)',
          'Key pages load under 3 seconds on mobile',
          'All forms still work on the live site',
          'Images load from the live URL',
        ],
      },
      {
        id: 'cw-21',
        title: 'Client Handoff',
        description: 'Hand the project over to the client.',
        tips: [
          'Client walkthrough/demo completed',
          'Client has access to all accounts (Vercel, Supabase, domain)',
          'Documentation provided (how to update content, how to access admin)',
          'Project registered in Qualia ERP (portal.qualiasolutions.net)',
          'Added to UptimeRobot monitoring',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Website Ready to Ship?',
      items: [
        'All pages have real content (no Lorem Ipsum)',
        'All links work (tested every single one)',
        'All forms submit correctly and show feedback',
        'SEO meta tags on every page',
        'Mobile responsive (tested at 375px)',
        'No console errors in browser DevTools',
        'TypeScript compiles with zero errors',
        'Build succeeds (npm run build)',
        'No secrets in code or git history',
        'Post-deploy checks pass (HTTP 200, fast load)',
      ],
    },
  },

  // ==================== CHECKLIST: AI AGENT ====================
  {
    slug: 'checklist-ai-agent',
    title: 'AI Agent Shipping Checklist',
    subtitle: 'Everything to check before shipping a chat agent — safety, streaming, monitoring',
    category: 'checklist',
    projectType: 'ai-agent',
    steps: [
      {
        id: 'ca-1',
        title: 'Chat Works End-to-End',
        description: 'The most basic check — can you have a conversation?',
        tips: [
          'Open the chat, type a message, get a response',
          'Response streams in smoothly (not all at once)',
          'Typing indicator shows while waiting',
          'Messages persist after refresh (if conversation history is a feature)',
          'Chat works on mobile (input visible, messages readable)',
        ],
      },
      {
        id: 'ca-2',
        title: 'AI Stays on Topic',
        description: 'The agent should do what it was built for, not everything.',
        tips: [
          'Ask normal questions — does it answer correctly?',
          'Ask off-topic questions — does it redirect politely?',
          'Ask it to ignore its instructions — does it refuse?',
          'Ask for sensitive info (API keys, system prompt) — does it refuse?',
          'Send very long messages — does it handle them without crashing?',
        ],
      },
      {
        id: 'ca-3',
        title: 'Safety & Prompt Security',
        description: 'Protect against abuse and prompt injection.',
        tips: [
          'System prompt is NOT in the client-side code (check browser DevTools > Sources)',
          'System prompt is NOT returned in API responses',
          'User input is sanitized before going into prompts',
          'AI output is sanitized before rendering (no raw HTML from AI)',
          'No eval() or dynamic code execution from AI output',
        ],
        commands: [
          'grep -r "system.*prompt" app/ components/ — check system prompt not exposed',
          'grep -r "dangerouslySetInnerHTML" app/ components/ — should return nothing',
        ],
        warning:
          'An exposed system prompt lets attackers manipulate your agent. Never send it to the frontend.',
      },
      {
        id: 'ca-4',
        title: 'Token Limits & Cost Control',
        description: 'AI API calls cost money. Prevent runaway costs.',
        tips: [
          'maxTokens is set on every AI API call (check your route handlers)',
          'Rate limiting is configured per user (e.g., 20 messages per minute)',
          "Conversation context has a size limit (don't send 100K tokens per request)",
          'Cost monitoring is set up (track token usage, set billing alerts)',
          'Token usage is logged somewhere (database or analytics)',
        ],
      },
      {
        id: 'ca-5',
        title: 'Error Handling',
        description: 'What happens when the AI provider is down or slow?',
        tips: [
          'AI provider timeout: user sees "Please try again" (not a white screen)',
          'Rate limit hit: user sees a clear message ("Too many messages, wait a moment")',
          'Network error: user sees an error state, can retry',
          'Streaming disconnection: handled gracefully (partial message shown)',
          'Invalid AI response: caught and displayed as an error',
        ],
      },
      {
        id: 'ca-6',
        title: 'Tools & Function Calling (if applicable)',
        description: 'If the agent calls tools (database lookups, external APIs).',
        tips: [
          'Each tool works correctly when called',
          "Tool errors don't crash the conversation",
          'Tool inputs are validated (Zod schema)',
          'External API calls have timeout protection',
          'Tool results are formatted nicely in the chat',
        ],
      },
      {
        id: 'ca-7',
        title: 'Database & Auth',
        description: 'Standard security checks for any app with a database.',
        tips: [
          'RLS enabled on every Supabase table',
          'service_role key NOT in any client component',
          'Auth checks on all server mutations',
          'Users can only see their own conversations',
          'Conversation data is properly scoped to the authenticated user',
        ],
        commands: ['grep -r "service_role" app/ components/ src/ — should return nothing'],
      },
      {
        id: 'ca-8',
        title: 'Monitoring & Logging',
        description: 'Know when things break in production.',
        tips: [
          'Error tracking configured (Sentry or similar)',
          'Token usage tracked per user and per day',
          'Conversation logs stored for debugging',
          'Uptime monitoring active (UptimeRobot)',
          'Billing alerts set on AI provider dashboard',
        ],
      },
      {
        id: 'ca-9',
        title: 'Code Quality & Deploy',
        commands: [
          'npx tsc --noEmit — TypeScript check',
          'npm run lint — ESLint check',
          'npm run build — build check',
          'git push origin main',
          'vercel --prod — deploy',
        ],
        tips: [
          'No console.log in production code',
          'All env vars set in Vercel',
          'Post-deploy: test a real conversation on the live URL',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'AI Agent Ready to Ship?',
      items: [
        'Chat works end-to-end (send message, get response)',
        'Streaming responses display smoothly',
        'System prompt not exposed to users',
        'maxTokens set on all AI calls',
        'Rate limiting configured per user',
        'Error states handle gracefully (timeout, rate limit, network)',
        'Tools work correctly and handle failures',
        'RLS enabled, service_role not in client code',
        'Monitoring active (Sentry, token tracking)',
        'Post-deploy conversation test passed',
      ],
    },
  },

  // ==================== CHECKLIST: VOICE AGENT ====================
  {
    slug: 'checklist-voice-agent',
    title: 'Voice Agent Shipping Checklist',
    subtitle: 'Everything to check before shipping a voice agent — calls, latency, webhooks',
    category: 'checklist',
    projectType: 'voice-agent',
    steps: [
      {
        id: 'cv-1',
        title: 'Make a Test Call',
        description: 'The most important test — call the agent and have a real conversation.',
        tips: [
          'Call from VAPI dashboard first (test call button)',
          'Then call from a real phone (if phone number is configured)',
          'Agent greets you naturally',
          'Agent understands your questions',
          'Agent responds in 1-2 sentences (not long paragraphs)',
          'No awkward silences or audio gaps',
          'Agent confirms important info back to you (dates, names, numbers)',
        ],
      },
      {
        id: 'cv-2',
        title: 'Voice Configuration',
        description: 'The voice provider, speech-to-text, and LLM settings.',
        tips: [
          'VAPI assistant created and configured',
          'Voice sounds natural (test Cartesia or ElevenLabs)',
          'Speech-to-text works accurately (test with accents if needed)',
          'System prompt is written for voice (short, conversational)',
          'First message sounds natural ("Hi, thanks for calling...")',
          'End-call message is configured',
        ],
      },
      {
        id: 'cv-3',
        title: 'Conversation Flow',
        description: 'Test the actual use cases the agent was built for.',
        tips: [
          'Happy path works (normal booking, normal question, normal request)',
          'Edge cases handled (unavailable dates, invalid info, weird requests)',
          'Interruption handling works (talk over the agent — does it stop and listen?)',
          'Silence timeout works (stay quiet for 10 seconds — what happens?)',
          'Agent handles "I don\'t understand" gracefully',
          'Escape route exists ("say operator for a human")',
        ],
      },
      {
        id: 'cv-4',
        title: 'Webhook & Tools',
        description: 'The backend that handles tool calls during conversations.',
        tips: [
          'Webhook endpoint is deployed and accessible from the internet',
          'Webhook signature verification is implemented (x-vapi-signature check)',
          'Each tool works correctly when called during a conversation',
          'Tool input validation with Zod',
          'Tool errors are handled gracefully (agent says "let me try that again")',
          'Call logs are stored in database',
        ],
        commands: ['curl -X POST https://your-webhook-url/api/vapi — should not crash'],
      },
      {
        id: 'cv-5',
        title: 'Latency & Performance',
        description: 'Voice agents must respond FAST. Users hang up after 2 seconds of silence.',
        tips: [
          'First response latency under 500ms',
          'Webhook response time under 300ms',
          'No audio gaps during tool execution',
          'Edge function cold start is acceptable (test after 5 minutes of no calls)',
        ],
        commands: [
          'curl -w "%{time_total}" https://your-webhook-url/api/vapi — should be under 0.3s',
        ],
        warning:
          'If latency is too high, users will hang up. This is the #1 reason voice agents fail.',
      },
      {
        id: 'cv-6',
        title: 'Deployment',
        description: 'Get the voice agent live.',
        tips: [
          'Webhook deployed to production (Cloudflare Worker, Vercel, or Supabase)',
          'VAPI assistant updated with PRODUCTION webhook URL (not localhost)',
          'Phone number connected (if applicable)',
          'Webhook secrets set in production environment',
          'Final production test call successful',
        ],
        commands: [
          'wrangler deploy — for Cloudflare Workers',
          'vercel --prod — for Vercel',
          'supabase functions deploy — for Supabase Edge Functions',
        ],
        isMilestone: true,
      },
      {
        id: 'cv-7',
        title: 'Monitoring',
        description: 'Know when calls fail in production.',
        tips: [
          'Error tracking active (Sentry or logging)',
          'Token usage tracked and alerted',
          'Call logs stored for debugging',
          'Uptime monitoring on webhook endpoint',
          'Usage alerts configured on VAPI/Twilio/telephony provider',
        ],
      },
    ],
    checklist: {
      title: 'Voice Agent Ready to Ship?',
      items: [
        'Test call from VAPI dashboard works',
        'Real phone call works (if phone number configured)',
        'Responses are short (1-2 sentences)',
        'No awkward silences during tool execution',
        'Interruption handling works',
        'Webhook response under 300ms',
        'Webhook signature verification enabled',
        'All tools work and handle errors',
        'Production webhook URL set in VAPI',
        'Final production test call passed',
      ],
    },
  },

  // ==================== CHECKLIST: MOBILE APP ====================
  {
    slug: 'checklist-mobile-app',
    title: 'Mobile App Shipping Checklist',
    subtitle: 'Everything to check before shipping a mobile app — screens, auth, store submission',
    category: 'checklist',
    projectType: 'mobile-app',
    steps: [
      {
        id: 'cm-1',
        title: 'App Basics',
        description: 'The bare minimum before anything else.',
        tips: [
          'App icon designed and configured (all required sizes)',
          'Splash screen shows on launch',
          'App name is correct in the title bar',
          'Version number is set correctly',
          "App doesn't crash on launch (test iOS + Android)",
        ],
      },
      {
        id: 'cm-2',
        title: 'All Screens Work',
        description: 'Go through every screen in the app.',
        tips: [
          'Every screen listed in the requirements is built',
          'Navigation works (tap forward, tap back, swipe back)',
          'Deep links work (if configured)',
          'Pull-to-refresh works on list screens',
          'Loading states show on all async operations',
          'Empty states show on empty lists ("No items yet")',
          'Error messages are user-friendly (not raw error codes)',
        ],
      },
      {
        id: 'cm-3',
        title: 'Auth Flow',
        description: 'Login, signup, logout, and session management.',
        tips: [
          'Login works (test with valid and invalid credentials)',
          'Signup works (new user can create account)',
          'Logout works (clears session, returns to login)',
          'Password reset works (if applicable)',
          'Session persists after closing and reopening the app',
          'Unauthorized users cannot access protected screens',
        ],
      },
      {
        id: 'cm-4',
        title: 'Forms & Input',
        description: 'Every form in the app needs validation.',
        tips: [
          'Required fields show errors when empty',
          'Invalid input is rejected with clear message',
          'Valid input submits successfully',
          "Keyboard doesn't cover input fields",
          'Keyboard dismiss works (tap outside or swipe down)',
          'Loading state shows during submission',
          "Can't double-submit by tapping fast",
        ],
      },
      {
        id: 'cm-5',
        title: 'Platform Testing',
        description: 'Test on both iOS and Android.',
        tips: [
          'Works on iOS (test on real device or simulator)',
          'Works on Android (test on real device or emulator)',
          'Safe area insets respected (notch, home indicator, status bar)',
          'Dark mode works (if applicable)',
          'Orientation is locked or handled correctly',
          'Keyboard behavior is correct on both platforms',
        ],
      },
      {
        id: 'cm-6',
        title: 'RTL & i18n (if applicable)',
        description: 'If the app supports Arabic or other RTL languages.',
        tips: [
          'All strings use message keys (no hardcoded text)',
          'Arabic text renders correctly (right-to-left layout)',
          'Icons flip correctly in RTL mode (arrows, chevrons)',
          'Western numerals (0-9) used everywhere (not Eastern Arabic numerals)',
          'Date/time formatting is locale-aware',
          'Language switcher works without restart',
        ],
      },
      {
        id: 'cm-7',
        title: 'Push Notifications (if applicable)',
        description: 'FCM for Android, APNs for iOS.',
        tips: [
          'Device token registration works on both platforms',
          'Test notification received on real device',
          'Notification tap opens the correct screen in the app',
          'Notification preferences work (user can opt out of specific types)',
          'Background notifications work (app closed)',
          'Foreground notifications work (app open)',
        ],
      },
      {
        id: 'cm-8',
        title: 'Security',
        description: 'Mobile-specific security checks.',
        tips: [
          'Sensitive data stored in SecureStore (NOT AsyncStorage)',
          'API keys are NOT in the client bundle',
          "Auth tokens have refresh logic (don't expire mid-session)",
          'Certificate pinning enabled (if handling sensitive data like payments)',
          'No sensitive data in console logs',
        ],
        commands: [
          'grep -r "AsyncStorage" src/ — check for sensitive data in plain storage',
          'grep -r "service_role" src/ — should return nothing',
        ],
      },
      {
        id: 'cm-9',
        title: 'Payments (if applicable)',
        description: 'In-app payments via Stripe, HyperPay, or similar.',
        tips: [
          'Payment goes through backend API (never directly from mobile)',
          'Test with sandbox/test card',
          'Success and failure states handled correctly',
          'Payment is recorded in database',
          'Receipt or confirmation shown to user',
          'Refund flow works (if applicable)',
        ],
        warning:
          'Apple requires in-app purchases for digital goods. Physical goods/services can use external payment.',
      },
      {
        id: 'cm-10',
        title: 'Build & Deploy',
        description: 'Create production builds and submit to stores.',
        commands: [
          'eas build --platform all — create iOS and Android builds',
          'eas submit --platform ios — submit to App Store',
          'eas submit --platform android — submit to Play Store',
        ],
        tips: [
          'App Store screenshots prepared (all required sizes)',
          'Play Store screenshots prepared',
          'App description written in both languages (if bilingual)',
          'Privacy policy URL provided',
          'Test build distributed to client for approval before store submission',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Mobile App Ready to Ship?',
      items: [
        'All screens work on iOS and Android',
        'Auth flow works end-to-end',
        'All forms validate correctly',
        'Push notifications work on real devices',
        'RTL/Arabic layout correct (if applicable)',
        'Payments work in sandbox mode',
        'No sensitive data in AsyncStorage',
        'EAS Build succeeds for both platforms',
        'App store screenshots and metadata prepared',
        'Client approved the test build',
      ],
    },
  },

  // ==================== CHECKLIST: PLATFORM / SAAS ====================
  {
    slug: 'checklist-platform',
    title: 'Platform / SaaS Shipping Checklist',
    subtitle:
      'Everything to check before shipping a platform with auth, dashboard, and AI features',
    category: 'checklist',
    projectType: 'ai-platform',
    steps: [
      {
        id: 'cp-1',
        title: 'Authentication',
        description: 'Login, signup, logout, password reset — must all work perfectly.',
        tips: [
          'Login works with valid credentials',
          'Login fails gracefully with invalid credentials (clear error message)',
          'Signup creates a new user successfully',
          'Email verification works (if enabled)',
          'Password reset sends email and works end-to-end',
          'Logout clears session and redirects to login',
          'Protected pages redirect to login when not authenticated',
        ],
      },
      {
        id: 'cp-2',
        title: 'Authorization & Multi-Tenancy',
        description: 'Users should only see their own data. Admins see admin stuff.',
        tips: [
          "User A cannot see User B's data (test with two accounts)",
          'Admin-only pages are hidden from regular users',
          'Server-side auth checks on every mutation (never trust client)',
          'RLS policies are enabled and tested on every Supabase table',
          'API routes check auth before processing',
        ],
        commands: [
          'grep -r "service_role" app/ components/ src/ — should return nothing in client code',
        ],
      },
      {
        id: 'cp-3',
        title: 'Dashboard & CRUD',
        description: 'Create, Read, Update, Delete — the core of any platform.',
        tips: [
          'Create: new items appear in the list after creation',
          'Read: data loads correctly with loading states',
          'Update: edits save and persist after refresh',
          'Delete: items are removed (with confirmation dialog)',
          'Search/filter works correctly',
          'Pagination works (if applicable)',
          'Empty states show when no data exists',
        ],
      },
      {
        id: 'cp-4',
        title: 'AI Features (if applicable)',
        description: 'Any AI/LLM integration needs safety checks.',
        tips: [
          'System prompt is NOT in client-side code',
          'User input is sanitized before going into prompts',
          'AI output is sanitized before rendering',
          'Token limits set on all AI calls (maxTokens)',
          'Rate limiting on AI endpoints (per user, per minute)',
          'Streaming works smoothly (if applicable)',
          'Error handling for AI provider failures',
          'Cost monitoring configured',
        ],
      },
      {
        id: 'cp-5',
        title: 'Forms & Validation',
        description: 'Every form uses Zod validation.',
        tips: [
          'All forms validate on submit (Zod schemas)',
          'Server Actions return ActionResult { success, error?, data? }',
          'Loading states during submission',
          'Success feedback after actions complete',
          'Error messages are user-friendly',
          'Cache invalidation after mutations (revalidatePath or revalidateTag)',
        ],
      },
      {
        id: 'cp-6',
        title: 'Error Handling',
        description: 'The app should never show a white screen or crash.',
        tips: [
          'Error boundaries on all pages (catch rendering errors)',
          '404 page exists and looks good',
          'Network errors show retry option (not a crash)',
          'No unhandled promise rejections in console',
          'Loading states on all async operations',
        ],
      },
      {
        id: 'cp-7',
        title: 'Performance',
        description: 'The app should feel fast.',
        tips: [
          'Build bundle size is reasonable (no massive chunks)',
          'Images optimized (WebP/AVIF, lazy loading)',
          'No N+1 database queries',
          'API responses under 500ms for key endpoints',
          'Fonts loaded efficiently (next/font or font-display: swap)',
        ],
        commands: [
          'npm run build — check for bundle size warnings',
          'curl -w "%{time_total}" https://yourapp.com/api/healthcheck — should be under 0.5s',
        ],
      },
      {
        id: 'cp-8',
        title: 'Deploy & Verify',
        commands: [
          'npx tsc --noEmit — TypeScript check',
          'npm run lint — ESLint check',
          'npm run build — build check',
          'vercel --prod — deploy to production',
          'curl -s -o /dev/null -w "%{http_code}" https://yourapp.com — should return 200',
        ],
        tips: [
          'All env vars set in Vercel',
          'Supabase migrations applied',
          'Auth redirect URLs configured for production domain',
          'Post-deploy: log in, create data, verify it persists',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Platform Ready to Ship?',
      items: [
        'Auth works (login, signup, logout, password reset)',
        'Multi-tenancy: users only see their own data',
        'RLS enabled on all tables',
        'CRUD operations work correctly',
        'AI features have safety guardrails (if applicable)',
        'All forms validate with Zod',
        'Error boundaries on all pages',
        'No console errors in production',
        'API latency under 500ms',
        'Post-deploy verification passed',
      ],
    },
  },

  // ==================== CHECKLIST: UNIVERSAL (ALL PROJECTS) ====================
  {
    slug: 'checklist-universal',
    title: 'Universal Quality Checklist',
    subtitle: 'Applies to EVERY project — code quality, security, deployment, handoff',
    category: 'checklist',
    projectType: 'workflow',
    steps: [
      {
        id: 'cu-1',
        title: 'Code Quality',
        description: 'Run these commands before every deployment.',
        commands: [
          'npx tsc --noEmit — TypeScript compiles with zero errors',
          'npm run lint — ESLint passes with zero warnings',
          'npm run build — build completes successfully',
        ],
        tips: [
          'No console.log statements in production code',
          'No TODO or FIXME comments left unresolved',
          'No commented-out code blocks',
          'CLAUDE.md is complete (stack, structure, commands, env vars)',
          'README.md has setup instructions for the next developer',
        ],
      },
      {
        id: 'cu-2',
        title: 'Security',
        description: 'Non-negotiable security checks for every project.',
        commands: [
          'git log --all --full-history -- "*.env*" — should return nothing',
          'grep -r "service_role" app/ components/ src/ — should return nothing',
        ],
        tips: [
          'No API keys or secrets hardcoded in code',
          'No .env files in git history',
          '.env.example exists with variable names only',
          'All env vars set in deployment platform (Vercel/Cloudflare)',
          'No eval() or dangerouslySetInnerHTML',
          'Server-side auth on all mutations',
          'CORS not set to * in production',
        ],
        warning:
          'If service_role key is in client code, anyone can bypass all your security. Fix immediately.',
      },
      {
        id: 'cu-3',
        title: 'Database (if applicable)',
        description: 'Supabase security and setup.',
        tips: [
          'RLS (Row Level Security) enabled on EVERY table — no exceptions',
          'RLS policies written and tested for each table',
          'service_role key only used in server-side code',
          'Supabase client created from lib/supabase/server.ts for mutations',
          'TypeScript types generated from database schema',
          'Migrations committed to supabase/migrations/',
          'Indexes on frequently queried columns',
        ],
      },
      {
        id: 'cu-4',
        title: 'Testing',
        description: 'Manual testing at minimum.',
        tips: [
          'All features tested manually',
          'All forms tested (valid + invalid input)',
          'Error states tested (network off, invalid data, unauthorized)',
          'Mobile responsive tested (real device or DevTools)',
          'Cross-browser tested (Chrome + Safari minimum)',
        ],
      },
      {
        id: 'cu-5',
        title: 'Performance',
        description: 'The app should be fast.',
        tips: [
          'Build bundle size is reasonable',
          'Images optimized (WebP/AVIF, proper sizing, lazy loading)',
          'No N+1 database queries',
          'API responses under 500ms',
          'Fonts loaded efficiently',
        ],
      },
      {
        id: 'cu-6',
        title: 'Deployment',
        description: 'Deploy and verify.',
        commands: [
          'git push origin main — push to GitHub',
          'vercel --prod — deploy (or wrangler deploy for Cloudflare)',
          'curl -s -o /dev/null -w "%{http_code}" https://yoursite.com — HTTP 200 check',
          'curl -w "%{time_total}" https://yoursite.com — latency check (under 3s)',
        ],
        tips: [
          'Custom domain configured (if applicable)',
          'SSL certificate active',
          'Auth flow works on live site',
          'No console errors on live site',
          'Added to UptimeRobot monitoring',
        ],
        isMilestone: true,
      },
      {
        id: 'cu-7',
        title: 'Handoff',
        description: 'Hand the project to the client properly.',
        tips: [
          'Client walkthrough/demo completed',
          'Client has access to necessary accounts',
          'Documentation provided (how to use, how to update)',
          'Project registered in Qualia ERP (portal.qualiasolutions.net)',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Universal Ship Checklist',
      items: [
        'TypeScript: zero errors (npx tsc --noEmit)',
        'ESLint: zero warnings (npm run lint)',
        'Build: succeeds (npm run build)',
        'Security: no secrets in code or git',
        'Database: RLS on all tables',
        'Testing: all features tested manually',
        'Deploy: HTTP 200, no console errors',
        'Handoff: client demo completed',
      ],
    },
  },
];

// Helper functions
export function getGuidesByCategory(category: GuideCategory): Guide[] {
  return guides.filter((g) => g.category === category);
}

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export function searchGuides(query: string): Guide[] {
  const lower = query.toLowerCase();
  return guides.filter(
    (g) =>
      g.title.toLowerCase().includes(lower) ||
      g.subtitle.toLowerCase().includes(lower) ||
      g.steps.some(
        (s) =>
          s.title.toLowerCase().includes(lower) ||
          s.description?.toLowerCase().includes(lower) ||
          s.commands?.some((c) => c.toLowerCase().includes(lower))
      )
  );
}
