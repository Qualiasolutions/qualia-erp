'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, Settings, Menu, Plus, Eye } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/sidebar-provider';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';
import { BuildingProjectsRow, type PipelineProject } from './building-projects-row';
import { LiveStatusPanel } from './live-status-panel';
import { MeetingsSidebar } from './meetings-sidebar';
import { TeamTaskContainer } from './team-task-container';
import { ClockInModal } from './clock-in-modal';
import { useTransition, useState, useEffect } from 'react';
import { type MeetingWithRelations, useMeetings, useActiveSession } from '@/lib/swr';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NewTaskModalControlled } from '@/components/new-task-modal';
import { OwnerUpdatesBanner } from './owner-updates-banner';

interface TodayDashboardProps {
  meetings: MeetingWithRelations[];
  building: PipelineProject[];
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  }[];
  currentUserId: string | null;
  userRole: string | null;
  workspaceId: string;
}

// =============================================================================
// MAIN DASHBOARD
// =============================================================================

export function TodayDashboard({
  meetings: initialMeetings,
  building,
  profiles,
  currentUserId,
  userRole,
  workspaceId,
}: TodayDashboardProps) {
  const router = useRouter();
  const { toggleMobile } = useSidebar();
  const [isRefreshing, startRefresh] = useTransition();
  const [greeting, setGreeting] = useState('');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [justClockedIn, setJustClockedIn] = useState(false);
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null);
  const isRealAdmin = userRole === 'admin';
  const now = new Date();

  // "View as" — admin can preview employee's task list, but keeps admin layout
  const effectiveUserId = viewAsUserId || currentUserId;
  const effectiveRole = userRole; // Admin keeps admin layout
  const isNonAdmin = effectiveRole !== 'admin';
  const viewingAsEmployee = isRealAdmin && viewAsUserId !== null;

  // Session gate for employees — poll only when relevant (requires daily clock-in)
  const { session: activeSession, isLoading: sessionLoading } = useActiveSession(
    isNonAdmin ? workspaceId : null
  );

  // Show clock-in modal when employee has no active TODAY session
  const showClockIn =
    isNonAdmin && !viewingAsEmployee && !justClockedIn && !sessionLoading && activeSession === null;

  // SWR hooks for live data (auto-refresh after task creation)
  const { meetings } = useMeetings(initialMeetings);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleRefresh = () => {
    startRefresh(() => router.refresh());
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ===== STICKY HEADER ===== */}
      <header className="sticky top-0 z-sticky flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur-xl">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 min-h-[44px] min-w-[44px] lg:hidden"
            onClick={toggleMobile}
          >
            <Menu className="size-4" />
          </Button>

          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold tracking-tight text-foreground">{greeting}</h1>
            <span className="hidden h-4 w-px bg-border sm:inline-block" />
            <span className="hidden text-sm tabular-nums text-muted-foreground/70 sm:inline">
              {format(now, 'EEEE, MMMM d')}
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5">
          {/* View As selector — admin only */}
          {isRealAdmin && (
            <>
              <span className="mx-1 hidden h-5 w-px bg-border sm:inline-block" />
              <Select
                value={viewAsUserId || '__admin__'}
                onValueChange={(v) => setViewAsUserId(v === '__admin__' ? null : v)}
              >
                <SelectTrigger
                  className={cn(
                    'h-8 w-36 gap-1.5 rounded-lg text-xs transition-all duration-200',
                    viewAsUserId
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : 'border-border'
                  )}
                >
                  <Eye className="size-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__admin__">Admin view</SelectItem>
                  {profiles
                    .filter((p) => p.id !== currentUserId)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name || 'Unknown'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <span className="mx-1 hidden h-5 w-px bg-border sm:inline-block" />
            </>
          )}
          {!isNonAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg border-border transition-colors hover:bg-primary/10 hover:text-primary"
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
                  className="size-8 min-h-[44px] min-w-[44px] transition-all duration-200"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={cn(
                      'size-3.5 transition-transform duration-500',
                      isRefreshing && 'animate-spin'
                    )}
                  />
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 min-h-[44px] min-w-[44px]"
                    asChild
                  >
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
        <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-5 py-3 sm:px-6">
          {/* "Viewing as" indicator */}
          {viewingAsEmployee && (
            <div className="bg-amber-500/6 mb-3 flex shrink-0 animate-slide-up items-center gap-2.5 rounded-lg border border-amber-500/25 px-4 py-2 backdrop-blur-sm">
              <div className="flex size-6 items-center justify-center rounded-md bg-amber-500/15">
                <Eye className="size-3 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Viewing as{' '}
                <span className="font-semibold">
                  {profiles.find((p) => p.id === viewAsUserId)?.full_name || 'employee'}
                </span>
              </span>
              <button
                type="button"
                className="ml-auto rounded-md px-2 py-0.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
                onClick={() => setViewAsUserId(null)}
              >
                Exit
              </button>
            </div>
          )}

          {/* Owner updates banner — employees only */}
          {isNonAdmin && <OwnerUpdatesBanner workspaceId={workspaceId} />}

          {/* ── TOP ROW: Meetings + Tasks side by side (fills available height) ── */}
          <div
            className={cn(
              'flex min-h-0 flex-1 gap-4',
              isNonAdmin ? 'flex-col' : 'flex-col lg:flex-row'
            )}
          >
            {/* Left sidebar — admin: meetings + team status / employee: hidden */}
            {!isNonAdmin && (
              <div className="flex min-h-0 w-full shrink-0 flex-col gap-3 lg:w-72 xl:w-80">
                {isRealAdmin && <LiveStatusPanel workspaceId={workspaceId} />}
                <MeetingsSidebar meetings={meetings} />
              </div>
            )}

            {/* Tasks — fills remaining space */}
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
              <TeamTaskContainer
                workspaceId={workspaceId}
                userRole={effectiveRole}
                currentUserId={effectiveUserId}
                viewingAs={viewingAsEmployee}
              />
            </div>
          </div>

          {/* ── BOTTOM ROW: Currently Building (full width) ── */}
          <div className="mt-3 shrink-0 animate-fade-in">
            <BuildingProjectsRow building={building} />
          </div>
        </div>
      </main>

      {/* ===== Modals ===== */}
      <NewTaskModalControlled
        open={showNewTaskModal}
        onOpenChange={setShowNewTaskModal}
        defaultAssigneeId={viewAsUserId}
        defaultScheduledTime={null}
      />

      {/* Session clock-in gate (employees only, not in "view as" mode) */}
      {isNonAdmin && !viewingAsEmployee && (
        <ClockInModal
          open={showClockIn}
          workspaceId={workspaceId}
          currentUserId={currentUserId}
          onSuccess={() => setJustClockedIn(true)}
        />
      )}
    </div>
  );
}
