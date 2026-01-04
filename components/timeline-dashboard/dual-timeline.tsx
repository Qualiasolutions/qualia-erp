'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { TimelineLane } from './timeline-lane';
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
 * 50/50 split container for team timelines
 * Shows Fawzi on the left and Moayad on the right
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

  // Determine if current user is lead
  const isLead = sortedMembers.find((m) => m.id === currentUserId)?.role === 'lead';

  return (
    <div
      className={cn(
        'grid h-full gap-4',
        // Responsive: stack on small screens, side by side on medium+
        'grid-cols-1 lg:grid-cols-2',
        className
      )}
    >
      {sortedMembers.map((member) => (
        <TimelineLane
          key={member.id}
          member={member}
          meetings={meetings}
          tasks={tasks}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          newAssignments={newAssignments}
          isLead={isLead}
          onAssign={onAssign}
          onTaskClick={onTaskClick}
        />
      ))}

      {/* Empty state if no team members */}
      {sortedMembers.length === 0 && (
        <div className="col-span-2 flex items-center justify-center rounded-lg border border-dashed border-border p-8 text-muted-foreground">
          No team members found
        </div>
      )}
    </div>
  );
});
