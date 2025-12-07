'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OnlineUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  presence_ref: string;
}

interface OnlineUsersProps {
  workspaceId: string;
  currentUserId: string;
}

export function OnlineUsers({ workspaceId, currentUserId }: OnlineUsersProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const supabase = createClient();

    // Get current user profile
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', currentUserId)
        .single();

      return data;
    };

    // Set up presence channel
    const channel = supabase.channel(`presence:${workspaceId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];

        Object.entries(state).forEach(([key, presences]) => {
          const presence = presences[0] as { user: OnlineUser; presence_ref: string };
          if (presence?.user) {
            users.push({ ...presence.user, presence_ref: key });
          }
        });

        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const profile = await fetchProfile();
          if (profile) {
            await channel.track({ user: profile });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, currentUserId]);

  if (onlineUsers.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 5).map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-card',
                    user.id === currentUserId
                      ? 'bg-qualia-600/30 ring-2 ring-qualia-500/50'
                      : 'bg-muted'
                  )}
                >
                  {user.avatar_url ? (
                    <span
                      className="h-full w-full rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${user.avatar_url})` }}
                    />
                  ) : (
                    <span className="text-xs font-semibold text-foreground">
                      {(user.full_name || 'U')[0].toUpperCase()}
                    </span>
                  )}
                  {/* Online indicator */}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {user.full_name || 'Unknown'}
                  {user.id === currentUserId && ' (you)'}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
          {onlineUsers.length > 5 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-semibold">
                  +{onlineUsers.length - 5}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{onlineUsers.length - 5} more online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{onlineUsers.length} online</span>
      </div>
    </TooltipProvider>
  );
}
