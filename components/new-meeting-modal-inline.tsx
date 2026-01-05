'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, Clock, Users, Building2, Video, Link2 } from 'lucide-react';
import { format, setHours, setMinutes, addMinutes, addDays } from 'date-fns';

// Get the next available time slot (rounds up to next 30 min)
function getNextTimeSlot(): { date: Date; time: string } {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Round up to next 30-minute slot
  let nextHour = currentHour;
  const nextMinute = currentMinute < 30 ? 30 : 0;
  if (currentMinute >= 30) {
    nextHour = currentHour + 1;
  }

  // If it's after 8 PM, default to 9 AM tomorrow
  if (nextHour >= 20) {
    return {
      date: addDays(now, 1),
      time: '09:00',
    };
  }

  // If it's before 7 AM, default to 9 AM today
  if (nextHour < 7) {
    return {
      date: now,
      time: '09:00',
    };
  }

  return {
    date: now,
    time: `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`,
  };
}
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectWithOther } from '@/components/ui/select-with-other';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { createMeeting, getClients } from '@/app/actions';

// Time slots in 30-minute increments (business hours focused)
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

interface Client {
  id: string;
  display_name: string;
}

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; display_name: string } | null;
}

interface NewMeetingModalInlineProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMeetingCreated: (meeting: Meeting) => void;
}

export function NewMeetingModalInline({
  open,
  onOpenChange,
  onMeetingCreated,
}: NewMeetingModalInlineProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [meetingType, setMeetingType] = useState<'internal' | 'client'>('internal');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [customClientName, setCustomClientName] = useState<string>('');
  const [title, setTitle] = useState('');
  const [meetingLink, setMeetingLink] = useState<string>('');

  // Modern time picker state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(60);

  useEffect(() => {
    if (open) {
      getClients().then((data) => setClients(data as Client[]));
      // Reset form with smart defaults
      const nextSlot = getNextTimeSlot();
      setSelectedDate(nextSlot.date);
      setSelectedTime(nextSlot.time);
      setDuration(60);
      setMeetingType('internal');
      setSelectedClientId('');
      setCustomClientName('');
      setTitle('');
      setMeetingLink('');
      setError(null);
    }
  }, [open]);

  // Auto-generate title based on client selection or custom name
  useEffect(() => {
    if (meetingType === 'client') {
      if (customClientName) {
        setTitle(`Meeting with ${customClientName}`);
      } else if (selectedClientId) {
        const client = clients.find((c) => c.id === selectedClientId);
        if (client) {
          setTitle(`Meeting with ${client.display_name}`);
        }
      }
    }
  }, [meetingType, selectedClientId, customClientName, clients]);

  // Calculate start and end times for the form
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
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set('title', title);
    formData.set('start_time', getStartDateTime());
    formData.set('end_time', getEndDateTime());

    if (meetingType === 'client') {
      if (selectedClientId) {
        formData.set('client_id', selectedClientId);
      } else if (customClientName) {
        formData.set('custom_client_name', customClientName);
      }
    }

    // Add meeting link if provided
    if (meetingLink.trim()) {
      formData.set('meeting_link', meetingLink.trim());
    }

    const result = await createMeeting(formData);

    if (result.success && result.data) {
      // Build the meeting object to pass to the callback
      const meetingData = result.data as {
        id: string;
        title: string;
        start_time: string;
        end_time: string;
        meeting_link: string | null;
      };
      const selectedClient = clients.find((c) => c.id === selectedClientId);
      const newMeeting: Meeting = {
        id: meetingData.id,
        title: meetingData.title,
        start_time: meetingData.start_time,
        end_time: meetingData.end_time,
        meeting_link: meetingData.meeting_link || null,
        project: null,
        client: selectedClient
          ? { id: selectedClient.id, display_name: selectedClient.display_name }
          : customClientName
            ? { id: 'custom', display_name: customClientName }
            : null,
      };
      onMeetingCreated(newMeeting);
    } else {
      setError(result.error || 'Failed to create meeting');
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Quick Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Meeting Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMeetingType('internal')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all',
                meetingType === 'internal'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Internal</span>
            </button>
            <button
              type="button"
              onClick={() => setMeetingType('client')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all',
                meetingType === 'client'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">Client</span>
            </button>
          </div>

          {/* Client Selector (only for client meetings) */}
          {meetingType === 'client' && (
            <SelectWithOther
              options={clients.map((client) => ({
                value: client.id,
                label: client.display_name,
                icon: <Building2 className="h-4 w-4 text-muted-foreground" />,
              }))}
              value={customClientName || selectedClientId}
              onChange={(value, isCustom) => {
                if (isCustom) {
                  setSelectedClientId('');
                  setCustomClientName(value);
                } else {
                  setSelectedClientId(value);
                  setCustomClientName('');
                }
              }}
              placeholder="Select client..."
              otherLabel="Other client..."
              otherPlaceholder="Client name..."
              icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
              triggerClassName="h-11 border-border bg-background"
            />
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
                  {TIME_SLOTS.find((t) => t.value === selectedTime)?.label}
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

          {/* Meeting Link (optional) */}
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
              <span className="text-muted-foreground">Scheduling: </span>
              <span className="font-medium text-foreground">{title}</span>
              <div className="mt-1 text-xs text-muted-foreground">
                {format(selectedDate, 'EEEE, MMM d')} at{' '}
                {TIME_SLOTS.find((t) => t.value === selectedTime)?.label} (
                {DURATION_OPTIONS.find((d) => d.value === duration)?.label})
              </div>
              {meetingLink && (
                <div className="mt-1.5 flex items-center gap-1 text-emerald-500">
                  <Video className="h-3 w-3" />
                  <span className="text-xs font-medium">Video link attached</span>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={
              loading || (meetingType === 'client' && !selectedClientId && !customClientName)
            }
            className="h-11 w-full bg-primary font-medium hover:bg-primary/90"
          >
            {loading ? 'Scheduling...' : 'Schedule Meeting'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
