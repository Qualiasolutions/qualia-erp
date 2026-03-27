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
import { getTasks, getProjectTasks, getScheduledTasks } from '@/app/actions/inbox';
import { getProjectPhases } from '@/app/actions/phases';
import { getConversations, getMessages } from '@/app/actions/ai-conversations';
import {
  getProjectAssignments,
  getEmployeeAssignments,
  getAssignmentHistory,
} from '@/app/actions/project-assignments';
import { getTaskAttachments } from '@/app/actions/task-attachments';
import { filterTodaysTasks, filterTodaysMeetings } from '@/lib/schedule-utils';
import type { TeamMemberStatus } from '@/app/actions/work-sessions';

export type { TeamMemberStatus };

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
  scheduledTasks: (date: string) => `scheduled-tasks-${date}`,
  aiConversations: 'ai-conversations',
  aiMessages: (conversationId: string) => `ai-messages-${conversationId}`,
  aiUserContext: (userId: string) => `ai-user-context-${userId}`,
  projectAssignments: (projectId: string) => `/api/assignments/project/${projectId}`,
  employeeAssignments: (employeeId: string) => `/api/assignments/employee/${employeeId}`,
  allAssignments: '/api/assignments/all',
  portalProject: (projectId: string) => `portal-project-${projectId}`,
  portalProjectWithPhases: (projectId: string) => `portal-project-with-phases-${projectId}`,
  portalDashboard: (clientId: string) => `portal-dashboard-${clientId}`,
  clientActionItems: (clientId: string) => ['client-action-items', clientId] as const,
  todaysCheckins: (workspaceId: string) => `todays-checkins-${workspaceId}`,
  checkins: (workspaceId: string, profileId?: string, date?: string) =>
    `checkins-${workspaceId}-${profileId || 'all'}-${date || 'all'}`,
  activeSession: (workspaceId: string) => `active-session-${workspaceId}`,
  todaysSessions: (workspaceId: string) => `todays-sessions-${workspaceId}`,
  sessionsAdmin: (workspaceId: string, profileId?: string, date?: string) =>
    `sessions-admin-${workspaceId}-${profileId || 'all'}-${date || 'all'}`,
  ownerUpdates: (workspaceId: string, unreadOnly?: boolean) =>
    `owner-updates-${workspaceId}-${unreadOnly ? 'unread' : 'all'}`,
  teamDashboard: (workspaceId: string) => `team-dashboard-${workspaceId}`,
  taskAttachments: (taskId: string) => `task-attachments-${taskId}`,
  teamStatus: (wsId: string) => ['team-status', wsId] as const,
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
  demos: ProjectStatsData[];
  building: ProjectStatsData[];
  preProduction: ProjectStatsData[];
  live: ProjectStatsData[];
  done: ProjectStatsData[];
  archived: ProjectStatsData[];
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
    demos: data?.demos || [],
    building: data?.building || [],
    preProduction: data?.preProduction || [],
    live: data?.live || [],
    done: data?.done || [],
    archived: data?.archived || [],
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
  is_pre_production: boolean;
  metadata: { is_partnership?: boolean; partner_name?: string } | null;
  sort_order: number;
  team?: { id: string; full_name: string | null; avatar_url: string | null }[];
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
  const today = new Date().toISOString().split('T')[0];
  if (immediate) {
    mutate(cacheKeys.inboxTasks, undefined, { revalidate: true });
    mutate(cacheKeys.scheduledTasks(today), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.inboxTasks);
    mutate(cacheKeys.scheduledTasks(today));
  }
}

/**
 * Invalidate scheduled tasks cache for a specific date
 */
export function invalidateScheduledTasks(date?: string, immediate = true) {
  const d = date || new Date().toISOString().split('T')[0];
  if (immediate) {
    mutate(cacheKeys.scheduledTasks(d), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.scheduledTasks(d));
  }
}

/**
 * Hook to fetch all scheduled tasks (tasks with scheduled_start_time/end_time)
 * Used by schedule page to show tasks alongside meetings
 */
