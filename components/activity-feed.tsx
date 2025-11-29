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
} from 'lucide-react';
import type { Activity } from '@/app/actions';

const activityConfig: Record<
    Activity['type'],
    { icon: typeof FolderPlus; label: string; color: string }
> = {
    project_created: {
        icon: FolderPlus,
        label: 'created a project',
        color: 'text-blue-400',
    },
    project_updated: {
        icon: Edit,
        label: 'updated a project',
        color: 'text-blue-400',
    },
    issue_created: {
        icon: ListPlus,
        label: 'created an issue',
        color: 'text-green-400',
    },
    issue_updated: {
        icon: Edit,
        label: 'updated an issue',
        color: 'text-yellow-400',
    },
    issue_completed: {
        icon: CheckCircle,
        label: 'completed an issue',
        color: 'text-emerald-400',
    },
    comment_added: {
        icon: MessageSquarePlus,
        label: 'commented on',
        color: 'text-orange-400',
    },
    team_created: {
        icon: Users,
        label: 'created a team',
        color: 'text-cyan-400',
    },
    member_added: {
        icon: UserPlus,
        label: 'added a member to',
        color: 'text-pink-400',
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

    // Determine the target entity and link
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
    }

    return (
        <div className="flex items-start gap-3 py-3 px-4 hover:bg-[#262626] rounded-lg transition-colors">
            <div className={`p-2 rounded-full bg-[#2C2C2C] ${config.color}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300">
                    <span className="font-medium text-white">{actorName}</span>{' '}
                    {config.label}{' '}
                    {targetLink ? (
                        <Link
                            href={targetLink}
                            className="font-medium text-qualia-400 hover:text-qualia-300 hover:underline"
                        >
                            {targetName}
                        </Link>
                    ) : (
                        <span className="font-medium text-white">{targetName}</span>
                    )}
                    {activity.team && activity.type !== 'team_created' && activity.type !== 'member_added' && (
                        <span className="text-gray-500">
                            {' '}in{' '}
                            <Link
                                href={`/teams/${activity.team.id}`}
                                className="text-gray-400 hover:text-gray-300"
                            >
                                {activity.team.name}
                            </Link>
                        </span>
                    )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                    {formatRelativeTime(activity.created_at)}
                </p>
            </div>
        </div>
    );
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
    if (activities.length === 0) {
        return (
            <div className="text-center text-gray-500 py-10">
                No recent activity
            </div>
        );
    }

    return (
        <div className="divide-y divide-[#2C2C2C]">
            {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
            ))}
        </div>
    );
}
