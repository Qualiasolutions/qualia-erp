'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  Loader2,
  Briefcase,
  Zap,
  Globe,
  TrendingUp,
  Share2,
  Calendar,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { quickUpdateTask, type Task } from '@/app/actions/inbox';
import type { DashboardProject } from '@/app/dashboard-page';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  workspaceId?: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
  creator?: { id: string; full_name: string | null } | null;
}

interface DashboardClientProps {
  greeting: string;
  dateString: string;
  user?: DashboardUser;
  todaysTasks?: Task[];
  upcomingMeetings?: Meeting[];
  projects?: DashboardProject[];
  pendingTasks?: Task[];
}

function TaskItem({
  task,
  onComplete,
  isPending,
}: {
  task: Task;
  onComplete: (id: string) => void;
  isPending: boolean;
}) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:border-primary/30 hover:bg-white/10 hover:shadow-glow-sm">
      <button
        onClick={() => onComplete(task.id)}
        disabled={isPending}
        className="flex h-6 w-6 shrink-0 items-center justify-center"
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Circle className="h-6 w-6 text-white/20 transition-colors group-hover:text-primary" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-foreground/90 group-hover:text-foreground">
          {task.title}
        </p>
        {task.project && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground/70">{task.project.name}</p>
        )}
      </div>
      {isOverdue && (
        <span className="shrink-0 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-400">
          Overdue
        </span>
      )}
    </div>
  );
}

