'use client';

import { cn } from '@/lib/utils';
import { Calendar, Zap, Star, MessageSquare } from 'lucide-react';

interface HealthMetricsGridProps {
  schedule: number;
  velocity: number;
  quality: number;
  communication: number;
  className?: string;
}

const METRICS = [
  { key: 'schedule', label: 'Schedule', icon: Calendar, description: 'On-time delivery' },
  { key: 'velocity', label: 'Velocity', icon: Zap, description: 'Work completion rate' },
  { key: 'quality', label: 'Quality', icon: Star, description: 'Code quality & coverage' },
  {
    key: 'communication',
    label: 'Communication',
    icon: MessageSquare,
    description: 'Team engagement',
  },
] as const;

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-500 bg-emerald-500/10';
  if (score >= 60) return 'text-amber-500 bg-amber-500/10';
  if (score >= 40) return 'text-orange-500 bg-orange-500/10';
  return 'text-red-500 bg-red-500/10';
}

function getProgressColor(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export function HealthMetricsGrid({
  schedule,
  velocity,
  quality,
  communication,
  className,
}: HealthMetricsGridProps) {
  const values = { schedule, velocity, quality, communication };

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {METRICS.map((metric) => {
        const score = values[metric.key];
        const Icon = metric.icon;

        return (
          <div key={metric.key} className="rounded-lg border bg-card/50 p-3">
            <div className="flex items-center gap-2">
              <div className={cn('rounded-lg p-1.5', getScoreColor(score))}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-medium">{metric.label}</span>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{metric.description}</span>
                <span className={cn('font-semibold', getScoreColor(score).split(' ')[0])}>
                  {score}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', getProgressColor(score))}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
