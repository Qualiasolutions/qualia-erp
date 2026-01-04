'use client';

import { memo, useMemo } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Video, Keyboard, Clock, CheckCircle2, Circle } from 'lucide-react';
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
 * Polished header for the timeline dashboard
 * Clean, Linear-inspired design with stats summary
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
  const shortDate = format(today, 'MMM d');

  // Calculate task stats
  const stats = useMemo(() => {
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const todo = tasks.filter((t) => t.status === 'Todo').length;
    const done = tasks.filter((t) => t.status === 'Done').length;
    return { inProgress, todo, done, total: inProgress + todo };
  }, [tasks]);

  // Determine if current user is lead
  const isLead = teamMembers.find((m) => m.id === currentUserId)?.role === 'lead';

  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      {/* Left: Title, date, and stats */}
      <div className="flex items-center gap-6">
        {/* Title block */}
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Today</h1>
            <span className="hidden text-sm font-medium text-muted-foreground/60 sm:inline">
              {shortDate}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </div>

        {/* Stats pills - hidden on mobile */}
        <div className="hidden items-center gap-1.5 lg:flex">
          {/* In Progress */}
          {stats.inProgress > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1">
              <Clock className="h-3 w-3 text-blue-500" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {stats.inProgress} active
              </span>
            </div>
          )}

          {/* Todo */}
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
            <Circle className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{stats.todo} queued</span>
          </div>

          {/* Done today */}
          {stats.done > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {stats.done} done
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        {/* Quick assign (lead only) */}
        {isLead && (
          <QuickAssignButton
            tasks={tasks}
            teamMembers={teamMembers}
            currentUserId={currentUserId}
          />
        )}

        {/* Start meeting */}
        <Button
          variant="outline"
          size="sm"
          onClick={onStartMeeting}
          className="h-8 gap-1.5 border-border/50 text-xs font-medium shadow-none hover:bg-muted"
        >
          <Video className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Meeting</span>
        </Button>

        {/* Divider */}
        <div className="mx-1 h-4 w-px bg-border/50" />

        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isValidating}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isValidating && 'animate-spin')} />
        </Button>

        {/* Keyboard shortcuts */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onShowShortcuts}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Keyboard className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});
