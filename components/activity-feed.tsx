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
    { icon: typeof FolderPlus; label: string; color: string; bgColor: string; borderColor: string }
> = {
    project_created: {
        icon: FolderPlus,
        label: 'created a project',
        color: 'text-qualia-400',
        bgColor: 'bg-qualia-500/10',
        borderColor: 'border-qualia-500/20',
    },
    project_updated: {
        icon: Edit,
        label: 'updated a project',
        color: 'text-qualia-400',
        bgColor: 'bg-qualia-500/10',
        borderColor: 'border-qualia-500/20',
    },
    issue_created: {
        icon: ListPlus,
        label: 'created an issue',
        color: 'text-neon-green',
        bgColor: 'bg-neon-green/10',
        borderColor: 'border-neon-green/20',
    },
    issue_updated: {
        icon: Edit,
        label: 'updated an issue',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
    },
    issue_completed: {
        icon: CheckCircle,
        label: 'completed an issue',
        color: 'text-neon-green',
        bgColor: 'bg-neon-green/10',
        borderColor: 'border-neon-green/20',
    },
    comment_added: {
        icon: MessageSquarePlus,
        label: 'commented on',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
    },
    team_created: {
        icon: Users,
        label: 'created a team',
        color: 'text-neon-purple',
        bgColor: 'bg-neon-purple/10',
        borderColor: 'border-neon-purple/20',
    },
    member_added: {
        icon: UserPlus,
        label: 'added a member to',
        color: 'text-neon-pink',
        bgColor: 'bg-neon-pink/10',
        borderColor: 'border-neon-pink/20',
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
        <div className="flex items-start gap-3 py-3 px-4 hover:bg-white/[0.03] rounded-xl transition-all duration-300 group">
            <div className={`p-2.5 rounded-xl ${config.bgColor} border ${config.borderColor} ${config.color} transition-all duration-300 group-hover:scale-110`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">{actorName}</span>{' '}
                    {config.label}{' '}
                    {targetLink ? (
                        <Link
                            href={targetLink}
                            className="font-medium text-qualia-400 hover:text-qualia-300 transition-colors"
                        >
                            {targetName}
                        </Link>
                    ) : (
                        <span className="font-medium text-foreground">{targetName}</span>
                    )}
                    {activity.team && activity.type !== 'team_created' && activity.type !== 'member_added' && (
                        <span className="text-muted-foreground/60">
                            {' '}in{' '}
                            <Link
                                href={`/teams/${activity.team.id}`}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {activity.team.name}
                            </Link>
                        </span>
                    )}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                    {formatRelativeTime(activity.created_at)}
                </p>
            </div>
        </div>
    );
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
    if (activities.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
                    <FolderPlus className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Activity will appear here as your team works</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {activities.map((activity, index) => (
                <div
                    key={activity.id}
                    className="animate-slide-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <ActivityItem activity={activity} />
                </div>
            ))}
        </div>
    );
}
