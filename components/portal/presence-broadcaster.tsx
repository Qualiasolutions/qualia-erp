'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export interface PresenceEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  pathname: string;
  since: number;
}

const PresenceContext = createContext<PresenceEntry[]>([]);

export function usePresence(): PresenceEntry[] {
  return useContext(PresenceContext);
}

interface PresenceProviderProps {
  workspaceId: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  children?: ReactNode;
}

// One channel, one set of listeners — registered BEFORE subscribe(), as
// supabase-realtime requires. Consumers (e.g. LivePresenceWidget) read the
// presence state via usePresence() instead of opening a second channel for
// the same topic, which would hit the cached/subscribed instance and throw
// "cannot add presence callbacks after subscribe()".
export function PresenceProvider({
  workspaceId,
  userId,
  fullName,
  avatarUrl,
  role,
  children,
}: PresenceProviderProps) {
  const pathname = usePathname();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const trackedAtRef = useRef<number>(Date.now());
  const [entries, setEntries] = useState<PresenceEntry[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence:workspace:${workspaceId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    const sync = () => {
      const state = channel.presenceState<PresenceEntry>();
      const latestByUser = new Map<string, PresenceEntry>();
      for (const metas of Object.values(state)) {
        for (const meta of metas) {
          if (!meta.user_id) continue;
          const prev = latestByUser.get(meta.user_id);
          if (!prev || meta.since > prev.since) latestByUser.set(meta.user_id, meta);
        }
      }
      setEntries(
        Array.from(latestByUser.values()).sort((a, b) =>
          (a.full_name || '').localeCompare(b.full_name || '')
        )
      );
    };

    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe(async (status) => {
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
    // pathname intentionally excluded — re-tracking on route change is
    // handled by the dedicated effect below without re-subscribing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return <PresenceContext.Provider value={entries}>{children}</PresenceContext.Provider>;
}
