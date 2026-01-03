'use client';

import { memo, useMemo } from 'react';
import { TeamMemberLane } from './team-member-lane';
import { getCurrentTask, getUpcomingTasks } from '@/lib/daily-flow-utils';
import type { Task } from '@/app/actions/inbox';
import type { TeamMember } from '@/app/actions/daily-flow';

interface TeamLanesProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  currentUserId: string | null;
  onTaskClick?: (task: Task) => void;
  onAssignTask?: (memberId: string) => void;
  onNeedHelp?: (memberId: string) => void;
}

/**
 * Two-column team lanes showing each member's work
 */
export const TeamLanes = memo(function TeamLanes({
  tasks,
  teamMembers,
  currentUserId,
  onTaskClick,
  onAssignTask,
  onNeedHelp,
}: TeamLanesProps) {
  // Sort members: lead first, then trainee
  const sortedMembers = useMemo(() => {
    return [...teamMembers].sort((a, b) => {
      if (a.role === 'lead' && b.role !== 'lead') return -1;
      if (b.role === 'lead' && a.role !== 'lead') return 1;
      return 0;
    });
  }, [teamMembers]);

  // Pre-compute task data for each member
  const memberTaskData = useMemo(() => {
    const data = new Map<string, { currentTask: Task | null; upcomingTasks: Task[] }>();

    for (const member of sortedMembers) {
      data.set(member.id, {
        currentTask: getCurrentTask(tasks, member.id),
        upcomingTasks: getUpcomingTasks(tasks, member.id, 3),
      });
    }

    return data;
  }, [tasks, sortedMembers]);

  if (sortedMembers.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/50 text-muted-foreground">
        No team members found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {sortedMembers.map((member) => {
        const taskData = memberTaskData.get(member.id)!;
        return (
          <div
            key={member.id}
            className="rounded-xl border border-border/50 bg-card/30 p-5 backdrop-blur-sm"
          >
            <TeamMemberLane
              member={member}
              currentTask={taskData.currentTask}
              upcomingTasks={taskData.upcomingTasks}
              isCurrentUser={member.id === currentUserId}
              onTaskClick={onTaskClick}
              onAssignTask={() => onAssignTask?.(member.id)}
              onNeedHelp={() => onNeedHelp?.(member.id)}
            />
          </div>
        );
      })}
    </div>
  );
});

export default TeamLanes;
