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
 * Polished task slot positioned on the timeline
 * Clean, modern design with subtle interactions
 */
export const TimelineTaskSlot = memo(function TimelineTaskSlot({
  scheduledTask,
  colorKey = 'fawzi',
  onClick,
  className,
}: TimelineTaskSlotProps) {
  const { task, startPercent, widthPercent, slot } = scheduledTask;
  const isActive = task.status === 'In Progress';

  const styles = {
    fawzi: {
      base: isActive
        ? 'bg-qualia-500/15 border-qualia-500/40 shadow-sm shadow-qualia-500/10'
        : 'bg-qualia-500/8 border-qualia-500/25 hover:bg-qualia-500/12 hover:border-qualia-500/35',
      text: 'text-qualia-700 dark:text-qualia-300',
      ring: 'ring-qualia-500/20',
      dot: 'bg-qualia-500',
      dotPing: 'bg-qualia-400',
    },
    moayad: {
      base: isActive
        ? 'bg-indigo-500/15 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
        : 'bg-indigo-500/8 border-indigo-500/25 hover:bg-indigo-500/12 hover:border-indigo-500/35',
      text: 'text-indigo-700 dark:text-indigo-300',
      ring: 'ring-indigo-500/20',
      dot: 'bg-indigo-500',
      dotPing: 'bg-indigo-400',
    },
  };

  const style = styles[colorKey];

  return (
    <div
      onClick={onClick}
      className={cn(
        'absolute bottom-2.5 top-2.5 cursor-pointer rounded-lg border px-2.5 py-2',
        'transition-all duration-150 ease-out',
        'hover:translate-y-[-1px] hover:shadow-md',
        style.base,
        isActive && `ring-1 ring-offset-1 ring-offset-background ${style.ring}`,
        className
      )}
      style={{
        left: `${startPercent}%`,
        width: `${Math.max(widthPercent, 8)}%`,
        minWidth: '90px',
      }}
    >
      <div className="flex h-full flex-col justify-center overflow-hidden">
        {/* Title */}
        <span className={cn('truncate text-xs font-medium leading-tight', style.text)}>
          {task.title}
        </span>

        {/* Time and phase */}
        <div className="mt-1 flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-muted-foreground/80">
            {formatMinutesToDisplay(slot.start)}
          </span>
          {task.phase && <PhaseBadge phase={task.phase} className="scale-90" />}
        </div>
      </div>

      {/* Active indicator - more subtle */}
      {isActive && (
        <div className="absolute right-1.5 top-1.5">
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
                style.dotPing
              )}
            />
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', style.dot)} />
          </span>
        </div>
      )}
    </div>
  );
});