export function useScheduledTasks(initialData?: Awaited<ReturnType<typeof getScheduledTasks>>) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    cacheKeys.scheduledTasks(new Date().toISOString().split('T')[0]),
    () => getScheduledTasks(),
    {
      ...autoRefreshConfig,
      fallbackData: initialData,
    }
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
  } else {
    mutate(cacheKeys.meetings);
    mutate(cacheKeys.todaysMeetings);
    mutate('daily-flow');
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

// ============ AI CONVERSATION HOOKS ============

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

// ============ AI USER CONTEXT HOOKS ============

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

// ============ ASSIGNMENT HOOKS ============

/**
 * Hook to fetch project assignments with auto-refresh
 */
export function useProjectAssignments(projectId: string | undefined) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    projectId ? cacheKeys.projectAssignments(projectId) : null,
    async () => {
      if (!projectId) return null;
      const result = await getProjectAssignments(projectId);
      return result.success ? result.data : null;
    },
    autoRefreshConfig
  );

  return {
    data: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch employee assignments with auto-refresh
 */
export function useEmployeeAssignments(employeeId: string | undefined) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    employeeId ? cacheKeys.employeeAssignments(employeeId) : null,
    async () => {
      if (!employeeId) return null;
      const result = await getEmployeeAssignments(employeeId);
      return result.success ? result.data : null;
    },
    autoRefreshConfig
  );

  return {
    data: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch all assignments with auto-refresh
 */
export function useAllAssignments() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    cacheKeys.allAssignments,
    async () => {
      const result = await getAssignmentHistory();
      return result.success ? result.data : null;
    },
    autoRefreshConfig
  );

  return {
    data: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate project assignments cache
 */
export function invalidateProjectAssignments(projectId: string, immediate = false) {
  if (immediate) {
    mutate(cacheKeys.projectAssignments(projectId), undefined, { revalidate: true });
    mutate(cacheKeys.allAssignments, undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.projectAssignments(projectId));
    mutate(cacheKeys.allAssignments);
  }
}

/**
 * Invalidate employee assignments cache
 */
export function invalidateEmployeeAssignments(employeeId: string, immediate = false) {
  if (immediate) {
    mutate(cacheKeys.employeeAssignments(employeeId), undefined, { revalidate: true });
    mutate(cacheKeys.allAssignments, undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.employeeAssignments(employeeId));
    mutate(cacheKeys.allAssignments);
  }
}

/**
 * Invalidate all assignments cache
 */
export function invalidateAllAssignments(immediate = false) {
  if (immediate) {
    mutate(cacheKeys.allAssignments, undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.allAssignments);
  }
}

/**
 * Hook for portal project data with auto-refresh
 * Used by client portal pages to show current project status
 */
export function usePortalProject(projectId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    projectId ? cacheKeys.portalProject(projectId) : null,
    async () => {
      if (!projectId) return null;
      const { getClientDashboardProjects } = await import('@/app/actions/client-portal');
      // Get current user's projects and find the matching one
      // This hook is called from portal pages where user is authenticated
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const result = await getClientDashboardProjects(user.id);
      if (!result.success || !result.data) return null;
      return (
        (result.data as Array<{ id: string; [key: string]: unknown }>).find(
          (p) => p.id === projectId
        ) || null
      );
    },
    autoRefreshConfig
  );

  return {
    project: data || null,
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate portal project cache
 */
export function invalidatePortalProject(projectId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.portalProject(projectId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.portalProject(projectId));
  }
}

/**
 * Hook for portal project with phases data and auto-refresh
 * Used by portal project pages to show current project + roadmap with real-time updates
 * Fetches both project details and phases in a single combined hook
 */
export function usePortalProjectWithPhases(projectId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    projectId ? cacheKeys.portalProjectWithPhases(projectId) : null,
    async () => {
      if (!projectId) return null;

      const supabase = (await import('@/lib/supabase/client')).createClient();

      // Verify user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Fetch project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, project_status:status, description')
        .eq('id', projectId)
        .single();

      if (projectError || !project) return null;

      // Fetch phases with their items (deliverables)
      const { data: phases, error: phasesError } = await supabase
        .from('project_phases')
        .select(
          `
          id, name, status, description, sort_order, completed_at,
          items:phase_items(id, title, description, display_order, is_completed, completed_at, status)
        `
        )
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (phasesError) {
        return { project, phases: [] };
      }

      // Sort items within each phase by display_order
      const phasesWithSortedItems = (phases || []).map((phase) => ({
        ...phase,
        order_index: phase.sort_order,
        start_date: null,
        target_date: null,
        items: Array.isArray(phase.items)
          ? [...phase.items].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
          : [],
      }));

      return {
        project,
        phases: phasesWithSortedItems,
      };
    },
    autoRefreshConfig
  );

  return {
    project: data?.project || null,
    phases: data?.phases || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate portal project with phases cache
 */
export function invalidatePortalProjectWithPhases(projectId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.portalProjectWithPhases(projectId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.portalProjectWithPhases(projectId));
  }
}

/**
 * Hook for portal dashboard data with auto-refresh
 * Fetches stats (project count, pending requests, unpaid invoices) and projects with phases
 * Used by portal dashboard to show real-time updates
 */
export function usePortalDashboard(clientId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    clientId ? cacheKeys.portalDashboard(clientId) : null,
    async () => {
      if (!clientId) return null;

      const { getClientDashboardData, getClientDashboardProjects } =
        await import('@/app/actions/client-portal');

      const [dashResult, projectsResult] = await Promise.all([
        getClientDashboardData(clientId),
        getClientDashboardProjects(clientId),
      ]);

      return {
        stats: dashResult.success ? dashResult.data : null,
        projects: projectsResult.success ? projectsResult.data : [],
      };
    },
    {
      ...autoRefreshConfig,
      revalidateOnMount: true,
    }
  );

  return {
    data: data || { stats: null, projects: [] },
    stats: data?.stats || null,
    projects: data?.projects || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate portal dashboard cache
 */
export function invalidatePortalDashboard(clientId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.portalDashboard(clientId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.portalDashboard(clientId));
  }
}

// ============================================================================
// CLIENT ACTION ITEMS HOOKS
// ============================================================================

interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  action_type: string;
  due_date: string | null;
  completed_at: string | null;
  project: { id: string; name: string } | null;
}

