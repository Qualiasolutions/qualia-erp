// Guide data for trainee workflows

export type GuideCategory = 'greenfield' | 'brownfield' | 'workflow';
export type ProjectType = 'website' | 'ai-agent' | 'voice-agent' | 'ai-platform' | 'workflow';

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
  // ==================== GREENFIELD ====================
  {
    slug: 'greenfield-website',
    title: 'Build a New Website',
    subtitle: 'Next.js + Supabase + Vercel',
    category: 'greenfield',
    projectType: 'website',
    steps: [
      {
        id: 'gw-1',
        title: 'Open Terminal & Go to Project Folder',
        commands: ['cd ~/Desktop/Projects/websites', 'mkdir my-new-site', 'cd my-new-site'],
      },
      {
        id: 'gw-2',
        title: 'Start Claude Code',
        commands: ['claude'],
      },
      {
        id: 'gw-3',
        title: 'Initialize Your Project',
        description:
          "Type this command, then answer Claude's questions about what you're building.",
        commands: ['/gsd:new-project'],
        tips: [
          '"I\'m building a landing page for a dentist clinic. It needs a hero section, services section, about section, contact form, and testimonials. Use Next.js 15, Supabase for the contact form submissions, and deploy to Vercel."',
        ],
      },
      {
        id: 'gw-4',
        title: 'Discuss Phase 1',
        description: 'Claude will ask questions to understand exactly what to build.',
        commands: ['/gsd:discuss-phase 1'],
      },
      {
        id: 'gw-5',
        title: 'Plan Phase 1',
        commands: ['/gsd:plan-phase 1'],
      },
      {
        id: 'gw-6',
        title: 'Build Phase 1',
        commands: ['/gsd:execute-phase 1'],
      },
      {
        id: 'gw-7',
        title: 'Repeat for Each Phase',
        description: 'Keep going through all phases in your roadmap:',
        commands: ['/gsd:discuss-phase 2', '/gsd:plan-phase 2', '/gsd:execute-phase 2'],
        tips: ['Then phase 3, 4, etc. until done.'],
      },
      {
        id: 'gw-8',
        title: 'If You Need Nice UI Design',
        commands: ['/fd'],
        tips: [
          '"Design a modern hero section with a gradient background, large headline, subtext, and a CTA button"',
        ],
      },
      {
        id: 'gw-9',
        title: 'If You Need Database Tables',
        commands: ['/sb'],
        tips: [
          '"Create a contact_submissions table with name, email, phone, message, and created_at columns. Add RLS policy so only authenticated users can read."',
        ],
      },
      {
        id: 'gw-10',
        title: 'Check Everything Works',
        commands: ['/gsd:verify-work'],
      },
      {
        id: 'gw-11',
        title: 'Save Your Code',
        commands: ['/git-flow'],
      },
      {
        id: 'gw-12',
        title: 'Deploy to Vercel',
        commands: ['/quick-deploy'],
      },
      {
        id: 'gw-13',
        title: 'Mark Project Complete',
        commands: ['/gsd:complete-milestone'],
      },
    ],
    checklist: {
      title: 'Before You Deploy - Check These',
      items: [
        'Site works on mobile',
        'All links work',
        'Forms submit correctly',
        'Images load fast',
        'No console errors',
        'Supabase env vars in Vercel',
      ],
    },
  },
  {
    slug: 'greenfield-ai-agent',
    title: 'Build a New AI Chat Agent',
    subtitle: 'Chatbot with Supabase backend',
    category: 'greenfield',
    projectType: 'ai-agent',
    steps: [
      {
        id: 'ga-1',
        title: 'Open Terminal & Go to Project Folder',
        commands: ['cd ~/Desktop/Projects/aiagents', 'mkdir my-chatbot', 'cd my-chatbot'],
      },
      {
        id: 'ga-2',
        title: 'Start Claude Code',
        commands: ['claude'],
      },
      {
        id: 'ga-3',
        title: 'Initialize Your Project',
        commands: ['/gsd:new-project'],
        tips: [
          '"I\'m building a customer support chatbot for a SaaS product. It should answer questions about pricing, features, and troubleshooting. It needs to save conversation history in Supabase. Use OpenAI GPT-4o for the AI. Build a simple chat interface with Next.js."',
        ],
      },
      {
        id: 'ga-4',
        title: 'Work Through Each Phase',
        description: 'For each phase in your roadmap:',
        commands: ['/gsd:discuss-phase 1', '/gsd:plan-phase 1', '/gsd:execute-phase 1'],
      },
      {
        id: 'ga-5',
        title: 'Set Up Your Database',
        commands: ['/sb'],
        tips: [
          '"Create tables for conversations and messages. Conversations should have id, user_id, created_at, title. Messages should have id, conversation_id, role (user or assistant), content, created_at."',
        ],
      },
      {
        id: 'ga-6',
        title: 'Build the Chat UI',
        commands: ['/fd'],
        tips: [
          '"Design a clean chat interface with a message list, input box at the bottom, and a typing indicator. Make it look modern like ChatGPT."',
        ],
      },
      {
        id: 'ga-7',
        title: 'Test the Agent',
        description: 'Run your app locally and have a few test conversations. Make sure:',
        tips: [
          'Messages save to database',
          'Agent responds correctly',
          'Conversation history works',
        ],
      },
      {
        id: 'ga-8',
        title: 'Verify Everything',
        commands: ['/gsd:verify-work'],
      },
      {
        id: 'ga-9',
        title: 'Save & Deploy',
        commands: ['/git-flow', '/quick-deploy'],
      },
      {
        id: 'ga-10',
        title: 'Done!',
        commands: ['/gsd:complete-milestone'],
      },
    ],
    checklist: {
      title: 'Before You Deploy - Check These',
      items: [
        'OPENAI_API_KEY in Vercel',
        'Supabase keys in Vercel',
        'Agent responds correctly',
        'Messages save to DB',
        'No API key in frontend code',
        'Rate limiting works',
      ],
    },
  },
  {
    slug: 'greenfield-voice-agent',
    title: 'Build a New Voice Agent',
    subtitle: 'VAPI + Supabase phone agent',
    category: 'greenfield',
    projectType: 'voice-agent',
    steps: [
      {
        id: 'gv-1',
        title: 'Open Terminal & Go to Project Folder',
        commands: ['cd ~/Desktop/Projects/voice', 'mkdir my-voice-agent', 'cd my-voice-agent'],
      },
      {
        id: 'gv-2',
        title: 'Start Claude Code',
        commands: ['claude'],
      },
      {
        id: 'gv-3',
        title: 'Initialize Your Project',
        commands: ['/gsd:new-project'],
        tips: [
          '"I\'m building a voice agent for a restaurant that handles reservations. It should answer phone calls, check available times, book reservations, and send confirmation SMS. Use VAPI for voice, Supabase for storing reservations, and deploy webhooks to Vercel."',
        ],
      },
      {
        id: 'gv-4',
        title: 'Work Through Each Phase',
        commands: ['/gsd:discuss-phase 1', '/gsd:plan-phase 1', '/gsd:execute-phase 1'],
      },
      {
        id: 'gv-5',
        title: 'Set Up Database for Calls',
        commands: ['/sb'],
        tips: [
          '"Create tables for: calls (id, vapi_call_id, phone_number, status, duration, created_at), reservations (id, call_id, customer_name, customer_phone, date, time, party_size, created_at)"',
        ],
      },
      {
        id: 'gv-6',
        title: 'Build the VAPI Voice Agent',
        commands: ['/va'],
        tips: [
          '"Create a VAPI assistant for restaurant reservations. It should greet callers, ask for their name, party size, preferred date and time, check availability, and confirm the booking. Use a friendly female voice."',
        ],
      },
      {
        id: 'gv-7',
        title: 'Create Webhook Handlers',
        commands: ['/supabase-edge'],
        tips: [
          '"Create an edge function to handle VAPI webhooks. It should handle: function-call events for check_availability and book_reservation, and end-of-call-report to save the call transcript."',
        ],
      },
      {
        id: 'gv-8',
        title: 'Test in VAPI Dashboard',
        description: 'Go to VAPI dashboard → Your assistant → Test tab → Make a test call',
      },
      {
        id: 'gv-9',
        title: 'Connect a Phone Number',
        description: 'In VAPI dashboard:',
        tips: ['Go to Phone Numbers', 'Buy or import a number', 'Assign your assistant to it'],
      },
      {
        id: 'gv-10',
        title: 'Test with Real Phone Call',
        description: 'Call your number and test the full flow.',
      },
      {
        id: 'gv-11',
        title: 'Verify & Deploy',
        commands: ['/gsd:verify-work', '/git-flow', '/quick-deploy', '/gsd:complete-milestone'],
      },
    ],
    checklist: {
      title: 'Before You Go Live - Check These',
      items: [
        'VAPI_API_KEY in Vercel',
        'Webhook URL correct in VAPI',
        'All functions work',
        'Calls save to database',
        'No awkward pauses',
        'Transfer to human works',
      ],
    },
  },
  {
    slug: 'greenfield-ai-platform',
    title: 'Build a New AI Platform',
    subtitle: 'Multi-user platform with admin panel (takes multiple milestones)',
    category: 'greenfield',
    projectType: 'ai-platform',
    steps: [
      {
        id: 'gp-1',
        title: 'Open Terminal & Go to Project Folder',
        commands: ['cd ~/Desktop/Projects/platforms', 'mkdir my-ai-platform', 'cd my-ai-platform'],
      },
      {
        id: 'gp-2',
        title: 'Start Claude Code',
        commands: ['claude'],
      },
      {
        id: 'gp-3',
        title: 'Initialize Your Project',
        commands: ['/gsd:new-project'],
        tips: [
          '"I\'m building a SaaS platform where businesses can create their own AI chatbots. Features needed: user signup/login, organization management, create multiple AI agents per org, chat interface for end users, admin dashboard to see all conversations, usage analytics, and Stripe billing. Use Next.js, Supabase, OpenAI."',
        ],
      },
      {
        id: 'gp-m1',
        title: 'MILESTONE 1: Auth & Organizations',
        isMilestone: true,
        description: 'Work through all Phase 1 phases:',
        commands: ['/gsd:discuss-phase 1', '/gsd:plan-phase 1', '/gsd:execute-phase 1'],
      },
      {
        id: 'gp-m1-db',
        title: 'Set up multi-tenant database',
        commands: ['/sb'],
        tips: [
          '"Create tables: organizations (id, name, created_at), users (id, email, name), memberships (id, user_id, org_id, role). Add RLS so users only see their own org\'s data."',
        ],
      },
      {
        id: 'gp-m1-done',
        title: 'Complete Milestone 1',
        commands: ['/gsd:verify-work', '/git-flow', '/quick-deploy', '/gsd:complete-milestone'],
      },
      {
        id: 'gp-m2',
        title: 'MILESTONE 2: AI Agents',
        isMilestone: true,
        commands: ['/gsd:new-milestone'],
        tips: [
          '"This milestone adds the AI agent functionality. Users can create agents, configure them with custom prompts, and chat with them."',
        ],
      },
      {
        id: 'gp-m2-done',
        title: 'Complete Milestone 2',
        description: 'Work through phases, then:',
        commands: ['/gsd:complete-milestone'],
      },
      {
        id: 'gp-m3',
        title: 'MILESTONE 3: Admin Dashboard',
        isMilestone: true,
        commands: ['/gsd:new-milestone', '/admin-panel'],
        tips: [
          '"Build an admin dashboard showing: all organizations, all users, all agents, conversation logs, and basic usage stats."',
        ],
      },
      {
        id: 'gp-m4',
        title: 'MILESTONE 4: Billing & Polish',
        isMilestone: true,
        commands: ['/gsd:new-milestone', '/gsd:quick'],
        tips: [
          '"Add Stripe subscription billing. Create 3 plans: Free (100 messages/month), Pro ($29/month, 5000 messages), Enterprise ($99/month, unlimited). Track usage and show warnings when approaching limits."',
        ],
      },
      {
        id: 'gp-m4-audit',
        title: 'Final Production Check',
        commands: ['/pr'],
      },
      {
        id: 'gp-final',
        title: 'Final Deploy',
        commands: ['/full-deploy', '/gsd:complete-milestone'],
      },
    ],
    checklist: {
      title: 'Platform Checklist',
      items: [
        "Users can't see other orgs' data",
        'RLS on ALL tables',
        'Billing tracks usage correctly',
        'Admin can see everything',
        'Rate limiting works',
        'Error tracking (Sentry) set up',
      ],
    },
  },

  // ==================== BROWNFIELD ====================
  {
    slug: 'brownfield-website',
    title: 'Work on Existing Website',
    subtitle: 'Add features or fix bugs',
    category: 'brownfield',
    projectType: 'website',
    steps: [
      {
        id: 'bw-1',
        title: 'Go to the Project Folder',
        commands: ['cd ~/Desktop/Projects/websites/existing-project-name'],
      },
      {
        id: 'bw-2',
        title: 'Check Git Status',
        description: "Make sure you're on the right branch and have no uncommitted changes.",
        commands: ['git status && git branch'],
      },
      {
        id: 'bw-3',
        title: 'Start Claude Code',
        commands: ['claude'],
      },
      {
        id: 'bw-4',
        title: 'Explore the Codebase First',
        description: 'ALWAYS do this before making changes!',
        commands: ['/brownfield-explore'],
        tips: [
          '"I need to add a new pricing page. Show me how pages are structured in this project and where the pricing data might come from."',
        ],
      },
      {
        id: 'bw-5',
        title: 'Create a Feature Branch',
        commands: ['git checkout -b feature/pricing-page'],
      },
      {
        id: 'bw-6a',
        title: 'For Small Changes - Use Quick Mode',
        commands: ['/gsd:quick'],
        tips: [
          '"Add a new pricing page at /pricing with 3 tiers: Basic ($9/mo), Pro ($29/mo), Enterprise (Contact us). Match the existing page style and component patterns."',
        ],
      },
      {
        id: 'bw-6b',
        title: 'For Bigger Features - Use Full GSD',
        commands: ['/gsd:new-milestone'],
        tips: ['Then work through phases:'],
      },
      {
        id: 'bw-6b-phases',
        title: 'Work Through Phases',
        commands: ['/gsd:discuss-phase 1', '/gsd:plan-phase 1', '/gsd:execute-phase 1'],
      },
      {
        id: 'bw-7',
        title: 'If You Need UI Design Help',
        commands: ['/fd'],
        tips: [
          '"Design a pricing cards section that matches the existing site style. 3 cards with features lists and CTA buttons."',
        ],
      },
      {
        id: 'bw-8',
        title: 'If Something Breaks',
        commands: ['/sf'],
        tips: [
          '"The pricing page throws an error when I click the Pro plan button. Here\'s the error: [paste error]"',
        ],
      },
      {
        id: 'bw-9',
        title: 'Test Your Changes',
        description: 'Run the app locally and check:',
        tips: ['Your new feature works', 'Old features still work', 'Mobile looks good'],
      },
      {
        id: 'bw-10',
        title: 'Save & Create PR',
        commands: ['/git-flow'],
        tips: ['"Commit my changes and create a pull request"'],
      },
      {
        id: 'bw-11',
        title: 'Deploy',
        commands: ['/quick-deploy'],
      },
    ],
    checklist: {
      title: 'Before You Deploy - Check These',
      items: [
        'Explored codebase first',
        'Followed existing patterns',
        'New feature works',
        'Old features still work',
        'Mobile responsive',
        'No console errors',
      ],
    },
  },
  {
    slug: 'brownfield-ai-agent',
    title: 'Modify Existing AI Agent',
    subtitle: 'Add features or improve behavior',
    category: 'brownfield',
    projectType: 'ai-agent',
    steps: [
      {
        id: 'ba-1',
        title: 'Go to the Project Folder',
        commands: ['cd ~/Desktop/Projects/aiagents/existing-agent'],
      },
      {
        id: 'ba-2',
        title: 'Check Git Status',
        commands: ['git status && git branch'],
      },
      {
        id: 'ba-3',
        title: 'Start Claude Code',
        commands: ['claude'],
      },
      {
        id: 'ba-4',
        title: 'Explore the Agent Code',
        commands: ['/brownfield-explore'],
        tips: [
          '"Show me how this agent works. Where is the system prompt? What tools/functions does it have? How does it save conversations?"',
        ],
      },
      {
        id: 'ba-5',
        title: 'Create Feature Branch',
        commands: ['git checkout -b feature/add-calendar-tool'],
      },
      {
        id: 'ba-6a',
        title: 'To Change Agent Behavior',
        commands: ['/gsd:quick'],
        tips: [
          '"Update the system prompt so the agent is more concise and always asks clarifying questions before giving long answers."',
        ],
      },
      {
        id: 'ba-6b',
        title: 'To Add a New Tool',
        commands: ['/gsd:quick'],
        tips: [
          "\"Add a new tool called 'check_calendar' that lets the agent look up available meeting slots. It should query the Supabase 'calendar_slots' table.\"",
        ],
      },
      {
        id: 'ba-6c',
        title: 'To Add a New Integration',
        commands: ['/channel-integration'],
        tips: ['"Add Slack integration so this agent can respond to messages in Slack channels."'],
      },
      {
        id: 'ba-7',
        title: 'Test the Agent',
        description: 'Have test conversations:',
        tips: [
          'Test the new feature works',
          'Test old features still work',
          'Test edge cases (weird inputs)',
          'Test same scenario multiple times',
        ],
      },
      {
        id: 'ba-8',
        title: 'If Agent Misbehaves',
        commands: ['/sf'],
        tips: [
          "\"The agent isn't using the new calendar tool. It just says 'I can't check calendars' even though I added the tool.\"",
        ],
      },
      {
        id: 'ba-9',
        title: 'Save & Deploy',
        commands: ['/git-flow', '/quick-deploy'],
      },
    ],
    checklist: {
      title: 'Before You Deploy - Check These',
      items: [
        'Explored code first',
        'New feature works',
        'Old features work',
        'Tested multiple times',
        'No API keys exposed',
        'Error handling works',
      ],
    },
  },
  {
    slug: 'brownfield-voice-agent',
    title: 'Modify Existing Voice Agent',
    subtitle: 'Change VAPI agent behavior or add features',
    category: 'brownfield',
    projectType: 'voice-agent',
    steps: [
      {
        id: 'bv-1',
        title: 'Go to the Project Folder',
        commands: ['cd ~/Desktop/Projects/voice/existing-voice-agent'],
      },
      {
        id: 'bv-2',
        title: 'Check Git Status',
        commands: ['git status && git branch'],
      },
      {
        id: 'bv-3',
        title: 'Start Claude Code',
        commands: ['claude'],
      },
      {
        id: 'bv-4',
        title: 'Explore the Webhook Code',
        commands: ['/brownfield-explore'],
        tips: [
          '"Show me how this voice agent works. What VAPI webhooks does it handle? What functions does the agent have?"',
        ],
      },
      {
        id: 'bv-5',
        title: 'Check VAPI Dashboard',
        description: 'Go to VAPI dashboard and note:',
        tips: [
          'Assistant name and ID',
          'Current system prompt',
          'Functions defined',
          'Voice settings',
        ],
      },
      {
        id: 'bv-6',
        title: 'Create Feature Branch',
        commands: ['git checkout -b feature/add-transfer'],
      },
      {
        id: 'bv-7a',
        title: 'To Change What the Agent Says',
        description: 'Edit the system prompt in VAPI Dashboard → Assistant → Edit',
      },
      {
        id: 'bv-7b',
        title: 'To Add a New Function',
        commands: ['/gsd:quick'],
        tips: [
          '"Add a transfer_to_human function to the VAPI agent. When called, it should transfer the call to +1234567890. Add the handler in the webhook."',
        ],
      },
      {
        id: 'bv-7c',
        title: 'To Change the Voice',
        description: 'VAPI Dashboard → Assistant → Voice → Choose new voice',
      },
      {
        id: 'bv-7d',
        title: 'To Add a New Webhook Handler',
        commands: ['/supabase-edge'],
        tips: [
          '"Add a handler for the \'transcript\' event that saves each message in realtime to Supabase."',
        ],
      },
      {
        id: 'bv-8',
        title: 'Test in VAPI Dashboard First',
        description: 'VAPI Dashboard → Your Assistant → Test tab → Make a web call',
      },
      {
        id: 'bv-9',
        title: 'Test with Real Phone Call',
        description: 'Call your number and test:',
        tips: [
          'New feature works',
          'Old features still work',
          'No awkward pauses',
          'Functions respond quickly',
        ],
      },
      {
        id: 'bv-10',
        title: "If Something Doesn't Work",
        commands: ['/sf'],
        tips: [
          '"The transfer_to_human function isn\'t working. The agent says it will transfer but nothing happens. Here\'s what I see in the logs: [paste logs]"',
        ],
      },
      {
        id: 'bv-11',
        title: 'Deploy Webhook Changes',
        description: 'Note: VAPI dashboard changes are instant. Only webhook code needs deploying.',
        commands: ['/git-flow', '/quick-deploy'],
      },
    ],
    checklist: {
      title: 'Before You Go Live - Check These',
      items: [
        'Web call test passed',
        'Real phone call test passed',
        'All functions work',
        'No awkward silences',
        'Webhook URL is correct',
        'Calls save to database',
      ],
    },
  },
  {
    slug: 'brownfield-ai-platform',
    title: 'Modify Existing AI Platform',
    subtitle: 'Add features to multi-user platform (be careful!)',
    category: 'brownfield',
    projectType: 'ai-platform',
    steps: [
      {
        id: 'bp-warn',
        title: 'WARNING: Platform Changes Affect Everyone',
        warning:
          'Platforms have multiple users. A bug affects ALL of them. Always test thoroughly and deploy during low-traffic times.',
      },
      {
        id: 'bp-1',
        title: 'Go to the Project Folder',
        commands: ['cd ~/Desktop/Projects/platforms/existing-platform'],
      },
      {
        id: 'bp-2',
        title: 'Check Git Status',
        commands: ['git status && git branch'],
      },
      {
        id: 'bp-3',
        title: 'Start Claude Code',
        commands: ['claude'],
      },
      {
        id: 'bp-4',
        title: 'Explore the Codebase Thoroughly',
        commands: ['/brownfield-explore'],
        tips: [
          '"I need to add a usage analytics dashboard. Show me how the platform is structured, how data is isolated per organization, and where analytics might fit."',
        ],
      },
      {
        id: 'bp-4b',
        title: 'For Deeper Understanding',
        commands: ['/gsd:analyze-codebase'],
      },
      {
        id: 'bp-5',
        title: 'Create Feature Branch',
        commands: ['git checkout -b feature/usage-analytics'],
      },
      {
        id: 'bp-6a',
        title: 'For Small Changes (UI tweaks, admin features)',
        commands: ['/gsd:quick'],
        tips: [
          '"Add a usage chart to the admin dashboard showing messages per day for the last 30 days. Only super admins should see this."',
        ],
      },
      {
        id: 'bp-6b',
        title: 'For Medium Changes (new features)',
        commands: ['/gsd:new-milestone'],
        tips: [
          '"Add usage analytics feature. Each organization should see their own usage stats. Include: messages sent, API calls made, and cost estimate."',
        ],
      },
      {
        id: 'bp-6b-phases',
        title: 'Work Through Phases',
        commands: ['/gsd:discuss-phase 1', '/gsd:plan-phase 1', '/gsd:execute-phase 1'],
      },
      {
        id: 'bp-6c',
        title: 'For Big Changes (database, auth, billing)',
        isMilestone: true,
        description: 'Do extra planning and run production audit first:',
        commands: ['/pr'],
        tips: ['Then use full GSD with careful testing.'],
      },
      {
        id: 'bp-7',
        title: 'If You Need Database Changes',
        commands: ['/sb'],
        tips: [
          '"Add a usage_logs table to track API calls per organization. Include: org_id, endpoint, tokens_used, cost, created_at. Add RLS so each org only sees their own data."',
        ],
      },
      {
        id: 'bp-8',
        title: 'Test As Different Users',
        description: 'Test your changes as:',
        tips: [
          'Super admin',
          'Organization admin',
          'Regular user',
          'User from DIFFERENT organization (check isolation!)',
        ],
      },
      {
        id: 'bp-9',
        title: 'Verify Data Isolation',
        description: 'Ask Claude to check:',
        tips: [
          '"Check if User A from Organization 1 can see any data from Organization 2. Test the new usage_logs table specifically."',
        ],
      },
      {
        id: 'bp-10',
        title: 'Deploy to Staging First',
        commands: ['/git-flow'],
        tips: ['Deploy to staging and test there before production.'],
      },
      {
        id: 'bp-11',
        title: 'Deploy to Production (Off-Peak Hours)',
        commands: ['/full-deploy'],
        tips: ['Monitor for 24 hours. Be ready to rollback.'],
      },
    ],
    checklist: {
      title: 'Platform Change Checklist',
      items: [
        'Explored codebase first',
        'Understood multi-tenant structure',
        'RLS policies correct',
        'Tested as all user types',
        'Data isolation verified',
        'Deployed to staging first',
        'Production deploy off-peak',
        'Monitoring active',
      ],
    },
  },

  // ==================== WORKFLOWS ====================
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
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export function getGuidesByCategory(category: GuideCategory): Guide[] {
  return guides.filter((g) => g.category === category);
}
