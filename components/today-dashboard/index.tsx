'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, Settings, Menu, Plus, Eye, ChevronRight, Folder, Hammer } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/sidebar-provider';
import { NotificationPanel } from '@/components/notification-panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EntityAvatar } from '@/components/entity-avatar';
import { MeetingsSidebar } from './meetings-sidebar';
import { TeamTaskContainer } from './team-task-container';
import { ClockInModal } from './clock-in-modal';
import { useTransition, useState, useEffect } from 'react';
import { type MeetingWithRelations, useMeetings, useActiveSession, useTeamStatus } from '@/lib/swr';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NewTaskModalControlled } from '@/components/new-task-modal';
import { OwnerUpdatesBanner } from './owner-updates-banner';
import { useAdminContext } from '@/components/admin-provider';
import type { PipelineProject } from './building-projects-row';

import { PROJECT_TYPE_CONFIG } from '@/lib/project-type-config';

// ─── Team Presence (Header) ─────────────────────────────────────────────────

function TeamPresence({ workspaceId }: { workspaceId: string }) {
  const { members, isLoading } = useTeamStatus(workspaceId);
  const online = members.filter((m) => m.status === 'online');

  if (isLoading) return <Skeleton className="h-7 w-24 rounded-full" />;
  if (members.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-default items-center gap-2">
            <div className="flex -space-x-1.5">
              {members.slice(0, 6).map((m) => (
                <div key={m.profileId} className="relative">
                  <Avatar className="size-6 ring-2 ring-card transition-transform duration-150 hover:z-10 hover:scale-110">
                    {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.fullName ?? ''} />}
                    <AvatarFallback
                      className={cn(
                        'text-[9px] font-semibold',
                        m.status === 'online'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted/60 text-muted-foreground/50'
                      )}
                    >
                      {(m.fullName ?? '?')
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 block size-2 rounded-full ring-[1.5px] ring-card',
                      m.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground/25'
                    )}
                  />
                </div>
              ))}
            </div>
            {online.length > 0 && (
              <span className="hidden text-[11px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400 sm:inline">
                {online.length} online
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-xs p-0">
          <div className="space-y-0.5 px-1 py-1.5">
            {online.length > 0 && (
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-background/50">
                Online
              </p>
            )}
            {online.map((m) => (
              <div key={m.profileId} className="flex items-center gap-2 rounded px-2 py-1">
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span className="font-medium">{m.fullName ?? 'Unknown'}</span>
                {m.projectName && (
                  <span className="truncate text-background/50">— {m.projectName}</span>
                )}
              </div>
            ))}
            {members.filter((m) => m.status !== 'online').length > 0 && (
              <p className="px-2 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-background/50">
                Offline
              </p>
            )}
            {members
              .filter((m) => m.status !== 'online')
              .map((m) => (
                <div key={m.profileId} className="flex items-center gap-2 rounded px-2 py-1">
                  <span className="size-1.5 shrink-0 rounded-full bg-background/25" />
                  <span className="text-background/60">{m.fullName ?? 'Unknown'}</span>
                </div>
              ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Active Projects List (Right Column) ────────────────────────────────────

function ActiveProjectsList({ projects }: { projects: PipelineProject[] }) {
  if (projects.length === 0) return null;

  return (
    <div className="border-t border-border/50">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <Hammer className="size-3.5 text-emerald-500/70" />
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Building
          </h3>
          <span className="bg-emerald-500/8 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {projects.length}
          </span>
        </div>
        <Link
          href="/projects"
          className="flex items-center gap-0.5 text-[11px] text-muted-foreground/40 transition-colors hover:text-foreground"
        >
          All
          <ChevronRight className="size-3" />
        </Link>
      </div>
      <div className="space-y-px px-3 pb-4">
        {projects.map((project, i) => {
          const typeConfig = project.project_type
            ? PROJECT_TYPE_CONFIG[project.project_type]
            : null;
          const TypeIcon = typeConfig?.icon || Folder;
          const pct =
            project.issue_stats.total > 0
              ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
              : 0;

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-muted/30"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <EntityAvatar
                src={project.logo_url}
                fallbackIcon={<TypeIcon className="size-3" />}
                fallbackBgColor="bg-muted"
                fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
                size="sm"
                className="size-7 rounded-lg ring-1 ring-border/50"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground/80 transition-colors group-hover:text-foreground">
                  {project.name}
                </p>
              </div>
              {project.issue_stats.total > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-1 w-12 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        pct >= 80
                          ? 'bg-emerald-500'
                          : pct >= 40
                            ? 'bg-amber-500'
                            : 'bg-muted-foreground/30'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[10px] font-medium tabular-nums text-muted-foreground/50">
                    {pct}%
                  </span>
                </div>
              )}
              {project.status === 'Delayed' && (
                <span className="size-1.5 shrink-0 rounded-full bg-amber-500 shadow-[0_0_4px] shadow-amber-500/30" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface TodayDashboardProps {
  meetings: MeetingWithRelations[];
  building: PipelineProject[];
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    role?: string | null;
  }[];
  currentUserId: string | null;
  userRole: string | null;
  workspaceId: string;
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

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
  const {
    isViewingAs,
    startViewAs,
    stopViewAs,
    realRole,
    viewAsUserId: contextViewAsUserId,
  } = useAdminContext();
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(contextViewAsUserId);
  const isRealAdmin = realRole === 'admin';
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setNow(new Date());
  }, []);

  const effectiveUserId = viewAsUserId || currentUserId;
  const effectiveRole = isViewingAs ? 'employee' : userRole;
  const isNonAdmin = effectiveRole !== 'admin';
  const viewingAsOther = isRealAdmin && (viewAsUserId !== null || isViewingAs);

  const { session: activeSession, isLoading: sessionLoading } = useActiveSession(
    isNonAdmin ? workspaceId : null
  );
  const showClockIn =
    isNonAdmin && !viewingAsOther && !justClockedIn && !sessionLoading && activeSession === null;

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
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <header className="sticky top-0 z-sticky flex shrink-0 items-center justify-between border-b border-border/60 bg-card/80 px-4 py-2 backdrop-blur-xl sm:px-6">
        {/* Left: Nav + Greeting */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 min-h-[44px] min-w-[44px] lg:hidden"
            onClick={toggleMobile}
          >
            <Menu className="size-4" />
          </Button>
          <div className="flex items-baseline gap-2">
            <h1 className="text-[14px] font-semibold tracking-tight text-foreground">{greeting}</h1>
            <span className="hidden text-[11px] tabular-nums text-muted-foreground/40 sm:inline">
              {format(now, 'EEE, MMM d')}
            </span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5">
          {/* View-as — admin only */}
          {isRealAdmin && (
            <>
              <Select
                value={viewAsUserId || '__admin__'}
                onValueChange={(v) => {
                  if (v === '__admin__') {
                    setViewAsUserId(null);
                    if (isViewingAs) stopViewAs();
                  } else {
                    setViewAsUserId(v);
                    const sel = profiles.find((p) => p.id === v);
                    if (sel?.role && sel.role !== 'admin') startViewAs(sel.role, v);
                  }
                }}
              >
                <SelectTrigger
                  className={cn(
                    'h-7 w-32 gap-1 rounded-lg text-[11px] transition-all duration-200',
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
              <span className="mx-0.5 hidden h-4 w-px bg-border/50 sm:inline-block" />
            </>
          )}

          {/* Team presence — admin only */}
          {isRealAdmin && (
            <>
              <TeamPresence workspaceId={workspaceId} />
              <span className="mx-0.5 hidden h-4 w-px bg-border/50 sm:inline-block" />
            </>
          )}

          {/* New task */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 rounded-lg border-border/60 text-[12px] font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            onClick={() => setShowNewTaskModal(true)}
          >
            <Plus className="size-3" />
            <span className="hidden sm:inline">New task</span>
          </Button>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 min-h-[44px] min-w-[44px] transition-all duration-200"
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

          <NotificationPanel />
          <ThemeSwitcher />

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 min-h-[44px] min-w-[44px]"
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
        </div>
      </header>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <main className="flex min-h-0 flex-1 overflow-hidden lg:flex-row">
        {/* ── LEFT COLUMN: Tasks ── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-2 sm:px-5 lg:px-6">
          {/* Owner updates banner — all users */}
          {!viewingAsOther && <OwnerUpdatesBanner workspaceId={workspaceId} />}

          {/* Task workspace — scrolls internally */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <TeamTaskContainer
              workspaceId={workspaceId}
              userRole={effectiveRole}
              currentUserId={effectiveUserId}
              viewingAs={viewingAsOther}
            />
          </div>

          {/* Mobile: meetings + projects inline (below tasks) */}
          <div className="mt-2 shrink-0 space-y-2 lg:hidden">
            <div className="max-h-48 overflow-hidden overflow-y-auto rounded-xl border border-border bg-card shadow-sm">
              <MeetingsSidebar meetings={meetings} />
            </div>
            <ActiveProjectsList projects={building} />
          </div>
        </div>

        {/* ── RIGHT COLUMN: Schedule + Projects (desktop) ── */}
        <aside className="hidden min-h-0 w-80 shrink-0 flex-col border-l border-border/50 bg-muted/[0.02] lg:flex xl:w-[340px]">
          {/* Meetings — takes available space, scrolls if needed */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <MeetingsSidebar meetings={meetings} />
          </div>
          {/* Projects — pinned at bottom */}
          <div className="shrink-0">
            <ActiveProjectsList projects={building} />
          </div>
        </aside>
      </main>

      {/* ═══════════════════ MODALS ═══════════════════ */}
      <NewTaskModalControlled
        open={showNewTaskModal}
        onOpenChange={setShowNewTaskModal}
        defaultAssigneeId={viewAsUserId}
        defaultScheduledTime={null}
      />

      {isNonAdmin && !viewingAsOther && (
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
