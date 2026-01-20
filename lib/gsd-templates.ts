/**
 * GSD (Get Shit Done) Templates
 * Type-specific phase and task templates aligned with GSD workflow
 */

import type { Database } from '@/types/database';

type ProjectType = Database['public']['Enums']['project_type'];

// ============================================================================
// TYPES
// ============================================================================

export interface GSDTask {
  title: string;
  description?: string;
  helperText: string; // Trainee-friendly guidance
  templateKey: string;
}

export interface GSDPhaseTemplate {
  name: string;
  description: string;
  prompt: string; // "Perfect prompt" for this phase
  gsdCommand: string; // e.g., '/gsd:discuss-phase 1'
  qualiaSkills: string[]; // e.g., ['/fd', '/fb']
  tasks: GSDTask[];
}

export interface GSDProjectTemplate {
  type: ProjectType;
  phases: GSDPhaseTemplate[];
}

// ============================================================================
// WEB DESIGN TEMPLATE
// ============================================================================

export const WEB_DESIGN_TEMPLATE: GSDProjectTemplate = {
  type: 'web_design',
  phases: [
    {
      name: 'SETUP',
      description: 'Get everything ready before coding',
      gsdCommand: '/gsd:new-project',
      qualiaSkills: ['/sb'],
      prompt: `You are setting up a new website project. Run:

/gsd:new-project

Then ensure you have:
1. Local folder created at ~/Desktop/Projects/websites/[project-name]
2. GitHub repo initialized (gh repo create [name] --private --clone)
3. Supabase project created if needed (use /sb)
4. Vercel project linked (vercel link)
5. All env vars configured (.env.local)

Get client requirements document and list 3-5 MVP features only.`,
      tasks: [
        {
          title: 'Create project folder locally',
          helperText: 'Run: mkdir ~/Desktop/Projects/websites/[project-name] && cd [project-name]',
          templateKey: 'web_setup_1',
        },
        {
          title: 'Create GitHub repo',
          helperText: 'Run: gh repo create [name] --private --clone OR create in GitHub dashboard',
          templateKey: 'web_setup_2',
        },
        {
          title: 'Create Supabase project (if needed)',
          helperText: 'Use /sb command or create in Supabase dashboard. Get URL and anon key.',
          templateKey: 'web_setup_3',
        },
        {
          title: 'Create Vercel project',
          helperText: 'Run: vercel link OR connect repo in Vercel dashboard',
          templateKey: 'web_setup_4',
        },
        {
          title: 'Get client requirements document',
          helperText: 'Check Notion, email, or Slack for the project brief from client',
          templateKey: 'web_setup_5',
        },
        {
          title: 'List MVP features (3-5 max)',
          helperText: 'Write down ONLY the core features needed for launch. Less is more.',
          templateKey: 'web_setup_6',
        },
      ],
    },
    {
      name: 'DISCUSS',
      description: 'Clarify scope and align with stakeholders',
      gsdCommand: '/gsd:discuss-phase 1',
      qualiaSkills: [],
      prompt: `You are clarifying requirements for a website project.

/gsd:discuss-phase 1

Ask the client about:
1. Target audience - Who uses this site? What do they need?
2. Key pages - Home, About, Services, Contact, etc.
3. Design preferences - "Show me 3 sites you like"
4. Must-have vs nice-to-have features
5. Timeline - When does this need to launch?
6. Content availability - Do they have copy and images?

Lock these decisions before planning.`,
      tasks: [
        {
          title: 'Confirm target audience',
          helperText: 'Ask: "Who is the primary user? What problem are we solving for them?"',
          templateKey: 'web_discuss_1',
        },
        {
          title: 'Define key pages',
          helperText: 'List all pages needed: Home, About, Services, Contact, Blog, etc.',
          templateKey: 'web_discuss_2',
        },
        {
          title: 'Gather design references',
          helperText: 'Ask client: "Show me 3 websites you like the look of and why"',
          templateKey: 'web_discuss_3',
        },
        {
          title: 'Separate must-have from nice-to-have',
          helperText: 'MVP = must-have features only. Everything else goes in "Phase 2" list.',
          templateKey: 'web_discuss_4',
        },
        {
          title: 'Confirm timeline and launch date',
          helperText: 'Ask: "When does this absolutely need to be live?"',
          templateKey: 'web_discuss_5',
        },
      ],
    },
    {
      name: 'PLAN',
      description: 'Create the build plan',
      gsdCommand: '/gsd:plan-phase 2',
      qualiaSkills: [],
      prompt: `Create a structured build plan for the website.

/gsd:plan-phase 2

This generates atomic tasks (2-3 per execution phase).

Review the plan and ensure:
1. Tasks are small and specific
2. Dependencies are clear
3. MVP features are covered
4. Nothing is over-engineered`,
      tasks: [
        {
          title: 'Run /gsd:plan-phase to generate plan',
          helperText: 'This creates atomic tasks based on your requirements',
          templateKey: 'web_plan_1',
        },
        {
          title: 'Review generated plan',
          helperText: 'Check that tasks are achievable and make sense',
          templateKey: 'web_plan_2',
        },
        {
          title: 'Refine or approve plan',
          helperText: 'Add missing tasks, remove unnecessary ones, then approve',
          templateKey: 'web_plan_3',
        },
      ],
    },
    {
      name: 'EXECUTE',
      description: 'Build UI first, then backend',
      gsdCommand: '/gsd:execute-phase 3',
      qualiaSkills: ['/fd', '/fb', '/responsive', '/sb'],
      prompt: `Build the website following this order:

/gsd:execute-phase 3

1. Design first:
   /fd "[describe the main UI you want]"

2. Build components:
   /fb "[component name]" - Header, Hero, Cards, Footer, etc.

3. Commit and push:
   Ask Claude: "Commit these changes with a descriptive message"

4. Deploy preview:
   Run: vercel deploy

5. Test responsive:
   /responsive - Fix any mobile/tablet issues

6. Add backend (if needed):
   /sb - Create tables, auth, RLS policies

7. Connect frontend to backend:
   Fetch data, handle forms, add auth

8. Deploy again and test full flow

Repeat until MVP is complete.`,
      tasks: [
        {
          title: '/fd "[main UI]" - Design the look',
          helperText: 'Start with homepage or the most important page. Describe the vibe.',
          templateKey: 'web_execute_1',
        },
        {
          title: '/fb "[component]" - Build each component',
          helperText: 'Build one at a time: Header, Hero, Features, Testimonials, Footer',
          templateKey: 'web_execute_2',
        },
        {
          title: 'Commit and push changes',
          helperText: 'Ask Claude: "Commit these changes" - do this frequently!',
          templateKey: 'web_execute_3',
        },
        {
          title: 'Deploy preview',
          helperText: 'Run: vercel deploy (without --prod) to get a preview URL',
          templateKey: 'web_execute_4',
        },
        {
          title: '/responsive - Fix mobile issues',
          helperText: 'Test on phone or use browser dev tools. Fix any broken layouts.',
          templateKey: 'web_execute_5',
        },
        {
          title: '/sb - Add database (if needed)',
          helperText: 'Create tables, set up auth, add RLS policies for security',
          templateKey: 'web_execute_6',
        },
        {
          title: 'Connect frontend to backend',
          helperText: 'Fetch data from Supabase, handle form submissions, add auth flow',
          templateKey: 'web_execute_7',
        },
        {
          title: 'Deploy again and test full flow',
          helperText: 'Run: vercel deploy - Test everything works end-to-end',
          templateKey: 'web_execute_8',
        },
      ],
    },
    {
      name: 'VERIFY',
      description: 'Test and review',
      gsdCommand: '/gsd:verify-work',
      qualiaSkills: ['/dd', '/sf'],
      prompt: `Verify the website is production-ready.

/gsd:verify-work

1. Manual testing:
   - Click every link
   - Fill every form
   - Test on mobile and desktop

2. Code review:
   Run a quick review for obvious issues

3. Production audit:
   - Check for console errors
   - Verify all images load
   - Test page speed

4. Fix any issues found:
   /sf - Auto-fix simple issues
   /dd - Deep debug complex problems

Do NOT proceed until all tests pass.`,
      tasks: [
        {
          title: 'Manual testing of all flows',
          helperText: 'Click everything, fill every form, test on mobile AND desktop',
          templateKey: 'web_verify_1',
        },
        {
          title: 'Check for console errors',
          helperText: 'Open browser dev tools > Console. Fix any red errors.',
          templateKey: 'web_verify_2',
        },
        {
          title: 'Test page speed',
          helperText: 'Run Lighthouse in Chrome DevTools. Aim for 90+ performance score.',
          templateKey: 'web_verify_3',
        },
        {
          title: 'Fix issues found',
          helperText: 'Use /sf for quick fixes, /dd for complex debugging',
          templateKey: 'web_verify_4',
        },
      ],
    },
    {
      name: 'SHIP',
      description: 'Deploy and deliver',
      gsdCommand: '/gsd:complete-milestone',
      qualiaSkills: [],
      prompt: `Ship the website to production.

/gsd:complete-milestone

1. Final checks:
   - Verify ALL env vars are set in Vercel dashboard
   - Double-check domain settings

2. Deploy production:
   Run: vercel deploy --prod

3. Setup custom domain (if needed):
   - Add domain in Vercel dashboard
   - Update DNS records
   - Wait for SSL certificate

4. Final verification:
   - Test production URL
   - Test custom domain
   - Check mobile one more time

5. Handoff:
   - Send client the production URL
   - Provide any login credentials
   - Document any ongoing maintenance needs`,
      tasks: [
        {
          title: 'Verify env vars in Vercel dashboard',
          helperText:
            'Go to Vercel > Project > Settings > Environment Variables. Check production.',
          templateKey: 'web_ship_1',
        },
        {
          title: 'Deploy production',
          helperText: 'Run: vercel deploy --prod - This is the real deal!',
          templateKey: 'web_ship_2',
        },
        {
          title: 'Setup custom domain (if needed)',
          helperText: 'Add domain in Vercel > Domains. Update DNS at registrar.',
          templateKey: 'web_ship_3',
        },
        {
          title: 'Test production URL',
          helperText: 'Full flow test on the live production site',
          templateKey: 'web_ship_4',
        },
        {
          title: 'Send client production URL',
          helperText: 'Email or message the client with the live link',
          templateKey: 'web_ship_5',
        },
        {
          title: 'Document what worked',
          helperText: 'Note any learnings for future projects',
          templateKey: 'web_ship_6',
        },
      ],
    },
  ],
};

