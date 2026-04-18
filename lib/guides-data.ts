// Knowledge Base — Qualia Framework v3.1.0 Workflow Guides
// Updated 2026-04-12 against qualia-framework v3.1.0 (npm: qualia-framework).
// Each guide teaches the REAL workflow with simple commands and real scenarios.

export type GuideCategory = 'foundations' | 'lifecycle' | 'operations' | 'reference' | 'checklist';

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
  /** Show a code/file example block with monospace + dark background */
  example?: string;
  /** Title for the example block (e.g., "Example: STATE.md") */
  exampleTitle?: string;
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
  // =====================================================================
  // FOUNDATIONS — Understanding the system before you use it
  // =====================================================================

  {
    slug: 'getting-started',
    title: 'Getting Started with Qualia',
    subtitle: 'Install the framework, learn the basics, start your first day',
    category: 'foundations',
    projectType: 'workflow',
    steps: [
      {
        id: 'gs-1',
        title: 'What is Qualia Framework?',
        description:
          'Qualia Framework is a workflow system that runs inside Claude Code. You type slash commands and the AI handles planning, building, and verification for you. There are no extra tools to install, no dashboards to learn, and no complex setup. If you can type a command, you can use Qualia.',
        tips: [
          'Think of it as your AI-powered project assistant. You tell it what to build, it breaks it into tasks, builds them, and checks its own work.',
          'Everything happens in your terminal. No browser tabs, no Jira boards, no Notion pages.',
        ],
      },
      {
        id: 'gs-2',
        title: 'Installing',
        description:
          'Run the install command and enter your team code when prompted. You get your code from Fawzi. This is a one-time setup. After installing, restart Claude Code so everything loads properly.',
        commands: ['npx qualia-framework install'],
        tips: [
          'Get your team code from Fawzi before starting. It looks like QS-YOURNAME-NN.',
          'The installer sets up everything automatically: commands, agents, rules, and settings.',
          'After install, close and reopen Claude Code so the new settings take effect.',
        ],
        example:
          'Enter install code: QS-MOAYAD-03\n\n' +
          'Installing Qualia Framework v3.1.0...\n\n' +
          'Skills        Done\n' +
          'Agents        Done\n' +
          'Hooks         Done\n' +
          'Rules         Done\n' +
          'Knowledge     Done\n\n' +
          'Ready. Restart Claude Code to begin.',
        exampleTitle: 'What you see during install',
      },
      {
        id: 'gs-3',
        title: 'Your First Session',
        description:
          'Open your terminal, navigate to any project folder, and run claude. The framework loads automatically and shows you the project status. It tells you exactly where you are and what to do next. No guessing.',
        commands: ['cd ~/Projects/my-project', 'claude'],
        example:
          'QUALIA — Project Loaded\n\n' +
          '  Phase: 1 of 4 — Foundation\n' +
          '  Status: ready to plan\n\n' +
          '  Next: /qualia-plan 1',
        exampleTitle: 'What you see when you open a project',
        isMilestone: true,
      },
      {
        id: 'gs-4',
        title: 'The 5 Commands You Will Use Daily',
        description:
          'There are many commands available, but these five cover 90% of your daily work. Start here.',
        commands: [
          '/qualia          — What should I do next? Reads your project state and tells you.',
          '/qualia-new      — Start a brand new project from scratch.',
          '/qualia-quick    — Fast fix for something small (under 1 hour).',
          '/qualia-report   — End of day report. MANDATORY before clock-out.',
          '/qualia-idk      — Same as /qualia. Use when you feel stuck.',
        ],
        tips: [
          'When in doubt, type /qualia. It reads your project state and tells you the exact next step.',
          '/qualia-report is not optional. The ERP will not let you clock out without it.',
        ],
      },
      {
        id: 'gs-5',
        title: 'Updating',
        description:
          'The framework updates itself silently every 24 hours. You can also update manually or check your version at any time. If you are upgrading from v2, use the migrate command to move your settings over.',
        commands: [
          'qualia-framework update       # Update to the latest version',
          'qualia-framework version      # Check your current version',
          'qualia-framework migrate      # Upgrade from v2 to v3 (one-time)',
        ],
        tips: [
          'Auto-updates happen in the background and never interrupt your work.',
          'After a manual update, restart Claude Code so the new version loads.',
          'The migrate command is only needed once, when moving from v2 to v3.',
        ],
      },
      {
        id: 'gs-6',
        title: 'Getting Help',
        description:
          'There are three levels of help. First, type /qualia or /qualia-idk to let the framework figure out what you need. Second, use /qualia-debug if something is broken and you need to investigate. Third, ask Fawzi directly if you have been stuck for more than 30 minutes.',
        tips: [
          '/qualia is always the right first step when you are lost.',
          '/qualia-debug follows a structured investigation process so you find the real problem, not just patch symptoms.',
          'Do not spend more than 30 minutes stuck on the same issue. Escalate to Fawzi.',
        ],
      },
    ],
    checklist: {
      title: 'Getting Started Checklist',
      items: [
        'Framework installed via npx qualia-framework install',
        'Team code accepted (got it from Fawzi)',
        'Claude Code restarted after install',
        'Project status banner appears when you open a project',
        'Knows the 5 daily commands: /qualia, /qualia-new, /qualia-quick, /qualia-report, /qualia-idk',
        'Knows to type /qualia when lost',
        'Committed to running /qualia-report before clock-out every day',
      ],
    },
  },

  {
    slug: 'how-projects-work',
    title: 'How Projects Work',
    subtitle: 'The road from new project to client handoff',
    category: 'foundations',
    projectType: 'workflow',
    steps: [
      {
        id: 'hp-1',
        title: 'The Road',
        description:
          'Every project follows the same path, no matter how big or small. New project setup, then repeat the plan/build/verify loop for each phase, then polish, ship, hand off, and report. The framework tracks where you are and always tells you the next step.',
        example:
          '/qualia-new    Set up the project\n' +
          '     |\n' +
          'For each phase:\n' +
          '  /qualia-plan     Plan the work\n' +
          '  /qualia-build    Build it\n' +
          '  /qualia-verify   Check it works\n' +
          '     |\n' +
          '/qualia-polish   Final design pass\n' +
          '/qualia-ship     Deploy to production\n' +
          '/qualia-handoff  Deliver to client\n' +
          '/qualia-report   Log your work (mandatory)',
        exampleTitle: 'The Road',
      },
      {
        id: 'hp-2',
        title: 'Getting Assigned',
        description:
          'Fawzi creates the project on the ERP and connects it to a GitHub repo. You get notified. Clone the repo, navigate into it, and run claude. The framework picks up the project automatically and shows you what to do.',
        commands: [
          'git clone git@github.com:QualiasolutionsCY/project-name.git',
          'cd project-name',
          'claude',
        ],
        tips: [
          'All our repos live under two GitHub organizations: QualiasolutionsCY for main projects, and SakaniQualia for the Sakani project.',
          'All repos are private. If you cannot access one, ask Fawzi to add you.',
        ],
      },
      {
        id: 'hp-3',
        title: 'Setting Up a New Project',
        description:
          'Run /qualia-new and answer the questions one at a time. It asks about the project type, who the client is, what features you need, and what design direction to follow. When it finishes, everything is set up: the codebase, the GitHub repo, the design spec, and the project roadmap.',
        commands: ['/qualia-new'],
        tips: [
          'Be specific in your answers. Instead of "a website," say "a water delivery website for Cyprus with a product catalog, online ordering, and a coverage map."',
          'Mention the client name and any brand colors or fonts they already have.',
          'The framework creates a DESIGN.md with 12 sections covering colors, fonts, spacing, components, accessibility, and more.',
        ],
      },
      {
        id: 'hp-4',
        title: 'Working in Phases',
        description:
          'Projects are broken into 3-6 phases. Each phase has a clear goal like "Foundation" or "Core Pages." For each phase you plan it, build it, and verify it. When verification passes, the framework automatically moves you to the next phase. You never have to manually track where you are.',
        commands: [
          '/qualia-plan 1      # Plan phase 1',
          '/qualia-build 1     # Build phase 1',
          '/qualia-verify 1    # Verify phase 1 — moves to phase 2 on PASS',
        ],
        tips: [
          'If verification fails, the framework tells you exactly what to fix. You plan the fixes, build them, and verify again.',
          'Each phase is self-contained. You do not need to remember what happened in previous phases.',
        ],
      },
      {
        id: 'hp-5',
        title: 'Pausing and Resuming',
        description:
          'When you stop for the day, run /qualia-pause to save your progress. When you come back tomorrow, run /qualia-resume to pick up exactly where you left off. Nothing is lost between sessions.',
        commands: [
          '/qualia-pause     # Save progress before you stop',
          '/qualia-resume    # Pick up where you left off',
        ],
        tips: [
          'If you forget to pause, /qualia-resume still works. It reads your project state and figures out where you were.',
          'Always run /qualia-report before you clock out, even if you pause first.',
        ],
      },
      {
        id: 'hp-6',
        title: 'The ERP Connection',
        description:
          'Every time you push code, a tracking file updates automatically. The ERP reads this file from GitHub, so your project status on the ERP dashboard is always current. At the end of each day, /qualia-report generates a session summary and uploads it to the ERP. This is what connects your work to the clock-in/clock-out system.',
        tips: [
          'You do not need to manually update the ERP. It reads your project status from GitHub automatically.',
          '/qualia-report is mandatory. The ERP clock-out screen will not let you finish your day without a report uploaded.',
          'If you forget to report and cannot clock out, run /qualia-report immediately and then try again.',
        ],
        warning:
          'Clock-out will not work without a report. Run /qualia-report before ending your day, every day.',
      },
    ],
    checklist: {
      title: 'How Projects Work Checklist',
      items: [
        'Understands the road: new > plan > build > verify > polish > ship > handoff > report',
        'Knows how to clone and open a project',
        'Can run /qualia-new to set up a new project',
        'Understands phases: plan it, build it, verify it, repeat',
        'Knows /qualia-pause and /qualia-resume for multi-day projects',
        'Understands that every push syncs to the ERP automatically',
        '/qualia-report is mandatory for clock-out',
      ],
    },
  },

  {
    slug: 'tools-and-services',
    title: 'Our Tools and Services',
    subtitle: 'Supabase, Vercel, Railway, OpenRouter — what we use and why',
    category: 'foundations',
    projectType: 'workflow',
    steps: [
      {
        id: 'ts-1',
        title: 'Supabase',
        description:
          'Supabase is our database for everything. It handles authentication (login/signup), file storage (images, documents), realtime updates, and of course the database itself. There is a Supabase MCP available in Claude Code so the AI can interact with your database directly. On the command line, use npx supabase. One critical rule: always enable Row Level Security (RLS) on every table. This ensures users can only see and edit their own data.',
        commands: ['npx supabase'],
        tips: [
          'RLS is non-negotiable. Every table must have it enabled with policies that check who the user is.',
          'The Supabase MCP lets Claude Code read your database schema, run queries, and manage migrations.',
          'Ask Fawzi for database credentials. Never hardcode them in your project files.',
        ],
      },
      {
        id: 'ts-2',
        title: 'Vercel',
        description:
          'Vercel hosts all our websites. We have 3 teams on Vercel. Important: there are NO automatic deploys. Every deployment goes through /qualia-ship, which runs quality checks first and then deploys via the Vercel CLI. This is intentional. We do not want broken code going live automatically.',
        commands: [
          'vercel             # Preview deploy',
          'vercel link        # Link a project to Vercel',
          'vercel --prod      # Production deploy (use /qualia-ship instead)',
        ],
        warning:
          'Never deploy by pushing to main and relying on auto-deploy. We do not use auto-deploy. Always go through /qualia-ship, which runs quality gates first.',
        tips: [
          'Use /qualia-ship instead of running vercel --prod directly. It runs security and quality checks before deploying.',
          'If you need to link a new project to Vercel, run vercel link in the project folder.',
        ],
      },
      {
        id: 'ts-3',
        title: 'Railway',
        description:
          'Railway is for long-running processes that do not fit on Vercel. AI agents that need to stay running, background job workers, and services that need persistent connections. There is a Railway MCP available in Claude Code. On the command line, use railway.',
        commands: ['railway'],
        tips: [
          'Use Railway when your service needs to run continuously, not just respond to web requests.',
          'The Railway MCP lets Claude Code manage your Railway services directly.',
          'Ask Fawzi for Railway credentials if you need access.',
        ],
      },
      {
        id: 'ts-4',
        title: 'OpenRouter',
        description:
          'OpenRouter routes AI requests to the best model available. Instead of having separate API keys for Claude, GPT, Llama, and Gemini, you use one OpenRouter API key and it handles the routing. This gives us model failover (if one is down, it tries another) and cost tracking in one place.',
        tips: [
          'One API key for all AI models. Ask Fawzi for a key when you need one.',
          'OpenRouter handles billing, rate limits, and failover automatically.',
          'You can specify which model you want, or let OpenRouter pick the best one for the job.',
        ],
      },
      {
        id: 'ts-5',
        title: 'Voice: Retell AI + ElevenLabs',
        description:
          'For voice agents, we use three services together. Retell AI handles the conversation logic (what the agent says, how it responds, when it transfers to a human). ElevenLabs provides the voice synthesis (making the AI sound natural and human-like). Telnyx provides the phone numbers and call infrastructure.',
        tips: [
          'Retell AI is for the conversation: prompts, tool calls, and call flow.',
          'ElevenLabs is for the voice: how it sounds, what language, what accent.',
          'Telnyx is for the phone: numbers, routing, SMS capabilities.',
          'Always test voice agents with real phone calls. Dashboard previews do not reflect real-world latency.',
        ],
      },
      {
        id: 'ts-6',
        title: 'GitHub',
        description:
          'All our code lives on GitHub across two organizations. QualiasolutionsCY is for main client projects and internal tools. SakaniQualia is specifically for the Sakani project. All repositories are private. We always use feature branches for our work and never push directly to main.',
        tips: [
          'QualiasolutionsCY: main projects and internal tools.',
          'SakaniQualia: the Sakani project.',
          'All repos are private. Ask Fawzi for access if you cannot see a repo.',
          'Always work on a feature branch. The framework will block you from pushing to main.',
        ],
      },
    ],
    checklist: {
      title: 'Tools and Services Checklist',
      items: [
        'Knows Supabase: database, auth, storage, realtime. Always enable RLS.',
        'Knows Vercel: 3 teams, NO auto-deploy, always use /qualia-ship',
        'Knows Railway: long-running AI agents and background jobs',
        'Knows OpenRouter: one API key for all AI models',
        'Knows voice stack: Retell AI (conversation) + ElevenLabs (voice) + Telnyx (phone)',
        'Knows GitHub orgs: QualiasolutionsCY (main) and SakaniQualia (Sakani)',
        'Always uses feature branches, never pushes to main directly',
      ],
    },
  },

  // =====================================================================
  // LIFECYCLE — Building different types of projects
  // =====================================================================

  {
    slug: 'build-website',
    title: 'Building a Website Step by Step',
    subtitle: 'From empty folder to live site — a real example with Aquador',
    category: 'lifecycle',
    projectType: 'website',
    steps: [
      {
        id: 'bw-1',
        title: 'Create the Project',
        description:
          'Let us walk through building a fictional water delivery website called "Aquador" from start to finish. First, create a folder, open Claude Code, and run the project wizard. It asks you questions one at a time: what are you building, who is the client, what features, what design style. Answer them and it sets everything up.',
        commands: ['mkdir -p ~/Projects/aquador', 'cd ~/Projects/aquador', 'claude', '/qualia-new'],
        tips: [
          'Be descriptive: "Premium water delivery website for Cyprus. Product catalog, online ordering, delivery coverage map, customer accounts. Clean and modern design with blue accents."',
          'The wizard creates the GitHub repo, the design spec, the project roadmap, and the initial codebase. You just answer questions.',
        ],
      },
      {
        id: 'bw-2',
        title: 'Review the Roadmap',
        description:
          'After setup, the framework shows you a roadmap of 4 phases. Each phase has a clear goal. You can approve it or ask to adjust it before moving on.',
        example:
          '| # | Phase        | Goal                              |\n' +
          '|---|--------------|-----------------------------------|\n' +
          '| 1 | Foundation   | Database, auth, layout, design    |\n' +
          '| 2 | Core Pages   | Homepage, products, navigation    |\n' +
          '| 3 | Ordering     | Cart, checkout, order management  |\n' +
          '| 4 | Polish       | Design pass, testing, hardening   |',
        exampleTitle: 'Aquador roadmap',
        tips: [
          'Most websites have 3-5 phases. The framework suggests a roadmap based on your features.',
          'You can ask to add, remove, or rearrange phases before you start.',
        ],
      },
      {
        id: 'bw-3',
        title: 'Phase 1: Foundation',
        description:
          'For every phase, you run three commands: plan, build, verify. Plan breaks the phase into tasks. Build executes them. Verify checks that everything actually works. When verify says PASS, you automatically move to the next phase.',
        commands: [
          '/qualia-plan 1      # Creates 2-5 tasks for Phase 1',
          '/qualia-build 1     # Builds all tasks',
          '/qualia-verify 1    # Checks the work — PASS means move on',
        ],
        example:
          'Phase 1 Verification\n\n' +
          'Correctness:   5/5\n' +
          'Completeness:  4/5\n' +
          'Wiring:        5/5\n' +
          'Quality:       4/5\n\n' +
          'Result: PASS\n' +
          'Auto-advancing to Phase 2.',
        exampleTitle: 'What PASS looks like',
        isMilestone: true,
      },
      {
        id: 'bw-4',
        title: 'Phases 2-3: Features',
        description:
          'Same loop for every phase. Plan it, build it, verify it. Between phases, you can use /qualia-quick for small fixes that come up along the way, like tweaking a color or fixing a typo.',
        commands: [
          '/qualia-plan 2 && /qualia-build 2 && /qualia-verify 2',
          '/qualia-quick "fix the logo size on mobile"',
          '/qualia-plan 3 && /qualia-build 3 && /qualia-verify 3',
        ],
        tips: [
          'Use /qualia-quick for small tweaks between phases. It does not interrupt the phase flow.',
          'If verify fails, the framework tells you exactly what went wrong. Plan the fix, build it, verify again.',
        ],
      },
      {
        id: 'bw-5',
        title: 'Polish and Ship',
        description:
          'After all phases pass verification, run /qualia-polish. This is a full design and quality pass that checks typography, colors, responsive layouts, accessibility, and edge cases. Then /qualia-ship runs quality gates and deploys to Vercel.',
        commands: [
          '/qualia-polish    # Full design and quality pass',
          '/qualia-ship      # Quality gates + deploy to production',
        ],
        tips: [
          'Run /qualia-polish once, after ALL phases are verified. Do not polish in the middle because later phases will change things.',
          '/qualia-ship checks TypeScript, linting, security, and builds before deploying. If anything fails, it tells you what to fix.',
        ],
        isMilestone: true,
      },
      {
        id: 'bw-6',
        title: 'Handoff to Client',
        description:
          'After the site is live, run /qualia-handoff to create the client delivery package with the URL, credentials, and instructions. Then run /qualia-report to log your work for the day.',
        commands: [
          '/qualia-handoff    # Creates delivery package for the client',
          '/qualia-report     # Logs your work to the ERP (mandatory)',
        ],
        tips: [
          'Double-check the handoff document: correct URL, working login credentials, accurate instructions.',
          '/qualia-report is mandatory. You cannot clock out without it.',
        ],
      },
    ],
    checklist: {
      title: 'Website Ship Checklist',
      items: [
        'Project set up with /qualia-new, roadmap approved',
        'Every phase: plan > build > verify with PASS',
        '/qualia-polish done after all phases verified',
        'RLS enabled on every Supabase table',
        'No secret keys in client-facing code',
        '/qualia-ship succeeded — site is live and loads fast',
        '/qualia-handoff created the client delivery package',
        '/qualia-report uploaded to ERP',
      ],
    },
  },

  {
    slug: 'build-voice-agent',
    title: 'Building an AI Voice Agent',
    subtitle: 'Receptionist bot, sales agent, or support bot — from setup to live calls',
    category: 'lifecycle',
    projectType: 'voice-agent',
    steps: [
      {
        id: 'bva-1',
        title: 'Start the Project',
        description:
          'Let us walk through building a receptionist bot for a dental clinic. Run /qualia-new and pick "Voice Agent" for the project type. Describe what the agent does: "A friendly receptionist for a dental clinic that answers frequently asked questions, books appointments, and transfers complex calls to the office manager."',
        commands: [
          'mkdir -p ~/Projects/clinic-bot',
          'cd ~/Projects/clinic-bot',
          'claude',
          '/qualia-new',
        ],
        tips: [
          'Be specific about what the agent should do, who it talks to, and when it should hand off to a human.',
          'Mention the tone: "friendly and professional" or "warm and reassuring." This shapes the voice and prompts.',
        ],
      },
      {
        id: 'bva-2',
        title: 'The Voice Stack',
        description:
          'Voice agents use three services working together. Retell AI handles the conversation logic: what the agent says, how it responds to questions, when it books an appointment or transfers a call. ElevenLabs provides the voice: making the AI sound natural and human-like. Telnyx provides the phone number that patients call. OpenRouter routes the AI thinking to the best available model.',
        tips: [
          'Retell AI: the brain. It manages the conversation flow, tool calls, and decision-making.',
          'ElevenLabs: the voice. It turns text into natural-sounding speech.',
          'Telnyx: the phone line. It provides the number and handles call routing.',
          'OpenRouter: the AI engine. It processes what the caller says and decides what to respond.',
        ],
      },
      {
        id: 'bva-3',
        title: 'Building Phases',
        description:
          'A voice agent typically has 3 phases. Foundation sets up the webhook handler and database. Agent builds the prompts, tools, and conversation flow. Testing is where you make real phone calls and refine the experience.',
        example:
          '| # | Phase       | Goal                                        |\n' +
          '|---|-------------|---------------------------------------------|\n' +
          '| 1 | Foundation  | Webhook handler, Supabase schema, env setup |\n' +
          '| 2 | Agent       | Prompts, tools, conversation flow, voice    |\n' +
          '| 3 | Testing     | Real calls, latency tuning, edge cases      |',
        exampleTitle: 'Voice agent roadmap',
        commands: [
          '/qualia-plan 1 && /qualia-build 1 && /qualia-verify 1',
          '/qualia-plan 2 && /qualia-build 2 && /qualia-verify 2',
          '/qualia-plan 3 && /qualia-build 3 && /qualia-verify 3',
        ],
      },
      {
        id: 'bva-4',
        title: 'Testing Voice Agents',
        description:
          'This is the most important step. Always test with REAL phone calls, not just the provider dashboard. Dashboard numbers do not reflect what callers actually experience. The first response from the agent must arrive within 500 milliseconds or callers will hang up. Call the number yourself, try different questions, try interrupting the agent, try edge cases.',
        warning:
          'Provider dashboards under-report latency by 100-200ms. A response that looks fast on screen may feel slow on the phone. Always test with a real call.',
        tips: [
          'Call the number yourself and have a real conversation. Do not just read test scripts.',
          'Try interrupting the agent mid-sentence. It should handle interruptions gracefully.',
          'Try asking something completely off-topic. The agent should redirect politely.',
          'Try staying silent for 5+ seconds. The agent should prompt you.',
          'Test at different times of day. Latency varies with provider load.',
        ],
      },
      {
        id: 'bva-5',
        title: 'Ship and Monitor',
        description:
          'Deploy with /qualia-ship, then make one final real phone call to confirm everything works in production. Voice agents need ongoing monitoring because latency can change as provider load fluctuates.',
        commands: ['/qualia-ship', '/qualia-handoff', '/qualia-report'],
        tips: [
          'After deploying, make a real call to the production number before handing off to the client.',
          'Set up monitoring for response latency. If it goes above 500ms, something needs attention.',
          'Hand off to the client with clear instructions on how to check call logs and update the agent prompts.',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Voice Agent Ship Checklist',
      items: [
        'Webhook handler verifies signatures and handles all event types',
        'Agent prompts are in a secure server-side file, never exposed to the client',
        'Tested with real phone calls, not just the dashboard',
        'First response latency under 500ms on a real call',
        'Agent handles interruptions, silence, and off-topic questions gracefully',
        'Human handoff works when the agent cannot help',
        'Cost monitoring configured on the provider dashboard',
        '/qualia-ship + /qualia-handoff + /qualia-report completed',
      ],
    },
  },

  {
    slug: 'build-web-app',
    title: 'Building a Web App',
    subtitle: 'SaaS dashboards, platforms, and larger apps with 6-12 phases',
    category: 'lifecycle',
    projectType: 'ai-platform',
    steps: [
      {
        id: 'bwa-1',
        title: 'Longer Roadmap',
        description:
          'Web apps are bigger than websites. A SaaS dashboard or platform typically has 6-12 phases instead of 3-5. Phases cover things like Foundation, Authentication, Core Features, Dashboard, Payments, Notifications, and Polish. The framework handles this the same way, just with more phases.',
        example:
          '| # | Phase          | Goal                              |\n' +
          '|---|----------------|-----------------------------------|\n' +
          '| 1 | Foundation     | Database, auth, layout, design    |\n' +
          '| 2 | Onboarding     | Signup, verification, welcome     |\n' +
          '| 3 | Core CRUD      | Main features, list/detail/edit   |\n' +
          '| 4 | Roles          | Admin/customer roles, permissions |\n' +
          '| 5 | Dashboard      | Stats, charts, recent activity    |\n' +
          '| 6 | Payments       | Stripe, subscriptions, tiers      |\n' +
          '| 7 | Notifications  | Email, in-app alerts              |\n' +
          '| 8 | Polish         | Design pass, hardening            |',
        exampleTitle: 'Typical SaaS roadmap',
      },
      {
        id: 'bwa-2',
        title: 'Same Workflow, More Phases',
        description:
          'The workflow is exactly the same as building a website. Plan, build, verify. Repeat for each phase. The framework tracks your progress and always tells you the next step. The only difference is that there are more phases to go through.',
        commands: [
          '/qualia-plan 1 && /qualia-build 1 && /qualia-verify 1',
          '/qualia-plan 2 && /qualia-build 2 && /qualia-verify 2',
          '# ... same loop for each phase',
          '# Or just type /qualia and it tells you the next command',
        ],
        tips: [
          'You do not need to remember which phase you are on. /qualia always tells you.',
          'Each phase builds on the previous ones, but the framework handles the context for you.',
        ],
      },
      {
        id: 'bwa-3',
        title: 'Working Across Days',
        description:
          'A SaaS build takes days or weeks. At the end of each day, pause your work and file your report. Next morning, resume where you left off. The framework makes this seamless.',
        commands: [
          '# End of day:',
          '/qualia-pause      # Save your progress',
          '/qualia-report     # Log your work (mandatory for clock-out)',
          '',
          '# Next morning:',
          '/qualia-resume     # Pick up where you left off',
        ],
        tips: [
          '/qualia-resume reads your saved progress and tells you exactly where you were and what to do next.',
          'Even if you forget to /qualia-pause, the framework can reconstruct your position from the project state.',
        ],
      },
      {
        id: 'bwa-4',
        title: 'Save What You Learn',
        description:
          'When you discover a useful pattern or fix a tricky bug, save it with /qualia-learn. This goes into a knowledge base that the framework reads automatically on future projects. It saves you (and your teammates) from solving the same problem twice.',
        commands: ['/qualia-learn'],
        tips: [
          'Save patterns: "For Stripe webhooks, always verify the signature before processing."',
          'Save fixes: "When next/font crashes on Vercel, move the import to a server component."',
          'Save client preferences: "Sakani always wants Arabic language support."',
          'The framework also offers to save lessons when verification fails. Accept the offer.',
        ],
      },
      {
        id: 'bwa-5',
        title: 'Ship the Big Thing',
        description:
          'Same flow as any project: polish after all phases are verified, then ship. For web apps, the security checks are especially important because you are handling user data, authentication, and possibly payments.',
        commands: [
          '/qualia-polish     # Full design and quality pass',
          '/qualia-ship       # Quality gates + deploy',
          '/qualia-handoff    # Client delivery package',
          '/qualia-report     # Log your work',
        ],
        tips: [
          'For web apps with payments, double-check that subscription tier enforcement is server-side, not just client-side.',
          'Make sure every database table has RLS policies. This is the most common security issue.',
          'Test the login/signup flow after deployment. Auth issues are the most common post-deploy problem.',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Web App Ship Checklist',
      items: [
        'All 6-12 phases verified with PASS',
        'RLS on every Supabase table, with proper auth policies',
        'No secret keys in client-facing code',
        'Server-side auth checks on all mutations',
        'Input validation on all forms and API routes',
        'Subscription enforcement is server-side (not just client checks)',
        'Loading, empty, and error states on every data-fetching component',
        '/qualia-polish + /qualia-ship + /qualia-handoff + /qualia-report completed',
      ],
    },
  },

  // =====================================================================
  // OPERATIONS — Daily work outside the full lifecycle
  // =====================================================================

  {
    slug: 'daily-routine',
    title: 'Your Daily Routine',
    subtitle: 'Clock in, work, report, clock out — the daily rhythm',
    category: 'operations',
    projectType: 'workflow',
    steps: [
      {
        id: 'dr-1',
        title: 'Morning',
        description:
          'Open the ERP and clock in. Then open Claude Code in your project folder. The framework loads and shows you the project status. Type /qualia or /qualia-resume to get started. The framework tells you exactly what to do.',
        commands: [
          '# 1. Clock in on the ERP',
          '# 2. Open your terminal',
          'cd ~/Projects/current-project',
          'claude',
          '/qualia-resume     # or /qualia if this is a new session',
        ],
      },
      {
        id: 'dr-2',
        title: 'Working',
        description:
          'Follow the commands the framework gives you. For full project work: plan, build, verify. For small fixes: /qualia-quick. For focused single tasks: /qualia-task. The framework always tells you what to do next.',
        commands: [
          '/qualia              # What should I do next?',
          '/qualia-plan 2       # Plan phase 2',
          '/qualia-build 2      # Build phase 2',
          '/qualia-verify 2     # Verify phase 2',
          '/qualia-quick "fix the header alignment"     # Quick fix',
        ],
        tips: [
          'Do not overthink the workflow. Type /qualia and it tells you the next step.',
          'For small changes (under 1 hour), use /qualia-quick. It skips planning and just does it.',
        ],
      },
      {
        id: 'dr-3',
        title: 'Breaks and Context',
        description:
          'Going to lunch? You can run /qualia-pause to save your place, but it is optional for short breaks. For breaks under an hour, you can usually just come back and keep working. For longer breaks, /qualia-pause ensures nothing is lost.',
        commands: ['/qualia-pause      # Optional for short breaks'],
        tips: [
          'For a 30-minute lunch, you probably do not need to pause. Just pick up where you left off.',
          'For a longer break or if you are switching to a different project, /qualia-pause is a good idea.',
        ],
      },
      {
        id: 'dr-4',
        title: 'End of Day',
        description:
          'Run /qualia-report. This is mandatory. It generates a summary of what you did today and uploads it to the ERP. Without this report, you cannot clock out. After the report uploads, go to the ERP and clock out.',
        commands: [
          '/qualia-report     # MANDATORY — generates and uploads your daily report',
          '# Then clock out on the ERP',
        ],
        warning:
          '/qualia-report is enforced by the ERP. The clock-out button will not work until your report is uploaded for today. Run it before you stop working, every single day.',
      },
      {
        id: 'dr-5',
        title: 'Quick Fixes vs Full Phases',
        description:
          'Not all work needs full phases. Small fixes and tweaks use /qualia-quick. Focused individual tasks (like adding a contact form) use /qualia-task. Full feature phases use the plan/build/verify loop. Pick the right tool for the job.',
        commands: [
          '/qualia-quick "fix button color"          # Under 1 hour, small fix',
          '/qualia-task "add contact form to /about"  # 1-3 hours, focused task',
          '/qualia-plan 3                              # Full phase work',
        ],
        tips: [
          '/qualia-quick: typos, color changes, config tweaks. Under 1 hour.',
          '/qualia-task: a single feature or component. 1-3 hours.',
          '/qualia-plan: a full phase with multiple tasks. Half a day or more.',
        ],
      },
      {
        id: 'dr-6',
        title: 'When You Are Stuck',
        description:
          'Three levels of help. First, type /qualia and let it figure out what you need. Second, use /qualia-debug if something is broken. Third, ask Fawzi if you have been stuck for 30+ minutes. Do not spend hours going in circles.',
        commands: [
          '/qualia                         # Level 1: Let the framework guide you',
          '/qualia-debug                   # Level 2: Structured investigation',
          '# Level 3: Ask Fawzi on Slack   # After 30 minutes stuck',
        ],
        tips: [
          '/qualia-debug follows a structured investigation process: symptoms, diagnosis, then fix. It does not guess.',
          'If you have been trying to fix the same bug for 30 minutes, stop and ask for help. Fresh eyes solve problems faster.',
        ],
      },
    ],
    checklist: {
      title: 'Daily Routine Checklist',
      items: [
        'Clocked in on the ERP',
        'Opened Claude Code, ran /qualia or /qualia-resume',
        'Used the right tool: /qualia-quick for small fixes, /qualia-task for focused work, /qualia-plan for phases',
        'Asked for help after 30 minutes stuck (not 3 hours)',
        'Ran /qualia-report before stopping (mandatory)',
        'Clocked out on the ERP',
      ],
    },
  },

  {
    slug: 'design-quality',
    title: 'Design and Quality',
    subtitle: 'How the framework ensures every site looks professional',
    category: 'operations',
    projectType: 'workflow',
    steps: [
      {
        id: 'dq-1',
        title: 'DESIGN.md — Your Project Design Spec',
        description:
          'Every project gets a DESIGN.md file with 12 sections covering colors, fonts, spacing, components, shadows, motion, accessibility, and anti-patterns. The AI reads this before building any frontend component. This is why every project looks intentionally designed, not generically AI-generated.',
        tips: [
          "The 12 sections: palette, typography, spacing, effects/shadows, border radii, motion, component patterns, layout rules, responsive behavior, do/don't rules, accessibility requirements, and dark mode (if applicable).",
          'DESIGN.md is created during /qualia-new based on the design direction you choose.',
          'You can edit DESIGN.md any time to adjust the design direction. The AI re-reads it before every frontend task.',
        ],
      },
      {
        id: 'dq-2',
        title: 'Anti-AI-Slop',
        description:
          'The framework actively scans for generic AI patterns and fixes them. These are the telltale signs that a site was built by AI without design direction: the Inter font, identical card grids everywhere, blue-purple gradients, hardcoded max-widths, gray-on-gray text that fails accessibility. The framework catches all of these and replaces them with the project design spec.',
        tips: [
          'Banned fonts: Inter, Roboto, Arial, system-ui, Space Grotesk. These scream "AI-generated."',
          'Banned patterns: identical card grids, generic hero sections, blue-purple gradients.',
          'Banned layout: hardcoded max-width (like 1200px). Everything should be fluid and full-width.',
          'The framework enforces these rules during build, verify, and polish. You do not need to check manually.',
        ],
      },
      {
        id: 'dq-3',
        title: '/qualia-design — Quick Design Fix',
        description:
          'Use /qualia-design when a page or component needs to look better right now. It reads your DESIGN.md, critiques the current state, and fixes everything in one pass. Use this during building when something looks rough.',
        commands: [
          '/qualia-design                       # Fix all frontend files',
          '/qualia-design app/page.tsx           # Fix a specific file',
        ],
      },
      {
        id: 'dq-4',
        title: '/qualia-polish — Full Structured Pass',
        description:
          'Use /qualia-polish after all phases are verified, before shipping. It runs a comprehensive design and quality pass covering typography, color, layout, interactive states, motion, accessibility, responsive design, and hardening (what happens with long text, empty data, slow connections, keyboard-only use).',
        commands: ['/qualia-polish'],
        warning:
          'Run /qualia-polish only after ALL phases are verified. Running it in the middle wastes work because later phases will change things.',
        isMilestone: true,
      },
      {
        id: 'dq-5',
        title: 'Quality Gates',
        description:
          'Before any deploy, the framework automatically runs quality checks. TypeScript must compile without errors. The linter must pass. The build must succeed. No secret keys can be in client-facing code. These checks run automatically during /qualia-ship. If any check fails, the deploy is blocked and you are told exactly what to fix.',
        tips: [
          'You can run the checks yourself anytime: npx tsc --noEmit (TypeScript), npm run lint (linter), npm run build (build).',
          'The most common blocker is TypeScript errors. Fix them before trying to ship.',
          'Secret key detection is automatic. If a Supabase service-role key appears in client code, the deploy stops immediately.',
        ],
      },
      {
        id: 'dq-6',
        title: 'Verification Scoring',
        description:
          'When the framework verifies a phase, it scores on 4 dimensions: Correctness (does it work?), Completeness (is everything built?), Wiring (are the pieces connected?), and Quality (is it well-built?). Each dimension is scored 1-5. Anything below 3 on any dimension means the phase fails and you need to fix the gaps before moving on.',
        example:
          'Phase 2 Verification\n\n' +
          'Correctness:   5/5   All features work as specified\n' +
          'Completeness:  4/5   All tasks built, one minor gap\n' +
          'Wiring:        5/5   All components properly connected\n' +
          'Quality:       4/5   Good code quality, minor improvements possible\n\n' +
          'Result: PASS — advancing to Phase 3',
        exampleTitle: 'Verification score example',
        tips: [
          'Scoring is strict but fair. A 3/5 means acceptable. A 2/5 means significant issues.',
          'The verifier provides specific evidence for each score, not just a number.',
          'If you get a FAIL, the framework tells you exactly which criteria failed and why.',
        ],
      },
    ],
    checklist: {
      title: 'Design and Quality Checklist',
      items: [
        'DESIGN.md exists with 12 sections covering the full design spec',
        'No banned fonts (Inter, Roboto, Arial, system-ui, Space Grotesk)',
        'No identical card grids, generic heroes, or blue-purple gradients',
        'Fluid full-width layouts, no hardcoded max-widths',
        '/qualia-design used for quick fixes during building',
        '/qualia-polish run once after all phases verified',
        'Quality gates pass: TypeScript, linting, build, no leaked secrets',
        'Verification scores: 3/5 or above on all 4 dimensions',
      ],
    },
  },

  // =====================================================================
  // REFERENCE — All commands in one place
  // =====================================================================

  {
    slug: 'commands-reference',
    title: 'All Commands Reference',
    subtitle: 'Every slash command and CLI command in one place',
    category: 'reference',
    projectType: 'workflow',
    steps: [
      {
        id: 'cr-1',
        title: 'Navigation',
        description: 'Commands for figuring out where you are and what to do next.',
        commands: [
          '/qualia          — Smart router. Reads your project state and tells you the exact next step. Use when lost.',
          '/qualia-idk      — Same as /qualia. Different name, same function. Use when stuck.',
          '/qualia-resume   — Resume from a previous session. Reads your saved progress.',
          '/qualia-pause    — Save your progress before stopping. Creates a restore point.',
        ],
      },
      {
        id: 'cr-2',
        title: 'Project Setup',
        description: 'Commands for starting new projects.',
        commands: [
          '/qualia-new      — Interactive project wizard. Asks questions one at a time, creates everything.',
        ],
        tips: [
          'Be specific in your answers. The more detail you give, the better the roadmap and design spec.',
        ],
      },
      {
        id: 'cr-3',
        title: 'The Build Loop',
        description: 'The three commands you run for every phase.',
        commands: [
          '/qualia-plan N    — Plan phase N. Creates tasks grouped into waves.',
          '/qualia-build N   — Build phase N. Executes tasks in parallel waves.',
          '/qualia-verify N  — Verify phase N. Scores on 4 dimensions. PASS advances to next phase.',
        ],
        tips: [
          'Always in this order: plan, build, verify.',
          'On PASS, the framework auto-advances. On FAIL, it tells you what to fix.',
        ],
      },
      {
        id: 'cr-4',
        title: 'Quick Work',
        description: 'Commands for work that does not need a full phase.',
        commands: [
          '/qualia-quick    — Fast fix. Under 1 hour, no plan file, just build and commit.',
          '/qualia-task     — Focused single task. 1-3 hours, fresh builder context.',
        ],
      },
      {
        id: 'cr-5',
        title: 'Design',
        description: 'Commands for design and visual quality.',
        commands: [
          '/qualia-design   — Quick one-shot design fix. Use during building.',
          '/qualia-polish   — Full structured design + quality pass. Use after all phases verified.',
        ],
      },
      {
        id: 'cr-6',
        title: 'Shipping',
        description: 'Commands for deploying and delivering.',
        commands: [
          '/qualia-ship     — Quality gates + commit + push + deploy + post-deploy verification.',
          '/qualia-handoff  — Creates client delivery package with URL, credentials, instructions.',
          '/qualia-report   — Generates daily report and uploads to ERP. MANDATORY before clock-out.',
        ],
        warning: '/qualia-report is enforced by the ERP clock-out system. You cannot skip it.',
      },
      {
        id: 'cr-7',
        title: 'Debugging',
        description: 'Commands for investigating and fixing problems.',
        commands: [
          '/qualia-debug    — Structured debugging. Symptoms > diagnosis > fix. No guessing.',
          '/qualia-review   — Production audit. Checks security, performance, reliability.',
        ],
        tips: [
          '/qualia-debug checks the knowledge base first. If your problem has a known fix, it skips the investigation.',
          '/qualia-review --web for websites, /qualia-review --ai for AI/voice agents.',
        ],
      },
      {
        id: 'cr-8',
        title: 'CLI Commands',
        description:
          'Commands you run directly in your terminal (not slash commands inside Claude Code).',
        commands: [
          'qualia-framework install      — One-time setup with your team code.',
          'qualia-framework update       — Update to the latest version.',
          'qualia-framework version      — Check your installed version.',
          'qualia-framework migrate      — Upgrade from v2 to v3 (one-time).',
          'qualia-framework analytics    — View framework usage statistics.',
          'qualia-framework team         — View team member status.',
          'qualia-framework traces       — View execution traces for debugging.',
          'qualia-framework uninstall    — Remove the framework (rarely needed).',
        ],
      },
    ],
    checklist: {
      title: 'Command Quick Reference',
      items: [
        'Lost? /qualia',
        'New project? /qualia-new',
        'Phase work? /qualia-plan N > /qualia-build N > /qualia-verify N',
        'Small fix? /qualia-quick',
        'Focused task? /qualia-task',
        'Design fix? /qualia-design',
        'Final polish? /qualia-polish',
        'Deploy? /qualia-ship',
        'Client delivery? /qualia-handoff',
        'End of day? /qualia-report (mandatory)',
        'Broken? /qualia-debug',
        'Stuck 30+ min? Ask Fawzi',
      ],
    },
  },

  // =====================================================================
  // CHECKLISTS — The single source of truth before going live
  // =====================================================================

  {
    slug: 'shipping-checklist',
    title: 'Shipping Checklist',
    subtitle: 'Everything to verify before going live',
    category: 'checklist',
    projectType: 'workflow',
    steps: [
      {
        id: 'sc-1',
        title: 'All Phases Verified',
        description:
          'Every phase in the roadmap must show PASS. Type /qualia to check. If any phase is unverified or failed, go back and fix it before shipping. The framework will not let you ship with unfinished phases.',
        commands: ['/qualia     # Check your project status'],
      },
      {
        id: 'sc-2',
        title: '/qualia-polish Done',
        description:
          'The full design and quality pass must be complete. This covers typography, colors, layout, interactive states, motion, accessibility, responsive design, and edge case hardening. Run it once after all phases are verified.',
        commands: ['/qualia-polish'],
      },
      {
        id: 'sc-3',
        title: 'Security',
        description:
          'No secret keys in client-facing code. Row Level Security (RLS) on every Supabase table. Auth checks on every server-side mutation. Input validation on all forms and API routes. The framework checks for leaked keys automatically during /qualia-ship, but RLS and auth checks are your responsibility.',
        tips: [
          'RLS on every table with policies that check the user identity.',
          'No Supabase service-role key anywhere in client code. Keep it in server-only files.',
          'All mutations happen server-side with auth checks.',
          'Validate input with Zod on every form, API route, and webhook.',
          'Never hardcode API keys, passwords, or secrets in your code.',
          'Never commit .env files to git.',
        ],
      },
      {
        id: 'sc-4',
        title: 'Deploy',
        description:
          'Run /qualia-ship. It checks TypeScript compilation, linting, tests, build success, and leaked secrets. Then it deploys to Vercel and runs post-deploy verification. If anything fails, it tells you exactly what to fix.',
        commands: ['/qualia-ship'],
        isMilestone: true,
      },
      {
        id: 'sc-5',
        title: 'Post-Deploy',
        description:
          'After /qualia-ship deploys, it automatically checks that the site loads (HTTP 200), responds fast (under 500ms), and the auth endpoint works. If any check fails, the ship is considered incomplete.',
        tips: [
          'Site loads: the homepage returns HTTP 200.',
          'Fast response: the homepage loads in under 500ms.',
          'Auth works: the auth callback endpoint responds, not 404 or 500.',
          'No critical errors in the browser console on first load.',
        ],
      },
      {
        id: 'sc-6',
        title: 'Handoff',
        description:
          'Run /qualia-handoff to create the client delivery package. This includes the live URL, login credentials, repository link, how-to-use instructions, and support contact information. Double-check that everything is accurate before sending to the client.',
        commands: ['/qualia-handoff'],
      },
      {
        id: 'sc-7',
        title: 'Report',
        description:
          'Run /qualia-report to generate your daily session report and upload it to the ERP. This is mandatory. The ERP clock-out button will not work until your report is uploaded for today.',
        commands: ['/qualia-report'],
        warning:
          'You cannot clock out without running /qualia-report. This is enforced by the ERP, not by the framework. Run it before you stop working.',
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Ready to Ship?',
      items: [
        'All phases show PASS',
        '/qualia-polish completed',
        'No secret keys in client-facing code',
        'RLS on every Supabase table',
        'Input validation on all system boundaries',
        '/qualia-ship succeeded — site is live',
        'Post-deploy: HTTP 200, under 500ms, auth works',
        '/qualia-handoff created client delivery package',
        '/qualia-report uploaded to ERP (mandatory for clock-out)',
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
