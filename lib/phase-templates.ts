/**
 * Phase templates for project roadmaps
 * Each project type has pre-defined phases with checklist items
 */

export type ProjectType = 'ai_agent' | 'web_design' | 'seo' | 'ads';

export interface PhaseItemTemplate {
  templateKey: string;
  title: string;
  description?: string;
  helperText?: string;
}

export interface PhaseTemplate {
  templateKey: string;
  name: string;
  description?: string;
  helperText?: string;
  items: PhaseItemTemplate[];
}

export interface ProjectTypeConfig {
  projectType: ProjectType;
  label: string;
  description: string;
  phases: PhaseTemplate[];
}

// ============================================
// AI AGENT PROJECT TEMPLATE
// ============================================
export const AI_AGENT_PHASES: PhaseTemplate[] = [
  {
    templateKey: 'ai_research',
    name: 'Research & Planning',
    description: 'Define scope and technical approach',
    helperText: 'Thorough planning reduces development iterations',
    items: [
      {
        templateKey: 'define_purpose',
        title: 'Define agent purpose and capabilities',
        description: 'Document the problem being solved',
        helperText: 'Document the problem being solved and expected outcomes',
      },
      {
        templateKey: 'research_similar',
        title: 'Research similar implementations',
        description: 'Find reference architectures',
        helperText: 'Identify 2-3 reference implementations for architecture guidance',
      },
      {
        templateKey: 'choose_framework',
        title: 'Select framework and tools',
        description: 'Choose technical stack',
        helperText: 'Select based on integration requirements and team familiarity',
      },
    ],
  },
  {
    templateKey: 'ai_describe',
    name: 'Describe',
    description: 'Write clear prompts for AI code generation',
    helperText: 'Detailed specifications improve initial output quality',
    items: [
      {
        templateKey: 'write_prompt',
        title: 'Write detailed prompt specification',
        description: 'Define inputs, outputs, and behavior',
        helperText: 'Include context about project architecture and constraints',
      },
      {
        templateKey: 'example_io',
        title: 'Provide example inputs and outputs',
        description: 'Concrete examples for expected behavior',
        helperText: 'Examples clarify requirements more effectively than descriptions',
      },
      {
        templateKey: 'error_handling',
        title: 'Specify error handling requirements',
        description: 'Define failure modes and recovery',
        helperText: 'Address edge cases early to reduce debugging time',
      },
    ],
  },
  {
    templateKey: 'ai_generate',
    name: 'Generate & Iterate',
    description: 'Build through AI-assisted development cycles',
    helperText: 'Expect 3-5 iterations for production-ready code',
    items: [
      {
        templateKey: 'initial_code',
        title: 'Generate initial code',
        description: 'First AI-generated implementation',
        helperText: 'Provide detailed context for better initial output',
      },
      {
        templateKey: 'run_test',
        title: 'Run and test output',
        description: 'Verify with realistic data',
        helperText: 'Test with production-like data to surface real issues',
      },
      {
        templateKey: 'paste_errors',
        title: 'Debug and refine',
        description: 'Address errors and edge cases',
        helperText: 'Include full error context for accurate debugging',
      },
      {
        templateKey: 'iterate_complete',
        title: 'Complete iteration cycles',
        description: 'Repeat until requirements are met',
        helperText: 'Track iterations to identify recurring issues',
      },
    ],
  },
  {
    templateKey: 'ai_integrate',
    name: 'Integration',
    description: 'Connect to external services and data',
    helperText: 'Validate integrations individually before combining',
    items: [
      {
        templateKey: 'connect_apis',
        title: 'Connect external APIs',
        description: 'Integrate required services',
        helperText: 'Start with one integration, validate, then add more',
      },
      {
        templateKey: 'setup_env',
        title: 'Configure environment variables',
        description: 'Set up secrets and configuration',
        helperText: 'Use environment files, never commit secrets to repository',
      },
      {
        templateKey: 'test_real_data',
        title: 'Test with production data',
        description: 'Validate against real scenarios',
        helperText: 'Synthetic data may hide integration issues',
      },
    ],
  },
  {
    templateKey: 'ai_deploy',
    name: 'Deploy',
    description: 'Ship to production environment',
    helperText: 'Verify all configuration before public access',
    items: [
      {
        templateKey: 'push_github',
        title: 'Push to GitHub',
        description: 'Commit with documentation',
        helperText: 'Include README with setup and usage instructions',
      },
      {
        templateKey: 'setup_hosting',
        title: 'Deploy to hosting platform',
        description: 'Configure production environment',
        helperText: 'Vercel or Railway recommended for initial deployment',
      },
      {
        templateKey: 'configure_secrets',
        title: 'Configure production secrets',
        description: 'Set environment variables in production',
        helperText: 'Verify all required secrets are configured before launch',
      },
    ],
  },
  {
    templateKey: 'ai_document',
    name: 'Document & Share',
    description: 'Prepare for handoff and maintenance',
    helperText: 'Documentation enables team scaling',
    items: [
      {
        templateKey: 'write_readme',
        title: 'Write documentation',
        description: 'Installation, usage, and examples',
        helperText: 'Include troubleshooting section for common issues',
      },
      {
        templateKey: 'record_demo',
        title: 'Record demonstration',
        description: 'Video walkthrough of functionality',
        helperText: 'Visual demonstrations clarify usage faster than text',
      },
      {
        templateKey: 'share_team',
        title: 'Share with stakeholders',
        description: 'Collect feedback from users',
        helperText: 'Early feedback enables iterative improvement',
      },
    ],
  },
];

