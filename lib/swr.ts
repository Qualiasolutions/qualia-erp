'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { getTeams, getProjects, getProfiles, getCurrentWorkspaceId } from '@/app/actions';
import { getTasks, getProjectTasks } from '@/app/actions/inbox';

// Default SWR configuration optimized for performance
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't refetch on window focus (server actions handle this)
  revalidateOnReconnect: true, // Refetch when network reconnects
  dedupingInterval: 60000, // Dedupe requests within 60 seconds (increased from 30s for less API calls)
  errorRetryCount: 3, // Retry failed requests 3 times
  shouldRetryOnError: true,
  keepPreviousData: true, // Show stale data while revalidating for better UX
  focusThrottleInterval: 5000, // Throttle focus revalidation to max once per 5s
};

// Cache keys for SWR
export const cacheKeys = {
  teams: 'teams',
  projects: 'projects',
  profiles: 'profiles',
  workspaceId: 'workspace-id',
  inboxTasks: 'inbox-tasks',
  projectTasks: (projectId: string) => `project-tasks-${projectId}`,
} as const;

// Check if document is visible (for tab visibility)
const isDocumentVisible = () => {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
};

// Exponential backoff for error retries (reduces API hammering on failures)
const onErrorRetry = (
  error: Error,
  key: string,
  config: SWRConfiguration,
  revalidate: (opts?: { retryCount?: number }) => void,
  { retryCount }: { retryCount: number }
) => {
  // Don't retry on 4xx errors
  if (
    (error as Error & { status?: number }).status &&
    (error as Error & { status?: number }).status! >= 400 &&
    (error as Error & { status?: number }).status! < 500
  )
    return;

  // Only retry up to 3 times
  if (retryCount >= 3) return;

  // Exponential backoff: 1s, 2s, 4s
  const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
  setTimeout(() => revalidate({ retryCount }), delay);
};

// SWR config with auto-refresh for real-time task updates
// Stops refreshing when tab is hidden to save resources
// Increased polling interval from 10s to 30s to reduce API calls
const autoRefreshConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateOnFocus: true,
  refreshInterval: () => (isDocumentVisible() ? 30000 : 0), // 30s refresh when visible, stop when hidden
  dedupingInterval: 15000, // 15s dedup for tasks (was 8s)
  onErrorRetry, // Use exponential backoff
};

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
  } = useSWR(cacheKeys.teams, () => getTeams(), swrConfig);

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
 * Hook to fetch projects with caching
 * Useful for dropdowns and selects that appear multiple times
 */
export function useProjects() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(cacheKeys.projects, () => getProjects(), swrConfig);

  return {
    projects: data || [],
    isLoading,
    isValidating,
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
  } = useSWR(cacheKeys.profiles, () => getProfiles(), swrConfig);

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
  key: 'teams' | 'projects' | 'profiles' | 'workspaceId' | 'inboxTasks'
) {
  if (key === 'inboxTasks') {
    mutate(cacheKeys.inboxTasks);
  } else {
    mutate(cacheKeys[key]);
  }
}

/**
 * Hook to fetch inbox tasks with auto-refresh
 * Only fetches tasks where show_in_inbox = true
 */
export function useInboxTasks() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(cacheKeys.inboxTasks, () => getTasks(null, { inboxOnly: true }), autoRefreshConfig);

  return {
    tasks: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch project tasks with auto-refresh
 * Returns all tasks for a specific project (regardless of show_in_inbox)
 */
export function useProjectTasks(projectId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    projectId ? cacheKeys.projectTasks(projectId) : null,
    () => (projectId ? getProjectTasks(projectId) : Promise.resolve([])),
    autoRefreshConfig
  );

  return {
    tasks: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate project tasks cache
 * @param immediate - If true, forces immediate refetch (fixes 8-10s stale data issue)
 */
export function invalidateProjectTasks(projectId: string, immediate = true) {
  if (immediate) {
    // Force immediate refetch by passing undefined data and revalidate option
    mutate(cacheKeys.projectTasks(projectId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.projectTasks(projectId));
  }
}

/**
 * Invalidate inbox tasks cache
 * @param immediate - If true, forces immediate refetch (fixes 8-10s stale data issue)
 */
export function invalidateInboxTasks(immediate = true) {
  if (immediate) {
    // Force immediate refetch by passing undefined data and revalidate option
    mutate(cacheKeys.inboxTasks, undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.inboxTasks);
  }
}
