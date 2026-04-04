'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  invalidateInboxTasks,
  invalidateDailyFlow,
  invalidateTeamDashboard,
  invalidateScheduledTasks,
} from '@/lib/swr';

/**
 * Subscribe to Supabase realtime changes on the `tasks` table.
 * When any INSERT/UPDATE/DELETE happens, invalidates all task-related SWR caches
 * so the UI updates instantly across tabs and users.
 */
export function useRealtimeTasks(workspaceId: string | null) {
  useEffect(() => {
    if (!workspaceId) return;

    const supabase = createClient();

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          invalidateInboxTasks(true);
          invalidateDailyFlow(true);
          invalidateTeamDashboard(workspaceId);
          invalidateScheduledTasks(undefined, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);
}
