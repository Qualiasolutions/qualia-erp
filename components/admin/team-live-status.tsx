'use client';

import { useEffect, useState, useCallback } from 'react';
import { Circle, Monitor, Clock, Briefcase, FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ============ TYPES ============

interface TeamMemberStatus {
  profileId: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: string;
  projectName: string | null;
  clockInNote: string | null;
  sessionStartedAt: string | null;
  lastSessionEndedAt: string | null;
}

interface TaskInfo {
  id: string;
  title: string;
  status: string;
  priority: string;
  project?: { name: string } | null;
}

interface MemberWithTasks extends TeamMemberStatus {
  tasks: TaskInfo[];
}

// ============ HELPERS ============

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: 'text-red-600 bg-red-500/10 border-red-500/20',
  High: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  Medium: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
  Low: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
  'No Priority': 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
};

// ============ COMPONENT ============

export function TeamLiveStatus({ workspaceId }: { workspaceId: string }) {
  const [members, setMembers] = useState<MemberWithTasks[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [{ getTeamStatus }, { getTeamTaskDashboard }] = await Promise.all([
        import('@/app/actions/work-sessions'),
        import('@/app/actions/team-dashboard'),
      ]);

      const [statuses, taskData] = await Promise.all([
        getTeamStatus(workspaceId),
        getTeamTaskDashboard(workspaceId),
      ]);

      // Merge tasks into status data
      const tasksByProfile = new Map<string, TaskInfo[]>();
      for (const member of taskData) {
        const activeTasks = member.tasks
          .filter((t: { status: string }) => t.status !== 'Done' && t.status !== 'Canceled')
          .sort((a: { priority: string | null }, b: { priority: string | null }) => {
            const order: Record<string, number> = {
              Urgent: 0,
              High: 1,
              Medium: 2,
              Low: 3,
              'No Priority': 4,
            };
            return (
              (order[a.priority ?? 'No Priority'] ?? 4) - (order[b.priority ?? 'No Priority'] ?? 4)
            );
          });
        tasksByProfile.set(member.profile.id, activeTasks as TaskInfo[]);
      }

      const merged: MemberWithTasks[] = statuses.map((s: TeamMemberStatus) => ({
        ...s,
        tasks: tasksByProfile.get(s.profileId) || [],
      }));

      setMembers(merged);
    } catch (err) {
      console.error('[TeamLiveStatus] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Monitor className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Team Status</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const online = members.filter((m) => m.status === 'online');
  const offline = members.filter((m) => m.status === 'offline');

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Monitor className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Team Status</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            {online.length} online
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-zinc-400/50" />
            {offline.length} offline
          </span>
        </div>
      </div>

      {/* Members */}
      <div className="divide-y divide-border">
        {members.map((member) => {
          const isOnline = member.status === 'online';
          return (
            <div
              key={member.profileId}
              className={cn('px-5 py-4 transition-colors', isOnline && 'bg-primary/[0.02]')}
            >
              {/* Top row: Avatar + name + status */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="size-9">
                    {member.avatarUrl && (
                      <AvatarImage src={member.avatarUrl} alt={member.fullName ?? undefined} />
                    )}
                    <AvatarFallback
                      className={cn(
                        'text-xs font-semibold',
                        isOnline
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted/60 text-muted-foreground/50'
                      )}
                    >
                      {getInitials(member.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 block size-3 rounded-full ring-2 ring-card',
                      isOnline ? 'bg-emerald-500' : 'bg-zinc-400/40'
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {member.fullName ?? 'Unknown'}
                    </span>
                    {isOnline && member.projectName && (
                      <Badge
                        variant="outline"
                        className="h-5 gap-1 border-primary/20 text-[10px] text-primary"
                      >
                        <Briefcase className="size-2.5" />
                        {member.projectName}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {isOnline ? (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        Clocked in{' '}
                        {formatDistanceToNow(new Date(member.sessionStartedAt!), {
                          addSuffix: true,
                        })}
                        {member.clockInNote && (
                          <span className="text-muted-foreground/60"> — {member.clockInNote}</span>
                        )}
                      </span>
                    ) : member.lastSessionEndedAt ? (
                      <span className="text-muted-foreground/60">
                        Last seen{' '}
                        {formatDistanceToNow(new Date(member.lastSessionEndedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">Never clocked in</span>
                    )}
                  </p>
                </div>

                {/* Task count badge */}
                {member.tasks.length > 0 && (
                  <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="size-3" />
                    {member.tasks.length} task{member.tasks.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Tasks list */}
              {member.tasks.length > 0 && (
                <div className="ml-12 mt-2.5 space-y-1">
                  {member.tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-2 text-[12px]">
                      <Circle
                        className={cn(
                          'size-1.5 shrink-0',
                          task.status === 'In Progress'
                            ? 'fill-primary text-primary'
                            : 'fill-muted-foreground/30 text-muted-foreground/30'
                        )}
                      />
                      <span className="truncate text-foreground/80">{task.title}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'ml-auto h-4 shrink-0 px-1.5 text-[9px]',
                          PRIORITY_COLORS[task.priority ?? 'No Priority']
                        )}
                      >
                        {task.priority ?? 'No Priority'}
                      </Badge>
                      {task.project?.name && (
                        <span className="shrink-0 text-[10px] text-muted-foreground/50">
                          {task.project.name}
                        </span>
                      )}
                    </div>
                  ))}
                  {member.tasks.length > 5 && (
                    <p className="pl-3 text-[11px] text-muted-foreground/50">
                      +{member.tasks.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