// ============================================================================
// AI AGENT TEMPLATE
// ============================================================================

export const AI_AGENT_TEMPLATE: GSDProjectTemplate = {
  type: 'ai_agent',
  phases: [
    {
      name: 'SETUP',
      description: 'Define the agent and gather requirements',
      gsdCommand: '/gsd:new-project',
      qualiaSkills: ['/sb'],
      prompt: `You are setting up a new AI agent project.

/gsd:new-project

1. Define the agent's purpose:
   - What problem does it solve?
   - Who will use it?
   - What actions can it take?

2. Gather requirements:
   - Required API keys (OpenAI, Anthropic, etc.)
   - Data sources it needs access to
   - Output format expectations

3. Setup infrastructure:
   - Create GitHub repo
   - Setup Supabase for conversation storage
   - Configure environment variables`,
      tasks: [
        {
          title: 'Define agent purpose and use case',
          helperText: 'Answer: What problem does this agent solve? Who uses it?',
          templateKey: 'ai_setup_1',
        },
        {
          title: 'List required API keys and integrations',
          helperText: 'OpenAI? Anthropic? External APIs? Database access?',
          templateKey: 'ai_setup_2',
        },
        {
          title: 'Create GitHub repo',
          helperText: 'Run: gh repo create [name] --private --clone',
          templateKey: 'ai_setup_3',
        },
        {
          title: 'Setup Supabase for data storage',
          helperText: 'Use /sb to create tables for conversations, users, logs',
          templateKey: 'ai_setup_4',
        },
        {
          title: 'Configure all environment variables',
          helperText: 'Create .env.local with all API keys. NEVER commit this file.',
          templateKey: 'ai_setup_5',
        },
      ],
    },
    {
      name: 'DISCUSS',
      description: 'Define agent behavior and capabilities',
      gsdCommand: '/gsd:discuss-phase 1',
      qualiaSkills: [],
      prompt: `Clarify the AI agent's behavior.

/gsd:discuss-phase 1

Define:
1. Conversation style - Formal? Casual? Technical?
2. Available tools/functions the agent can call
3. Knowledge boundaries - What should it know? What shouldn't it?
4. Error handling - How should it respond to bad inputs?
5. Escalation path - When should it hand off to a human?

Document these decisions before building.`,
      tasks: [
        {
          title: 'Define conversation style and tone',
          helperText: 'Professional? Friendly? Technical? Match the use case.',
          templateKey: 'ai_discuss_1',
        },
        {
          title: 'List available tools/functions',
          helperText: 'What actions can the agent take? Search? Create? Update?',
          templateKey: 'ai_discuss_2',
        },
        {
          title: 'Define knowledge boundaries',
          helperText: 'What topics should it handle vs refuse? Set guardrails.',
          templateKey: 'ai_discuss_3',
        },
        {
          title: 'Plan error handling',
          helperText: 'How should it respond to: unclear requests, invalid data, API failures?',
          templateKey: 'ai_discuss_4',
        },
        {
          title: 'Define escalation path',
          helperText: 'When should the agent say "Let me connect you with a human"?',
          templateKey: 'ai_discuss_5',
        },
      ],
    },
    {
      name: 'PLAN',
      description: 'Design agent architecture',
      gsdCommand: '/gsd:plan-phase 2',
      qualiaSkills: [],
      prompt: `Plan the AI agent architecture.

/gsd:plan-phase 2

Design decisions:
1. Model selection - GPT-4? Claude? Local model?
2. Tool/function calling approach
3. Memory/context management
4. Rate limiting and costs
5. Logging and observability

Create atomic implementation tasks.`,
      tasks: [
        {
          title: 'Select AI model and provider',
          helperText:
            'GPT-4 for complex reasoning, Claude for long context, GPT-3.5 for simple tasks',
          templateKey: 'ai_plan_1',
        },
        {
          title: 'Design tool/function calling',
          helperText: 'Define the JSON schema for each tool the agent can use',
          templateKey: 'ai_plan_2',
        },
        {
          title: 'Plan memory management',
          helperText: 'How to handle conversation history? Summarization? RAG?',
          templateKey: 'ai_plan_3',
        },
      ],
    },
    {
      name: 'EXECUTE',
      description: 'Build the agent',
      gsdCommand: '/gsd:execute-phase 3',
      qualiaSkills: ['/sb'],
      prompt: `Build the AI agent.

/gsd:execute-phase 3

Implementation order:
1. Core agent logic:
   - System prompt
   - Tool definitions
   - Response handling

2. Database layer (/sb):
   - Conversation storage
   - User management
   - Usage tracking

3. API endpoints:
   - Chat endpoint
   - Webhook handlers
   - Health check

4. Testing:
   - Unit tests for tools
   - Integration tests for flows
   - Edge case handling

Commit frequently. Test each component before moving on.`,
      tasks: [
        {
          title: 'Create system prompt',
          helperText: 'Write the core instructions that define agent behavior',
          templateKey: 'ai_execute_1',
        },
        {
          title: 'Implement tool definitions',
          helperText: 'Define each function the agent can call with proper types',
          templateKey: 'ai_execute_2',
        },
        {
          title: 'Build database schema',
          helperText: 'Use /sb to create tables for conversations, messages, users',
          templateKey: 'ai_execute_3',
        },
        {
          title: 'Create API endpoints',
          helperText: 'Build the chat endpoint and any webhook handlers needed',
          templateKey: 'ai_execute_4',
        },
        {
          title: 'Add conversation storage',
          helperText: 'Save messages to database, handle context window limits',
          templateKey: 'ai_execute_5',
        },
        {
          title: 'Implement error handling',
          helperText: 'Handle API failures, rate limits, invalid inputs gracefully',
          templateKey: 'ai_execute_6',
        },
        {
          title: 'Test core functionality',
          helperText: 'Test happy path, edge cases, error scenarios',
          templateKey: 'ai_execute_7',
        },
      ],
    },
    {
      name: 'VERIFY',
      description: 'Test agent thoroughly',
      gsdCommand: '/gsd:verify-work',
      qualiaSkills: ['/dd', '/sf'],
      prompt: `Verify the AI agent works correctly.

/gsd:verify-work

Testing checklist:
1. Happy path - Normal conversations work
2. Edge cases - Unusual inputs handled
3. Error recovery - Graceful failure modes
4. Security - No prompt injection vulnerabilities
5. Performance - Response times acceptable
6. Costs - Token usage within budget

Run automated tests and manual QA.`,
      tasks: [
        {
          title: 'Test happy path conversations',
          helperText: 'Run through normal use cases. Does it respond correctly?',
          templateKey: 'ai_verify_1',
        },
        {
          title: 'Test edge cases and errors',
          helperText: 'Try: empty input, very long input, nonsense, prompt injection',
          templateKey: 'ai_verify_2',
        },
        {
          title: 'Security audit',
          helperText: 'Test for prompt injection, data leaks, unauthorized access',
          templateKey: 'ai_verify_3',
        },
        {
          title: 'Check costs and performance',
          helperText: 'Monitor token usage, response times, error rates',
          templateKey: 'ai_verify_4',
        },
      ],
    },
    {
      name: 'SHIP',
      description: 'Deploy and monitor',
      gsdCommand: '/gsd:complete-milestone',
      qualiaSkills: [],
      prompt: `Ship the AI agent to production.

/gsd:complete-milestone

1. Production deployment:
   - Set all production env vars
   - Deploy to Vercel/Railway
   - Verify health checks

2. Monitoring setup:
   - Error tracking (Sentry)
   - Usage analytics
   - Cost monitoring

3. Documentation:
   - API documentation
   - Usage examples
   - Troubleshooting guide

4. Handoff:
   - Share access credentials
   - Explain monitoring dashboards
   - Document escalation procedures`,
      tasks: [
        {
          title: 'Set production environment variables',
          helperText: 'Add all API keys to production environment',
          templateKey: 'ai_ship_1',
        },
        {
          title: 'Deploy to production',
          helperText: 'Run: vercel deploy --prod',
          templateKey: 'ai_ship_2',
        },
        {
          title: 'Setup monitoring',
          helperText: 'Add Sentry for errors, log token usage, set up alerts',
          templateKey: 'ai_ship_3',
        },
        {
          title: 'Create documentation',
          helperText: 'Write API docs, usage examples, troubleshooting guide',
          templateKey: 'ai_ship_4',
        },
        {
          title: 'Test production deployment',
          helperText: 'Run full test suite against production API',
          templateKey: 'ai_ship_5',
        },
      ],
    },
  ],
};

