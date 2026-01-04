'use client';

import { memo, useMemo } from 'react';
import { Video, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { USER_COLORS } from '@/lib/color-constants';
import { TimelineGrid } from './timeline-grid';
import { NowIndicator } from './now-indicator';
import { TimelineMeetingBlock } from './timeline-meeting-block';
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
 * Polished dual timeline with modern, clean design
 * Inspired by Linear's visual language
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

  // Calculate task counts per member
  const fawziTaskCount = useMemo(
    () => tasks.filter((t) => t.assignee_id === fawzi?.id && t.status !== 'Done').length,
    [tasks, fawzi]
  );
  const moayadTaskCount = useMemo(
    () => tasks.filter((t) => t.assignee_id === moayad?.id && t.status !== 'Done').length,
    [tasks, moayad]
  );

  if (!fawzi && !moayad) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
        <Users className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">No team members found</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Add team members to see the timeline
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* Timeline Visual Section */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        {/* Member Labels Row - cleaner design */}
        <div className="grid grid-cols-[1fr_140px_1fr] border-b border-border/60">
          {/* Fawzi label */}
          <div className="flex items-center gap-3 px-5 py-3">
            <div className="relative">
              <div
                className={cn(
                  'h-8 w-8 rounded-full',
                  fawziColors.bg,
                  'flex items-center justify-center'
                )}
              >
                <span className={cn('text-xs font-semibold', fawziColors.text)}>
                  {(fawzi?.full_name || 'F')[0]}
                </span>
              </div>
              {fawziScheduled.some((st) => st.task.status === 'In Progress') && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-qualia-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-qualia-500" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {fawzi?.full_name || 'Fawzi'}
              </p>
              <p className="text-xs text-muted-foreground">
                {fawziTaskCount} task{fawziTaskCount !== 1 ? 's' : ''} today
              </p>
            </div>
          </div>

          {/* Center - Meetings label */}
          <div className="flex items-center justify-center border-x border-border/40 bg-muted/30">
            <div className="flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Moayad label */}
          <div className="flex items-center justify-end gap-3 px-5 py-3">
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate text-sm font-medium text-foreground">
                {moayad?.full_name || 'Moayad'}
              </p>
              <p className="text-xs text-muted-foreground">
                {moayadTaskCount} task{moayadTaskCount !== 1 ? 's' : ''} today
              </p>
            </div>
            <div className="relative">
              <div
                className={cn(
                  'h-8 w-8 rounded-full',
                  moayadColors.bg,
                  'flex items-center justify-center'
                )}
              >
                <span className={cn('text-xs font-semibold', moayadColors.text)}>
                  {(moayad?.full_name || 'M')[0]}
                </span>
              </div>
              {moayadScheduled.some((st) => st.task.status === 'In Progress') && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timeline Grid - single meeting row */}
        {/* Height: 1 row h-24 (96px) + h-7 footer (28px) = 124px */}
        <div className="relative h-[124px] bg-gradient-to-b from-background to-muted/20">
          <TimelineGrid>
            {/* Single Meeting Row */}
            <div className="relative h-24">
              {meetings.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <span className="text-xs text-muted-foreground/50">No meetings scheduled</span>
                </div>
              ) : (
                meetings.map((meeting) => (
                  <TimelineMeetingBlock key={meeting.id} meeting={meeting} />
                ))
              )}
            </div>

            {/* Now indicator */}
            <NowIndicator />
          </TimelineGrid>
        </div>
      </div>

      {/* Task Lists - Two Columns with refined styling */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Fawzi's task list */}
        {fawzi && (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <div
              className={cn(
                'flex items-center justify-between border-b border-border/60 px-4 py-3',
                'bg-gradient-to-r from-qualia-500/5 to-transparent'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn('h-2 w-2 rounded-full', fawziColors.dot)} />
                <span className="text-sm font-medium text-foreground">
                  {fawzi.full_name || 'Fawzi'}
                </span>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {fawziTaskCount}
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
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <div
              className={cn(
                'flex items-center justify-between border-b border-border/60 px-4 py-3',
                'bg-gradient-to-r from-indigo-500/5 to-transparent'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn('h-2 w-2 rounded-full', moayadColors.dot)} />
                <span className="text-sm font-medium text-foreground">
                  {moayad.full_name || 'Moayad'}
                </span>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {moayadTaskCount}
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
