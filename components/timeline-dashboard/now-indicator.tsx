'use client';

import { memo, useEffect, useState } from 'react';
import { getCurrentTimePosition } from '@/lib/timeline-utils';

/**
 * Current time indicator line
 * Updates every minute to show current position on timeline
 */
export const NowIndicator = memo(function NowIndicator() {
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    // Initial position
    setPosition(getCurrentTimePosition());

    // Update every minute
    const interval = setInterval(() => {
      setPosition(getCurrentTimePosition());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Don't render if outside working hours
  if (position === null) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-0 top-0 z-20"
      style={{ left: `${position}%` }}
    >
      {/* Line */}
      <div className="h-full w-px bg-red-500" />

      {/* Top dot */}
      <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />

      {/* Time label */}
      <div className="absolute -left-4 -top-5 rounded bg-red-500 px-1 py-0.5 text-[9px] font-medium text-white">
        NOW
      </div>
    </div>
  );
});
