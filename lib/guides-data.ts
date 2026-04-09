// Knowledge Base — Qualia Framework v2.8.1 Workflow Guides
// Rewritten 2026-04-09 against qualia-framework-v2 v2.8.1 (npm: qualia-framework-v2).
// Each guide teaches the REAL v2 workflow with copy-paste commands and real examples.

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
    slug: 'quick-start',
    title: 'Qualia Framework in 5 Minutes',
    subtitle: 'Install v2.8.1, learn the road, ship your first project',
    category: 'foundations',
    projectType: 'workflow',
    steps: [
      {
        id: 'qs-1',
        title: 'Install the Framework',
        description:
          'Run the v2 installer and enter your team code when prompted. Codes look like QS-NAME-NN — digit suffix, not year (e.g., QS-MOAYAD-03). The installer detects your role from the code and configures everything: skills, agents, hooks, rules, knowledge base, status line, settings.json. You only do this once per machine.',
        commands: ['npx qualia-framework-v2 install'],
        tips: [
          'Get your code from Fawzi. The valid codes are QS-FAWZI-01 (OWNER), QS-HASAN-02, QS-MOAYAD-03, QS-RAMA-04, QS-SALLY-05 (employees).',
          'The installer tolerates a letter O typo in the suffix — QS-FAWZI-O1 auto-resolves to QS-FAWZI-01. Canonical is digit zero.',
          'The installer wires up settings.json with status line, hooks, spinner, and permissions. You do not need to edit settings.json yourself.',
          'After install, restart Claude Code so the new settings.json is picked up.',
        ],
        example:
          '◆ Qualia Framework v2\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '  Enter install code: QS-MOAYAD-03\n\n' +
          '  ✓ Moayad (EMPLOYEE)\n\n' +
          '  Installing to /home/moayad/.claude\n\n' +
          '  Skills        ✓ 19 (qualia, qualia-new, qualia-plan, ...)\n' +
          '  Agents        ✓ 4  (planner, builder, verifier, qa-browser)\n' +
          '  Hooks         ✓ 8  (session-start, auto-update, branch-guard, ...)\n' +
          '  Rules         ✓ 4  (security, frontend, design-reference, deployment)\n' +
          '  CLAUDE.md     ✓ Configured as EMPLOYEE',
        exampleTitle: 'What you see during install',
      },
      {
        id: 'qs-2',
        title: 'What Got Installed',
        description:
          'Everything lives under ~/.claude/. You will rarely touch any of this directly — the skills do it for you — but it helps to know what is on disk.',
        example:
          '~/.claude/\n' +
          '├── CLAUDE.md             # Global instructions (role-configured for you)\n' +
          '├── skills/                # 19 slash commands (qualia, qualia-new, qualia-plan, ...)\n' +
          '├── agents/                # 4 subagents (planner, builder, verifier, qa-browser)\n' +
          '├── hooks/                 # 8 Node.js hooks (session-start, branch-guard, ...)\n' +
          '├── bin/                   # state.js, qualia-ui.js, statusline.js\n' +
          '├── knowledge/             # learned-patterns.md, common-fixes.md, client-prefs.md\n' +
          '├── rules/                 # security, frontend, design-reference, deployment\n' +
          '├── qualia-templates/      # tracking.json, state.md, project.md, plan.md, DESIGN.md\n' +
          '└── .qualia-config.json    # your code, role, version (read by branch-guard)',
        exampleTitle: '~/.claude/ after install',
      },
      {
        id: 'qs-3',
        title: 'Start a Session',
        description:
          'Open your terminal, cd into any project, and run claude. The session-start.js hook runs automatically and prints a branded panel showing the project state and the next command. You do not need to type /qualia-start (that command does not exist) — the hook does it for you.',
        commands: ['cd ~/Projects/aquador', 'claude'],
        example:
          '◆ QUALIA — Project Loaded\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '  Phase: 2 of 4 — Core Pages\n' +
          '  Status: planned\n' +
          '  Run /qualia-build 2 to continue',
        exampleTitle: 'session-start.js output',
        isMilestone: true,
      },
      {
        id: 'qs-4',
        title: 'The 5 Commands You Will Use Every Day',
        description:
          'There are 19 skills total, but five cover 90% of daily work. Learn these first.',
        commands: [
          '/qualia          — Smart router. Reads state, tells you the exact next command. Use when lost.',
          '/qualia-new      — Interactive new project wizard (asks type, features, design, stack, client).',
          '/qualia-quick    — Fast path for small fixes. No plan file, no subagents, just build and commit.',
          '/qualia-report   — Mandatory before clock-out. Generates report, commits, uploads to ERP.',
          '/qualia-idk      — Alias for /qualia. Same smart router, different mood.',
        ],
        tips: [
          'Lost? Type /qualia. It reads STATE.md and tells you whether to plan, build, verify, polish, or ship.',
          '/qualia-report is enforced — the ERP clock-out modal will not let you out without a report uploaded today.',
        ],
      },
      {
        id: 'qs-5',
        title: 'The Road',
        description:
          'Every project follows the same path. Each step calls state.js to advance the state machine, which writes both STATE.md and tracking.json atomically.',
        example:
          '/qualia-new → set up project (PROJECT.md, STATE.md, tracking.json, DESIGN.md if frontend)\n' +
          '     ↓\n' +
          'For each phase:\n' +
          '  /qualia-plan {N}   → planner agent writes phase-{N}-plan.md (fresh context)\n' +
          '  /qualia-build {N}  → builder subagents per task, parallel waves (fresh context each)\n' +
          '  /qualia-verify {N} → verifier agent writes phase-{N}-verification.md (greps the code)\n' +
          '     ↓ (auto-advances on PASS)\n' +
          '/qualia-polish  → design + UX pass (run after all phases verified)\n' +
          '/qualia-ship    → quality gates + vercel --prod + post-deploy verification\n' +
          '/qualia-handoff → writes HANDOFF.md, delivers credentials\n' +
          '/qualia-report  → MANDATORY before clock-out',
        exampleTitle: 'The Road (v2.8.1)',
      },
      {
        id: 'qs-6',
        title: 'Updates',
        description:
          'The auto-update.js hook runs silently on every Bash tool call with a 24-hour debounce. It checks npm for a newer qualia-framework-v2 version and installs it in the background using your saved code. You can also update manually any time.',
        commands: [
          'npx qualia-framework-v2 version    # Check installed version + latest on npm',
          'npx qualia-framework-v2 update     # Force update to latest',
        ],
        tips: [
          'Auto-update runs at most once per 24 hours and never blocks Claude Code — it forks a detached background process.',
          'After a manual update, restart Claude Code so the new settings.json takes effect.',
        ],
      },
    ],
    checklist: {
      title: 'Quick Start Checklist',
      items: [
        'Framework installed via npx qualia-framework-v2 install',
        'Team code accepted and CLAUDE.md configured for your role',
        'Claude Code restarted after install',
        'Session-start banner appears when you cd into a project + run claude',
        'Knows the 5 daily commands: /qualia, /qualia-new, /qualia-quick, /qualia-report, /qualia-idk',
        'Understands the road: plan → build → verify → polish → ship → handoff → report',
        'Committed to running /qualia-report before clock-out (enforced by the ERP)',
      ],
    },
  },

  {
    slug: 'planning-directory',
    title: 'The .planning/ Directory',
    subtitle: 'Every file under .planning/, who writes it, and what reads it',
    category: 'foundations',
    projectType: 'workflow',
    steps: [
      {
        id: 'pd-1',
        title: 'PROJECT.md — What We Are Building',
        description:
          'Created by /qualia-new from your wizard answers. Contains: project name, client, description, requirements, tech stack, design direction, decisions, out of scope. The planner agent reads this on every /qualia-plan to anchor its work. If this file is wrong, every plan downstream will be wrong.',
        example:
          '# Aquador\n\n' +
          '## Description\n' +
          'Premium water delivery e-commerce site for the Cyprus market.\n\n' +
          '## Client\n' +
          'Aquador Ltd — Nicosia, Cyprus\n\n' +
          '## Stack\n' +
          'Next.js 16 (App Router) + React 19 + TypeScript + Supabase + Vercel + Stripe\n\n' +
          '## Features\n' +
          '- Auth & accounts (customer signup/login)\n' +
          '- Database & CRUD (products, orders)\n' +
          '- Payments (Stripe Checkout)\n\n' +
          '## Design Direction\n' +
          'Clean & Minimal — refined typography, generous whitespace, single muted accent\n\n' +
          '## Out of Scope\n' +
          '- Mobile app\n' +
          '- Inventory management for the warehouse\n' +
          '- Multi-language (English only for v1)',
        exampleTitle: 'Example: .planning/PROJECT.md',
      },
      {
        id: 'pd-2',
        title: 'STATE.md — The Atomic State File',
        description:
          'STATE.md is managed by ~/.claude/bin/state.js. It is the single source of truth for which phase you are in, the status (setup → planned → built → verified → polished → shipped → handed_off → done), the roadmap, and any blockers. NEVER hand-edit this file. Every skill that changes state calls `node ~/.claude/bin/state.js transition --to {status}` which validates preconditions and rewrites STATE.md atomically.',
        example:
          '# Project State\n\n' +
          '## Project\n' +
          'See: .planning/PROJECT.md\n\n' +
          '## Current Position\n' +
          'Phase: 2 of 4 — Core Pages\n' +
          'Status: planned\n' +
          'Assigned to: Moayad\n' +
          'Last activity: 2026-04-09 — planned (phase 2)\n\n' +
          'Progress: [██░░░░░░░░] 25%\n\n' +
          '## Roadmap\n' +
          '| # | Phase | Goal | Status |\n' +
          '|---|-------|------|--------|\n' +
          '| 1 | Foundation | Auth, schema, layout | verified |\n' +
          '| 2 | Core Pages | Home, products, cart | planned |\n' +
          '| 3 | Checkout | Stripe, orders | — |\n' +
          '| 4 | Polish | Design + UX pass | — |\n\n' +
          '## Blockers\n' +
          'None.\n\n' +
          '## Session\n' +
          'Last session: 2026-04-09\n' +
          'Last worked by: Moayad\n' +
          'Resume: —',
        exampleTitle: 'Example: .planning/STATE.md',
        warning:
          'Never hand-edit STATE.md. state.js validates preconditions (you cannot go from setup straight to verified) and rewrites STATE.md and tracking.json together. Hand-edits will desync the two files and the ERP will show wrong data.',
      },
      {
        id: 'pd-3',
        title: 'tracking.json — Machine-Readable State for the ERP',
        description:
          'A small JSON mirror of STATE.md that the ERP reads from git. Updated by state.js on every transition, and stamped with last_commit + last_updated by the pre-push.js hook on every git push. Like STATE.md, never hand-edit it.',
        example:
          '{\n' +
          '  "project": "aquador",\n' +
          '  "client": "Aquador Ltd",\n' +
          '  "type": "website",\n' +
          '  "assigned_to": "Moayad",\n' +
          '  "phase": 2,\n' +
          '  "phase_name": "Core Pages",\n' +
          '  "total_phases": 4,\n' +
          '  "status": "planned",\n' +
          '  "wave": 0,\n' +
          '  "tasks_done": 0,\n' +
          '  "tasks_total": 0,\n' +
          '  "verification": "pending",\n' +
          '  "gap_cycles": {},\n' +
          '  "blockers": [],\n' +
          '  "last_updated": "2026-04-09T14:22:11Z",\n' +
          '  "last_commit": "a1b2c3d",\n' +
          '  "deployed_url": "",\n' +
          '  "notes": ""\n' +
          '}',
        exampleTitle: 'Example: .planning/tracking.json',
      },
      {
        id: 'pd-4',
        title: 'phase-{N}-plan.md — Written by the Planner',
        description:
          'When you run /qualia-plan {N}, a planner subagent spawns in fresh context. It reads PROJECT.md + STATE.md + the phase goal, then writes a plan file with 2-5 atomic tasks grouped into waves. Each task has Files, Action, Context refs, and a testable Done-when. Plans are prompts — the builder reads this file directly, no translation step.',
        example:
          '---\n' +
          'phase: 2\n' +
          'goal: "Homepage, product listing, and cart UI"\n' +
          'tasks: 3\n' +
          'waves: 2\n' +
          '---\n\n' +
          '# Phase 2: Core Pages\n\n' +
          '## Task 1 — Homepage\n' +
          '**Wave:** 1\n' +
          '**Files:** app/page.tsx, components/Hero.tsx\n' +
          '**Action:** Build Hero with brand image, headline, primary CTA → /products.\n' +
          '**Context:** @.planning/DESIGN.md @.planning/PROJECT.md\n' +
          '**Done when:** GET / returns 200, Hero visible at 375/768/1440, CTA navigates.\n\n' +
          '## Task 2 — Product listing\n' +
          '**Wave:** 1\n' +
          '**Files:** app/products/page.tsx, lib/products.ts\n' +
          '**Action:** Fetch products from Supabase server-side, render grid with empty state.\n' +
          '**Context:** @.planning/DESIGN.md\n' +
          '**Done when:** /products lists products, empty state shows when 0 rows.\n\n' +
          '## Task 3 — Cart drawer\n' +
          '**Wave:** 2 (after Task 1, 2)\n' +
          '**Files:** components/Cart.tsx, lib/cart-store.ts\n' +
          '**Action:** Cart drawer with add/remove, Zustand store, persists to localStorage.\n' +
          '**Done when:** Add to cart from /products updates header badge + drawer.\n\n' +
          '## Success Criteria\n' +
          '- [ ] Homepage renders Hero with working CTA\n' +
          '- [ ] /products lists items from Supabase with empty state\n' +
          '- [ ] Cart drawer adds/removes items and persists across reload',
        exampleTitle: 'Example: .planning/phase-2-plan.md',
      },
      {
        id: 'pd-5',
        title: 'phase-{N}-verification.md — Written by the Verifier',
        description:
          'When you run /qualia-verify {N}, a verifier subagent spawns in fresh context. It does NOT trust the plan or build summaries — it greps the codebase for stubs, missing wiring, and unused imports. Then it runs `npx tsc --noEmit`. If the phase touched frontend files, the qa-browser subagent runs in parallel via Playwright MCP at 375/768/1440 viewports. The combined report goes here.',
        example:
          '---\n' +
          'phase: 2\n' +
          'result: PASS\n' +
          'gaps: 0\n' +
          '---\n\n' +
          '# Phase 2 Verification\n\n' +
          '## Results\n' +
          '| Criterion | Status | Evidence |\n' +
          '|-----------|--------|----------|\n' +
          '| Hero with CTA | PASS | app/page.tsx:12 imports Hero, CTA wired |\n' +
          '| Products listing | PASS | app/products/page.tsx fetches via lib/products.ts |\n' +
          '| Cart drawer | PASS | components/Cart.tsx imported in app/layout.tsx |\n\n' +
          '## Code Quality\n' +
          '- TypeScript: PASS\n' +
          '- Stubs found: 0\n' +
          '- Empty handlers: 0\n\n' +
          '## Browser QA\n' +
          '- 375px / 768px / 1440px: PASS\n' +
          '- Console errors: 0\n' +
          '- Primary flow (browse → add to cart): PASS\n\n' +
          '## Verdict\n' +
          'PASS — Phase 2 goal achieved. Auto-advanced to Phase 3.',
        exampleTitle: 'Example: .planning/phase-2-verification.md',
      },
      {
        id: 'pd-6',
        title: 'DESIGN.md, HANDOFF.md, and reports/',
        description:
          'Three more files round out .planning/. DESIGN.md is your project-specific brand standard, HANDOFF.md is the client deliverable, and reports/ is your daily session log.',
        tips: [
          'DESIGN.md — written by /qualia-new for frontend projects, or by /qualia-plan as a Phase 1 task if missing. Builders read it before any frontend file. Contains palette, fonts, spacing, motion, components.',
          'HANDOFF.md — written by /qualia-handoff at the end of the project. URL, credentials, repo, Vercel link, how-to, support contact.',
          'reports/report-{YYYY-MM-DD}.md — written by /qualia-report. One per day. Committed to git and uploaded to https://portal.qualiasolutions.net by the skill itself.',
        ],
      },
    ],
    checklist: {
      title: 'Files to Know',
      items: [
        'PROJECT.md — what + who, written by /qualia-new, read by every planner spawn',
        'STATE.md — current phase, status, roadmap, blockers; managed by state.js, NEVER hand-edit',
        'tracking.json — JSON mirror for the ERP; managed by state.js + pre-push hook, NEVER hand-edit',
        'phase-{N}-plan.md — written by the planner agent, read directly by builder agents',
        'phase-{N}-verification.md — written by the verifier (+ qa-browser if frontend touched)',
        'DESIGN.md — project-specific brand standard, read by builders before any frontend file',
        'HANDOFF.md — written by /qualia-handoff for client delivery',
        'reports/report-{date}.md — daily session log, written by /qualia-report and uploaded to ERP',
      ],
    },
  },

  // =====================================================================
  // LIFECYCLE — Building different types of projects
  // =====================================================================

  {
    slug: 'build-website',
    title: 'Building a Website',
    subtitle: 'End-to-end flow for a marketing site, landing page, or SaaS dashboard',
    category: 'lifecycle',
    projectType: 'website',
    steps: [
      {
        id: 'bw-1',
        title: 'Start the Project',
        description:
          'Make a folder, drop in any client assets (logo, brand guide, content doc), launch Claude, and run /qualia-new. The wizard asks one question at a time using AskUserQuestion: project type → core features → design vibe → stack → client/scope. At the end it scaffolds Next.js, creates the GitHub repo, links Vercel, and writes PROJECT.md + STATE.md + tracking.json + DESIGN.md.',
        commands: [
          'mkdir -p ~/Projects/aquador && cd ~/Projects/aquador',
          '# Drop logo, brand guide, content doc into the folder',
          'claude',
          '/qualia-new',
        ],
        tips: [
          'Be specific in your free-text answer: "Premium water delivery in Cyprus. Hero with truck photo, 3 pricing plans, coverage map, testimonials, contact form to Supabase. Clean & minimal vibe."',
          'Pick "Website / Web App" for project type. The wizard will offer the right feature checklist.',
          'Pick "Qualia Stack (Recommended)" unless the client has specific tech requirements — Next.js 16 + React 19 + TypeScript + Supabase + Vercel.',
          'If the client has existing brand colors / fonts, mention them in your free-text answer — they end up in DESIGN.md.',
        ],
      },
      {
        id: 'bw-2',
        title: 'Review the Roadmap',
        description:
          'Once /qualia-new finishes scaffolding, it presents a roadmap of 4-6 phases for review. A typical website roadmap looks like Foundation → Core → Content → Polish, but the wizard tailors it to your features. Approve or ask to adjust.',
        example:
          'Typical website roadmap:\n\n' +
          '| # | Phase       | Goal                                                  |\n' +
          '|---|-------------|-------------------------------------------------------|\n' +
          '| 1 | Foundation  | Auth (if needed), DB schema, layout shell, DESIGN.md  |\n' +
          '| 2 | Core Pages  | Homepage, primary feature pages, navigation           |\n' +
          '| 3 | Content     | Real copy, images, forms, integrations                |\n' +
          '| 4 | Polish      | Design + UX pass, edge cases, responsive at 320–1920  |',
        exampleTitle: 'Roadmap example',
      },
      {
        id: 'bw-3',
        title: 'Plan → Build → Verify Each Phase',
        description:
          'For every phase, run the same three commands. Each spawns a fresh subagent with isolated context — task 50 gets the same quality as task 1 because the builder for task 50 sees zero history from task 1.',
        commands: [
          '/qualia-plan 1     # planner writes .planning/phase-1-plan.md (2-5 tasks, waves)',
          '/qualia-build 1    # builder subagents per task, parallel waves',
          '/qualia-verify 1   # verifier agent + qa-browser if frontend touched',
          '# Repeat for phase 2, 3, 4...',
        ],
        tips: [
          'On verify PASS, state.js auto-advances to the next phase — you do not need to bump the number manually.',
          'On verify FAIL, run `/qualia-plan {N} --gaps` to plan surgical fixes for only the failed criteria.',
          'Gap cycles are capped at 2. If a phase fails verification 2 times, state.js blocks further attempts and tells you to escalate to Fawzi.',
          'qa-browser uses the Playwright MCP. If Playwright is not connected, it returns BLOCKED — that is a note in the report, not a phase failure.',
        ],
      },
      {
        id: 'bw-4',
        title: 'Polish Pass',
        description:
          'After ALL phases are verified, run /qualia-polish. This is the structured design + UX pass — typography, color, layout, interactive states, motion, accessibility, responsive, performance, then hardening (long text, empty data, slow network, keyboard-only flow). Reads .planning/DESIGN.md as the standard.',
        commands: ['/qualia-polish'],
        tips: [
          '/qualia-polish runs ONCE after all phases are verified, not after every phase. Polishing in the middle wastes work because later phases will undo it.',
          'For one-shot ad-hoc design fixes during build phases, use /qualia-design instead — it is the lighter, no-report version.',
        ],
        isMilestone: true,
      },
      {
        id: 'bw-5',
        title: 'Production Audit',
        description:
          'Before shipping, run /qualia-review --web for a full production audit: security (no secrets leaked, RLS, CORS, CSP, rate limiting), performance (Core Web Vitals, image optimization, bundle), reliability (error boundaries, graceful degradation, health endpoint), observability (Sentry, logging, monitoring). Findings go to .planning/REVIEW.md ranked CRITICAL/HIGH/MEDIUM/LOW. CRITICAL or HIGH findings block /qualia-ship.',
        commands: ['/qualia-review --web'],
      },
      {
        id: 'bw-6',
        title: 'Ship',
        description:
          '/qualia-ship runs the full pipeline: pre-deploy-gate.js hook (tsc + lint + tests + build + service_role leak scan), commit, push, vercel --prod, then post-deploy verification (HTTP 200, latency < 500ms, auth endpoint responds). On success, state.js transitions to shipped.',
        commands: ['/qualia-ship'],
        warning:
          'pre-deploy-gate.js scans every .ts/.tsx/.js/.jsx file under app/, components/, src/, pages/, lib/ for the literal "service_role" string. Files matching `*.server.*` or `server/` paths are skipped. Keep service_role in server-only files or the deploy will be blocked.',
        isMilestone: true,
      },
      {
        id: 'bw-7',
        title: 'Handoff and Report',
        description:
          'After shipping, run /qualia-handoff to write .planning/HANDOFF.md (URL, credentials, repo, how-to-use, maintenance, support). Then /qualia-report to log the session — this is mandatory before clock-out.',
        commands: ['/qualia-handoff', '/qualia-report'],
        tips: [
          'HANDOFF.md is the client deliverable. Make sure URL, admin login, Supabase project ref, GitHub repo, and Vercel project are all accurate.',
          '/qualia-report uploads the report to https://portal.qualiasolutions.net/api/claude/report-upload using the API key at ~/.claude/.erp-api-key. The ERP clock-out modal will not let you out without it.',
        ],
      },
      {
        id: 'bw-8',
        title: 'Supabase: Ask Fawzi for Keys',
        description:
          'Employees cannot edit .env files — block-env-edit.js refuses any Edit/Write on `.env*` paths. If a phase needs Supabase credentials, ask Fawzi to add them to .env.local on your machine, or have him set them in the Vercel project. After Vercel env changes, you must redeploy for them to take effect.',
        warning:
          'Never commit .env files. The settings.json deny list also blocks Read on .env, .env.*, and secrets/**. If you need to test against a credential, ask Fawzi.',
      },
    ],
    checklist: {
      title: 'Website Ship Checklist',
      items: [
        '/qualia-new completed, PROJECT.md and DESIGN.md created',
        'Every phase ran /qualia-plan → /qualia-build → /qualia-verify with verification PASS',
        '/qualia-polish ran after ALL phases verified',
        '/qualia-review --web clean (no CRITICAL or HIGH findings)',
        'RLS enabled on every Supabase table',
        'No service_role in client code (pre-deploy-gate enforces)',
        '/qualia-ship succeeded — vercel --prod deployed, HTTP 200, latency < 500ms',
        '/qualia-handoff produced HANDOFF.md with credentials',
        '/qualia-report uploaded to ERP',
      ],
    },
  },

  {
    slug: 'build-ai-agent',
    title: 'Building an AI Agent',
    subtitle: 'Chatbot, RAG, voice agent, or tool-calling agent on the Qualia stack',
    category: 'lifecycle',
    projectType: 'ai-agent',
    steps: [
      {
        id: 'ba-1',
        title: 'Start the Project',
        description:
          'Same wizard as any project. Run /qualia-new and pick "AI Agent" or "Voice Agent" for project type. Be specific about what the agent does, who talks to it, and what actions it can take.',
        commands: [
          'mkdir -p ~/Projects/clinic-bot && cd ~/Projects/clinic-bot',
          'claude',
          '/qualia-new',
        ],
        tips: [
          'For voice: "A friendly receptionist for Dr. Ahmad\'s dental clinic that answers FAQ, books appointments via webhook, and transfers complex calls to a human."',
          'For chat: "RAG chatbot over the client\'s product docs. Answers in English and Arabic. Cites sources. Refuses out-of-scope questions."',
          'Pick the right template: AI Agent for chat/RAG, Voice Agent for VAPI/Retell/ElevenLabs phone agents.',
        ],
      },
      {
        id: 'ba-2',
        title: 'Stack Choices',
        description:
          'The Qualia stack for AI agents: Next.js 16 API routes for webhook handlers, Supabase + pgvector for data and RAG, OpenRouter for LLM routing, plus a voice provider if it is a phone agent.',
        tips: [
          'OpenRouter — single API for Claude, GPT, Llama, Gemini. Model failover and cost tracking built in.',
          'Supabase pgvector — store embeddings next to your application data. RLS still applies.',
          'VAPI — easiest inbound/outbound phone agents with built-in webhooks.',
          'Retell AI — strong for sales coaching and roleplay scenarios.',
          'ElevenLabs — when the client needs a custom voice clone.',
          'Telnyx — raw SIP / number porting / SMS.',
        ],
      },
      {
        id: 'ba-3',
        title: 'Plan → Build → Verify',
        description:
          'Same workflow as any project. A typical AI agent roadmap is Foundation → Agent → Interface → Polish. The planner agent will look up library APIs via Context7 MCP before writing tasks — it does not guess at SDK signatures.',
        commands: [
          '/qualia-plan 1     # Foundation: webhook handler, Supabase, auth',
          '/qualia-build 1',
          '/qualia-verify 1',
          '/qualia-plan 2     # Agent: prompts, tool calling, streaming',
          '/qualia-build 2',
          '/qualia-verify 2',
          '# ...',
        ],
        example:
          'Typical AI agent roadmap:\n\n' +
          '| # | Phase       | Goal                                                  |\n' +
          '|---|-------------|-------------------------------------------------------|\n' +
          '| 1 | Foundation  | Webhook handler, Supabase schema, auth, env wiring    |\n' +
          '| 2 | Agent       | Prompts, tool calling, conversation memory            |\n' +
          '| 3 | Interface   | Chat UI with streaming, history, error states         |\n' +
          '| 4 | Polish      | Rate limiting, cost guards, fallbacks, observability  |',
        exampleTitle: 'AI agent phases',
      },
      {
        id: 'ba-4',
        title: 'Webhook Handler Pattern',
        description:
          'Every webhook-based agent (VAPI, Retell, Telnyx) needs the same 3 things: signature verification, event routing, structured error handling. Builder agents follow this pattern automatically when the task says "webhook handler".',
        example:
          '// app/api/vapi/route.ts\n' +
          'import { verifySignature } from "@/lib/vapi.server";\n\n' +
          'export async function POST(req: Request) {\n' +
          '  const body = await req.text();\n' +
          '  const signature = req.headers.get("x-vapi-signature");\n' +
          '  if (!verifySignature(signature, body)) {\n' +
          '    return new Response("Unauthorized", { status: 401 });\n' +
          '  }\n\n' +
          '  const { message } = JSON.parse(body);\n' +
          '  switch (message.type) {\n' +
          '    case "function-call":      return handleToolCall(message);\n' +
          '    case "end-of-call-report": return handleCallEnd(message);\n' +
          '    default:                   return new Response("OK");\n' +
          '  }\n' +
          '}',
        exampleTitle: 'Standard webhook handler',
      },
      {
        id: 'ba-5',
        title: 'AI-Specific Production Audit',
        description:
          'Before shipping any AI or voice agent, run /qualia-review --ai. This auto-detects the stack (VAPI, ElevenLabs, Retell, OpenAI, Anthropic, pgvector) and audits prompt safety (no system prompt leakage, no eval on AI output, token limits set), conversation flow (off-topic handling, context window management, error recovery, human handoff), voice latency (< 500ms), RAG quality (chunk size, retrieval relevance), and resilience (provider failover, cost monitoring, streaming error recovery).',
        commands: ['/qualia-review --ai'],
        tips: [
          'CRITICAL or HIGH findings block /qualia-ship — fix them or ask Fawzi to override.',
          'If the agent uses RAG, the audit checks embedding consistency and index refresh strategy too.',
        ],
      },
      {
        id: 'ba-6',
        title: 'Voice Latency Discipline',
        description:
          'Voice agents fail in production for one reason more than any other: latency. First-token must arrive within 500ms or the user hangs up. Webhook responses must be under 300ms. Test with REAL phone calls, not just the provider dashboard.',
        warning:
          'High latency is the #1 voice agent failure mode. Always measure end-to-end on a real phone call before shipping. Provider dashboards under-report by 100-200ms.',
        tips: [
          'Start streaming the first sentence as soon as you have it — do not wait for the full response.',
          'Pre-load common responses (greeting, "let me check that for you") to mask LLM latency.',
          'Handle interruptions: the user must be able to talk over the agent without breaking the flow.',
          'Silence detection: if the user is quiet for 5+ seconds, prompt them.',
        ],
      },
      {
        id: 'ba-7',
        title: 'Ship and Hand Off',
        description:
          'Same shipping flow as any project: /qualia-ship → /qualia-handoff → /qualia-report. The only difference is the post-deploy verification should include a real test call (voice) or a real test conversation (chat) before you close out.',
        commands: ['/qualia-ship', '/qualia-handoff', '/qualia-report'],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'AI Agent Ship Checklist',
      items: [
        'Webhook signature verification implemented and tested',
        'Rate limiting configured per user / per phone number',
        'maxTokens set on every LLM call',
        'System prompt lives in the provider dashboard or a *.server.ts file — never client-side',
        'No dangerouslySetInnerHTML on AI output, no eval on AI output',
        'Cost guard / billing alert configured on the provider dashboard',
        'Voice: first-token latency measured under 500ms on a real phone call',
        '/qualia-review --ai clean (no CRITICAL or HIGH)',
        'Conversation flow tested end-to-end with a real call/message',
        '/qualia-ship → /qualia-handoff → /qualia-report all completed',
      ],
    },
  },

  {
    slug: 'build-web-app',
    title: 'Building a Web App',
    subtitle: 'Larger SaaS products with auth, dashboards, payments, and 8-12 phases',
    category: 'lifecycle',
    projectType: 'ai-platform',
    steps: [
      {
        id: 'bwa-1',
        title: 'Start the Project',
        description:
          'Same /qualia-new wizard. Pick "Website / Web App" for project type and check the auth + database + payments + dashboard features. The wizard generates a longer roadmap (8-12 phases) for full SaaS apps because there is more to build.',
        commands: [
          'mkdir -p ~/Projects/saas-name && cd ~/Projects/saas-name',
          'claude',
          '/qualia-new',
        ],
        tips: [
          'Be specific about user roles (admin, customer, manager) — this shapes the auth and RLS design from Phase 1.',
          'Mention paid plans up front so the wizard adds a Subscriptions phase to the roadmap.',
          'v2 has NO concept of milestones. The unit is the phase. A bigger app just has more phases.',
        ],
      },
      {
        id: 'bwa-2',
        title: 'Phase Structure for SaaS',
        description:
          'A typical SaaS roadmap is longer than a marketing site. Foundation → Core CRUD → Auth/Roles → Dashboard → Subscriptions → Polish. Each phase is still atomic — you plan, build, verify it, then move on.',
        example:
          'Typical SaaS roadmap:\n\n' +
          '| # | Phase           | Goal                                              |\n' +
          '|---|-----------------|---------------------------------------------------|\n' +
          '| 1 | Foundation      | DB schema, RLS, auth, layout shell, DESIGN.md     |\n' +
          '| 2 | Onboarding      | Signup, email verification, welcome flow          |\n' +
          '| 3 | Core CRUD       | Main entities, list/detail/create/edit            |\n' +
          '| 4 | Roles & Perms   | Admin/manager/customer roles, RLS policies        |\n' +
          '| 5 | Dashboard       | Stats, charts, recent activity                    |\n' +
          '| 6 | Subscriptions   | Stripe Checkout, webhooks, tier enforcement       |\n' +
          '| 7 | Notifications   | Email, in-app, transactional triggers             |\n' +
          '| 8 | Polish          | Design pass, hardening, edge cases                |',
        exampleTitle: 'SaaS phase structure',
      },
      {
        id: 'bwa-3',
        title: 'Plan, Build, Verify — Same Loop, More Phases',
        description:
          'The exact same plan/build/verify loop as any project — just repeated for each phase. State.js auto-advances on verify PASS, so you can flow phase to phase without manual state edits.',
        commands: [
          '/qualia-plan 1 && /qualia-build 1 && /qualia-verify 1',
          '/qualia-plan 2 && /qualia-build 2 && /qualia-verify 2',
          '# Or just type /qualia between phases — it tells you the next command',
        ],
      },
      {
        id: 'bwa-4',
        title: 'Pause and Resume Across Days',
        description:
          'A SaaS build takes weeks. End each session with /qualia-pause to write .continue-here.md (session summary, in-progress work, next steps, blockers, modified files). Next session, start with /qualia-resume to restore context.',
        commands: [
          '/qualia-pause     # Saves .continue-here.md before you stop for the day',
          '/qualia-resume    # Restores context from .continue-here.md or STATE.md',
        ],
        tips: [
          '/qualia-pause also commits any uncommitted work files as a WIP commit on your feature branch.',
          '/qualia-resume cleans up .continue-here.md after restoring (or asks if you want to keep it).',
          'If you forget to /qualia-pause, /qualia-resume falls back to STATE.md + git history.',
        ],
      },
      {
        id: 'bwa-5',
        title: 'Save Patterns as You Find Them',
        description:
          'When you discover a reusable pattern (a Stripe webhook trick, a Supabase RLS gotcha, a Tailwind component pattern), save it to the knowledge base with /qualia-learn. Future planners and debuggers will read it automatically.',
        commands: ['/qualia-learn'],
        tips: [
          'Three categories: Pattern (architecture / approach), Fix (problem + solution), Client preference.',
          '/qualia-plan reads ~/.claude/knowledge/learned-patterns.md before planning every phase.',
          '/qualia-debug reads ~/.claude/knowledge/common-fixes.md before investigating any bug.',
          '/qualia-new reads ~/.claude/knowledge/client-prefs.md when you set up a project for a returning client.',
        ],
      },
      {
        id: 'bwa-6',
        title: 'Gap Closure when Verify Fails',
        description:
          'If /qualia-verify finds gaps, you do not re-plan the whole phase. You run /qualia-plan {N} --gaps. The planner reads the verification report, extracts only the FAIL items, and writes a surgical fix plan (phase-{N}-gaps-plan.md). Then /qualia-build {N} executes only the fixes.',
        commands: [
          '/qualia-verify 5            # FAIL — 2 gaps found',
          '/qualia-plan 5 --gaps       # surgical fix plan, only the failed items',
          '/qualia-build 5             # build the fixes',
          '/qualia-verify 5            # re-verify',
        ],
        warning:
          'Gap cycles are capped at 2 per phase by state.js. If a phase fails verification 2 times in a row, state.js returns GAP_CYCLE_LIMIT and blocks further attempts. Escalate to Fawzi or re-plan from scratch.',
      },
      {
        id: 'bwa-7',
        title: 'Polish, Review, Ship',
        description:
          'After every feature phase verifies, run /qualia-polish (one structured pass), then /qualia-review --web (production audit), then /qualia-ship (deploy with quality gates). Same as a website, just more substance.',
        commands: [
          '/qualia-polish',
          '/qualia-review --web',
          '/qualia-ship',
          '/qualia-handoff',
          '/qualia-report',
        ],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Web App Ship Checklist',
      items: [
        'All 8-12 phases verified (no FAIL outstanding)',
        'RLS on every Supabase table, policies check auth.uid()',
        'No service_role key in any client component',
        'All mutations use server actions or *.server.ts files with auth check',
        'Input validated with Zod at every system boundary',
        'Subscription tier enforcement is server-side (RLS + server actions, not client checks)',
        'Loading + empty + error states on every data-fetching component',
        '/qualia-polish complete',
        '/qualia-review --web clean (no CRITICAL or HIGH)',
        '/qualia-ship + /qualia-handoff + /qualia-report all completed',
      ],
    },
  },

  // =====================================================================
  // OPERATIONS — Daily work outside the full lifecycle
  // =====================================================================

  {
    slug: 'existing-projects',
    title: 'Working on Existing Projects',
    subtitle: 'Pick up code you did not write, or resume after days away',
    category: 'operations',
    projectType: 'workflow',
    steps: [
      {
        id: 'ep-1',
        title: 'Open the Project',
        description:
          'cd into the project, run claude. The session-start.js hook runs automatically and prints a branded panel showing the current phase, status, and next command. You do not need to type anything to "activate" the framework — it is always on.',
        commands: ['cd ~/Projects/existing-project', 'claude'],
        example:
          '◆ QUALIA — Project Loaded\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '  Phase: 3 of 5 — Dashboard\n' +
          '  Status: built\n' +
          '  Run /qualia-verify 3 to continue',
        exampleTitle: 'session-start panel for an in-progress project',
      },
      {
        id: 'ep-2',
        title: 'Ask /qualia What to Do',
        description:
          'The /qualia smart router reads STATE.md via state.js, classifies your situation, and tells you the exact next command. It is the answer to "what do I do now?"',
        commands: ['/qualia'],
        example:
          '## Where You Are\n' +
          'Phase 3 (Dashboard) is built but not verified. The verifier has not run yet.\n\n' +
          '## I Recommend\n' +
          '**Verify Phase 3** — checks if the build actually works\n' +
          '/qualia-verify 3',
        exampleTitle: '/qualia output',
      },
      {
        id: 'ep-3',
        title: 'Resume from a Pause',
        description:
          'If a previous session ran /qualia-pause, there will be a .continue-here.md in the project root. /qualia-resume reads it, summarizes what was happening, and routes you to the next action. If there is no .continue-here.md, /qualia-resume falls back to STATE.md + git history.',
        commands: ['/qualia-resume'],
        tips: [
          '.continue-here.md is the richest source — it has session summary, in-progress work, next steps, blockers, and modified files.',
          'After resume restores context, it cleans up .continue-here.md (or asks if you want to keep it).',
          'Uncommitted work is reported clearly so you do not blow past it.',
        ],
      },
      {
        id: 'ep-4',
        title: 'Read Before You Write',
        description:
          'Three files give you everything you need to understand an existing project. Read them in this order: PROJECT.md (what we are building), STATE.md (where we are), most recent phase plan (what is currently being done).',
        commands: [
          'cat .planning/PROJECT.md',
          'cat .planning/STATE.md',
          'ls .planning/phase-*-plan.md',
        ],
      },
      {
        id: 'ep-5',
        title: 'Make Changes Safely',
        description:
          'Always work on a feature branch. branch-guard.js blocks employees from pushing to main or master — it reads your role from ~/.claude/.qualia-config.json. For small changes, use /qualia-quick. For larger changes that need a plan, jump back into the phase loop with /qualia-plan.',
        commands: [
          'git checkout -b feature/your-feature-name',
          '/qualia-quick "fix the navbar background"        # small fix',
          '/qualia-task "add a contact form to /about"      # one focused task',
          '/qualia-plan 4                                    # full phase work',
        ],
        warning:
          'Employees cannot push to main. branch-guard.js blocks the push and tells you to create a feature branch. OWNER (Fawzi) can push to main.',
      },
      {
        id: 'ep-6',
        title: 'Ship and Report',
        description:
          'When your work is done, /qualia-ship runs the full pipeline (quality gates + service_role scan + commit + push + deploy + post-deploy verify). Then /qualia-report before clock-out — mandatory.',
        commands: ['/qualia-ship', '/qualia-report'],
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Existing Project Checklist',
      items: [
        'Session-start banner showed the current phase and status',
        'Ran /qualia or /qualia-resume to get oriented',
        'Read PROJECT.md and STATE.md before touching code',
        'On a feature branch (not main)',
        'Used /qualia-quick for small fixes, /qualia-task for one focused thing, /qualia-plan for phase work',
        'Followed security rules: no service_role in client, server-side auth, Zod validation',
        '/qualia-ship + /qualia-report before clock-out',
      ],
    },
  },

  {
    slug: 'quick-tasks',
    title: 'Quick Tasks, Single Tasks, and Debugging',
    subtitle: 'When to skip the phase loop — and when to ask for help',
    category: 'operations',
    projectType: 'workflow',
    steps: [
      {
        id: 'qt-1',
        title: '/qualia-quick — Under 1 Hour, Single File',
        description:
          'For typo fixes, color tweaks, config changes, hot fixes — anything under 1 hour and roughly one file. No plan file. No subagents. Claude reads, edits, runs `npx tsc --noEmit`, commits atomically, then updates tracking.json notes via state.js.',
        commands: [
          '/qualia-quick "fix the navbar color"',
          '/qualia-quick "bump the hero h1 to 72px"',
          '/qualia-quick "fix login button returning 500 on mobile"',
        ],
        tips: [
          '/qualia-quick is the fastest path. Use it when you know exactly what to change.',
          'It still calls `npx tsc --noEmit` before committing, so you cannot accidentally break types.',
          'It updates the tracking.json notes field via state.js so the ERP shows what you did.',
        ],
      },
      {
        id: 'qt-2',
        title: '/qualia-task — One Focused Task, 1-3 Hours',
        description:
          'For a single feature, component, or API route that needs more structure than /qualia-quick but does not warrant a full phase plan. /qualia-task spawns a fresh builder subagent for the task — fresh context, atomic commit, follows all rules.',
        commands: [
          '/qualia-task "add a contact form to /about with Zod validation and Supabase insert"',
          '/qualia-task "build the user settings page with avatar upload"',
        ],
        tips: [
          '/qualia-task asks how complex the task is (Small / Medium / Large). Pick "Large" and it suggests /qualia-plan instead.',
          'The builder runs in fresh context — task quality stays high regardless of how cluttered your main session is.',
        ],
      },
      {
        id: 'qt-3',
        title: '/qualia-debug — When Something Is Broken',
        description:
          'Structured debugging. Step 0 always runs first: it greps ~/.claude/knowledge/common-fixes.md for a known fix. If your description matches, you skip the investigation entirely. Otherwise it follows the scientific method: gather symptoms → confirm diagnosis BEFORE any code changes → reproduce → isolate → root cause → minimal fix → verify.',
        commands: [
          '/qualia-debug                  # interactive — describe the symptom',
          '/qualia-debug --frontend       # CSS, layout, z-index, overflow, animation',
          '/qualia-debug --perf           # profile, slow queries, bundle size, render',
        ],
        tips: [
          'Describe the symptom as precisely as you can: "When I click submit on the contact form, the button stays in loading state and no row appears in Supabase. No console errors."',
          'Claude will present a diagnosis BEFORE writing any code. If the diagnosis is wrong, correct it — never proceed on a wrong diagnosis.',
          '--frontend mode includes a quick-diagnostics cheat sheet for the common ones (z-index needs position, horizontal scroll = use width:100% not 100vw, flex overflow needs min-width:0).',
        ],
        warning:
          'Do not guess at fixes. Claude is not allowed to either. Read the error, check the file, confirm the diagnosis, then change exactly one thing. Guessing wastes more time than investigating.',
      },
      {
        id: 'qt-4',
        title: '/qualia or /qualia-idk — When You Are Stuck',
        description:
          'When you do not know what is wrong, what is next, or what command to run. /qualia and /qualia-idk are aliases for the same smart router. It reads STATE.md, the .continue-here.md if any, recent git history, and conversation context, then routes you.',
        commands: ['/qualia', '/qualia-idk'],
        tips: [
          'If you have been stuck on the same bug for 3+ tries, /qualia detects the bug-loop pattern and suggests a different approach or escalating to Fawzi.',
          'If gap_cycles for the current phase is at the limit (2), /qualia tells you to escalate instead of trying again.',
        ],
      },
      {
        id: 'qt-5',
        title: 'Save What You Learn',
        description:
          'When you fix a recurring issue or discover a pattern, save it with /qualia-learn so future-you (or another team member) does not redo the work. The save goes to ~/.claude/knowledge/ which is read by /qualia-plan, /qualia-debug, and /qualia-new automatically.',
        commands: ['/qualia-learn'],
        example:
          '/qualia-learn\n\n' +
          'What did you learn?\n' +
          '  1. Pattern\n' +
          '  2. Fix\n' +
          '  3. Client preference\n\n' +
          'You: 2\n' +
          'Title: next/font crash on Vercel\n' +
          'Context: Vercel build failed on `next/font/google` import\n' +
          'Fix: Move the font import from a client component to layout.tsx (server component).\n\n' +
          '◆ Saved to ~/.claude/knowledge/common-fixes.md',
        exampleTitle: 'Saving a fix',
      },
    ],
    checklist: {
      title: 'Quick Task Modes',
      items: [
        '/qualia-quick — under 1 hour, single file, just do it',
        '/qualia-task — 1-3 hours, one focused thing, fresh builder agent',
        '/qualia-debug — structured debugging with diagnosis confirmation before any code',
        '/qualia or /qualia-idk — lost? smart router tells you the next command',
        '/qualia-learn — save patterns and fixes to the knowledge base',
        'Stuck for 30+ minutes? Escalate to Fawzi',
      ],
    },
  },

  {
    slug: 'design-polish',
    title: 'Design and Polish',
    subtitle: 'The two design skills, when to use which, and the brand standards',
    category: 'operations',
    projectType: 'workflow',
    steps: [
      {
        id: 'dp-1',
        title: '/qualia-design — One-Shot Transformation',
        description:
          'Use /qualia-design when you need a frontend page or component to look good RIGHT NOW. No plan, no report, no choices. Reads .planning/DESIGN.md if it exists (or falls back to ~/.claude/rules/frontend.md), critiques the file, fixes typography + color + layout + states + responsive in one pass, commits.',
        commands: ['/qualia-design'],
        tips: [
          'Use this mid-build when a component looks rough and you want it production-ready in one shot.',
          'It is less structured than /qualia-polish — no critique report, no hardening pass, no per-category fix list. Just makes it look right.',
        ],
      },
      {
        id: 'dp-2',
        title: '/qualia-polish — The Structured Pass',
        description:
          '/qualia-polish is the bigger, structured pass. Run it ONCE after all phases are verified, BEFORE /qualia-ship. It runs a full critique checklist (typography, color, layout, interactive states, motion, accessibility, responsive, performance), fixes every category in the right order, then runs a hardening pass (long text, empty data, error storms, 320px viewport, keyboard-only flow, reduced-motion). State transitions verified → polished.',
        commands: ['/qualia-polish'],
        warning:
          'Run /qualia-polish only AFTER all phases are verified. Polishing in the middle wastes work because later phases will undo it.',
        isMilestone: true,
      },
      {
        id: 'dp-3',
        title: 'DESIGN.md — Project-Specific Brand Standard',
        description:
          'Created by /qualia-new for any frontend project. It is the project-specific source of truth for palette, typography, spacing, motion, components. Builders read it before writing any frontend file. If a project does not have one, /qualia-plan adds a Phase 1 task to create it from the design direction in PROJECT.md.',
        example:
          '# Aquador Design System\n\n' +
          '## Palette (CSS variables)\n' +
          '--bg: #fafafa;\n' +
          '--surface: #ffffff;\n' +
          '--text: #0a0a0a;\n' +
          '--text-muted: #555;\n' +
          '--accent: #0077b6;     /* sharp accent for CTAs */\n' +
          '--border: #e5e5e5;\n\n' +
          '## Typography\n' +
          '@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Source+Serif+4:wght@400;500&display=swap");\n' +
          '--font-display: "Outfit", sans-serif;\n' +
          '--font-body: "Source Serif 4", serif;\n\n' +
          '## Spacing (8px grid)\n' +
          '4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96\n\n' +
          '## Motion\n' +
          '--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);\n' +
          '--ease-decelerate: cubic-bezier(0, 0, 0.2, 1);\n' +
          'Hover/focus: 150ms. Expand: 250ms. Page transitions: 300-500ms.\n' +
          'Always respect prefers-reduced-motion.\n\n' +
          '## Anti-patterns (do not do)\n' +
          '- Inter, Roboto, Arial, system-ui, Space Grotesk\n' +
          '- Card grids where every card is identical\n' +
          '- Blue-purple gradients\n' +
          '- max-w-7xl / max-width: 1200px caps',
        exampleTitle: 'Example: .planning/DESIGN.md',
      },
      {
        id: 'dp-4',
        title: 'Frontend Rules (Always Enforced)',
        description:
          'These live in ~/.claude/rules/frontend.md and are mandatory for any .tsx/.jsx/.css file. The verifier greps for violations as part of every /qualia-verify on a frontend phase, and /qualia-polish enforces them in its critique checklist.',
        tips: [
          'Distinctive fonts only — never Inter, Roboto, Arial, system-ui, or Space Grotesk.',
          'Cohesive palette via CSS variables — no scattered hex values in JSX.',
          'WCAG AA contrast — 4.5:1 for normal text, 3:1 for large (18px+ bold or 24px+).',
          'Full-width fluid layouts — no max-w-7xl, no max-width:1200px caps. Use clamp() for fluid padding.',
          'Every interactive element needs ALL states: hover, focus (visible ring), active, disabled, loading, error, empty.',
          'Semantic HTML — nav, main, section, article, header, footer. Not div soup.',
          'Touch targets: 44px minimum. Skip link as the first focusable element. One h1 per page.',
          'Motion: 150-200ms hover, 250ms expand, stagger children on load, respect prefers-reduced-motion.',
          'Mobile-first responsive — base styles for mobile, min-width breakpoints for larger.',
          'No emoji as icons — use SVGs.',
        ],
      },
    ],
    checklist: {
      title: 'Design Workflow',
      items: [
        'DESIGN.md exists (created by /qualia-new or as a Phase 1 task)',
        'Builders read DESIGN.md before any frontend file',
        '/qualia-design used for ad-hoc fixes during build phases',
        '/qualia-polish run ONCE after all phases verified, before /qualia-ship',
        'No banned fonts (Inter, Roboto, Arial, system-ui, Space Grotesk)',
        'No max-width:1200px or max-w-7xl caps — fluid layouts only',
        'All interactive elements have hover/focus/active/disabled/loading/error/empty states',
        'WCAG AA contrast on every text element',
        'Tested at 375px, 768px, 1440px viewports',
      ],
    },
  },

  // =====================================================================
  // REFERENCE — How the framework works under the hood
  // =====================================================================

  {
    slug: 'infrastructure',
    title: 'Hooks, Agents, and the State Machine',
    subtitle: 'The plumbing that runs automatically — what each piece does and why',
    category: 'reference',
    projectType: 'workflow',
    steps: [
      {
        id: 'inf-1',
        title: 'The 8 Hooks',
        description:
          'Hooks are pure Node.js scripts (no bash, no jq) that the Claude Code harness runs at specific events. They live in ~/.claude/hooks/ and are wired into ~/.claude/settings.json by the installer. You never run them by hand — they fire automatically.',
        example:
          'session-start.js     SessionStart        Renders the branded context panel + next command\n' +
          'auto-update.js       PreToolUse:Bash     Daily silent update check (24h debounce, detached)\n' +
          'branch-guard.js      PreToolUse:Bash     Blocks employees from `git push` to main/master\n' +
          'pre-push.js          PreToolUse:Bash     Stamps last_commit + last_updated into tracking.json\n' +
          'pre-deploy-gate.js   PreToolUse:Bash     tsc + lint + test + build + service_role leak scan\n' +
          'block-env-edit.js    PreToolUse:Edit     Refuses Edit/Write on any .env* file\n' +
          'migration-guard.js   PreToolUse:Edit     Blocks DROP TABLE w/o IF EXISTS, DELETE w/o WHERE,\n' +
          '                                         TRUNCATE, CREATE TABLE w/o RLS\n' +
          'pre-compact.js       PreCompact          Commits STATE.md before context compaction',
        exampleTitle: '~/.claude/hooks/ at a glance',
      },
      {
        id: 'inf-2',
        title: 'How Hooks Block You (and Why)',
        description:
          'A hook can exit non-zero to BLOCK the tool call. The user (or Claude) sees the message printed by the hook. This is how the framework enforces guardrails without trusting Claude to follow rules.',
        example:
          '$ git push\n' +
          'BLOCKED: Employees cannot push to main. Create a feature branch first.\n' +
          'Run: git checkout -b feature/your-feature-name\n\n' +
          '$ # block-env-edit.js firing on an Edit attempt:\n' +
          'BLOCKED: Cannot edit environment files. Ask Fawzi to update secrets.\n\n' +
          '$ vercel --prod\n' +
          '◆ Pre-deploy gate...\n' +
          '  ✓ TypeScript\n' +
          '  ✓ Lint\n' +
          '  ✓ Tests\n' +
          '  ✓ Build\n' +
          'BLOCKED: service_role found in client code. Remove before deploying.\n' +
          '  ✗ app/dashboard/page.tsx',
        exampleTitle: 'Hook block messages',
      },
      {
        id: 'inf-3',
        title: 'The 4 Agents (Fresh Context Isolation)',
        description:
          'Skills spawn agents using the Agent tool with a subagent_type. Each agent runs in a brand-new context window with zero history from the parent session. This is the "context isolation" core idea — task 50 gets the same quality as task 1 because the builder for task 50 has no garbage context from task 1.',
        example:
          'planner       subagent_type: qualia-planner\n' +
          '  Reads:  PROJECT.md + STATE.md + phase goal + ~/.claude/knowledge/learned-patterns.md\n' +
          '  Writes: .planning/phase-{N}-plan.md (2-5 atomic tasks, waves)\n' +
          '  Tools:  Read, Write, Bash, Glob, Grep, WebFetch, Context7 MCP\n\n' +
          'builder       subagent_type: qualia-builder\n' +
          '  Reads:  ONE task block + PROJECT.md + DESIGN.md (if frontend)\n' +
          '  Writes: code + atomic git commit\n' +
          '  Tools:  Read, Write, Edit, Bash, Grep, Glob\n\n' +
          'verifier      subagent_type: qualia-verifier\n' +
          '  Reads:  phase plan + codebase\n' +
          '  Writes: .planning/phase-{N}-verification.md (PASS or FAIL with grep evidence)\n' +
          '  Tools:  Read, Bash, Grep, Glob (NO write — cannot fix anything)\n\n' +
          'qa-browser    subagent_type: qualia-qa-browser\n' +
          '  Reads:  phase plan + dev server\n' +
          '  Writes: appends "Browser QA" section to phase-{N}-verification.md\n' +
          '  Tools:  Playwright MCP (navigate, snapshot, resize, click, console)',
        exampleTitle: 'The 4 agents',
        tips: [
          'The verifier intentionally has NO Write or Edit tools. Its job is to grep the code and report — it cannot fix what it finds. That comes back to /qualia-plan {N} --gaps.',
          'qa-browser runs in parallel with the verifier on frontend phases. If Playwright MCP is unavailable, it returns BLOCKED — that is a note, not a failure.',
        ],
      },
      {
        id: 'inf-4',
        title: 'state.js — The Atomic State Machine',
        description:
          'Every workflow skill calls ~/.claude/bin/state.js to read or change state. It is a small Node.js state machine (no dependencies, ~500 lines) that validates preconditions, rewrites STATE.md and tracking.json atomically, and tracks gap-closure cycles. Three commands: check, transition, init.',
        commands: [
          'node ~/.claude/bin/state.js check                                                # JSON: phase, status, next_command',
          'node ~/.claude/bin/state.js transition --to planned --phase 2                    # called by /qualia-plan',
          'node ~/.claude/bin/state.js transition --to built --phase 2 --tasks-done 3 --tasks-total 3',
          'node ~/.claude/bin/state.js transition --to verified --phase 2 --verification pass',
          'node ~/.claude/bin/state.js transition --to shipped --deployed-url https://aquador.com',
        ],
        example:
          'Valid transitions:\n\n' +
          '  setup    → planned    (requires phase-{N}-plan.md to exist)\n' +
          '  planned  → built      (requires --tasks-done and --tasks-total)\n' +
          '  built    → verified   (requires phase-{N}-verification.md and --verification pass|fail)\n' +
          '  verified → polished   (only after the last phase passes)\n' +
          '  polished → shipped    (requires --deployed-url)\n' +
          '  shipped  → handed_off (requires HANDOFF.md to exist)\n' +
          '  handed_off → done\n\n' +
          'Gap closure:\n' +
          '  verified(fail) → planned   (increments gap_cycles[phase])\n' +
          '  Capped at 2 cycles per phase. The 3rd attempt returns GAP_CYCLE_LIMIT.',
        exampleTitle: 'state.js transitions',
        warning:
          'Never edit STATE.md or tracking.json by hand. state.js writes both files together with backup-and-revert on failure. Hand-edits will desync the two and the ERP will show wrong data.',
      },
      {
        id: 'inf-5',
        title: 'Knowledge Base — ~/.claude/knowledge/',
        description:
          'Three markdown files that persist across projects and sessions. Skills read them automatically: /qualia-plan reads learned-patterns.md, /qualia-debug reads common-fixes.md, /qualia-new reads client-prefs.md. Write to them via /qualia-learn.',
        example:
          '~/.claude/knowledge/\n' +
          '├── learned-patterns.md   # Architecture, library, prompt patterns. Read by /qualia-plan.\n' +
          '├── common-fixes.md       # Recurring problems and their fixes. Read by /qualia-debug step 0.\n' +
          '└── client-prefs.md       # Client-specific design / requirements. Read by /qualia-new.',
        exampleTitle: 'Knowledge base layout',
        tips: [
          'When you fix a tricky bug, save it: /qualia-learn → Fix. Future-you saves an hour.',
          'When you discover a pattern that worked, save it: /qualia-learn → Pattern. The next planner reads it.',
          'When a returning client says "I always want X", save it: /qualia-learn → Client preference. /qualia-new will pick it up next time.',
        ],
      },
      {
        id: 'inf-6',
        title: 'tracking.json Sync to ERP',
        description:
          ".planning/tracking.json is the ERP's window into project state. The pre-push.js hook stamps it with last_commit + last_updated on every git push. The ERP polls git and reads the file directly — no API call needed.",
        commands: [
          '# pre-push.js runs automatically on every `git push`. It does:',
          '#   1. read tracking.json',
          '#   2. set last_commit = `git log --oneline -1 --format=%h`',
          '#   3. set last_updated = ISO timestamp',
          '#   4. git add .planning/tracking.json',
          '# Then your push proceeds.',
        ],
      },
    ],
    checklist: {
      title: 'Infrastructure Mental Model',
      items: [
        'Knows the 8 hooks and what each one blocks',
        'Knows the 4 agents and that each runs in fresh context (planner, builder, verifier, qa-browser)',
        'Knows that the verifier has no Write/Edit tools — it reports, never fixes',
        'Knows state.js is the only thing allowed to write STATE.md or tracking.json',
        'Knows the valid state transitions and the gap-cycle cap of 2',
        'Knows the 3 knowledge files and which skill reads each',
        'Knows pre-push.js stamps tracking.json so the ERP always sees fresh data',
        'Uses /qualia-learn whenever a fix or pattern is worth saving',
      ],
    },
  },

  // =====================================================================
  // CHECKLISTS — The single source of truth before clock-out
  // =====================================================================

  {
    slug: 'shipping-checklist',
    title: 'Shipping Checklist',
    subtitle: 'Everything to verify before, during, and after /qualia-ship',
    category: 'checklist',
    projectType: 'workflow',
    steps: [
      {
        id: 'sc-1',
        title: 'Pre-Ship: All Phases Verified',
        description:
          'Before you even think about shipping, every phase must be verified PASS. /qualia checks STATE.md and refuses to advance if anything is built-but-unverified or verified-but-failed.',
        commands: [
          'node ~/.claude/bin/state.js check    # JSON: status should be "polished" (or last phase "verified")',
          'cat .planning/STATE.md               # roadmap should show every phase = verified',
        ],
      },
      {
        id: 'sc-2',
        title: 'Pre-Ship: Polish + Review',
        description:
          'Run /qualia-polish for the structured design + UX pass. Then /qualia-review --web (or --ai) for the production audit. CRITICAL or HIGH findings block /qualia-ship — fix them or ask Fawzi to override.',
        commands: [
          '/qualia-polish              # critique → fix → harden → tsc → commit → state.polished',
          '/qualia-review --web        # full prod audit, writes .planning/REVIEW.md',
        ],
        warning:
          'Do NOT skip /qualia-polish. It is the only step that exercises long text, empty data, error storms, 320px viewport, and keyboard-only flow. Clients notice when these break.',
      },
      {
        id: 'sc-3',
        title: 'Code Quality',
        description:
          'pre-deploy-gate.js runs these automatically on `vercel --prod`, but you can run them ahead of time too.',
        commands: [
          'npx tsc --noEmit             # Zero TypeScript errors',
          'npm run lint                 # Zero lint warnings',
          'npm test                     # Tests pass (if package.json has a test script)',
          'npm run build                # Build completes',
        ],
        tips: [
          'No TODO or FIXME comments left unresolved.',
          'No console.log debug statements in production code.',
          'No commented-out code blocks.',
          'No empty catch blocks — at minimum, log the error.',
        ],
      },
      {
        id: 'sc-4',
        title: 'Security',
        description:
          'pre-deploy-gate.js scans every .ts/.tsx/.js/.jsx file under app/, components/, src/, pages/, lib/ for the literal "service_role" string and blocks the deploy if any file matches (excluding *.server.ts and server/ paths). RLS, Zod, and auth checks are your responsibility.',
        warning:
          'service_role bypasses ALL RLS. If it leaks into client code, anyone with your bundle can read/write/delete every row in every table. Keep it in *.server.ts files or server/ directories ONLY.',
        tips: [
          'RLS enabled on every Supabase table, with policies that check auth.uid() server-side',
          'No service_role key in any client component',
          'All mutations use server actions or *.server.ts files with auth checks',
          'Input validated with Zod at every system boundary (forms, API routes, webhooks)',
          'No hardcoded API keys, secrets, or passwords anywhere',
          'No eval() and no dangerouslySetInnerHTML',
          '.env files never committed (block-env-edit.js prevents you from editing them at all)',
        ],
      },
      {
        id: 'sc-5',
        title: 'Frontend Quality',
        description:
          '/qualia-polish handles most of this, but double-check before shipping. The verifier and qa-browser already test these on every /qualia-verify of a frontend phase.',
        tips: [
          'All interactive elements have hover, focus, active, disabled, loading, error, empty states',
          'Responsive at 375px (mobile), 768px (tablet), 1440px (desktop), 1920px (large)',
          'No horizontal scroll at 320px',
          'Every page has SEO metadata (title, description, OG tags)',
          'Custom 404 error page exists and matches the design',
          'Favicon configured',
          'next/image with explicit width/height for all images',
          'next/font for fonts (not @import) to prevent CLS',
          'Skip link as first focusable element on every page',
        ],
      },
      {
        id: 'sc-6',
        title: 'Run /qualia-ship',
        description:
          'One command runs the full pipeline: pre-deploy-gate (tsc + lint + tests + build + service_role scan), commit, push, vercel --prod, post-deploy verification (HTTP 200, latency < 500ms, auth endpoint responds), state.js transition to shipped.',
        commands: ['/qualia-ship'],
        warning:
          'Employees stay on a feature branch — /qualia-ship does NOT merge to main. branch-guard.js will block any push to main from a non-OWNER role. If you need a main merge, ask Fawzi.',
        isMilestone: true,
      },
      {
        id: 'sc-7',
        title: 'Post-Deploy Verification',
        description:
          '/qualia-ship runs these automatically after `vercel --prod` returns. If any fail, the ship is incomplete and state.js does not transition to shipped.',
        commands: [
          'curl -s -o /dev/null -w "%{http_code}" https://yoursite.com         # 200',
          'curl -s -o /dev/null -w "%{time_total}" https://yoursite.com        # < 0.5',
          'curl -s -o /dev/null -w "%{http_code}" https://yoursite.com/api/auth/callback',
        ],
        tips: [
          'HTTP 200 on the homepage',
          'Latency under 500ms on the homepage',
          'Auth endpoint responds (not 404, not 500)',
          'No critical errors in browser console on first load',
          'UptimeRobot monitor shows UP (https://stats.uptimerobot.com/bKudHy1pLs)',
        ],
      },
      {
        id: 'sc-8',
        title: 'Handoff and Report (MANDATORY)',
        description:
          'After /qualia-ship succeeds, two more commands. /qualia-handoff writes HANDOFF.md and delivers credentials. /qualia-report generates the daily session report and uploads it to the ERP — without this upload, you cannot clock out.',
        commands: ['/qualia-handoff', '/qualia-report'],
        warning:
          '/qualia-report is enforced by the ERP clock-out modal. If you skip it, you cannot clock out for the day. Run it before you stop, every day.',
        isMilestone: true,
      },
    ],
    checklist: {
      title: 'Production Ready?',
      items: [
        'All phases verified PASS (state.js check confirms)',
        '/qualia-polish complete — state == polished',
        '/qualia-review --web (or --ai) clean — no CRITICAL or HIGH',
        'tsc + lint + tests + build all pass locally',
        'No service_role string in app/, components/, src/, pages/, lib/ (except *.server.* and server/)',
        'RLS on every Supabase table',
        'Zod validation at every system boundary',
        'No .env files committed',
        '/qualia-ship succeeded — vercel --prod deployed and post-deploy checks passed',
        '/qualia-handoff produced HANDOFF.md',
        '/qualia-report uploaded to https://portal.qualiasolutions.net (mandatory)',
        'UptimeRobot monitor shows UP',
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
