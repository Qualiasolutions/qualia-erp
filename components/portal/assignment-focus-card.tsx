'use client';

import { useMemo, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, CalendarClock, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

function daysUntil(deadlineDate: string): number {
  const today = new Date(`${todayKey()}T00:00:00`);
  const deadline = new Date(`${deadlineDate}T00:00:00`);
  return Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
}

function deadlineCopy(deadlineDate: string, requestedAt: string | null) {
  const days = daysUntil(deadlineDate);
  if (requestedAt) {
    return {
      label: 'Review requested',
      tone: 'border-primary/30 bg-primary/10 text-primary',
      description: `Submitted ${new Date(requestedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      })}`,
    };
  }
  if (days < 0) {
    return {
      label: `${Math.abs(days)}d overdue`,
      tone: 'border-destructive/30 bg-destructive/[0.08] text-destructive',
      description: 'Submit the project for review or escalate the blocker.',
    };
  }
  if (days === 0) {
    return {
      label: 'Due today',
      tone: 'border-amber-500/30 bg-amber-500/[0.08] text-amber-700 dark:text-amber-400',
      description: 'Finish and submit this today.',
    };
  }
  if (days <= 2) {
    return {
      label: `${days}d left`,
      tone: 'border-amber-500/30 bg-amber-500/[0.08] text-amber-700 dark:text-amber-400',
      description: 'Deadline is close.',
    };
  }
  return {
    label: `${days}d left`,
    tone: 'border-border bg-muted/40 text-muted-foreground',
    description: 'Keep the project moving before tasks.',
  };
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
  const [isPending, startTransition] = useTransition();

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
        const aRequested = a.completion_requested_at ? 1 : 0;
        const bRequested = b.completion_requested_at ? 1 : 0;
        if (aRequested !== bRequested) return aRequested - bRequested;
        return a.deadline_date.localeCompare(b.deadline_date);
      });
  }, [assignments]);

  const focus = active[0] ?? null;
  if (!focus?.project) return null;

  const deadline = deadlineCopy(focus.deadline_date, focus.completion_requested_at);
  const progress = Math.max(0, Math.min(100, focus.project.progress ?? 0));
  const moreCount = active.length - 1;

  const submitForReview = () => {
    startTransition(async () => {
      const result = await requestAssignmentCompletion(focus.id);
      if (!result.success) {
        toast.error(result.error || 'Failed to submit project for review');
        return;
      }
      toast.success('Project submitted for review');
      if (employeeId) invalidateEmployeeAssignments(employeeId, true);
    });
  };

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/20 bg-primary/[0.035] p-5 shadow-sm',
        compact ? 'mb-4' : 'mb-5',
        isGated && 'opacity-70',
        className
      )}
      aria-label="Assigned project focus"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Main assigned project
            </span>
            <Badge variant="outline" className={cn('h-5 text-[10px]', deadline.tone)}>
              <CalendarClock className="mr-1 h-3 w-3" />
              {deadline.label}
            </Badge>
            {moreCount > 0 ? (
              <span className="text-[11px] text-muted-foreground">+{moreCount} more</span>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-card text-sm font-semibold text-primary">
              {focus.project.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight">
                {focus.project.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {focus.project.client?.name ?? deadline.description}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="h-1.5 overflow-hidden rounded-full bg-border/50 sm:w-[260px]">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">{progress}%</span>
              <span>
                Deadline{' '}
                {new Date(`${focus.deadline_date}T00:00:00`).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {isGated ? (
            <Button variant="outline" size="sm" className="gap-2" disabled>
              Open roadmap
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link href={`/projects/${focus.project.id}/roadmap`}>
                Open roadmap
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          {focus.completion_requested_at ? (
            <Button size="sm" className="gap-2" disabled>
              <Clock className="h-3.5 w-3.5" />
              Waiting review
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-2"
              disabled={isPending || isGated}
              onClick={submitForReview}
            >
              <Send className="h-3.5 w-3.5" />
              Submit for review
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
