'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { USER_COLORS } from '@/lib/color-constants';
import { TimelineGrid } from './timeline-grid';
import { NowIndicator } from './now-indicator';
import { TimelineMeetingBlock } from './timeline-meeting-block';
import { TimelineTaskSlot } from './timeline-task-slot';
import { TaskListSidebar } from './task-list-sidebar';
import { autoScheduleTasks } from '@/lib/timeline-utils';
import type { TimelineMeeting, TimelineTask, TeamMember } from '@/app/actions/timeline-dashboard';

interface TimelineLaneProps {
  member: TeamMember;
  meetings: TimelineMeeting[];
  tasks: TimelineTask[];
  teamMembers: TeamMember[];
  currentUserId: string | null;
  newAssignments?: string[];
  isLead?: boolean;
  onAssign?: (taskId: string, assigneeId: string) => void;
  onTaskClick?: (task: TimelineTask) => void;
  className?: string;
}

/**
 * Single team member's lane with timeline and task list
 * Shows their meetings on the timeline and tasks in a sidebar
 */
export const TimelineLane = memo(function TimelineLane({
  member,
  meetings,
  tasks,
  teamMembers,
  currentUserId,
  newAssignments = [],
  isLead = false,
  onAssign,
  onTaskClick,
  className,
}: TimelineLaneProps) {
  const colors = USER_COLORS[member.colorKey];

  // Get member's meetings (all meetings for now - could filter by attendee later)
  const memberMeetings = meetings;

  // Auto-schedule tasks for this member
  const scheduledTasks = useMemo(
    () => autoScheduleTasks(tasks, meetings, member.id),
    [tasks, meetings, member.id]
  );

  // Count active tasks
  const activeCount = tasks.filter(
    (t) => t.assignee_id === member.id && t.status === 'In Progress'
  ).length;

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-lg border border-border',
        className
      )}
    >
      {/* Header */}
      <div className={cn('flex items-center justify-between border-b px-4 py-3', colors.bg)}>
        <div className="flex items-center gap-3">
          <div className={cn('h-3 w-3 rounded-full', colors.dot)} />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {member.full_name || member.email.split('@')[0]}
            </h3>
            <span className="text-xs capitalize text-muted-foreground">{member.role}</span>
          </div>
        </div>

        {/* Active task indicator */}
        {activeCount > 0 && (
          <div
            className={cn('rounded-full px-2 py-0.5 text-xs font-medium', colors.bg, colors.text)}
          >
            {activeCount} active
          </div>
        )}
      </div>

      {/* Content: Timeline + Task List */}
      <div className="flex flex-1 overflow-hidden">
        {/* Timeline section */}
        <div className="flex-1 border-r border-border/50 p-2">
          <div className="h-32 rounded-md bg-muted/20">
            <TimelineGrid>
              {/* Meetings */}
              {memberMeetings.map((meeting) => (
                <TimelineMeetingBlock key={meeting.id} meeting={meeting} />
              ))}

              {/* Scheduled tasks */}
              {scheduledTasks.map((st) => (
                <TimelineTaskSlot
                  key={st.task.id}
                  scheduledTask={st}
                  colorKey={member.colorKey}
                  onClick={() => onTaskClick?.(st.task)}
                />
              ))}

              {/* Now indicator */}
              <NowIndicator />
            </TimelineGrid>
          </div>
        </div>

        {/* Task list sidebar */}
        <div className="w-72 flex-shrink-0 overflow-hidden">
          <TaskListSidebar
            tasks={tasks}
            memberId={member.id}
            memberName={member.full_name || member.email.split('@')[0]}
            colorKey={member.colorKey}
            isLead={isLead && member.id === currentUserId}
            teamMembers={teamMembers}
            currentUserId={currentUserId}
            newAssignments={newAssignments}
            onAssign={onAssign}
            onTaskClick={onTaskClick}
          />
        </div>
      </div>
    </div>
  );
});
