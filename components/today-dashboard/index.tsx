'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Video, RefreshCw, Settings, Menu, LayoutDashboard } from 'lucide-react';
import { MeetingsWrapper } from './meetings-wrapper';
import { TasksWidget } from './tasks-widget';
import { ProjectPulseSidebar } from './project-pulse-sidebar';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const greetings = {
  morning: ['Good morning', 'Ready for the day?', 'Morning, team'],
  afternoon: ['Good afternoon', 'Productive day?', 'Hey there'],
  evening: ['Good evening', 'Wrapping up?', 'Evening'],
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

  const pendingTasks = (tasks || []).filter((t) => t.status !== 'Done').length;
  const todayMeetings = (meetings || []).filter((m) => {
    const meetingDate = new Date(m.start_time).toDateString();
    return meetingDate === now.toDateString();
  }).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      {/* Premium Header */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-background/50 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-2xl md:hidden"
            onClick={toggleMobile}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold tracking-tight text-foreground">
                {greeting || 'Qualia Suite'}
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground">
                {format(now, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>

          <div className="hidden h-8 w-[1px] bg-border/50 md:block" />

          {/* Activity Pills */}
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-border/40 bg-background/50 px-3 py-1 font-medium transition-colors hover:bg-background">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              <span className="text-[11px] text-foreground">{pendingTasks} Tasks Due</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/40 bg-background/50 px-3 py-1 font-medium transition-colors hover:bg-background">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[11px] text-foreground">{todayMeetings} Events Today</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="ghost" size="sm" className="h-10 gap-2 rounded-2xl px-4" asChild>
              <Link href="/schedule?new=1">
                <Video className="h-4 w-4 text-primary" />
                <span className="text-[13px] font-semibold">New Meeting</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-2xl"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>

          <div className="mx-2 h-6 w-[1px] bg-border/40" />

          <div className="flex items-center gap-2">
            <HeaderOnlineIndicator />
            <NotificationPanel />
            <ThemeSwitcher />
            <Link
              href="/settings"
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="relative z-10 min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto h-full max-w-[1920px] p-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid h-full gap-6 lg:grid-cols-12"
          >
            {/* Left Column: Feed & Tasks (8 cols) */}
            <div className="flex h-full min-h-0 flex-col gap-6 lg:col-span-8">
              {/* Top: Meetings Timeline */}
              <motion.div variants={itemVariants} className="h-[35%] min-h-0 shrink-0">
                <div className="h-full overflow-hidden rounded-3xl border border-border/40 bg-card/30 shadow-sm backdrop-blur-md">
                  <MeetingsWrapper initialMeetings={meetings} />
                </div>
              </motion.div>

              {/* Bottom: Tasks Widget */}
              <motion.div variants={itemVariants} className="min-h-0 flex-1">
                <div className="h-full overflow-hidden rounded-3xl border border-border/40 bg-card/30 shadow-sm backdrop-blur-md">
                  <TasksWidget tasks={tasks} teamMembers={teamMembers} />
                </div>
              </motion.div>
            </div>

            {/* Right Column: Project Pulse & AI Assistant (4 cols) */}
            <div className="flex h-full min-h-0 flex-col gap-6 lg:col-span-4">
              {/* Project Pulse */}
              <motion.div variants={itemVariants} className="h-[55%] min-h-0 shrink-0">
                <ProjectPulseSidebar
                  activeProjects={projects}
                  finishedProjects={finishedProjects}
                />
              </motion.div>

              {/* AI Assistant Chat */}
              <motion.div variants={itemVariants} className="min-h-0 flex-1">
                <DashboardAIChat />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Subtle Bottom Accent */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-primary/5 to-transparent" />
    </div>
  );
}

// Re-export components
export { MeetingsTimeline } from './meetings-timeline';
export { MeetingsWrapper } from './meetings-wrapper';
export { TasksWidget } from './tasks-widget';
export { DashboardAIChat } from './dashboard-ai-chat';
export { ProjectPulseSidebar } from './project-pulse-sidebar';