// ============================================
// WEBSITE PROJECT TEMPLATE
// ============================================
export const WEBSITE_PHASES: PhaseTemplate[] = [
  {
    templateKey: 'web_discovery',
    name: 'Discovery',
    description: 'Gather requirements and research',
    helperText: 'Clear requirements prevent scope changes',
    items: [
      {
        templateKey: 'gather_requirements',
        title: 'Gather client requirements',
        description: 'Document goals and constraints',
        helperText: 'Document specific goals, not just features',
      },
      {
        templateKey: 'research_competitors',
        title: 'Research competitor sites',
        description: 'Analyze market positioning',
        helperText: 'Screenshot effective patterns for reference',
      },
      {
        templateKey: 'define_sitemap',
        title: 'Define site structure',
        description: 'Map pages and navigation',
        helperText: 'Start minimal, expand based on content needs',
      },
    ],
  },
  {
    templateKey: 'web_design',
    name: 'Design',
    description: 'Visual planning before development',
    helperText: 'Design changes are faster than code changes',
    items: [
      {
        templateKey: 'create_wireframes',
        title: 'Create wireframes',
        description: 'Layout structure and flow',
        helperText: 'Focus on layout and hierarchy, not visual details',
      },
      {
        templateKey: 'client_approval',
        title: 'Get design approval',
        description: 'Confirm direction before coding',
        helperText: 'Written approval prevents scope disputes',
      },
      {
        templateKey: 'choose_stack',
        title: 'Finalize tech stack',
        description: 'Select framework and hosting',
        helperText: 'Match complexity to requirements',
      },
    ],
  },
  {
    templateKey: 'web_vibe_code',
    name: 'Vibe Code',
    description: 'Build through AI-assisted development',
    helperText: 'Reference approved designs in prompts',
    items: [
      {
        templateKey: 'describe_pages',
        title: 'Describe pages to AI',
        description: 'Generate page structures',
        helperText: 'Reference approved mockups and competitor examples',
      },
      {
        templateKey: 'generate_components',
        title: 'Generate components',
        description: 'Build reusable UI elements',
        helperText: 'Start with layout structure before styling details',
      },
      {
        templateKey: 'iterate_looks',
        title: 'Iterate until complete',
        description: 'Refine through feedback',
        helperText: 'Share progress with stakeholders for early feedback',
      },
    ],
  },
  {
    templateKey: 'web_polish',
    name: 'Polish',
    description: 'Refine for production quality',
    helperText: 'Details differentiate professional work',
    items: [
      {
        templateKey: 'mobile_responsive',
        title: 'Ensure mobile responsiveness',
        description: 'Test on actual devices',
        helperText: 'Test on physical devices, not just browser resize',
      },
      {
        templateKey: 'animations',
        title: 'Add interactions',
        description: 'Transitions and micro-interactions',
        helperText: 'Subtle animations improve perceived quality',
      },
      {
        templateKey: 'seo_basics',
        title: 'Implement SEO basics',
        description: 'Meta tags and performance',
        helperText: 'Core Web Vitals affect search ranking',
      },
    ],
  },
  {
    templateKey: 'web_deploy',
    name: 'Deploy',
    description: 'Launch to production',
    helperText: 'Verify all environments before public access',
    items: [
      {
        templateKey: 'push_github_web',
        title: 'Push to repository',
        description: 'Version control and backup',
        helperText: 'Use descriptive commit messages for history',
      },
      {
        templateKey: 'deploy_vercel',
        title: 'Deploy to Vercel',
        description: 'Production hosting',
        helperText: 'Enable preview deployments for easier testing',
      },
      {
        templateKey: 'connect_domain',
        title: 'Connect domain',
        description: 'DNS and SSL configuration',
        helperText: 'SSL is automatic on Vercel',
      },
    ],
  },
  {
    templateKey: 'web_handoff',
    name: 'Handoff',
    description: 'Transfer to client',
    helperText: 'Enable client self-sufficiency',
    items: [
      {
        templateKey: 'client_walkthrough',
        title: 'Conduct client walkthrough',
        description: 'Demonstrate functionality',
        helperText: 'Record session for future reference',
      },
      {
        templateKey: 'documentation',
        title: 'Provide documentation',
        description: 'Access and maintenance guides',
        helperText: 'Include credentials and contact information',
      },
      {
        templateKey: 'training',
        title: 'Deliver training',
        description: 'Enable content updates',
        helperText: 'Focus on tasks client will perform regularly',
      },
    ],
  },
];

