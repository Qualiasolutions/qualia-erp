'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { getTeams, getProjects, getProfiles, getCurrentWorkspaceId } from '@/app/actions';

// Default SWR configuration optimized for our use case
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't refetch on window focus (server actions handle this)
  revalidateOnReconnect: true, // Refetch when network reconnects
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  errorRetryCount: 3, // Retry failed requests 3 times
  shouldRetryOnError: true,
};

// Cache keys for SWR
export const cacheKeys = {
  teams: 'teams',
  projects: 'projects',
  profiles: 'profiles',
  workspaceId: 'workspace-id',
} as const;

/**
 * Hook to fetch teams with caching
 * Useful for dropdowns and selects that appear multiple times
 */
export function useTeams() {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(cacheKeys.teams, () => getTeams(), {
    ...swrConfig,
    revalidateOnMount: true,
  });

  return {
    teams: data || [],
    isLoading,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch projects with caching
 * Useful for dropdowns and selects that appear multiple times
 */
export function useProjects() {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(cacheKeys.projects, () => getProjects(), {
    ...swrConfig,
    revalidateOnMount: true,
  });

  return {
    projects: data || [],
    isLoading,
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
    mutate: revalidate,
  } = useSWR(cacheKeys.profiles, () => getProfiles(), {
    ...swrConfig,
    revalidateOnMount: true,
  });

  return {
    profiles: data || [],
    isLoading,
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
    mutate: revalidate,
  } = useSWR(cacheKeys.workspaceId, () => getCurrentWorkspaceId(), {
    ...swrConfig,
    revalidateOnMount: true,
  });

  return {
    workspaceId: data,
    isLoading,
    isError: !!error,
    error,
    revalidate,
  };
}

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
export function invalidateCache(key: keyof typeof cacheKeys) {
  mutate(cacheKeys[key]);
}
