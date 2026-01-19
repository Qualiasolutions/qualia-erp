'use client';

import { motion } from 'framer-motion';
import { Target, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectMetric {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  progress?: number;
  status?: 'good' | 'warning' | 'danger';
}

interface ProjectMetricBarProps {
  metrics: {
    health: 'On Track' | 'At Risk' | 'Behind';
    progress: number;
    daysRemaining: number | string;
    totalTasks: number;
    completedTasks: number;
  };
  className?: string;
}

export function ProjectMetricBar({ metrics, className }: ProjectMetricBarProps) {
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'On Track':
        return 'text-emerald-500 bg-emerald-500/10';
      case 'At Risk':
        return 'text-amber-500 bg-amber-500/10';
      case 'Behind':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-blue-500 bg-blue-500/10';
    }
  };

  const dashboardMetrics: ProjectMetric[] = [
    {
      label: 'Project Health',
      value: metrics.health,
      subValue: metrics.health === 'On Track' ? 'No issues' : 'Needs attention',
      icon: metrics.health === 'On Track' ? CheckCircle2 : AlertTriangle,
      color: getHealthColor(metrics.health),
      status:
        metrics.health === 'On Track'
          ? 'good'
          : metrics.health === 'At Risk'
            ? 'warning'
            : 'danger',
    },
    {
      label: 'Progress',
      value: `${Math.round(metrics.progress)}%`,
      subValue: `${metrics.completedTasks}/${metrics.totalTasks} Tasks`,
      icon: Target,
      color: 'text-primary bg-primary/10',
      progress: metrics.progress,
    },
    {
      label: 'Timeline',
      value: metrics.daysRemaining,
      subValue: 'Until target date',
      icon: Clock,
      color: 'text-blue-500 bg-blue-500/10',
    },
  ];

  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-3', className)}>
      {dashboardMetrics.map((metric, idx) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-5 shadow-glow-sm backdrop-blur-sm transition-all hover:border-primary/20 hover:bg-white/[0.04]"
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
                metric.color
              )}
            >
              <metric.icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
                {metric.label}
              </p>
              <h3 className="mt-0.5 text-2xl font-bold tracking-tight">{metric.value}</h3>
              <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
                {metric.subValue}
              </p>
            </div>
          </div>

          {metric.progress !== undefined && (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metric.progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-primary shadow-glow"
                />
              </div>
            </div>
          )}

          {/* Subtle background decoration */}
          <div className="absolute -bottom-4 -right-4 opacity-[0.03] transition-opacity group-hover:opacity-[0.05]">
            <metric.icon className="h-24 w-24" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
