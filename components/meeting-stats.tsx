'use client';

import { useMemo } from 'react';
import { isToday, isTomorrow, isThisWeek, parseISO, isFuture } from 'date-fns';
import { Calendar, Clock, Users } from 'lucide-react';

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
    <div className="flex items-center gap-6 text-sm">
      {/* Big today number */}
      <div className="flex items-center gap-2">
        <span className="text-3xl font-semibold text-primary">{stats.today}</span>
        <span className="text-muted-foreground">today</span>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Secondary stats */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="font-medium text-foreground">{stats.tomorrow}</span>
        <span>tomorrow</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="font-medium text-foreground">{stats.thisWeek}</span>
        <span>this week</span>
      </div>
      {stats.withClients > 0 && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="font-medium text-violet-400">{stats.withClients}</span>
          <span>client meetings</span>
        </div>
      )}
    </div>
  );
}
