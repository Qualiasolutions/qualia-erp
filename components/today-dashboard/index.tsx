'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Video, RefreshCw, Loader2 } from 'lucide-react';
import { MeetingsWrapper } from './meetings-wrapper';
import { ActiveLeadsList } from './active-leads-list';
import { TasksWidget } from './tasks-widget';
import { useTransition } from 'react';

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

interface Task {
  id: string;
  title: string;
  status: 'Todo' | 'In Progress' | 'Done';
  priority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
  due_date: string | null;
  show_in_inbox?: boolean;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
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

interface TodayDashboardProps {
  meetings: Meeting[];
  tasks: Task[];
  leads: Lead[];
  teamMembers: TeamMember[];
  workspaceId: string;
}

export function TodayDashboard({
  meetings,
  tasks,
  leads,
  teamMembers,
  workspaceId,
}: TodayDashboardProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  const now = new Date();
  const pendingTasks = tasks.filter((t) => t.status !== 'Done').length;

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold sm:text-2xl">Today</h1>
              <span className="text-sm text-muted-foreground">{format(now, 'MMM d')}</span>
              {pendingTasks > 0 && (
                <Badge variant="outline" className="text-xs">
                  {pendingTasks} queued
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{format(now, 'EEEE, MMMM d')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">
                <Plus className="mr-1 h-4 w-4" />
                Manage Tasks
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/schedule?new=1">
                <Video className="mr-1 h-4 w-4" />
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
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content - 3 column layout */}
      <main className="flex-1 overflow-hidden p-4 sm:p-6">
        {/* Desktop: 3 columns, Tablet: 2 columns, Mobile: stacked */}
        <div className="flex h-full flex-col gap-4 lg:flex-row lg:gap-6">
          {/* Left column - Meetings Timeline (SWR-connected) */}
          <div className="h-[400px] shrink-0 lg:h-full lg:w-80">
            <MeetingsWrapper initialMeetings={meetings} />
          </div>

          {/* Middle column - Active Leads */}
          <div className="h-[400px] min-w-0 flex-1 lg:h-full">
            <ActiveLeadsList leads={leads} workspaceId={workspaceId} />
          </div>

          {/* Right column - All Tasks from Projects */}
          <div className="h-[400px] shrink-0 lg:h-full lg:w-80">
            <TasksWidget tasks={tasks} teamMembers={teamMembers} />
          </div>
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
