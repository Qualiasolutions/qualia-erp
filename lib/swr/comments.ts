'use client';

import useSWR, { mutate } from 'swr';
import { cacheKeys } from './cache-keys';
import { swrConfig } from './config';

// ============================================================================
// REQUEST & PHASE COMMENT HOOKS
// ============================================================================

/**
 * Hook to fetch comments for a feature request.
 * Used by RequestCommentThread for real-time comment display.
 */
export function useRequestComments(requestId: string | null) {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(
    requestId ? cacheKeys.requestComments(requestId) : null,
    async () => {
      const { getRequestComments } = await import('@/app/actions/request-comments');
      const result = await getRequestComments(requestId!);
      return result.success ? (result.data as unknown[]) || [] : [];
    },
    swrConfig
  );

  return {
    comments: (data || []) as Array<{
      id: string;
      request_id: string;
      author_id: string;
      content: string;
      created_at: string;
      author: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        email: string | null;
        role: string | null;
      } | null;
    }>,
    isLoading,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate request comments cache
 */
export function invalidateRequestComments(requestId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.requestComments(requestId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.requestComments(requestId));
  }
}

/**
 * Hook to fetch comments for a project phase.
 * Used by phase comment threads in the portal.
 */
export function usePhaseComments(
  projectId: string | null,
  phaseName: string | null,
  includeInternal = false
) {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(
    projectId && phaseName ? cacheKeys.phaseComments(projectId, phaseName) : null,
    async () => {
      const { getPhaseComments } = await import('@/app/actions/phase-comments');
      const result = await getPhaseComments(projectId!, phaseName!, includeInternal);
      return result.success ? (result.data as unknown[]) || [] : [];
    },
    swrConfig
  );

  return {
    comments: (data || []) as Array<{
      id: string;
      project_id: string;
      phase_name: string;
      author_id: string;
      content: string;
      is_internal: boolean;
      created_at: string;
      author: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        email: string | null;
        role: string | null;
      } | null;
    }>,
    isLoading,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate phase comments cache
 */
export function invalidatePhaseComments(projectId: string, phaseName: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.phaseComments(projectId, phaseName), undefined, {
      revalidate: true,
    });
  } else {
    mutate(cacheKeys.phaseComments(projectId, phaseName));
  }
}
