'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { Activity, Loader2 } from 'lucide-react';
import { isToday, isYesterday, parseISO } from 'date-fns';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getCrossProjectActivityFeed } from '@/app/actions/activity-feed';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface ActivityEntry {
  id: string;
  project_id: string;
  action_type: string;
  actor_id: string;
  action_data: Record<string, unknown> | null;
  is_client_visible: boolean | null;
  created_at: string | null;
  actor?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  project?: { id: string; name: string } | null;
}

interface ActivityContentProps {
  projectIds: string[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function formatDateGroup(dateString: string): string {
  const date = parseISO(dateString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return formatDate(date, 'MMMM d, yyyy');
}

function groupByDate(entries: ActivityEntry[]): Map<string, ActivityEntry[]> {
  const grouped = new Map<string, ActivityEntry[]>();
  for (const entry of entries) {
    if (!entry.created_at) continue;
    const group = formatDateGroup(entry.created_at);
    const existing = grouped.get(group) || [];
    grouped.set(group, [...existing, entry]);
  }
  return grouped;
}

function formatActivityLabel(actionType: string): string {
  const map: Record<string, string> = {
    project_created: 'Project created',
    project_updated: 'Project updated',
    issue_created: 'Issue created',
    issue_updated: 'Issue updated',
    issue_completed: 'Issue completed',
    issue_assigned: 'Issue assigned',
    comment_added: 'Comment added',
    phase_updated: 'Phase updated',
    phase_completed: 'Phase completed',
    phase_started: 'Phase started',
    phase_approved: 'Phase approved',
    phase_review_requested: 'Review requested',
    phase_changes_requested: 'Changes requested',
    file_uploaded: 'File uploaded',
    client_invited: 'Client invited',
    milestone_completed: 'Milestone completed',
  };
  return map[actionType] || actionType.replace(/_/g, ' ');
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitial(name: string | null | undefined): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* ActivityContent                                                      */
/* ------------------------------------------------------------------ */

export function ActivityContent({ projectIds }: ActivityContentProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const fetchActivity = useCallback(
    async (paginationCursor?: string) => {
      const ids = selectedProjectId ? [selectedProjectId] : projectIds;
      if (ids.length === 0) {
        setEntries([]);
        setHasMore(false);
        setInitialLoading(false);
        return;
      }

      const result = await getCrossProjectActivityFeed(ids, 30, paginationCursor);
      if (result.success && result.data) {
        const data = result.data as {
          items: ActivityEntry[];
          hasMore: boolean;
          nextCursor: string | null;
        };

        if (paginationCursor) {
          // Append, deduplicate using functional setter to avoid stale closure
          setEntries((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const newItems = data.items.filter((item) => !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
        } else {
          setEntries(data.items);
        }
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      } else {
        toast.error('Failed to load activity', { description: result.error });
      }
      setInitialLoading(false);
    },
    [projectIds, selectedProjectId]
  );

  // Initial load
  useEffect(() => {
    setInitialLoading(true);
    setEntries([]);
    setCursor(null);
    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIds, selectedProjectId]);

  const loadMore = () => {
    if (!cursor || isPending) return;
    startTransition(() => {
      fetchActivity(cursor);
    });
  };

  // Collect unique projects for filter dropdown
  const projectMap = new Map<string, string>();
  for (const entry of entries) {
    if (entry.project?.id && entry.project?.name) {
      projectMap.set(entry.project.id, entry.project.name);
    }
  }

  const groupedEntries = groupByDate(entries);

  /* ---- Loading state ---- */
  if (initialLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-3">
            <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-48 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-3 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (entries.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-qualia-500/10 to-qualia-600/5 ring-1 ring-primary/10">
            <Activity className="h-10 w-10 text-primary/60" />
          </div>
          <h3 className="text-xl font-semibold tracking-tight text-foreground">No activity yet</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            Updates and milestones will appear here as your projects progress.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project filter */}
      {projectMap.size > 1 && (
        <div className="flex items-center gap-3">
          <label htmlFor="project-filter" className="sr-only">
            Filter by project
          </label>
          <select
            id="project-filter"
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className={cn(
              'h-9 rounded-lg border border-border/60 bg-card px-3 text-sm text-foreground',
              'transition-colors duration-150',
              'hover:border-border',
              'focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20',
              'cursor-pointer'
            )}
          >
            <option value="">All projects</option>
            {Array.from(projectMap.entries()).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date-grouped entries */}
      {Array.from(groupedEntries.entries()).map(([dateGroup, dateEntries]) => (
        <div key={dateGroup}>
          {/* Date header */}
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {dateGroup}
            </span>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          {/* Entries */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {dateEntries.map((entry, entryIdx) => {
              const content = (
                <div
                  className={cn(
                    'flex items-start gap-3 px-4 py-3.5 transition-colors duration-150',
                    entryIdx < dateEntries.length - 1 && 'border-b border-border',
                    entry.project ? 'cursor-pointer hover:bg-muted/30' : ''
                  )}
                >
                  {/* Actor avatar */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {getInitial(entry.actor?.full_name)}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground">
                      {formatActivityLabel(entry.action_type)}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {entry.project && (
                        <span className="inline-flex items-center rounded-md bg-primary/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {entry.project.name}
                        </span>
                      )}
                      {entry.actor?.full_name && (
                        <span className="text-[11px] text-muted-foreground/60">
                          {entry.actor.full_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span className="shrink-0 pt-0.5 text-[11px] text-muted-foreground/40">
                    {entry.created_at ? formatRelativeTime(entry.created_at) : ''}
                  </span>
                </div>
              );

              if (entry.project) {
                return (
                  <Link key={entry.id} href={`/projects/${entry.project.id}`}>
                    {content}
                  </Link>
                );
              }

              return <div key={entry.id}>{content}</div>;
            })}
          </div>{' '}
          {/* end rounded-2xl card */}
        </div>
      ))}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pb-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isPending}
            className="min-w-[140px] cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
