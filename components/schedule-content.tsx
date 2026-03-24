'use client';

import { useMeetings, type MeetingWithRelations } from '@/lib/swr';
import { WeeklyView } from '@/components/weekly-view';
import { CalendarView } from '@/components/calendar-view';
import { MeetingStats } from '@/components/meeting-stats';
import { MeetingDaySidebar } from '@/components/meeting-day-sidebar';

interface ScheduleContentProps {
  view: string;
  initialMeetings: MeetingWithRelations[];
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  }[];
}

export function ScheduleContent({ view, initialMeetings }: ScheduleContentProps) {
  const { meetings } = useMeetings(initialMeetings);

  const meetingsWithType = meetings.map((m) => ({ ...m, type: 'meeting' as const }));

  const calendarContent =
    view === 'month' ? (
      <CalendarView meetings={meetingsWithType} />
    ) : (
      <WeeklyView meetings={meetingsWithType} />
    );

  return (
    <div className="space-y-4">
      <MeetingStats meetings={meetings} />
      <div className="flex gap-5">
        {/* Day sidebar */}
        <div className="hidden w-[280px] shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm lg:block">
          <MeetingDaySidebar meetings={meetingsWithType} />
        </div>
        {/* Calendar */}
        <div className="min-w-0 flex-1">{calendarContent}</div>
      </div>
    </div>
  );
}
