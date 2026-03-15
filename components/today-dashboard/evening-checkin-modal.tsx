'use client';

import { useState, useTransition } from 'react';
import { Moon, Loader2, AlertCircle } from 'lucide-react';
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

interface EveningCheckinModalProps {
  open: boolean;
  workspaceId: string;
  onSuccess: () => void;
}

export function EveningCheckinModal({ open, workspaceId, onSuccess }: EveningCheckinModalProps) {
  const [completedTasks, setCompletedTasks] = useState('');
  const [wins, setWins] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completedTasks.trim()) {
      setError('Please list what you completed today.');
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const result = await createDailyCheckin(workspaceId, {
          checkin_type: 'evening',
          completed_tasks: completedTasks
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean),
          wins: wins.trim() || null,
          tomorrow_plan: tomorrowPlan.trim() || null,
        });

        if (!result.success) {
          setError(result.error ?? 'Failed to submit. Please try again.');
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
            <Moon className="size-5 text-indigo-500" />
            <DialogTitle className="text-base font-semibold">End of Day Check-in</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Quick wrap-up before you sign off. What did you get done?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="completed" className="text-sm font-medium">
              What did you complete today?{' '}
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <Textarea
              id="completed"
              placeholder="e.g. Fixed auth bug&#10;Finished client design&#10;Deployed staging"
              value={completedTasks}
              onChange={(e) => {
                setCompletedTasks(e.target.value);
                if (error) setError(null);
              }}
              rows={4}
              className="resize-none text-sm"
              disabled={isPending}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">One task per line.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wins" className="text-sm font-medium">
              Any wins or highlights?{' '}
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="wins"
              placeholder="Something you're proud of today…"
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              rows={2}
              className="resize-none text-sm"
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tomorrow" className="text-sm font-medium">
              Plan for tomorrow?{' '}
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="tomorrow"
              placeholder="What's first on the list tomorrow…"
              value={tomorrowPlan}
              onChange={(e) => setTomorrowPlan(e.target.value)}
              rows={2}
              className="resize-none text-sm"
              disabled={isPending}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={isPending || !completedTasks.trim()}
              className="gap-2 bg-indigo-500 text-white hover:bg-indigo-600"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              {isPending ? 'Submitting…' : 'Submit Check-out'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
