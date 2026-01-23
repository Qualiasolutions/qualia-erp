'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, RefreshCw, Settings, Menu, Calendar, CheckSquare } from 'lucide-react';
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
  client?: { id: string; display_name: string } | null;
  attendees?: Array<{ profile: { id: string; full_name: string | null } }>;
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

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
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
    startRefresh(() => {
      router.refresh();
    });
  };

  const pendingTasks = (tasks || []).filter((t) => t.status !== 'Done').length;
  const todayMeetings = (meetings || []).filter((m) => {
    const meetingDate = new Date(m.start_time).toDateString();
    return meetingDate === now.toDateString();
  }).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Minimal Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={toggleMobile}>
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-foreground">{greeting}</h1>
            <p className="text-xs text-muted-foreground">{format(now, 'EEEE, MMMM d')}</p>
          </div>
        </div>

        {/* Stats pills - subtle */}
        <div className="hidden items-center gap-6 lg:flex">
          <div className="flex items-center gap-2 text-sm">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{pendingTasks}</span>
            <span className="text-muted-foreground">tasks</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{todayMeetings}</span>
            <span className="text-muted-foreground">meetings</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="hidden h-8 gap-1.5 text-xs lg:flex" asChild>
            <Link href="/schedule?new=1">
              <Plus className="h-3.5 w-3.5" />
              Meeting
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <HeaderOnlineIndicator />
          <NotificationPanel />
          <ThemeSwitcher />
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full p-4 lg:p-6">
          <div className="grid h-full gap-4 lg:grid-cols-12 lg:gap-6">
            {/* Main Column: Meetings + Tasks */}
            <motion.div {...fadeIn} className="flex min-h-0 flex-col gap-4 lg:col-span-8 lg:gap-6">
              {/* Meetings - Compact */}
              <div className="h-[280px] shrink-0 overflow-hidden rounded-xl border border-border/50 bg-card">
                <MeetingsWrapper initialMeetings={meetings} />
              </div>

              {/* Tasks - Fills remaining space */}
              <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border/50 bg-card">
                <TasksWidget tasks={tasks} teamMembers={teamMembers} />
              </div>
            </motion.div>

            {/* Sidebar: Project Pulse */}
            <motion.div
              {...fadeIn}
              transition={{ ...fadeIn.transition, delay: 0.1 }}
              className="min-h-0 overflow-hidden rounded-xl border border-border/50 bg-card lg:col-span-4"
            >
              <ProjectPulseSidebar activeProjects={projects} finishedProjects={finishedProjects} />
            </motion.div>
          </div>
        </div>
      </main>

      {/* Floating AI Spotlight */}
      <AISpotlight />
    </div>
  );
}

// Re-export components
export { MeetingsTimeline } from './meetings-timeline';
export { MeetingsWrapper } from './meetings-wrapper';
export { TasksWidget } from './tasks-widget';
export { AISpotlight } from './ai-spotlight';
export { ProjectPulseSidebar } from './project-pulse-sidebar';
