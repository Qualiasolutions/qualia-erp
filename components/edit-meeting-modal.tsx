'use client';

import { useState, useEffect, useTransition } from 'react';
import { CalendarIcon, Clock, Video, Link2, X, Users } from 'lucide-react';
import { format, setHours, setMinutes, addMinutes, parseISO, differenceInMinutes } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  useProfiles,
  invalidateMeetings,
  invalidateTodaysSchedule,
  invalidateScheduledTasks,
  invalidateDailyFlow,
} from '@/lib/swr';

// Time slots in 30-minute increments
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const display = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  return { value: time, label: display };
});

// Common meeting durations
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
  const { profiles } = useProfiles();

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

  // Calculate start and end times
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
      // Update meeting details
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

      // Add new attendees
      const toAdd = [...selectedAttendees].filter((id) => !currentAttendeeIds.has(id));
      // Remove old attendees
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

    if (confirm('Are you sure you want to delete this meeting?')) {
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
      <DialogContent className="border-border bg-card text-foreground sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Edit Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              required
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Description
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add meeting notes..."
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Attendees */}
          {profiles.length > 0 && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Users className="h-4 w-4 text-muted-foreground" />
                Attendees
              </label>
              <div className="flex flex-wrap gap-2">
                {profiles.map((profile) => {
                  const isSelected = selectedAttendees.has(profile.id);
                  const name = profile.full_name || profile.email || 'Unknown';
                  const initial = name[0]?.toUpperCase() || '?';

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => toggleAttendee(profile.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all',
                        isSelected
                          ? 'border-violet-500/40 bg-violet-500/10 text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground'
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-5 items-center justify-center rounded-full text-[10px] font-semibold',
                          isSelected ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {initial}
                      </span>
                      <span className="font-medium">{name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date Selection */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'h-11 w-full justify-start border-border bg-background text-left font-normal',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-3 h-4 w-4 text-muted-foreground" />
                {selectedDate ? format(selectedDate, 'EEE, MMM d, yyyy') : 'Pick a date'}
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

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-3">
            {/* Time */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 justify-start border-border bg-background text-left font-normal"
                >
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  {TIME_SLOTS.find((t) => t.value === selectedTime)?.label || selectedTime}
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
                        'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
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
              <SelectTrigger className="h-11 border-border bg-background">
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
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Video className="h-4 w-4 text-muted-foreground" />
              Meeting Link
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                placeholder="Paste Google Meet, Zoom, or other link..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Summary */}
          {selectedDate && (
            <div className="rounded-lg bg-secondary/50 px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Updated schedule: </span>
              <span className="font-medium text-foreground">{title || 'Untitled'}</span>
              <div className="mt-1 text-xs text-muted-foreground">
                {format(selectedDate, 'EEEE, MMM d')} at{' '}
                {TIME_SLOTS.find((t) => t.value === selectedTime)?.label || selectedTime} (
                {DURATION_OPTIONS.find((d) => d.value === duration)?.label})
              </div>
              {selectedAttendees.size > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {selectedAttendees.size} attendee{selectedAttendees.size !== 1 ? 's' : ''}
                </div>
              )}
              {meetingLink && (
                <div className="mt-1.5 flex items-center gap-1 text-emerald-500">
                  <Video className="h-3 w-3" />
                  <span className="text-xs font-medium">Video link attached</span>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isPending}
              className="border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            >
              <X className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
            <Button
              type="submit"
              disabled={isPending || !title.trim()}
              className="flex-1 bg-primary font-medium hover:bg-primary/90"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
