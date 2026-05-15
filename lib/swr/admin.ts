'use client';

import useSWR, { mutate } from 'swr';
import { cacheKeys } from './cache-keys';
import { autoRefreshConfig, slowRefreshConfig } from './config';

// ============================================================================
// ADMIN HOOKS
// ============================================================================

/**
 * Admin-only hook — snapshot of team members with their open tasks + live
 * clock-in status. Powers the Today page "team on deck" container.
 */
export function useTeamTodaySnapshot() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    'team-today-snapshot',
    async () => {
      const { getTeamTodaySnapshot } = await import('@/app/actions/team-today');
      return getTeamTodaySnapshot();
    },
    slowRefreshConfig
  );

  return {
    members: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

// ============================================================================
// OWNER UPDATES HOOKS
// ============================================================================

/**
 * Hook to fetch owner updates with read status
 */
export function useOwnerUpdates(workspaceId: string | null, unreadOnly = false) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    workspaceId ? cacheKeys.ownerUpdates(workspaceId, unreadOnly) : null,
    async () => {
      if (!workspaceId) return [];
      const { getOwnerUpdates } = await import('@/app/actions/owner-updates');
      return getOwnerUpdates(workspaceId, { unreadOnly });
    },
    autoRefreshConfig
  );

  return {
    updates: data || [],
    unreadCount: (data || []).filter((u) => !u.is_read).length,
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate owner updates cache
 */
export function invalidateOwnerUpdates(workspaceId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.ownerUpdates(workspaceId, false), undefined, { revalidate: true });
    mutate(cacheKeys.ownerUpdates(workspaceId, true), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.ownerUpdates(workspaceId, false));
    mutate(cacheKeys.ownerUpdates(workspaceId, true));
  }
}

// ============================================================================
// DAILY BRIEF
// ============================================================================

import { getDailyBrief } from '@/app/actions/daily-brief';

/**
 * Hook for the auto-generated daily brief.
 */
export function useDailyBrief(forDate?: string) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(cacheKeys.dailyBrief(forDate), () => getDailyBrief(forDate), autoRefreshConfig);
  return {
    brief: data,
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate the daily brief cache after a tick / add / regenerate.
 */
export function invalidateDailyBrief(immediate = true) {
  if (immediate) {
    mutate(cacheKeys.dailyBrief(), undefined, { revalidate: true });
    mutate(cacheKeys.dailyBriefHistory, undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.dailyBrief());
    mutate(cacheKeys.dailyBriefHistory);
  }
}

// ============================================================================
// MILESTONE & REQUEST HOOKS (Phase 27 — milestone-centric dashboards)
// ============================================================================

export interface MilestoneDue {
  id: string;
  name: string;
  target_date: string | null;
  status: string | null;
  project: { id: string; name: string } | null;
}

/**
 * Hook to fetch milestones (project phases) due this week for the given projects.
 * Polls every 60s when tab is visible.
 */
export function useMilestonesDue(projectIds: string[]) {
  const sortedKey = [...projectIds].sort().join(',');
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    sortedKey ? cacheKeys.milestonesDue(sortedKey) : null,
    async () => {
      const { getMilestonesDueThisWeek } = await import('@/app/actions/phases');
      const result = await getMilestonesDueThisWeek(projectIds);
      return result.success ? (result.data as MilestoneDue[]) : [];
    },
    autoRefreshConfig
  );

  return {
    milestones: data ?? [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch the count of open (non-completed, non-declined) feature requests.
 * Admin sees all; employee sees assigned-project requests.
 */
export function useOpenRequestsCount() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    cacheKeys.openRequestsCount,
    async () => {
      const { getOpenRequestsCount } = await import('@/app/actions/client-requests');
      const result = await getOpenRequestsCount();
      return result.success ? (result.data as number) : 0;
    },
    autoRefreshConfig
  );

  return {
    count: data ?? 0,
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

// ============================================================================
// MY INBOX TASKS (employee dashboard)
// ============================================================================

export type { InboxTask } from '@/app/actions/inbox-tasks';

/**
 * Hook to fetch the current employee's inbox tasks (show_in_inbox = true, not Done/Canceled).
 */
export function useMyInboxTasks(userId: string | undefined) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    userId ? cacheKeys.myInboxTasks(userId) : null,
    async () => {
      if (!userId) return [];
      const { getMyInboxTasks } = await import('@/app/actions/inbox-tasks');
      const result = await getMyInboxTasks(userId);
      return result.success ? (result.data ?? []) : [];
    },
    autoRefreshConfig
  );

  return {
    tasks: data ?? [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate inbox tasks cache for a specific user.
 */
export function invalidateMyInboxTasks(userId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.myInboxTasks(userId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.myInboxTasks(userId));
  }
}
