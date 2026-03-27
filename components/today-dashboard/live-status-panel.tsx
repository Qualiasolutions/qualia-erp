'use client';

import { useState, useEffect, memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTeamStatus } from '@/lib/swr';

// ============ TYPES ============

interface LiveStatusPanelProps {
  workspaceId: string;
}

// ============ HELPERS ============

function getInitials(fullName: string | null): string {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function calcElapsed(startedAt: string | null): string {
  if (!startedAt) return '0m';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ============ SUB-COMPONENTS ============

interface DurationTickerProps {
  sessionStartedAt: string;
}

const DurationTicker = memo(function DurationTicker({ sessionStartedAt }: DurationTickerProps) {
  const [elapsed, setElapsed] = useState(() => calcElapsed(sessionStartedAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(calcElapsed(sessionStartedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartedAt]);

  return (
    <span className="text-[10px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
      {elapsed}
    </span>
  );
});

interface MemberRowProps {
  profileId: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: 'online' | 'offline';
  projectName: string | null;
  sessionStartedAt: string | null;
  lastSessionEndedAt: string | null;
  index: number;
}

const MemberRow = memo(function MemberRow({
  fullName,
  avatarUrl,
  status,
  projectName,
  sessionStartedAt,
  lastSessionEndedAt,
  index,
}: MemberRowProps) {
  const isOnline = status === 'online';

  const lastSeen = lastSessionEndedAt
    ? `Last seen ${formatDistanceToNow(new Date(lastSessionEndedAt), { addSuffix: true })}`
    : 'No sessions yet';

  return (
    <div
      className="flex animate-stagger-in items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
      style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="size-7">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? undefined} />}
          <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        {/* Status dot */}
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 block size-2.5 rounded-full ring-2 ring-card',
            isOnline
              ? 'animate-[pulse_3s_ease-in-out_infinite] bg-emerald-500'
              : 'bg-muted-foreground/30'
          )}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{fullName || 'Unknown'}</p>
        {isOnline ? (
          <p className="truncate text-[10px] text-muted-foreground/70">
            {projectName || 'No project'}
          </p>
        ) : (
          <p className="truncate text-[10px] text-muted-foreground/50">{lastSeen}</p>
        )}
      </div>

      {/* Duration / status badge */}
      <div className="shrink-0">
        {isOnline && sessionStartedAt ? (
          <DurationTicker sessionStartedAt={sessionStartedAt} />
        ) : (
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
              'bg-muted/60 text-muted-foreground/50'
            )}
          >
            offline
          </span>
        )}
      </div>
    </div>
  );
});

// ============ SKELETON ============

function StatusSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2.5 px-2 py-2">
          <Skeleton className="size-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-2.5 w-32 rounded" />
          </div>
          <Skeleton className="h-4 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function LiveStatusPanel({ workspaceId }: LiveStatusPanelProps) {
  const { members, isLoading } = useTeamStatus(workspaceId);

  const onlineCount = members.filter((m) => m.status === 'online').length;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
          <Users className="size-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Team Status</h2>
            {onlineCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="block size-1.5 animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-emerald-500" />
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  {onlineCount} online
                </span>
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            {members.length === 0 && !isLoading ? 'No team members' : `${members.length} members`}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 overflow-y-auto">
        {isLoading ? (
          <StatusSkeleton />
        ) : members.length === 0 ? (
          <div className="flex items-center justify-center px-4 py-6">
            <p className="text-xs text-muted-foreground/60">No team members found</p>
          </div>
        ) : (
          <div className="space-y-px p-2">
            {members.map((member, i) => (
              <MemberRow
                key={member.profileId}
                profileId={member.profileId}
                fullName={member.fullName}
                avatarUrl={member.avatarUrl}
                status={member.status}
                projectName={member.projectName}
                sessionStartedAt={member.sessionStartedAt}
                lastSessionEndedAt={member.lastSessionEndedAt}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
