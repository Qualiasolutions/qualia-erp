'use client';

import useSWR, { mutate } from 'swr';
import { getMeetings } from '@/app/actions/meetings';
import { cacheKeys } from './cache-keys';
import { autoRefreshConfig } from './config';

// Type for meetings with all relations
export type MeetingWithRelations = Awaited<ReturnType<typeof getMeetings>>[number];

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to fetch today's meetings for the team schedule
 */
export function useTodaysMeetings() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    cacheKeys.todaysMeetings,
    async () => {
      const { getTodaysMeetings } = await import('@/app/actions/meetings');
      return getTodaysMeetings();
    },
    autoRefreshConfig
  );

  return {
    meetings: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch all meetings with caching and auto-refresh
 * Used by schedule page for real-time updates
 */
export function useMeetings(initialData?: MeetingWithRelations[]) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(cacheKeys.meetings, () => getMeetings(), {
    ...autoRefreshConfig,
    fallbackData: initialData,
  });

  return {
    meetings: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate meetings cache - call after creating/updating/deleting meetings
 */
export function invalidateMeetings(immediate = true) {
  if (immediate) {
    mutate(cacheKeys.meetings, undefined, { revalidate: true });
    mutate(cacheKeys.todaysMeetings, undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.meetings);
    mutate(cacheKeys.todaysMeetings);
  }
}

// ============================================================================
// SCHEDULE HOOKS
// ============================================================================

/**
 * Invalidate scheduled tasks cache for a specific date
 */
export function invalidateScheduledTasks(date?: string, immediate = true) {
  const d = date || new Date().toISOString().split('T')[0];
  if (immediate) {
    mutate(cacheKeys.scheduledTasks(d), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.scheduledTasks(d));
  }
}

/**
 * Invalidate today's schedule data
 */
export function invalidateTodaysSchedule(immediate = true) {
  if (immediate) {
    mutate(cacheKeys.todaysTasks, undefined, { revalidate: true });
    mutate(cacheKeys.todaysMeetings, undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.todaysTasks);
    mutate(cacheKeys.todaysMeetings);
  }
}
