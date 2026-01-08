'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus, Video, RefreshCw, Loader2 } from 'lucide-react';
import { MeetingsWrapper } from './meetings-wrapper';
import { ActiveLeadsList } from './active-leads-list';
import { TasksWidget } from './tasks-widget';
import { ProjectsWidget } from './projects-widget';
import type { ProjectType } from '@/types/database';
import { useTransition } from 'react';
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

interface Lead {
  id: string;
  name: string;
  display_name: string | null;
  phone: string | null;
  website: string | null;
  lead_status:
    | 'hot'
    | 'cold'
    | 'dropped'
    | 'active_client'
    | 'inactive_client'
    | 'dead_lead'
    | null;
  last_contacted_at: string | null;
  created_at: string | null;
  assigned_to: string | null;
  projects?: Array<{ id: string; name: string }>;
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
  leads: Lead[];
  teamMembers: TeamMember[];
  projects: Project[];
  workspaceId: string;
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

export function TodayDashboard({
  meetings,
  tasks,
  leads,
  teamMembers,
  projects,
  workspaceId,
}: TodayDashboardProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  const now = new Date();

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh();
    });
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Premium Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="border-b border-border/50 bg-gradient-to-b from-card to-background"
      >
        <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-light tracking-tight text-foreground sm:text-3xl">
                {getGreeting()}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {format(now, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <Link href="/projects">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Task</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <Link href="/schedule?new=1">
                  <Video className="h-4 w-4" />
                  <span className="hidden sm:inline">Schedule</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content - Fixed 100vh layout */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto h-full max-w-[1800px] px-4 py-4 sm:px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="h-full"
          >
            {/* Bento Grid Layout - fits in viewport without scroll */}
            <div className="grid h-full gap-4 lg:grid-cols-12 lg:gap-5">
              {/* Left Column - Projects + Leads stacked */}
              <div className="flex flex-col gap-4 lg:col-span-3">
                {/* Projects - shorter */}
                <motion.div variants={itemVariants} className="h-[45%] min-h-[200px]">
                  <ProjectsWidget projects={projects} />
                </motion.div>

                {/* Leads - scrollable */}
                <motion.div variants={itemVariants} className="min-h-0 flex-1">
                  <ActiveLeadsList leads={leads} workspaceId={workspaceId} />
                </motion.div>
              </div>

              {/* Middle Column - Tasks (full height) */}
              <motion.div variants={itemVariants} className="lg:col-span-6">
                <div className="h-full">
                  <TasksWidget tasks={tasks} teamMembers={teamMembers} />
                </div>
              </motion.div>

              {/* Right Column - Meetings (full height) */}
              <motion.div variants={itemVariants} className="lg:col-span-3">
                <div className="h-full">
                  <MeetingsWrapper initialMeetings={meetings} />
                </div>
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
export { ActiveLeadsList } from './active-leads-list';
export { TasksWidget } from './tasks-widget';
export { ProjectsWidget } from './projects-widget';
