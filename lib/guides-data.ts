// Knowledge Base — Qualia Engine Workflow Guides
// Rewritten from real .claude/ directory, framework v2.0, and actual project examples.
// Each guide teaches the REAL workflow with boring, step-by-step detail.

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
    slug: 'what-is-qualia',
    title: 'What Is the Qualia Engine',
    subtitle: 'The framework that turns Claude Code into a structured build system',
    category: 'foundations',
    projectType: 'workflow',
    steps: [
      {
        id: 'wq-1',
        title: 'The Problem It Solves',
        description:
          'Without structure, AI coding assistants are unpredictable — they skip steps, forget context between sessions, deploy broken code, and hallucinate that things work. The Qualia Engine wraps Claude Code with enforced workflows, quality gates, and persistent project memory.',
      },
      {
        id: 'wq-2',
        title: 'Three Layers of Intelligence',
        description: 'The framework operates at three levels, always running simultaneously.',
        tips: [
          'Layer 1: Always-On Rules — CLAUDE.md files, security rules, git branch protection. Active in EVERY session automatically.',
          'Layer 2: Pipeline Enforcement — Specialized agents (planner, executor, verifier) that run during /qualia commands. They check your work against 9 quality dimensions.',
          'Layer 3: Session Activation — /qualia-start turns on design guards, deploy gates, intent verification, and skill auto-loading for the entire session.',
        ],
      },
      {
        id: 'wq-3',
        title: 'The Build Lifecycle',
        description:
          'Every project follows the same cycle. Each step produces a file in the .planning/ directory that feeds the next step. Nothing is lost between sessions.',
        example:
          'New Project → Discuss → Plan → Execute → Verify → Ship\n' +
          '     ↓           ↓        ↓        ↓          ↓        ↓\n' +
          ' PROJECT.md  CONTEXT.md  PLAN.md  SUMMARY.md  UAT.md  Deploy\n' +
          ' ROADMAP.md                                            Git Tag\n' +
          ' STATE.md (updated at every step)',
        exampleTitle: 'The Lifecycle Pipeline',
      },
      {
        id: 'wq-4',
        title: 'What v2.0 Changed',
        description:
          'v1.0 was trust-based — it relied on Claude self-reporting quality. v2.0 is evidence-based — every claim is machine-verified.',
        tips: [
          'Plans with vague instructions ("TBD", "as needed") are auto-rejected — 14 placeholder patterns are blocked.',
          "Tasks can't be marked complete without evidence — file content for trivial, command output for standard, full proof for critical.",
          'Deploys are blocked without a fresh code review — REVIEW.md must exist and be recent.',
          'The executor can\'t silently modify files outside its scope — scope lock defers unplanned work to "Deferred Discoveries".',
          '/qualia-start activates all these guards for EVERY interaction, not just pipeline commands.',
        ],
      },
      {
        id: 'wq-5',
        title: 'The Agent System',
        description:
          'Complex work is handled by specialized AI agents, each with their own system prompt and tool access. You never interact with them directly — the /qualia commands orchestrate them.',
        tips: [
          'Planner Agent (43KB prompt) — Reads your ROADMAP.md, CONTEXT.md, and codebase to create detailed plans with waves and tasks.',
          'Plan Checker Agent (23KB prompt) — Reviews plans against 9 dimensions: completeness, specificity, acceptance criteria, skill references, etc. Rejects plans up to 3 times.',
          'Executor Agent (32KB prompt) — Reads PLAN.md and builds the code. Commits to git after each task. Flags scope violations.',
          'Verifier Agent (22KB prompt) — Checks that the phase GOAL was met (not just that tasks completed). Runs automated checks + manual UAT.',
          'Debugger Agent (36KB prompt) — Uses scientific method to diagnose bugs: hypothesis → test → confirm/reject → fix.',
        ],
      },
      {
        id: 'wq-6',
        title: '65 Skills, 13 Hooks, 21 Agents',
        description:
          "The framework includes 65 specialist skills (design, deploy, debug, voice, mobile, etc.), 13 automated hooks (branch protection, auto-format, deploy gate, session save), and 21 agent definitions. You don't need to know all of them — they activate automatically based on what you're doing.",
      },
    ],
    checklist: {
      title: 'Key Concepts',
      items: [
        'Three layers: always-on rules, pipeline agents, session activation',
        'Every step produces a file that feeds the next step',
        'v2.0 = evidence-based, not trust-based',
        'Specialized agents handle planning, execution, verification',
        "Skills and hooks activate automatically — you don't configure them",
      ],
    },
  },

  {
    slug: 'first-session',
    title: 'Your First Session',
    subtitle: 'Opening Claude Code, activating Qualia mode, running your first command',
    category: 'foundations',
    projectType: 'workflow',
    steps: [
      {
        id: 'fs-1',
        title: 'Open Your Terminal',
        description:
          'Navigate to the project you want to work on. Every project lives in ~/Projects/.',
        commands: ['cd ~/Projects/my-project'],
      },
      {
        id: 'fs-2',
        title: 'Launch Claude Code',
        description:
          'Type "claude" to start. Claude reads the project\'s CLAUDE.md file to understand the codebase — what stack it uses, how to build, what conventions to follow. This happens automatically.',
        commands: ['claude'],
        tips: [
          "You'll see the Claude Code prompt (❯) when it's ready.",
          'The status line at the bottom shows your current project, branch, and model.',
        ],
      },
      {
        id: 'fs-3',
        title: 'Activate Qualia Mode',
        description:
          'This turns on all framework intelligence for the session. It detects your project type (website, AI agent, voice, mobile), loads relevant skills, checks project state, and enables quality guards.',
        commands: ['/qualia-start'],
        tips: [
          'Claude will report: project name, detected type, loaded skills, current phase (if .planning/ exists).',
          'If the project has no .planning/ directory, it reports "No Qualia project structure found" — that\'s fine, it still enables quality guards.',
        ],
        example:
          '✓ Project: giulio-agent\n' +
          '✓ Type: ai-agent (detected from @ai-sdk imports)\n' +
          '✓ Skills loaded: frontend-master, deploy, deploy-verify\n' +
          '✓ State: Phase 4 of 4 (v1.6) — Milestone complete\n' +
          '✓ Qualia mode: ACTIVE',
        exampleTitle: 'Example Output',
        isMilestone: true,
      },
      {
        id: 'fs-4',
        title: 'Check Project Status',
        description: 'If this is an existing Qualia project, check where you left off.',
        commands: ['/qualia-status'],
        tips: [
          'Shows: current milestone, current phase, progress bar, recent decisions, blockers.',
          "If there's unfinished work, it tells you exactly what to resume.",
        ],
      },
      {
        id: 'fs-5',
        title: 'Essential Commands to Know',
        description: "You'll use these constantly. Memorize them.",
        commands: [
          '/clear — Wipe context window (use between major steps)',
          '/compact — Compress conversation to save space (use at ~60% capacity)',
          '/qualia-help — Show all available commands',
          '/qualia-status — Check project state',
        ],
        warning:
          'Always /clear between discuss → plan → execute → verify. A full context window produces worse output. This is the single most important habit.',
      },
      {
        id: 'fs-6',
        title: 'Talking to Claude',
        description: "You can talk in plain English. You don't need slash commands for everything.",
        tips: [
          '"Add a contact form to the homepage" — Claude builds it.',
          '"This button doesn\'t work" — Claude debugs it.',
          '"Make this look better on mobile" — Claude fixes responsive issues.',
          '"Deploy this to production" — Claude runs the deploy pipeline.',
          'Be specific. "Add a form" is worse than "Add a contact form with name, email, message fields that saves to Supabase and sends a confirmation email via Resend".',
        ],
      },
    ],
    checklist: {
      title: 'First Session Checklist',
      items: [
        'Can navigate to project and launch claude',
        'Know how to activate Qualia mode (/qualia-start)',
        'Know how to check status (/qualia-status)',
        'Know how to clear context (/clear) and why it matters',
        'Know you can just talk in plain English',
      ],
    },
  },

  {
    slug: 'planning-directory',
    title: 'The .planning/ Directory',
    subtitle: 'Every file the engine creates, what it does, and how they connect',
    category: 'foundations',
    projectType: 'workflow',
    steps: [
      {
        id: 'pd-1',
        title: 'Directory Structure',
        description:
          "The .planning/ directory is the project's brain. Every decision, plan, and result lives here. It's committed to git so the full history is preserved.",
        example:
          '.planning/\n' +
          "├── PROJECT.md          # What we're building, for whom, why\n" +
          '├── ROADMAP.md          # All phases with goals and acceptance criteria\n' +
          '├── STATE.md            # Where we are right now (< 100 lines)\n' +
          '├── REQUIREMENTS.md     # Functional + non-functional requirements\n' +
          '├── DESIGN.md           # Design decisions (colors, fonts, layout)\n' +
          '├── REVIEW.md           # Latest code review results (deploy gate)\n' +
          '├── config.json         # Project config (stack, deploy target)\n' +
          '├── research/           # Research outputs from /qualia:research-phase\n' +
          '├── phases/\n' +
          '│   ├── 01-foundation/\n' +
          '│   │   ├── CONTEXT.md  # Decisions from /qualia:discuss-phase\n' +
          '│   │   ├── PLAN.md     # Implementation plan from /qualia:plan-phase\n' +
          '│   │   └── SUMMARY.md  # What was built from /qualia:execute-phase\n' +
          '│   ├── 02-core-pages/\n' +
          '│   │   ├── CONTEXT.md\n' +
          '│   │   ├── 02-01-PLAN.md  # Multiple plans per phase\n' +
          '│   │   ├── 02-02-PLAN.md\n' +
          '│   │   ├── 02-01-SUMMARY.md\n' +
          '│   │   └── 02-02-SUMMARY.md\n' +
          '│   └── .../\n' +
          '├── quick/              # Quick task tracking\n' +
          '├── debug/              # Debug session logs\n' +
          '└── todos/              # Captured ideas for later\n' +
          '    └── pending/',
        exampleTitle: 'File Tree',
      },
      {
        id: 'pd-2',
        title: 'PROJECT.md — The Source of Truth',
        description:
          "Created during /qualia:new-project. Contains everything about what you're building: project name, client, description, tech stack, constraints, key decisions. Claude reads this before every major action.",
        example:
          '# Project: Gulio Agent\n\n' +
          '## Description\n' +
          'AI productivity agent that executes real work — scraping,\n' +
          'writing, summarizing, posting — not just chat.\n\n' +
          '## Tech Stack\n' +
          '- Framework: Next.js 16+ (App Router)\n' +
          '- Database: Supabase (pgvector for RAG)\n' +
          '- AI: Claude via AI SDK + OpenRouter fallback\n' +
          '- Deploy: Vercel\n\n' +
          '## Key Decisions\n' +
          '| Date | Decision | Rationale |\n' +
          '|------|----------|----------|\n' +
          '| 03-21 | Category persists per conversation | Prevents mid-convo confusion |\n' +
          '| 03-25 | Single CTE for domain RAG | Eliminates triple table scan |',
        exampleTitle: 'Example: PROJECT.md (abbreviated)',
      },
      {
        id: 'pd-3',
        title: 'ROADMAP.md — The Phase Plan',
        description:
          'Lists every phase of the project with its goal, requirements covered, estimated plans, deliverables, and acceptance criteria. This is what the planner agent reads to create detailed plans.',
        example:
          '# Roadmap: My Website\n\n' +
          '### Phase 1: Foundation\n' +
          '**Goal:** Project setup, auth, layout shell, database schema.\n' +
          '**Requirements:** R1.1-R1.5\n' +
          '**Estimated plans:** 2\n\n' +
          '**Deliverables:**\n' +
          '- Next.js 16 project with TypeScript\n' +
          '- Supabase auth (email/password)\n' +
          '- Base layout with header, sidebar, footer\n\n' +
          '**Acceptance:**\n' +
          '- User can sign up and log in\n' +
          '- Protected routes redirect to /auth/login\n' +
          '- Layout renders on mobile and desktop',
        exampleTitle: 'Example: ROADMAP.md (one phase)',
      },
      {
        id: 'pd-4',
        title: 'STATE.md — Where We Are Right Now',
        description:
          "The project's short-term memory. Updated after every significant action. Must stay under 100 lines. Claude reads this FIRST in every workflow.",
        example:
          '# Project State\n\n' +
          '## Current Position\n' +
          'Milestone: v1.6 — Production Hardening II\n' +
          'Phase: 4 of 4 (all complete)\n' +
          'Status: Milestone complete — ready to deploy\n\n' +
          'Progress: [##########] 100%\n\n' +
          '### Phases\n' +
          '- Phase 1: Database & Security Migrations — COMPLETE\n' +
          '- Phase 2: Code Fixes & Security — COMPLETE\n' +
          '- Phase 3: Chat Route Refactor — COMPLETE\n' +
          '- Phase 4: Test Infrastructure — COMPLETE\n\n' +
          '## Known Issues\n' +
          '- Sidebar category dropdown filter logic missing (UI-6 partial)',
        exampleTitle: 'Example: STATE.md',
      },
      {
        id: 'pd-5',
        title: 'How Files Flow Between Steps',
        description:
          'Each workflow step reads from previous files and writes new ones. This is how context survives across sessions.',
        tips: [
          '/qualia:new-project → writes PROJECT.md, ROADMAP.md, STATE.md, config.json',
          '/qualia:discuss-phase → reads ROADMAP.md → writes phases/XX/CONTEXT.md',
          '/qualia:plan-phase → reads ROADMAP.md + CONTEXT.md → writes phases/XX/PLAN.md',
          '/qualia:execute-phase → reads PLAN.md → writes phases/XX/SUMMARY.md, updates STATE.md',
          '/qualia:verify-work → reads SUMMARY.md → writes VERIFICATION.md or fix plans',
          '/qualia:complete-milestone → reads all SUMMARYs → deploys, tags git, archives',
        ],
      },
    ],
    checklist: {
      title: 'Files to Know',
      items: [
        "PROJECT.md = what we're building (source of truth)",
        'ROADMAP.md = all phases with acceptance criteria',
        'STATE.md = where we are now (read first, always)',
        'CONTEXT.md = decisions from discuss-phase',
        'PLAN.md = implementation plan from plan-phase',
        'SUMMARY.md = what was built from execute-phase',
      ],
    },
  },

  // =====================================================================
  // LIFECYCLE — The full build cycle, one step at a time
  // =====================================================================

  {
    slug: 'new-project',
    title: 'Starting a New Project',
    subtitle: 'From zero to a structured project with roadmap, requirements, and plans',
    category: 'lifecycle',
    projectType: 'workflow',
    steps: [
      {
        id: 'np-1',
        title: 'Create Your Project Folder',
        commands: ['cd ~/Projects', 'mkdir my-project', 'cd my-project'],
      },
      {
        id: 'np-2',
        title: 'Start Claude Code and Activate Qualia',
        commands: ['claude', '/qualia-start'],
      },
      {
        id: 'np-3',
        title: 'Run New Project',
        description:
          "This kicks off the structured initialization. Claude enters a questioning phase — it asks deep questions about what you're building. Your answers directly shape the entire project.",
        commands: ['/qualia:new-project'],
        isMilestone: true,
      },
      {
        id: 'np-4',
        title: 'The Questioning Phase — Answer Thoroughly',
        description:
          "Claude asks about: what the project is, who it's for, what problem it solves, key features, tech stack, constraints, and what success looks like. Be as specific as possible.",
        tips: [
          'BAD: "A website for a dentist"',
          'GOOD: "A landing page for Dr. Ahmad\'s dental clinic in Amman. Hero section with clinic photos, services grid (6 services with icons), team profiles for 3 dentists, testimonials carousel, contact form saving to Supabase, embedded Google Maps. Arabic RTL support. Clean modern design with blue/white palette. Mobile-first."',
          'Mention reference sites: "Similar layout to stripe.com but for healthcare"',
          'Mention stack preferences: "Use Supabase for DB, Vercel for deploy, Resend for email"',
          'If you don\'t have a preference, say "Claude\'s discretion" — Claude picks the best default.',
        ],
      },
      {
        id: 'np-5',
        title: 'Claude Creates PROJECT.md',
        description:
          "After the Q&A, Claude writes PROJECT.md — a document capturing your requirements, constraints, and decisions. Read it when Claude shows it. Correct anything that's off — this is the source of truth for the entire build.",
      },
      {
        id: 'np-6',
        title: 'Claude Creates ROADMAP.md',
        description:
          'Claude breaks the project into sequential phases. Each phase has a clear goal, lists which requirements it covers, estimates the number of plans, and defines acceptance criteria.',
        tips: [
          'A typical website has 5-6 phases: Foundation, Core Pages, Dynamic Content, Forms, Polish/SEO, Deploy.',
          'An AI agent has ~6 phases: Foundation, AI Core, Conversation Management, Tools & Actions, Safety, Deploy.',
          'A voice agent has ~6 phases: Foundation, Telephony, Speech Pipeline, Conversation Logic, Call Management, Deploy.',
          'Phases are small enough to complete in 1-2 sessions.',
        ],
      },
      {
        id: 'np-7',
        title: 'Claude Creates STATE.md',
        description:
          'The project\'s living memory. Initialized to "Phase 1 ready to plan" with empty sections for decisions, blockers, and todos. This file gets updated after every significant action.',
      },
      {
        id: 'np-8',
        title: 'Environment Setup',
        description: 'Claude detects which services you need and walks you through setup.',
        tips: [
          'Have your Supabase project URL and anon key ready (supabase.com dashboard → Settings → API).',
          'Have your Vercel account linked to your Git repo.',
          'Claude creates .env.local with your keys — this file is gitignored, never committed.',
        ],
        warning: 'If you skip environment setup, things break during execution. Set it up now.',
      },
      {
        id: 'np-9',
        title: 'Your Project Is Initialized',
        description:
          'You now have a .planning/ directory with PROJECT.md, ROADMAP.md, STATE.md, REQUIREMENTS.md, and config.json. The next step is to discuss Phase 1.',
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'After Initialization',
      items: [
        '.planning/ directory exists with all files',
        "PROJECT.md accurately describes what you're building",
        'ROADMAP.md has clear phases with acceptance criteria',
        'Environment variables configured (.env.local)',
        'STATE.md shows "Phase 1 ready to plan"',
      ],
    },
  },

  {
    slug: 'discuss-phase',
    title: 'Discussing a Phase',
    subtitle: 'Resolving gray areas before planning so Claude builds what you actually want',
    category: 'lifecycle',
    projectType: 'workflow',
    steps: [
      {
        id: 'dp-1',
        title: 'Why Discuss Before Planning',
        description:
          "Every phase has gray areas — decisions that affect implementation but aren't specified in the roadmap. If you skip discuss and go straight to plan, Claude makes assumptions. Sometimes they're right. Often they're not. Discussing first takes 5 minutes and prevents hours of rework.",
      },
      {
        id: 'dp-2',
        title: 'Run Discuss Phase',
        description:
          'Tell Claude which phase number to discuss. It reads ROADMAP.md, identifies the gray areas, and asks you about each one.',
        commands: ['/qualia:discuss-phase 1'],
      },
      {
        id: 'dp-3',
        title: 'Claude Identifies Gray Areas',
        description:
          'For each phase, Claude finds 4-8 decisions that need your input. It presents them as questions.',
        example:
          'Phase 1: Foundation — I found 5 gray areas:\n\n' +
          'D1: Navigation Style\n' +
          '  Options: sticky header, sidebar nav, tab bar\n' +
          '  Impact: affects layout component structure\n\n' +
          'D2: Auth Flow\n' +
          '  Options: email/password, magic link, OAuth\n' +
          '  Impact: affects Supabase auth config\n\n' +
          'D3: Color Scheme\n' +
          '  Options: brand colors specified, or Claude picks\n' +
          '  Impact: affects all components\n\n' +
          'Which would you like to discuss?',
        exampleTitle: 'Example: Gray Areas Identified',
      },
      {
        id: 'dp-4',
        title: 'Answer Each Decision',
        description:
          'For each gray area, describe how you imagine it. Be specific. If you don\'t have a strong opinion, say "Claude\'s Discretion" and Claude picks the best default.',
        tips: [
          'GOOD: "Sticky header with logo left, nav links center, CTA button right. Mobile: hamburger menu with slide-out drawer."',
          'GOOD: "Email/password auth. No OAuth needed — internal tool."',
          'OK: "Claude\'s Discretion" — Claude picks a sensible default and documents it.',
          'BAD: "Whatever looks good" — too vague, leads to rework.',
        ],
      },
      {
        id: 'dp-5',
        title: 'CONTEXT.md Is Created',
        description:
          'Claude saves all decisions to .planning/phases/XX-name/CONTEXT.md. This file feeds directly into the planner — it knows exactly what you decided.',
        example:
          '# Phase 2: Clinician Dashboard — Context\n\n' +
          '## Decisions\n\n' +
          '### D1: Dashboard Navigation — Sidebar Layout\n' +
          'Sidebar with persistent sections: Caseload, Activities, Session Logs.\n' +
          'Rationale: clinicians are power users; persistent nav > tabs.\n\n' +
          '### D2: Child Profile Fields — Spec-Defined\n' +
          '- Name (required)\n' +
          '- DOB or age (required)\n' +
          '- Target sound(s) (required, text array)\n' +
          '- Primary impediment type (required, enum)\n' +
          "- Organisation auto-set from clinician's org",
        exampleTitle: 'Example: CONTEXT.md (from shai project)',
      },
      {
        id: 'dp-6',
        title: 'Clear Context Window',
        description:
          'Discussion fills up context. Clear it before planning so Claude has room for the planner agent.',
        commands: ['/clear'],
        warning:
          'Always /clear between discuss and plan. This is critical — a full context window produces worse plans.',
      },
    ],
    checklist: {
      title: 'After Discussing',
      items: [
        'All gray areas have a decision (no "TBD")',
        'CONTEXT.md exists in the phase directory',
        'Context cleared with /clear before moving to plan',
      ],
    },
  },

  {
    slug: 'plan-phase',
    title: 'Planning a Phase',
    subtitle: 'The planner agent creates detailed plans, the checker agent verifies them',
    category: 'lifecycle',
    projectType: 'workflow',
    steps: [
      {
        id: 'pp-1',
        title: 'Run Plan Phase',
        commands: ['/qualia:plan-phase 1'],
      },
      {
        id: 'pp-2',
        title: 'The Planner Agent Activates',
        description:
          'A specialized planner agent (with a 43KB system prompt) reads your ROADMAP.md, CONTEXT.md, and scans the existing codebase. It creates a detailed plan organized into waves — groups of tasks that can run in parallel.',
        tips: [
          'The planner knows about your tech stack, Qualia conventions, and skill files.',
          'It references specific skills (like @supabase, @frontend-master) so the executor knows HOW to build.',
          'Each task has: files to modify, what to do, acceptance criteria.',
        ],
      },
      {
        id: 'pp-3',
        title: 'The Plan Checker Verifies',
        description:
          "After the planner finishes, a checker agent reviews the plan against 9 quality dimensions. If the plan has issues, it's sent back for revision (up to 3 times).",
        tips: [
          'Dimension 1: Completeness — Does it cover all roadmap goals?',
          'Dimension 2: Specificity — No vague instructions like "implement as needed"?',
          'Dimension 3: Acceptance criteria — Every task has clear pass/fail criteria?',
          'Dimension 4: Skill references — Does it tell the executor which patterns to follow?',
          'Dimension 5: Wave structure — Are parallel tasks correctly grouped?',
          '14 placeholder patterns are auto-rejected: "TBD", "as appropriate", "etc.", "various", and 10 more.',
        ],
      },
      {
        id: 'pp-4',
        title: 'PLAN.md Is Created',
        description:
          'The final plan is saved to .planning/phases/XX-name/PLAN.md (or XX-01-PLAN.md if multiple plans per phase).',
        example:
          '# Phase 26 Plan — Visual Polish & Responsive Hardening\n\n' +
          '## Goal\n' +
          'Polish all pages for visual consistency, normalize policy pages.\n\n' +
          '## Wave 1: Policy Pages + Loading Skeletons\n' +
          '*Independent tasks — can run in parallel*\n\n' +
          '### Task 1.1: Policy pages — Standardize spacing\n' +
          '**Files:** shipping-policy, refund-policy, privacy-policy\n' +
          'Replace raw padding with `vero-section` + `vero-section-container`.\n\n' +
          '### Task 1.2: Loading skeletons — Brand colors\n' +
          '**Files:** All 23 loading.tsx files\n' +
          'Replace: `bg-gray-200` → `bg-[var(--vero-bg-tertiary)]`\n\n' +
          '## Wave 2: Final Polish (depends on Wave 1)\n' +
          '### Task 2.1: Build verification\n' +
          'Run `bun build` to verify everything compiles.',
        exampleTitle: 'Example: PLAN.md (from vero project)',
      },
      {
        id: 'pp-5',
        title: 'Clear Context Window',
        commands: ['/clear'],
        warning:
          'Always /clear between plan and execute. The planner and executor are separate agents with different jobs.',
      },
    ],
    checklist: {
      title: 'After Planning',
      items: [
        'PLAN.md exists with clear waves and tasks',
        'No vague instructions or placeholders',
        'Every task has acceptance criteria',
        'Context cleared with /clear before executing',
      ],
    },
  },

  {
    slug: 'execute-phase',
    title: 'Executing a Phase',
    subtitle: 'The executor agent builds the code, wave by wave, with git commits',
    category: 'lifecycle',
    projectType: 'workflow',
    steps: [
      {
        id: 'ep-1',
        title: 'Run Execute Phase',
        commands: ['/qualia:execute-phase 1'],
        isMilestone: true,
      },
      {
        id: 'ep-2',
        title: 'The Executor Agent Builds',
        description:
          'A specialized executor agent reads the PLAN.md and builds the code task by task. Parallel tasks within a wave run simultaneously via subagents. Each completed task is committed to git with a descriptive message.',
        tips: [
          "You'll see real-time progress as files are created and modified.",
          'Each plan execution produces a SUMMARY.md documenting what was built.',
          'If something fails, the executor retries up to 3 times before flagging it.',
        ],
      },
      {
        id: 'ep-3',
        title: 'Scope Lock (v2.0)',
        description:
          'The executor can only modify files specified in the plan. If it discovers something that needs fixing outside the plan, it logs it as a "Deferred Discovery" instead of silently fixing it. This prevents scope creep.',
        tips: [
          'Deferred discoveries appear in the SUMMARY.md.',
          'They become candidates for quick tasks or future phases.',
          'This is a v2.0 feature — it prevents the executor from going rogue.',
        ],
      },
      {
        id: 'ep-4',
        title: 'Evidence Requirements (v2.0)',
        description:
          'Each task must provide evidence of completion. The level depends on task criticality.',
        tips: [
          'Trivial tasks (copy changes, config): evidence = file content exists.',
          'Standard tasks (new features, bug fixes): evidence = command output (tsc passes, tests pass).',
          'Critical tasks (auth, payments, security): evidence = full proof (test results, curl output, screenshot).',
        ],
      },
      {
        id: 'ep-5',
        title: 'SUMMARY.md Is Created',
        description:
          'After execution, a SUMMARY.md documents what was built, what decisions were made, and any deferred discoveries.',
        example:
          '# Phase 1 Summary: Database & Security Migrations\n\n' +
          '## Completed\n' +
          '- Created `categories` table with 6 default entries\n' +
          '- Added `category_id` FK to `conversations` table\n' +
          '- GET /api/categories endpoint working\n' +
          '- RLS policies on categories table\n\n' +
          '## Decisions Made\n' +
          '- Used nullable FK (existing convos get null category)\n' +
          '- Added index on conversations.category_id\n\n' +
          '## Deferred Discoveries\n' +
          '- Sidebar filter needs category support (Phase 3)\n\n' +
          '## Evidence\n' +
          '- `npx tsc --noEmit` — 0 errors\n' +
          '- GET /api/categories — returns 6 items',
        exampleTitle: 'Example: SUMMARY.md',
      },
      {
        id: 'ep-6',
        title: 'Clear Context Window',
        commands: ['/clear'],
      },
    ],
    checklist: {
      title: 'After Executing',
      items: [
        'All tasks in the plan are complete',
        'SUMMARY.md exists with evidence',
        'Git commits exist for each task',
        'STATE.md updated with new position',
        'Context cleared before verifying',
      ],
    },
  },

  {
    slug: 'verify-work',
    title: 'Verifying Your Work',
    subtitle: 'Automated checks + manual UAT to confirm the phase goal was actually met',
    category: 'lifecycle',
    projectType: 'workflow',
    steps: [
      {
        id: 'vw-1',
        title: 'Run Verify Work',
        commands: ['/qualia:verify-work 1'],
      },
      {
        id: 'vw-2',
        title: 'Automated Checks Run First',
        description:
          'Claude runs: npx tsc --noEmit (TypeScript), npm run lint (ESLint), npm run build (build check). If any fail, Claude reports the errors and helps you fix them before manual testing.',
      },
      {
        id: 'vw-3',
        title: 'Manual UAT Walkthrough',
        description:
          'Claude walks you through manual tests one at a time. For each test, it tells you what SHOULD happen. You report what ACTUALLY happens.',
        tips: [
          'Open your app in the browser first: npm run dev',
          'For each test, Claude describes expected behavior.',
          'Type "pass" if it works as described.',
          'If something\'s wrong, describe the issue: "The button is there but clicking it does nothing"',
          "Claude infers severity from your description — you don't need to rate things.",
        ],
      },
      {
        id: 'vw-4',
        title: 'Issues Found → Fix Cycle',
        description:
          'If issues are found, Claude diagnoses root causes and creates fix plans. It may fix them immediately or defer to a quick task depending on complexity.',
      },
      {
        id: 'vw-5',
        title: 'Phase Verified',
        description:
          "When all tests pass, the phase is marked complete in STATE.md. You're ready for the next phase or for shipping.",
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Verification Checklist',
      items: [
        'TypeScript compiles with zero errors',
        'ESLint passes',
        'Build succeeds',
        'All manual UAT tests passed',
        'STATE.md shows phase as COMPLETE',
      ],
    },
  },

  {
    slug: 'ship-project',
    title: 'Shipping to Production',
    subtitle: 'Quality gates, code review, deploy, post-deploy verification, and canary monitoring',
    category: 'lifecycle',
    projectType: 'workflow',
    steps: [
      {
        id: 'sp-1',
        title: 'Option A: Ship During Milestone Completion',
        description:
          "If you've completed all phases, run complete-milestone. This handles everything: quality checks, deploy, git tag, archive.",
        commands: ['/qualia:complete-milestone'],
      },
      {
        id: 'sp-2',
        title: 'Option B: Ship Directly',
        description:
          'For quick deploys outside the milestone workflow, use /ship. It auto-detects your project type and runs appropriate checks.',
        commands: ['/ship'],
      },
      {
        id: 'sp-3',
        title: 'Step 1: Quality Gates',
        description: 'Run in sequence — stops on first failure.',
        commands: [
          'npx tsc --noEmit      # TypeScript check',
          'npx eslint . --max-warnings 0  # Lint check',
          'npm run build          # Build check',
        ],
      },
      {
        id: 'sp-4',
        title: 'Step 2: Review Gate (v2.0)',
        description:
          "Deploy is BLOCKED if .planning/REVIEW.md doesn't exist or is stale. Run /review first to generate it.",
        commands: ['/review'],
        warning:
          'This is a v2.0 enforcement. You cannot bypass it. The pre-deploy-gate.sh hook checks REVIEW.md freshness.',
      },
      {
        id: 'sp-5',
        title: 'Step 3: Deploy',
        description: 'Claude pushes to GitHub and deploys to your hosting platform.',
        commands: [
          'git push origin main',
          'vercel --prod              # Standard Vercel deploy',
          'wrangler deploy            # Cloudflare Workers (armenius only)',
        ],
      },
      {
        id: 'sp-6',
        title: 'Step 4: Post-Deploy Verification',
        description: 'Claude verifies the live site immediately after deploy.',
        tips: [
          'HTTP 200 — Homepage loads successfully',
          'Auth flow — Login/signup works on the live site',
          'No console errors — No JS errors in browser console',
          'API latency — Key endpoints respond under 500ms',
          'UptimeRobot — Monitor is green at stats.uptimerobot.com/bKudHy1pLs',
        ],
        isMilestone: true,
      },
      {
        id: 'sp-7',
        title: 'Step 5: Canary Monitoring (v2.0)',
        description:
          'At T+2 minutes after deploy, Claude checks again: HTTP status, console errors, and load time compared to baseline. This catches issues that only appear under real traffic.',
      },
      {
        id: 'sp-8',
        title: 'Rollback Plan',
        description: 'If something goes wrong in production:',
        commands: [
          'vercel ls                                    # List deployments',
          'vercel promote [previous-deployment-url] --yes  # Instant rollback',
        ],
        tips: [
          'This restores the previous version instantly.',
          'Then investigate the root cause calmly.',
          'Git: the previous tag marks the last known-good state.',
        ],
      },
    ],
    checklist: {
      title: 'Ship Checklist',
      items: [
        'TypeScript, ESLint, build all pass',
        'Code review done (REVIEW.md exists and is fresh)',
        'Deployed to production',
        'HTTP 200 on live site',
        'No console errors on live site',
        'API latency under 500ms',
        'UptimeRobot monitor is green',
      ],
    },
  },

  // =====================================================================
  // OPERATIONS — Daily work outside the full lifecycle
  // =====================================================================

  {
    slug: 'quick-tasks',
    title: 'Quick Tasks & Hotfixes',
    subtitle: 'Small changes with Qualia quality guarantees but minimal overhead',
    category: 'operations',
    projectType: 'workflow',
    steps: [
      {
        id: 'qt-1',
        title: 'When to Use Quick Tasks',
        description:
          "Use /qualia-quick for small changes that don't warrant the full discuss → plan → execute cycle. Examples: bug fixes, copy changes, config updates, adding a single component.",
      },
      {
        id: 'qt-2',
        title: 'Standard Quick Task',
        commands: ['/qualia-quick "Add loading spinner to dashboard"'],
        tips: [
          'Claude reads STATE.md, assesses complexity, and either proceeds directly or asks for confirmation.',
          'Multi-file changes get a confirmation: "About to modify X files: [list]. Proceed?"',
          'Single-file changes proceed without asking.',
        ],
      },
      {
        id: 'qt-3',
        title: 'No-Plan Mode',
        description: 'For trivial changes where planning is overhead.',
        commands: ['/qualia-quick --no-plan "Update footer copyright year"'],
      },
      {
        id: 'qt-4',
        title: 'Bug Fix Mode',
        description:
          "Implies --no-plan and enforces minimal-change discipline: locate → root cause → fix → verify. Claude only touches what's broken.",
        commands: ['/qualia-quick --fix "Login button not responding on mobile"'],
        tips: [
          "Fix mode follows a strict pattern: 1) Locate the exact source, 2) Understand why it's happening, 3) Make the minimal fix, 4) Verify it works.",
          'Claude won\'t "improve" surrounding code during a fix — only the bug gets touched.',
        ],
      },
      {
        id: 'qt-5',
        title: 'Quick Tasks Are Tracked',
        description:
          "Quick tasks are logged in .planning/quick/ and STATE.md. They're separate from planned phases but still part of the project history.",
      },
    ],
    checklist: {
      title: 'Quick Task Modes',
      items: [
        'Standard: /qualia-quick "description" (with lightweight planning)',
        'No-plan: /qualia-quick --no-plan "description" (skip planning)',
        'Bug fix: /qualia-quick --fix "description" (minimal-change discipline)',
      ],
    },
  },

  {
    slug: 'resume-work',
    title: 'Resuming Between Sessions',
    subtitle: 'How to pick up exactly where you left off, every time',
    category: 'operations',
    projectType: 'workflow',
    steps: [
      {
        id: 'rw-1',
        title: 'Before You Stop: Pause Work',
        description:
          'Before ending a session, save your context so the next session starts instantly.',
        commands: ['/qualia:pause-work'],
        tips: [
          "Claude writes a .continue-here.md file with: what you were doing, what's done, what's remaining, key decisions, and the exact next action.",
          'This is optional but saves 2-3 minutes of "where was I?" next time.',
        ],
      },
      {
        id: 'rw-2',
        title: 'Starting a New Session',
        commands: ['cd ~/Projects/my-project', 'claude', '/qualia-start'],
      },
      {
        id: 'rw-3',
        title: 'Resume Work',
        description:
          'Claude reads STATE.md and any .continue-here.md file. It shows you: project name, current phase, progress, and the next action to take.',
        commands: ['/qualia:resume-work'],
        example:
          '📂 Project: giulio-agent\n' +
          '📍 Phase 4 of 4 — Test Infrastructure\n' +
          '📊 Progress: [########--] 80%\n' +
          '⏸️  Stopped at: Task 3 of 5 (unit tests for chat route)\n\n' +
          '💡 Resume file found: .continue-here.md\n' +
          '   Next action: Write integration test for /api/chat streaming\n\n' +
          'Ready to continue?',
        exampleTitle: 'Example: Resume Output',
      },
      {
        id: 'rw-4',
        title: 'Cross-Session Context',
        description:
          "The session digest (~/.claude/knowledge/session-digest.md) tracks your last 20 sessions across ALL projects. Claude uses this to understand what you've been working on recently, even across different projects.",
      },
    ],
    checklist: {
      title: 'Session Handoff',
      items: [
        'Run /qualia:pause-work before stopping (optional but helpful)',
        'Run /qualia:resume-work when starting a new session',
        'STATE.md is the source of truth for project state',
        '.continue-here.md has the exact next action',
      ],
    },
  },

  {
    slug: 'design-polish',
    title: 'Design Skills Workflow',
    subtitle: 'The recommended order for going from functional to polished',
    category: 'operations',
    projectType: 'workflow',
    steps: [
      {
        id: 'ds-1',
        title: 'The Recommended Flow',
        description: 'After a feature is built, run these in order to make it production-quality.',
        commands: [
          '/critique   — Design director review (find issues first)',
          '/polish     — Fix spacing, alignment, consistency details',
          '/harden     — Edge cases, overflow, i18n, error states',
        ],
      },
      {
        id: 'ds-2',
        title: '/critique — Find Issues First',
        description:
          'Evaluates the design across: visual hierarchy, information architecture, emotional resonance, accessibility. Returns specific, actionable findings ranked by impact.',
        tips: [
          "If .planning/DESIGN.md exists, critique evaluates against your project's design decisions — not just generic principles.",
          "Run this BEFORE polish — it finds the big problems that polish won't catch.",
        ],
      },
      {
        id: 'ds-3',
        title: '/polish — Fix the Details',
        description:
          'Final quality pass: fixes alignment, spacing, consistency, and the small details that separate good from great. This is the last step before shipping.',
      },
      {
        id: 'ds-4',
        title: '/harden — Make It Robust',
        description:
          'Improves resilience: better error handling, text overflow protection, i18n support, edge case management. Makes interfaces production-ready.',
      },
      {
        id: 'ds-5',
        title: 'Other Design Skills',
        description: 'Use these when you have a specific need.',
        tips: [
          '/bolder — Amplify safe/boring designs to be more visually striking.',
          '/quieter — Tone down overly aggressive or busy designs.',
          '/animate — Add purposeful micro-interactions and motion effects.',
          '/colorize — Inject strategic color into monochromatic interfaces.',
          '/responsive — Fix layout for all screen sizes (mobile, tablet, desktop, ultrawide).',
          '/distill — Strip unnecessary complexity from over-designed components.',
          '/onboard — Improve first-time user experience flows and empty states.',
          '/delight — Add moments of joy and personality that make the interface memorable.',
          '/clarify — Fix unclear labels, error messages, and UX copy.',
        ],
      },
    ],
    checklist: {
      title: 'Design Workflow',
      items: [
        'Build feature first, then design-polish',
        '/critique → /polish → /harden is the standard flow',
        'Use /responsive for mobile issues specifically',
        'Use /bolder or /quieter for overall design energy adjustments',
      ],
    },
  },

  {
    slug: 'debugging',
    title: 'Debugging Issues',
    subtitle: 'Systematic approach: hypothesis → test → confirm → fix',
    category: 'operations',
    projectType: 'workflow',
    steps: [
      {
        id: 'db-1',
        title: 'Using the Debug Skill',
        description:
          'For non-trivial bugs, use the structured debug workflow. Claude follows a scientific method: gather symptoms → hypothesize → test → confirm → fix.',
        commands: ['/debug "Login button does nothing when clicked"'],
      },
      {
        id: 'db-2',
        title: 'Frontend Visual Issues',
        description: 'For CSS, layout, and visual bugs specifically.',
        commands: ['/debug --frontend "Header overlaps content on mobile"'],
      },
      {
        id: 'db-3',
        title: 'Performance Issues',
        description: 'For slow pages, memory leaks, and performance problems.',
        commands: ['/debug --perf "Dashboard takes 5 seconds to load"'],
      },
      {
        id: 'db-4',
        title: 'Quick Fix Alternative',
        description:
          "For obvious bugs where you know what's wrong, use the quick fix mode instead. It enforces minimal-change discipline.",
        commands: ['/qualia-quick --fix "Contact form returns 500 on submit"'],
      },
      {
        id: 'db-5',
        title: 'How Claude Debugs',
        description: 'The debugger agent (36KB system prompt) uses a structured approach.',
        tips: [
          '1. GATHER — Read the error message, check logs, reproduce the issue.',
          "2. HYPOTHESIZE — Form a theory about what's causing it.",
          '3. TEST — Verify the hypothesis with targeted checks (grep for the pattern, read the file, run a command).',
          '4. CONFIRM — If the hypothesis is wrong, form a new one. If right, move to fix.',
          '5. FIX — Make the minimal change that resolves the root cause.',
          "6. VERIFY — Confirm the fix works and didn't break anything else.",
        ],
      },
    ],
    checklist: {
      title: 'Debugging Checklist',
      items: [
        'Read the error message first (it usually tells you the cause)',
        'Reproduce the issue before trying to fix it',
        'Root cause, not symptoms — fix the underlying problem',
        "Verify the fix didn't break anything else",
        'Escalate to Fawzi after 30 minutes if stuck',
      ],
    },
  },

  // =====================================================================
  // REFERENCE — Tools, infrastructure, troubleshooting
  // =====================================================================

  {
    slug: 'all-commands',
    title: 'Complete Command Reference',
    subtitle: 'Every command grouped by purpose',
    category: 'reference',
    projectType: 'workflow',
    steps: [
      {
        id: 'ac-1',
        title: 'Build Lifecycle',
        commands: [
          '/qualia:new-project — Start a brand new project from scratch',
          '/qualia:new-milestone — Start a new milestone on existing project',
          '/qualia:discuss-phase N — Discuss gray areas before planning',
          '/qualia:plan-phase N — Create detailed implementation plan',
          '/qualia:execute-phase N — Build the code from the plan',
          '/qualia:verify-work N — Test and verify the phase',
          '/qualia:complete-milestone — Deploy, tag, and archive',
        ],
      },
      {
        id: 'ac-2',
        title: 'Session Management',
        commands: [
          '/qualia-start — Activate Qualia mode for the session',
          '/qualia-status — Check current project state',
          '/qualia:resume-work — Pick up where you left off',
          '/qualia:pause-work — Save context before stopping',
          '/qualia-help — Show all available commands',
          '/clear — Wipe context window (use between steps)',
          '/compact — Compress conversation to save space',
        ],
      },
      {
        id: 'ac-3',
        title: 'Quick Actions',
        commands: [
          '/qualia-quick "task" — Quick task with tracking',
          '/qualia-quick --fix "bug" — Bug fix with minimal-change discipline',
          '/qualia-quick --no-plan "change" — Trivial change, skip planning',
          '/qualia:add-todo "idea" — Capture idea for later',
          '/qualia:check-todos — Review captured ideas',
        ],
      },
      {
        id: 'ac-4',
        title: 'Quality & Deploy',
        commands: [
          '/ship — Full deploy pipeline (auto-detects project type)',
          '/deploy — Deploy to Vercel',
          '/deploy-verify — Post-deploy verification (8 checks)',
          '/review — Code review + security audit (writes REVIEW.md)',
          '/test-runner — Run tests and generate coverage',
          '/qa — Browser QA with Playwright (screenshots, console errors)',
        ],
      },
      {
        id: 'ac-5',
        title: 'Design Skills',
        commands: [
          '/critique — Design director review (run first)',
          '/polish — Spacing, alignment, consistency (run second)',
          '/harden — Edge cases, overflow, i18n (run third)',
          '/bolder — Make boring designs more striking',
          '/quieter — Tone down aggressive designs',
          '/animate — Add purposeful micro-interactions',
          '/colorize — Add strategic color to monochrome UIs',
          '/responsive — Fix mobile/tablet/desktop layouts',
          '/distill — Strip unnecessary complexity',
          '/delight — Add memorable personality touches',
          '/onboard — Improve first-time user experience',
          '/clarify — Fix unclear labels and UX copy',
          '/normalize — Align with project design system',
        ],
      },
      {
        id: 'ac-6',
        title: 'Specialist Skills',
        commands: [
          '/frontend-master — Build distinctive UI components',
          '/supabase — Database operations (tables, RLS, migrations, queries)',
          '/voice-agent — Build/modify voice agents (VAPI, Retell, ElevenLabs)',
          '/debug — Systematic debugging (--frontend for CSS, --perf for speed)',
          '/seo-master — SEO audit and optimization',
          '/stack-researcher — Research latest best practices for any tech',
        ],
      },
      {
        id: 'ac-7',
        title: 'Meta & Analysis',
        commands: [
          '/retro — Shipping velocity and trend reports',
          '/status — Fleet-wide health check for all projects',
          '/learn — Save a lesson from a mistake',
          '/memory — View/manage persistent rules and knowledge',
        ],
      },
    ],
    checklist: {
      title: "Commands You'll Use Daily",
      items: [
        '/qualia-start → activate at session start',
        '/clear → between major steps',
        '/qualia-quick → for small changes',
        '/ship → to deploy',
        '/debug → when things break',
      ],
    },
  },

  {
    slug: 'infrastructure-guide',
    title: 'Vercel, Supabase, Git & Env Vars',
    subtitle: 'How our infrastructure works — deploy, database, version control, secrets',
    category: 'reference',
    projectType: 'workflow',
    steps: [
      {
        id: 'ig-1',
        title: 'Vercel — How We Deploy',
        description:
          'Vercel hosts our websites and apps. Push code to GitHub → Vercel auto-deploys.',
        commands: [
          'vercel --prod                  # Manual production deploy',
          'vercel ls                       # List recent deployments',
          'vercel promote [url] --yes      # Rollback to previous version',
          'npx vercel env pull .env.local  # Pull env vars locally',
        ],
        tips: [
          'Every push creates a preview deployment (test before merging).',
          'Custom domains: Vercel → Project → Settings → Domains. A record → 76.76.21.21, CNAME www → cname.vercel-dns.com.',
          'Environment variables: Vercel → Project → Settings → Environment Variables. MUST redeploy after changing.',
        ],
      },
      {
        id: 'ig-2',
        title: 'Supabase — Our Database',
        description:
          'PostgreSQL database + auth + file storage + edge functions. Every project gets its own Supabase instance.',
        tips: [
          'API keys: Dashboard → Settings → API. Two keys: anon (safe for frontend) and service_role (NEVER in frontend).',
          'Auth redirect URLs: Authentication → URL Configuration. Add BOTH production/** and localhost:3000/**. The #1 thing trainees forget.',
          'RLS: Row Level Security must be enabled on EVERY table. Without it, anyone can read any row.',
          'Paused projects: Free tier pauses after 7 days of no activity. Check Dashboard → Restore if data stops loading.',
          'Logs: Database → Logs shows all queries and errors. Check here when things break.',
        ],
        warning:
          "The service_role key bypasses all security. If it's in client code, anyone can read/write/delete all data.",
      },
      {
        id: 'ig-3',
        title: 'Git — Branches and Commits',
        description: 'Never commit directly to main. Always use feature branches.',
        commands: [
          'git checkout main && git pull      # Start from latest',
          'git checkout -b feat/my-feature    # Create branch',
          'git add [files] && git commit -m "feat: add form"  # Commit',
          'git push -u origin feat/my-feature # Push',
          'gh pr create --title "feat: add form"  # Create PR',
        ],
        tips: [
          'Branch names: feat/xyz for features, fix/xyz for bugs.',
          'Commit prefixes: feat: fix: style: docs: refactor: perf:',
          'Pushing to main breaks the live site (Vercel auto-deploys from main).',
          'branch-guard.sh hook blocks direct pushes to main.',
        ],
        warning: 'Pushing broken code to main = live site breaks immediately. Always use a branch.',
      },
      {
        id: 'ig-4',
        title: 'Environment Variables',
        description:
          'Secrets live in .env files locally and in Vercel for production. Never hardcode keys in code.',
        tips: [
          'NEXT_PUBLIC_ prefix = visible in browser. Everything else = server-only.',
          'NEXT_PUBLIC_SUPABASE_URL — OK (just a URL)',
          'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — OK (read-only key)',
          'SUPABASE_SERVICE_ROLE_KEY — NEVER public (full DB access)',
          'OPENAI_API_KEY / ANTHROPIC_API_KEY — NEVER public (costs money)',
          'After changing Vercel env vars, you MUST redeploy.',
          '.env.local is gitignored — stays on your machine only.',
        ],
      },
    ],
    checklist: {
      title: 'Infrastructure Quick Ref',
      items: [
        'Deploy: vercel --prod (or just push to main)',
        'Rollback: vercel promote [previous-url] --yes',
        'Supabase keys: Settings → API (never expose service_role)',
        'Auth URLs: Authentication → URL Configuration (add both prod + localhost)',
        'Git: always feature branches, never direct to main',
        'Env vars: .env.local locally, Vercel dashboard for production',
      ],
    },
  },

  {
    slug: 'troubleshooting',
    title: 'When Things Break',
    subtitle: 'Systematic approach to common problems',
    category: 'reference',
    projectType: 'workflow',
    steps: [
      {
        id: 'ts-1',
        title: 'White Screen / "Application Error"',
        description: 'Usually a build error or missing env var.',
        tips: [
          'Run "npm run build" locally — does it pass?',
          'Check Vercel → Deployments → build logs for errors.',
          'Check Vercel → Settings → Environment Variables — all vars present?',
          'Common: a file was deleted but still imported somewhere.',
        ],
      },
      {
        id: 'ts-2',
        title: "Login / Auth Doesn't Work",
        tips: [
          'Supabase → Authentication → URL Configuration.',
          'Site URL must be your production URL (not localhost).',
          'Redirect URLs must include both production/** and localhost:3000/**.',
          'Test in an incognito window after changing these.',
        ],
      },
      {
        id: 'ts-3',
        title: "Data Doesn't Load",
        tips: [
          'Is the Supabase project paused? (free tier pauses after 7 days)',
          'Are env vars correct? (check project ref matches)',
          'Is the table actually empty? Check Table Editor.',
          'Is RLS blocking? RLS silently returns empty — not an error.',
        ],
      },
      {
        id: 'ts-4',
        title: '500 Server Error',
        tips: [
          'Check Vercel function logs: "vercel logs".',
          'Run locally: "npm run dev" and reproduce the error.',
          'Read the terminal — the error message tells you the cause.',
          'Common: missing env var, changed DB column, expired API key.',
        ],
      },
      {
        id: 'ts-5',
        title: 'Site Looks Broken (CSS)',
        tips: [
          'Hard refresh: Ctrl+Shift+R.',
          "Check if it's only the custom domain (open vercel URL directly).",
          'Redeploy: "vercel --prod".',
          'For mobile issues: /responsive.',
        ],
      },
      {
        id: 'ts-6',
        title: 'Emergency Rollback',
        commands: ['vercel ls', 'vercel promote [previous-working-url] --yes'],
        tips: [
          'Restores the old version instantly.',
          'Then investigate root cause calmly.',
          'Always tell Fawzi when you do an emergency rollback.',
        ],
      },
      {
        id: 'ts-7',
        title: 'When to Escalate',
        description: "Don't spend more than 30 minutes stuck.",
        tips: [
          "Tell Fawzi: 1) What's broken (specific error), 2) What you tried, 3) Screenshots.",
          'A clear bug report saves everyone time.',
        ],
      },
    ],
    checklist: {
      title: 'Troubleshooting Flow',
      items: [
        'Identify the symptom (white screen? no data? 500?)',
        'Check obvious things (env vars, build, Supabase status)',
        'Read error messages — they usually tell you the cause',
        "Don't guess — investigate systematically",
        'Know how to rollback in emergencies',
        'Escalate after 30 minutes',
      ],
    },
  },

  // =====================================================================
  // CHECKLISTS — Shipping checklists per project type
  // =====================================================================

  {
    slug: 'checklist-website',
    title: 'Website Shipping Checklist',
    subtitle: 'Everything to verify before shipping a website to production',
    category: 'checklist',
    projectType: 'website',
    steps: [
      {
        id: 'cw-1',
        title: 'Homepage',
        tips: [
          'Hero: clear headline, CTA button, works on mobile.',
          'Navigation: all links work, mobile hamburger opens/closes, active page highlighted.',
          'Content sections: real content (no Lorem Ipsum), images load with alt text.',
          'Footer: contact info, social links open in new tab, current year.',
        ],
      },
      {
        id: 'cw-2',
        title: 'All Pages',
        tips: [
          'Every page has unique <title> and meta description.',
          'No broken links (click every link on every page).',
          'No dead-end pages (always a way back to homepage).',
          '404 page exists and looks good.',
        ],
      },
      {
        id: 'cw-3',
        title: 'Forms',
        tips: [
          'Submit empty — shows validation errors.',
          'Enter invalid email — rejects.',
          'Enter valid data — submits, shows success message.',
          "Button shows loading state, can't double-submit.",
          'Data arrives in Supabase Table Editor.',
        ],
      },
      {
        id: 'cw-4',
        title: 'SEO',
        tips: [
          'og:title, og:description, og:image on every page.',
          'robots.txt exists (/robots.txt).',
          'sitemap.xml exists (/sitemap.xml).',
          'One H1 per page, heading hierarchy (H1 > H2 > H3).',
          'All images have alt text.',
          'Favicon exists.',
        ],
        commands: ['curl -s https://yoursite.com | grep -i "og:" — check OG tags'],
      },
      {
        id: 'cw-5',
        title: 'Responsive',
        tips: [
          'Mobile (375px): all text readable, no horizontal scroll, buttons tappable (44px min).',
          'Tablet (768px): layout adjusts appropriately.',
          "Desktop (1280px): content doesn't stretch too wide.",
          'Navigation switches between mobile/desktop at the right breakpoint.',
        ],
      },
      {
        id: 'cw-6',
        title: 'Visual Quality',
        tips: [
          'Distinctive fonts loaded (NOT Inter, Arial, or system default).',
          'Brand colors consistent everywhere.',
          'Hover effects on buttons and links.',
          'Animations smooth (no jank).',
          'Images crisp (not blurry).',
        ],
      },
      {
        id: 'cw-7',
        title: 'Security & Code',
        commands: [
          'npx tsc --noEmit — zero TypeScript errors',
          'npm run lint — zero ESLint warnings',
          'npm run build — builds successfully',
          'git log --all -- "*.env*" — should return nothing',
          'grep -r "service_role" app/ components/ — should return nothing',
        ],
        tips: [
          'No API keys hardcoded. No .env in git. No eval() or dangerouslySetInnerHTML.',
          'No console.log in production. No TODO/FIXME left unresolved.',
        ],
      },
      {
        id: 'cw-8',
        title: 'Deploy & Verify',
        commands: [
          'vercel --prod — deploy',
          'curl -s -o /dev/null -w "%{http_code}" https://yoursite.com — HTTP 200',
        ],
        tips: [
          'All env vars set in Vercel.',
          'Auth flow works on live site.',
          'No console errors on live site.',
          'Added to UptimeRobot monitoring.',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Website Ready?',
      items: [
        'All pages have real content, working links, unique meta tags',
        'All forms validate and submit correctly',
        'Mobile responsive at 375px, 768px, 1280px',
        'SEO: OG tags, robots.txt, sitemap.xml, alt text',
        'Code: tsc passes, lint passes, build passes',
        'Security: no secrets in code, RLS on all tables',
        'Deploy: HTTP 200, no console errors, UptimeRobot green',
      ],
    },
  },

  {
    slug: 'checklist-agent',
    title: 'AI & Voice Agent Shipping Checklist',
    subtitle: 'Safety, streaming, token limits, webhook verification, latency',
    category: 'checklist',
    projectType: 'ai-agent',
    steps: [
      {
        id: 'ca-1',
        title: 'Chat / Conversation Works',
        tips: [
          'Send a message, get a response.',
          'Streaming displays smoothly (if applicable).',
          'Messages persist after refresh.',
          'Works on mobile.',
        ],
      },
      {
        id: 'ca-2',
        title: 'AI Safety',
        tips: [
          'Agent stays on topic — redirects off-topic questions politely.',
          'Agent refuses to reveal system prompt.',
          'Agent refuses prompt injection attempts ("ignore your instructions...").',
          'System prompt is NOT in client-side code (check browser DevTools > Sources).',
          'AI output is sanitized — no raw HTML rendered from AI.',
        ],
        commands: ['grep -r "dangerouslySetInnerHTML" app/ components/ — should return nothing'],
        warning: 'An exposed system prompt lets attackers manipulate your agent.',
      },
      {
        id: 'ca-3',
        title: 'Cost & Rate Controls',
        tips: [
          'maxTokens set on every AI API call.',
          'Rate limiting per user (e.g., 20 messages/minute).',
          'Conversation context has a size limit.',
          'Token usage logged for monitoring.',
          'Billing alerts set on AI provider dashboard.',
        ],
      },
      {
        id: 'ca-4',
        title: 'Error Handling',
        tips: [
          'AI provider timeout → "Please try again" (not white screen).',
          'Rate limit hit → clear message ("Too many messages, wait a moment").',
          'Network error → retry option shown.',
          'Streaming disconnection → partial message displayed gracefully.',
        ],
      },
      {
        id: 'ca-5',
        title: 'Voice Agent Specifics',
        description: 'Additional checks for voice agents (VAPI, Retell, ElevenLabs).',
        tips: [
          'Test call from provider dashboard works.',
          'Real phone call works (if phone number configured).',
          'Responses are short (1-2 sentences max).',
          'No awkward silences during tool execution.',
          'Interruption handling works (talk over the agent).',
          'Webhook signature verification implemented (x-vapi-signature).',
          'Webhook response time under 300ms.',
          'First response latency under 500ms.',
        ],
        commands: ['curl -w "%{time_total}" https://your-webhook/api/vapi — under 0.3s'],
        warning: 'If latency is too high, users hang up. This is the #1 reason voice agents fail.',
      },
      {
        id: 'ca-6',
        title: 'Security & Deploy',
        tips: [
          'RLS enabled on every Supabase table.',
          'service_role key NOT in any client component.',
          'Auth checks on all server mutations.',
          'Webhook secrets set in production.',
          'Error monitoring active (Sentry).',
          'Post-deploy: test a real conversation on the live URL.',
        ],
        commands: ['grep -r "service_role" app/ components/ src/ — should return nothing'],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Agent Ready?',
      items: [
        'Chat works end-to-end (send → receive)',
        'System prompt not exposed to users',
        'maxTokens and rate limiting configured',
        'Error states handled gracefully',
        'Voice: webhook under 300ms, first response under 500ms',
        'RLS enabled, service_role not in client code',
        'Monitoring active, billing alerts set',
      ],
    },
  },

  {
    slug: 'checklist-universal',
    title: 'Universal Quality Checklist',
    subtitle: 'Applies to EVERY project — code, security, deploy, handoff',
    category: 'checklist',
    projectType: 'workflow',
    steps: [
      {
        id: 'cu-1',
        title: 'Code Quality',
        commands: [
          'npx tsc --noEmit — zero TypeScript errors',
          'npm run lint — zero ESLint warnings',
          'npm run build — completes successfully',
        ],
        tips: [
          'No console.log in production.',
          'No TODO or FIXME left unresolved.',
          'No commented-out code blocks.',
          'CLAUDE.md is complete and accurate.',
        ],
      },
      {
        id: 'cu-2',
        title: 'Security',
        commands: [
          'git log --all --full-history -- "*.env*" — should return nothing',
          'grep -r "service_role" app/ components/ src/ — should return nothing',
        ],
        tips: [
          'No API keys hardcoded.',
          'No .env files in git.',
          'No eval() or dangerouslySetInnerHTML.',
          'Server-side auth on all mutations.',
          'CORS not set to * in production.',
        ],
        warning:
          'If service_role key is in client code, fix immediately — anyone can bypass all security.',
      },
      {
        id: 'cu-3',
        title: 'Database',
        tips: [
          'RLS enabled on EVERY table — no exceptions.',
          'service_role key only in server-side code (lib/supabase/server.ts).',
          'TypeScript types generated from schema.',
          'Migrations committed to supabase/migrations/.',
        ],
      },
      {
        id: 'cu-4',
        title: 'Deploy & Verify',
        commands: [
          'git push origin main',
          'vercel --prod',
          'curl -s -o /dev/null -w "%{http_code}" https://yoursite.com — 200',
          'curl -w "%{time_total}" https://yoursite.com — under 3 seconds',
        ],
        tips: [
          'Auth flow works on live site.',
          'No console errors on live site.',
          'Added to UptimeRobot monitoring.',
        ],
        isMilestone: true,
      },
      {
        id: 'cu-5',
        title: 'Client Handoff',
        tips: [
          'Client walkthrough/demo completed.',
          'Client has access to necessary accounts (Vercel, Supabase, domain).',
          'Documentation provided.',
          'Project registered in Qualia ERP (portal.qualiasolutions.net).',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Universal Ship Checklist',
      items: [
        'tsc: zero errors',
        'ESLint: zero warnings',
        'Build: succeeds',
        'Security: no secrets in code or git',
        'Database: RLS on all tables',
        'Deploy: HTTP 200, no console errors',
        'Monitoring: UptimeRobot configured',
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