// ============================================
// SEO PROJECT TEMPLATE
// ============================================
export const SEO_PHASES: PhaseTemplate[] = [
  {
    templateKey: 'seo_audit',
    name: 'Site Audit',
    description: 'Analyze current state',
    helperText: 'Baseline metrics enable progress tracking',
    items: [
      {
        templateKey: 'technical_audit',
        title: 'Run technical audit',
        description: 'Crawl errors, speed, mobile',
        helperText: 'Use Screaming Frog or similar crawler',
      },
      {
        templateKey: 'keyword_research',
        title: 'Analyze current rankings',
        description: 'Document existing positions',
        helperText: 'Export data from Google Search Console',
      },
      {
        templateKey: 'competitor_analysis',
        title: 'Analyze competitors',
        description: 'Identify ranking gaps',
        helperText: 'Focus on achievable keyword opportunities',
      },
    ],
  },
  {
    templateKey: 'seo_strategy',
    name: 'Strategy',
    description: 'Plan optimization approach',
    helperText: 'Prioritize high-impact, low-effort items',
    items: [
      {
        templateKey: 'target_keywords',
        title: 'Define target keywords',
        description: 'Prioritized keyword list',
        helperText: 'Balance search volume with ranking difficulty',
      },
      {
        templateKey: 'content_plan',
        title: 'Create content plan',
        description: 'Map keywords to pages',
        helperText: 'Identify content gaps and opportunities',
      },
      {
        templateKey: 'priority_fixes',
        title: 'Prioritize technical fixes',
        description: 'Ordered remediation list',
        helperText: 'Address quick wins before major projects',
      },
    ],
  },
  {
    templateKey: 'seo_technical',
    name: 'Technical Fixes',
    description: 'Resolve infrastructure issues',
    helperText: 'Technical foundation enables content success',
    items: [
      {
        templateKey: 'fix_crawl_errors',
        title: 'Fix crawl errors',
        description: 'Resolve 404s and redirects',
        helperText: 'Monitor Search Console for new issues',
      },
      {
        templateKey: 'improve_speed',
        title: 'Improve site speed',
        description: 'Optimize performance metrics',
        helperText: 'Target sub-3-second load time',
      },
      {
        templateKey: 'mobile_optimize',
        title: 'Optimize for mobile',
        description: 'Mobile-first improvements',
        helperText: 'Google uses mobile-first indexing',
      },
      {
        templateKey: 'schema_markup',
        title: 'Add structured data',
        description: 'Schema markup implementation',
        helperText: 'Start with Organization and FAQ schemas',
      },
    ],
  },
  {
    templateKey: 'seo_content',
    name: 'Content Optimization',
    description: 'Improve and create content',
    helperText: 'Quality content addresses user intent',
    items: [
      {
        templateKey: 'optimize_existing',
        title: 'Optimize existing pages',
        description: 'Update titles, metas, content',
        helperText: 'Prioritize pages close to ranking',
      },
      {
        templateKey: 'create_new_content',
        title: 'Create new content',
        description: 'Target keyword opportunities',
        helperText: 'Focus on user value over keyword density',
      },
      {
        templateKey: 'internal_linking',
        title: 'Improve internal linking',
        description: 'Connect related content',
        helperText: 'Strengthen topical clusters',
      },
    ],
  },
  {
    templateKey: 'seo_offpage',
    name: 'Off-Page SEO',
    description: 'Build external authority',
    helperText: 'Quality links outweigh quantity',
    items: [
      {
        templateKey: 'link_building',
        title: 'Execute link building',
        description: 'Outreach and acquisition',
        helperText: 'Focus on relevant, authoritative sources',
      },
      {
        templateKey: 'local_seo',
        title: 'Optimize local presence',
        description: 'Google Business and citations',
        helperText: 'Essential for location-based businesses',
      },
      {
        templateKey: 'social_signals',
        title: 'Build social presence',
        description: 'Brand visibility and engagement',
        helperText: 'Social supports brand, not direct ranking',
      },
    ],
  },
  {
    templateKey: 'seo_report',
    name: 'Report & Monitor',
    description: 'Track and communicate progress',
    helperText: 'SEO is ongoing optimization',
    items: [
      {
        templateKey: 'setup_tracking',
        title: 'Configure rank tracking',
        description: 'Automated position monitoring',
        helperText: 'Weekly tracking captures meaningful trends',
      },
      {
        templateKey: 'monthly_reports',
        title: 'Deliver monthly reports',
        description: 'Progress and insights',
        helperText: 'Focus on trends over individual data points',
      },
      {
        templateKey: 'ongoing_optimization',
        title: 'Plan ongoing work',
        description: 'Maintenance and improvement',
        helperText: 'Define recurring optimization schedule',
      },
    ],
  },
];

