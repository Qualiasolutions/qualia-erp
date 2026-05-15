'use client';

import useSWR, { mutate } from 'swr';
import { getNotifications, getUnreadNotificationCount } from '@/app/actions/notifications';
import { cacheKeys } from './cache-keys';
import { autoRefreshConfig } from './config';

// ============================================================================
// RETURN TYPE INTERFACES
// ============================================================================

/** Return type for useNotifications hook */
export interface UseNotificationsReturn {
  notifications: Awaited<ReturnType<typeof getNotifications>>;
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  error: Error | undefined;
  revalidate: () => Promise<Awaited<ReturnType<typeof getNotifications>> | undefined>;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to fetch notifications with auto-refresh
 */
export function useNotifications(workspaceId: string | null): UseNotificationsReturn {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    workspaceId ? cacheKeys.notifications(workspaceId) : null,
    () => (workspaceId ? getNotifications(workspaceId) : Promise.resolve([])),
    autoRefreshConfig
  );

  return {
    notifications: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch unread notification count
 */
export function useUnreadNotificationCount(workspaceId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    workspaceId ? cacheKeys.unreadCount(workspaceId) : null,
    () => (workspaceId ? getUnreadNotificationCount(workspaceId) : Promise.resolve(0)),
    autoRefreshConfig
  );

  return {
    count: data || 0,
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

// ============================================================================
// INVALIDATION
// ============================================================================

/**
 * Invalidate notifications cache
 */
export function invalidateNotifications(workspaceId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.notifications(workspaceId), undefined, { revalidate: true });
    mutate(cacheKeys.unreadCount(workspaceId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.notifications(workspaceId));
    mutate(cacheKeys.unreadCount(workspaceId));
  }
}
