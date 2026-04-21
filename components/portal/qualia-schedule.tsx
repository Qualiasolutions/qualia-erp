'use client';

import { memo, useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  format,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  addDays,
  parseISO,
  isSameDay,
  isSameWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMeetings, invalidateMeetings, type MeetingWithRelations } from '@/lib/swr';
import { deleteMeeting } from '@/app/actions';
import { useAdmin } from '@/lib/hooks/use-admin';
import { NewMeetingModal } from '@/components/new-meeting-modal';
import { EditMeetingModal } from '@/components/edit-meeting-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/* ======================================================================
   Types
   ====================================================================== */

type MeetingKind = 'standup' | 'client' | 'focus' | 'internal' | 'launch';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role?: string;
}

interface QualiaScheduleProps {
  initialMeetings: MeetingWithRelations[];
  profiles: Profile[];
  currentUserId: string;
  weekStart: string; // ISO date string for Monday of the target week
}

/* ======================================================================
   Constants
   ====================================================================== */

const HOUR_START = 8;
const HOUR_END = 19; // inclusive (8:00 to 19:00 = 12 rows)
const HOUR_COUNT = HOUR_END - HOUR_START + 1; // 12 rows
const ROW_HEIGHT = 56; // px per hour row

const HOURS = Array.from({ length: HOUR_COUNT }, (_, i) => i + HOUR_START);

/** Color mapping for meeting kinds — Tailwind classes */
const KIND_COLORS: Record<MeetingKind, { bg: string; border: string; text: string }> = {
  standup: {
    bg: 'bg-muted-foreground/10',
    border: 'border-l-muted-foreground',
    text: 'text-muted-foreground',
  },
  client: {
    bg: 'bg-violet-500/10',
    border: 'border-l-violet-500',
    text: 'text-violet-700 dark:text-violet-400',
  },
  focus: {
    bg: 'bg-primary/10',
    border: 'border-l-primary',
    text: 'text-primary',
  },
  internal: {
    bg: 'bg-emerald-500/10',
    border: 'border-l-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  launch: {
    bg: 'bg-red-500/10',
    border: 'border-l-red-500',
    text: 'text-red-700 dark:text-red-400',
  },
};

const KIND_DOT_COLORS: Record<MeetingKind, string> = {
  standup: 'bg-muted-foreground',
  client: 'bg-violet-500',
  focus: 'bg-primary',
  internal: 'bg-emerald-500',
  launch: 'bg-red-500',
};

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/** Prefix used by public booking system — meetings with "Public: " prefix */
const PUBLIC_BOOKING_PREFIX = 'Public: ';

/* ======================================================================
   Helpers
   ====================================================================== */

/**
 * Infer meeting kind from meeting data.
 * No `meeting_type` column exists — we derive from title keywords + client relation.
 */
function inferMeetingKind(meeting: MeetingWithRelations): MeetingKind {
  const title = (meeting.title || '').toLowerCase();

  if (title.includes('standup') || title.includes('stand-up') || title.includes('daily sync')) {
    return 'standup';
  }
  if (title.includes('launch') || title.includes('release') || title.includes('go live')) {
    return 'launch';
  }
  if (title.includes('focus') || title.includes('deep work') || title.includes('heads down')) {
    return 'focus';
  }
  // If meeting has a client relation, it's a client meeting
  const client = Array.isArray(meeting.client) ? meeting.client[0] : meeting.client;
  if (client) {
    return 'client';
  }
  return 'internal';
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/* ======================================================================
   TzBand — live timezone clock
   ====================================================================== */

const TzBand = memo(function TzBand({ label, timezone }: { label: string; timezone: string }) {
  const [time, setTime] = useState(() => formatTzTime(timezone));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatTzTime(timezone));
    }, 60_000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className="flex flex-col items-center rounded-lg bg-muted px-3 py-1.5">
      <span className="font-mono text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
        {time}
      </span>
    </div>
  );
});

function formatTzTime(timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    hour12: false,
  }).format(new Date());
}

/* ======================================================================
   EventBlock — single event in the grid
   ====================================================================== */

