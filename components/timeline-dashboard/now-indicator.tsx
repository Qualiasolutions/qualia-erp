'use client';

import { memo, useEffect, useState } from 'react';
import { getCurrentTimePosition, formatMinutesToDisplay } from '@/lib/timeline-utils';

/**
 * Refined current time indicator
 * Elegant design with subtle glow effect
 */
export const NowIndicator = memo(function NowIndicator() {
  const [position, setPosition] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setPosition(getCurrentTimePosition());
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      setCurrentTime(formatMinutesToDisplay(minutes));
    };

    // Initial position
    updateTime();

    // Update every minute
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, []);

  // Don't render if outside working hours
  if (position === null) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-0 top-0 z-20"
      style={{ left: `${position}%` }}
    >
      {/* Glow effect */}
      <div className="absolute -left-0.5 h-full w-1 bg-rose-500/20 blur-sm" />

      {/* Main line */}
      <div className="h-full w-0.5 bg-gradient-to-b from-rose-500 via-rose-500 to-rose-500/50" />

      {/* Top indicator */}
      <div className="absolute -left-1.5 -top-0.5 flex items-center gap-1">
        <div className="relative">
          <div className="h-3 w-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/40" />
          <div className="absolute inset-0 animate-ping rounded-full bg-rose-500/40" />
        </div>
      </div>

      {/* Time label - cleaner design */}
      <div className="absolute -left-5 -top-5 rounded-md bg-rose-500 px-1.5 py-0.5 shadow-sm shadow-rose-500/30">
        <span className="font-mono text-[9px] font-semibold tracking-tight text-white">
          {currentTime.split(' ')[0]}
        </span>
      </div>
    </div>
  );
});
