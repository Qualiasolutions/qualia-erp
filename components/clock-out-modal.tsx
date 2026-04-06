'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { LogOut, Clock, AlertCircle, Loader2, Upload, FileText, X } from 'lucide-react';
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
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setReportFile(null);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('Report file must be under 10MB.');
      return;
    }

    setReportFile(file);
    if (error) setError(null);
  };

  const removeFile = () => {
    setReportFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadReport = async (): Promise<string | null> => {
    if (!reportFile) return null;

    const supabase = createBrowserClient();
    const ext = reportFile.name.split('.').pop() || 'md';
    const dateStr = format(new Date(), 'yyyy-MM-dd-HHmm');
    const storagePath = `reports/${session.id}/${dateStr}-report.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(storagePath, reportFile, { upsert: true });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('project-files').getPublicUrl(storagePath);

    return publicUrl;
  };

  const handleSubmit = () => {
    if (!summary.trim()) {
      setError('Please describe what you worked on.');
      return;
    }

    if (!reportFile) {
      setError(
        'Session report is required. Generate one with /qualia-report in Claude Code, then upload the file.'
      );
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        setIsUploading(true);
        const reportUrl = await uploadReport();
        setIsUploading(false);

        const result = await clockOut(workspaceId, session.id, summary, reportUrl ?? undefined);

        if (!result.success) {
          setError(result.error ?? 'Failed to clock out. Please try again.');
          return;
        }

        invalidateActiveSession(workspaceId, true);
        invalidateTodaysSessions(workspaceId, true);
        onSuccess();
        onOpenChange(false);
      } catch (err) {
        setIsUploading(false);
        setError(err instanceof Error ? err.message : 'Failed to upload report.');
      }
    });
  };

  const startedAtFormatted = format(parseISO(session.started_at), 'h:mm a');
  const canSubmit = summary.trim() && reportFile && !isPending && !isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="size-4 text-primary" />
            Clock Out
          </DialogTitle>
          <DialogDescription>Summarize your session and upload your report.</DialogDescription>
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
            rows={4}
            className="resize-none"
            disabled={isPending}
          />
        </div>

        {/* Report upload */}
        <div className="space-y-2">
          <Label className="text-[13px] font-medium">
            Session Report{' '}
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Run{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              /qualia-report
            </code>{' '}
            in Claude Code before clocking out. Upload the generated report file.
          </p>

          {reportFile ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <FileText className="size-4 shrink-0 text-primary" />
              <span className="flex-1 truncate text-[12px] font-medium">{reportFile.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {(reportFile.size / 1024).toFixed(1)}KB
              </span>
              <button
                type="button"
                onClick={removeFile}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                disabled={isPending}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 py-4 text-[12px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              <Upload className="size-4" />
              <span>Upload report file</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
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
            {isPending || isUploading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {isUploading ? 'Uploading report…' : 'Clocking out…'}
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
