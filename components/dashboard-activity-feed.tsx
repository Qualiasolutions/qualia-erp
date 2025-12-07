'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Inbox } from 'lucide-react';
import type { Activity } from '@/app/actions';
import { getActivityConfig } from '@/lib/constants/activity-config';

function formatRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'recently';
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ActivityItem({ activity, index }: { activity: Activity; index: number }) {
  const config = getActivityConfig(activity.type);
  const Icon = config.icon;
  // Generate ring color from bgColor for dashboard styling
  const ringColor = config.bgColor.replace('/10', '/20');

  const actorName = activity.actor?.full_name || activity.actor?.email?.split('@')[0] || 'Someone';

  let targetName = '';
  let targetLink = '';

  if (activity.type === 'project_created' || activity.type === 'project_updated') {
    targetName = activity.project?.name || (activity.metadata?.name as string) || 'a project';
    targetLink = activity.project ? `/projects/${activity.project.id}` : '';
  } else if (
    activity.type === 'issue_created' ||
    activity.type === 'issue_updated' ||
    activity.type === 'issue_completed'
  ) {
    targetName = activity.issue?.title || (activity.metadata?.title as string) || 'a task';
    targetLink = '';
  } else if (activity.type === 'comment_added') {
    targetName = activity.issue?.title || (activity.metadata?.issue_title as string) || 'a task';
    targetLink = '';
  } else if (activity.type === 'meeting_created') {
    targetName = activity.meeting?.title || (activity.metadata?.title as string) || 'a meeting';
    targetLink = '/schedule';
  }

  return (
    <div
      className="group relative flex items-start gap-4 rounded-xl p-3 transition-colors hover:bg-secondary/30"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bgColor} ring-2 ${ringColor} font-medium ${config.color} text-sm`}
        >
          {getInitials(actorName)}
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full ${config.bgColor} ring-2 ring-card`}
        >
          <Icon className={`h-3 w-3 ${config.color}`} />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed">
          <span className="font-semibold text-foreground">{actorName}</span>{' '}
          <span className="text-muted-foreground">{config.label}</span>{' '}
          {targetLink ? (
            <Link
              href={targetLink}
              className="font-medium text-primary transition-colors hover:underline"
            >
              {targetName}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{targetName}</span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatRelativeTime(activity.created_at)}
        </p>
      </div>
    </div>
  );
}

export function DashboardActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-display text-lg font-bold text-foreground">No recent activity</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Activity will appear here as your team works on projects and tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-1">
      {/* Timeline connector line */}
      <div className="timeline-line" />

      {activities.map((activity, index) => (
        <div
          key={activity.id}
          className="reveal-stagger"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <ActivityItem activity={activity} index={index} />
        </div>
      ))}
    </div>
  );
}
