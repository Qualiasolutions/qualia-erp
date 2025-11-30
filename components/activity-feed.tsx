'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
    FolderPlus,
    ListPlus,
    MessageSquarePlus,
    Users,
    CheckCircle,
    UserPlus,
    Edit,
    Calendar,
    Inbox,
} from 'lucide-react';
import type { Activity } from '@/app/actions';

const activityConfig: Record<
    Activity['type'],
    { icon: typeof FolderPlus; label: string; color: string; bgColor: string }
> = {
    project_created: {
        icon: FolderPlus,
        label: 'created a project',
        color: 'text-primary',
        bgColor: 'bg-primary/10',
    },
    project_updated: {
        icon: Edit,
        label: 'updated a project',
        color: 'text-primary',
        bgColor: 'bg-primary/10',
    },
    issue_created: {
        icon: ListPlus,
        label: 'created an issue',
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10',
    },
    issue_updated: {
        icon: Edit,
        label: 'updated an issue',
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-500/10',
    },
    issue_completed: {
        icon: CheckCircle,
        label: 'completed an issue',
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10',
    },
    comment_added: {
        icon: MessageSquarePlus,
        label: 'commented on',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-500/10',
    },
    team_created: {
        icon: Users,
        label: 'created a team',
        color: 'text-violet-600 dark:text-violet-400',
        bgColor: 'bg-violet-500/10',
    },
    member_added: {
        icon: UserPlus,
        label: 'added a member to',
        color: 'text-pink-600 dark:text-pink-400',
        bgColor: 'bg-pink-500/10',
    },
    meeting_created: {
        icon: Calendar,
        label: 'scheduled a meeting',
        color: 'text-sky-600 dark:text-sky-400',
        bgColor: 'bg-sky-500/10',
    },
};

function formatRelativeTime(dateString: string): string {
    try {
        return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
        return 'recently';
    }
}

function ActivityItem({ activity }: { activity: Activity }) {
    const config = activityConfig[activity.type];
    const Icon = config.icon;

    const actorName =
        activity.actor?.full_name ||
        activity.actor?.email?.split('@')[0] ||
        'Someone';

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
        targetName = activity.issue?.title || (activity.metadata?.title as string) || 'an issue';
        targetLink = activity.issue ? `/issues/${activity.issue.id}` : '';
    } else if (activity.type === 'comment_added') {
        targetName = activity.issue?.title || (activity.metadata?.issue_title as string) || 'an issue';
        targetLink = activity.issue ? `/issues/${activity.issue.id}` : '';
    } else if (activity.type === 'team_created' || activity.type === 'member_added') {
        targetName = activity.team?.name || (activity.metadata?.name as string) || 'a team';
        targetLink = activity.team ? `/teams/${activity.team.id}` : '';
    } else if (activity.type === 'meeting_created') {
        targetName = activity.meeting?.title || (activity.metadata?.title as string) || 'a meeting';
        targetLink = '/schedule';
    }

    return (
        <div className="flex items-start gap-3 py-2.5 px-3 hover:bg-secondary/50 rounded-lg transition-colors group">
            <div className={`p-2 rounded-lg ${config.bgColor} ${config.color}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">{actorName}</span>{' '}
                    {config.label}{' '}
                    {targetLink ? (
                        <Link
                            href={targetLink}
                            className="font-medium text-primary hover:underline transition-colors"
                        >
                            {targetName}
                        </Link>
                    ) : (
                        <span className="font-medium text-foreground">{targetName}</span>
                    )}
                    {activity.team && activity.type !== 'team_created' && activity.type !== 'member_added' && (
                        <span className="text-muted-foreground">
                            {' '}in{' '}
                            <Link
                                href={`/teams/${activity.team.id}`}
                                className="hover:text-foreground transition-colors"
                            >
                                {activity.team.name}
                            </Link>
                        </span>
                    )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeTime(activity.created_at)}
                </p>
            </div>
        </div>
    );
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
    if (activities.length === 0) {
        return (
            <div className="text-center py-10">
                <div className="inline-flex p-3 rounded-xl bg-muted mb-3">
                    <Inbox className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground font-medium">No recent activity</p>
                <p className="text-xs text-muted-foreground mt-1">Activity will appear here as your team works</p>
            </div>
        );
    }

    return (
        <div className="space-y-0.5">
            {activities.map((activity, index) => (
                <div
                    key={activity.id}
                    className="slide-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                >
                    <ActivityItem activity={activity} />
                </div>
            ))}
        </div>
    );
}
