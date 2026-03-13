'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, Settings, Menu, Plus } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/sidebar-provider';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';
import { BuildingProjectsRow, type PipelineProject } from './building-projects-row';
import { MeetingsSidebar } from './meetings-sidebar';
import { useTransition, useState, useEffect, useMemo } from 'react';
import { type Task } from '@/app/actions/inbox';
import { type MeetingWithRelations, useMeetings, useScheduledTasks } from '@/lib/swr';
import { NewTaskModalControlled } from '@/components/new-task-modal';
import { ScheduleBlock } from '@/components/schedule-block';

interface TodayDashboardProps {
  meetings: MeetingWithRelations[];
  tasks: Task[];
  building: PipelineProject[];
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  }[];
  currentUserId: string | null;
  userRole: string | null;
}

// =============================================================================
// MAIN DASHBOARD
// =============================================================================

export function TodayDashboard({
  meetings: initialMeetings,
  tasks,
  building,
  profiles,
  currentUserId,
  userRole,
}: TodayDashboardProps) {
  const router = useRouter();
  const { toggleMobile } = useSidebar();
  const [isRefreshing, startRefresh] = useTransition();
  const [greeting, setGreeting] = useState('');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const isNonAdmin = userRole !== 'admin';
  const now = new Date();

  // SWR hooks for live data (auto-refresh after task creation)
  const { meetings } = useMeetings(initialMeetings);
  const { tasks: swrScheduledTasks } = useScheduledTasks(
    tasks.filter((t) => t.scheduled_start_time && t.scheduled_end_time)
  );

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleRefresh = () => {
    startRefresh(() => router.refresh());
  };

  // Use SWR scheduled tasks (live data), fallback SSR backlog
  const scheduledTasks = swrScheduledTasks;
  const backlogTasks = useMemo(
    () =>
      tasks.filter(
        (t) => !t.scheduled_start_time && t.status !== 'Done' && (t.status as string) !== 'Canceled'
      ),
    [tasks]
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ===== STICKY HEADER ===== */}
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border/40 bg-card/80 px-6 py-4 backdrop-blur-xl">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={toggleMobile}>
            <Menu className="size-4" />
          </Button>

          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-foreground">{greeting}</h1>
            <span className="hidden h-4 w-px bg-border/60 sm:inline-block" />
            <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">
              {format(now, 'EEEE, MMMM d')}
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {!isNonAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowNewTaskModal(true)}
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New task</span>
            </Button>
          )}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <HeaderOnlineIndicator />
          <NotificationPanel />
          <ThemeSwitcher />
          {!isNonAdmin && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" asChild>
                    <Link href="/settings">
                      <Settings className="size-3.5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-y-auto px-5 py-4 sm:px-6">
          {/* Schedule + Meetings Sidebar row */}
          <div className="flex gap-4">
            <div className="min-w-0 flex-1">
              <ScheduleBlock
                scheduledTasks={scheduledTasks}
                backlogTasks={backlogTasks}
                meetings={meetings}
                profiles={isNonAdmin ? profiles.filter((p) => p.id === currentUserId) : profiles}
                unified={isNonAdmin}
                readOnly={isNonAdmin}
                meetingsSidebar={!isNonAdmin ? <MeetingsSidebar meetings={meetings} /> : undefined}
              />
            </div>
          </div>

          {/* ── CURRENTLY BUILDING ROW ──────────────────────────────── */}
          {!isNonAdmin && (
            <div className="mt-4 shrink-0">
              <BuildingProjectsRow building={building} />
            </div>
          )}
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
