'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  invalidateChannelMessages,
  invalidateMessageChannels,
  invalidateUnreadMessageCount,
} from '@/lib/swr';

/**
 * Subscribe to Supabase realtime changes on the `portal_messages` table
 * for a specific project channel. When a new message is inserted,
 * invalidates all messaging-related SWR caches so the UI updates instantly.
 */
export function useRealtimeMessages(projectId: string | null, userId: string | null) {
  useEffect(() => {
    if (!projectId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`portal-messages-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'portal_messages',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          // Invalidate all messaging caches on new message
          invalidateChannelMessages(projectId, true);
          if (userId) {
            invalidateMessageChannels(userId, true);
            invalidateUnreadMessageCount(userId, true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, userId]);
}
