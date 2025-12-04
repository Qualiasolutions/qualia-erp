'use client';

import { useState, useEffect } from 'react';
import { getRecentActivities, getProfiles, type Activity } from '@/app/actions';
import { usePresence } from '@/hooks/use-presence';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Activity as ActivityIcon,
  Users,
  CheckCircle2,
  MessageSquare,
  FolderPlus,
  UserPlus,
  CalendarPlus,
  FileEdit,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

interface UpdatesPanelProps {
  workspaceId: string;
}

const ACTIVITY_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> =
  {
    project_created: { icon: FolderPlus, color: 'text-emerald-500', label: 'created project' },
    project_updated: { icon: FileEdit, color: 'text-blue-500', label: 'updated project' },
    issue_created: { icon: FolderPlus, color: 'text-qualia-500', label: 'created task' },
    issue_updated: { icon: FileEdit, color: 'text-blue-500', label: 'updated task' },
    issue_completed: { icon: CheckCircle2, color: 'text-emerald-500', label: 'completed task' },
    issue_assigned: { icon: UserPlus, color: 'text-purple-500', label: 'assigned task' },
    comment_added: { icon: MessageSquare, color: 'text-amber-500', label: 'commented on' },
    team_created: { icon: Users, color: 'text-indigo-500', label: 'created team' },
    member_added: { icon: UserPlus, color: 'text-purple-500', label: 'added member' },
    meeting_created: { icon: CalendarPlus, color: 'text-pink-500', label: 'scheduled meeting' },
  };

export function UpdatesPanel({ workspaceId }: UpdatesPanelProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null>(null);

  // Load current user for presence
  useEffect(() => {
    async function loadUser() {
      const profiles = await getProfiles();
      // For now, use first profile - in real app, get current user
      if (profiles.length > 0) {
        const user = profiles[0];
        setCurrentUser({
          id: user.id,
          name: user.full_name || user.email || 'User',
          email: user.email || '',
          avatarUrl: user.avatar_url,
        });
      }
    }
    loadUser();
  }, []);

  // Presence hook
  const { onlineUsers, isConnected } = usePresence({
    channelName: `workspace-presence-${workspaceId}`,
    user: currentUser || { id: '', name: '', email: '' },
  });

  // Load activities
  useEffect(() => {
    async function loadActivities() {
      setIsLoading(true);
      const data = await getRecentActivities(15, workspaceId);
      setActivities(data);
      setIsLoading(false);
    }
    loadActivities();

    // Refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  return (
    <div className="flex h-full flex-col">
      {/* Online Users Section */}
      <div className="border-b border-border p-3">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-semibold">Online Now</h2>
          {isConnected && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          )}
        </div>

        {onlineUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No one else online</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {onlineUsers.slice(0, 8).map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 rounded-full bg-secondary/50 px-2 py-1"
              >
                {user.avatarUrl ? (
                  <span
                    className="inline-block h-5 w-5 rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${user.avatarUrl})` }}
                    title={user.name}
                  />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-qualia-600/20">
                    <span className="text-[8px] font-medium text-qualia-500">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  </div>
                )}
                <span className="max-w-[80px] truncate text-xs">{user.name}</span>
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    user.status === 'online'
                      ? 'bg-emerald-500'
                      : user.status === 'away'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  )}
                />
              </div>
            ))}
            {onlineUsers.length > 8 && (
              <span className="px-2 py-1 text-xs text-muted-foreground">
                +{onlineUsers.length - 8} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Activity Feed Section */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <ActivityIcon className="h-4 w-4 text-qualia-500" />
          <h2 className="text-sm font-semibold">Recent Activity</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 rounded-lg bg-secondary/50" />
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <ActivityIcon className="mb-2 h-6 w-6 opacity-50" />
              <p className="text-xs">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {activities.map((activity, index) => {
                const config = ACTIVITY_CONFIG[activity.type] || {
                  icon: ActivityIcon,
                  color: 'text-muted-foreground',
                  label: activity.type,
                };
                const Icon = config.icon;

                const actorName =
                  activity.actor?.full_name || activity.actor?.email?.split('@')[0] || 'Someone';

                let targetName = '';
                let targetLink = '';

                if (activity.issue) {
                  targetName = activity.issue.title;
                  targetLink = ''; // Tasks are shown in modal, no page link
                } else if (activity.project) {
                  targetName = activity.project.name;
                  targetLink = `/projects/${activity.project.id}`;
                } else if (activity.meeting) {
                  targetName = activity.meeting.title;
                  targetLink = '/schedule';
                }

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      'flex items-start gap-2 rounded-lg p-2 transition-colors hover:bg-secondary/30',
                      'slide-in'
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <Icon className={cn('mt-0.5 h-3.5 w-3.5 flex-shrink-0', config.color)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-relaxed">
                        <span className="font-medium">{actorName}</span>
                        <span className="text-muted-foreground"> {config.label} </span>
                        {targetLink ? (
                          <Link
                            href={targetLink}
                            className="font-medium text-qualia-500 hover:underline"
                          >
                            {targetName}
                          </Link>
                        ) : (
                          <span className="font-medium">{targetName}</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatRelativeTime(new Date(activity.created_at))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant Quick Action */}
      <div className="border-t border-border p-3">
        <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-qualia-600/10 px-3 py-2 text-qualia-500 transition-colors hover:bg-qualia-600/20">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Ask AI Assistant</span>
        </button>
      </div>
    </div>
  );
}
