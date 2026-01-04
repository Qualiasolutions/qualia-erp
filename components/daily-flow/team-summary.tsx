'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { USER_COLORS } from '@/lib/color-constants';
import { CollapsibleSection } from './collapsible-section';
import { TeamLanes } from './team-lanes';
import type { Task } from '@/app/actions/inbox';
import type { TeamMember } from '@/app/actions/daily-flow';

interface TeamSummaryProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  currentUserId: string | null;
  onTaskClick?: (task: Task) => void;
  onAssignTask?: () => void;
  onNeedHelp?: () => void;
  defaultOpen?: boolean;
}

/**
 * Get task summary for a team member
 */
function getMemberSummary(tasks: Task[], memberId: string) {
  const memberTasks = tasks.filter(
    (t) => t.assignee_id === memberId && (t.status === 'Todo' || t.status === 'In Progress')
  );
  const activeTask = memberTasks.find((t) => t.status === 'In Progress');
  const todoCount = memberTasks.filter((t) => t.status === 'Todo').length;

  return {
    activeTask,
    todoCount,
    totalCount: memberTasks.length,
  };
}

/**
 * Team Summary - Collapsible team overview
 * Shows condensed view when collapsed, full lanes when expanded
 */
export const TeamSummary = memo(function TeamSummary({
  tasks,
  teamMembers,
  currentUserId,
  onTaskClick,
  onAssignTask,
  onNeedHelp,
  defaultOpen = false,
}: TeamSummaryProps) {
  // Calculate summaries for each team member
  const memberSummaries = useMemo(() => {
    return teamMembers.map((member) => ({
      member,
      ...getMemberSummary(tasks, member.id),
    }));
  }, [teamMembers, tasks]);

  // Total active tasks across team
  const totalActive = memberSummaries.filter((s) => s.activeTask).length;

  return (
    <CollapsibleSection
      title="Team Schedule"
      badge={`${totalActive} active`}
      defaultOpen={defaultOpen}
    >
      {/* Condensed summary - always visible */}
      <div className="mb-3 flex flex-wrap items-center gap-3 py-2">
        {memberSummaries.map(({ member, activeTask, totalCount }) => {
          const colors = USER_COLORS[member.colorKey];
          const name = member.full_name || member.email.split('@')[0];

          return (
            <div
              key={member.id}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                activeTask ? `${colors.bg} ${colors.border}` : 'border-border/60 dark:border-border'
              )}
            >
              <div className={cn('h-2 w-2 rounded-full', colors.dot)} />
              <span className="font-medium">{name}</span>
              <span className="text-muted-foreground">·</span>
              {activeTask ? (
                <span className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{activeTask.title}</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{totalCount} tasks</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Full team lanes - visible when expanded */}
      <TeamLanes
        tasks={tasks}
        teamMembers={teamMembers}
        currentUserId={currentUserId}
        onTaskClick={onTaskClick}
        onAssignTask={onAssignTask}
        onNeedHelp={onNeedHelp}
      />
    </CollapsibleSection>
  );
});

export default TeamSummary;
