'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isToday, parseISO, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  Settings,
  Menu,
  Plus,
  ListTodo,
  AlertTriangle,
  CheckCircle2,
  Video,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';
import { DailyScheduleGrid } from './daily-schedule-grid';
import { InboxWidget } from './inbox-widget';
import { MeetingsTimeline } from './meetings-timeline';
import { ProjectPulseSidebar } from './project-pulse-sidebar';
import { useTransition, useState, useEffect, useMemo } from 'react';
import { type Task } from '@/app/actions/inbox';
import { type MeetingWithRelations } from '@/lib/swr';
import { NewTaskModalControlled } from '@/components/new-task-modal';
import type { ProjectType } from '@/types/database';

interface Project {
  id: string;
  name: string;
  status: string;
  project_type: ProjectType | null;
  target_date: string | null;
  logo_url: string | null;
  is_building?: boolean;
  issue_stats: { total: number; done: number };
}

interface TodayDashboardProps {
  meetings: MeetingWithRelations[];
  tasks: Task[];
  projects: Project[];
  finishedProjects: Project[];
  issues?: unknown[];
}

// =============================================================================
// STAT CARD
// =============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-card/50 px-4 py-3 dark:border-border/40">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex size-7 items-center justify-center rounded-lg',
            accent || 'bg-muted/50 text-foreground/50'
          )}
        >
          <Icon className="size-3.5" />
        </div>
        <span className="text-xs font-medium text-foreground/40">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

// =============================================================================
// MAIN DASHBOARD
// =============================================================================

export function TodayDashboard({
  meetings,
  tasks,
  projects,
  finishedProjects,
}: TodayDashboardProps) {
  const router = useRouter();
  const { toggleMobile } = useSidebar();
  const [isRefreshing, startRefresh] = useTransition();
  const [greeting, setGreeting] = useState('');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const now = new Date();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleRefresh = () => {
    startRefresh(() => router.refresh());
  };

  // Compute stats
  const stats = useMemo(() => {
    const todaysMeetings = meetings.filter((m) => isToday(parseISO(m.start_time)));
    const pendingCount = tasks.filter((t) => t.status !== 'Done').length;
    const doneCount = tasks.filter((t) => t.status === 'Done').length;
    const totalCount = tasks.length;
    const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const overdueCount = tasks.filter(
      (t) =>
        t.due_date &&
        isPast(parseISO(t.due_date)) &&
        !isToday(parseISO(t.due_date)) &&
        t.status !== 'Done'
    ).length;

    return {
      todaysMeetings: todaysMeetings.length,
      pending: pendingCount,
      overdue: overdueCount,
      progress: progressPercent,
    };
  }, [meetings, tasks]);

  // Split projects for ProjectPulseSidebar
  const activeProjects = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        project_type: p.project_type,
        target_date: p.target_date,
        logo_url: p.logo_url,
        issue_stats: p.issue_stats,
      })),
    [projects]
  );

  const finishedProjectsMapped = useMemo(
    () =>
      (finishedProjects as Project[]).map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        project_type: p.project_type,
        target_date: p.target_date,
        logo_url: p.logo_url,
        issue_stats: p.issue_stats,
      })),
    [finishedProjects]
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ===== STICKY HEADER ===== */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border/30 bg-background/80 px-5 backdrop-blur-sm">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={toggleMobile}>
            <Menu className="size-4" />
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-foreground">{greeting}</h1>
            <span className="text-foreground/12 hidden sm:inline">|</span>
            <span className="hidden text-sm tabular-nums text-foreground/35 sm:inline">
              {format(now, 'EEE, MMM d')}
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setShowNewTaskModal(true)}
          >
            <Plus className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
          </Button>
          <HeaderOnlineIndicator />
          <NotificationPanel />
          <ThemeSwitcher />
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link href="/settings">
              <Settings className="size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* ===== SCROLLABLE MAIN CONTENT ===== */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
          {/* ── STATS ROW ──────────────────────────────────────────────── */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Progress"
              value={`${stats.progress}%`}
              icon={CheckCircle2}
              accent="bg-emerald-500/10 text-emerald-500"
            />
            <StatCard
              label="Pending"
              value={stats.pending}
              icon={ListTodo}
              accent="bg-amber-500/10 text-amber-500"
            />
            <StatCard
              label="Overdue"
              value={stats.overdue}
              icon={AlertTriangle}
              accent={
                stats.overdue > 0 ? 'bg-red-500/10 text-red-500' : 'bg-muted/50 text-foreground/50'
              }
            />
            <StatCard
              label="Meetings"
              value={stats.todaysMeetings}
              icon={Video}
              accent="bg-violet-500/10 text-violet-500"
            />
          </div>

          {/* ── TWO-COLUMN GRID ────────────────────────────────────────── */}
          <div className="grid gap-5 lg:grid-cols-5 xl:grid-cols-12">
            {/* LEFT COLUMN */}
            <div className="space-y-5 lg:col-span-3 xl:col-span-7">
              {/* Schedule Grid */}
              <div className="overflow-hidden rounded-xl border border-border/30 bg-card/50 dark:border-border/40">
                <div className="h-[640px]">
                  <DailyScheduleGrid tasks={tasks} meetings={meetings} />
                </div>
              </div>

              {/* Meetings Timeline */}
              <div className="overflow-hidden rounded-xl border border-border/30 bg-card/50 dark:border-border/40">
                <div className="max-h-[440px]">
                  <MeetingsTimeline meetings={meetings} />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-5 lg:col-span-2 xl:col-span-5">
              {/* Inbox Widget */}
              <div className="overflow-hidden rounded-xl border border-border/30 bg-card/50 dark:border-border/40">
                <div className="h-[640px]">
                  <InboxWidget tasks={tasks} />
                </div>
              </div>

              {/* Project Pulse */}
              <div className="overflow-hidden rounded-xl border border-border/30 bg-card/50 dark:border-border/40">
                <div className="max-h-[440px]">
                  <ProjectPulseSidebar
                    activeProjects={activeProjects}
                    finishedProjects={finishedProjectsMapped}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ===== Modals ===== */}
      <NewTaskModalControlled
        open={showNewTaskModal}
        onOpenChange={setShowNewTaskModal}
        defaultAssigneeId={null}
        defaultScheduledTime={null}
      />
    </div>
  );
}

export { DailyScheduleGrid } from './daily-schedule-grid';
