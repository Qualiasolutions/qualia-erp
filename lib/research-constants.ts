export const RESEARCH_CATEGORIES = [
  'lead_generation',
  'competitor_analysis',
  'ai_tools',
  'voice_ai_trends',
  'partnerships',
  'industry_deep_dive',
  'seo_content',
  'pricing_strategies',
] as const;

export type ResearchCategory = (typeof RESEARCH_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ResearchCategory, string> = {
  lead_generation: 'Lead Generation',
  competitor_analysis: 'Competitor Analysis',
  ai_tools: 'AI Tools',
  voice_ai_trends: 'Voice AI Trends',
  partnerships: 'Partnerships',
  industry_deep_dive: 'Industry Deep Dive',
  seo_content: 'SEO & Content',
  pricing_strategies: 'Pricing Strategies',
};
