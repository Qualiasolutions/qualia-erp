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
          'OpenAI/Google AI keys → Their developer dashboards',
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
        commands: ['cd ~/Desktop/Projects/[category]/[project]', 'claude'],
      },
      {
        id: 'qc-2',
        title: 'Building Features (GSD Commands)',
        description: 'These commands manage the full build cycle:',
        commands: [
          '/qualia:new-project — Start a brand new project',
          '/qualia:plan-phase 1 — Plan what to build',
          '/qualia:execute-phase 1 — Build it',
          '/qualia:verify-work — Check everything works',
          '/qualia:quick — Quick task (skip full planning)',
        ],
      },
      {
        id: 'qc-3',
        title: 'Specialist Commands',
        description: 'Call in specialists for specific work:',
        commands: [
          '/frontend-master — Build UI components and design',
          '/supabase — Database operations (tables, RLS, migrations)',
          '/voice-agent — Build/modify VAPI voice agents',
          '/debug — Fix bugs systematically',
          '/responsive — Fix mobile/tablet layout issues',
        ],
      },
      {
        id: 'qc-4',
        title: 'Deployment Commands',
        description: 'Get your code live:',
        commands: [
          '/ship — Full deploy pipeline (lint, test, build, deploy, verify)',
          '/deploy — Deploy to Vercel',
          '/deploy-verify — Run post-deploy checks',
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
          '2. Check what needs doing: /qualia:progress',
          '3. Build: /qualia:execute-phase or /qualia:quick for small tasks',
          '4. Test: /qualia:verify-work',
          '5. Deploy: /ship or /deploy',
          '6. Before closing: /handoff to save context',
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
        'Know the build cycle: plan → execute → verify',
        'Know specialist commands for UI, DB, voice',
        'Know how to deploy: /ship or /deploy',
        'Know how to check progress: /qualia:progress',
        'Save context before closing: /handoff',
      ],
    },
  },
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
