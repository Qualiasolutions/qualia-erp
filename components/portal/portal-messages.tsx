'use client';

import { useState, useTransition } from 'react';
import { getClientActivityFeed } from '@/app/actions/client-portal';
import { formatActivityMessage, type ActivityLogEntry } from '@/lib/activity-utils';
import { isToday, isYesterday, parseISO } from 'date-fns';
import { formatDate } from '@/lib/utils';
import {
  CheckCircle2,
  FileUp,
  MessageSquare,
  Play,
  UserPlus,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fadeInClasses } from '@/lib/transitions';

interface ActivityWithProject extends ActivityLogEntry {
  project?: { id: string; name: string } | null;
}

interface PortalMessagesProps {
  initialActivities: ActivityWithProject[];
  clientId: string;
  initialHasMore: boolean;
  initialNextCursor: string | null;
}

function getActivityIcon(actionType: string) {
  switch (actionType) {
    case 'phase_completed':
    case 'phase_approved':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'file_uploaded':
      return <FileUp className="h-4 w-4 text-purple-600" />;
    case 'comment_added':
      return <MessageSquare className="h-4 w-4 text-orange-600" />;
    case 'phase_started':
      return <Play className="h-4 w-4 text-blue-600" />;
    case 'client_invited':
      return <UserPlus className="h-4 w-4 text-teal-600" />;
    case 'phase_changes_requested':
      return <AlertCircle className="h-4 w-4 text-amber-600" />;
    case 'phase_review_requested':
      return <Clock className="h-4 w-4 text-indigo-600" />;
    default:
      return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatDateGroup(dateString: string): string {
  const date = parseISO(dateString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return formatDate(date, 'MMMM d, yyyy');
}

function groupByDate(activities: ActivityWithProject[]): Map<string, ActivityWithProject[]> {
  const grouped = new Map<string, ActivityWithProject[]>();
  activities.forEach((activity) => {
    if (!activity.created_at) return;
    const dateGroup = formatDateGroup(activity.created_at);
    const existing = grouped.get(dateGroup) || [];
    grouped.set(dateGroup, [...existing, activity]);
  });
  return grouped;
}

export function PortalMessages({
  initialActivities,
  clientId,
  initialHasMore,
  initialNextCursor,
}: PortalMessagesProps) {
  const [activities, setActivities] = useState<ActivityWithProject[]>(initialActivities);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    if (!cursor || isPending) return;

    startTransition(async () => {
      try {
        const result = await getClientActivityFeed(clientId, 20, cursor);
        if (result.success && result.data) {
          const data = result.data as {
            items: ActivityWithProject[];
            hasMore: boolean;
            nextCursor: string | null;
          };
          const existingIds = new Set(activities.map((a) => a.id));
          const newItems = data.items.filter((item) => !existingIds.has(item.id));
          setActivities((prev) => [...prev, ...newItems]);
          setHasMore(data.hasMore);
          setCursor(data.nextCursor);
        }
      } catch {
        setHasMore(false);
      }
    });
  };

  if (activities.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-qualia-500/10 to-qualia-600/5 ring-1 ring-qualia-500/10">
            <MessageSquare className="h-10 w-10 text-qualia-600/60" />
          </div>
          <h3 className="text-xl font-semibold tracking-tight text-foreground">No updates yet</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            Project updates and milestones will appear here as your projects progress.
          </p>
        </div>
      </div>
    );
  }

  const grouped = groupByDate(activities);

  return (
    <div className="space-y-8">
      <div className={fadeInClasses}>
        {Array.from(grouped.entries()).map(([dateGroup, dateActivities]) => (
          <div key={dateGroup} className="mb-8">
            {/* Date header */}
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground">{dateGroup}</h3>
              <div className="h-px flex-1 bg-muted" />
            </div>

            {/* Timeline */}
            <div className="relative space-y-4 pl-7">
              <div className="absolute left-[9px] top-2 h-[calc(100%-1rem)] w-px bg-border/40 dark:bg-border/30" />

              {dateActivities.map((activity) => (
                <div key={activity.id} className="relative">
                  <div className="absolute -left-7 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-border bg-card shadow-sm dark:border-border/60">
                    {getActivityIcon(activity.action_type)}
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4 transition-all duration-200 ease-premium hover:border-border/60 hover:shadow-elevation-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {formatActivityMessage(activity)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {activity.project && (
                            <Badge variant="outline" className="text-[10px]">
                              {activity.project.name}
                            </Badge>
                          )}
                          {activity.actor?.full_name && <span>{activity.actor.full_name}</span>}
                          <span>{formatDate(activity.created_at!, 'h:mm a')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pb-8">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isPending}
            className="min-w-[140px]"
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
