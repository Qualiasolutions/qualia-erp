'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format, isToday, parseISO } from 'date-fns';
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
  Check,
  Circle,
  Pencil,
  Trash2,
  Inbox,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';
import { DailyScheduleGrid } from './daily-schedule-grid';
import { BuildingProjectSheet } from './building-project-sheet';
import { useTransition, useState, useEffect, useCallback } from 'react';
import { type Task, quickUpdateTask, deleteTask } from '@/app/actions/inbox';
import { type MeetingWithRelations, invalidateInboxTasks, invalidateDailyFlow } from '@/lib/swr';
import { EditTaskModal } from '@/components/edit-task-modal';
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

const PRIORITY_DOT: Record<string, string> = {
  Urgent: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-amber-400',
  Low: 'bg-sky-400',
  'No Priority': 'bg-foreground/10',
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
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/30">
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
                  <span className="flex-1 truncate text-[13px] font-medium text-foreground/70 group-hover:text-foreground/90">
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
// TODAY'S TASKS PANEL
// =============================================================================

function TaskRow({
  task,
  onEdit,
  onComplete,
  onDelete,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  const isDone = task.status === 'Done';
  const dotColor = PRIORITY_DOT[task.priority] || PRIORITY_DOT['No Priority'];

  return (
    <div
      className={cn(
        'group/task flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent/50',
        isDone && 'opacity-30'
      )}
      onClick={() => onEdit(task)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onComplete(task.id);
        }}
        className="shrink-0"
      >
        {isDone ? (
          <div className="flex size-4 items-center justify-center rounded-full bg-emerald-500">
            <Check className="size-2.5 text-white" strokeWidth={3} />
          </div>
        ) : (
          <Circle className="text-foreground/12 size-4 transition-colors hover:text-foreground/30" />
        )}
      </button>

      <div className={cn('size-1.5 shrink-0 rounded-full', dotColor)} />

      <span
        className={cn(
          'flex-1 truncate text-[13px] font-medium text-foreground/70',
          isDone && 'text-foreground/30 line-through'
        )}
      >
        {task.title}
      </span>

      <div className="flex shrink-0 items-center gap-px opacity-0 transition-opacity group-hover/task:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          className="flex size-6 items-center justify-center rounded text-foreground/25 transition-colors hover:bg-foreground/[0.05] hover:text-foreground/50"
        >
          <Pencil className="size-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="hover:bg-red-500/8 flex size-6 items-center justify-center rounded text-red-400/40 transition-colors hover:text-red-400"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  );
}

function TodaysTasksPanel({
  tasks,
  onEditTask,
}: {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}) {
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [, startTransition] = useTransition();

  // Split into pending and done
  const pending = tasks.filter((t) => t.status !== 'Done');
  const done = tasks.filter((t) => t.status === 'Done');

  const handleComplete = useCallback(
    async (taskId: string) => {
      const t = tasks.find((x) => x.id === taskId);
      await quickUpdateTask(taskId, { status: t?.status === 'Done' ? 'Todo' : 'Done' });
      invalidateInboxTasks();
      invalidateDailyFlow();
    },
    [tasks]
  );

  const handleDelete = useCallback((taskId: string) => {
    if (!confirm('Delete this task?')) return;
    startTransition(async () => {
      await deleteTask(taskId);
      invalidateInboxTasks(true);
      invalidateDailyFlow(true);
    });
  }, []);

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/30 px-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground/50">Tasks</span>
            {pending.length > 0 && (
              <span className="bg-amber-500/8 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                {pending.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="flex size-6 items-center justify-center rounded text-foreground/20 transition-colors hover:bg-accent hover:text-foreground/50"
            >
              <Plus className="size-3" />
            </button>
            <Link
              href="/inbox"
              className="flex size-6 items-center justify-center rounded text-foreground/15 transition-colors hover:bg-accent hover:text-foreground/40"
              title="Open inbox"
            >
              <Inbox className="size-3" />
            </Link>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-1.5 py-2">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-xs text-foreground/25">No tasks today</p>
            </div>
          ) : (
            <>
              {pending.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                />
              ))}
              {done.length > 0 && pending.length > 0 && (
                <div className="bg-border/8 mx-2 my-2 h-px" />
              )}
              {done.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                />
              ))}
            </>
          )}
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

  // Tasks that are NOT scheduled today (the "backlog" / inbox tasks)
  const unscheduledTasks = tasks.filter((t) => {
    if (!t.scheduled_start_time) return true;
    const s = parseISO(t.scheduled_start_time);
    return !isToday(s);
  });

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
            <h1 className="text-sm font-semibold tracking-tight text-foreground">{greeting}</h1>
            <span className="text-foreground/12 hidden sm:inline">|</span>
            <span className="hidden text-[13px] tabular-nums text-foreground/35 sm:inline">
              {format(now, 'EEE, MMM d')}
            </span>
          </div>

          {/* Minimal stats */}
          <div className="ml-2 hidden items-center gap-2 lg:flex">
            {pendingTasks > 0 && (
              <span className="text-xs tabular-nums text-foreground/30">
                <span className="font-semibold text-foreground/50">{pendingTasks}</span> tasks
              </span>
            )}
            {todaysMeetings.length > 0 && (
              <span className="text-xs tabular-nums text-foreground/30">
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
              <span className="text-xs font-semibold text-foreground/50">Building</span>
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

        {/* ── RIGHT: Today's Tasks ────────────────────────────────────────── */}
        <aside className="hidden w-[260px] shrink-0 border-l border-border/30 xl:flex xl:flex-col">
          <TodaysTasksPanel tasks={unscheduledTasks} onEditTask={setEditingTask} />
        </aside>
      </div>

      {/* ===== Modals & Sheets ===== */}
      <BuildingProjectSheet project={sheetProject} open={sheetOpen} onOpenChange={setSheetOpen} />
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}
    </div>
  );
}

export { DailyScheduleGrid } from './daily-schedule-grid';
