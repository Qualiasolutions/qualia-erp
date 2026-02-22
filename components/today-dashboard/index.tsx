'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format, isToday, parseISO, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  Settings,
  Menu,
  Bot,
  Globe,
  Mic2,
  Hammer,
  Plus,
  ChevronRight,
  Search,
  Video,
  ExternalLink,
  Inbox,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';
import { DailyScheduleGrid } from './daily-schedule-grid';
import { BuildingProjectSheet } from './building-project-sheet';
import { useTransition, useState, useEffect } from 'react';
import { type Task } from '@/app/actions/inbox';
import { type MeetingWithRelations } from '@/lib/swr';
import { NewTaskModalControlled } from '@/components/new-task-modal';

interface Project {
  id: string;
  name: string;
  project_type: string | null;
  logo_url?: string | null;
  is_building?: boolean;
}

interface TodayDashboardProps {
  meetings: MeetingWithRelations[];
  tasks: Task[];
  projects: Project[];
  finishedProjects: unknown[];
  issues?: unknown[];
}

// =============================================================================
// PROJECT TYPE CONFIG
// =============================================================================

const PROJECT_TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; dotColor: string; label: string }
> = {
  ai_agent: {
    icon: <Bot className="size-3.5" />,
    color: 'text-violet-600 dark:text-violet-400 bg-violet-500/8',
    dotColor: 'bg-violet-500',
    label: 'AI Agents',
  },
  voice_agent: {
    icon: <Mic2 className="size-3.5" />,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/8',
    dotColor: 'bg-amber-500',
    label: 'Voice',
  },
  web_design: {
    icon: <Globe className="size-3.5" />,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/8',
    dotColor: 'bg-emerald-500',
    label: 'Web',
  },
  seo: {
    icon: <Search className="size-3.5" />,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-500/8',
    dotColor: 'bg-blue-500',
    label: 'SEO',
  },
  ads: {
    icon: <Globe className="size-3.5" />,
    color: 'text-pink-600 dark:text-pink-400 bg-pink-500/8',
    dotColor: 'bg-pink-500',
    label: 'Ads',
  },
  other: {
    icon: <Globe className="size-3.5" />,
    color: 'text-foreground/50 bg-muted/50',
    dotColor: 'bg-zinc-500',
    label: 'Other',
  },
};

// =============================================================================
// PROJECT LOGO
// =============================================================================

