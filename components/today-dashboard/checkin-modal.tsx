'use client';

import { useState, useTransition } from 'react';
import { ClipboardList, Loader2, AlertCircle, Clock, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createDailyCheckin } from '@/app/actions/checkins';
import { invalidateTodaysCheckin } from '@/lib/swr';
import { format } from 'date-fns';

interface CheckinModalProps {
  open: boolean;
  workspaceId: string;
  onSuccess: () => void;
}

export function CheckinModal({ open, workspaceId, onSuccess }: CheckinModalProps) {
  const [workedOn, setWorkedOn] = useState('');
  const [plannedLogout, setPlannedLogout] = useState('');
  const [blockers, setBlockers] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const clockInTime = format(new Date(), 'h:mm a');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workedOn.trim()) {
      setError('Please describe what you will work on.');
      return;
    }
    if (!plannedLogout) {
      setError('Please choose when you will log out.');
      return;
    }
    setError(null);

    // Build a full ISO timestamp for the planned clock-out
    const today = new Date();
    const [hours, minutes] = plannedLogout.split(':').map(Number);
    const plannedOut = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      hours,
      minutes
    );

    startTransition(async () => {
      try {
        const result = await createDailyCheckin(workspaceId, {
          checkin_type: 'morning',
          planned_tasks: workedOn
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean),
          blockers: blockers.trim() || null,
          planned_clock_out_time: plannedOut.toISOString(),
        });

        if (!result.success) {
          setError(result.error ?? 'Failed to submit check-in. Please try again.');
          return;
        }

        invalidateTodaysCheckin(workspaceId, true);
        onSuccess();
      } catch {
        setError('An unexpected error occurred. Please try again.');
      }
    });
  };

  return (
    <Dialog open={open} modal>
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <ClipboardList className="size-5 text-qualia-500" />
            <DialogTitle className="text-base font-semibold">Daily Check-in</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Quick check-in before you start your day. This takes about 30 seconds.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* Clock-in time (auto) */}
          <div className="flex items-center gap-2 rounded-lg border border-qualia-500/20 bg-qualia-500/5 px-3 py-2.5">
            <Clock className="size-4 text-qualia-500" />
            <span className="text-sm font-medium text-foreground">
              Clocked in at{' '}
              <span className="text-qualia-600 dark:text-qualia-400">{clockInTime}</span>
            </span>
          </div>

          {/* Planned logout time (REQUIRED) */}
          <div className="space-y-1.5">
            <Label htmlFor="planned-logout" className="text-sm font-medium">
              When will you log out today?{' '}
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <input
              id="planned-logout"
              type="time"
              value={plannedLogout}
              onChange={(e) => {
                setPlannedLogout(e.target.value);
                if (error) setError(null);
              }}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:border-qualia-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qualia-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
            />
            {/* Reminder */}
            <div className="flex items-start gap-1.5 pt-0.5">
              <Info className="mt-0.5 size-3 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                You must log out at the time you choose. When your shift ends, you&apos;ll fill in
                what you completed.
              </p>
            </div>
          </div>

          {/* What will you work on */}
          <div className="space-y-1.5">
            <Label htmlFor="worked-on" className="text-sm font-medium">
              What will you work on today?{' '}
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <Textarea
              id="worked-on"
              placeholder="e.g. Fix auth bug&#10;Review client brief&#10;Update project timeline"
              value={workedOn}
              onChange={(e) => {
                setWorkedOn(e.target.value);
                if (error) setError(null);
              }}
              rows={4}
              className="resize-none text-sm"
              disabled={isPending}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              One task per line — each line becomes a planned task.
            </p>
          </div>

          {/* Blockers (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="blockers" className="text-sm font-medium">
              Any blockers?{' '}
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="blockers"
              placeholder="Anything blocking you today..."
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              rows={2}
              className="resize-none text-sm"
              disabled={isPending}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={isPending || !workedOn.trim() || !plannedLogout}
              className="gap-2 bg-qualia-500 text-white hover:bg-qualia-600"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              {isPending ? 'Submitting...' : 'Submit Check-in'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
