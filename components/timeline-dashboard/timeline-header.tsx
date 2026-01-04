'use client';

import { memo } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Video, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickAssignButton } from './quick-assign-button';
import type { TimelineTask, TeamMember } from '@/app/actions/timeline-dashboard';
import { Button } from '@/components/ui/button';

interface TimelineHeaderProps {
  tasks: TimelineTask[];
  teamMembers: TeamMember[];
  currentUserId: string | null;
  isValidating?: boolean;
  onRefresh?: () => void;
  onStartMeeting?: () => void;
  onShowShortcuts?: () => void;
  className?: string;
}

/**
 * Header for the timeline dashboard
 * Shows date, refresh button, and quick actions
 */
export const TimelineHeader = memo(function TimelineHeader({
  tasks,
  teamMembers,
  currentUserId,
  isValidating = false,
  onRefresh,
  onStartMeeting,
  onShowShortcuts,
  className,
}: TimelineHeaderProps) {
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');

  // Determine if current user is lead
  const isLead = teamMembers.find((m) => m.id === currentUserId)?.role === 'lead';

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {/* Left: Title and date */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Today</h1>
        <p className="text-sm text-muted-foreground">{formattedDate}</p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Quick assign (lead only) */}
        {isLead && (
          <QuickAssignButton
            tasks={tasks}
            teamMembers={teamMembers}
            currentUserId={currentUserId}
          />
        )}

        {/* Start meeting */}
        <Button variant="outline" size="sm" onClick={onStartMeeting} className="gap-2">
          <Video className="h-4 w-4" />
          <span className="hidden sm:inline">Start Meeting</span>
        </Button>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isValidating}
          className="h-9 w-9"
        >
          <RefreshCw className={cn('h-4 w-4', isValidating && 'animate-spin')} />
        </Button>

        {/* Keyboard shortcuts */}
        <Button variant="ghost" size="icon" onClick={onShowShortcuts} className="h-9 w-9">
          <Keyboard className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
