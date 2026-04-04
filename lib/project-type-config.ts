import { Globe, Bot, Phone, Sparkles, TrendingUp, Smartphone, Megaphone } from 'lucide-react';
import type { ProjectType } from '@/types/database';

export interface ProjectTypeStyle {
  icon: typeof Globe;
  color: string;
  bg: string;
  border: string;
  bar: string;
  label: string;
}

export const PROJECT_TYPE_CONFIG: Record<ProjectType, ProjectTypeStyle> = {
  ai_agent: {
    icon: Bot,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    bar: 'bg-violet-500/60',
    label: 'AI',
  },
  voice_agent: {
    icon: Phone,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    bar: 'bg-pink-500/60',
    label: 'Voice',
  },
  ai_platform: {
    icon: Sparkles,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    bar: 'bg-indigo-500/60',
    label: 'Platform',
  },
  web_design: {
    icon: Globe,
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    bar: 'bg-sky-500/60',
    label: 'Web',
  },
  seo: {
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    bar: 'bg-emerald-500/60',
    label: 'SEO',
  },
  app: {
    icon: Smartphone,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    bar: 'bg-teal-500/60',
    label: 'App',
  },
  ads: {
    icon: Megaphone,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    bar: 'bg-amber-500/60',
    label: 'Ads',
  },
};

export function getProjectTypeStyle(type: string | null): ProjectTypeStyle | null {
  if (!type) return null;
  return PROJECT_TYPE_CONFIG[type as ProjectType] ?? null;
}
