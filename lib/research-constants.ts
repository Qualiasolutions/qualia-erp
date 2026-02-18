// Research categories for the research feature
export const RESEARCH_CATEGORIES = [
  { value: 'lead_generation', label: 'Lead Generation' },
  { value: 'competitor_analysis', label: 'Competitor Analysis' },
  { value: 'ai_tools', label: 'AI Tools & Platforms' },
  { value: 'voice_ai', label: 'Voice AI & Conversational AI' },
  { value: 'partnerships', label: 'Partnerships' },
  { value: 'industry_research', label: 'Industry Research' },
  { value: 'marketing', label: 'SEO & Marketing' },
  { value: 'pricing', label: 'Pricing Strategies' },
  { value: 'general', label: 'General' },
] as const;

export type ResearchCategory = (typeof RESEARCH_CATEGORIES)[number]['value'];

export function getCategoryLabel(value: string): string {
  const category = RESEARCH_CATEGORIES.find((c) => c.value === value);
  return category?.label || value;
}

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  lead_generation: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/30',
  },
  competitor_analysis: {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/30',
  },
  ai_tools: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
  },
  voice_ai: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
  },
  partnerships: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  industry_research: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
  },
  marketing: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-500/30',
  },
  pricing: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  general: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-500/30',
  },
};
