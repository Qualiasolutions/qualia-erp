'use client';

import { useMemo } from 'react';
import { isToday, isTomorrow, isThisWeek, parseISO, isFuture } from 'date-fns';
import { CalendarCheck, CalendarClock, Users } from 'lucide-react';

interface Meeting {
  id: string;
  start_time: string;
  end_time: string;
  client?: { id: string } | null;
}

interface MeetingStatsProps {
  meetings: Meeting[];
}

export function MeetingStats({ meetings }: MeetingStatsProps) {
  const stats = useMemo(() => {
    const todayMeetings = meetings.filter((m) => isToday(parseISO(m.start_time)));
    const tomorrowMeetings = meetings.filter((m) => isTomorrow(parseISO(m.start_time)));
    const thisWeekMeetings = meetings.filter((m) => {
      const date = parseISO(m.start_time);
      return isThisWeek(date) && isFuture(date);
    });
    const clientMeetings = meetings.filter((m) => m.client && isFuture(parseISO(m.start_time)));

    return {
      today: todayMeetings.length,
      tomorrow: tomorrowMeetings.length,
      thisWeek: thisWeekMeetings.length,
      withClients: clientMeetings.length,
    };
  }, [meetings]);

  return (
    <div className="flex items-center gap-5">
      {/* Total Today */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-semibold text-foreground">{stats.today}</span>
        <span className="text-sm text-muted-foreground">today</span>
      </div>

      <div className="h-5 w-px bg-border" />

      {/* Quick Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>
            <span className="font-medium text-foreground">{stats.tomorrow}</span> tomorrow
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarCheck className="h-3.5 w-3.5" />
          <span>
            <span className="font-medium text-foreground">{stats.thisWeek}</span> this week
          </span>
        </div>
        {stats.withClients > 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>
              <span className="font-medium text-emerald-400">{stats.withClients}</span> client
              meetings
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
