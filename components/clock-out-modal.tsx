'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
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
import { clockOut } from '@/app/actions/work-sessions';
import { invalidateActiveSession, invalidateTodaysSessions } from '@/lib/swr';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

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
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [checkingReport, setCheckingReport] = useState(false);

  // Check if a report has been auto-uploaded for this session
  const checkForReport = useCallback(async () => {
    setCheckingReport(true);
    try {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from('work_sessions')
        .select('report_url')
        .eq('id', session.id)
        .single();
      setReportUrl(data?.report_url || null);
    } catch {
      // Ignore errors
    } finally {
      setCheckingReport(false);
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

  // Check for report when modal opens, and poll every 10s
  useEffect(() => {
    if (open) {
      setSummary('');
      setError(null);
      checkForReport();
      const interval = setInterval(checkForReport, 10_000);
      return () => clearInterval(interval);
    }
  }, [open, checkForReport]);

  const handleSubmit = () => {
    if (!summary.trim()) {
      setError('Please describe what you worked on.');
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await clockOut(workspaceId, session.id, summary, reportUrl ?? undefined);

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
  const canSubmit = summary.trim() && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="size-4 text-primary" />
            Clock Out
          </DialogTitle>
          <DialogDescription>Summarize your session before clocking out.</DialogDescription>
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

        {/* Report status — auto-detected, not manually uploaded */}
        <div className="space-y-2">
          <Label className="text-[13px] font-medium">
            Session Report{' '}
            <span className="text-[11px] font-normal text-muted-foreground">(optional)</span>
          </Label>

          {checkingReport ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground">Checking for report…</span>
            </div>
          ) : reportUrl ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <span className="text-[12px] font-medium text-emerald-700 dark:text-emerald-400">
                  Report uploaded
                </span>
                <p className="text-[10px] text-emerald-600/60 dark:text-emerald-500/60">
                  Auto-submitted via /qualia-report
                </p>
              </div>
              <a
                href={reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[11px] text-emerald-600 underline hover:text-emerald-700"
              >
                View
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <XCircle className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <span className="text-[12px] font-medium text-muted-foreground">
                  No report attached
                </span>
                <p className="text-[10px] text-muted-foreground/60">
                  Run <code className="font-mono">/qualia-report</code> to attach one (optional)
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 shrink-0 px-2 text-[10px] text-muted-foreground"
                onClick={checkForReport}
              >
                Refresh
              </Button>
            </div>
          )}
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
            rows={4}
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
            disabled={!canSubmit}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
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
