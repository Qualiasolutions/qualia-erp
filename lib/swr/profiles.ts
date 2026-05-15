'use client';

import useSWR, { mutate } from 'swr';
import { getTeams } from '@/app/actions/teams';
import { getProfiles } from '@/app/actions/auth';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { cacheKeys } from './cache-keys';
import { swrConfig, slowRefreshConfig } from './config';

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to fetch teams with caching
 * Useful for dropdowns and selects that appear multiple times
 */
export function useTeams() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(cacheKeys.teams, () => getTeams(), slowRefreshConfig);

  return {
    teams: data || [],
    isLoading,
    isValidating, // True when revalidating in background (useful for UI feedback)
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch profiles with caching
 * Useful for user/assignee selects
 */
export function useProfiles() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(cacheKeys.profiles, () => getProfiles(), slowRefreshConfig);

  return {
    profiles: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to get current workspace ID with caching
 */
export function useCurrentWorkspaceId() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(cacheKeys.workspaceId, () => getCurrentWorkspaceId(), swrConfig);

  return {
    workspaceId: data,
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
 * Invalidate all caches (useful after mutations that affect multiple entities)
 */
export function invalidateAllCaches() {
  mutate(cacheKeys.teams);
  mutate(cacheKeys.projects);
  mutate(cacheKeys.profiles);
  mutate(cacheKeys.workspaceId);
}

/**
 * Invalidate specific cache
 */
export function invalidateCache(
  key: 'teams' | 'projects' | 'projectStats' | 'profiles' | 'workspaceId'
) {
  mutate(cacheKeys[key]);
}
