'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { TIME_MARKERS, getTimelinePosition } from '@/lib/timeline-utils';

interface TimelineGridProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Timeline grid background with time markers
 * Shows 8:30 AM - 2:30 PM with 30-minute intervals
 */
export const TimelineGrid = memo(function TimelineGrid({ className, children }: TimelineGridProps) {
  return (
    <div className={cn('relative h-full w-full', className)}>
      {/* Grid lines */}
      <div className="absolute inset-0 flex">
        {TIME_MARKERS.map((marker) => {
          const position = getTimelinePosition(marker.minutes);
          const isHour =
            marker.time.endsWith(':00') || marker.time === '8:30' || marker.time === '2:30';

          return (
            <div
              key={marker.time}
              className="absolute bottom-0 top-0"
              style={{ left: `${position}%` }}
            >
              {/* Vertical grid line */}
              <div
                className={cn('h-full border-l', isHour ? 'border-border/50' : 'border-border/20')}
              />
            </div>
          );
        })}
      </div>

      {/* Time labels at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex h-6 border-t border-border/30 bg-background/80 backdrop-blur-sm">
        {TIME_MARKERS.filter((_, i) => i % 2 === 0).map((marker) => {
          const position = getTimelinePosition(marker.minutes);

          return (
            <span
              key={marker.time}
              className="absolute -translate-x-1/2 text-[10px] text-muted-foreground"
              style={{ left: `${position}%`, top: '4px' }}
            >
              {marker.time}
            </span>
          );
        })}
      </div>

      {/* Content layer */}
      <div className="absolute inset-0 bottom-6">{children}</div>
    </div>
  );
});
