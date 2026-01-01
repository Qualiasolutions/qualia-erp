'use client';

import { useEffect, useState, useMemo } from 'react';
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
  accent?: 'default' | 'warning' | 'success';
}

function StatCard({ label, value, icon, accent = 'default' }: StatCardProps) {
  return (
    <div className="card-stat group">
      <div className="flex items-start justify-between">
        <div>
          <div
            className={cn(
              'text-3xl font-light tracking-tight transition-colors duration-200',
              accent === 'warning' && 'text-amber-500',
              accent === 'success' && 'text-emerald-500',
              accent === 'default' && 'text-foreground'
            )}
          >
            {value}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{label}</div>
        </div>
        <div
          className={cn(
            'rounded-xl p-2 transition-all duration-200',
            accent === 'warning' && 'bg-amber-500/10 text-amber-500',
            accent === 'success' && 'bg-emerald-500/10 text-emerald-500',
            accent === 'default' && 'bg-primary/10 text-primary'
          )}
        >
          {icon}
        </div>
      </div>
      {/* Bottom glow accent */}
      <div className="absolute -bottom-px left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/50 to-transparent transition-all duration-300 group-hover:w-2/3" />
    </div>
  );
}

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
      {/* Subtle ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[400px] w-[400px] rounded-full bg-primary/[0.02] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        {/* Greeting Section */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground">{dateString}</p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            label="Open Tasks"
            value={stats.tasks}
            icon={<ListTodo className="h-5 w-5" />}
          />
          <StatCard
            label="Urgent"
            value={stats.urgent}
            icon={<AlertCircle className="h-5 w-5" />}
            accent={stats.urgent > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label="Meetings"
            value={stats.meetings}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            label="Progress"
            value={`${progressPercentage}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            accent={progressPercentage >= 80 ? 'success' : 'default'}
          />
        </div>

        {/* Mind of Qualia - AI Assistant Widget */}
        <div className="mx-auto max-w-2xl">
          <MindOfQualia />
        </div>

        {/* Bottom hint */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground/60">
            Press <kbd className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>{' '}
            for quick navigation
          </p>
        </div>
      </div>
    </div>
  );
}