// ============================================
// ADS PROJECT TEMPLATE
// ============================================
export const ADS_PHASES: PhaseTemplate[] = [
  {
    templateKey: 'ads_research',
    name: 'Research & Strategy',
    description: 'Define goals and approach',
    helperText: 'Clear goals enable performance measurement',
    items: [
      {
        templateKey: 'define_goals',
        title: 'Define campaign objectives',
        description: 'Leads, sales, or awareness',
        helperText: 'Set specific, measurable targets',
      },
      {
        templateKey: 'audience_research',
        title: 'Research target audience',
        description: 'Demographics and interests',
        helperText: 'Specific targeting reduces wasted spend',
      },
      {
        templateKey: 'competitor_ads',
        title: 'Analyze competitor ads',
        description: 'Creative and messaging review',
        helperText: 'Use Facebook Ad Library and Google Ads Transparency',
      },
      {
        templateKey: 'budget_planning',
        title: 'Set budget and timeline',
        description: 'Spending plan and milestones',
        helperText: 'Start small, scale based on performance',
      },
    ],
  },
  {
    templateKey: 'ads_setup',
    name: 'Account Setup',
    description: 'Configure tracking infrastructure',
    helperText: 'Accurate tracking enables optimization',
    items: [
      {
        templateKey: 'create_accounts',
        title: 'Create ad accounts',
        description: 'Platform account configuration',
        helperText: 'Use client business accounts when possible',
      },
      {
        templateKey: 'install_pixels',
        title: 'Install tracking pixels',
        description: 'Conversion and audience tracking',
        helperText: 'Verify pixel firing before campaign launch',
      },
      {
        templateKey: 'setup_conversions',
        title: 'Configure conversions',
        description: 'Define success events',
        helperText: 'Track both micro and macro conversions',
      },
    ],
  },
  {
    templateKey: 'ads_creative',
    name: 'Creative Development',
    description: 'Build ad assets',
    helperText: 'Creative quality drives performance',
    items: [
      {
        templateKey: 'write_copy',
        title: 'Write ad copy',
        description: 'Headlines and descriptions',
        helperText: 'Prepare multiple variations for testing',
      },
      {
        templateKey: 'design_visuals',
        title: 'Design visual assets',
        description: 'Images and video',
        helperText: 'Video typically outperforms static images',
      },
      {
        templateKey: 'create_landing',
        title: 'Create landing pages',
        description: 'Campaign-specific destinations',
        helperText: 'Match landing page message to ad creative',
      },
    ],
  },
  {
    templateKey: 'ads_launch',
    name: 'Campaign Launch',
    description: 'Activate campaigns',
    helperText: 'Monitor closely in the first week',
    items: [
      {
        templateKey: 'build_campaigns',
        title: 'Build campaign structure',
        description: 'Campaigns, ad sets, ads',
        helperText: 'Organize for clear reporting and optimization',
      },
      {
        templateKey: 'set_targeting',
        title: 'Configure targeting',
        description: 'Audiences and placements',
        helperText: 'Start broader, narrow based on data',
      },
      {
        templateKey: 'launch_campaigns',
        title: 'Launch campaigns',
        description: 'Activate and monitor',
        helperText: 'Check performance daily during initial period',
      },
    ],
  },
  {
    templateKey: 'ads_optimize',
    name: 'Optimization',
    description: 'Improve performance iteratively',
    helperText: 'Data-driven decisions outperform intuition',
    items: [
      {
        templateKey: 'analyze_data',
        title: 'Analyze performance data',
        description: 'Identify patterns and issues',
        helperText: 'Allow sufficient data before conclusions',
      },
      {
        templateKey: 'ab_testing',
        title: 'Run A/B tests',
        description: 'Test creative and targeting',
        helperText: 'Test one variable at a time for clarity',
      },
      {
        templateKey: 'scale_winners',
        title: 'Scale winning ads',
        description: 'Increase successful spend',
        helperText: 'Scale gradually to maintain efficiency',
      },
      {
        templateKey: 'kill_losers',
        title: 'Pause underperformers',
        description: 'Cut unsuccessful elements',
        helperText: 'Reallocate budget to proven performers',
      },
    ],
  },
  {
    templateKey: 'ads_report',
    name: 'Reporting',
    description: 'Communicate results',
    helperText: 'Clear reporting builds client trust',
    items: [
      {
        templateKey: 'setup_dashboards',
        title: 'Create reporting dashboards',
        description: 'Automated data visualization',
        helperText: 'Use Looker Studio or similar for automation',
      },
      {
        templateKey: 'weekly_updates',
        title: 'Send weekly updates',
        description: 'Regular performance summaries',
        helperText: 'Highlight wins and actionable insights',
      },
      {
        templateKey: 'monthly_review',
        title: 'Conduct monthly review',
        description: 'Strategic analysis and planning',
        helperText: 'Adjust strategy based on cumulative results',
      },
    ],
  },
];

