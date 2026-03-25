'use client';

import { useState } from 'react';
import {
  Video,
  Clock,
  CalendarDays,
  ExternalLink,
  Plus,
  Link2,
  Check,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { format, isToday, isTomorrow, isWithinInterval, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { createGoogleMeetLink } from '@/lib/google-meet';
import { updateMeeting, deleteMeeting } from '@/app/actions';
import { invalidateMeetings, invalidateTodaysSchedule } from '@/lib/swr';
import { cn } from '@/lib/utils';
import { NewMeetingModalInline } from './new-meeting-modal-inline';
import { EditMeetingModal } from './edit-meeting-modal';

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

export function DashboardMeetings({ meetings: initialMeetings }: DashboardMeetingsProps) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const now = new Date();

  // Handle new meeting creation - adds meeting to local state instantly
  const handleMeetingCreated = (newMeeting: Meeting) => {
    setMeetings((prev) => {
      // Add the new meeting and sort by start_time
      const updated = [...prev, newMeeting].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      return updated;
    });
    setShowNewMeetingModal(false);
    setPopoverOpen(false);
  };

  // Handle meeting delete
  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Delete this meeting?')) return;
    setDeletingId(meetingId);
    const result = await deleteMeeting(meetingId);
    if (result.success) {
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      invalidateMeetings(true);
      invalidateTodaysSchedule(true);
    }
    setDeletingId(null);
  };

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

  // Meetings without links (for the popover)
  const meetingsWithoutLinks = meetings.filter(
    (m) => !m.meeting_link && parseISO(m.start_time) > now
  );

  const nextMeeting = upcomingMeetings[0];

  // Handle instant meeting creation
  const handleInstantMeeting = () => {
    const meetLink = createGoogleMeetLink();
    window.open(meetLink, '_blank');
    setPopoverOpen(false);
  };

  // Generate and attach meeting link to an existing meeting
  const handleGenerateLink = async (meetingId: string) => {
    setGeneratingFor(meetingId);

    // Open Google Meet to create a new meeting
    window.open(createGoogleMeetLink(), '_blank');

    // Prompt user to paste the link
    setTimeout(async () => {
      const link = window.prompt(
        'After Google Meet opens and creates your meeting:\n\n' +
          '1. Copy the meeting URL from the browser address bar\n' +
          '2. Paste it here\n\n' +
          'Meeting URL:'
      );

      if (link && link.includes('meet.google.com')) {
        const result = await updateMeeting({
          id: meetingId,
          meeting_link: link,
        });

        if (result.success) {
          // Update local state
          setMeetings((prev) =>
            prev.map((m) => (m.id === meetingId ? { ...m, meeting_link: link } : m))
          );
        }
      }

      setGeneratingFor(null);
      setPopoverOpen(false);
    }, 1000);
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
    if (diffMins < 60) return `${diffMins}m left`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
  };

  const formatMeetingDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  // Count for display (current + upcoming)
  const totalActiveMeetings = (currentMeeting ? 1 : 0) + upcomingMeetings.length;

  const MeetButton = () => (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex h-8 items-center gap-1 rounded-lg bg-emerald-500 px-2.5 text-xs font-semibold text-white transition-all sm:h-9 sm:gap-1.5 sm:px-3',
            'active:scale-95 sm:hover:bg-emerald-600'
          )}
          title="Meeting options"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="xs:inline hidden">Meet</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 border-border bg-card p-0 sm:w-72" align="end">
        <div className="space-y-2 border-b border-border p-2.5 sm:p-3">
          <button
            onClick={handleInstantMeeting}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white transition-all sm:gap-3',
              'active:scale-98 sm:hover:bg-emerald-600'
            )}
          >
            <Video className="h-4 w-4" />
            Start Instant Meeting
          </button>
          <button
            onClick={() => {
              setShowNewMeetingModal(true);
              setPopoverOpen(false);
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg border border-primary/50 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary transition-all sm:gap-3',
              'active:scale-98 sm:hover:bg-primary sm:hover:text-white'
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Schedule New Meeting
          </button>
        </div>

        {meetingsWithoutLinks.length > 0 && (
          <div className="p-2">
            <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
              Add link to meeting
            </p>
            <ScrollArea className="max-h-40 sm:max-h-48">
              <div className="space-y-1">
                {meetingsWithoutLinks.slice(0, 5).map((meeting) => (
                  <button
                    key={meeting.id}
                    onClick={() => handleGenerateLink(meeting.id)}
                    disabled={generatingFor === meeting.id}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left transition-all sm:py-2',
                      'active:bg-accent sm:hover:bg-accent',
                      'disabled:opacity-50'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium sm:text-sm">{meeting.title}</p>
                      <p className="text-[11px] text-muted-foreground sm:text-xs">
                        {formatMeetingDate(meeting.start_time)} at{' '}
                        {format(parseISO(meeting.start_time), 'h:mm a')}
                      </p>
                    </div>
                    {generatingFor === meeting.id ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-500" />
                    ) : (
                      <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {meetingsWithoutLinks.length === 0 && (
          <div className="p-4 text-center">
            <Check className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
            <p className="text-xs text-muted-foreground">All meetings have links</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );

  // Shared header for all states
  const MeetingsHeader = ({ showMeetButton = true }: { showMeetButton?: boolean }) => (
    <CardHeader className="shrink-0 border-b border-border px-4 pb-3 pt-4 sm:px-5 sm:pb-4">
      <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:gap-2.5 sm:text-base">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 sm:h-8 sm:w-8">
          <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <span className="truncate">Meetings</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {totalActiveMeetings > 0 && (
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-500 sm:text-xs">
              {totalActiveMeetings}
            </span>
          )}
          {showMeetButton && <MeetButton />}
        </div>
      </CardTitle>
    </CardHeader>
  );

  if (meetings.length === 0) {
    return (
      <>
        <Card className="flex h-full flex-col overflow-hidden border-border bg-card/80 shadow-md backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg">
          <MeetingsHeader showMeetButton={false} />
          <CardContent className="flex flex-1 items-center justify-center p-4 sm:p-6">
            <div className="space-y-3 text-center">
              <CalendarDays className="mx-auto h-7 w-7 opacity-20 sm:h-8 sm:w-8" />
              <p className="text-xs text-muted-foreground sm:text-sm">No meetings scheduled</p>
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <button
                  onClick={() => setShowNewMeetingModal(true)}
                  className={cn(
                    'flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-all sm:h-10 sm:px-4',
                    'active:scale-95 sm:hover:bg-primary'
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Meeting
                </button>
                <button
                  onClick={handleInstantMeeting}
                  className={cn(
                    'flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-500 transition-all sm:h-10 sm:px-4',
                    'active:scale-95 sm:hover:bg-emerald-500 sm:hover:text-white'
                  )}
                >
                  <Video className="h-3.5 w-3.5" />
                  Instant Meet
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* New Meeting Modal for empty state */}
        <NewMeetingModalInline
          open={showNewMeetingModal}
          onOpenChange={setShowNewMeetingModal}
          onMeetingCreated={handleMeetingCreated}
        />
      </>
    );
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border bg-card/80 shadow-md backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg">
      <MeetingsHeader />

      <ScrollArea className="min-h-0 flex-1">
        <CardContent className="p-0">
          <div className="divide-y divide-border/30">
            {/* Current Meeting - Highlighted */}
            {currentMeeting && (
              <div className="group/meeting border-l-2 border-violet-500 bg-violet-500/5 p-3 sm:p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="animate-pulse rounded-full bg-violet-500 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
                      Now
                    </span>
                    <span className="text-[11px] text-muted-foreground sm:text-xs">
                      {getTimeRemaining(currentMeeting)}
                    </span>
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover/meeting:opacity-100">
                      <button
                        onClick={() => setEditingMeeting(currentMeeting)}
                        className="rounded p-1 text-muted-foreground hover:bg-violet-500/20 hover:text-violet-400"
                        title="Edit meeting"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteMeeting(currentMeeting.id)}
                        disabled={deletingId === currentMeeting.id}
                        className="rounded p-1 text-muted-foreground hover:bg-red-500/20 hover:text-red-500"
                        title="Delete meeting"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {currentMeeting.meeting_link ? (
                    <a
                      href={currentMeeting.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white transition-all sm:h-9',
                        'active:scale-95 sm:hover:bg-emerald-600'
                      )}
                    >
                      <Video className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Join
                    </a>
                  ) : (
                    <button
                      onClick={() => handleGenerateLink(currentMeeting.id)}
                      disabled={generatingFor === currentMeeting.id}
                      className={cn(
                        'flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-500 transition-all sm:h-9',
                        'active:scale-95 sm:hover:bg-emerald-500 sm:hover:text-white',
                        'disabled:opacity-50'
                      )}
                    >
                      {generatingFor === currentMeeting.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Link2 className="h-3 w-3" />
                      )}
                      Add Link
                    </button>
                  )}
                </div>
                <h4 className="mb-1 truncate text-sm font-semibold text-foreground">
                  {currentMeeting.title}
                </h4>
                <p className="mb-2 text-[11px] text-muted-foreground sm:text-xs">
                  {format(parseISO(currentMeeting.start_time), 'h:mm a')} -{' '}
                  {format(parseISO(currentMeeting.end_time), 'h:mm a')}
                </p>
                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-violet-500/20 sm:h-2">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-1000"
                    style={{ width: `${getMeetingProgress(currentMeeting)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Next Meeting - Emphasized */}
            {nextMeeting && !currentMeeting && (
              <div className="group/meeting border-l-2 border-primary bg-primary/5 p-3 sm:p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      Up Next
                    </span>
                    <span className="text-[11px] text-muted-foreground sm:text-xs">
                      {getTimeUntil(nextMeeting.start_time)}
                    </span>
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover/meeting:opacity-100">
                      <button
                        onClick={() => setEditingMeeting(nextMeeting)}
                        className="rounded p-1 text-muted-foreground hover:bg-primary/20 hover:text-primary"
                        title="Edit meeting"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteMeeting(nextMeeting.id)}
                        disabled={deletingId === nextMeeting.id}
                        className="rounded p-1 text-muted-foreground hover:bg-red-500/20 hover:text-red-500"
                        title="Delete meeting"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {nextMeeting.meeting_link ? (
                    <a
                      href={nextMeeting.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-500 transition-all sm:h-9',
                        'active:scale-95 sm:hover:bg-emerald-500 sm:hover:text-white'
                      )}
                    >
                      <Video className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Join
                    </a>
                  ) : (
                    <button
                      onClick={() => handleGenerateLink(nextMeeting.id)}
                      disabled={generatingFor === nextMeeting.id}
                      className={cn(
                        'flex h-8 items-center gap-1.5 rounded-lg border border-muted-foreground/30 px-3 text-xs font-medium text-muted-foreground transition-all sm:h-9',
                        'active:scale-95 sm:hover:border-emerald-500 sm:hover:text-emerald-500',
                        'disabled:opacity-50'
                      )}
                    >
                      {generatingFor === nextMeeting.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Link2 className="h-3 w-3" />
                      )}
                      Add Link
                    </button>
                  )}
                </div>
                <h4 className="mb-1 truncate text-sm font-semibold text-foreground">
                  {nextMeeting.title}
                </h4>
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  {formatMeetingDate(nextMeeting.start_time)} at{' '}
                  {format(parseISO(nextMeeting.start_time), 'h:mm a')}
                </p>
              </div>
            )}

            {/* Other Upcoming Meetings */}
            {upcomingMeetings.slice(currentMeeting ? 0 : 1, 4).map((meeting) => (
              <div
                key={meeting.id}
                className={cn(
                  'group/item p-3 transition-all duration-200 sm:p-4',
                  'active:bg-primary/10 sm:hover:bg-primary/5'
                )}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-1.5 sm:gap-2">
                      <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate text-[11px] text-muted-foreground sm:text-xs">
                        {formatMeetingDate(meeting.start_time)} at{' '}
                        {format(parseISO(meeting.start_time), 'h:mm a')}
                      </span>
                    </div>
                    <h4 className="truncate text-xs font-medium text-foreground sm:text-sm">
                      {meeting.title}
                    </h4>
                    {meeting.project && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
                        {meeting.project.name}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100">
                      <button
                        onClick={() => setEditingMeeting(meeting)}
                        className="rounded p-1 text-muted-foreground hover:bg-violet-500/20 hover:text-violet-400"
                        title="Edit meeting"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        disabled={deletingId === meeting.id}
                        className="rounded p-1 text-muted-foreground hover:bg-red-500/20 hover:text-red-500"
                        title="Delete meeting"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {meeting.meeting_link ? (
                      <a
                        href={meeting.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg text-emerald-500 transition-all sm:h-8 sm:w-8',
                          'active:bg-emerald-500/20 sm:hover:bg-emerald-500/10'
                        )}
                        title="Join meeting"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleGenerateLink(meeting.id)}
                        disabled={generatingFor === meeting.id}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all sm:h-8 sm:w-8',
                          'active:bg-accent sm:hover:bg-accent sm:hover:text-emerald-500',
                          'disabled:opacity-50'
                        )}
                        title="Add meeting link"
                      >
                        {generatingFor === meeting.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View All Link */}
          {totalActiveMeetings > 3 && (
            <div className="border-t border-border p-3 sm:p-4">
              <Link
                href="/schedule"
                className="flex items-center justify-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary active:text-qualia-700 dark:hover:text-primary"
              >
                View all {totalActiveMeetings} meetings
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </CardContent>
      </ScrollArea>

      {/* New Meeting Modal */}
      <NewMeetingModalInline
        open={showNewMeetingModal}
        onOpenChange={setShowNewMeetingModal}
        onMeetingCreated={handleMeetingCreated}
      />

      {/* Edit Meeting Modal */}
      <EditMeetingModal
        meeting={
          editingMeeting
            ? {
                id: editingMeeting.id,
                title: editingMeeting.title,
                description: null,
                start_time: editingMeeting.start_time,
                end_time: editingMeeting.end_time,
                meeting_link: editingMeeting.meeting_link,
                project: editingMeeting.project ?? null,
              }
            : null
        }
        open={editingMeeting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMeeting(null);
            invalidateMeetings(true);
          }
        }}
      />
    </Card>
  );
}
