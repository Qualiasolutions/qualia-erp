'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Video, RefreshCw, Settings, Menu } from 'lucide-react';
import { MeetingsWrapper } from './meetings-wrapper';
import { TasksWidget } from './tasks-widget';
import { ProjectsWidget } from './projects-widget';
import { FinishedProjectsWidget } from './finished-projects-widget';
import { DashboardAIChat } from './dashboard-ai-chat';
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

// Fun greetings with personality
const greetings = {
  morning: ['Good morning', 'Rise and shine', 'Morning'],
  afternoon: ['Good afternoon', 'Hey there', 'Afternoon'],
  evening: ['Good evening', 'Evening', 'Hey'],
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

  // Set greeting on mount (client-side only to avoid hydration mismatch)
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting(greetings.morning[Math.floor(Math.random() * greetings.morning.length)]);
    } else if (hour < 17) {
      setGreeting(greetings.afternoon[Math.floor(Math.random() * greetings.afternoon.length)]);
    } else {
      setGreeting(greetings.evening[Math.floor(Math.random() * greetings.evening.length)]);
    }
  }, []);

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh();
    });
  };

  // Calculate stats for the header
  const pendingTasks = (tasks || []).filter((t) => t.status !== 'Done').length;
  const todayMeetings = (meetings || []).filter((m) => {
    const meetingDate = new Date(m.start_time).toDateString();
    return meetingDate === now.toDateString();
  }).length;

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden">
      {/* Single Compact Header - Everything in one line */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 bg-card/50 px-3 backdrop-blur-sm sm:px-4">
        {/* Left: Mobile menu + Greeting + Date */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={toggleMobile}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{greeting || 'Hello'}</span>
            <span className="hidden text-muted-foreground/40 sm:inline">·</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {format(now, 'EEE, MMM d')}
            </span>
          </div>

          {/* Mini stats - visible on md+ */}
          <div className="hidden items-center gap-2 text-xs md:flex">
            <span className="text-muted-foreground/40">·</span>
            <span className="text-amber-600 dark:text-amber-400">{pendingTasks} tasks</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-emerald-600 dark:text-emerald-400">{todayMeetings} meetings</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="hidden h-8 gap-1.5 px-2 sm:flex" asChild>
            <Link href="/schedule?new=1">
              <Video className="h-3.5 w-3.5" />
              <span className="text-xs">Schedule</span>
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <HeaderOnlineIndicator />
          <NotificationPanel />

          <Link
            href="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>

          <ThemeSwitcher />
        </div>
      </header>

      {/* Main Content - fits exactly in remaining viewport */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto h-full max-w-[1800px] px-4 py-3 sm:px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="h-full"
          >
            {/* Bento Grid Layout - cleaner 3-column design */}
            <div className="grid h-full gap-3 lg:grid-cols-12 lg:gap-4">
              {/* Left Column - Projects stacked */}
              <div className="flex h-full min-h-0 flex-col gap-3 lg:col-span-3">
                {/* Live Projects - 55% */}
                <motion.div variants={itemVariants} className="h-[55%] min-h-0 shrink-0">
                  <ProjectsWidget projects={projects} />
                </motion.div>

                {/* Finished Projects - 45% */}
                <motion.div variants={itemVariants} className="h-[45%] min-h-0">
                  <FinishedProjectsWidget projects={finishedProjects} />
                </motion.div>
              </div>

              {/* Middle Column - Tasks + AI Chat stacked */}
              <div className="flex h-full min-h-0 flex-col gap-3 lg:col-span-6">
                {/* Tasks - 60% */}
                <motion.div variants={itemVariants} className="h-[60%] min-h-0 shrink-0">
                  <TasksWidget tasks={tasks} teamMembers={teamMembers} />
                </motion.div>

                {/* AI Chat - 40% */}
                <motion.div variants={itemVariants} className="h-[40%] min-h-0">
                  <DashboardAIChat />
                </motion.div>
              </div>

              {/* Right Column - Meetings (full height) */}
              <motion.div variants={itemVariants} className="h-full min-h-0 lg:col-span-3">
                <MeetingsWrapper initialMeetings={meetings} />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

// Re-export components
export { MeetingsTimeline } from './meetings-timeline';
export { MeetingsWrapper } from './meetings-wrapper';
export { TasksWidget } from './tasks-widget';
export { ProjectsWidget } from './projects-widget';
export { FinishedProjectsWidget } from './finished-projects-widget';
export { DashboardAIChat } from './dashboard-ai-chat';
