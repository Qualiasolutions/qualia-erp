'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  CalendarIcon,
  Clock,
  Users,
  Building2,
  Video,
  Link2,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { format, setHours, setMinutes, addMinutes, addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { createMeeting, getClients } from '@/app/actions';

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
  { value: 15, label: '15m', full: '15 minutes' },
  { value: 30, label: '30m', full: '30 minutes' },
  { value: 45, label: '45m', full: '45 minutes' },
  { value: 60, label: '1h', full: '1 hour' },
  { value: 90, label: '1.5h', full: '1.5 hours' },
  { value: 120, label: '2h', full: '2 hours' },
];

interface Client {
  id: string;
  display_name: string;
}

export function NewMeetingModal() {
  const linkInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [meetingType, setMeetingType] = useState<'internal' | 'client'>('internal');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(60);

  useEffect(() => {
    if (open) {
      getClients().then((data) => setClients(data as Client[]));
      const nextSlot = getNextTimeSlot();
      setSelectedDate(nextSlot.date);
      setSelectedTime(nextSlot.time);
      setDuration(60);
      setMeetingType('internal');
      setSelectedClientId('');
      setTitle('');
      setMeetingLink('');
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  // Auto-generate title based on meeting type
  useEffect(() => {
    if (meetingType === 'internal') {
      setTitle('Internal Meeting');
    } else if (selectedClientId) {
      const client = clients.find((c) => c.id === selectedClientId);
      if (client) {
        setTitle(`Meeting with ${client.display_name}`);
      }
    }
  }, [meetingType, selectedClientId, clients]);

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
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set('title', title);
    formData.set('start_time', getStartDateTime());
    formData.set('end_time', getEndDateTime());

    if (meetingType === 'client' && selectedClientId) {
      formData.set('client_id', selectedClientId);
    }

    if (meetingLink.trim()) {
      formData.set('meeting_link', meetingLink.trim());
    }

    const result = await createMeeting(formData);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 600);
    } else {
      setError(result.error || 'Failed to create meeting');
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="group relative overflow-hidden">
          <span className="relative z-10 flex items-center gap-2">
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            <span>New Meeting</span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="overflow-hidden border-border/50 bg-gradient-to-b from-card to-card/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-[420px]"
        showCloseButton={false}
      >
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10"
              >
                <Check className="h-8 w-8 text-emerald-500" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-medium text-foreground"
              >
                Meeting scheduled!
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                <DialogHeader className="flex-1">
                  <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Quick Schedule
                  </DialogTitle>
                </DialogHeader>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-5">
                  {/* Meeting Type Toggle - Sleek segmented control */}
                  <div className="relative flex rounded-xl bg-secondary/50 p-1">
                    <motion.div
                      className="absolute inset-y-1 rounded-lg bg-card shadow-sm"
                      layoutId="meeting-type-bg"
                      animate={{
                        left: meetingType === 'internal' ? '4px' : 'calc(50% + 2px)',
                        right: meetingType === 'internal' ? 'calc(50% + 2px)' : '4px',
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                    <button
                      type="button"
                      onClick={() => setMeetingType('internal')}
                      className={cn(
                        'relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
                        meetingType === 'internal' ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      <Users className="h-4 w-4" />
                      Internal
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingType('client')}
                      className={cn(
                        'relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
                        meetingType === 'client' ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      <Building2 className="h-4 w-4" />
                      Client
                    </button>
                  </div>

                  {/* Client Selector */}
                  <AnimatePresence>
                    {meetingType === 'client' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                          <SelectTrigger className="h-11 rounded-xl border-border/50 bg-secondary/30">
                            <SelectValue placeholder="Select client..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] border-border/50 bg-card/95 backdrop-blur-xl">
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Date & Time Row */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Date Selection */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 justify-start gap-2 rounded-xl border-border/50 bg-secondary/30 font-normal hover:bg-secondary/50"
                        >
                          <CalendarIcon className="h-4 w-4 text-primary" />
                          <span className="truncate">
                            {selectedDate ? format(selectedDate, 'MMM d') : 'Date'}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto border-border/50 bg-card/95 p-0 backdrop-blur-xl"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Time Selection */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 justify-start gap-2 rounded-xl border-border/50 bg-secondary/30 font-normal hover:bg-secondary/50"
                        >
                          <Clock className="h-4 w-4 text-primary" />
                          {TIME_SLOTS.find((t) => t.value === selectedTime)?.label}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-40 border-border/50 bg-card/95 p-1 backdrop-blur-xl"
                        align="start"
                      >
                        <div className="max-h-56 overflow-y-auto">
                          {TIME_SLOTS.filter((_, i) => i >= 14 && i <= 40).map((slot) => (
                            <button
                              key={slot.value}
                              type="button"
                              onClick={() => setSelectedTime(slot.value)}
                              className={cn(
                                'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                                selectedTime === slot.value
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-secondary'
                              )}
                            >
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Duration Chips */}
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Duration</p>
                    <div className="flex flex-wrap gap-2">
                      {DURATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDuration(opt.value)}
                          className={cn(
                            'rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                            duration === opt.value
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meeting Link */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                      ref={linkInputRef}
                      type="url"
                      placeholder="Paste meeting link (optional)"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      className="h-11 w-full rounded-xl border border-border/50 bg-secondary/30 pl-10 pr-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                    {meetingLink && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <Link2 className="h-4 w-4 text-emerald-500" />
                      </motion.div>
                    )}
                  </div>

                  {/* Summary Card */}
                  {selectedDate && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border/50 bg-gradient-to-br from-secondary/30 to-secondary/10 p-4"
                    >
                      <p className="font-medium text-foreground">{title}</p>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {format(selectedDate, 'EEE, MMM d')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {TIME_SLOTS.find((t) => t.value === selectedTime)?.label}
                        </span>
                        <span className="text-muted-foreground/70">
                          {DURATION_OPTIONS.find((d) => d.value === duration)?.full}
                        </span>
                      </div>
                      {meetingLink && (
                        <div className="mt-2 flex items-center gap-1.5 text-sm text-emerald-500">
                          <Video className="h-3.5 w-3.5" />
                          <span className="font-medium">Video link attached</span>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm text-destructive"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/50 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    className="text-muted-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || (meetingType === 'client' && !selectedClientId)}
                    className="min-w-[120px]"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      />
                    ) : (
                      'Schedule'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
