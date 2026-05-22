'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Inbox, MessageSquareText, Paperclip, Sparkles } from 'lucide-react';

import type { ProjectClientSubmission } from '@/app/actions/client-requests';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProjectClientSubmissionsPanelProps {
  projectId: string;
  submissions: ProjectClientSubmission[];
  className?: string;
}

const statusTone: Record<string, string> = {
  pending: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  in_review: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  planned: 'border-primary/20 bg-primary/10 text-primary',
  in_progress: 'border-primary/20 bg-primary/10 text-primary',
  completed: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  declined: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400',
};

const priorityTone: Record<string, string> = {
  urgent: 'text-red-600 dark:text-red-400',
  high: 'text-amber-600 dark:text-amber-400',
  medium: 'text-blue-600 dark:text-blue-400',
  low: 'text-muted-foreground',
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function cleanTitle(title: string): string {
  return title.replace(/^\[[^\]]+\]\s*/, '');
}

export function ProjectClientSubmissionsPanel({
  projectId,
  submissions,
  className,
}: ProjectClientSubmissionsPanelProps) {
  const openCount = submissions.filter(
    (item) => !['completed', 'declined'].includes(item.status)
  ).length;

  return (
    <section
      className={cn('flex min-h-0 flex-col rounded-xl border border-border bg-card', className)}
    >
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
              <Inbox className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-foreground">Client Submissions</h2>
              <p className="text-[11px] text-muted-foreground">
                {submissions.length > 0
                  ? `${openCount} open · ${submissions.length} total`
                  : 'Nothing submitted yet'}
              </p>
            </div>
          </div>
          {submissions.length > 0 ? (
            <Link
              href={`/requests?project=${projectId}`}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
            >
              View all
            </Link>
          ) : null}
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center px-5 text-center">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-foreground">No client submissions</p>
          <p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">
            Requests, bug reports, and attached files from the client will appear here for the
            assigned team.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-2">
            {submissions.map((submission) => (
              <article
                key={submission.id}
                className="group rounded-lg border border-border bg-background/55 p-3 transition-colors hover:border-primary/25 hover:bg-muted/25"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-medium leading-5 text-foreground">
                      {cleanTitle(submission.title)}
                    </h3>
                    {submission.description ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {submission.description}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 border text-[10px] capitalize',
                      statusTone[submission.status] ||
                        'border-border bg-muted text-muted-foreground'
                    )}
                  >
                    {formatStatus(submission.status)}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="truncate">
                    {submission.client?.full_name || submission.client?.email || 'Client'}
                  </span>
                  <span className={cn('capitalize', priorityTone[submission.priority])}>
                    {submission.priority}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                  </span>
                  {submission.attachments.length > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {submission.attachments.length}
                    </span>
                  ) : null}
                  {submission.admin_response ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <MessageSquareText className="h-3 w-3" />
                      response
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