// ============================================
// TEMPLATE REGISTRY
// ============================================
export const PROJECT_PHASE_TEMPLATES: Record<ProjectType, ProjectTypeConfig> = {
  ai_agent: {
    projectType: 'ai_agent',
    label: 'AI Agent',
    description: 'Build AI-powered agents and assistants',
    phases: AI_AGENT_PHASES,
  },
  web_design: {
    projectType: 'web_design',
    label: 'Website',
    description: 'Design and build websites',
    phases: WEBSITE_PHASES,
  },
  seo: {
    projectType: 'seo',
    label: 'SEO',
    description: 'Search engine optimization campaigns',
    phases: SEO_PHASES,
  },
  ads: {
    projectType: 'ads',
    label: 'Ads',
    description: 'Paid advertising campaigns',
    phases: ADS_PHASES,
  },
};

/**
 * Get phase templates for a project type
 */
export function getPhaseTemplates(projectType: ProjectType | null): PhaseTemplate[] {
  if (!projectType || !PROJECT_PHASE_TEMPLATES[projectType]) {
    return [];
  }
  return PROJECT_PHASE_TEMPLATES[projectType].phases;
}

/**
 * Get project type configuration
 */
export function getProjectTypeConfig(projectType: ProjectType): ProjectTypeConfig | null {
  return PROJECT_PHASE_TEMPLATES[projectType] || null;
}

/**
 * Count total items across all phases for a template
 */
export function countTemplateItems(phases: PhaseTemplate[]): number {
  return phases.reduce((sum, phase) => sum + phase.items.length, 0);
}

/**
 * Get all project types with their configs
 */
export function getAllProjectTypes(): ProjectTypeConfig[] {
  return Object.values(PROJECT_PHASE_TEMPLATES);
}
