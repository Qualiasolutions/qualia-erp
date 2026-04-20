// Knowledge Base — Qualia Framework v4.0.5 Workflow Guides
// Updated 2026-04-20 against qualia-framework v4.0.5 (npm: qualia-framework).
// v4 introduces the Full Journey: Projects → Journey → Milestones (2-5, Handoff last) →
// Phases (2-5 tasks each) → Tasks (one commit, one verification contract).
// Guides are written for employees, not engineers — plain language, real scenarios.

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
    subtitle: 'Install v4, learn the five daily commands, start your first day',
    category: 'foundations',
    projectType: 'workflow',
    steps: [
      {
        id: 'gs-1',
        title: 'What Qualia Actually Is',
        description:
          'Qualia is a workflow layer for Claude Code. You type slash commands in your terminal and the AI plans, builds, verifies, and ships your project. There is no dashboard to learn and no extra app to install. If you can type a command, you can use Qualia.',
        tips: [
          'Think of it as rails for Claude Code. It keeps the AI on track across long projects without losing quality.',
          'Everything lives in your terminal. Your project state is tracked automatically in .planning/ and git.',
          'The current release is v4.0.5 — the "Full Journey" release. Every project is mapped end to end on day one.',
        ],
      },
      {
        id: 'gs-2',
        title: 'Installing',
        description:
          'Run the installer once per machine. It sets up skills, agents, hooks, rules, and knowledge files under ~/.claude/. Ask Fawzi for your team code before you start — it looks like QS-YOURNAME-NN.',
        commands: ['npx qualia-framework install'],
        tips: [
          'Get your team code from Fawzi first. The installer prompts for it and registers you with the team.',
          'Restart Claude Code after install so the new skills, hooks, and statusline load.',
          'Auto-updates run silently every 24 hours — you will rarely need to install again.',
        ],
        example:
          'Enter install code: QS-MOAYAD-03\n\n' +
          'Installing Qualia Framework v4.0.5...\n\n' +
          '  26 skills     ok\n' +
          '  8 agents      ok\n' +
          '  7 hooks       ok\n' +
          '  5 rules       ok\n' +
          '  knowledge     ok\n\n' +
          'Done. Restart Claude Code to begin.',
        exampleTitle: 'What you see during install',
      },
      {
        id: 'gs-3',
        title: 'Your First Session',
        description:
          'Open a terminal, navigate into any project folder, and run claude. The Qualia statusline appears in your prompt — it shows the project, the current milestone, the phase, and any blockers. You always know where you are.',
        commands: ['cd ~/Projects/my-project', 'claude'],
        example:
          '⬢ QUALIA · SMART ROUTER\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '  Project        aquador\n' +
          '  Milestone      M1·Foundation  P1/3  T2/5\n' +
          '  Role           EMPLOYEE · Moayad\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        exampleTitle: 'Statusline after opening a project',
        isMilestone: true,
      },
      {
        id: 'gs-4',
        title: 'The Five Commands You Use Every Day',
        description:
          'There are 26 skills available, but five cover almost all your daily work. Start with these and pick up the others as you need them.',
        commands: [
          '/qualia          — What should I do next? Reads project state and routes you.',
          '/qualia-new      — Start a brand new project from scratch.',
          '/qualia-quick    — Fast fix for something small (under 1 hour).',
          '/qualia-report   — End-of-day report. MANDATORY before clock-out.',
          '/qualia-idk      — Diagnostic. Use when something feels off but /qualia cannot explain why.',
        ],
        tips: [
          'When in doubt, type /qualia. It is mechanical — it reads your state and tells you the exact next command.',
          '/qualia-idk goes deeper — it scans .planning/ and your codebase in parallel and tells you what it actually sees.',
          "/qualia-report is not optional. The ERP clock-out refuses to work until today's report is uploaded.",
        ],
      },
      {
        id: 'gs-5',
        title: 'Updating and Checking Your Version',
        description:
          'The framework auto-updates in the background. You can also update manually or check your installed version at any time. If you are upgrading from v3 to v4, no migration is needed — projects on older versions keep working and new projects use v4.',
        commands: [
          'npx qualia-framework version   # Check your installed version + upstream',
          'npx qualia-framework update    # Manual update',
          'npx qualia-framework team list # See who is on the team',
          'npx qualia-framework erp-ping  # Smoke-test the ERP connection',
        ],
        tips: [
          'After a manual update, restart Claude Code so the new skills load.',
          'erp-ping is handy after install — it confirms your API key works without needing to run /qualia-report.',
          'Stuck on an older version? Run update, then re-open Claude Code.',
        ],
      },
      {
        id: 'gs-6',
        title: 'Getting Help',
        description:
          'Three layers of help, in order. First, /qualia for mechanical routing. Second, /qualia-idk when things feel off — it diagnoses drift. Third, /qualia-help opens the full framework reference in your browser. Beyond that, ask Fawzi — do not lose more than 30 minutes being stuck.',
        commands: [
          '/qualia-help     # Opens the framework reference page',
          '/qualia-idk      # Diagnostic scan — "what is actually going on?"',
          '/qualia-debug    # Structured debugging with symptoms → diagnosis → fix',
        ],
        tips: [
          'Do not spend more than 30 minutes stuck on the same issue. Escalate to Fawzi on Slack.',
          '/qualia-debug follows an actual investigation process — it does not guess.',
        ],
      },
    ],
    checklist: {
      title: 'Getting Started Checklist',
      items: [
        'Installed via npx qualia-framework install with team code from Fawzi',
        'Claude Code restarted after install',
        'Statusline visible when you open a project (⬢ Qualia · {name})',
        'Knows the five daily commands: /qualia, /qualia-new, /qualia-quick, /qualia-report, /qualia-idk',
        'Knows to type /qualia when lost and /qualia-idk when confused',
        'Ran erp-ping to confirm ERP connection',
        'Committed to running /qualia-report before every clock-out',
      ],
    },
  },

  {
    slug: 'how-projects-work',
    title: 'How Projects Work (v4 Full Journey)',
    subtitle:
      'Journey → Milestones → Phases → Tasks. Two human gates. One command to chain it all.',
    category: 'foundations',
    projectType: 'workflow',
    steps: [
      {
        id: 'hp-1',
        title: 'The Hierarchy',
        description:
          'v4 thinks in four layers. A Project has one Journey. The Journey contains 2-5 Milestones (the final one is always literally named "Handoff"). Each Milestone contains 2-5 Phases. Each Phase contains 2-5 Tasks. A task is one commit with one verification contract. This structure is visible from day one — you never have to improvise what comes next.',
        example:
          'Project: aquador\n' +
          '└─ Journey (mapped upfront in /qualia-new)\n' +
          '   ├─ Milestone 1: Foundation\n' +
          '   │  ├─ Phase 1: Database + Auth\n' +
          '   │  │  ├─ Task 1: tables + RLS\n' +
          '   │  │  └─ Task 2: login + signup\n' +
          '   │  └─ Phase 2: Layout + Design\n' +
          '   ├─ Milestone 2: Ordering\n' +
          '   └─ Milestone 3: Handoff  ← always last, always named "Handoff"\n' +
          '      ├─ Phase 1: Polish\n' +
          '      ├─ Phase 2: Content + SEO\n' +
          '      ├─ Phase 3: Final QA\n' +
          '      └─ Phase 4: Ship + Handoff',
        exampleTitle: 'Journey hierarchy',
      },
      {
        id: 'hp-2',
        title: 'The Road (end to end)',
        description:
          'Every project follows the same path. Kick off the project with /qualia-new. For each phase run plan → build → verify. When a milestone is fully verified, /qualia-milestone closes it and opens the next. The Handoff milestone runs polish → content/SEO → final QA → ship → handoff. Finish with /qualia-report.',
        example:
          '/qualia-new              Kickoff + research + JOURNEY.md\n' +
          '     ↓\n' +
          '  For each milestone, for each phase:\n' +
          '    /qualia-plan N       Plan phase N\n' +
          '    /qualia-build N      Build phase N\n' +
          '    /qualia-verify N     Verify phase N\n' +
          '     ↓\n' +
          '  /qualia-milestone      Close milestone, open the next (human gate)\n' +
          '     ↓  (repeat until the Handoff milestone)\n' +
          '/qualia-polish           Design + UX pass\n' +
          '(content + SEO phase)\n' +
          '(final QA phase)\n' +
          '/qualia-ship             Deploy to production\n' +
          '/qualia-handoff          Credentials + docs + assets + final report\n' +
          '/qualia-report           Mandatory session report',
        exampleTitle: 'The Road',
      },
      {
        id: 'hp-3',
        title: 'Auto Mode — Two Gates Instead of Thirty',
        description:
          'Add --auto to /qualia-new and the framework chains plan → build → verify → (next phase) → (next milestone) without you retyping commands. It pauses only at real decisions: journey approval at kickoff, and a gate at each milestone boundary. If a phase fails verification twice (the gap-cycle limit), it halts and asks for help. Everything else runs on rails.',
        commands: [
          '/qualia-new --auto              # Chain the whole road',
          '/qualia-new --auto --full-detail # Plus full phase detail for every milestone upfront',
        ],
        tips: [
          'Two human gates per project: journey approval, then one per milestone boundary.',
          'Auto mode is safe — the gates and gap-cycle limit catch problems before they cascade.',
          '--full-detail is for client reviews or handoff-heavy projects where you want the whole plan visible day one.',
        ],
        isMilestone: true,
      },
      {
        id: 'hp-4',
        title: 'Getting Assigned a Project',
        description:
          'Fawzi creates the project on the ERP and links it to a GitHub repo. You get notified, clone the repo, and run claude. The framework reads .planning/ and picks up where the project was left — you do not need to be the person who started it.',
        commands: [
          'git clone git@github.com:QualiasolutionsCY/project-name.git',
          'cd project-name',
          'claude',
          '/qualia',
        ],
        tips: [
          'Our repos live under two GitHub orgs: QualiasolutionsCY (main projects) and SakaniQualia (Sakani only).',
          'All repos are private. If you cannot see one, ask Fawzi to add you.',
          'Brownfield project (already has code, no .planning/)? Run /qualia-map first, then /qualia-new.',
        ],
      },
      {
        id: 'hp-5',
        title: 'Pausing and Resuming',
        description:
          'When you stop for the day, run /qualia-pause. It writes .continue-here.md with enough context that you (or anyone else) can resume tomorrow. When you come back, /qualia-resume reads that file and routes you to the right command. If you forget to pause, /qualia-resume still works — it reads STATE.md directly.',
        commands: [
          '/qualia-pause     # Save session before stopping',
          '/qualia-resume    # Pick up exactly where you left off',
        ],
        tips: [
          'Always run /qualia-report before clocking out, even if you paused first. They are separate things.',
          'If Claude Code compacts context mid-session, the pre-compact hook silently saves state — nothing is lost.',
        ],
      },
      {
        id: 'hp-6',
        title: 'The ERP Connection',
        description:
          "Every push updates .planning/tracking.json via a bot commit (the pre-push hook does it automatically). The ERP reads that file from GitHub and renders your project status on the dashboard. At clock-out, /qualia-report POSTs a structured session report with a stable QS-REPORT-NN ID. The ERP refuses to clock you out without today's report.",
        tips: [
          'You never edit tracking.json manually. The hooks own it.',
          'Reports get stable IDs (QS-REPORT-01, -02, …) that survive retries and network flakes.',
          'Clock-out will not work without a report. Run /qualia-report before stopping, every day.',
        ],
        warning:
          'No report, no clock-out. Run /qualia-report before ending your day — the ERP enforces this.',
      },
    ],
    checklist: {
      title: 'How Projects Work Checklist',
      items: [
        'Understands the hierarchy: Project → Journey → Milestones → Phases → Tasks',
        'Knows the Road: new → plan/build/verify per phase → milestone → repeat → Handoff',
        'Knows --auto mode and the two human gates (journey approval + milestone boundaries)',
        'Can clone a repo and resume a project started by someone else',
        'Knows /qualia-pause and /qualia-resume for multi-day work',
        'Understands that every push syncs to the ERP automatically',
        '/qualia-report is mandatory for clock-out — no exceptions',
      ],
    },
  },

  {
    slug: 'tools-and-services',
    title: 'Our Tools and Services',
    subtitle: 'Supabase, Vercel, Railway, OpenRouter, Retell, ElevenLabs, Telnyx, GitHub',
    category: 'foundations',
    projectType: 'workflow',
    steps: [
      {
        id: 'ts-1',
        title: 'Supabase — Database, Auth, Storage',
        description:
          'Every project uses Supabase. It handles auth (login/signup), storage (files, images), realtime updates, and the Postgres database itself. Claude Code has a Supabase MCP so the AI can inspect schemas, run queries, and write migrations directly. On the command line, use npx supabase. The one non-negotiable rule: Row Level Security on every table.',
        commands: [
          'npx supabase                 # CLI entry point',
          'npx supabase gen types       # Regenerate types after a schema change',
        ],
        tips: [
          'RLS is enforced by the migration-guard hook. It blocks migrations that CREATE TABLE without RLS.',
          'Use lib/supabase/server.ts for mutations, lib/supabase/client.ts for reads in client components.',
          'Never import the service-role key anywhere client-side. The pre-deploy hook scans for it and blocks the ship.',
        ],
      },
      {
        id: 'ts-2',
        title: 'Vercel — Hosting',
        description:
          'All websites deploy to Vercel. We run across 3 Vercel teams — check which team owns the project before deploying. There is NO auto-deploy from GitHub pushes. Every deploy goes through /qualia-ship which runs quality gates (tsc, lint, tests, build, secret scan) before calling vercel --prod.',
        commands: [
          'vercel whoami         # Which team am I on?',
          'vercel link           # Link a project if it is not linked yet',
          'vercel env pull       # Sync environment variables locally',
        ],
        warning:
          'Never rely on push-to-main auto-deploys. We disable them on every project. Always ship through /qualia-ship.',
        tips: [
          '/qualia-ship runs the full gate: TypeScript, lint, tests, build, secret scan, then deploy, then post-deploy verification.',
          'If a project is not linked, run vercel link in the project folder and pick the right team.',
        ],
      },
      {
        id: 'ts-3',
        title: 'Railway — Long-running Workloads',
        description:
          'Railway is for workloads that do not fit Vercel: AI agents that need to stay running, background job workers, services with persistent connections. There is a Railway MCP in Claude Code for managing services. On the command line, use railway.',
        commands: ['railway login', 'railway up', 'railway logs'],
        tips: [
          'Vercel for web requests, Railway for processes that keep running.',
          'Ask Fawzi for Railway credentials if you need access to a specific service.',
        ],
      },
      {
        id: 'ts-4',
        title: 'OpenRouter — One Key for Every Model',
        description:
          'Every AI call in our projects goes through OpenRouter. One API key, every model: Claude, GPT, Gemini, Llama, Qwen, DeepSeek. OpenRouter handles routing, fallback, and billing. You specify the model you want, or let it pick. Never integrate providers directly unless a client specifically requires it.',
        tips: [
          'Env var is OPENROUTER_API_KEY. Ask Fawzi if you need one.',
          'Model failover is automatic — if Claude is down, the request falls back to a configured alternative.',
          'Costs and rate limits are tracked in one dashboard instead of five.',
        ],
      },
      {
        id: 'ts-5',
        title: 'Voice Stack — Retell + ElevenLabs + Telnyx',
        description:
          'Voice agents use three services together. Retell AI runs the conversation (prompts, tools, when to transfer). ElevenLabs synthesizes the voice (natural-sounding speech, language, accent). Telnyx provides the phone number and SIP routing. OpenRouter powers the thinking inside Retell.',
        tips: [
          'Retell = brain. ElevenLabs = voice. Telnyx = phone line.',
          'Always test with real phone calls. Provider dashboards under-report latency by 100-200ms.',
          'First-response latency target: under 500ms measured on a real call.',
        ],
      },
      {
        id: 'ts-6',
        title: 'GitHub — Two Orgs, All Private',
        description:
          'All code lives on GitHub across two orgs. QualiasolutionsCY for main client projects and internal tools. SakaniQualia for the Sakani real-estate platform. All repos are private. Feature branches only — the branch-guard hook blocks employees from pushing to main or master.',
        tips: [
          'QualiasolutionsCY: main projects. SakaniQualia: Sakani.',
          'If you cannot see a repo, ask Fawzi to add you to the right org.',
          'Never push to main. Work on feature/name-of-change branches and open PRs.',
        ],
      },
    ],
    checklist: {
      title: 'Tools and Services Checklist',
      items: [
        'Supabase: database, auth, storage, realtime. RLS on every table, service-role server-only.',
        'Vercel: 3 teams, NO auto-deploy, ship through /qualia-ship only.',
        'Railway: long-running AI agents and background workers.',
        'OpenRouter: one key for all models, automatic failover.',
        'Voice stack: Retell (brain) + ElevenLabs (voice) + Telnyx (phone).',
        'GitHub orgs: QualiasolutionsCY + SakaniQualia. All private. Feature branches only.',
      ],
    },
  },

  // =====================================================================
  // LIFECYCLE — Building different project types
  // =====================================================================

  {
    slug: 'build-website',
    title: 'Building a Website (Aquador walkthrough)',
    subtitle: 'From empty folder to shipped site — a full real-world example',
    category: 'lifecycle',
    projectType: 'website',
    steps: [
      {
        id: 'bw-1',
        title: 'Kick Off the Project',
        description:
          'Let us build a fictional water-delivery site called "Aquador." Create a folder, open Claude Code, and run /qualia-new. The wizard asks one question at a time: what you are building, who the client is, what features, what tone. When it finishes, JOURNEY.md is written with all milestones mapped to the Handoff.',
        commands: ['mkdir -p ~/Projects/aquador', 'cd ~/Projects/aquador', 'claude', '/qualia-new'],
        tips: [
          'Be specific: "Premium water-delivery site for Cyprus. Product catalog, online ordering, coverage map, customer accounts. Clean and modern, blue accents."',
          'Mention brand assets if the client has them: existing logo, fonts, colors.',
          'Want to chain everything automatically? Run /qualia-new --auto instead.',
        ],
      },
      {
        id: 'bw-2',
        title: 'Approve the Journey',
        description:
          'The kickoff produces JOURNEY.md — the whole project arc to Handoff. Review it, ask for changes if needed, then approve. This is the first of two human gates. Everything afterward runs with minimal approval until the milestone boundaries.',
        example:
          '| #  | Milestone   | Phases | Goal                              |\n' +
          '|----|-------------|--------|-----------------------------------|\n' +
          '| M1 | Foundation  | 2      | Database, auth, layout, design    |\n' +
          '| M2 | Catalog     | 2      | Products, navigation, coverage    |\n' +
          '| M3 | Ordering    | 3      | Cart, checkout, orders, payments  |\n' +
          '| M4 | Handoff     | 4      | Polish, SEO, QA, ship, handoff    |',
        exampleTitle: 'Aquador journey',
        tips: [
          'Most websites fit in 3-5 milestones. The Handoff milestone is always last and always has 4 phases.',
          'Full detail for M1 is written immediately. M2 through M{N-1} are sketched and filled in when /qualia-milestone opens them.',
        ],
      },
      {
        id: 'bw-3',
        title: 'Milestone 1 — Foundation',
        description:
          'For every phase in every milestone, run plan → build → verify. The planner creates a story-file plan with tasks, acceptance criteria, and validation commands. The builder runs the tasks in parallel waves. The verifier scores the phase on 4 dimensions (Correctness, Completeness, Wiring, Quality). PASS auto-advances to the next phase.',
        commands: [
          '/qualia-plan 1      # Plan phase 1 of current milestone',
          '/qualia-build 1     # Run tasks in waves',
          '/qualia-verify 1    # Score and auto-advance',
        ],
        example:
          'Phase 1 Verification\n\n' +
          '  Correctness    5/5\n' +
          '  Completeness   4/5\n' +
          '  Wiring         5/5\n' +
          '  Quality        4/5\n\n' +
          '  Result: PASS — advancing to Phase 2',
        exampleTitle: 'What PASS looks like',
        isMilestone: true,
      },
      {
        id: 'bw-4',
        title: 'Close the Milestone, Open the Next',
        description:
          'When every phase in a milestone is verified, run /qualia-milestone. It refuses to close if any phase is unverified or if the milestone has fewer than 2 phases (unless --force). It archives the milestone, updates tracking.json, and reads JOURNEY.md to pre-populate the next milestone name. This is the second kind of human gate.',
        commands: ['/qualia-milestone'],
        tips: [
          'Between milestones is the right time to demo to the client if needed.',
          'Milestone boundaries are numbered contiguously — you cannot skip one.',
        ],
        isMilestone: true,
      },
      {
        id: 'bw-5',
        title: 'The Handoff Milestone (always last)',
        description:
          'The final milestone is literally named "Handoff" with 4 mandatory phases. Phase 1 is /qualia-polish (design + UX). Phase 2 is content and SEO. Phase 3 is final QA. Phase 4 ships and hands off. This structure is enforced by the framework — you cannot skip it.',
        commands: [
          '/qualia-polish        # Phase 1 of Handoff',
          '# Phase 2 + 3: plan/build/verify content and QA',
          '/qualia-ship          # Phase 4: quality gates + deploy',
          '/qualia-handoff       # The 4 deliverables for the client',
        ],
        tips: [
          '/qualia-polish only runs in the Handoff milestone — it is Phase 1 of that milestone, not something you sprinkle earlier.',
          '/qualia-ship runs tsc + lint + tests + build + secret scan before deploying. If any gate fails, it blocks and tells you what to fix.',
        ],
      },
      {
        id: 'bw-6',
        title: 'Hand Off and Report',
        description:
          '/qualia-handoff produces the 4 mandatory client deliverables: verified production URL, updated documentation, archived client assets, and the final ERP report. Then /qualia-report logs your session and releases the clock-out. The project is officially done when both commands succeed.',
        commands: [
          '/qualia-handoff    # 4 mandatory deliverables',
          '/qualia-report     # Session report (mandatory for clock-out)',
        ],
        tips: [
          'Double-check the handoff document before sending to the client: correct URL, working credentials, accurate instructions.',
          'Reports get a stable ID (QS-REPORT-NN). If the upload fails, /qualia-report retries automatically with backoff.',
        ],
      },
    ],
    checklist: {
      title: 'Website Ship Checklist',
      items: [
        '/qualia-new finished, JOURNEY.md approved',
        'Every phase in every milestone verified (PASS)',
        'Every milestone closed with /qualia-milestone',
        'Handoff milestone: polish + content/SEO + final QA + ship all complete',
        'RLS enabled on every Supabase table',
        'No service-role key in client-facing code',
        '/qualia-ship succeeded — production URL loads and passes post-deploy checks',
        '/qualia-handoff produced all 4 deliverables',
        '/qualia-report uploaded to ERP (clock-out unblocked)',
      ],
    },
  },

  {
    slug: 'build-voice-agent',
    title: 'Building an AI Voice Agent',
    subtitle: 'Receptionist bot from kickoff to live calls — with real testing',
    category: 'lifecycle',
    projectType: 'voice-agent',
    steps: [
      {
        id: 'bva-1',
        title: 'Kick Off',
        description:
          'We are building a receptionist bot for a dental clinic. Run /qualia-new, pick Voice Agent as the project type, and describe exactly what it does: "Friendly receptionist for a dental clinic. Answers FAQs, books appointments, transfers complex calls to the office manager."',
        commands: [
          'mkdir -p ~/Projects/clinic-bot',
          'cd ~/Projects/clinic-bot',
          'claude',
          '/qualia-new',
        ],
        tips: [
          'Be specific about tone and handoff rules. "Warm and reassuring, always transfers billing questions to a human."',
          'Voice projects usually have 3-4 milestones: Foundation, Agent, Testing, Handoff.',
          'If the niche is complex (medical triage, legal), run /qualia-research first to capture domain constraints.',
        ],
      },
      {
        id: 'bva-2',
        title: 'The Voice Stack',
        description:
          'Three services work together. Retell AI handles the conversation logic — prompts, tools, when to book, when to transfer. ElevenLabs synthesizes the voice. Telnyx provides the phone number and SIP routing. OpenRouter powers the thinking inside Retell. Each has its own API key and dashboard.',
        tips: [
          'Retell: conversation flow, tool calls, decision-making.',
          'ElevenLabs: how the voice sounds — language, accent, emotion.',
          'Telnyx: phone number provisioning and call routing.',
          'OpenRouter: the model that decides what the agent says next.',
        ],
      },
      {
        id: 'bva-3',
        title: 'The Milestones',
        description:
          'A typical voice agent has 3 build milestones plus Handoff. Foundation sets up the webhook handler and database. Agent builds prompts, tools, and the conversation flow. Testing is where you make real calls and tune latency. Handoff ships and delivers.',
        example:
          '| #  | Milestone  | Phases | Goal                                 |\n' +
          '|----|------------|--------|--------------------------------------|\n' +
          '| M1 | Foundation | 2      | Webhook, Supabase, env, signatures   |\n' +
          '| M2 | Agent      | 2      | Prompts, tools, conversation flow    |\n' +
          '| M3 | Testing    | 2      | Real calls, latency tuning, edge     |\n' +
          '| M4 | Handoff    | 4      | Polish, monitoring, ship, deliver    |',
        exampleTitle: 'Voice agent journey',
      },
      {
        id: 'bva-4',
        title: 'Test With Real Calls Only',
        description:
          'This is the most important step. Always test by calling the actual phone number. Provider dashboards under-report real-world latency by 100-200ms. A response that looks 400ms on the screen may feel 600ms on the phone — callers hang up. Make real calls, try interruptions, try silence, try off-topic questions.',
        warning:
          'Dashboard latency is not real latency. Always test with real phone calls or the client will experience problems you never saw.',
        tips: [
          'Call the number yourself and have real conversations — do not just read scripts.',
          'Interrupt the agent mid-sentence. It should yield gracefully.',
          'Stay silent for 5+ seconds. The agent should prompt you.',
          'Ask something completely off-topic. It should redirect politely.',
          'Test at different times of day — provider load affects latency.',
        ],
      },
      {
        id: 'bva-5',
        title: 'Ship, Monitor, Hand Off',
        description:
          'Go through the Handoff milestone: polish, monitoring setup, ship with /qualia-ship, then handoff with /qualia-handoff. After deploying to production, make one final real call to the production number before telling the client it is live. Voice agents need ongoing monitoring because latency drifts with provider load.',
        commands: ['/qualia-polish', '/qualia-ship', '/qualia-handoff', '/qualia-report'],
        tips: [
          'Set up call log monitoring and cost alerts on the provider dashboard before handoff.',
          'Hand the client clear instructions for updating prompts and reviewing call transcripts.',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Voice Agent Ship Checklist',
      items: [
        'Webhook handler verifies signatures and handles every event type',
        'Prompts live in a server-side file, never exposed client-side',
        'Tested via real phone calls, not just dashboards',
        'First-response latency under 500ms on a real call',
        'Agent handles interruptions, silence, and off-topic gracefully',
        'Human handoff path works when the agent cannot help',
        'Cost monitoring + call log review configured on provider dashboard',
        '/qualia-ship + /qualia-handoff + /qualia-report completed',
      ],
    },
  },

  {
    slug: 'build-web-app',
    title: 'Building a Web App',
    subtitle: 'SaaS dashboards and platforms with 4-5 milestones',
    category: 'lifecycle',
    projectType: 'ai-platform',
    steps: [
      {
        id: 'bwa-1',
        title: 'More Milestones, Same Road',
        description:
          'Web apps are bigger than websites. A SaaS dashboard usually fits in 4-5 milestones: Foundation, Core Features, Dashboard + Payments, Notifications + Polish hooks, Handoff. The workflow is identical — plan, build, verify, close milestone, repeat.',
        example:
          '| #  | Milestone         | Phases | Goal                                     |\n' +
          '|----|-------------------|--------|------------------------------------------|\n' +
          '| M1 | Foundation        | 3      | Database, auth, signup, onboarding       |\n' +
          '| M2 | Core Features     | 4      | CRUD flows, roles, list/detail/edit      |\n' +
          '| M3 | Dashboard + Money | 3      | Stats, charts, Stripe, tiers             |\n' +
          '| M4 | Notifications     | 2      | Email, in-app alerts, webhooks           |\n' +
          '| M5 | Handoff           | 4      | Polish, content/SEO, final QA, ship      |',
        exampleTitle: 'Typical SaaS journey',
        tips: [
          'Hard ceiling is 5 milestones. If you are tempted to make more, one of them is probably too big and should split.',
          'For complex milestones (billing, compliance), run /qualia-discuss before /qualia-plan to lock decisions.',
        ],
      },
      {
        id: 'bwa-2',
        title: 'Use --auto for the Long Haul',
        description:
          'SaaS builds take weeks. --auto mode lets the framework chain plan → build → verify → (next phase) without retyping. It pauses only at milestone boundaries. You review progress, approve, and continue. This turns a week of command typing into a few gate moments.',
        commands: [
          '/qualia-new --auto              # Chain the whole road from kickoff',
          '/qualia                         # Or check status any time',
        ],
        tips: [
          '--auto is safe because gap-cycle limits halt runaway failures.',
          'You can still intervene at any time — send a message and the framework pauses.',
        ],
      },
      {
        id: 'bwa-3',
        title: 'Working Across Days',
        description:
          'End of day: /qualia-pause saves session state, /qualia-report logs to the ERP. Next morning: /qualia-resume reads the saved handoff and routes you straight to the next command. Nothing is lost between sessions, even after Claude Code restarts.',
        commands: [
          '/qualia-pause      # End of day — save session',
          '/qualia-report     # Mandatory before clock-out',
          '# Next morning:',
          '/qualia-resume     # Pick up where you left off',
        ],
        tips: [
          'The pre-compact hook also saves state silently if Claude Code compacts context mid-session.',
          '/qualia-resume works even if you forgot to pause — it falls back to STATE.md.',
        ],
      },
      {
        id: 'bwa-4',
        title: 'Capture Lessons',
        description:
          'When you discover a useful pattern or fix a tricky bug, run /qualia-learn. It saves the lesson to ~/.claude/knowledge/ where every future project reads from. This compounds over time — you and your teammates stop solving the same problem twice.',
        commands: ['/qualia-learn'],
        tips: [
          'Save patterns: "Stripe webhook — always verify signature before processing payload."',
          'Save fixes: "Next.js font loader crashes on Vercel — move import to server component."',
          'Save client preferences: "Sakani always wants Arabic RTL support by default."',
          'After verification failures, the framework offers to save the lesson. Say yes.',
        ],
      },
      {
        id: 'bwa-5',
        title: 'Ship the Handoff Milestone',
        description:
          'Same final milestone as every project — 4 fixed phases: polish, content/SEO, final QA, ship. For apps with payments and user data, the final QA phase should include a security sweep: RLS policies, server-side auth checks, subscription enforcement, no leaked keys.',
        commands: [
          '/qualia-polish',
          '/qualia-review        # Optional but recommended audit',
          '/qualia-ship',
          '/qualia-handoff',
          '/qualia-report',
        ],
        tips: [
          'Subscription tier enforcement must be server-side. Client-only checks are trivial to bypass.',
          'Every table gets RLS. The migration-guard hook already blocks CREATE TABLE without it, but sanity-check legacy tables.',
          'Test login/signup after deploy. Auth issues are the most common post-deploy problem.',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Web App Ship Checklist',
      items: [
        'Every milestone verified and closed with /qualia-milestone',
        'RLS on every Supabase table with proper auth policies',
        'No service-role key in client-facing code',
        'Server-side auth checks on every mutation',
        'Input validation with Zod on forms, API routes, webhooks',
        'Subscription tier enforcement is server-side (not just client)',
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
          'Clock in on the ERP. Open your terminal, navigate to the project, run claude. The statusline tells you which project, which milestone, which phase, and any blockers. Type /qualia-resume (or just /qualia) to pick up.',
        commands: [
          '# 1. Clock in on the ERP',
          'cd ~/Projects/current-project',
          'claude',
          '/qualia-resume     # or /qualia if this is a fresh session',
        ],
        tips: [
          'The statusline now shows M{n}·{name} P{k}/{total} T{done}/{total} — you see milestone, phase, and task progress at a glance.',
          'If the statusline shows a red ! badge, there are blockers. Address them before continuing.',
        ],
      },
      {
        id: 'dr-2',
        title: 'Pick the Right Tool',
        description:
          'Not everything needs a full phase. Use the right command for the size of the work. Small fixes skip planning entirely. Focused single tasks get a fresh builder without a phase plan. Full features go through plan/build/verify.',
        commands: [
          '/qualia-quick "fix button color on /about"   # Under 1 hour',
          '/qualia-task "add contact form to /contact"   # 1-3 hours, one thing',
          '/qualia-plan 3                                  # Full phase work',
        ],
        tips: [
          '/qualia-quick: typos, copy changes, small tweaks. Skips planning, commits directly.',
          '/qualia-task: one feature or component. Fresh builder context, atomic commit, no phase plan.',
          '/qualia-plan: full phase with multiple related tasks.',
        ],
      },
      {
        id: 'dr-3',
        title: 'Building Phases',
        description:
          'For phase work, run plan → build → verify. On PASS, the framework auto-advances to the next phase. On FAIL, it captures the gaps and you run /qualia-plan N --gaps to plan the fixes. If you hit the gap-cycle limit (2 failed cycles), the framework stops and asks for help.',
        commands: [
          '/qualia-plan 2',
          '/qualia-build 2',
          '/qualia-verify 2',
          '/qualia-plan 2 --gaps    # Only if verification fails',
        ],
        tips: [
          'Gap cycles are the framework refusing to spin forever. Hitting the limit means something structural is wrong — stop and rethink.',
          'Between phases, /qualia-quick for small fixes does not disrupt the phase flow.',
        ],
      },
      {
        id: 'dr-4',
        title: 'Breaks',
        description:
          'For short breaks (lunch, coffee), just walk away. Your state is already tracked. For longer pauses or project switches, run /qualia-pause to write an explicit handoff file. Either way, /qualia-resume will pick up correctly later.',
        commands: ['/qualia-pause      # Optional for short breaks, useful for long ones'],
        tips: [
          '30-minute lunch: no pause needed.',
          'Switching to a different project: pause first so the statusline of the new project is clean.',
        ],
      },
      {
        id: 'dr-5',
        title: 'End of Day — Mandatory',
        description:
          "Run /qualia-report before you clock out. It generates today's session summary and POSTs it to the ERP with a stable QS-REPORT-NN ID. The ERP refuses to clock you out without today's report. If you want to preview the report first, use --dry-run.",
        commands: [
          "/qualia-report              # Upload today's report",
          '/qualia-report --dry-run    # Preview without uploading',
          '# Then clock out on the ERP',
        ],
        warning:
          'No report, no clock-out. This is enforced by the ERP, not the framework. Run /qualia-report before you stop working, every day.',
      },
      {
        id: 'dr-6',
        title: 'When You Are Stuck',
        description:
          'Three layers. First, /qualia — mechanical routing. Second, /qualia-idk — diagnostic scans of .planning/ and code in parallel to tell you what is actually going on. Third, /qualia-debug — structured symptoms → diagnosis → fix. After 30 minutes, ping Fawzi. Do not spin for hours.',
        commands: [
          '/qualia             # Level 1: mechanical routing',
          '/qualia-idk         # Level 2: diagnostic — "what is actually happening?"',
          '/qualia-debug       # Level 3: structured debugging',
          '# Level 4: Ask Fawzi',
        ],
        tips: [
          '/qualia-idk is the one to try when everything seems fine but nothing works. It spawns two isolated scans and reconciles them.',
          '/qualia-debug checks the knowledge base first — if your bug has a known fix, it applies it directly.',
        ],
      },
    ],
    checklist: {
      title: 'Daily Routine Checklist',
      items: [
        'Clocked in on the ERP',
        'Opened Claude Code, ran /qualia-resume or /qualia',
        'Used the right tool: /qualia-quick, /qualia-task, or /qualia-plan',
        'Asked for help after 30 minutes stuck (not 3 hours)',
        'Ran /qualia-report before stopping (mandatory)',
        'Clocked out on the ERP',
      ],
    },
  },

  {
    slug: 'design-quality',
    title: 'Design and Quality',
    subtitle: 'DESIGN.md, anti-AI-slop, polish, quality gates, verification scoring',
    category: 'operations',
    projectType: 'workflow',
    steps: [
      {
        id: 'dq-1',
        title: 'DESIGN.md — The Project Design Spec',
        description:
          "Every project gets a DESIGN.md file with 12 sections: palette, typography, spacing, effects/shadows, radii, motion, component patterns, layout rules, responsive behavior, do/don't rules, accessibility requirements, and dark mode. The frontend guard hook forces Claude to read DESIGN.md before any frontend change.",
        tips: [
          'DESIGN.md is created by /qualia-new based on your design direction answers.',
          'Edit DESIGN.md any time to adjust direction. Claude re-reads it on every frontend task.',
          'If no DESIGN.md exists, Claude falls back to ~/.claude/rules/frontend.md (our brand defaults).',
        ],
      },
      {
        id: 'dq-2',
        title: 'Anti-AI-Slop',
        description:
          'The framework actively blocks generic AI patterns. Banned fonts: Inter, Roboto, Arial, system-ui, Space Grotesk — they all scream "AI-generated." Banned patterns: identical card grids, generic hero sections, blue-purple gradients. Banned layout: hardcoded max-widths like 1200px. Everything must be fluid and purposeful.',
        tips: [
          'Pair a distinctive display font with a refined body font — commit to the choice.',
          'Every interactive element needs loading + empty + error + hover + focus states.',
          'Contrast must meet WCAG AA: 4.5:1 normal text, 3:1 large text.',
          'These rules are enforced during build, verify, and polish — you do not need to remember them manually.',
        ],
      },
      {
        id: 'dq-3',
        title: '/qualia-design — Quick Design Fix',
        description:
          'Use /qualia-design when a page or component needs to look better right now. It reads DESIGN.md, critiques the current state, and fixes it in one pass. Good for mid-build touch-ups when something looks rough.',
        commands: [
          '/qualia-design                 # Fix all frontend files',
          '/qualia-design app/page.tsx    # Fix one specific file',
        ],
      },
      {
        id: 'dq-4',
        title: '/qualia-polish — The Full Pass (Handoff Phase 1)',
        description:
          '/qualia-polish is Phase 1 of the Handoff milestone — not something you run mid-project. It does a comprehensive design + quality pass covering typography, color, layout, interactive states, motion, accessibility, responsive design, and edge-case hardening (long text, empty data, slow connections, keyboard-only use).',
        commands: ['/qualia-polish'],
        warning:
          'Run /qualia-polish only in the Handoff milestone, after every other milestone is closed. Polishing earlier wastes work because later milestones change things.',
        isMilestone: true,
      },
      {
        id: 'dq-5',
        title: 'Quality Gates (Automatic)',
        description:
          '/qualia-ship runs a gate chain before any production deploy: TypeScript compiles, linter passes, tests green, build succeeds, no leaked service-role keys. If any check fails, the deploy is blocked with the exact error. You can run the gates manually any time.',
        commands: [
          'npx tsc --noEmit     # Type check',
          'npm run lint          # Linter',
          'npm test              # Tests',
          'npm run build         # Build',
        ],
        tips: [
          'The most common blocker is TypeScript errors — fix them before shipping.',
          'Secret key detection is a grep for service-role, SUPABASE-SERVICE-ROLE-KEY, and known anti-patterns.',
          'If the build passes locally but fails on Vercel, run vercel build locally to reproduce.',
        ],
      },
      {
        id: 'dq-6',
        title: 'Verification Scoring',
        description:
          '/qualia-verify scores a phase on 4 dimensions: Correctness (does it work?), Completeness (is everything built?), Wiring (are the pieces connected?), Quality (is it well-built?). Each dimension scores 1-5. Anything below 3 on any dimension fails the phase. Verification is goal-backward — it walks observable Acceptance Criteria, not just "did the task run."',
        example:
          'Phase 2 Verification\n\n' +
          '  Correctness    5/5   Every feature works as specified\n' +
          '  Completeness   4/5   All tasks built, one minor gap\n' +
          '  Wiring         5/5   All components connected properly\n' +
          '  Quality        4/5   Good code, minor improvements possible\n\n' +
          '  Result: PASS — advancing to Phase 3',
        exampleTitle: 'Verification score',
        tips: [
          'A 3/5 is acceptable. A 2/5 means real issues.',
          'The verifier greps the codebase for stubs, placeholders, and unwired imports. It does not trust summaries.',
          'On FAIL, the framework shows specific evidence for each failing score.',
        ],
      },
    ],
    checklist: {
      title: 'Design and Quality Checklist',
      items: [
        'DESIGN.md exists with 12 sections (or project inherits brand defaults)',
        'No banned fonts (Inter, Roboto, Arial, system-ui, Space Grotesk)',
        'No identical card grids, generic heroes, or blue-purple gradients',
        'Fluid full-width layouts — no hardcoded max-widths',
        'Every interactive element has loading/empty/error/hover/focus states',
        'Contrast meets WCAG AA',
        '/qualia-polish run as Phase 1 of the Handoff milestone',
        'Quality gates pass: tsc + lint + tests + build + no leaked secrets',
        'Verification scores 3/5 or above on all 4 dimensions',
      ],
    },
  },

  // =====================================================================
  // REFERENCE — Commands in one place
  // =====================================================================

  {
    slug: 'commands-reference',
    title: 'All Commands Reference',
    subtitle: 'Every slash command and CLI command in v4.0.5',
    category: 'reference',
    projectType: 'workflow',
    steps: [
      {
        id: 'cr-1',
        title: 'Navigation and State',
        description: 'Commands for figuring out where you are and what to do next.',
        commands: [
          '/qualia           — Smart router. Reads state and returns the next command. Use when lost.',
          '/qualia-idk       — Diagnostic. Scans .planning/ and code in parallel. Use when confused.',
          '/qualia-resume    — Restore from .continue-here.md or STATE.md.',
          '/qualia-pause     — Save session before stopping.',
          '/qualia-help      — Open the framework reference in your browser.',
        ],
      },
      {
        id: 'cr-2',
        title: 'Project Kickoff',
        description: 'Commands for starting or mapping projects.',
        commands: [
          '/qualia-new           — Interactive wizard. Questions + research + JOURNEY.md.',
          '/qualia-new --auto    — Chain plan → build → verify across the whole road.',
          '/qualia-new --full-detail — Write full phase detail for every milestone upfront.',
          '/qualia-map           — Map an existing brownfield codebase before /qualia-new.',
          '/qualia-discuss N     — Capture decisions before planning a complex phase.',
          '/qualia-research N    — Deep research a niche phase (Context7/WebFetch).',
        ],
        tips: [
          'Greenfield? /qualia-new. Brownfield? /qualia-map first, then /qualia-new.',
          'Regulated or compliance-sensitive phase? /qualia-discuss N before /qualia-plan N.',
        ],
      },
      {
        id: 'cr-3',
        title: 'The Build Loop',
        description: 'Three commands per phase, one command per milestone.',
        commands: [
          '/qualia-plan N      — Plan phase N. Story-file format with Acceptance Criteria.',
          '/qualia-plan N --gaps — Plan fixes for a failed verification.',
          '/qualia-build N     — Build phase N. Wave-based parallel tasks.',
          '/qualia-verify N    — Verify phase N. 4-dimension scoring.',
          '/qualia-milestone   — Close current milestone, open next. Human gate.',
        ],
        tips: [
          'Order: plan → build → verify. Repeat for each phase. Then /qualia-milestone.',
          'On PASS the framework auto-advances. On FAIL run /qualia-plan N --gaps.',
        ],
      },
      {
        id: 'cr-4',
        title: 'Quick Work',
        description: 'Commands for work that does not justify a full phase.',
        commands: [
          '/qualia-quick "desc"   — Fast fix, under 1 hour, no plan file, atomic commit.',
          '/qualia-task "desc"    — Focused single task, 1-3 hours, fresh builder context.',
        ],
      },
      {
        id: 'cr-5',
        title: 'Design and Quality',
        description: 'Commands for design and deep quality work.',
        commands: [
          '/qualia-design     — One-shot design transformation. Use mid-build.',
          '/qualia-polish     — Full structured pass. Phase 1 of Handoff milestone.',
          '/qualia-review     — Production audit with scored diagnostics.',
          '/qualia-optimize   — Deep optimization pass with parallel specialist agents.',
          '/qualia-test       — Generate or run tests.',
        ],
        tips: [
          '/qualia-design for mid-build touch-ups. /qualia-polish for the Handoff milestone pass.',
          '/qualia-optimize spawns parallel agents for perf, UI, backend, and alignment. Use --perf or --ui to focus.',
        ],
      },
      {
        id: 'cr-6',
        title: 'Shipping',
        description: 'Commands for deploying and delivering.',
        commands: [
          '/qualia-ship         — Quality gates + commit + push + deploy + post-deploy verification.',
          '/qualia-handoff      — 4 mandatory deliverables: URL, docs, assets, final report.',
          "/qualia-report       — Upload today's session report to ERP. Required for clock-out.",
          '/qualia-report --dry-run — Preview the report without uploading.',
        ],
        warning:
          '/qualia-report is required for clock-out. The ERP will not let you finish without it.',
      },
      {
        id: 'cr-7',
        title: 'Debugging and Learning',
        description: 'Commands for investigating problems and capturing knowledge.',
        commands: [
          '/qualia-debug      — Structured debugging: symptoms → diagnosis → fix.',
          '/qualia-learn      — Save a pattern, fix, or client preference to ~/.claude/knowledge/.',
          '/qualia-skill-new  — Author a new Qualia skill or agent.',
        ],
      },
      {
        id: 'cr-8',
        title: 'CLI (outside Claude Code)',
        description: 'Commands you run in a regular terminal.',
        commands: [
          'npx qualia-framework install       — One-time setup with team code.',
          'npx qualia-framework update        — Update to latest (auto-updates run nightly).',
          'npx qualia-framework version       — Check installed version.',
          'npx qualia-framework team list     — Show team members.',
          'npx qualia-framework team add      — Add a team member.',
          'npx qualia-framework erp-ping      — Smoke-test the ERP connection.',
          'npx qualia-framework traces        — View recent hook telemetry.',
          'npx qualia-framework uninstall     — Clean removal from ~/.claude/.',
        ],
      },
    ],
    checklist: {
      title: 'Command Quick Reference',
      items: [
        'Lost? /qualia',
        'Confused? /qualia-idk',
        'New project? /qualia-new (add --auto to chain the road)',
        'Brownfield? /qualia-map → /qualia-new',
        'Phase work? /qualia-plan N → /qualia-build N → /qualia-verify N',
        'Milestone done? /qualia-milestone',
        'Small fix? /qualia-quick — Focused task? /qualia-task',
        'Design mid-build? /qualia-design — Handoff polish? /qualia-polish',
        'Audit? /qualia-review — Perf? /qualia-optimize — Tests? /qualia-test',
        'Deploy? /qualia-ship — Deliver? /qualia-handoff',
        'End of day? /qualia-report (mandatory)',
        'Broken? /qualia-debug — Stuck 30+ min? Ask Fawzi',
      ],
    },
  },

  // =====================================================================
  // CHECKLIST — Single source of truth before going live
  // =====================================================================

  {
    slug: 'shipping-checklist',
    title: 'Shipping Checklist',
    subtitle: 'Everything to verify before the Handoff milestone goes out',
    category: 'checklist',
    projectType: 'workflow',
    steps: [
      {
        id: 'sc-1',
        title: 'Every Phase Verified',
        description:
          'Every phase in every milestone must have PASSED verification. Run /qualia to check. If anything is unverified or failed, go back and close the gap before continuing. The framework will not let you close a milestone with unverified phases.',
        commands: ['/qualia'],
      },
      {
        id: 'sc-2',
        title: 'Every Milestone Closed',
        description:
          'Every milestone before Handoff must be closed with /qualia-milestone. The close command refuses to run if phases are unverified or the milestone has fewer than 2 phases. Milestone numbering must be contiguous — no gaps.',
        commands: ['/qualia-milestone'],
      },
      {
        id: 'sc-3',
        title: 'Handoff Milestone — Phase 1 Polish',
        description:
          'The first phase of the Handoff milestone is /qualia-polish — the full design and quality pass. Typography, colors, layout, states, motion, accessibility, responsive, edge-case hardening.',
        commands: ['/qualia-polish'],
      },
      {
        id: 'sc-4',
        title: 'Security',
        description:
          'No service-role key in client-facing code (pre-deploy hook scans for it). RLS on every Supabase table with policies that check auth.uid(). Server-side auth checks on every mutation. Zod validation on all inputs. No .env committed.',
        tips: [
          'RLS on every table — the migration-guard hook enforces this for new tables.',
          'service-role key is server-only — import it only in files under lib/supabase/server.ts or equivalent.',
          'Validate inputs with Zod on forms, API routes, webhooks.',
          'For apps with subscriptions, enforce tiers server-side. Client-only checks are bypassable.',
        ],
      },
      {
        id: 'sc-5',
        title: 'Deploy',
        description:
          '/qualia-ship runs the full gate chain: TypeScript, lint, tests, build, secret scan. If any step fails it blocks and tells you exactly what to fix. After deploy it runs post-deploy verification automatically.',
        commands: ['/qualia-ship'],
        isMilestone: true,
      },
      {
        id: 'sc-6',
        title: 'Post-Deploy Checks',
        description:
          'After the deploy, /qualia-ship automatically confirms: HTTP 200 on homepage, response time under 500ms, auth callback endpoint works, no critical console errors. If any check fails, the ship is incomplete and it tells you what broke.',
        tips: [
          'Manual spot-check: open the production URL, try login/signup, click through the main flows.',
          'UptimeRobot monitor should show UP for the new deployment.',
        ],
      },
      {
        id: 'sc-7',
        title: 'Handoff',
        description:
          '/qualia-handoff produces 4 mandatory deliverables: verified production URL, updated documentation, archived client assets, final ERP report. Review each one before sending to the client — especially the credentials and instructions.',
        commands: ['/qualia-handoff'],
      },
      {
        id: 'sc-8',
        title: 'Session Report',
        description:
          "/qualia-report uploads today's session to the ERP with a stable QS-REPORT-NN ID. This is mandatory — the ERP clock-out refuses without it. Retries happen automatically on network flakes.",
        commands: ['/qualia-report'],
        warning: 'No report, no clock-out. Enforced by the ERP. Run it before you stop working.',
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Ready to Ship?',
      items: [
        'Every phase PASSED verification',
        'Every non-Handoff milestone closed with /qualia-milestone',
        'Handoff Phase 1 /qualia-polish completed',
        'Content + SEO phase done (if applicable)',
        'Final QA phase done — RLS, auth, inputs, subscriptions all checked',
        'No service-role key in client-facing code',
        '/qualia-ship succeeded — production URL live, post-deploy checks pass',
        '/qualia-handoff produced all 4 deliverables',
        '/qualia-report uploaded to ERP (clock-out unblocked)',
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
