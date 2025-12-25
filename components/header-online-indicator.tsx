'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/components/workspace-provider';
import { usePresence, type PresenceUser } from '@/hooks/use-presence';
import { cn, getInitials } from '@/lib/utils';
import { Circle, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

const statusColors = {
  online: 'bg-emerald-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

function UserAvatar({ user, size = 'sm' }: { user: PresenceUser; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-xs';
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

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
            'flex items-center justify-center rounded-full bg-qualia-500/20 font-medium text-qualia-600 ring-2 ring-background dark:text-qualia-400'
          )}
        >
          {getInitials(user.name)}
        </div>
      )}
      <span
        className={cn(
          dotSize,
          'absolute -bottom-0 -right-0 rounded-full ring-1 ring-background',
          statusColors[user.status]
        )}
      />
    </div>
  );
}

function OnlineIndicatorContent({
  channelName,
  currentUser,
}: {
  channelName: string;
  currentUser: UserInfo;
}) {
  const { onlineUsers, isConnected } = usePresence({
    channelName,
    user: currentUser,
  });

  if (!isConnected) {
    return (
      <button
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted/50"
        title="Connecting to presence..."
      >
        <Circle className="h-2 w-2 animate-pulse fill-yellow-500 text-yellow-500" />
        <span className="text-xs">Connecting...</span>
      </button>
    );
  }

  const displayUsers = onlineUsers.slice(0, 4);
  const remainingCount = onlineUsers.length - 4;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-200 hover:bg-qualia-500/10"
          title={`${onlineUsers.length} online`}
        >
          {/* Online indicator dot */}
          <div className="relative flex items-center">
            <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-500/50" />
          </div>

          {/* Stacked avatars */}
          <div className="flex -space-x-1.5">
            {displayUsers.map((user) => (
              <UserAvatar key={user.id} user={user} size="sm" />
            ))}
            {remainingCount > 0 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground ring-2 ring-background">
                +{remainingCount}
              </div>
            )}
          </div>

          {/* Count */}
          <span className="text-xs tabular-nums text-muted-foreground group-hover:text-foreground">
            {onlineUsers.length}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-3">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-emerald-500/10 p-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <span className="text-sm font-medium">Online Now</span>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {onlineUsers.length} {onlineUsers.length === 1 ? 'user' : 'users'}
            </span>
          </div>

          {/* User list */}
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {onlineUsers.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No one else is online
              </p>
            ) : (
              onlineUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
                >
                  <UserAvatar user={user} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {user.name}
                      {user.id === currentUser.id && (
                        <span className="ml-1 font-normal text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusColors[user.status])} />
                      <span className="text-[10px] capitalize text-muted-foreground">
                        {user.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function HeaderOnlineIndicator() {
  const { currentWorkspace } = useWorkspace();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', authUser.id)
          .single();

        setUser({
          id: authUser.id,
          name: profile?.full_name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          avatarUrl: profile?.avatar_url,
        });
      }

      setIsLoading(false);
    }

    loadUser();
  }, []);

  // Don't render until we have user and workspace
  if (isLoading || !user || !currentWorkspace) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <div className="h-2 w-2 animate-pulse rounded-full bg-muted" />
        <div className="flex -space-x-1.5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-6 w-6 animate-pulse rounded-full bg-muted ring-2 ring-background"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <OnlineIndicatorContent
      channelName={`workspace-presence:${currentWorkspace.id}`}
      currentUser={user}
    />
  );
}