function ProjectLogo({
  logo_url,
  name,
  project_type,
}: {
  logo_url?: string | null;
  name: string;
  project_type?: string | null;
}) {
  if (logo_url) {
    return (
      <div className="size-6 shrink-0 overflow-hidden rounded-md border border-border/30">
        <Image
          src={logo_url}
          alt={name}
          width={24}
          height={24}
          className="size-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  const config = PROJECT_TYPE_CONFIG[project_type || 'other'] || PROJECT_TYPE_CONFIG.other;
  return (
    <div
      className={cn('flex size-6 shrink-0 items-center justify-center rounded-md', config.color)}
    >
      {config.icon}
    </div>
  );
}

// =============================================================================
// BUILDING PROJECTS PANEL
// =============================================================================

function BuildingProjectsList({
  projects,
  onProjectClick,
}: {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}) {
  const grouped = projects.reduce(
    (acc, project) => {
      const type = project.project_type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(project);
      return acc;
    },
    {} as Record<string, Project[]>
  );

  const typeOrder = ['ai_agent', 'voice_agent', 'web_design', 'seo', 'ads', 'other'];

  if (projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <p className="text-xs text-foreground/30">No active builds</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2.5">
      {typeOrder.map((type) => {
        const typeProjects = grouped[type];
        if (!typeProjects?.length) return null;
        const config = PROJECT_TYPE_CONFIG[type] || PROJECT_TYPE_CONFIG.other;

        return (
          <div key={type} className="mb-3 last:mb-0">
            <div className="mb-1.5 flex items-center gap-2 px-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/30">
                {config.label}
              </span>
            </div>
            <div className="space-y-px">
              {typeProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onProjectClick(project)}
                  className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/50"
                >
                  <ProjectLogo
                    logo_url={project.logo_url}
                    name={project.name}
                    project_type={project.project_type}
                  />
                  <span className="flex-1 truncate text-sm font-medium text-foreground/70 group-hover:text-foreground/90">
                    {project.name}
                  </span>
                  <ChevronRight className="size-3.5 text-foreground/15 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// OVERVIEW PANEL
// =============================================================================

function OverviewPanel({ meetings, tasks }: { meetings: MeetingWithRelations[]; tasks: Task[] }) {
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  const now = new Date();
  const todaysMeetings = meetings
    .filter((m) => isToday(parseISO(m.start_time)))
    .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());

  const upcomingMeetings = todaysMeetings.filter((m) => parseISO(m.end_time) > now);
  const pendingCount = tasks.filter((t) => t.status !== 'Done').length;
  const doneCount = tasks.filter((t) => t.status === 'Done').length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const overdueTasks = tasks.filter(
    (t) =>
      t.due_date &&
      isPast(parseISO(t.due_date)) &&
      !isToday(parseISO(t.due_date)) &&
      t.status !== 'Done'
  );

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center border-b border-border/30 px-4">
          <span className="text-sm font-semibold text-foreground/60">Overview</span>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {/* Progress Card */}
          <div className="rounded-xl border border-border/20 bg-muted/15 p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-foreground/35">
                Today&apos;s Progress
              </span>
              <span className="text-xs tabular-nums text-foreground/30">
                {doneCount}/{totalCount}
              </span>
            </div>
            <div className="mb-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold tabular-nums text-foreground">
                {progressPercent}
              </span>
              <span className="text-sm text-foreground/25">%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary/70'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {pendingCount > 0 && (
              <p className="mt-2.5 text-xs text-foreground/30">
                {pendingCount} task{pendingCount !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>

          {/* Overdue Alert */}
          {overdueTasks.length > 0 && (
            <div className="rounded-lg border border-red-500/15 bg-red-500/[0.04] px-4 py-3">
              <p className="text-sm font-medium text-red-400">
                {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}
              </p>
              <div className="mt-2 space-y-1">
                {overdueTasks.slice(0, 3).map((t) => (
                  <p key={t.id} className="truncate text-xs text-red-400/60">
                    {t.title}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Up Next - Meetings */}
          {upcomingMeetings.length > 0 && (
            <div>
              <h4 className="mb-3 px-1 text-xs font-medium uppercase tracking-wider text-foreground/35">
                Up Next
              </h4>
              <div className="space-y-2">
                {upcomingMeetings.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border border-violet-500/10 bg-violet-500/[0.04] p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-violet-500/10">
                        <Video className="size-3 text-violet-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground/80">{m.title}</p>
                        <p className="mt-0.5 text-xs tabular-nums text-foreground/30">
                          {format(parseISO(m.start_time), 'h:mm')} –{' '}
                          {format(parseISO(m.end_time), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                    {m.meeting_link && (
                      <a
                        href={m.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-violet-500/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-500"
                      >
                        <ExternalLink className="size-3" />
                        Join Meeting
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h4 className="mb-3 px-1 text-xs font-medium uppercase tracking-wider text-foreground/35">
              Quick Actions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="flex items-center gap-2 rounded-lg border border-border/20 bg-muted/10 px-3 py-2.5 text-sm text-foreground/60 transition-colors hover:bg-muted/30 hover:text-foreground/80"
              >
                <Plus className="size-3.5" />
                New Task
              </button>
              <Link
                href="/inbox"
                className="flex items-center gap-2 rounded-lg border border-border/20 bg-muted/10 px-3 py-2.5 text-sm text-foreground/60 transition-colors hover:bg-muted/30 hover:text-foreground/80"
              >
                <Inbox className="size-3.5" />
                Inbox
              </Link>
            </div>
          </div>
        </div>
      </div>

      <NewTaskModalControlled
        open={showNewTaskModal}
        onOpenChange={setShowNewTaskModal}
        defaultAssigneeId={null}
        defaultScheduledTime={null}
      />
    </>
  );
}

// =============================================================================
// MAIN DASHBOARD
// =============================================================================

export function TodayDashboard({ meetings, tasks, projects }: TodayDashboardProps) {
  const router = useRouter();
  const { toggleMobile } = useSidebar();
  const [isRefreshing, startRefresh] = useTransition();
  const [greeting, setGreeting] = useState('');
  const [sheetProject, setSheetProject] = useState<Project | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
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

  const todaysMeetings = meetings.filter((m) => isToday(parseISO(m.start_time)));
  const pendingTasks = tasks.filter((t) => t.status !== 'Done').length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ===== TOP BAR ===== */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/30 bg-background px-5">
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

          {/* Minimal stats */}
          <div className="ml-2 hidden items-center gap-2 lg:flex">
            {pendingTasks > 0 && (
              <span className="text-sm tabular-nums text-foreground/30">
                <span className="font-semibold text-foreground/50">{pendingTasks}</span> tasks
              </span>
            )}
            {todaysMeetings.length > 0 && (
              <span className="text-sm tabular-nums text-foreground/30">
                <span className="font-semibold text-violet-500/70">{todaysMeetings.length}</span>{' '}
                meetings
              </span>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
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

      {/* ===== THREE-COLUMN LAYOUT ===== */}
      <div className="flex min-h-0 flex-1">
        {/* ── LEFT: Building Projects ─────────────────────────────────────── */}
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border/30 lg:flex">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/30 px-3">
            <div className="flex items-center gap-1.5">
              <Hammer className="size-3.5 text-foreground/30" />
              <span className="text-sm font-semibold text-foreground/50">Building</span>
              <span className="bg-emerald-500/8 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {projects.length}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="size-5" asChild>
              <Link href="/projects?filter=building">
                <Plus className="size-2.5 text-foreground/20" />
              </Link>
            </Button>
          </div>
          <BuildingProjectsList
            projects={projects}
            onProjectClick={(p) => {
              setSheetProject(p);
              setSheetOpen(true);
            }}
          />
        </aside>

        {/* ── CENTER: Schedule ─────────────────────────────────────────────── */}
        <section className="min-w-0 flex-1">
          <DailyScheduleGrid tasks={tasks} meetings={meetings} />
        </section>

        {/* ── RIGHT: Overview ────────────────────────────────────────────── */}
        <aside className="hidden w-[260px] shrink-0 border-l border-border/30 xl:flex xl:flex-col">
          <OverviewPanel meetings={meetings} tasks={tasks} />
        </aside>
      </div>

      {/* ===== Modals & Sheets ===== */}
      <BuildingProjectSheet project={sheetProject} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

export { DailyScheduleGrid } from './daily-schedule-grid';
