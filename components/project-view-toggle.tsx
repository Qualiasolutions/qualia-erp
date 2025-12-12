'use client';

import Link from 'next/link';
import { Columns3, GanttChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectType } from '@/types/database';

type ViewMode = 'columns' | 'grid' | 'list' | 'timeline';

interface ProjectViewToggleProps {
  currentView?: ViewMode;
  currentType?: ProjectType | 'all';
}

const VIEWS: Array<{
  key: ViewMode;
  label: string;
  icon: typeof Columns3;
}> = [
  { key: 'columns', label: 'Columns', icon: Columns3 },
  { key: 'timeline', label: 'Timeline', icon: GanttChart },
];

export function ProjectViewToggle({
  currentView = 'columns',
  currentType,
}: ProjectViewToggleProps) {
  const buildHref = (view: ViewMode) => {
    const params = new URLSearchParams();
    if (currentType && currentType !== 'all') {
      params.set('type', currentType);
    }
    if (view !== 'columns') {
      params.set('view', view);
    }
    const query = params.toString();
    return query ? `/projects?${query}` : '/projects';
  };

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1">
      {VIEWS.map((view) => {
        const isActive = currentView === view.key;

        return (
          <Link
            key={view.key}
            href={buildHref(view.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title={`${view.label} view`}
          >
            <view.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{view.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
