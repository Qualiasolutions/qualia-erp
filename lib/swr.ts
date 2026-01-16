'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import {
  getTeams,
  getProjects,
  getProfiles,
  getCurrentWorkspaceId,
  getMeetings,
  getNotifications,
  getUnreadNotificationCount,
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
  projectStats: 'project-stats',
  profiles: 'profiles',
  workspaceId: 'workspace-id',
  inboxTasks: 'inbox-tasks',
  projectTasks: (projectId: string) => `project-tasks-${projectId}`,
  todaysTasks: 'todays-tasks',
  todaysMeetings: 'todays-meetings',
  projectPhases: (projectId: string) => `project-phases-${projectId}`,
  meetings: 'all-meetings',
  notifications: (workspaceId: string) => `notifications-${workspaceId}`,
  unreadCount: (workspaceId: string) => `unread-count-${workspaceId}`,
  provisioningStatus: (projectId: string) => `provisioning-${projectId}`,
  projectDeployments: (projectId: string) => `project-deployments-${projectId}`,
  projectEnvironments: (projectId: string) => `project-environments-${projectId}`,
  projectHealth: (projectId: string) => `project-health-${projectId}`,
} as const;

// Check if document is visible (for tab visibility)
const isDocumentVisible = () => {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
};

// Exponential backoff for error retries (reduces API hammering on failures)
const onErrorRetry = (
  error: Error,
  _key: string,
  _config: SWRConfiguration,
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
// Optimized: 45s refresh (was 30s) to reduce API calls by 33%
const autoRefreshConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateOnFocus: true,
  refreshInterval: () => (isDocumentVisible() ? 45000 : 0), // 45s refresh when visible, stop when hidden
  dedupingInterval: 20000, // 20s dedup for tasks (was 15s)
  onErrorRetry, // Use exponential backoff
};

// Less frequent refresh for semi-static data (projects, teams, profiles)
const slowRefreshConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateOnFocus: true,
  refreshInterval: () => (isDocumentVisible() ? 90000 : 0), // 90s refresh for less critical data
  dedupingInterval: 45000, // 45s dedup
  onErrorRetry,
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
  } = useSWR(cacheKeys.projects, () => getProjects(), slowRefreshConfig);

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
  key: 'teams' | 'projects' | 'projectStats' | 'profiles' | 'workspaceId' | 'inboxTasks'
) {
  if (key === 'inboxTasks') {
    mutate(cacheKeys.inboxTasks);
  } else {
    mutate(cacheKeys[key]);
  }
}

/**
 * Hook to fetch project stats for /projects page with auto-refresh
 * Returns both active projects and demos separately
 */
export function useProjectStats(initialData?: {
  projects: ProjectStatsData[];
  demos: ProjectStatsData[];
}) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    cacheKeys.projectStats,
    async () => {
      const { getProjectStats } = await import('@/app/actions');
      return getProjectStats();
    },
    {
      ...autoRefreshConfig,
      fallbackData: initialData,
    }
  );

  return {
    projects: data?.projects || [],
    demos: data?.demos || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

// Type for project stats data
export interface ProjectStatsData {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  target_date: string | null;
  project_group: string | null;
  project_type: string | null;
  deployment_platform: string | null;
  client_id: string | null;
  client_name: string | null;
  logo_url: string | null;
  lead: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  issue_stats: {
    total: number;
    done: number;
  };
  roadmap_progress: number;
  metadata: { is_partnership?: boolean; partner_name?: string } | null;
}

/**
 * Invalidate project stats cache (immediate revalidation)
 */
export function invalidateProjectStats(immediate = true) {
  if (immediate) {
    mutate(cacheKeys.projectStats, undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.projectStats);
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

/**
 * Hook to fetch notifications with auto-refresh
 */
export function useNotifications(workspaceId: string | null) {
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

// Fast polling config for provisioning status (2s refresh)
const provisioningRefreshConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateOnFocus: true,
  refreshInterval: () => (isDocumentVisible() ? 2000 : 0), // 2s refresh when visible
  dedupingInterval: 1000, // 1s dedup
  onErrorRetry,
};

/**
 * Hook to fetch project provisioning status with fast polling
 * Used during project creation to show real-time provisioning progress
 */
export function useProvisioningStatus(projectId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    projectId ? cacheKeys.provisioningStatus(projectId) : null,
    async () => {
      if (!projectId) return null;
      const { getProjectProvisioningStatus } = await import('@/app/actions/integrations');
      const result = await getProjectProvisioningStatus(projectId);
      return result.success ? result.data : null;
    },
    provisioningRefreshConfig
  );

  return {
    status: data || null,
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate provisioning status cache
 */
export function invalidateProvisioningStatus(projectId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.provisioningStatus(projectId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.provisioningStatus(projectId));
  }
}

// ============================================================================
// DEPLOYMENT & HEALTH HOOKS
// ============================================================================

/**
 * Hook to fetch project deployments
 */
export function useProjectDeployments(projectId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    projectId ? cacheKeys.projectDeployments(projectId) : null,
    async () => {
      if (!projectId) return [];
      const { getProjectDeployments } = await import('@/app/actions/deployments');
      return getProjectDeployments(projectId);
    },
    autoRefreshConfig
  );

  return {
    deployments: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch project environments
 */
export function useProjectEnvironments(projectId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    projectId ? cacheKeys.projectEnvironments(projectId) : null,
    async () => {
      if (!projectId) return [];
      const { getProjectEnvironments } = await import('@/app/actions/deployments');
      return getProjectEnvironments(projectId);
    },
    slowRefreshConfig // Environments change less frequently
  );

  return {
    environments: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch project health metrics
 */
export function useProjectHealth(projectId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    projectId ? cacheKeys.projectHealth(projectId) : null,
    async () => {
      if (!projectId) return null;
      const { getProjectHealth } = await import('@/app/actions/health');
      return getProjectHealth(projectId);
    },
    slowRefreshConfig
  );

  return {
    health: data || null,
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate deployment caches
 */
export function invalidateDeployments(projectId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.projectDeployments(projectId), undefined, { revalidate: true });
    mutate(cacheKeys.projectEnvironments(projectId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.projectDeployments(projectId));
    mutate(cacheKeys.projectEnvironments(projectId));
  }
}

/**
 * Invalidate project health cache
 */
export function invalidateProjectHealth(projectId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.projectHealth(projectId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.projectHealth(projectId));
  }
}
