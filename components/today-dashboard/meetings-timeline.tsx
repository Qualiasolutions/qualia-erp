'use client';

import { useMemo, useState } from 'react';
import { format, parseISO, isToday, isTomorrow, addDays, startOfDay, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Video, ExternalLink, Plus, Users, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deleteMeeting } from '@/app/actions';
import { invalidateMeetings, invalidateTodaysSchedule } from '@/lib/swr';
import { NewMeetingModalInline } from '@/components/new-meeting-modal-inline';
import { EditMeetingModal } from '@/components/edit-meeting-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link?: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string; logo_url?: string | null } | null;
  attendees?: Array<{
    profile: { id: string; full_name: string | null; avatar_url?: string | null } | null;
  }>;
}

interface MeetingsTimelineProps {
  meetings: Meeting[];
  onMeetingCreated?: (meeting: Meeting) => void;
}

function formatMeetingTime(startTime: string): string {
  return format(parseISO(startTime), 'h:mm a');
}

function getDuration(startTime: string, endTime: string): string {
  const minutes = Math.round((parseISO(endTime).getTime() - parseISO(startTime).getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

function getMeetingStatus(startTime: string, endTime: string): 'current' | 'upcoming' | 'past' {
  const now = new Date();
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  if (now >= start && now <= end) return 'current';
  if (now < start) return 'upcoming';
  return 'past';
}

function getDayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface MeetingGroup {
  label: string;
  date: Date;
  meetings: Meeting[];
}

export function MeetingsTimeline({ meetings, onMeetingCreated }: MeetingsTimelineProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Delete this meeting?')) return;
    setDeletingId(meetingId);
    const result = await deleteMeeting(meetingId);
    if (result.success) {
      invalidateMeetings(true);
      invalidateTodaysSchedule(true);
    }
    setDeletingId(null);
  };

  const groupedMeetings = useMemo(() => {
    const now = new Date();
    const endDate = addDays(now, 7);

    const futureMeetings = meetings
      .filter((m) => {
        const meetingDate = parseISO(m.start_time);
        return meetingDate >= startOfDay(now) && meetingDate <= endDate;
      })
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());

    const groups: MeetingGroup[] = [];
    let currentGroup: MeetingGroup | null = null;

    for (const meeting of futureMeetings) {
      const meetingDate = startOfDay(parseISO(meeting.start_time));
      if (!currentGroup || !isSameDay(currentGroup.date, meetingDate)) {
        currentGroup = { label: getDayLabel(meetingDate), date: meetingDate, meetings: [] };
        groups.push(currentGroup);
      }
      currentGroup.meetings.push(meeting);
    }

    return groups;
  }, [meetings]);

  const handleMeetingCreated = (meeting: Meeting) => {
    onMeetingCreated?.(meeting);
    setShowModal(false);
  };

  const totalMeetings = groupedMeetings.reduce((sum, g) => sum + g.meetings.length, 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
            <Video className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Meetings</h3>
            <p className="text-xs text-muted-foreground">{totalMeetings} this week</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setShowModal(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {totalMeetings === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-xl bg-muted/30 p-3">
              <Video className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No meetings scheduled</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMeetings.map((group) => (
              <div key={group.label}>
                {/* Day header */}
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wider',
                      isToday(group.date) ? 'text-violet-400' : 'text-muted-foreground/60'
                    )}
                  >
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-border/30" />
                </div>

                {/* Meetings */}
                <div className="space-y-2">
                  {group.meetings.map((meeting) => {
                    const status = getMeetingStatus(meeting.start_time, meeting.end_time);
                    const isCurrent = status === 'current';
                    const isPast = status === 'past';

                    return (
                      <div
                        key={meeting.id}
                        className={cn(
                          'group/meeting relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200 ease-premium',
                          isCurrent && 'bg-violet-500/10 ring-1 ring-violet-500/30',
                          isPast && 'opacity-40',
                          !isCurrent && !isPast && 'hover:-translate-y-px hover:bg-muted/20'
                        )}
                      >
                        {/* Client/Attendee Avatar */}
                        <div className="relative">
                          {meeting.client ? (
                            <Avatar className="h-10 w-10 ring-2 ring-background">
                              <AvatarImage src={meeting.client.logo_url || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">
                                {getInitials(meeting.client.display_name)}
                              </AvatarFallback>
                            </Avatar>
                          ) : meeting.attendees &&
                            meeting.attendees.filter((a) => a.profile).length > 0 ? (
                            <div className="flex -space-x-2">
                              {meeting.attendees
                                .filter(
                                  (a): a is { profile: NonNullable<typeof a.profile> } =>
                                    !!a.profile
                                )
                                .slice(0, 2)
                                .map((a, i) => (
                                  <Avatar
                                    key={a.profile.id}
                                    className={cn(
                                      'h-8 w-8 ring-2 ring-background',
                                      i > 0 && '-ml-2'
                                    )}
                                  >
                                    <AvatarImage src={a.profile.avatar_url || undefined} />
                                    <AvatarFallback className="bg-gradient-to-br from-sky-500 to-blue-600 text-[11px] font-bold text-white">
                                      {getInitials(a.profile.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                              {meeting.attendees.filter((a) => a.profile).length > 2 && (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground ring-2 ring-background">
                                  +{meeting.attendees.filter((a) => a.profile).length - 2}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          {isCurrent && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                              <span className="relative inline-flex h-3 w-3 rounded-full bg-violet-500" />
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'truncate text-sm font-medium',
                              isCurrent ? 'text-violet-300' : 'text-white'
                            )}
                          >
                            {meeting.client?.display_name || meeting.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span
                              className={cn(
                                'font-medium tabular-nums',
                                isCurrent && 'text-violet-400'
                              )}
                            >
                              {formatMeetingTime(meeting.start_time)}
                            </span>
                            <span>·</span>
                            <span>{getDuration(meeting.start_time, meeting.end_time)}</span>
                            {meeting.project && (
                              <>
                                <span>·</span>
                                <span className="truncate">{meeting.project.name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {/* Edit/Delete on hover */}
                          {!isPast && (
                            <div className="flex gap-0.5 opacity-0 transition-opacity group-hover/meeting:opacity-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingMeeting(meeting);
                                }}
                                className="rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                title="Edit meeting"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMeeting(meeting.id);
                                }}
                                disabled={deletingId === meeting.id}
                                className="rounded p-1 text-muted-foreground hover:bg-red-500/20 hover:text-red-400"
                                title="Delete meeting"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}

                          {/* Join button */}
                          {meeting.meeting_link && !isPast && (
                            <a
                              href={meeting.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                'flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all',
                                isCurrent
                                  ? 'animate-glow-pulse bg-violet-500 text-white shadow-lg shadow-violet-500/25 hover:bg-violet-400'
                                  : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Join
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewMeetingModalInline
        open={showModal}
        onOpenChange={setShowModal}
        onMeetingCreated={handleMeetingCreated}
      />

      <EditMeetingModal
        meeting={
          editingMeeting
            ? {
                id: editingMeeting.id,
                title: editingMeeting.title,
                description: null,
                start_time: editingMeeting.start_time,
                end_time: editingMeeting.end_time,
                meeting_link: editingMeeting.meeting_link ?? null,
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
    </div>
  );
}
