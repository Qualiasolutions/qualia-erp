'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { PhaseBadge } from './phase-badge';
import { formatMinutesToDisplay } from '@/lib/timeline-utils';
import type { ScheduledTask } from '@/lib/timeline-utils';

interface TimelineTaskSlotProps {
  scheduledTask: ScheduledTask;
  colorKey?: 'fawzi' | 'moayad';
  onClick?: () => void;
  className?: string;
}

/**
 * Task slot positioned on the timeline
 * Shows task in its auto-scheduled time position
 */
export const TimelineTaskSlot = memo(function TimelineTaskSlot({
  scheduledTask,
  colorKey = 'fawzi',
  onClick,
  className,
}: TimelineTaskSlotProps) {
  const { task, startPercent, widthPercent, slot } = scheduledTask;
  const isActive = task.status === 'In Progress';

  const bgColors = {
    fawzi: isActive
      ? 'bg-qualia-500/20 border-qualia-500/50'
      : 'bg-qualia-500/10 border-qualia-500/30',
    moayad: isActive
      ? 'bg-indigo-500/20 border-indigo-500/50'
      : 'bg-indigo-500/10 border-indigo-500/30',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'absolute bottom-1 top-1 cursor-pointer rounded border px-2 py-1 transition-all hover:scale-[1.02]',
        bgColors[colorKey],
        isActive && 'ring-1 ring-offset-1 ring-offset-background',
        isActive && (colorKey === 'fawzi' ? 'ring-qualia-500/30' : 'ring-indigo-500/30'),
        className
      )}
      style={{
        left: `${startPercent}%`,
        width: `${Math.max(widthPercent, 8)}%`, // Min 8% width
        minWidth: '80px',
      }}
    >
      <div className="flex h-full flex-col justify-center overflow-hidden">
        {/* Title */}
        <span
          className={cn(
            'truncate text-xs font-medium',
            colorKey === 'fawzi'
              ? 'text-qualia-700 dark:text-qualia-300'
              : 'text-indigo-700 dark:text-indigo-300'
          )}
        >
          {task.title}
        </span>

        {/* Time and phase */}
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">
            {formatMinutesToDisplay(slot.start)}
          </span>
          {task.phase && <PhaseBadge phase={task.phase} className="scale-90" />}
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute right-1 top-1">
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                colorKey === 'fawzi' ? 'bg-qualia-400' : 'bg-indigo-400'
              )}
            />
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                colorKey === 'fawzi' ? 'bg-qualia-500' : 'bg-indigo-500'
              )}
            />
          </span>
        </div>
      )}
    </div>
  );
});
