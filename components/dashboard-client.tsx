'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import { ListTodo, AlertCircle, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MindOfQualia } from '@/components/mind-of-qualia';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  workspaceId?: string;
}

export interface GreetingData {
  reminders: Array<{
    type: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    details?: Record<string, unknown>;
    count?: number;
  }>;
  motivationalMessages: string[];
  specialOccasions: Array<{
    type: string;
    message: string;
  }>;
  stats: {
    todayMeetingsCount: number;
    urgentTasksCount: number;
    overdueTasksCount: number;
    completedTasksCount: number;
  };
}

interface DashboardClientProps {
  greeting: string;
  dateString: string;
  user?: DashboardUser;
  greetingData?: GreetingData | null;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: 'default' | 'warning' | 'success' | 'info';
  delay?: number;
}

const StatCard = memo(function StatCard({
  label,
  value,
  icon,
  accent = 'default',
  delay = 0,
}: StatCardProps) {
  const accentStyles = {
    warning: {
      value: 'text-amber-500',
      icon: 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20',
      glow: 'via-amber-500/50',
    },
    success: {
      value: 'text-emerald-500',
      icon: 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20',
      glow: 'via-emerald-500/50',
    },
    info: {
      value: 'text-blue-500',
      icon: 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20',
      glow: 'via-blue-500/50',
    },
    default: {
      value: 'text-foreground',
      icon: 'bg-primary/10 text-primary group-hover:bg-primary/20',
      glow: 'via-primary/50',
    },
  };

  const styles = accentStyles[accent];

  return (
    <div
      className="card-premium group relative animate-fade-in overflow-hidden p-5 opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Gradient background on hover */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div>
          <div
            className={cn(
              'text-3xl font-semibold tracking-tight transition-all duration-300 group-hover:scale-105',
              styles.value
            )}
          >
            {value}
          </div>
          <div className="mt-1.5 text-sm font-medium text-muted-foreground">{label}</div>
        </div>
        <div
          className={cn(
            'rounded-xl p-2.5 transition-all duration-300 group-hover:scale-110',
            styles.icon
          )}
        >
          {icon}
        </div>
      </div>

      {/* Bottom glow line */}
      <div
        className={cn(
          'absolute -bottom-px left-1/2 h-[2px] w-0 -translate-x-1/2 bg-gradient-to-r from-transparent to-transparent transition-all duration-500 group-hover:w-3/4',
          styles.glow
        )}
      />
    </div>
  );
});

export function DashboardClient({ greeting, dateString, greetingData }: DashboardClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    if (!greetingData?.stats) {
      return {
        tasks: 0,
        urgent: 0,
        meetings: 0,
        completed: 0,
      };
    }
    return {
      tasks: greetingData.stats.overdueTasksCount + greetingData.stats.urgentTasksCount,
      urgent: greetingData.stats.urgentTasksCount,
      meetings: greetingData.stats.todayMeetingsCount,
      completed: greetingData.stats.completedTasksCount,
    };
  }, [greetingData]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    const total = stats.tasks + stats.completed;
    if (total === 0) return 100;
    return Math.round((stats.completed / total) * 100);
  }, [stats]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
      {/* Ambient background effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] animate-pulse-subtle rounded-full bg-primary/[0.04] blur-[100px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-[80px]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        {/* Greeting Section */}
        <div
          className="mb-10 animate-slide-up text-center opacity-0"
          style={{ animationFillMode: 'forwards' }}
        >
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground">{dateString}</p>
        </div>

        {/* Stats Grid */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Open Tasks"
            value={stats.tasks}
            icon={<ListTodo className="h-5 w-5" />}
            delay={100}
          />
          <StatCard
            label="Urgent"
            value={stats.urgent}
            icon={<AlertCircle className="h-5 w-5" />}
            accent={stats.urgent > 0 ? 'warning' : 'default'}
            delay={150}
          />
          <StatCard
            label="Meetings"
            value={stats.meetings}
            icon={<Calendar className="h-5 w-5" />}
            accent="info"
            delay={200}
          />
          <StatCard
            label="Progress"
            value={`${progressPercentage}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            accent={progressPercentage >= 80 ? 'success' : 'default'}
            delay={250}
          />
        </div>

        {/* Mind of Qualia - AI Assistant Widget */}
        <div
          className="mx-auto max-w-2xl animate-fade-in opacity-0"
          style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
        >
          <MindOfQualia />
        </div>

        {/* Bottom hint */}
        <div
          className="mt-10 animate-fade-in text-center opacity-0"
          style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
        >
          <p className="text-xs text-muted-foreground/50">
            Press{' '}
            <kbd className="rounded-md border border-border/50 bg-muted/30 px-2 py-1 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>{' '}
            for quick navigation
          </p>
        </div>
      </div>
    </div>
  );
}
