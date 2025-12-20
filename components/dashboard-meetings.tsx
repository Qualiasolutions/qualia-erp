'use client';

import { Video, Clock, CalendarDays, ExternalLink, Plus } from 'lucide-react';
import { format, isToday, isTomorrow, isWithinInterval, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { createGoogleMeetLink } from '@/lib/google-meet';

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
}

interface DashboardMeetingsProps {
  meetings: Meeting[];
}

export function DashboardMeetings({ meetings }: DashboardMeetingsProps) {
  const now = new Date();

  // Find current meeting (if any)
  const currentMeeting = meetings.find((meeting) => {
    const start = parseISO(meeting.start_time);
    const end = parseISO(meeting.end_time);
    return isWithinInterval(now, { start, end });
  });

  // Find upcoming meetings (future only)
  const upcomingMeetings = meetings.filter((meeting) => {
    const start = parseISO(meeting.start_time);
    return start > now;
  });

  const nextMeeting = upcomingMeetings[0];

  // Handle instant meeting creation
  const handleInstantMeeting = () => {
    const meetLink = createGoogleMeetLink();
    window.open(meetLink, '_blank');
  };

  // Calculate time until next meeting
  const getTimeUntil = (dateStr: string) => {
    const start = parseISO(dateStr);
    const diffMs = start.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 0) return 'Started';
    if (diffMins === 0) return 'Starting now';
    if (diffMins < 60) return `in ${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours < 24) return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
    return 'Tomorrow';
  };

  // Get meeting progress percentage for current meeting
  const getMeetingProgress = (meeting: Meeting) => {
    const start = parseISO(meeting.start_time);
    const end = parseISO(meeting.end_time);
    const duration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / duration) * 100));
  };

  // Format time remaining for current meeting
  const getTimeRemaining = (meeting: Meeting) => {
    const end = parseISO(meeting.end_time);
    const diffMs = end.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m remaining`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m remaining` : `${hours}h remaining`;
  };

  const formatMeetingDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  // Count for display (current + upcoming)
  const totalActiveMeetings = (currentMeeting ? 1 : 0) + upcomingMeetings.length;

  if (meetings.length === 0) {
    return (
      <Card className="flex h-full flex-col border-border/60 shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <Video className="h-4 w-4" />
            </div>
            <span>Meetings</span>
            <button
              onClick={handleInstantMeeting}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-600"
              title="Start instant Google Meet"
            >
              <Plus className="h-3.5 w-3.5" />
              Start Meet
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center p-6">
          <div className="space-y-2 text-center">
            <CalendarDays className="mx-auto h-8 w-8 opacity-20" />
            <p className="text-sm text-muted-foreground">No meetings scheduled</p>
            <Link href="/schedule" className="text-xs text-qualia-500 hover:underline">
              View schedule
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col border-border/60 shadow-lg transition-shadow duration-300 hover:shadow-xl">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <Video className="h-4 w-4" />
          </div>
          <span>Meetings</span>
          <div className="ml-auto flex items-center gap-2">
            {totalActiveMeetings > 0 && (
              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-500">
                {totalActiveMeetings}
              </span>
            )}
            <button
              onClick={handleInstantMeeting}
              className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-600"
              title="Start instant Google Meet"
            >
              <Plus className="h-3.5 w-3.5" />
              Meet
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        <div className="divide-y divide-border/60">
          {/* Current Meeting - Highlighted */}
          {currentMeeting && (
            <div className="border-l-2 border-violet-500 bg-violet-500/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="animate-pulse rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Now
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getTimeRemaining(currentMeeting)}
                  </span>
                </div>
                {currentMeeting.meeting_link && (
                  <a
                    href={currentMeeting.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-600"
                  >
                    <Video className="h-3 w-3" />
                    Join
                  </a>
                )}
              </div>
              <h4 className="mb-1 text-sm font-semibold text-foreground">{currentMeeting.title}</h4>
              <p className="mb-2 text-xs text-muted-foreground">
                {format(parseISO(currentMeeting.start_time), 'h:mm a')} -{' '}
                {format(parseISO(currentMeeting.end_time), 'h:mm a')}
              </p>
              {/* Progress bar */}
              <div className="h-1 rounded-full bg-violet-500/20">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-1000"
                  style={{ width: `${getMeetingProgress(currentMeeting)}%` }}
                />
              </div>
            </div>
          )}

          {/* Next Meeting - Emphasized */}
          {nextMeeting && !currentMeeting && (
            <div className="border-l-2 border-qualia-500 bg-qualia-500/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-qualia-500/10 px-2 py-0.5 text-[10px] font-semibold text-qualia-500">
                    Up Next
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getTimeUntil(nextMeeting.start_time)}
                  </span>
                </div>
                {nextMeeting.meeting_link && (
                  <a
                    href={nextMeeting.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white"
                  >
                    <Video className="h-3 w-3" />
                    Join
                  </a>
                )}
              </div>
              <h4 className="mb-1 text-sm font-semibold text-foreground">{nextMeeting.title}</h4>
              <p className="text-xs text-muted-foreground">
                {formatMeetingDate(nextMeeting.start_time)} at{' '}
                {format(parseISO(nextMeeting.start_time), 'h:mm a')}
              </p>
            </div>
          )}

          {/* Other Upcoming Meetings */}
          {upcomingMeetings.slice(currentMeeting ? 0 : 1, 4).map((meeting) => (
            <div key={meeting.id} className="p-4 transition-all duration-200 hover:bg-qualia-500/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatMeetingDate(meeting.start_time)} at{' '}
                      {format(parseISO(meeting.start_time), 'h:mm a')}
                    </span>
                  </div>
                  <h4 className="truncate text-sm font-medium text-foreground">{meeting.title}</h4>
                  {meeting.project && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {meeting.project.name}
                    </p>
                  )}
                </div>
                {meeting.meeting_link && (
                  <a
                    href={meeting.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg p-2 text-emerald-500 transition-all hover:bg-emerald-500/10"
                    title="Join meeting"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
        {totalActiveMeetings > 3 && (
          <div className="border-t border-border/60 p-4">
            <Link
              href="/schedule"
              className="flex items-center justify-center gap-1 text-xs font-medium text-qualia-500 transition-colors hover:text-qualia-600 dark:hover:text-qualia-400"
            >
              View all {totalActiveMeetings} meetings
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
