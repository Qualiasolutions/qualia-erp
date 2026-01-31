'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/components/workspace-provider';
import { usePresence } from '@/hooks/use-presence';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

// Simplified online indicator for 2-person team
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

  // Count others online (excluding self)
  const othersOnline = onlineUsers.filter((u) => u.id !== currentUser.id).length;

  if (!isConnected) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" title="Connecting...">
        <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                othersOnline > 0 ? 'bg-emerald-500' : 'bg-zinc-500'
              )}
            />
            <span className="text-xs text-muted-foreground">
              {othersOnline > 0 ? 'Team online' : 'Solo'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            {onlineUsers.length} {onlineUsers.length === 1 ? 'person' : 'people'} online
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