// ============================================================================
// VOICE AGENT TEMPLATE
// ============================================================================

export const VOICE_AGENT_TEMPLATE: GSDProjectTemplate = {
  type: 'voice_agent',
  phases: [
    {
      name: 'SETUP',
      description: 'Prepare voice infrastructure',
      gsdCommand: '/gsd:new-project',
      qualiaSkills: ['/va', '/sb'],
      prompt: `You are setting up a new voice agent project.

/gsd:new-project

1. Account setup:
   - Create VAPI account (vapi.ai)
   - Get phone number (Telnyx or VAPI)
   - Setup ElevenLabs for voice (optional)

2. Define use case:
   - Inbound or outbound calls?
   - What triggers the call?
   - What's the goal of each call?

3. Infrastructure:
   - Create GitHub repo
   - Setup Supabase for call logs
   - Configure webhook endpoints`,
      tasks: [
        {
          title: 'Create VAPI account',
          helperText: 'Go to vapi.ai, sign up, get API key',
          templateKey: 'voice_setup_1',
        },
        {
          title: 'Get phone number',
          helperText: 'Buy number from Telnyx or use VAPI phone numbers',
          templateKey: 'voice_setup_2',
        },
        {
          title: 'Define use case clearly',
          helperText: 'Answer: Inbound or outbound? What triggers calls? What is the goal?',
          templateKey: 'voice_setup_3',
        },
        {
          title: 'Create GitHub repo',
          helperText: 'Run: gh repo create [name] --private --clone',
          templateKey: 'voice_setup_4',
        },
        {
          title: 'Setup Supabase for call logs',
          helperText: 'Use /sb to create tables for calls, transcripts, outcomes',
          templateKey: 'voice_setup_5',
        },
      ],
    },
    {
      name: 'DISCUSS',
      description: 'Design conversation flow',
      gsdCommand: '/gsd:discuss-phase 1',
      qualiaSkills: [],
      prompt: `Design the voice agent conversation flow.

/gsd:discuss-phase 1

Define:
1. Voice personality - Warm? Professional? Energetic?
2. Opening script - First 10 seconds are critical
3. Key conversation paths
4. Objection handling
5. Call ending / transfer conditions
6. Fallback behaviors

Write out the full conversation script.`,
      tasks: [
        {
          title: 'Define voice personality',
          helperText: 'Warm and friendly? Professional? Match your brand.',
          templateKey: 'voice_discuss_1',
        },
        {
          title: 'Write opening script',
          helperText: 'First 10 seconds matter most. Hook them immediately.',
          templateKey: 'voice_discuss_2',
        },
        {
          title: 'Map conversation paths',
          helperText: 'Draw out: happy path, objections, questions, transfers',
          templateKey: 'voice_discuss_3',
        },
        {
          title: 'Define objection handling',
          helperText: 'List common objections and how to respond',
          templateKey: 'voice_discuss_4',
        },
        {
          title: 'Plan call endings',
          helperText: 'When to end? When to transfer to human? Success criteria?',
          templateKey: 'voice_discuss_5',
        },
      ],
    },
    {
      name: 'PLAN',
      description: 'Plan technical implementation',
      gsdCommand: '/gsd:plan-phase 2',
      qualiaSkills: [],
      prompt: `Plan the voice agent technical implementation.

/gsd:plan-phase 2

Technical decisions:
1. VAPI assistant configuration
2. Voice selection (ElevenLabs?)
3. Webhook handlers needed
4. Database schema for call data
5. Integration with existing systems`,
      tasks: [
        {
          title: 'Design VAPI assistant config',
          helperText: 'Model, voice, system prompt, functions, settings',
          templateKey: 'voice_plan_1',
        },
        {
          title: 'Select voice',
          helperText: 'VAPI voices or ElevenLabs for custom. Test different options.',
          templateKey: 'voice_plan_2',
        },
        {
          title: 'Plan webhook architecture',
          helperText: 'What events need handlers? call.started, call.ended, etc.',
          templateKey: 'voice_plan_3',
        },
      ],
    },
    {
      name: 'EXECUTE',
      description: 'Build and configure voice agent',
      gsdCommand: '/gsd:execute-phase 3',
      qualiaSkills: ['/va', '/sb'],
      prompt: `Build the voice agent.

/gsd:execute-phase 3

Implementation:
1. Create VAPI assistant:
   /va "[describe your assistant]"

2. Configure assistant:
   - System prompt with conversation script
   - Voice selection
   - Function calling (if needed)

3. Build webhooks:
   - Supabase Edge Function for webhooks
   - Log calls to database
   - Trigger follow-up actions

4. Connect phone number

5. Test with real calls`,
      tasks: [
        {
          title: '/va - Create VAPI assistant',
          helperText: 'Use /va command with your assistant requirements',
          templateKey: 'voice_execute_1',
        },
        {
          title: 'Configure system prompt',
          helperText: 'Add the full conversation script and instructions',
          templateKey: 'voice_execute_2',
        },
        {
          title: 'Select and test voice',
          helperText: 'Choose voice, test pronunciation, adjust speed',
          templateKey: 'voice_execute_3',
        },
        {
          title: 'Build webhook handler',
          helperText: 'Create Supabase Edge Function to handle VAPI webhooks',
          templateKey: 'voice_execute_4',
        },
        {
          title: 'Setup call logging',
          helperText: 'Log all calls, transcripts, outcomes to Supabase',
          templateKey: 'voice_execute_5',
        },
        {
          title: 'Connect phone number',
          helperText: 'Link your Telnyx/VAPI number to the assistant',
          templateKey: 'voice_execute_6',
        },
      ],
    },
    {
      name: 'VERIFY',
      description: 'Test calls thoroughly',
      gsdCommand: '/gsd:verify-work',
      qualiaSkills: ['/dd'],
      prompt: `Test the voice agent with real calls.

/gsd:verify-work

Testing checklist:
1. Make test calls - Try different scenarios
2. Test edge cases - Silence, interruptions, nonsense
3. Check call quality - Audio clear? Latency?
4. Verify logging - All calls captured correctly?
5. Test transfers - Human handoff working?
6. Review transcripts - Responses appropriate?

Do NOT launch until calls feel natural.`,
      tasks: [
        {
          title: 'Make test calls - happy path',
          helperText: 'Call your number, follow the happy path. Record issues.',
          templateKey: 'voice_verify_1',
        },
        {
          title: 'Test edge cases',
          helperText: 'Try: silence, talking over it, unexpected questions, hanging up',
          templateKey: 'voice_verify_2',
        },
        {
          title: 'Check audio quality',
          helperText: 'Is the voice clear? Any weird pauses? Latency issues?',
          templateKey: 'voice_verify_3',
        },
        {
          title: 'Verify call logging',
          helperText: 'Check Supabase - are all calls being logged correctly?',
          templateKey: 'voice_verify_4',
        },
        {
          title: 'Review transcripts',
          helperText: 'Read through conversation logs. Responses make sense?',
          templateKey: 'voice_verify_5',
        },
      ],
    },
    {
      name: 'SHIP',
      description: 'Launch and monitor',
      gsdCommand: '/gsd:complete-milestone',
      qualiaSkills: [],
      prompt: `Launch the voice agent.

/gsd:complete-milestone

1. Go live:
   - Enable the phone number for real calls
   - Setup call forwarding (if needed)
   - Configure business hours

2. Monitoring:
   - Setup alerts for failed calls
   - Monitor call duration and outcomes
   - Track cost per call

3. Handoff:
   - Document the assistant configuration
   - Share VAPI dashboard access
   - Create runbook for common issues`,
      tasks: [
        {
          title: 'Enable phone number for production',
          helperText: 'Remove any test flags, enable real inbound/outbound',
          templateKey: 'voice_ship_1',
        },
        {
          title: 'Configure business hours',
          helperText: 'Set when calls should go to voicemail vs agent',
          templateKey: 'voice_ship_2',
        },
        {
          title: 'Setup monitoring and alerts',
          helperText: 'Alert on failed calls, unusual patterns, high costs',
          templateKey: 'voice_ship_3',
        },
        {
          title: 'Create documentation',
          helperText: 'Document config, common issues, how to update prompts',
          templateKey: 'voice_ship_4',
        },
        {
          title: 'Share access with client',
          helperText: 'VAPI dashboard access, call logs, how to make changes',
          templateKey: 'voice_ship_5',
        },
      ],
    },
  ],
};

