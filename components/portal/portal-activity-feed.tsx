'use client';

import { ActivityLogEntry, formatActivityMessage } from '@/app/actions/activity-feed';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import {
  CheckCircle2,
  FileUp,
  MessageSquare,
  Play,
  UserPlus,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface PortalActivityFeedProps {
  activities: ActivityLogEntry[];
  projectName: string;
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
      return <CheckCircle2 className="h-5 w-5 text-neutral-600" />;
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

  return format(date, 'MMMM d, yyyy');
}

function formatTime(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, 'h:mm a');
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

export function PortalActivityFeed({ activities, projectName }: PortalActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-neutral-100 p-6">
          <MessageSquare className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-neutral-900">No updates yet</h3>
        <p className="mt-2 max-w-sm text-center text-sm text-neutral-600">
          Project activity and updates will appear here as your project progresses.
        </p>
      </div>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <div className="space-y-8">
      {Array.from(groupedActivities.entries()).map(([dateGroup, dateActivities]) => (
        <div key={dateGroup}>
          {/* Date Header */}
          <div className="mb-4 flex items-center gap-3">
            <h3 className="text-sm font-semibold text-neutral-900">{dateGroup}</h3>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          {/* Timeline */}
          <div className="relative space-y-6 pl-6">
            {/* Connecting Line */}
            <div className="absolute left-2.5 top-2 h-[calc(100%-1rem)] w-px bg-neutral-200" />

            {dateActivities.map((activity, index) => (
              <div key={activity.id} className="relative">
                {/* Icon */}
                <div className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-white">
                  {getActivityIcon(activity.action_type)}
                </div>

                {/* Content */}
                <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">
                        {formatActivityMessage(activity)}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
                        {activity.actor?.full_name && (
                          <>
                            <span>{activity.actor.full_name}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{formatTime(activity.created_at!)}</span>
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
