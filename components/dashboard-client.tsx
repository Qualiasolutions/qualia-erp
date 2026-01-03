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
  variant?: 'default' | 'warning' | 'success' | 'info';
}

function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'text-foreground',
    warning: 'text-amber-600 dark:text-amber-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className={cn('text-2xl font-semibold', variantStyles[variant])}>{value}</div>
          <div className="mt-1 text-sm text-muted-foreground">{label}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">{icon}</div>
      </div>
    </div>
  );
}

export function DashboardClient({ greeting, dateString, greetingData }: DashboardClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = useMemo(() => {
    if (!greetingData?.stats) {
      return { tasks: 0, urgent: 0, meetings: 0, completed: 0 };
    }
    return {
      tasks: greetingData.stats.overdueTasksCount + greetingData.stats.urgentTasksCount,
      urgent: greetingData.stats.urgentTasksCount,
      meetings: greetingData.stats.todayMeetingsCount,
      completed: greetingData.stats.completedTasksCount,
    };
  }, [greetingData]);

  const progressPercentage = useMemo(() => {
    const total = stats.tasks + stats.completed;
    if (total === 0) return 100;
    return Math.round((stats.completed / total) * 100);
  }, [stats]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold text-foreground">{greeting}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{dateString}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Open Tasks"
            value={stats.tasks}
            icon={<ListTodo className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            label="Urgent"
            value={stats.urgent}
            icon={<AlertCircle className="h-5 w-5 text-muted-foreground" />}
            variant={stats.urgent > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label="Meetings"
            value={stats.meetings}
            icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
            variant="info"
          />
          <StatCard
            label="Progress"
            value={`${progressPercentage}%`}
            icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
            variant={progressPercentage >= 80 ? 'success' : 'default'}
          />
        </div>

        {/* AI Assistant */}
        <div className="mx-auto max-w-2xl">
          <MindOfQualia />
        </div>

        {/* Keyboard hint */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Press{' '}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
              ⌘K
            </kbd>{' '}
            for quick navigation
          </p>
        </div>
      </div>
    </div>
  );
}
