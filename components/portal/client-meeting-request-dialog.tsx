'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarIcon, Clock, Loader2, Send } from 'lucide-react';
import { addMinutes, format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { requestMeeting } from '@/app/actions/client-portal/meeting-requests';
import { getClientDashboardProjects } from '@/app/actions/client-portal/projects';
import { cn } from '@/lib/utils';

interface ClientMeetingRequestDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  clientId: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

// 30-minute slots from 09:00 to 18:00 local time.
const TIME_SLOTS: { value: string; label: string }[] = (() => {
  const slots: { value: string; label: string }[] = [];
  for (let hour = 9; hour <= 18; hour += 1) {
    for (const minutes of [0, 30]) {
      if (hour === 18 && minutes === 30) continue;
      const hh = String(hour).padStart(2, '0');
      const mm = String(minutes).padStart(2, '0');
      const value = `${hh}:${mm}`;
      const ampmHour = hour === 12 ? 12 : hour % 12;
      const ampm = hour < 12 ? 'AM' : 'PM';
      slots.push({ value, label: `${ampmHour}:${mm} ${ampm}` });
    }
  }
  return slots;
})();

function combineDateAndTime(date: Date, time: string): Date {
  const [hh, mm] = time.split(':').map(Number);
  const next = new Date(date);
  next.setHours(hh, mm, 0, 0);
  return next;
}

export function ClientMeetingRequestDialog({
  open,
  onOpenChange,
  clientId,
}: ClientMeetingRequestDialogProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [duration, setDuration] = useState<number>(30);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Fetch the client's accessible projects whenever the dialog opens.
  // We keep this client-side so the dialog stays self-contained — no need
  // to thread project lists through the hub.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getClientDashboardProjects(clientId)
      .then((result) => {
        if (cancelled) return;
        if (result.success && Array.isArray(result.data)) {
          const opts = (result.data as Array<{ id: string; name: string }>).map((p) => ({
            id: p.id,
            name: p.name,
          }));
          setProjects(opts);
          if (opts.length === 1) {
            setProjectId(opts[0].id);
          }
        } else {
          setProjects([]);
        }
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, clientId]);

  const resetForm = () => {
    setProjectId(projects.length === 1 ? projects[0].id : '');
    setSelectedDate(undefined);
    setSelectedTime('10:00');
    setDuration(30);
    setTitle('');
    setDescription('');
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    onOpenChange(next);
    if (!next) {
      // Defer the reset so the closing transition doesn't flash the cleared state.
      setTimeout(resetForm, 200);
    }
  };

  const canSubmit =
    !!projectId && !!selectedDate && !!selectedTime && !!title.trim() && !submitting;

  const handleSubmit = async () => {
    if (!projectId || !selectedDate || !selectedTime || !title.trim()) return;

    const start = combineDateAndTime(selectedDate, selectedTime);
    const end = addMinutes(start, duration);

    setSubmitting(true);
    const result = await requestMeeting({
      projectId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      title: title.trim(),
      description: description.trim() || undefined,
    });
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || 'Could not submit your request. Please try again.');
      return;
    }

    toast.success("Meeting request sent — we'll confirm shortly");
    handleOpenChange(false);
  };

  const showProjectPicker = projects.length !== 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[560px]">
        <div className="border-b border-border bg-card/40 px-6 pb-5 pt-6">
          <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="inline-block h-px w-6 bg-primary/60" aria-hidden />
            <span>Book time with us</span>
          </div>
          <DialogHeader className="mt-2 space-y-1.5">
            <DialogTitle className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
              Request a meeting
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Pick a date and time that works for you. We&apos;ll confirm the slot and send a
              calendar invite.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) handleSubmit();
          }}
          className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5"
        >
          {showProjectPicker && (
            <div className="space-y-2">
              <Label htmlFor="meeting-request-project" className="text-sm font-medium">
                Project
              </Label>
              <Select
                value={projectId}
                onValueChange={setProjectId}
                disabled={projectsLoading || projects.length === 0}
              >
                <SelectTrigger id="meeting-request-project" className="h-11 rounded-xl text-[14px]">
                  <SelectValue
                    placeholder={
                      projectsLoading
                        ? 'Loading projects…'
                        : projects.length === 0
                          ? 'No projects available'
                          : 'Which project is this about?'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Date picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'h-11 w-full justify-start gap-2 rounded-xl font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Choose a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto border-border bg-card/95 p-0 backdrop-blur-xl"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < today}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="meeting-request-duration" className="text-sm font-medium">
                Duration
              </Label>
              <Select
                value={String(duration)}
                onValueChange={(value) => setDuration(Number(value))}
              >
                <SelectTrigger
                  id="meeting-request-duration"
                  className="h-11 rounded-xl text-[14px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time slots — 30-min grid 9 AM to 6 PM */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Time
              </Label>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {TIME_SLOTS.map((slot) => {
                const active = selectedTime === slot.value;
                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => setSelectedTime(slot.value)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-xl border px-2 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      active
                        ? 'border-primary/40 bg-primary/[0.08] text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground'
                    )}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="meeting-request-title" className="text-sm font-medium">
              Topic
            </Label>
            <Input
              id="meeting-request-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What would you like to discuss?"
              className="h-11 rounded-xl text-[14px]"
              maxLength={200}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="meeting-request-description" className="text-sm font-medium">
              Details <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="meeting-request-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything we should prepare or review beforehand?"
              rows={4}
              maxLength={2000}
              className="resize-none rounded-xl text-[14px] leading-relaxed"
            />
          </div>
        </form>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-card/40 px-6 py-4">
          <p
            className="min-h-[16px] flex-1 truncate font-mono text-[11px] text-muted-foreground"
            aria-live="polite"
          >
            {submitting ? 'Sending request…' : "We'll reply within the hour during working hours."}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="cursor-pointer rounded-xl"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="cursor-pointer gap-1.5 rounded-xl bg-primary text-primary-foreground"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send request
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
