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

interface DualTimelineProps {
  meetings: TimelineMeeting[];
  tasks: TimelineTask[];
  teamMembers: TeamMember[];
  currentUserId: string | null;
  newAssignments?: string[];
  onAssign?: (taskId: string, assigneeId: string) => void;
  onTaskClick?: (task: TimelineTask) => void;
  className?: string;
}

/**
 * Redesigned dual timeline with columns layout:
 * - Fawzi's tasks on left
 * - Unified meeting line in center
 * - Moayad's tasks on right
 */
export const DualTimeline = memo(function DualTimeline({
  meetings,
  tasks,
  teamMembers,
  currentUserId,
  newAssignments = [],
  onAssign,
  onTaskClick,
  className,
}: DualTimelineProps) {
  // Sort team members: Fawzi (lead) first
  const sortedMembers = [...teamMembers].sort((a, b) => {
    if (a.role === 'lead') return -1;
    if (b.role === 'lead') return 1;
    return 0;
  });

  const fawzi = sortedMembers[0];
  const moayad = sortedMembers[1];

  // Determine if current user is lead
  const isLead = sortedMembers.find((m) => m.id === currentUserId)?.role === 'lead';

  // Auto-schedule tasks for each member
  const fawziScheduled = useMemo(
    () => (fawzi ? autoScheduleTasks(tasks, meetings, fawzi.id) : []),
    [tasks, meetings, fawzi]
  );

  const moayadScheduled = useMemo(
    () => (moayad ? autoScheduleTasks(tasks, meetings, moayad.id) : []),
    [tasks, meetings, moayad]
  );

  // Get colors
  const fawziColors = fawzi ? USER_COLORS[fawzi.colorKey] : USER_COLORS.fawzi;
  const moayadColors = moayad ? USER_COLORS[moayad.colorKey] : USER_COLORS.moayad;

  if (!fawzi && !moayad) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-8 text-muted-foreground">
        No team members found
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Unified Timeline Section */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Member Labels Row */}
        <div className="grid grid-cols-[1fr_auto_1fr] border-b border-border">
          {/* Fawzi label */}
          <div className={cn('flex items-center gap-2 px-4 py-2', fawziColors.bg)}>
            <div className={cn('h-2.5 w-2.5 rounded-full', fawziColors.dot)} />
            <span className="text-sm font-semibold text-foreground">
              {fawzi?.full_name || 'Fawzi'}
            </span>
          </div>

          {/* Center - Meetings label */}
          <div className="flex items-center justify-center border-x border-border bg-muted/30 px-6 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Meetings
            </span>
          </div>

          {/* Moayad label */}
          <div className={cn('flex items-center justify-end gap-2 px-4 py-2', moayadColors.bg)}>
            <span className="text-sm font-semibold text-foreground">
              {moayad?.full_name || 'Moayad'}
            </span>
            <div className={cn('h-2.5 w-2.5 rounded-full', moayadColors.dot)} />
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="relative">
          <TimelineGrid>
            {/* Fawzi's task slots - top lane */}
            <div className="relative h-14 border-b border-border/30">
              {fawziScheduled.map((st) => (
                <TimelineTaskSlot
                  key={st.task.id}
                  scheduledTask={st}
                  colorKey="fawzi"
                  onClick={() => onTaskClick?.(st.task)}
                />
              ))}
            </div>

            {/* Unified Meeting Line - center */}
            <div className="relative h-16 border-y border-border bg-muted/20">
              {meetings.map((meeting) => (
                <TimelineMeetingBlock key={meeting.id} meeting={meeting} />
              ))}
            </div>

            {/* Moayad's task slots - bottom lane */}
            <div className="relative h-14 border-t border-border/30">
              {moayadScheduled.map((st) => (
                <TimelineTaskSlot
                  key={st.task.id}
                  scheduledTask={st}
                  colorKey="moayad"
                  onClick={() => onTaskClick?.(st.task)}
                />
              ))}
            </div>

            {/* Now indicator spans all lanes */}
            <NowIndicator />
          </TimelineGrid>
        </div>
      </div>

      {/* Task Lists - Two Columns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Fawzi's task list */}
        {fawzi && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className={cn('flex items-center gap-2 border-b px-4 py-2', fawziColors.bg)}>
              <div className={cn('h-2.5 w-2.5 rounded-full', fawziColors.dot)} />
              <span className="text-sm font-semibold text-foreground">
                {fawzi.full_name || 'Fawzi'}&apos;s Tasks
              </span>
            </div>
            <TaskListSidebar
              tasks={tasks}
              memberId={fawzi.id}
              memberName={fawzi.full_name || fawzi.email.split('@')[0]}
              colorKey={fawzi.colorKey}
              isLead={isLead && fawzi.id === currentUserId}
              teamMembers={teamMembers}
              currentUserId={currentUserId}
              newAssignments={newAssignments}
              onAssign={onAssign}
              onTaskClick={onTaskClick}
            />
          </div>
        )}

        {/* Moayad's task list */}
        {moayad && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className={cn('flex items-center gap-2 border-b px-4 py-2', moayadColors.bg)}>
              <div className={cn('h-2.5 w-2.5 rounded-full', moayadColors.dot)} />
              <span className="text-sm font-semibold text-foreground">
                {moayad.full_name || 'Moayad'}&apos;s Tasks
              </span>
            </div>
            <TaskListSidebar
              tasks={tasks}
              memberId={moayad.id}
              memberName={moayad.full_name || moayad.email.split('@')[0]}
              colorKey={moayad.colorKey}
              isLead={isLead && moayad.id === currentUserId}
              teamMembers={teamMembers}
              currentUserId={currentUserId}
              newAssignments={newAssignments}
              onAssign={onAssign}
              onTaskClick={onTaskClick}
            />
          </div>
        )}
      </div>
    </div>
  );
});
