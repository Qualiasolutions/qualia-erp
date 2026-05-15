'use client';

import useSWR, { mutate } from 'swr';
import { getConversations, getMessages } from '@/app/actions/ai-conversations';
import { cacheKeys } from './cache-keys';
import { swrConfig, slowRefreshConfig } from './config';

// ============================================================================
// AI CONVERSATION HOOKS
// ============================================================================

/**
 * Hook for AI conversations list
 */
export function useConversations() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(cacheKeys.aiConversations, () => getConversations(), slowRefreshConfig);

  return {
    conversations: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook for messages in a specific conversation
 */
export function useConversationMessages(conversationId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    conversationId ? cacheKeys.aiMessages(conversationId) : null,
    () => (conversationId ? getMessages(conversationId) : []),
    {
      ...swrConfig,
      revalidateOnFocus: false,
    }
  );

  return {
    messages: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate AI conversation caches
 */
export function invalidateConversations(immediate = true) {
  if (immediate) {
    mutate(cacheKeys.aiConversations, undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.aiConversations);
  }
}

export function invalidateConversationMessages(conversationId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.aiMessages(conversationId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.aiMessages(conversationId));
  }
}

// ============================================================================
// AI USER CONTEXT HOOKS
// ============================================================================

/**
 * Hook to fetch AI user context (admin notes, summaries)
 */
export function useAIUserContext(userId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    userId ? cacheKeys.aiUserContext(userId) : null,
    async () => {
      if (!userId) return null;
      const { getUserAIContext } = await import('@/app/actions/ai-context');
      return getUserAIContext(userId);
    },
    swrConfig
  );

  return {
    context: data || null,
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate AI user context cache
 */
export function invalidateAIUserContext(userId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.aiUserContext(userId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.aiUserContext(userId));
  }
}
