'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import {
  getTeams,
  getProjects,
  getProfiles,
  getCurrentWorkspaceId,
  getMeetings,
} from '@/app/actions';
import { getTasks, getProjectTasks } from '@/app/actions/inbox';
import { getProjectPhases } from '@/app/actions/phases';
import { filterTodaysTasks, filterTodaysMeetings } from '@/lib/schedule-utils';

// Type for meetings with all relations
export type MeetingWithRelations = Awaited<ReturnType<typeof getMeetings>>[number];

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
  todaysTasks: 'todays-tasks',
  todaysMeetings: 'todays-meetings',
  projectPhases: (projectId: string) => `project-phases-${projectId}`,
  meetings: 'all-meetings',
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
 * Hook to fetch custom project phases
 */
export function useProjectPhases(projectId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    projectId ? cacheKeys.projectPhases(projectId) : null,
    () => (projectId ? getProjectPhases(projectId) : Promise.resolve([])),
    swrConfig
  );

  return {
    phases: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate project phases cache
 */
export function invalidateProjectPhases(projectId: string) {
  mutate(cacheKeys.projectPhases(projectId));
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

/**
 * Hook to fetch today's tasks for the team schedule
 * Filters active tasks (Todo, In Progress) due today or overdue
 */
export function useTodaysTasks() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    cacheKeys.todaysTasks,
    async () => {
      const allTasks = await getTasks(null, { status: ['Todo', 'In Progress'] });
      return filterTodaysTasks(allTasks);
    },
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
      const allMeetings = await getMeetings();
      return filterTodaysMeetings(allMeetings);
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

/**
 * Hook for Daily Flow page data (legacy - will be replaced by useTimelineDashboard)
 * Combines meetings, tasks, and focus project with auto-refresh
 */
export function useDailyFlow() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    'daily-flow',
    async () => {
      const { getDailyFlowData } = await import('@/app/actions/daily-flow');
      return getDailyFlowData();
    },
    autoRefreshConfig
  );

  return {
    data: data || null,
    meetings: data?.meetings || [],
    tasks: data?.tasks || [],
    focusProject: data?.focusProject || null,
    teamMembers: data?.teamMembers || [],
    currentUserId: data?.currentUserId || null,
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate daily flow cache
 */
export function invalidateDailyFlow(immediate = true) {
  if (immediate) {
    mutate('daily-flow', undefined, { revalidate: true });
  } else {
    mutate('daily-flow');
  }
}

/**
 * Hook for Timeline Dashboard data
 * Fetches meetings, tasks with phase info, team members, and assignment notifications
 * Auto-refreshes every 30s when tab is visible
 */
export function useTimelineDashboard() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    'timeline-dashboard',
    async () => {
      const { getTimelineDashboardData } = await import('@/app/actions/timeline-dashboard');
      return getTimelineDashboardData();
    },
    autoRefreshConfig
  );

  return {
    data: data || null,
    meetings: data?.meetings || [],
    tasks: data?.tasks || [],
    teamMembers: data?.teamMembers || [],
    currentUserId: data?.currentUserId || null,
    newAssignments: data?.newAssignments || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate timeline dashboard cache
 */
export function invalidateTimeline(immediate = true) {
  if (immediate) {
    mutate('timeline-dashboard', undefined, { revalidate: true });
  } else {
    mutate('timeline-dashboard');
  }
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
    mutate('daily-flow', undefined, { revalidate: true });
    mutate('timeline-dashboard', undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.meetings);
    mutate(cacheKeys.todaysMeetings);
    mutate('daily-flow');
    mutate('timeline-dashboard');
  }
}
