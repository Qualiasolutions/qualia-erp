'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Video, RefreshCw, Sparkles } from 'lucide-react';
import { MeetingsWrapper } from './meetings-wrapper';
import { TasksWidget } from './tasks-widget';
import { ProjectsWidget } from './projects-widget';
import { FinishedProjectsWidget } from './finished-projects-widget';
import { DashboardAIChat } from './dashboard-ai-chat';
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

// Motivational subtexts
const subtexts = [
  "Let's make today count",
  'Ready to crush it?',
  'What will you build today?',
  "You've got this",
  'Time to make things happen',
  'Another day, another win',
];

export function TodayDashboard({
  meetings,
  tasks,
  teamMembers,
  projects,
  finishedProjects,
}: TodayDashboardProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [subtext, setSubtext] = useState('');

  const now = new Date();

  // Pick a random subtext on mount
  useEffect(() => {
    setSubtext(subtexts[Math.floor(Math.random() * subtexts.length)]);
  }, []);

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh();
    });
  };

  // Get greeting based on time of day with variety
  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) {
      return greetings.morning[Math.floor(Math.random() * greetings.morning.length)];
    }
    if (hour < 17) {
      return greetings.afternoon[Math.floor(Math.random() * greetings.afternoon.length)];
    }
    return greetings.evening[Math.floor(Math.random() * greetings.evening.length)];
  };

  // Calculate stats for the header
  const pendingTasks = tasks.filter((t) => t.status !== 'Done').length;
  const todayMeetings = meetings.filter((m) => {
    const meetingDate = new Date(m.start_time).toDateString();
    return meetingDate === now.toDateString();
  }).length;

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden bg-gradient-to-br from-background via-background to-primary/[0.02]">
      {/* Enhanced Header with gradient and stats */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative shrink-0 overflow-hidden border-b border-border/30"
      >
        {/* Subtle animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] via-transparent to-primary/[0.02]" />
        <div className="absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative mx-auto max-w-[1800px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                >
                  {getGreeting()}
                </motion.h1>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="mt-0.5 flex items-center gap-2"
                >
                  <p className="text-sm text-muted-foreground">{format(now, 'EEEE, MMMM d')}</p>
                  <span className="text-muted-foreground/30">·</span>
                  <p className="flex items-center gap-1 text-sm text-primary/80">
                    <Sparkles className="h-3 w-3" />
                    {subtext}
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Quick stats + actions */}
            <div className="flex items-center gap-3">
              {/* Mini stats */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="hidden items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 sm:flex"
              >
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-medium text-foreground">{pendingTasks}</span>
                  <span className="text-xs text-muted-foreground">tasks</span>
                </div>
                <div className="h-4 w-px bg-border/50" />
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-foreground">{todayMeetings}</span>
                  <span className="text-xs text-muted-foreground">meetings</span>
                </div>
              </motion.div>

              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-border/50 bg-card/50 hover:bg-card"
                asChild
              >
                <Link href="/schedule?new=1">
                  <Video className="h-4 w-4" />
                  <span className="hidden sm:inline">Schedule</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-card"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 transition-transform ${isRefreshing ? 'animate-spin' : 'hover:rotate-45'}`}
                />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

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
