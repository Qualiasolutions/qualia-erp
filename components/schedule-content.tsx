'use client';

import { useMeetings, type MeetingWithRelations } from '@/lib/swr';
import { DayView } from '@/components/day-view';
import { WeeklyView } from '@/components/weekly-view';
import { CalendarView } from '@/components/calendar-view';
import { MeetingStats } from '@/components/meeting-stats';

interface ScheduleContentProps {
  view: string;
  initialMeetings: MeetingWithRelations[];
}

export function ScheduleContent({ view, initialMeetings }: ScheduleContentProps) {
  const { meetings } = useMeetings(initialMeetings);

  const meetingsWithType = meetings.map((m) => ({ ...m, type: 'meeting' as const }));

  if (view === 'week') {
    return (
      <div className="space-y-4">
        <MeetingStats meetings={meetings} />
        <WeeklyView meetings={meetingsWithType} />
      </div>
    );
  }

  if (view === 'month') {
    return (
      <div className="space-y-4">
        <MeetingStats meetings={meetings} />
        <CalendarView meetings={meetingsWithType} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MeetingStats meetings={meetings} />
      <DayView meetings={meetingsWithType} />
    </div>
  );
}