/**
 * Hook to fetch pending action items for a client.
 * Auto-refreshes every 45s when tab is visible.
 */
export function useClientActionItems(clientId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    clientId ? cacheKeys.clientActionItems(clientId) : null,
    async () => {
      if (!clientId) return [];
      const { getClientActionItems } = await import('@/app/actions/client-portal');
      const result = await getClientActionItems(clientId);
      return result.success ? (result.data as ActionItem[]) : [];
    },
    { ...autoRefreshConfig, revalidateOnMount: true }
  );

  return {
    items: data || [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate client action items cache
 */
export function invalidateClientActionItems(clientId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.clientActionItems(clientId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.clientActionItems(clientId));
  }
}

// ============================================================================
// DAILY CHECK-IN HOOKS
// ============================================================================

/**
 * Invalidate check-ins cache (admin view)
 */
export function invalidateCheckins(
  workspaceId: string,
  profileId?: string,
  date?: string,
  immediate = true
) {
  const key = cacheKeys.checkins(workspaceId, profileId, date);
  if (immediate) {
    mutate(key, undefined, { revalidate: true });
    mutate(cacheKeys.todaysCheckins(workspaceId), undefined, { revalidate: true });
  } else {
    mutate(key);
    mutate(cacheKeys.todaysCheckins(workspaceId));
  }
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
// TEAM DASHBOARD HOOKS
// ============================================================================

/**
 * Hook to fetch team task dashboard data.
 * Admins see all team members with their active tasks.
 * Employees see only their own tasks.
 */
export function useTeamTaskDashboard(workspaceId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    workspaceId ? cacheKeys.teamDashboard(workspaceId) : null,
    async () => {
      if (!workspaceId) return [];
      const { getTeamTaskDashboard } = await import('@/app/actions/team-dashboard');
      return getTeamTaskDashboard(workspaceId);
    },
    autoRefreshConfig
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

/**
 * Invalidate team dashboard cache
 */
export function invalidateTeamDashboard(workspaceId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.teamDashboard(workspaceId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.teamDashboard(workspaceId));
  }
}

// ============================================================================
// WORK SESSION HOOKS
// ============================================================================

/**
 * Hook to fetch the current user's active (open) work session.
 * Polls every 30s when tab is visible for live clock-in status.
 */
export function useActiveSession(workspaceId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    workspaceId ? cacheKeys.activeSession(workspaceId) : null,
    async () => {
      if (!workspaceId) return null;
      const { getActiveSession } = await import('@/app/actions/work-sessions');
      return getActiveSession(workspaceId);
    },
    { ...autoRefreshConfig, refreshInterval: isDocumentVisible() ? 30_000 : 0 }
  );

  return {
    session: data ?? null,
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch today's work sessions for the current user.
 * Includes both open and closed sessions, ordered by start time.
 */
export function useTodaysSessions(workspaceId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    workspaceId ? cacheKeys.todaysSessions(workspaceId) : null,
    async () => {
      if (!workspaceId) return [];
      const { getTodaysSessions } = await import('@/app/actions/work-sessions');
      return getTodaysSessions(workspaceId);
    },
    autoRefreshConfig
  );

  return {
    sessions: data ?? [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate team status cache (admin live status panel).
 */
export function invalidateTeamStatus(workspaceId: string, immediate = true) {
  const key = cacheKeys.teamStatus(workspaceId);
  if (immediate) mutate(key, undefined, { revalidate: true });
  else mutate(key);
}

/**
 * Invalidate active session cache.
 * Also cascades to team status (clock-in/out affects who is online).
 */
export function invalidateActiveSession(workspaceId: string, immediate = true) {
  const key = cacheKeys.activeSession(workspaceId);
  if (immediate) mutate(key, undefined, { revalidate: true });
  else mutate(key);
  // Cascade: team status reflects active sessions
  invalidateTeamStatus(workspaceId, immediate);
}

/**
 * Invalidate today's sessions cache.
 * Also cascades to team status (closed sessions update offline last-seen time).
 */
export function invalidateTodaysSessions(workspaceId: string, immediate = true) {
  const key = cacheKeys.todaysSessions(workspaceId);
  if (immediate) mutate(key, undefined, { revalidate: true });
  else mutate(key);
  // Cascade: team status reflects recent session end times
  invalidateTeamStatus(workspaceId, immediate);
}

/**
 * Invalidate sessions admin cache
 */
export function invalidateSessionsAdmin(
  workspaceId: string,
  profileId?: string,
  date?: string,
  immediate = true
) {
  const key = cacheKeys.sessionsAdmin(workspaceId, profileId, date);
  if (immediate) mutate(key, undefined, { revalidate: true });
  else mutate(key);
}

/**
 * Hook to fetch live status for all employees in the workspace.
 * Polls every 15s when tab is visible for near-realtime team presence.
 * Admin-only — returns empty array for non-admins.
 */
export function useTeamStatus(workspaceId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    workspaceId ? cacheKeys.teamStatus(workspaceId) : null,
    async () => {
      if (!workspaceId) return [];
      const { getTeamStatus } = await import('@/app/actions/work-sessions');
      return getTeamStatus(workspaceId);
    },
    { ...autoRefreshConfig, refreshInterval: isDocumentVisible() ? 15_000 : 0 }
  );

  return {
    members: data ?? [],
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

// ============ TASK ATTACHMENTS ============

/**
 * Hook to fetch attachments for a task
 */
export function useTaskAttachments(taskId: string | null) {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(
    taskId ? cacheKeys.taskAttachments(taskId) : null,
    () => (taskId ? getTaskAttachments(taskId) : []),
    swrConfig
  );

  return {
    attachments: data || [],
    isLoading,
    isError: !!error,
    revalidate,
  };
}

/**
 * Invalidate task attachments cache
 */
export function invalidateTaskAttachments(taskId: string, immediate = true) {
  const key = cacheKeys.taskAttachments(taskId);
  if (immediate) mutate(key, undefined, { revalidate: true });
  else mutate(key);
}
