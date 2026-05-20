'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { requestAssignmentCompletion } from '@/app/actions/project-assignments';
import { invalidateEmployeeAssignments } from '@/lib/swr';

export type AssignmentFocusItem = {
  id: string;
  assigned_at: string;
  deadline_date: string;
  completion_requested_at: string | null;
  completion_note: string | null;
  completed_at: string | null;
  promised_delivery_date?: string | null;
  project: {
    id: string;
    name: string;
    status: string | null;
    progress?: number | null;
    target_date?: string | null;
    logo_url?: string | null;
    client?: { id: string; name: string } | null;
  } | null;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function AssignmentFocusCard({
  assignments,
  employeeId,
  className,
  compact = false,
  isGated = false,
}: {
  assignments: AssignmentFocusItem[];
  employeeId?: string | null;
  className?: string;
  compact?: boolean;
  isGated?: boolean;
}) {
  const active = useMemo(() => {
    return assignments
      .filter((assignment) => {
        const status = assignment.project?.status;
        return (
          assignment.project &&
          !assignment.completed_at &&
          status !== 'Archived' &&
          status !== 'Canceled'
        );
      })
      .sort((a, b) => {
        // Awaiting review goes to the bottom; the rest stays in assigned-at order.
        const aRequested = a.completion_requested_at ? 1 : 0;
        const bRequested = b.completion_requested_at ? 1 : 0;
        if (aRequested !== bRequested) return aRequested - bRequested;
        return a.assigned_at.localeCompare(b.assigned_at);
      });
  }, [assignments]);

  if (active.length === 0) return null;

  return (
    <section
      className={cn(
        'rounded-xl border border-primary/15 bg-primary/[0.035] p-4 shadow-[0_1px_0_hsl(var(--border)/0.45)] md:p-5',
        compact ? 'mb-4' : 'mb-5',
        isGated && 'opacity-70',
        className
      )}
      aria-label="My assigned projects"
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          My assigned projects
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {active.length}
        </span>
      </header>

      <ul className="flex flex-col gap-2">
        {active.map((assignment) => (
          <AssignmentRow
            key={assignment.id}
            assignment={assignment}
            employeeId={employeeId ?? null}
            isGated={isGated}
          />
        ))}
      </ul>
    </section>
  );
}

function AssignmentRow({
  assignment,
  employeeId,
  isGated,
}: {
  assignment: AssignmentFocusItem;
  employeeId: string | null;
  isGated: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const project = assignment.project!;
  const progress = Math.max(0, Math.min(100, project.progress ?? 0));
  const initials = project.name.slice(0, 2).toUpperCase();
  const promisedLabel = formatDate(assignment.promised_delivery_date ?? null);

  return (
    <li className="rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.06] text-[11px] font-semibold text-primary"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold tracking-tight">{project.name}</h3>
              {assignment.completion_requested_at ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-amber-700 dark:text-amber-400">
                  <Clock className="h-2.5 w-2.5" />
                  Awaiting review
                </span>
              ) : null}
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {project.client?.name ?? 'No client'}
              {promisedLabel && assignment.completion_requested_at ? (
                <span> · You promised {promisedLabel}</span>
              ) : null}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/50">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {progress}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {isGated ? (
            <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled>
              Open roadmap
              <ArrowRight className="h-3 w-3" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
              <Link href={`/projects/${project.id}/roadmap`}>
                Open roadmap
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          )}
          {assignment.completion_requested_at ? (
            <Button size="sm" className="h-8 gap-1.5" disabled>
              <Clock className="h-3 w-3" />
              Waiting review
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 gap-1.5"
              disabled={isGated}
              onClick={() => setDialogOpen(true)}
            >
              <Send className="h-3 w-3" />
              Submit for review
            </Button>
          )}
        </div>
      </div>

      <SubmitForReviewDialog
        assignmentId={assignment.id}
        projectName={project.name}
        employeeId={employeeId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </li>
  );
}

function SubmitForReviewDialog({
  assignmentId,
  projectName,
  employeeId,
  open,
  onOpenChange,
}: {
  assignmentId: string;
  projectName: string;
  employeeId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const min = todayKey();

  const submit = () => {
    if (!date) {
      toast.error('Pick a delivery date before submitting.');
      return;
    }
    startTransition(async () => {
      const result = await requestAssignmentCompletion(
        assignmentId,
        note.trim() || undefined,
        date
      );
      if (!result.success) {
        toast.error(result.error || 'Failed to submit project for review');
        return;
      }
      toast.success('Submitted. Promised delivery saved.');
      if (employeeId) invalidateEmployeeAssignments(employeeId, true);
      setDate('');
      setNote('');
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Submit {projectName} for review</DialogTitle>
          <DialogDescription>
            Pick a date you can confidently deliver by. The reviewer sees this as your commitment —
            if you slip the date, you have to resubmit.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium">When can you deliver this? *</span>
            <Input
              type="date"
              value={date}
              min={min}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <span className="text-[11px] text-muted-foreground">Today or later.</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium">Note for reviewer (optional)</span>
            <Textarea
              rows={3}
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's done, what's left, anything the reviewer should know."
            />
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            type="button"
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !date} type="button" className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            {isPending ? 'Submitting…' : 'Submit for review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
