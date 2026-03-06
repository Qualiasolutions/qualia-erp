'use client';

import { useState, useEffect, useTransition } from 'react';
import { CalendarIcon, Clock, Video, Link2, Trash2, Check, FileText } from 'lucide-react';
import { format, setHours, setMinutes, addMinutes, parseISO, differenceInMinutes } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { updateMeeting, deleteMeeting } from '@/app/actions';
import { addMeetingAttendee, removeMeetingAttendee } from '@/app/actions/meetings';
import {
  invalidateMeetings,
  invalidateTodaysSchedule,
  invalidateScheduledTasks,
  invalidateDailyFlow,
} from '@/lib/swr';
import { TEAM_MEMBERS } from '@/lib/team-constants';

// Hardcoded team
const TEAM = [
  { id: TEAM_MEMBERS.FAWZI_ID, name: 'Fawzi', initial: 'F', color: 'qualia' },
  { id: TEAM_MEMBERS.MOAYAD_ID, name: 'Moayad', initial: 'M', color: 'indigo' },
  { id: TEAM_MEMBERS.HASAN_ID, name: 'Hasan', initial: 'H', color: 'amber' },
] as const;

const COLOR_MAP = {
  qualia: {
    active: 'bg-qualia-500 text-white ring-2 ring-qualia-500/30',
    idle: 'bg-qualia-500/10 text-qualia-600 dark:text-qualia-400 hover:bg-qualia-500/20',
  },
  indigo: {
    active: 'bg-indigo-500 text-white ring-2 ring-indigo-500/30',
    idle: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20',
  },
  amber: {
    active: 'bg-amber-500 text-white ring-2 ring-amber-500/30',
    idle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20',
  },
  rose: {
    active: 'bg-rose-500 text-white ring-2 ring-rose-500/30',
    idle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20',
  },
} as const;

// Time slots in 30-minute increments (7:00 AM - 8:00 PM)
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const display = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  return { value: time, label: display };
});

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

interface MeetingAttendee {
  id: string;
  profile?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  } | null;
}

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_link?: string | null;
  project: {
    id: string;
    name: string;
  } | null;
  attendees?: MeetingAttendee[];
}

interface EditMeetingModalProps {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMeetingModal({ meeting, open, onOpenChange }: EditMeetingModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(60);
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());