// ============================================================================
// SEO TEMPLATE (Simplified)
// ============================================================================

export const SEO_TEMPLATE: GSDProjectTemplate = {
  type: 'seo',
  phases: [
    {
      name: 'SETUP',
      description: 'Gather access and baseline data',
      gsdCommand: '/gsd:new-project',
      qualiaSkills: [],
      prompt: `Setup SEO project access and gather baseline data.

/gsd:new-project

Get access to:
- Google Search Console
- Google Analytics
- Website CMS/hosting
- Existing content inventory`,
      tasks: [
        {
          title: 'Get Google Search Console access',
          helperText: 'Request or create access',
          templateKey: 'seo_setup_1',
        },
        {
          title: 'Get Google Analytics access',
          helperText: 'Request or create access',
          templateKey: 'seo_setup_2',
        },
        {
          title: 'Document current rankings',
          helperText: 'Export current keyword positions',
          templateKey: 'seo_setup_3',
        },
        {
          title: 'Get CMS access',
          helperText: 'WordPress, Webflow, etc.',
          templateKey: 'seo_setup_4',
        },
      ],
    },
    {
      name: 'DISCUSS',
      description: 'Define SEO goals and priorities',
      gsdCommand: '/gsd:discuss-phase 1',
      qualiaSkills: [],
      prompt: `Define SEO goals and target keywords.

/gsd:discuss-phase 1

Discuss:
- Target keywords and topics
- Competitor analysis
- Content gaps
- Technical SEO priorities`,
      tasks: [
        {
          title: 'Define target keywords',
          helperText: 'What do you want to rank for?',
          templateKey: 'seo_discuss_1',
        },
        {
          title: 'Analyze competitors',
          helperText: 'Who ranks for your keywords?',
          templateKey: 'seo_discuss_2',
        },
        {
          title: 'Identify content gaps',
          helperText: 'What content is missing?',
          templateKey: 'seo_discuss_3',
        },
      ],
    },
    {
      name: 'PLAN',
      description: 'Create SEO strategy',
      gsdCommand: '/gsd:plan-phase 2',
      qualiaSkills: [],
      prompt: `Create SEO implementation plan.

/gsd:plan-phase 2`,
      tasks: [
        {
          title: 'Create keyword strategy',
          helperText: 'Map keywords to pages',
          templateKey: 'seo_plan_1',
        },
        {
          title: 'Plan content calendar',
          helperText: 'What to create and when',
          templateKey: 'seo_plan_2',
        },
        {
          title: 'List technical fixes',
          helperText: 'Speed, mobile, structure',
          templateKey: 'seo_plan_3',
        },
      ],
    },
    {
      name: 'EXECUTE',
      description: 'Implement SEO changes',
      gsdCommand: '/gsd:execute-phase 3',
      qualiaSkills: [],
      prompt: `Implement SEO improvements.

/gsd:execute-phase 3`,
      tasks: [
        {
          title: 'Optimize existing pages',
          helperText: 'Titles, metas, content',
          templateKey: 'seo_execute_1',
        },
        {
          title: 'Create new content',
          helperText: 'Target keyword gaps',
          templateKey: 'seo_execute_2',
        },
        {
          title: 'Fix technical issues',
          helperText: 'Speed, mobile, errors',
          templateKey: 'seo_execute_3',
        },
        {
          title: 'Build internal links',
          helperText: 'Connect related content',
          templateKey: 'seo_execute_4',
        },
      ],
    },
    {
      name: 'VERIFY',
      description: 'Validate improvements',
      gsdCommand: '/gsd:verify-work',
      qualiaSkills: [],
      prompt: `Verify SEO changes are working.

/gsd:verify-work`,
      tasks: [
        {
          title: 'Check indexing status',
          helperText: 'All pages indexed?',
          templateKey: 'seo_verify_1',
        },
        {
          title: 'Validate no errors',
          helperText: 'Search Console clean?',
          templateKey: 'seo_verify_2',
        },
        {
          title: 'Test page speed',
          helperText: 'Core Web Vitals passing?',
          templateKey: 'seo_verify_3',
        },
      ],
    },
    {
      name: 'SHIP',
      description: 'Report and monitor',
      gsdCommand: '/gsd:complete-milestone',
      qualiaSkills: [],
      prompt: `Create SEO report and setup monitoring.

/gsd:complete-milestone`,
      tasks: [
        {
          title: 'Create baseline report',
          helperText: 'Document starting point',
          templateKey: 'seo_ship_1',
        },
        {
          title: 'Setup rank tracking',
          helperText: 'Monitor keyword positions',
          templateKey: 'seo_ship_2',
        },
        {
          title: 'Schedule monthly check-ins',
          helperText: 'Ongoing optimization',
          templateKey: 'seo_ship_3',
        },
      ],
    },
  ],
};

