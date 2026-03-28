'use client';

import { useMeetings, type MeetingWithRelations } from '@/lib/swr';
import { WeeklyView } from '@/components/weekly-view';
import { CalendarView } from '@/components/calendar-view';

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
    <div className="flex h-full gap-5">
      {/* Week sidebar — desktop only */}
      <div className="hidden w-80 shrink-0 overflow-hidden rounded-xl border border-border bg-card xl:block">
        <MeetingDaySidebar meetings={meetingsWithType} />
      </div>
      {/* Calendar / Week view */}
      <div className="min-w-0 flex-1">{calendarContent}</div>
    </div>
  );
}
