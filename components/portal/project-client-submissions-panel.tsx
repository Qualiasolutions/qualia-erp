'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, Inbox, MessageSquareText, Paperclip, Sparkles } from 'lucide-react';

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
    <section className={cn('flex min-h-0 flex-col p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border bg-primary/10 text-primary">
            <Inbox className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Client Requests
              </p>
              {submissions.length > 0 && (
                <span className="rounded-full bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {openCount}/{submissions.length}
                </span>
              )}
            </div>
          </div>
        </div>
        {submissions.length > 0 ? (
          <Link
            href={`/requests?project=${projectId}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
          >
            Open
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/35 px-3 py-4 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-muted-foreground/35" />
          <p className="mt-2 text-xs font-medium text-foreground">No project requests</p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Feature requests and bug reports from this client appear here.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-1.5">
            {submissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-lg border border-border bg-card/45 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/[0.035]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-xs font-medium leading-5 text-foreground">
                      {cleanTitle(submission.title)}
                    </h3>
                    {submission.description ? (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
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

                <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-muted-foreground">
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