// ============================================================================
// ADS TEMPLATE (Simplified)
// ============================================================================

export const ADS_TEMPLATE: GSDProjectTemplate = {
  type: 'ads',
  phases: [
    {
      name: 'SETUP',
      description: 'Setup ad accounts and tracking',
      gsdCommand: '/gsd:new-project',
      qualiaSkills: [],
      prompt: `Setup advertising accounts and tracking.

/gsd:new-project`,
      tasks: [
        {
          title: 'Create/access ad accounts',
          helperText: 'Google Ads, Meta, etc.',
          templateKey: 'ads_setup_1',
        },
        {
          title: 'Setup conversion tracking',
          helperText: 'Pixels, tags, events',
          templateKey: 'ads_setup_2',
        },
        {
          title: 'Define budget and goals',
          helperText: 'CPA targets, daily spend',
          templateKey: 'ads_setup_3',
        },
      ],
    },
    {
      name: 'DISCUSS',
      description: 'Define targeting and messaging',
      gsdCommand: '/gsd:discuss-phase 1',
      qualiaSkills: [],
      prompt: `Define ad targeting and messaging.

/gsd:discuss-phase 1`,
      tasks: [
        {
          title: 'Define target audience',
          helperText: 'Demographics, interests, behaviors',
          templateKey: 'ads_discuss_1',
        },
        {
          title: 'Create messaging angles',
          helperText: 'Pain points, benefits, offers',
          templateKey: 'ads_discuss_2',
        },
        {
          title: 'Plan ad formats',
          helperText: 'Image, video, carousel, etc.',
          templateKey: 'ads_discuss_3',
        },
      ],
    },
    {
      name: 'PLAN',
      description: 'Plan campaign structure',
      gsdCommand: '/gsd:plan-phase 2',
      qualiaSkills: [],
      prompt: `Plan ad campaign structure.

/gsd:plan-phase 2`,
      tasks: [
        {
          title: 'Design campaign structure',
          helperText: 'Campaigns, ad sets, ads',
          templateKey: 'ads_plan_1',
        },
        { title: 'Plan A/B tests', helperText: 'What to test first', templateKey: 'ads_plan_2' },
        {
          title: 'Create content calendar',
          helperText: 'When to launch what',
          templateKey: 'ads_plan_3',
        },
      ],
    },
    {
      name: 'EXECUTE',
      description: 'Create and launch ads',
      gsdCommand: '/gsd:execute-phase 3',
      qualiaSkills: [],
      prompt: `Create and launch ad campaigns.

/gsd:execute-phase 3`,
      tasks: [
        {
          title: 'Create ad creatives',
          helperText: 'Images, videos, copy',
          templateKey: 'ads_execute_1',
        },
        {
          title: 'Build campaigns',
          helperText: 'Setup in ad platform',
          templateKey: 'ads_execute_2',
        },
        {
          title: 'Launch and monitor',
          helperText: 'Start with small budget',
          templateKey: 'ads_execute_3',
        },
      ],
    },
    {
      name: 'VERIFY',
      description: 'Verify tracking and performance',
      gsdCommand: '/gsd:verify-work',
      qualiaSkills: [],
      prompt: `Verify ads are tracking and performing.

/gsd:verify-work`,
      tasks: [
        {
          title: 'Verify conversion tracking',
          helperText: 'Test conversions firing',
          templateKey: 'ads_verify_1',
        },
        {
          title: 'Check ad delivery',
          helperText: 'Ads actually showing?',
          templateKey: 'ads_verify_2',
        },
        {
          title: 'Review initial data',
          helperText: 'CTR, CPC, quality',
          templateKey: 'ads_verify_3',
        },
      ],
    },
    {
      name: 'SHIP',
      description: 'Optimize and report',
      gsdCommand: '/gsd:complete-milestone',
      qualiaSkills: [],
      prompt: `Create report and optimize campaigns.

/gsd:complete-milestone`,
      tasks: [
        {
          title: 'Create performance report',
          helperText: 'Spend, results, ROAS',
          templateKey: 'ads_ship_1',
        },
        {
          title: 'Optimize based on data',
          helperText: 'Kill losers, scale winners',
          templateKey: 'ads_ship_2',
        },
        {
          title: 'Plan next iteration',
          helperText: 'New tests, new creatives',
          templateKey: 'ads_ship_3',
        },
      ],
    },
  ],
};

