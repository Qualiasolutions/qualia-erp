'use client';

import { useState, useEffect, useTransition } from 'react';
import { format, parseISO } from 'date-fns';
import { LogOut, Clock, AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { clockOut } from '@/app/actions/work-sessions';
import { invalidateActiveSession, invalidateTodaysSessions } from '@/lib/swr';

// ============ TYPES ============

interface ClockOutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  session: {
    id: string;
    started_at: string;
    project?: { id: string; name: string } | null;
  };
  onSuccess: () => void;
}

// ============ HELPERS ============

function formatDuration(startedAt: string): string {
  const mins = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ============ COMPONENT ============

export function ClockOutModal({
  open,
  onOpenChange,
  workspaceId,
  session,
  onSuccess,
}: ClockOutModalProps) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [duration, setDuration] = useState(() => formatDuration(session.started_at));

  // Update duration every minute
  useEffect(() => {
    setDuration(formatDuration(session.started_at));
    const interval = setInterval(() => {
      setDuration(formatDuration(session.started_at));
    }, 60_000);
    return () => clearInterval(interval);
  }, [session.started_at]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSummary('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!summary.trim()) {
      setError('Please describe what you worked on.');
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await clockOut(workspaceId, session.id, summary);

      if (!result.success) {
        setError(result.error ?? 'Failed to clock out. Please try again.');
        return;
      }

      invalidateActiveSession(workspaceId, true);
      invalidateTodaysSessions(workspaceId, true);
      onSuccess();
      onOpenChange(false);
    });
  };

  const startedAtFormatted = format(parseISO(session.started_at), 'h:mm a');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="size-4 text-primary" />
            Clock Out
          </DialogTitle>
          <DialogDescription>Summarize what you worked on during this session.</DialogDescription>
        </DialogHeader>

        {/* Session info row */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
          <div className="mb-1 text-[12px] font-semibold text-qualia-700 dark:text-qualia-300">
            {session.project?.name ?? 'No project'}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-primary/80 dark:text-primary/80">
            <Clock className="size-3 shrink-0" />
            <span>Started at {startedAtFormatted}</span>
            <span className="mx-1 opacity-40">·</span>
            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary dark:text-primary">
              {duration}
            </span>
          </div>
        </div>

        {/* Summary field */}
        <div className="space-y-2">
          <Label htmlFor="clock-out-summary" className="text-[13px] font-medium">
            What did you work on?{' '}
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <Textarea
            id="clock-out-summary"
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              if (error && e.target.value.trim()) setError(null);
            }}
            placeholder="Describe what you completed during this session..."
            rows={5}
            className="resize-none"
            disabled={isPending}
          />
        </div>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!summary.trim() || isPending}
            className="bg-primary text-primary-foreground hover:bg-primary"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Clocking out…
              </>
            ) : (
              'Clock Out'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
