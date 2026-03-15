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
import { MeetingsSidebar } from './meetings-sidebar';
import { TeamTaskContainer } from './team-task-container';
import { CheckinModal } from './checkin-modal';
import { EveningCheckinModal } from './evening-checkin-modal';
import { useTransition, useState, useEffect } from 'react';
import { type MeetingWithRelations, useMeetings, useTodaysCheckin } from '@/lib/swr';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NewTaskModalControlled } from '@/components/new-task-modal';
import { OwnerUpdatesBanner } from './owner-updates-banner';
import { OwnerUpdatesCompose } from './owner-updates-compose';

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
  const [checkinDismissed, setCheckinDismissed] = useState(false);
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null);
  const isRealAdmin = userRole === 'admin';
  const now = new Date();
  const currentHour = now.getHours();

  // "View as" — admin can impersonate employee's dashboard view
  const effectiveUserId = viewAsUserId || currentUserId;
  const effectiveRole = viewAsUserId ? 'employee' : userRole;
  const isNonAdmin = effectiveRole !== 'admin';
  const viewingAsEmployee = isRealAdmin && viewAsUserId !== null;

  // Check-in gate for employees (and admin "view as" mode)
  const {
    morning: morningCheckin,
    evening: eveningCheckin,
    isLoading: checkinLoading,
  } = useTodaysCheckin(isNonAdmin && !checkinDismissed ? workspaceId : null);

  // Morning check-in: show if before 3 PM and no morning check-in
  const showMorningCheckin =
    isNonAdmin &&
    !viewingAsEmployee &&
    !checkinDismissed &&
    !checkinLoading &&
    morningCheckin === null &&
    currentHour < 15;

  // Evening check-in: show if 3 PM or later, morning done, no evening check-in
  const showEveningCheckin =
    isNonAdmin &&
    !viewingAsEmployee &&
    !checkinDismissed &&
    !checkinLoading &&
    morningCheckin !== null &&
    eveningCheckin === null &&
    currentHour >= 15;

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
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border/40 bg-card/80 px-6 py-4 backdrop-blur-xl">
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
            <h1 className="text-base font-semibold text-foreground">{greeting}</h1>
            <span className="hidden h-4 w-px bg-border/60 sm:inline-block" />
            <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">
              {format(now, 'EEEE, MMMM d')}
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {/* View As selector — admin only */}
          {isRealAdmin && (
            <Select
              value={viewAsUserId || '__admin__'}
              onValueChange={(v) => setViewAsUserId(v === '__admin__' ? null : v)}
            >
              <SelectTrigger className="h-8 w-36 gap-1.5 text-xs">
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
          )}
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
                  className="size-8 min-h-[44px] min-w-[44px]"
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
            <div className="mb-2 flex shrink-0 items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-1.5">
              <Eye className="size-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Viewing as {profiles.find((p) => p.id === viewAsUserId)?.full_name || 'employee'}
              </span>
              <button
                type="button"
                className="ml-auto text-xs text-amber-600 underline hover:no-underline dark:text-amber-400"
                onClick={() => setViewAsUserId(null)}
              >
                Exit
              </button>
            </div>
          )}

          {/* Owner updates banner — employees only */}
          {isNonAdmin && <OwnerUpdatesBanner workspaceId={workspaceId} />}

          {/* Admin: side-by-side layout — tasks left, meetings+pipeline right */}
          {/* Employee: full-width tasks only */}
          <div
            className={cn(
              'flex min-h-0 flex-1 gap-4',
              isNonAdmin ? 'flex-col' : 'flex-col lg:flex-row'
            )}
          >
            {/* ── TEAM TASKS (primary panel, fills available space) ── */}
            <div className="min-h-0 flex-1">
              <TeamTaskContainer
                workspaceId={workspaceId}
                userRole={effectiveRole}
                currentUserId={effectiveUserId}
              />
            </div>

            {/* ── RIGHT SIDEBAR — admin only on desktop ─────────── */}
            {!isNonAdmin && (
              <div className="flex min-h-0 w-full shrink-0 flex-col gap-3 lg:w-80 xl:w-96">
                <MeetingsSidebar meetings={meetings} />
                <BuildingProjectsRow building={building} />
                <OwnerUpdatesCompose workspaceId={workspaceId} profiles={profiles} />
              </div>
            )}
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

      {/* Daily check-in gates (employees only, not in "view as" mode) */}
      {isNonAdmin && !viewingAsEmployee && (
        <>
          <CheckinModal
            open={showMorningCheckin}
            workspaceId={workspaceId}
            onSuccess={() => setCheckinDismissed(true)}
          />
          <EveningCheckinModal
            open={showEveningCheckin}
            workspaceId={workspaceId}
            onSuccess={() => setCheckinDismissed(true)}
          />
        </>
      )}
    </div>
  );
}
