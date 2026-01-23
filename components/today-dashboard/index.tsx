'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, RefreshCw, Settings, Menu } from 'lucide-react';
import { MeetingsWrapper } from './meetings-wrapper';
import { TasksWidget } from './tasks-widget';
import { ProjectPulseSidebar } from './project-pulse-sidebar';
import { AISpotlight } from './ai-spotlight';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useSidebar } from '@/components/sidebar-provider';
import { HeaderOnlineIndicator } from '@/components/header-online-indicator';
import { NotificationPanel } from '@/components/notification-panel';
import type { ProjectType } from '@/types/database';
import { useTransition, useState, useEffect } from 'react';
import { type Task } from '@/app/actions/inbox';
import { motion } from 'framer-motion';

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link?: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string; logo_url?: string | null } | null;
  attendees?: Array<{
    profile: { id: string; full_name: string | null; avatar_url?: string | null };
  }>;
}

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
  meetings: Meeting[];
  tasks: Task[];
  teamMembers: TeamMember[];
  projects: Project[];
  finishedProjects: Project[];
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export function TodayDashboard({
  meetings,
  tasks,
  teamMembers,
  projects,
  finishedProjects,
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
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={toggleMobile}>
            <Menu className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-sm font-semibold text-white">{greeting}</h1>
            <p className="text-xs text-zinc-500">{format(now, 'EEEE, MMMM d')}</p>
          </div>

          {/* Stats */}
          <div className="ml-4 hidden items-center gap-4 lg:flex">
            <div className="flex items-center gap-2">
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-xs font-bold text-amber-400">
                {pendingTasks}
              </span>
              <span className="text-xs text-zinc-500">tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500/20 px-1.5 text-xs font-bold text-violet-400">
                {todayMeetings}
              </span>
              <span className="text-xs text-zinc-500">meetings</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-8 gap-1.5 text-xs text-zinc-400 hover:text-white lg:flex"
            asChild
          >
            <Link href="/schedule?new=1">
              <Plus className="h-3.5 w-3.5" />
              New
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
          <div className="mx-1 h-4 w-px bg-white/10" />
          <HeaderOnlineIndicator />
          <NotificationPanel />
          <ThemeSwitcher />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white"
            asChild
          >
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main - Bento Grid */}
      <main className="min-h-0 flex-1 overflow-auto p-4 lg:p-5">
        <div className="mx-auto grid h-full max-w-[1600px] gap-4 lg:grid-cols-12 lg:grid-rows-2">
          {/* Meetings - Top Left */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 via-zinc-900 to-zinc-900 ring-1 ring-white/10 lg:col-span-5 lg:row-span-1"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
            <div className="relative h-full">
              <MeetingsWrapper initialMeetings={meetings} />
            </div>
          </motion.div>

          {/* Projects - Top Right */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-900 ring-1 ring-white/10 lg:col-span-4 lg:row-span-2"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
            <div className="relative h-full">
              <ProjectPulseSidebar activeProjects={projects} finishedProjects={finishedProjects} />
            </div>
          </motion.div>

          {/* Quick Stats - Top Far Right */}
          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-3 lg:col-span-3 lg:row-span-1"
          >
            {/* Active count */}
            <div className="flex flex-1 flex-col justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 via-zinc-900 to-zinc-900 p-4 ring-1 ring-white/10">
              <span className="text-3xl font-bold text-white">{projects.length}</span>
              <span className="text-xs text-zinc-500">Active projects</span>
            </div>
            {/* Completed */}
            <div className="flex flex-1 flex-col justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 p-4 ring-1 ring-white/10">
              <span className="text-3xl font-bold text-white">{finishedProjects.length}</span>
              <span className="text-xs text-zinc-500">Completed</span>
            </div>
          </motion.div>

          {/* Tasks - Bottom Full Width */}
          <motion.div
            custom={3}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/5 via-zinc-900 to-zinc-900 ring-1 ring-white/10 lg:col-span-8 lg:row-span-1"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" />
            <div className="relative h-full">
              <TasksWidget tasks={tasks} teamMembers={teamMembers} />
            </div>
          </motion.div>
        </div>
      </main>

      {/* AI Spotlight */}
      <AISpotlight />
    </div>
  );
}

export { MeetingsTimeline } from './meetings-timeline';
export { MeetingsWrapper } from './meetings-wrapper';
export { TasksWidget } from './tasks-widget';
export { AISpotlight } from './ai-spotlight';
export { ProjectPulseSidebar } from './project-pulse-sidebar';