const EventBlock = memo(function EventBlock({
  meeting,
  kind,
  topPx,
  heightPx,
  profiles,
  isAdmin,
  onEdit,
  onDelete,
}: {
  meeting: MeetingWithRelations;
  kind: MeetingKind;
  topPx: number;
  heightPx: number;
  profiles: Profile[];
  isAdmin: boolean;
  onEdit: (meeting: MeetingWithRelations) => void;
  onDelete: (meetingId: string) => void;
}) {
  const colors = KIND_COLORS[kind];
  const startTime = parseISO(meeting.start_time);
  const endTime = parseISO(meeting.end_time);
  const timeLabel = `${format(startTime, 'HH:mm')}\u2013${format(endTime, 'HH:mm')}`;
  const isPublic = (meeting.title || '').startsWith(PUBLIC_BOOKING_PREFIX);

  // Find creator profile
  const creator = Array.isArray(meeting.creator) ? meeting.creator[0] : meeting.creator;
  const creatorProfile = creator ? profiles.find((p) => p.id === creator.id) : null;
  const initials = creatorProfile?.full_name
    ? creatorProfile.full_name
        .split(/\s+/)
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'absolute inset-x-1 overflow-hidden rounded-md border-l-2 px-2 py-1 text-left',
            'cursor-pointer transition-transform duration-150 ease-out',
            'hover:scale-[1.02] motion-reduce:hover:scale-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            colors.bg,
            colors.border
          )}
          style={{ top: `${topPx}px`, height: `${heightPx}px` }}
          aria-label={`${meeting.title}, ${timeLabel}`}
        >
          {/* Public booking dot indicator — top-right */}
          {isPublic && (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary"
              aria-label="Public booking"
            />
          )}
          <span
            className={cn('block truncate text-[11.5px] font-semibold leading-tight', colors.text)}
          >
            {meeting.title}
          </span>
          {heightPx > 36 && (
            <span className="mt-0.5 flex items-center gap-1.5">
              {initials && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
                  {initials}
                </span>
              )}
              <span className="font-mono text-[10px] text-muted-foreground">{timeLabel}</span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 border-border bg-card/95 p-4 backdrop-blur-xl"
        align="start"
        side="right"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">{meeting.title}</h4>
            {isPublic && (
              <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                Public
              </span>
            )}
          </div>
          <p className="font-mono text-xs text-muted-foreground">{timeLabel}</p>
          {meeting.description && (
            <p className="text-xs text-muted-foreground">{meeting.description}</p>
          )}
          {meeting.meeting_link && (
            <a
              href={meeting.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Join meeting
            </a>
          )}
          {isAdmin && (
            <div className="flex items-center gap-2 border-t border-border pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs hover:bg-muted/50"
                onClick={() => onEdit(meeting)}
              >
                <Pencil className="h-3 w-3" aria-hidden />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-500"
                onClick={() => onDelete(meeting.id)}
              >
                <Trash2 className="h-3 w-3" aria-hidden />
                Delete
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});

/* ======================================================================
   CurrentTimeIndicator
   ====================================================================== */

function CurrentTimeIndicator() {
  const [topPx, setTopPx] = useState<number | null>(null);

  const computeTop = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();
    const min = now.getMinutes();
    const fractionalHour = hour + min / 60;
    if (fractionalHour < HOUR_START || fractionalHour > HOUR_END + 1) {
      return null;
    }
    return (fractionalHour - HOUR_START) * ROW_HEIGHT;
  }, []);

  useEffect(() => {
    setTopPx(computeTop());
    const interval = setInterval(() => {
      setTopPx(computeTop());
    }, 30_000);
    return () => clearInterval(interval);
  }, [computeTop]);

  if (topPx === null) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
      style={{ top: `${topPx}px` }}
      aria-hidden="true"
    >
      <div className="h-2 w-2 rounded-full bg-primary" />
      <div className="h-px flex-1 bg-primary" />
    </div>
  );
}

/* ======================================================================
   Main Component
   ====================================================================== */

