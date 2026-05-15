'use client';

import useSWR, { mutate } from 'swr';
import { cacheKeys } from './cache-keys';
import { swrConfig, isDocumentVisible, onErrorRetry } from './config';

// ============================================================================
// PORTAL MESSAGING HOOKS
// ============================================================================

/**
 * Hook to fetch message channels for a user.
 * Returns channels with last message preview and unread indicator.
 * Polls every 30s when tab is visible.
 */
export function useMessageChannels(userId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    userId ? cacheKeys.messageChannels(userId) : null,
    async () => {
      const { getMessageChannels } = await import('@/app/actions/portal-messages');
      const result = await getMessageChannels(userId!);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    {
      ...swrConfig,
      refreshInterval: () => (isDocumentVisible() ? 30000 : 0),
      revalidateOnFocus: true,
      dedupingInterval: 10000,
      onErrorRetry,
    }
  );

  return {
    channels: data ?? [],
    error,
    isLoading,
    isValidating,
    revalidate: () => revalidate(),
  };
}

/**
 * Hook to fetch messages for a specific channel (project).
 * Realtime subscription handles live updates, so no polling interval.
 */
export function useChannelMessages(projectId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidateMutate,
  } = useSWR(
    projectId ? cacheKeys.channelMessages(projectId) : null,
    async () => {
      const { getChannelMessages } = await import('@/app/actions/portal-messages');
      const result = await getChannelMessages(projectId!);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    {
      ...swrConfig,
      refreshInterval: 0, // Realtime handles updates
      revalidateOnFocus: true,
      dedupingInterval: 5000,
      onErrorRetry,
    }
  );

  return {
    messages: data?.messages ?? [],
    nextCursor: data?.nextCursor,
    hasMore: data?.hasMore ?? false,
    error,
    isLoading,
    isValidating,
    mutate: revalidateMutate,
  };
}

/**
 * Hook to fetch unread message counts per channel for a user.
 * Polls every 60s when tab is visible.
 */
export function useUnreadMessageCount(userId: string | null) {
  const { data, error, isLoading } = useSWR(
    userId ? cacheKeys.unreadMessageCount(userId) : null,
    async () => {
      const { getUnreadCounts } = await import('@/app/actions/portal-messages');
      const result = await getUnreadCounts(userId!);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    {
      ...swrConfig,
      refreshInterval: () => (isDocumentVisible() ? 60000 : 0),
      revalidateOnFocus: true,
      dedupingInterval: 20000,
      onErrorRetry,
    }
  );

  return {
    counts: data?.counts ?? {},
    total: data?.total ?? 0,
    error,
    isLoading,
  };
}

// ============================================================================
// INVALIDATION
// ============================================================================

/**
 * Invalidate message channels cache
 */
export function invalidateMessageChannels(userId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.messageChannels(userId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.messageChannels(userId));
  }
}

/**
 * Invalidate channel messages cache
 */
export function invalidateChannelMessages(projectId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.channelMessages(projectId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.channelMessages(projectId));
  }
}

/**
 * Invalidate unread message count cache
 */
export function invalidateUnreadMessageCount(userId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.unreadMessageCount(userId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.unreadMessageCount(userId));
  }
}
