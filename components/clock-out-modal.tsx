'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { LogOut, Clock, AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
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
import {
  clockOut,
  getSessionProjectsStatus,
  type SessionProjectStatus,
} from '@/app/actions/work-sessions';
import { invalidateActiveSession, invalidateTodaysSessions } from '@/lib/swr';
import { cn } from '@/lib/utils';

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
  const router = useRouter();
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [duration, setDuration] = useState(() => formatDuration(session.started_at));
  const [projectStatuses, setProjectStatuses] = useState<SessionProjectStatus[]>([]);
  const [checkingReports, setCheckingReports] = useState(false);

  const checkForReports = useCallback(async () => {
    setCheckingReports(true);
    try {
      const { projects } = await getSessionProjectsStatus(session.id);
      setProjectStatuses(projects);
    } catch {
      // Ignore — surfaced by the modal-level error if clock-out is attempted.
    } finally {
      setCheckingReports(false);
    }
  }, [session.id]);

  // Update duration every minute
  useEffect(() => {
    setDuration(formatDuration(session.started_at));
    const interval = setInterval(() => {
      setDuration(formatDuration(session.started_at));
    }, 60_000);
    return () => clearInterval(interval);
  }, [session.started_at]);

  // Poll for per-project reports while any are still missing. Stops as soon
  // as every project on this session has its /qualia-report attached.
  const allAttached = projectStatuses.length > 0 && projectStatuses.every((p) => p.hasReport);
  useEffect(() => {
    if (!open) return;
    setSummary('');
    setError(null);
    if (allAttached) {
      return;
    }
    checkForReports();
    const interval = setInterval(checkForReports, 10_000);
    return () => clearInterval(interval);
  }, [open, allAttached, checkForReports]);

  const handleSubmit = () => {
    if (!summary.trim()) {
      setError('Please describe what you worked on.');
      return;
    }
    if (!allAttached) {
      const missing = projectStatuses.filter((p) => !p.hasReport).map((p) => p.name);
      setError(`Run /qualia-report in each repo first — still missing: ${missing.join(', ')}.`);
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
      // Redirect to dashboard — re-engages clock-in gate for employees
      router.push('/');
    });
  };

  const startedAtFormatted = format(parseISO(session.started_at), 'h:mm a');
  const missingCount = projectStatuses.filter((p) => !p.hasReport).length;
  const totalCount = projectStatuses.length;
  const canSubmit = !!summary.trim() && !isPending && allAttached;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <LogOut className="size-4 text-primary" />
            <DialogTitle>Clock Out</DialogTitle>
          </div>
          <DialogDescription>Summarize your session before clocking out.</DialogDescription>
        </DialogHeader>

        {/* Session info row */}
        <div className="rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2.5">
          <div className="mb-1 text-xs font-semibold text-qualia-700 dark:text-qualia-300">
            {totalCount > 0
              ? `${totalCount} project${totalCount === 1 ? '' : 's'} this session`
              : (session.project?.name ?? 'No project')}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary/80">
            <Clock className="size-3 shrink-0" />
            <span>Started at {startedAtFormatted}</span>
            <span className="opacity-40">·</span>
            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
              {duration}
            </span>
          </div>
        </div>

        {/* Per-project report status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Session Reports{' '}
              <span className="text-xs font-normal text-muted-foreground">
                {totalCount > 0 ? (
                  <>
                    ({totalCount - missingCount} of {totalCount} attached)
                  </>
                ) : (
                  'loading…'
                )}
              </span>
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer px-2 text-xs text-muted-foreground"
              onClick={checkForReports}
              disabled={checkingReports}
            >
              {checkingReports ? <Loader2 className="size-3.5 animate-spin" /> : 'Refresh'}
            </Button>
          </div>

          {projectStatuses.length === 0 && checkingReports && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Checking for reports…</span>
            </div>
          )}

          <ul className="space-y-1.5">
            {projectStatuses.map((p) => (
              <li
                key={p.projectId}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2',
                  p.hasReport
                    ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
                    : 'border-destructive/30 bg-destructive/[0.06]'
                )}
              >
                {p.hasReport ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="size-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-xs font-medium',
                      p.hasReport ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
                    )}
                  >
                    {p.name}
                  </span>
                  <span className="block text-[10px] text-muted-foreground/70">
                    {p.hasReport ? (
                      'Report attached'
                    ) : (
                      <>
                        Run <code className="font-mono">/qualia-report</code> in this repo
                      </>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Summary field */}
        <div className="space-y-2">
          <Label htmlFor="clock-out-summary" className="text-sm font-medium">
            What did you work on?
          </Label>
          <Textarea
            id="clock-out-summary"
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              if (error && e.target.value.trim()) setError(null);
            }}
            placeholder="Describe what you completed during this session..."
            rows={4}
            required
            aria-required="true"
            className="resize-none"
            disabled={isPending}
          />
        </div>

        {/* Error display */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            onClick={handleSubmit}
            disabled={!canSubmit}
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
