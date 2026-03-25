'use client';

import { CheckSquare, Calendar, Folder, Hammer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickStatsBarProps {
  tasksDueToday: number;
  meetingsToday: number;
  activeProjects: number;
  buildingCount: number;
}

const stats = [
  {
    key: 'tasks',
    label: 'Tasks due',
    icon: CheckSquare,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    key: 'meetings',
    label: 'Meetings',
    icon: Calendar,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    key: 'active',
    label: 'Active projects',
    icon: Folder,
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
  },
  {
    key: 'building',
    label: 'Building',
    icon: Hammer,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
] as const;

export function QuickStatsBar({
  tasksDueToday,
  meetingsToday,
  activeProjects,
  buildingCount,
}: QuickStatsBarProps) {
  const values: Record<string, number> = {
    tasks: tasksDueToday,
    meetings: meetingsToday,
    active: activeProjects,
    building: buildingCount,
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-1 py-1">
      {stats.map((stat) => (
        <div
          key={stat.key}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5"
        >
          <div className={cn('flex h-5 w-5 items-center justify-center rounded', stat.bg)}>
            <stat.icon className={cn('h-3 w-3', stat.color)} />
          </div>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {values[stat.key]}
          </span>
          <span className="text-xs text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
