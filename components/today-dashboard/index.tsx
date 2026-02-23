'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, Settings, Menu, Plus } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';
import { DailyScheduleGrid } from './daily-schedule-grid';
import { BuildingProjectsRow } from './building-projects-row';
import { DashboardAIChat } from './dashboard-ai-chat';
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

  // Map projects for the building row
  const allProjects = useMemo(
    () =>
      [...projects, ...finishedProjects].map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        project_type: p.project_type,
        target_date: p.target_date,
        logo_url: p.logo_url,
        is_building: (p as Project).is_building,
        issue_stats: p.issue_stats,
      })),
    [projects, finishedProjects]
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

      {/* ===== MAIN CONTENT (no page scroll) ===== */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-3 sm:px-6">
          {/* ── CURRENTLY BUILDING ROW ─────────────────────────────────── */}
          <div className="mb-3 shrink-0">
            <BuildingProjectsRow projects={allProjects} />
          </div>

          {/* ── TWO-COLUMN GRID (fills remaining height) ───────────────── */}
          <div className="grid min-h-0 flex-1 grid-rows-[1fr] gap-4 lg:grid-cols-5 xl:grid-cols-12">
            {/* LEFT COLUMN — Schedule */}
            <div className="min-h-0 overflow-hidden lg:col-span-3 xl:col-span-7">
              <div className="h-full overflow-hidden rounded-xl border border-border/30 bg-card/50 dark:border-border/40">
                <DailyScheduleGrid tasks={tasks} meetings={meetings} />
              </div>
            </div>

            {/* RIGHT COLUMN — AI Assistant */}
            <div className="min-h-0 overflow-hidden lg:col-span-2 xl:col-span-5">
              <DashboardAIChat />
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