  // Initialize form when meeting changes
  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title);
      setDescription(meeting.description || '');
      setMeetingLink(meeting.meeting_link || '');

      const startDate = parseISO(meeting.start_time);
      const endDate = parseISO(meeting.end_time);

      setSelectedDate(startDate);

      const hours = startDate.getHours().toString().padStart(2, '0');
      const minutes = startDate.getMinutes().toString().padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);

      const meetingDuration = differenceInMinutes(endDate, startDate);
      const closestDuration = DURATION_OPTIONS.reduce((prev, curr) =>
        Math.abs(curr.value - meetingDuration) < Math.abs(prev.value - meetingDuration)
          ? curr
          : prev
      );
      setDuration(closestDuration.value);

      // Initialize attendees
      const attendeeIds = new Set<string>();
      if (meeting.attendees) {
        for (const a of meeting.attendees) {
          const profile = Array.isArray(a.profile) ? a.profile[0] : a.profile;
          if (profile?.id) attendeeIds.add(profile.id);
        }
      }
      setSelectedAttendees(attendeeIds);

      setError(null);
    }
  }, [meeting]);

  const toggleAttendee = (profileId: string) => {
    setSelectedAttendees((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  };

  const getStartDateTime = () => {
    if (!selectedDate) return '';
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const dateWithTime = setMinutes(setHours(selectedDate, hours), minutes);
    return dateWithTime.toISOString();
  };

  const getEndDateTime = () => {
    if (!selectedDate) return '';
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const dateWithTime = setMinutes(setHours(selectedDate, hours), minutes);
    const endTime = addMinutes(dateWithTime, duration);
    return endTime.toISOString();
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!meeting) return;

    setError(null);

    startTransition(async () => {
      const result = await updateMeeting({
        id: meeting.id,
        title: title.trim(),
        description: description.trim() || null,
        start_time: getStartDateTime(),
        end_time: getEndDateTime(),
        meeting_link: meetingLink.trim() || null,
      });

      if (!result.success) {
        setError(result.error || 'Failed to update meeting');
        return;
      }

      // Sync attendees — compute diff
      const currentAttendeeIds = new Set<string>();
      if (meeting.attendees) {
        for (const a of meeting.attendees) {
          const profile = Array.isArray(a.profile) ? a.profile[0] : a.profile;
          if (profile?.id) currentAttendeeIds.add(profile.id);
        }
      }

      const toAdd = [...selectedAttendees].filter((id) => !currentAttendeeIds.has(id));
      const toRemove = [...currentAttendeeIds].filter((id) => !selectedAttendees.has(id));

      await Promise.all([
        ...toAdd.map((id) => addMeetingAttendee(meeting.id, id)),
        ...toRemove.map((id) => removeMeetingAttendee(meeting.id, id)),
      ]);

      invalidateMeetings(true);
      invalidateTodaysSchedule(true);
      invalidateScheduledTasks(undefined, true);
      invalidateDailyFlow(true);
      onOpenChange(false);
    });
  }

  async function handleDelete() {
    if (!meeting) return;

    if (confirm('Delete this meeting? This cannot be undone.')) {
      startTransition(async () => {
        const result = await deleteMeeting(meeting.id);
        if (result.success) {
          invalidateMeetings(true);
          invalidateTodaysSchedule(true);
          invalidateScheduledTasks(undefined, true);
          invalidateDailyFlow(true);
          onOpenChange(false);
        } else {
          setError(result.error || 'Failed to delete meeting');
        }
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:max-w-[440px] sm:rounded-2xl">
        {/* Header */}
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight">Edit Meeting</h2>
          {meeting?.project && (
            <p className="mt-0.5 text-xs text-muted-foreground">{meeting.project.name}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="space-y-4 px-5 py-4">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              required
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            {/* Description */}
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Team Selector */}
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Who&apos;s joining
              </span>
              <div className="flex gap-2">
                {TEAM.map((member) => {
                  const isSelected = selectedAttendees.has(member.id);
                  const colors = COLOR_MAP[member.color];

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleAttendee(member.id)}
                      className={cn(
                        'group relative flex flex-1 flex-col items-center gap-1.5 rounded-xl py-2.5 transition-all',
                        isSelected ? colors.active : colors.idle
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                          isSelected ? 'bg-white/20 text-white' : 'bg-current/10'
                        )}
                      >
                        {isSelected ? <Check className="h-4 w-4" /> : member.initial}
                      </span>
                      <span className="text-[11px] font-semibold">{member.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-3 gap-2">
              {/* Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'col-span-1 h-10 justify-start border-border bg-background px-3 text-left text-xs font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {selectedDate ? format(selectedDate, 'MMM d') : 'Date'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-border bg-card p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Time */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="col-span-1 h-10 justify-start border-border bg-background px-3 text-left text-xs font-normal"
                  >
                    <Clock className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {TIME_SLOTS.find((t) => t.value === selectedTime)?.label || selectedTime}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 border-border bg-card p-1" align="start">
                  <div className="max-h-56 overflow-y-auto">
                    {TIME_SLOTS.filter((_, i) => i >= 14 && i <= 40).map((slot) => (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => setSelectedTime(slot.value)}
                        className={cn(
                          'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                          selectedTime === slot.value
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent'
                        )}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Duration */}
              <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger className="col-span-1 h-10 border-border bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Meeting Link */}
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              {meetingLink && (
                <Video className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-500" />
              )}
              <input
                type="url"
                placeholder="Meeting link (optional)"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-9 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Summary bar */}
          {selectedDate && (
            <div className="mx-5 mb-4 flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3 shrink-0" />
              <span>
                {format(selectedDate, 'EEE, MMM d')} &middot;{' '}
                {TIME_SLOTS.find((t) => t.value === selectedTime)?.label} &middot;{' '}
                {DURATION_OPTIONS.find((d) => d.value === duration)?.label}
                {selectedAttendees.size > 0 && (
                  <>
                    {' '}
                    &middot; {selectedAttendees.size} attendee
                    {selectedAttendees.size !== 1 ? 's' : ''}
                  </>
                )}
              </span>
            </div>
          )}

          {error && <p className="mx-5 mb-3 text-sm text-destructive">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="h-8 gap-1.5 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !title.trim()}
              className="h-8 min-w-[100px] bg-primary font-medium hover:bg-primary/90"
            >
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
