'use client';

import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useState, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  status: 'online' | 'away' | 'busy';
  lastSeen: string;
}

interface UsePresenceProps {
  channelName: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

interface PresenceState {
  [key: string]: PresenceUser[];
}

export function usePresence({ channelName, user }: UsePresenceProps) {
  const supabase = createClient();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const updatePresence = useCallback((state: PresenceState) => {
    const users: PresenceUser[] = [];

    Object.values(state).forEach((presences) => {
      presences.forEach((presence) => {
        // Avoid duplicates
        if (!users.find((u) => u.id === presence.id)) {
          users.push(presence);
        }
      });
    });

    // Sort by name
    users.sort((a, b) => a.name.localeCompare(b.name));
    setOnlineUsers(users);
  }, []);

  useEffect(() => {
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        updatePresence(state);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Track this user's presence
          await channel.track({
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            status: 'online',
            lastSeen: new Date().toISOString(),
          });
        } else {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [channelName, user.id, user.name, user.email, user.avatarUrl, supabase, updatePresence]);

  const setStatus = useCallback(
    async (status: 'online' | 'away' | 'busy') => {
      if (channelRef.current && isConnected) {
        await channelRef.current.track({
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          status,
          lastSeen: new Date().toISOString(),
        });
      }
    },
    [isConnected, user]
  );

  return { onlineUsers, isConnected, setStatus };
}
