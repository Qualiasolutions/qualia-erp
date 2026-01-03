'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TEAM_MEMBERS } from '@/lib/schedule-constants';
import { USER_COLORS } from '@/lib/color-constants';

interface ScheduleHeaderProps {
  className?: string;
}

export function ScheduleHeader({ className }: ScheduleHeaderProps) {
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');

  return (
    <div
      className={cn('rounded-lg border border-border/60 bg-card/50 backdrop-blur-sm', className)}
    >
      <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Date section */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900">
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {format(today, 'd')}
            </span>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Today&apos;s Schedule
            </h1>
            <p className="text-sm text-muted-foreground/80">{formattedDate}</p>
          </div>
        </div>

        {/* Team members */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            Team
          </span>
          <div className="flex items-center gap-2">
            {Object.entries(TEAM_MEMBERS).map(([key, member]) => {
              const colors = USER_COLORS[member.colorKey];
              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors',
                    'bg-background/50 hover:bg-background',
                    colors.border
                  )}
                >
                  <div className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
                  <span className="text-sm font-medium text-foreground">{member.name}</span>
                  <span className="text-xs text-muted-foreground/70">
                    {member.role === 'admin' ? 'Lead' : 'Dev'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Working hours info - subtle footer */}
      <div className="flex items-center gap-6 border-t border-border/40 px-6 py-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-muted-foreground/70">Hours</span>
          <span className="tabular-nums text-foreground">8:30 – 2:30</span>
        </div>
        <div className="h-3 w-px bg-border/60" />
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-muted-foreground/70">Duration</span>
          <span className="tabular-nums text-foreground">6h</span>
        </div>
        <div className="h-3 w-px bg-border/60" />
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-muted-foreground/70">Focus Blocks</span>
          <span className="tabular-nums text-foreground">3</span>
        </div>
      </div>
    </div>
  );
}
