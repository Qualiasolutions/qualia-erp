'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { invalidateMeetings } from '@/lib/swr';

/**
 * Subscribe to Supabase realtime changes on the `meetings` table.
 * Any INSERT / UPDATE / DELETE invalidates the meetings SWR cache so
 * the schedule view reflects the change without a manual refresh.
 */
export function useRealtimeMeetings() {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('meetings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        invalidateMeetings(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
