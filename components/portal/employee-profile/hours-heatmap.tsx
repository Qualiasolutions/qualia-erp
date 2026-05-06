'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { HoursHeatmapWeek } from '@/app/actions/admin-control';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function tone(hours: number): { bg: string; ring?: string } {
  if (hours <= 0) return { bg: 'bg-muted/40' };
  if (hours < 3) return { bg: 'bg-emerald-500/20' };
  if (hours < 6) return { bg: 'bg-emerald-500/40' };
  if (hours < 8) return { bg: 'bg-emerald-500/60' };
  if (hours < 10) return { bg: 'bg-emerald-500/80' };
  // Overtime — keep emerald base, add rose ring
  return { bg: 'bg-emerald-500', ring: 'ring-1 ring-rose-500/60' };
}

export const HoursHeatmap = memo(function HoursHeatmap({ weeks }: { weeks: HoursHeatmapWeek[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Last 12 weeks
        </span>
        <Legend />
      </div>
      <div className="flex gap-1">
        {/* Day labels (left rail) */}
        <div className="flex flex-col gap-[3px] pr-1">
          {DAY_LABELS.map((d, i) => (
            <span
              key={d}
              className={cn(
                'h-3 w-6 text-right font-mono text-[9px] leading-3 text-muted-foreground/60',
                i % 2 === 0 ? 'opacity-100' : 'opacity-0'
              )}
            >
              {d}
            </span>
          ))}
        </div>
        {/* Week columns */}
        <div className="flex gap-[3px]">
          {weeks.map((week) => (
            <div key={week.weekStart} className="flex flex-col gap-[3px]">
              {week.hoursByDay.map((hours, i) => {
                const t = tone(hours);
                return (
                  <span
                    key={i}
                    title={`${DAY_LABELS[i]} ${week.weekStart} · ${hours}h`}
                    className={cn('h-3 w-3 rounded-[2px]', t.bg, t.ring)}
                    aria-label={`${DAY_LABELS[i]} ${week.weekStart}: ${hours} hours`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

function Legend() {
  return (
    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
      <span>0h</span>
      <span className="size-2 rounded-[2px] bg-muted/40" />
      <span className="size-2 rounded-[2px] bg-emerald-500/20" />
      <span className="size-2 rounded-[2px] bg-emerald-500/40" />
      <span className="size-2 rounded-[2px] bg-emerald-500/60" />
      <span className="size-2 rounded-[2px] bg-emerald-500/80" />
      <span className="size-2 rounded-[2px] bg-emerald-500" />
      <span>10h+</span>
    </div>
  );
}
