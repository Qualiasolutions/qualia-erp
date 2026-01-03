'use client';

import { useState, useTransition, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RefreshCw, Video, Loader2 } from 'lucide-react';
import { useDailyFlow, invalidateDailyFlow } from '@/lib/swr';
import { createInstantMeeting } from '@/app/actions';
import { VisualTimeline } from './visual-timeline';
import { TeamLanes } from './team-lanes';
import { ProjectFocusBar } from './project-focus-bar';
import { EditTaskModal } from '@/components/edit-task-modal';
import type { Task } from '@/app/actions/inbox';

/**
 * Daily Flow - unified team dashboard
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

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleRefresh = () => {
    revalidate();
  };

  const handleTaskModalClose = () => {
    setSelectedTask(null);
    invalidateDailyFlow(true);
  };

  const handleAssignTask = () => {
    window.location.href = '/projects';
  };

  const handleNeedHelp = () => {
    // Placeholder for help system
  };

  const handleMeetingClick = () => {
    // Placeholder for meeting details
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = new Date();
  const dateString = format(today, 'EEEE, MMMM d');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{dateString}</h1>
          <div className="mt-1 flex items-center gap-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    member.colorKey === 'fawzi' ? 'bg-qualia-500' : 'bg-indigo-500'
                  )}
                />
                {member.full_name || member.email.split('@')[0]}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isValidating}
            className={cn(
              'rounded border border-border p-2 transition-colors hover:bg-muted',
              isValidating && 'opacity-50'
            )}
            aria-label="Refresh"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5 text-muted-foreground', isValidating && 'animate-spin')}
            />
          </button>

          <button
            onClick={handleStartMeeting}
            disabled={isPending}
            className="flex items-center gap-2 rounded bg-foreground px-3.5 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Video className="h-3.5 w-3.5" />
            )}
            New Meeting
          </button>
        </div>
      </div>

      {/* Timeline */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Timeline
          </h2>
          {meetings.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{meetings.length} scheduled</span>
          )}
        </div>
        <VisualTimeline meetings={meetings} onMeetingClick={handleMeetingClick} />
      </section>

      {/* Team Lanes */}
      <section>
        <h2 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Workload
        </h2>
        <TeamLanes
          tasks={tasks}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          onTaskClick={setSelectedTask}
          onAssignTask={handleAssignTask}
          onNeedHelp={handleNeedHelp}
        />
      </section>

      {/* Project Focus */}
      <section>
        <h2 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Focus
        </h2>
        <ProjectFocusBar
          project={focusProject}
          tasks={tasks}
          meetings={meetings}
          onSwitchProject={() => {
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
