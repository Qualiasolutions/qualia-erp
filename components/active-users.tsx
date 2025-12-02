'use client';

import { usePresence, type PresenceUser } from '@/hooks/use-presence';
import { cn, getInitials } from '@/lib/utils';
import { Circle, Users } from 'lucide-react';

interface ActiveUsersProps {
  channelName: string;
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  className?: string;
  compact?: boolean;
}

const statusColors = {
  online: 'bg-emerald-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

function UserAvatar({ user, size = 'md' }: { user: PresenceUser; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-xs';
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  return (
    <div className="relative" title={`${user.name} (${user.status})`}>
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.name}
          className={cn(sizeClasses, 'rounded-full object-cover ring-2 ring-background')}
        />
      ) : (
        <div
          className={cn(
            sizeClasses,
            'flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary ring-2 ring-background'
          )}
        >
          {getInitials(user.name)}
        </div>
      )}
      <span
        className={cn(
          dotSize,
          'absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background',
          statusColors[user.status]
        )}
      />
    </div>
  );
}

export function ActiveUsers({
  channelName,
  currentUser,
  className,
  compact = false,
}: ActiveUsersProps) {
  const { onlineUsers, isConnected } = usePresence({
    channelName,
    user: currentUser,
  });

  if (!isConnected) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Circle className="h-2 w-2 animate-pulse" />
        <span className="text-xs">Connecting...</span>
      </div>
    );
  }

  if (compact) {
    // Compact mode: show stacked avatars
    const displayUsers = onlineUsers.slice(0, 5);
    const remainingCount = onlineUsers.length - 5;

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex -space-x-2">
          {displayUsers.map((user) => (
            <UserAvatar key={user.id} user={user} size="sm" />
          ))}
          {remainingCount > 0 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background">
              +{remainingCount}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{onlineUsers.length} online</span>
      </div>
    );
  }

  // Full mode: show list of users
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-emerald-500/10 p-1.5">
            <Users className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <span className="text-xs font-medium text-foreground">Active Now</span>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{onlineUsers.length}</span>
      </div>

      <div className="space-y-1">
        {onlineUsers.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">No one else is online</p>
        ) : (
          onlineUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
            >
              <UserAvatar user={user} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.name}
                  {user.id === currentUser.id && (
                    <span className="ml-1 font-normal text-muted-foreground">(you)</span>
                  )}
                </p>
                <p className="text-[10px] capitalize text-muted-foreground">{user.status}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Skeleton for loading state
export function ActiveUsersSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-2 w-12 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