export function QualiaSchedule({
  initialMeetings,
  profiles,
  weekStart: weekStartISO,
}: QualiaScheduleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useAdmin();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isPending, startTransition] = useTransition();

  // Parse weekStart from prop (ISO string of Monday)
  const weekStart = useMemo(() => parseISO(weekStartISO), [weekStartISO]);

  // Live SWR meetings
  const { meetings } = useMeetings(initialMeetings);

  // Days of the week (Mon-Sun)
  const days = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  }, [weekStart]);

  // Is this the current week?
  const isCurrentWeek = useMemo(() => {
    return isSameWeek(new Date(), weekStart, { weekStartsOn: 1 });
  }, [weekStart]);

  // Filter meetings to current week
  const weekMeetings = useMemo(() => {
    const weekEnd = addDays(weekStart, 7);
    return meetings.filter((m) => {
      const start = parseISO(m.start_time);
      return start >= weekStart && start < weekEnd;
    });
  }, [meetings, weekStart]);

  // Group meetings by day index (0=Mon, 6=Sun)
  const meetingsByDay = useMemo(() => {
    const map: Map<number, MeetingWithRelations[]> = new Map();
    for (let i = 0; i < 7; i++) map.set(i, []);

    for (const m of weekMeetings) {
      const start = parseISO(m.start_time);
      const dayIdx = days.findIndex((d) => isSameDay(d, start));
      if (dayIdx >= 0) {
        map.get(dayIdx)!.push(m);
      }
    }
    return map;
  }, [weekMeetings, days]);

  // Navigation
  const navigateWeek = useCallback(
    (direction: 'prev' | 'next') => {
      const newWeek = direction === 'next' ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
      const params = new URLSearchParams(searchParams.toString());
      params.set('week', format(newWeek, 'yyyy-MM-dd'));
      params.set('view', 'week');
      router.push(`/schedule?${params.toString()}`);
    },
    [weekStart, searchParams, router]
  );

  // Week label "Week of Apr 14 — 20, 2026"
  const weekLabel = useMemo(() => {
    const weekEnd = addDays(weekStart, 6);
    const startMonth = format(weekStart, 'MMM');
    const startDay = format(weekStart, 'd');
    const endDay = format(weekEnd, 'd');
    const year = format(weekStart, 'yyyy');

    // If same month
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `Week of ${startMonth} ${startDay} \u2014 ${endDay}, ${year}`;
    }
    const endMonth = format(weekEnd, 'MMM');
    return `Week of ${startMonth} ${startDay} \u2014 ${endMonth} ${endDay}, ${year}`;
  }, [weekStart]);

  // New meeting modal state
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);

  // Edit meeting modal state
  const [editTarget, setEditTarget] = useState<MeetingWithRelations | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Delete confirmation state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Admin action handlers — stable references for memo'd EventBlock
  const handleEdit = useCallback((meeting: MeetingWithRelations) => {
    setEditTarget(meeting);
    setEditModalOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((meetingId: string) => {
    setDeleteTargetId(meetingId);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTargetId) return;
    setDeleteConfirmOpen(false);
    startTransition(async () => {
      const result = await deleteMeeting(deleteTargetId);
      if (result.success) {
        invalidateMeetings(true);
      } else {
        console.error('Failed to delete meeting:', result.error);
      }
      setDeleteTargetId(null);
    });
  }, [deleteTargetId]);

  // Convert MeetingWithRelations to EditMeetingModal's Meeting shape
  const editModalMeeting = useMemo(() => {
    if (!editTarget) return null;
    const project = Array.isArray(editTarget.project) ? editTarget.project[0] : editTarget.project;
    const attendees = Array.isArray(editTarget.attendees)
      ? editTarget.attendees.map((a) => ({
          id: a.id,
          profile: Array.isArray(a.profile) ? a.profile[0] : a.profile,
        }))
      : [];
    return {
      id: editTarget.id,
      title: editTarget.title,
      description: editTarget.description,
      start_time: editTarget.start_time,
      end_time: editTarget.end_time,
      meeting_link: editTarget.meeting_link,
      project: project ? { id: project.id, name: project.name } : null,
      attendees,
    };
  }, [editTarget]);

  // Today index for highlighting
  const todayIndex = useMemo(() => {
    const now = new Date();
    return days.findIndex((d) => isSameDay(d, now));
  }, [days]);

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <header className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {weekLabel}
          </p>
          <h1 className="text-[clamp(1.5rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight text-foreground">
            Schedule
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          {/* TZ Bands */}
          <div className="flex gap-2">
            <TzBand label="Nicosia" timezone="Europe/Nicosia" />
            <TzBand label="Amman" timezone="Asia/Amman" />
          </div>

          {/* Week Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateWeek('prev')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigateWeek('next')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* + Event */}
          <Button
            onClick={() => setMeetingModalOpen(true)}
            className="gap-2"
            size="sm"
            aria-label="New event"
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Event</span>
          </Button>
        </div>
      </header>

      {/* ── Legend ── */}
      <div className="mb-4 flex flex-wrap gap-4 text-xs">
        {(Object.keys(KIND_DOT_COLORS) as MeetingKind[]).map((kind) => (
          <span key={kind} className="flex items-center gap-1.5 capitalize text-muted-foreground">
            <span className={cn('inline-block h-2 w-2 rounded-full', KIND_DOT_COLORS[kind])} />
            {kind}
          </span>
        ))}
      </div>

      {/* ── Empty week banner ── */}
      {weekMeetings.length === 0 && (
        <div className="mb-4">
          <EmptyState
            icon={Calendar}
            title="No meetings this week"
            description="Your schedule is clear. Use the + Event button to add a meeting."
            compact
          />
        </div>
      )}

      {/* ── Grid Card ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
        {/* Day Header Row */}
        <div
          className="grid border-b border-border bg-muted/50"
          style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}
        >
          {/* Empty cell for hour column */}
          <div aria-hidden="true" />
          {days.map((day, i) => {
            const isToday = i === todayIndex;
            return (
              <div key={i} className="flex flex-col items-center py-2">
                <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {DAY_LABELS[i]}
                </span>
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-auto">
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: '60px repeat(7, 1fr)',
              height: `${HOUR_COUNT * ROW_HEIGHT}px`,
            }}
          >
            {/* Hour Column */}
            <div className="relative border-r border-border" aria-hidden="true">
              {HOURS.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute right-2 font-mono text-[11px] text-muted-foreground"
                  style={{ top: `${i * ROW_HEIGHT + 2}px` }}
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {days.map((day, dayIdx) => {
              const dayMeetings = meetingsByDay.get(dayIdx) || [];
              const isToday = dayIdx === todayIndex;

              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'relative border-r border-border last:border-r-0',
                    isToday && 'bg-primary/[0.03]'
                  )}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-x-0 border-b border-border/50"
                      style={{ top: `${(i + 1) * ROW_HEIGHT}px` }}
                    />
                  ))}

                  {/* Current time indicator — only in today's column for current week */}
                  {isToday && isCurrentWeek && <CurrentTimeIndicator />}

                  {/* Events */}
                  {dayMeetings.map((meeting) => {
                    const start = parseISO(meeting.start_time);
                    const end = parseISO(meeting.end_time);
                    const startHour = start.getHours() + start.getMinutes() / 60;
                    const endHour = end.getHours() + end.getMinutes() / 60;

                    // Clamp to visible range
                    const clampedStart = Math.max(startHour, HOUR_START);
                    const clampedEnd = Math.min(endHour, HOUR_END + 1);

                    if (clampedEnd <= clampedStart) return null;

                    const topPx = (clampedStart - HOUR_START) * ROW_HEIGHT;
                    const heightPx = (clampedEnd - clampedStart) * ROW_HEIGHT - 4;

                    if (heightPx <= 0) return null;

                    const kind = inferMeetingKind(meeting);

                    return (
                      <EventBlock
                        key={meeting.id}
                        meeting={meeting}
                        kind={kind}
                        topPx={topPx}
                        heightPx={heightPx}
                        profiles={profiles}
                        isAdmin={isAdmin}
                        onEdit={handleEdit}
                        onDelete={handleDeleteRequest}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Meeting Modal (controlled) */}
      <NewMeetingModal open={meetingModalOpen} onOpenChange={setMeetingModalOpen} />

      {/* Edit Meeting Modal (admin) */}
      <EditMeetingModal
        meeting={editModalMeeting}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />

      {/* Delete Confirmation Dialog (admin) */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete meeting?"
        description="This action cannot be undone. The meeting will be permanently removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
