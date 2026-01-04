'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { TIME_MARKERS, getTimelinePosition } from '@/lib/timeline-utils';

interface TimelineGridProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Polished timeline grid with elegant time markers
 * Shows 8:30 AM - 2:30 PM with refined visual hierarchy
 */
export const TimelineGrid = memo(function TimelineGrid({ className, children }: TimelineGridProps) {
  return (
    <div className={cn('relative h-full w-full', className)}>
      {/* Grid lines - subtle and elegant */}
      <div className="absolute inset-0 flex">
        {TIME_MARKERS.map((marker) => {
          const position = getTimelinePosition(marker.minutes);
          const isHour = marker.time.endsWith(':00');
          const isEdge = marker.time === '8:30' || marker.time === '2:30';

          return (
            <div
              key={marker.time}
              className="absolute bottom-0 top-0"
              style={{ left: `${position}%` }}
            >
              {/* Vertical grid line */}
              <div
                className={cn(
                  'h-full w-px',
                  isHour ? 'bg-border/40' : isEdge ? 'bg-border/30' : 'bg-border/15'
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Time labels at bottom - cleaner typography */}
      <div className="absolute bottom-0 left-0 right-0 flex h-7 border-t border-border/30 bg-background/90 backdrop-blur-sm">
        {TIME_MARKERS.filter((_, i) => i % 2 === 0).map((marker, index, arr) => {
          const position = getTimelinePosition(marker.minutes);
          const isEdge = index === 0 || index === arr.length - 1;

          return (
            <span
              key={marker.time}
              className={cn(
                'absolute -translate-x-1/2 font-mono text-[10px]',
                isEdge ? 'font-medium text-muted-foreground' : 'text-muted-foreground/70'
              )}
              style={{ left: `${position}%`, top: '6px' }}
            >
              {marker.time}
            </span>
          );
        })}
      </div>

      {/* Content layer - flex column to stack lanes */}
      <div className="absolute inset-0 bottom-7 flex flex-col">{children}</div>
    </div>
  );
});
