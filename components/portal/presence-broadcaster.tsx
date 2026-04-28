'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface PresenceBroadcasterProps {
  workspaceId: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
}

export function PresenceBroadcaster({
  workspaceId,
  userId,
  fullName,
  avatarUrl,
  role,
}: PresenceBroadcasterProps) {
  const pathname = usePathname();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const trackedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence:workspace:${workspaceId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        trackedAtRef.current = Date.now();
        await channel.track({
          user_id: userId,
          full_name: fullName,
          avatar_url: avatarUrl,
          role,
          pathname,
          since: trackedAtRef.current,
        });
      }
    });

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [workspaceId, userId, fullName, avatarUrl, role]);

  // Re-track on route change without re-subscribing — resets the "since" clock
  // so the live panel can show "on this page for 12s" accurately.
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel) return;
    trackedAtRef.current = Date.now();
    void channel.track({
      user_id: userId,
      full_name: fullName,
      avatar_url: avatarUrl,
      role,
      pathname,
      since: trackedAtRef.current,
    });
  }, [pathname, userId, fullName, avatarUrl, role]);

  return null;
}
