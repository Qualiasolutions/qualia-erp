'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEAM_MEMBERS } from '@/lib/schedule-constants';
import { USER_COLORS } from '@/lib/color-constants';

interface ScheduleHeaderProps {
  className?: string;
}

export function ScheduleHeader({ className }: ScheduleHeaderProps) {
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');
  const isToday = true; // Always showing today's schedule

  return (
    <div className={cn('rounded-lg border border-border bg-card px-6 py-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Date section */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-qualia-500/10">
            <Calendar className="h-5 w-5 text-qualia-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Today&apos;s Schedule</h1>
              {isToday && (
                <span className="rounded bg-qualia-500/10 px-1.5 py-0.5 text-xs font-medium text-qualia-500">
                  Live
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
        </div>

        {/* Team members */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Team</span>
          </div>

          <div className="flex items-center gap-2">
            {Object.entries(TEAM_MEMBERS).map(([key, member]) => {
              const colors = USER_COLORS[member.colorKey];
              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1.5',
                    colors.bg,
                    colors.border
                  )}
                >
                  {/* Avatar dot */}
                  <div className={cn('h-2 w-2 rounded-full', colors.dot)} />

                  {/* Name */}
                  <span className={cn('text-sm font-medium', colors.text)}>{member.name}</span>

                  {/* Role badge */}
                  <span className="text-xs text-muted-foreground">
                    {member.role === 'admin' ? 'Lead' : 'Trainee'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Working hours info */}
      <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">Working Hours:</span>
          <span>8:30 AM - 2:30 PM</span>
          <span className="text-muted-foreground/50">(6 hours)</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">Focus Blocks:</span>
          <span>3 sessions</span>
        </div>
      </div>
    </div>
  );
}
