'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, RefreshCw, Settings, Menu, Sparkles } from 'lucide-react';
import { MeetingsWrapper } from './meetings-wrapper';
import { TasksWidget } from './tasks-widget';
import { ProjectPulseSidebar } from './project-pulse-sidebar';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';
import type { ProjectType } from '@/types/database';
import { useTransition, useState, useEffect } from 'react';
import { type Task } from '@/app/actions/inbox';
import { getScheduledIssues } from '@/app/actions';
import { type MeetingWithRelations } from '@/lib/swr';
import { motion } from 'framer-motion';

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  project_type: ProjectType | null;
  target_date: string | null;
  logo_url: string | null;
  issue_stats: {
    total: number;
    done: number;
  };
}

interface TodayDashboardProps {
  meetings: MeetingWithRelations[];
  tasks: Task[];
  teamMembers: TeamMember[];
  projects: Project[];
  finishedProjects: Project[];
  issues?: Awaited<ReturnType<typeof getScheduledIssues>>;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export function TodayDashboard({
  meetings,
  tasks,
  teamMembers,
  projects,
  finishedProjects,
  issues = [],
}: TodayDashboardProps) {
  const router = useRouter();
  const { toggleMobile } = useSidebar();
  const [isRefreshing, startRefresh] = useTransition();
  const [greeting, setGreeting] = useState('');

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

  const pendingTasks = (tasks || []).filter((t) => t.status !== 'Done').length;
  const todayMeetings = (meetings || []).filter((m) => {
    const meetingDate = new Date(m.start_time).toDateString();
    return meetingDate === now.toDateString();
  }).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-950/80 px-5 backdrop-blur-xl lg:px-8">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden" onClick={toggleMobile}>
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 ring-1 ring-white/10">
              <Sparkles className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">{greeting}</h1>
              <p className="text-xs text-zinc-500">{format(now, 'EEEE, MMMM d')}</p>
            </div>
          </div>

          {/* Stats Pills */}
          <div className="ml-6 hidden items-center gap-3 lg:flex">
            <div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1.5 ring-1 ring-amber-500/20">
              <span className="text-sm font-semibold tabular-nums text-amber-400">
                {pendingTasks}
              </span>
              <span className="text-xs text-amber-400/70">tasks</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1.5 ring-1 ring-violet-500/20">
              <span className="text-sm font-semibold tabular-nums text-violet-400">
                {todayMeetings}
              </span>
              <span className="text-xs text-violet-400/70">meetings</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 ring-1 ring-emerald-500/20">
              <span className="text-sm font-semibold tabular-nums text-emerald-400">
                {projects.length}
              </span>
              <span className="text-xs text-emerald-400/70">building</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-9 gap-2 rounded-lg bg-white/5 px-4 text-xs font-medium text-zinc-300 transition-all hover:bg-white/10 hover:text-white lg:flex"
            asChild
          >
            <Link href="/schedule?new=1">
              <Plus className="h-3.5 w-3.5" />
              New Event
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
          <div className="mx-2 h-5 w-px bg-white/10" />
          <HeaderOnlineIndicator />
          <NotificationPanel />
          <ThemeSwitcher />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            asChild
          >
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main - 3 Column Layout */}
      <main className="min-h-0 flex-1 overflow-hidden p-4 lg:p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto grid h-full max-w-[1920px] grid-cols-1 gap-5 lg:grid-cols-3"
        >
          {/* Tasks Card */}
          <motion.div
            custom={0}
            variants={cardVariants}
            className="group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900/80 shadow-2xl shadow-amber-500/5 ring-1 ring-white/[0.08] backdrop-blur-xl transition-shadow duration-500 hover:shadow-amber-500/10"
          >
            {/* Gradient glow effect */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-amber-500/20 opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <TasksWidget tasks={tasks} teamMembers={teamMembers} />
            </div>
          </motion.div>

          {/* Meetings Card */}
          <motion.div
            custom={1}
            variants={cardVariants}
            className="group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900/80 shadow-2xl shadow-violet-500/5 ring-1 ring-white/[0.08] backdrop-blur-xl transition-shadow duration-500 hover:shadow-violet-500/10"
          >
            {/* Gradient glow effect */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-violet-500/20 opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <MeetingsWrapper initialMeetings={meetings} initialIssues={issues} />
            </div>
          </motion.div>

          {/* Projects Card */}
          <motion.div
            custom={2}
            variants={cardVariants}
            className="group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900/80 shadow-2xl shadow-emerald-500/5 ring-1 ring-white/[0.08] backdrop-blur-xl transition-shadow duration-500 hover:shadow-emerald-500/10"
          >
            {/* Gradient glow effect */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-500/20 opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <ProjectPulseSidebar activeProjects={projects} finishedProjects={finishedProjects} />
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

export { MeetingsTimeline } from './meetings-timeline';
export { MeetingsWrapper } from './meetings-wrapper';
export { TasksWidget } from './tasks-widget';
export { ProjectPulseSidebar } from './project-pulse-sidebar';
