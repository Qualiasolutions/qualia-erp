'use client';

import { useState, useTransition, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar, RefreshCw, Video, Loader2, Users } from 'lucide-react';
import { useDailyFlow, invalidateDailyFlow } from '@/lib/swr';
import { createInstantMeeting } from '@/app/actions';
import { VisualTimeline } from './visual-timeline';
import { TeamLanes } from './team-lanes';
import { ProjectFocusBar } from './project-focus-bar';
import { EditTaskModal } from '@/components/edit-task-modal';
import type { Task } from '@/app/actions/inbox';

/**
 * Main Daily Flow client component
 * Unified view of timeline, team work, and project focus
 */
export function DailyFlowClient() {
  const {
    meetings,
    tasks,
    focusProject,
    teamMembers,
    currentUserId,
    isLoading,
    isValidating,
    revalidate,
  } = useDailyFlow();

  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Hydration check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle instant meeting
  const handleStartMeeting = async () => {
    startTransition(async () => {
      const result = await createInstantMeeting();
      if (result.success && result.data) {
        const meeting = result.data as { meeting_link?: string };
        if (meeting.meeting_link) {
          window.open(meeting.meeting_link, '_blank');
        }
        invalidateDailyFlow(true);
      }
    });
  };

  // Handle manual refresh
  const handleRefresh = () => {
    revalidate();
  };

  // Handle task modal close
  const handleTaskModalClose = () => {
    setSelectedTask(null);
    invalidateDailyFlow(true);
  };

  // Handle assign task - opens project page for now
  const handleAssignTask = () => {
    // TODO: Implement task assignment modal
    window.location.href = '/projects';
  };

  // Handle need help (for now, just show an alert - could open chat)
  const handleNeedHelp = () => {
    // TODO: Implement help request system
    alert('Help request feature coming soon! For now, ask Fawzi directly.');
  };

  // Handle meeting click
  const handleMeetingClick = () => {
    // TODO: Open meeting detail modal or prompt for link
  };

  // Loading state
  if (!mounted || isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = new Date();
  const dateString = format(today, 'EEEE, MMMM d, yyyy');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{dateString}</h1>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Team Schedule
            </p>
          </div>

          {/* Team member indicators */}
          <div className="hidden items-center gap-2 border-l border-border/50 pl-4 md:flex">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium',
                  member.colorKey === 'fawzi'
                    ? 'bg-qualia-500/10 text-qualia-500'
                    : 'bg-indigo-500/10 text-indigo-500'
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    member.colorKey === 'fawzi' ? 'bg-qualia-500' : 'bg-indigo-500'
                  )}
                />
                {member.full_name || member.email.split('@')[0]}
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isValidating}
            className={cn(
              'rounded-lg border border-border/50 p-2 transition-colors hover:bg-muted/50',
              isValidating && 'opacity-50'
            )}
            title="Refresh"
          >
            <RefreshCw
              className={cn('h-4 w-4 text-muted-foreground', isValidating && 'animate-spin')}
            />
          </button>

          <button
            onClick={handleStartMeeting}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Video className="h-4 w-4" />
            )}
            Start Meeting
          </button>
        </div>
      </div>

      {/* Visual Timeline */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Today&apos;s Timeline
          </h2>
          {meetings.length > 0 && (
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-500">
              {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <VisualTimeline meetings={meetings} onMeetingClick={handleMeetingClick} />
      </section>

      {/* Team Work Lanes */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Team Workload
          </h2>
        </div>
        <TeamLanes
          tasks={tasks}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          onTaskClick={setSelectedTask}
          onAssignTask={handleAssignTask}
          onNeedHelp={handleNeedHelp}
        />
      </section>

      {/* Project Focus Bar */}
      <section>
        <ProjectFocusBar
          project={focusProject}
          tasks={tasks}
          meetings={meetings}
          onSwitchProject={() => {
            // TODO: Open project picker
            window.location.href = '/projects';
          }}
        />
      </section>

      {/* Edit Task Modal */}
      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          open={true}
          onOpenChange={(open) => !open && handleTaskModalClose()}
        />
      )}
    </div>
  );
}

export default DailyFlowClient;
