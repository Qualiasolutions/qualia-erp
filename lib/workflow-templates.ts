/**
 * Workflow Templates for Project Types
 * Maps project_type to prefilled phases and tasks
 * Based on the guide data from lib/guides-data.ts
 */

export type ProjectType = 'web_design' | 'ai_agent' | 'voice_agent' | 'seo' | 'ads';

export interface WorkflowTask {
  title: string;
  description?: string;
  helperText?: string; // Command or prompt to copy
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
// WEBSITE WORKFLOW (from greenfield-website guide)
// ============================================================================
const WEBSITE_WORKFLOW: WorkflowPhase[] = [
  {
    name: 'SETUP',
    description: 'Initialize project and gather requirements',
    tasks: [
      {
        title: 'Create project folder',
        description: 'Set up the project directory structure',
        helperText: 'cd ~/Desktop/Projects/websites && mkdir [project-name] && cd [project-name]',
      },
      {
        title: 'Initialize with Claude Code',
        description: 'Start Claude and initialize the project',
        helperText: 'claude\n/gsd:new-project',
      },
    ],
  },
  {
    name: 'PLAN',
    description: 'Design the website structure and components',
    tasks: [
      {
        title: 'Discuss requirements',
        description: 'Clarify what needs to be built',
        helperText: '/gsd:discuss-phase 1',
      },
      {
        title: 'Create implementation plan',
        description: 'Plan the build approach',
        helperText: '/gsd:plan-phase 1',
      },
    ],
  },
  {
    name: 'EXECUTE',
    description: 'Build the website',
    tasks: [
      {
        title: 'Build Phase 1',
        description: 'Execute the first phase of development',
        helperText: '/gsd:execute-phase 1',
      },
      {
        title: 'Design UI components',
        description: 'Create visually appealing components',
        helperText:
          '/fd\n"Design a modern hero section with gradient background, headline, subtext, and CTA button"',
      },
      {
        title: 'Set up database tables',
        description: 'Create Supabase tables if needed',
        helperText:
          '/sb\n"Create contact_submissions table with name, email, phone, message, created_at. Add RLS policies."',
      },
      {
        title: 'Continue remaining phases',
        description: 'Work through all phases in the roadmap',
        helperText: '/gsd:discuss-phase 2\n/gsd:plan-phase 2\n/gsd:execute-phase 2',
      },
    ],
  },
  {
    name: 'VERIFY',
    description: 'Test and validate the website',
    tasks: [
      {
        title: 'Verify functionality',
        description: 'Run verification checks',
        helperText: '/gsd:verify-work',
      },
      {
        title: 'Test mobile responsiveness',
        description: 'Ensure site works on all screen sizes',
      },
      {
        title: 'Check all links and forms',
        description: 'Verify navigation and form submissions work',
      },
      {
        title: 'Review console for errors',
        description: 'Check browser console for any errors',
      },
    ],
  },
  {
    name: 'SHIP',
    description: 'Deploy and hand off',
    tasks: [
      {
        title: 'Commit changes',
        description: 'Save all code to git',
        helperText: '/git-flow',
      },
      {
        title: 'Deploy to Vercel',
        description: 'Push to production',
        helperText: '/quick-deploy',
      },
      {
        title: 'Add env vars in Vercel',
        description: 'Configure Supabase and other environment variables',
      },
      {
        title: 'Complete milestone',
        description: 'Mark project as complete',
        helperText: '/gsd:complete-milestone',
      },
    ],
  },
];

// ============================================================================
// AI AGENT WORKFLOW (from greenfield-ai-agent guide)
// ============================================================================
const AI_AGENT_WORKFLOW: WorkflowPhase[] = [
  {
    name: 'SETUP',
    description: 'Initialize AI agent project',
    tasks: [
      {
        title: 'Create project folder',
        description: 'Set up the project directory',
        helperText: 'cd ~/Desktop/Projects/aiagents && mkdir [project-name] && cd [project-name]',
      },
      {
        title: 'Initialize with Claude Code',
        description: 'Start Claude and describe the agent',
        helperText: 'claude\n/gsd:new-project',
      },
    ],
  },
  {
    name: 'PLAN',
    description: 'Design agent architecture',
    tasks: [
      {
        title: 'Define agent behavior',
        description: 'Discuss what the agent should do and how',
        helperText: '/gsd:discuss-phase 1',
      },
      {
        title: 'Plan implementation',
        description: 'Create the build plan',
        helperText: '/gsd:plan-phase 1',
      },
    ],
  },
  {
    name: 'EXECUTE',
    description: 'Build the AI agent',
    tasks: [
      {
        title: 'Set up database',
        description: 'Create conversations and messages tables',
        helperText:
          '/sb\n"Create tables for conversations (id, user_id, created_at, title) and messages (id, conversation_id, role, content, created_at)"',
      },
      {
        title: 'Build chat UI',
        description: 'Create the chat interface',
        helperText:
          '/fd\n"Design a clean chat interface with message list, input box, and typing indicator. Modern like ChatGPT."',
      },
      {
        title: 'Execute build phases',
        description: 'Work through all development phases',
        helperText: '/gsd:execute-phase 1',
      },
    ],
  },
  {
    name: 'VERIFY',
    description: 'Test the agent',
    tasks: [
      {
        title: 'Test conversations',
        description: 'Have multiple test conversations with the agent',
      },
      {
        title: 'Verify message persistence',
        description: 'Check that messages save to database correctly',
      },
      {
        title: 'Test conversation history',
        description: 'Ensure the agent remembers context',
      },
      {
        title: 'Run verification',
        description: 'Execute verification checks',
        helperText: '/gsd:verify-work',
      },
    ],
  },
  {
    name: 'SHIP',
    description: 'Deploy the agent',
    tasks: [
      {
        title: 'Commit and push',
        description: 'Save code to repository',
        helperText: '/git-flow',
      },
      {
        title: 'Deploy to production',
        description: 'Deploy the application',
        helperText: '/quick-deploy',
      },
      {
        title: 'Configure API keys',
        description: 'Add OPENAI_API_KEY and Supabase keys to Vercel',
      },
      {
        title: 'Complete milestone',
        description: 'Mark as complete',
        helperText: '/gsd:complete-milestone',
      },
    ],
  },
];

// ============================================================================
// VOICE AGENT WORKFLOW (from greenfield-voice-agent guide)
// ============================================================================
const VOICE_AGENT_WORKFLOW: WorkflowPhase[] = [
  {
    name: 'SETUP',
    description: 'Initialize voice agent project',
    tasks: [
      {
        title: 'Create project folder',
        description: 'Set up the project directory',
        helperText: 'cd ~/Desktop/Projects/voice && mkdir [project-name] && cd [project-name]',
      },
      {
        title: 'Initialize with Claude Code',
        description: 'Start Claude and describe the voice agent',
        helperText: 'claude\n/gsd:new-project',
      },
    ],
  },
  {
    name: 'PLAN',
    description: 'Script the voice experience',
    tasks: [
      {
        title: 'Define voice flow',
        description: 'Plan the conversation flow and responses',
        helperText: '/gsd:discuss-phase 1',
      },
      {
        title: 'Plan implementation',
        description: 'Create the technical plan',
        helperText: '/gsd:plan-phase 1',
      },
    ],
  },
  {
    name: 'EXECUTE',
    description: 'Build with VAPI',
    tasks: [
      {
        title: 'Set up database',
        description: 'Create tables for calls and related data',
        helperText:
          '/sb\n"Create tables for calls (id, vapi_call_id, phone_number, status, duration, created_at) and any business-specific tables"',
      },
      {
        title: 'Build VAPI assistant',
        description: 'Create and configure the voice assistant',
        helperText:
          '/va\n"Create a VAPI assistant that greets callers, handles [use case], and confirms actions. Use a friendly voice."',
      },
      {
        title: 'Create webhook handlers',
        description: 'Build edge functions to handle VAPI events',
        helperText:
          '/supabase-edge\n"Create edge function for VAPI webhooks: function-call events, end-of-call-report to save transcripts"',
      },
    ],
  },
  {
    name: 'VERIFY',
    description: 'Test calls and edge cases',
    tasks: [
      {
        title: 'Test in VAPI dashboard',
        description: 'Make test calls from the VAPI web interface',
      },
      {
        title: 'Connect phone number',
        description: 'Buy/import number in VAPI and assign assistant',
      },
      {
        title: 'Test with real phone call',
        description: 'Call the number and test the full flow',
      },
      {
        title: 'Verify data saves correctly',
        description: 'Check that call data persists to database',
      },
    ],
  },
  {
    name: 'SHIP',
    description: 'Go live and monitor',
    tasks: [
      {
        title: 'Run verification',
        description: 'Final verification checks',
        helperText: '/gsd:verify-work',
      },
      {
        title: 'Commit and push',
        description: 'Save code to repository',
        helperText: '/git-flow',
      },
      {
        title: 'Deploy webhooks',
        description: 'Deploy edge functions',
        helperText: '/quick-deploy',
      },
      {
        title: 'Verify VAPI webhook URL',
        description: 'Ensure webhook URL is correctly configured in VAPI',
      },
      {
        title: 'Complete milestone',
        description: 'Mark as complete',
        helperText: '/gsd:complete-milestone',
      },
    ],
  },
];

// ============================================================================
// SEO WORKFLOW
// ============================================================================
const SEO_WORKFLOW: WorkflowPhase[] = [
  {
    name: 'SETUP',
    description: 'Audit and gather baseline data',
    tasks: [
      {
        title: 'Access client analytics',
        description: 'Get access to Google Analytics and Search Console',
      },
      {
        title: 'Run initial site audit',
        description: 'Analyze current SEO state with tools',
      },
      {
        title: 'Document baseline metrics',
        description: 'Record current rankings, traffic, and issues',
      },
    ],
  },
  {
    name: 'PLAN',
    description: 'Create SEO roadmap',
    tasks: [
      {
        title: 'Keyword research',
        description: 'Identify target keywords and search intent',
      },
      {
        title: 'Competitor analysis',
        description: 'Analyze top-ranking competitors',
      },
      {
        title: 'Create content plan',
        description: 'Plan content optimizations and new pages',
      },
      {
        title: 'Technical SEO plan',
        description: 'Identify technical fixes needed',
      },
    ],
  },
  {
    name: 'EXECUTE',
    description: 'Implement optimizations',
    tasks: [
      {
        title: 'Fix technical issues',
        description: 'Address crawl errors, speed, mobile issues',
      },
      {
        title: 'On-page optimization',
        description: 'Optimize titles, meta descriptions, headings',
      },
      {
        title: 'Content optimization',
        description: 'Update and improve existing content',
      },
      {
        title: 'Internal linking',
        description: 'Improve site structure and internal links',
      },
    ],
  },
  {
    name: 'VERIFY',
    description: 'Monitor rankings and traffic',
    tasks: [
      {
        title: 'Track keyword rankings',
        description: 'Monitor target keyword positions',
      },
      {
        title: 'Review traffic changes',
        description: 'Analyze organic traffic trends',
      },
      {
        title: 'Check indexing status',
        description: 'Verify pages are being indexed correctly',
      },
    ],
  },
  {
    name: 'SHIP',
    description: 'Report and ongoing plan',
    tasks: [
      {
        title: 'Create progress report',
        description: 'Document changes and results',
      },
      {
        title: 'Client presentation',
        description: 'Present findings and recommendations',
      },
      {
        title: 'Set up ongoing monitoring',
        description: 'Configure alerts and regular reporting',
      },
    ],
  },
];

// ============================================================================
// ADS WORKFLOW
// ============================================================================
const ADS_WORKFLOW: WorkflowPhase[] = [
  {
    name: 'SETUP',
    description: 'Set up ad accounts and tracking',
    tasks: [
      {
        title: 'Access ad accounts',
        description: 'Get access to Google Ads, Meta Ads, etc.',
      },
      {
        title: 'Set up conversion tracking',
        description: 'Install pixels and configure conversions',
      },
      {
        title: 'Define campaign goals',
        description: 'Document KPIs and target metrics',
      },
    ],
  },
  {
    name: 'PLAN',
    description: 'Create campaign strategy',
    tasks: [
      {
        title: 'Audience research',
        description: 'Define target audiences and segments',
      },
      {
        title: 'Budget allocation',
        description: 'Plan budget across campaigns and platforms',
      },
      {
        title: 'Creative strategy',
        description: 'Plan ad creatives and messaging',
      },
      {
        title: 'Landing page strategy',
        description: 'Plan landing pages for each campaign',
      },
    ],
  },
  {
    name: 'EXECUTE',
    description: 'Build and launch campaigns',
    tasks: [
      {
        title: 'Create ad creatives',
        description: 'Design images, videos, and copy',
      },
      {
        title: 'Build campaigns',
        description: 'Set up campaigns, ad sets, and ads',
      },
      {
        title: 'Configure targeting',
        description: 'Set up audience targeting and placements',
      },
      {
        title: 'Launch campaigns',
        description: 'Activate campaigns and monitor initial performance',
      },
    ],
  },
  {
    name: 'VERIFY',
    description: 'Monitor and optimize',
    tasks: [
      {
        title: 'Daily performance check',
        description: 'Review spend, impressions, clicks, conversions',
      },
      {
        title: 'A/B test analysis',
        description: 'Evaluate creative and audience tests',
      },
      {
        title: 'Optimize bids and budgets',
        description: 'Adjust based on performance data',
      },
    ],
  },
  {
    name: 'SHIP',
    description: 'Report and scale',
    tasks: [
      {
        title: 'Create performance report',
        description: 'Document results and insights',
      },
      {
        title: 'Client presentation',
        description: 'Present results and recommendations',
      },
      {
        title: 'Scale winning campaigns',
        description: 'Increase budget on successful campaigns',
      },
      {
        title: 'Plan next iteration',
        description: 'Document learnings and next steps',
      },
    ],
  },
];

// ============================================================================
// WORKFLOW TEMPLATES MAPPING
// ============================================================================
export const WORKFLOW_TEMPLATES: Record<ProjectType, WorkflowPhase[]> = {
  web_design: WEBSITE_WORKFLOW,
  ai_agent: AI_AGENT_WORKFLOW,
  voice_agent: VOICE_AGENT_WORKFLOW,
  seo: SEO_WORKFLOW,
  ads: ADS_WORKFLOW,
};

/**
 * Get workflow template for a project type
 */
export function getWorkflowTemplate(projectType: ProjectType | string | null): WorkflowPhase[] {
  if (!projectType) return WEBSITE_WORKFLOW;
  return WORKFLOW_TEMPLATES[projectType as ProjectType] || WEBSITE_WORKFLOW;
}

/**
 * Get total task count for a project type
 */
export function getWorkflowTaskCount(projectType: ProjectType | string | null): number {
  const phases = getWorkflowTemplate(projectType);
  return phases.reduce((total, phase) => total + phase.tasks.length, 0);
}
