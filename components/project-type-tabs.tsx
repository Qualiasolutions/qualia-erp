'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Globe, Bot, LayoutGrid, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectType } from '@/types/database';

interface ProjectTypeTabsProps {
  currentType?: ProjectType | 'all';
}

const TABS: Array<{
  key: ProjectType | 'all';
  label: string;
  icon: typeof Globe;
  color: string;
}> = [
  { key: 'all', label: 'All', icon: LayoutGrid, color: 'text-muted-foreground' },
  { key: 'web_design', label: 'Websites', icon: Globe, color: 'text-blue-500' },
  { key: 'ai_agent', label: 'AI Agents', icon: Bot, color: 'text-purple-500' },
  { key: 'voice_agent', label: 'Voice Agents', icon: Phone, color: 'text-green-500' },
  // SEO and Ads tabs hidden for now
  // { key: 'seo', label: 'SEO', icon: Search, color: 'text-green-500' },
  // { key: 'ads', label: 'Ads', icon: Megaphone, color: 'text-orange-500' },
];

export function ProjectTypeTabs({ currentType }: ProjectTypeTabsProps) {
  const searchParams = useSearchParams();
  const activeType = currentType || searchParams.get('type') || 'all';

  return (
    <div className="flex items-center gap-1">
      {TABS.map((tab) => {
        const isActive = activeType === tab.key;
        const href = tab.key === 'all' ? '/projects' : `/projects?type=${tab.key}`;

        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
            )}
          >
            <tab.icon className={cn('h-4 w-4', isActive && tab.color)} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