function ProjectItem({ project }: { project: DashboardProject }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:border-primary/30 hover:bg-white/10 hover:shadow-glow-sm"
    >
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-semibold text-foreground/90 transition-colors group-hover:text-primary">
          {project.name}
        </h4>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
          <span>{project.status}</span>
          {project.client && (
            <>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span className="truncate">{project.client.display_name}</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}

function ProjectCategory({
  title,
  icon: Icon,
  projects,
  color,
}: {
  title: string;
  icon: LucideIcon;
  projects: DashboardProject[];
  color: string;
}) {
  if (projects.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div
          className={cn('flex h-6 w-6 items-center justify-center rounded-md bg-opacity-20', color)}
        >
          <Icon className={cn('h-3.5 w-3.5', color.replace('bg-', 'text-'))} />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
          {title}
        </h3>
        <span className="ml-auto text-[11px] font-medium text-muted-foreground/40">
          {projects.length}
        </span>
      </div>
      <div className="grid gap-2">
        {projects.map((project) => (
          <ProjectItem key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

export function DashboardClient({
  greeting,
  dateString,
  user,
  todaysTasks = [],
  projects = [],
  pendingTasks = [],
}: DashboardClientProps) {
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState(todaysTasks);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTasks(todaysTasks);
  }, [todaysTasks]);

  const handleCompleteTask = useCallback((taskId: string) => {
    setCompletingTaskId(taskId);
    startTransition(async () => {
      await quickUpdateTask(taskId, { status: 'Done' });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setCompletingTaskId(null);
    });
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin-slow h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary shadow-glow" />
      </div>
    );
  }

  // Group projects
  const aiAgents = projects.filter(
    (p) => p.project_type === 'ai_agent' || p.project_type === 'voice_agent'
  );
  const websites = projects.filter((p) => p.project_type === 'web_design');
  const seo = projects.filter((p) => p.project_type === 'seo');
  const socialMedia = projects.filter((p) => p.project_type === 'ads');
  const others = projects.filter(
    (p) => !['ai_agent', 'voice_agent', 'web_design', 'seo', 'ads'].includes(p.project_type || '')
  );

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      {/* Premium Background Elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-[-5%] top-[-10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] h-[40%] w-[40%] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative border-b border-white/5 bg-white/[0.01] px-8 py-12 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-foreground drop-shadow-sm">
              {greeting},{' '}
              <span className="font-semibold text-primary">{user?.name.split(' ')[0]}</span>
            </h1>
            <p className="mt-2 text-lg font-medium text-muted-foreground/80">{dateString}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-card text-xs font-bold text-muted-foreground"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary/20 text-xs font-bold text-primary">
                +12
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-8 py-12">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Left Column - Tasks & Focus (7/12) */}
          <div className="space-y-12 lg:col-span-7">
            {/* Today's Tasks */}
            <section className="group relative">
              <div className="absolute -inset-0.5 rounded-[2rem] bg-gradient-to-r from-primary/10 to-transparent px-1 opacity-0 blur-xl transition duration-1000 group-hover:opacity-100"></div>
              <div className="relative rounded-[1.5rem] border border-white/5 bg-card/40 p-8 shadow-2xl backdrop-blur-sm">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-foreground">
                        Daily Focus
                      </h2>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Priority Tasks for Today
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-xs font-bold text-muted-foreground sm:inline-flex">
                      {tasks.length} REMAINING
                    </span>
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow transition-all hover:scale-105 hover:bg-primary/90 active:scale-95">
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {tasks.length > 0 ? (
                  <div className="space-y-4">
                    {tasks.slice(0, 6).map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onComplete={handleCompleteTask}
                        isPending={completingTaskId === task.id}
                      />
                    ))}
                    {tasks.length > 6 && (
                      <Link
                        href="/projects"
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 py-4 text-sm font-bold text-muted-foreground transition-all hover:border-primary/20 hover:bg-white/5 hover:text-foreground"
                      >
                        VIEW {tasks.length - 6} MORE TASKS
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <p className="text-xl font-medium text-foreground">
                      You&apos;re all caught up!
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Why not plan your next big move?
                    </p>
                    <button className="mt-8 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-white/10">
                      CREATE NEW TASK
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Pending Feedback */}
            {pendingTasks.length > 0 && (
              <section className="rounded-[1.5rem] border border-white/5 bg-card/40 p-8 backdrop-blur-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Awaiting Review</h2>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Needs your attention
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4">
                  {pendingTasks.slice(0, 3).map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onComplete={handleCompleteTask}
                      isPending={completingTaskId === task.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Projects (5/12) */}
          <div className="space-y-12 lg:col-span-5">
            <section className="rounded-[1.5rem] border border-white/5 bg-card/60 p-8 shadow-xl backdrop-blur-md">
              <div className="mb-10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Active Projects
                  </h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Workspace Portfolio
                  </p>
                </div>
                <Link
                  href="/projects"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
                >
                  <Briefcase className="h-5 w-5" />
                </Link>
              </div>

              <div className="space-y-10">
                <ProjectCategory
                  title="AI Agents"
                  icon={Zap}
                  projects={aiAgents}
                  color="bg-primary"
                />
                <ProjectCategory
                  title="Websites"
                  icon={Globe}
                  projects={websites}
                  color="bg-blue-500"
                />
                <ProjectCategory
                  title="SEO Strategy"
                  icon={TrendingUp}
                  projects={seo}
                  color="bg-emerald-500"
                />
                <ProjectCategory
                  title="Social Media"
                  icon={Share2}
                  projects={socialMedia}
                  color="bg-purple-500"
                />
                <ProjectCategory
                  title="Other"
                  icon={Briefcase}
                  projects={others}
                  color="bg-gray-500"
                />

                {projects.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
                    <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/20" />
                    <p className="mt-4 text-sm font-medium text-muted-foreground">
                      No active projects yet
                    </p>
                    <Link
                      href="/projects"
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:shadow-glow"
                    >
                      <Plus className="h-4 w-4" />
                      CREATE PROJECT
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* Quick Insights */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 transition-colors hover:bg-white/[0.04]">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Completion
                </p>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-white">84%</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 transition-colors hover:bg-white/[0.04]">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Meetings
                </p>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-white">3</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Command Hint */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/5 bg-white/[0.03] px-6 py-3 text-sm font-medium text-muted-foreground">
            <span>Press</span>
            <kbd className="flex h-6 min-w-[24px] items-center justify-center rounded bg-white/10 px-1.5 font-mono text-[11px] font-bold text-foreground">
              ⌘
            </kbd>
            <kbd className="flex h-6 min-w-[24px] items-center justify-center rounded bg-white/10 px-1.5 font-mono text-[11px] font-bold text-foreground">
              K
            </kbd>
            <span>to execute commands</span>
          </div>
        </div>
      </div>
    </div>
  );
}
