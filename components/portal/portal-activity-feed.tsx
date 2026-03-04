'use client';

import { type ActivityLogEntry, formatActivityMessage } from '@/lib/activity-utils';
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
} from 'lucide-react';
import { fadeInClasses } from '@/lib/transitions';

interface PortalActivityFeedProps {
  activities: ActivityLogEntry[];
}

function getActivityIcon(actionType: string) {
  switch (actionType) {
    case 'phase_completed':
    case 'phase_approved':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case 'file_uploaded':
      return <FileUp className="h-5 w-5 text-purple-600" />;
    case 'comment_added':
      return <MessageSquare className="h-5 w-5 text-orange-600" />;
    case 'phase_started':
      return <Play className="h-5 w-5 text-blue-600" />;
    case 'client_invited':
      return <UserPlus className="h-5 w-5 text-teal-600" />;
    case 'phase_changes_requested':
      return <AlertCircle className="h-5 w-5 text-amber-600" />;
    case 'phase_review_requested':
      return <Clock className="h-5 w-5 text-indigo-600" />;
    default:
      return <CheckCircle2 className="h-5 w-5 text-muted-foreground" />;
  }
}

function formatDateGroup(dateString: string): string {
  const date = parseISO(dateString);

  if (isToday(date)) {
    return 'Today';
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  return formatDate(date, 'MMMM d, yyyy');
}

function groupActivitiesByDate(activities: ActivityLogEntry[]): Map<string, ActivityLogEntry[]> {
  const grouped = new Map<string, ActivityLogEntry[]>();

  activities.forEach((activity) => {
    if (!activity.created_at) return;

    const dateGroup = formatDateGroup(activity.created_at);
    const existing = grouped.get(dateGroup) || [];
    grouped.set(dateGroup, [...existing, activity]);
  });

  return grouped;
}

export function PortalActivityFeed({ activities }: PortalActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          {/* Icon Container */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-qualia-500/10 to-qualia-600/5 ring-1 ring-qualia-500/10">
            <Clock className="h-10 w-10 text-qualia-600/60" />
          </div>

          {/* Heading */}
          <h3 className="text-xl font-semibold tracking-tight text-foreground">No activity yet</h3>

          {/* Description */}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            Updates and milestones will appear here as your project progresses. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <div className={`space-y-8 ${fadeInClasses}`}>
      {Array.from(groupedActivities.entries()).map(([dateGroup, dateActivities]) => (
        <div key={dateGroup}>
          {/* Date Header */}
          <div className="mb-4 flex items-center gap-3">
            <h3 className="text-sm font-semibold text-foreground">{dateGroup}</h3>
            <div className="h-px flex-1 bg-muted" />
          </div>

          {/* Timeline */}
          <div className="relative space-y-6 pl-6">
            {/* Connecting Line */}
            <div className="absolute left-2.5 top-2 h-[calc(100%-1rem)] w-px bg-muted" />

            {dateActivities.map((activity) => (
              <div key={activity.id} className="relative">
                {/* Icon */}
                <div className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-card">
                  {getActivityIcon(activity.action_type)}
                </div>

                {/* Content */}
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {formatActivityMessage(activity)}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {activity.actor?.full_name && (
                          <>
                            <span>{activity.actor.full_name}</span>
                            <span>•</span>
                          </>
                        )}
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
  );
}
