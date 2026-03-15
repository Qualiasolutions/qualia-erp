'use client';

import { useState, useTransition } from 'react';
import { ClipboardList, Loader2, AlertCircle } from 'lucide-react';
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

interface CheckinModalProps {
  open: boolean;
  workspaceId: string;
  onSuccess: () => void;
}

export function CheckinModal({ open, workspaceId, onSuccess }: CheckinModalProps) {
  const [workedOn, setWorkedOn] = useState('');
  const [blockers, setBlockers] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workedOn.trim()) {
      setError('Please describe what you worked on.');
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const result = await createDailyCheckin(workspaceId, {
          checkin_type: 'morning',
          planned_tasks: workedOn
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean),
          blockers: blockers.trim() || null,
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
    <Dialog
      open={open}
      // Not dismissable via backdrop — omit onOpenChange to prevent closing
      modal
    >
      <DialogContent
        className="max-w-md"
        // Prevent closing on escape or backdrop click
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
          {/* What did you work on / plan to work on */}
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
              placeholder="Anything blocking you today…"
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
              disabled={isPending || !workedOn.trim()}
              className="gap-2 bg-qualia-500 text-white hover:bg-qualia-600"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              {isPending ? 'Submitting…' : 'Submit Check-in'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