// ============================================================================
// TEMPLATE LOOKUP
// ============================================================================

export const GSD_TEMPLATES: Record<ProjectType, GSDProjectTemplate> = {
  web_design: WEB_DESIGN_TEMPLATE,
  ai_agent: AI_AGENT_TEMPLATE,
  voice_agent: VOICE_AGENT_TEMPLATE,
  seo: SEO_TEMPLATE,
  ads: ADS_TEMPLATE,
};

export function getTemplateForType(type: ProjectType): GSDProjectTemplate {
  return GSD_TEMPLATES[type] || WEB_DESIGN_TEMPLATE;
}

export function getPhasePromptData(
  templateKey: string | null | undefined
): { gsdCommand: string; qualiaSkills: string[] } | null {
  if (!templateKey) return null;

  // Parse template key: "web_setup" -> type: web_design, phase: SETUP
  const parts = templateKey.split('_');
  if (parts.length < 2) return null;

  const typePrefix = parts[0];
  const phaseName = parts[1].toUpperCase();

  // Map prefix to type
  const typeMap: Record<string, ProjectType> = {
    web: 'web_design',
    ai: 'ai_agent',
    voice: 'voice_agent',
    seo: 'seo',
    ads: 'ads',
  };

  const projectType = typeMap[typePrefix];
  if (!projectType) return null;

  const template = GSD_TEMPLATES[projectType];
  const phase = template.phases.find((p) => p.name.toUpperCase() === phaseName);

  if (!phase) return null;

  return {
    gsdCommand: phase.gsdCommand,
    qualiaSkills: phase.qualiaSkills,
  };
}
