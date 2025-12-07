'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRecentActivities, type Activity } from '@/app/actions';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Activity as ActivityIcon, Loader2 } from 'lucide-react';
import { getActivityConfig } from '@/lib/constants/activity-config';

interface ActivityFeedProps {
  workspaceId: string;
}

export function ActivityFeed({ workspaceId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getRecentActivities(20, workspaceId);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
    setIsLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    loadActivities();

    // Refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, [loadActivities]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {activities.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <ActivityIcon className="mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-1 p-2">
          {activities.map((activity, index) => {
            const config = getActivityConfig(activity.type);
            const Icon = config.icon;

            const actorName =
              activity.actor?.full_name || activity.actor?.email?.split('@')[0] || 'Someone';

            let targetName = '';
            let targetLink = '';

            if (activity.issue) {
              targetName = activity.issue.title;
              targetLink = '';
            } else if (activity.project) {
              targetName = activity.project.name;
              targetLink = `/projects/${activity.project.id}`;
            } else if (activity.meeting) {
              targetName = activity.meeting.title;
              targetLink = '/schedule';
            } else if (activity.team) {
              targetName = activity.team.name;
              targetLink = `/teams/${activity.team.id}`;
            }

            return (
              <div
                key={activity.id}
                className={cn(
                  'group flex gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50',
                  'animate-in slide-in-from-right-2'
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    config.bgColor
                  )}
                >
                  <Icon className={cn('h-4 w-4', config.color)} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-tight">
                    <span className="font-medium text-foreground">{actorName}</span>
                    <span className="text-muted-foreground"> {config.label} </span>
                    {targetLink ? (
                      <Link
                        href={targetLink}
                        className="font-medium text-qualia-500 hover:underline"
                      >
                        {targetName}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{targetName}</span>
                    )}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatRelativeTime(new Date(activity.created_at))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
