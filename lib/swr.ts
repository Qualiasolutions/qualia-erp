'use client';

import useSWR, { SWRConfiguration, mutate, type KeyedMutator } from 'swr';
// PH-H4: Direct module imports instead of barrel re-export to reduce bundle size
import { getTeams } from '@/app/actions/teams';
import { getProjects } from '@/app/actions/projects';
import { getProfiles } from '@/app/actions/auth';
import { getCurrentWorkspaceId } from '@/app/actions/workspace';
import { getMeetings } from '@/app/actions/meetings';
import { getNotifications, getUnreadNotificationCount } from '@/app/actions/notifications';
import {
  getTasks,
  getProjectTasks,
  getScheduledTasks,
  getInboxPreview,
  type InboxPreviewResponse,
} from '@/app/actions/inbox';
import { getProjectPhases } from '@/app/actions/phases';
import { getConversations, getMessages } from '@/app/actions/ai-conversations';
import {
  getProjectAssignments,
  getEmployeeAssignments,
  getAssignmentHistory,
} from '@/app/actions/project-assignments';
import { getTaskAttachments } from '@/app/actions/task-attachments';

import type { TeamMemberStatus } from '@/app/actions/work-sessions';

export type { TeamMemberStatus };

// ============================================================================
// POLLING INTERVALS
// ============================================================================
const REFRESH_INTERVAL_DEFAULT = 60_000; // 60s — standard data (tasks, meetings)
const REFRESH_INTERVAL_SLOW = 90_000; // 90s — semi-static data (profiles, teams)
const REFRESH_INTERVAL_FAST = 2_000; // 2s — provisioning status during setup
const REFRESH_INTERVAL_SESSIONS = 30_000; // 30s — work sessions, messaging
const DEDUP_INTERVAL_DEFAULT = 60_000; // 60s — standard dedup
const DEDUP_INTERVAL_TASKS = 20_000; // 20s — tasks need fresher data
const DEDUP_INTERVAL_SLOW = 45_000; // 45s — semi-static data dedup

// Type for meetings with all relations
export type MeetingWithRelations = Awaited<ReturnType<typeof getMeetings>>[number];

// Default SWR configuration optimized for performance
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't refetch on window focus (server actions handle this)
  revalidateOnReconnect: true, // Refetch when network reconnects
  dedupingInterval: DEDUP_INTERVAL_DEFAULT, // Dedupe requests within 60 seconds (increased from 30s for less API calls)
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
  inboxPreview: (limit: number) => ['inbox-preview', limit] as const,
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
  plannedLogout: (wsId: string) => ['planned-logout', wsId] as const,
  messageChannels: (userId: string) => `message-channels-${userId}`,
  channelMessages: (projectId: string) => `channel-messages-${projectId}`,
  unreadMessageCount: (userId: string) => `unread-message-count-${userId}`,
  portalAppConfig: (workspaceId: string, clientId?: string) =>
    `portal-app-config-${workspaceId}-${clientId || 'default'}`,
  portalBranding: (workspaceId: string) => `portal-branding-${workspaceId}`,
  portalSettings: (workspaceId: string) => `portal-settings-${workspaceId}`,
  requestComments: (requestId: string) => `request-comments-${requestId}`,
  phaseComments: (projectId: string, phaseName: string) =>
    `phase-comments-${projectId}-${phaseName}`,
} as const;

// ============================================================================
// RETURN TYPE INTERFACES (for critical hooks)
// ============================================================================

/** Return type for useInboxTasks hook */
export interface UseInboxTasksReturn {
  tasks: Awaited<ReturnType<typeof getTasks>>;
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  error: Error | undefined;
  revalidate: () => Promise<Awaited<ReturnType<typeof getTasks>> | undefined>;
}

/** Return type for useProjects hook */
export interface UseProjectsReturn {
  projects: Awaited<ReturnType<typeof getProjects>>;
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  error: Error | undefined;
  revalidate: () => Promise<Awaited<ReturnType<typeof getProjects>> | undefined>;
}

/** Return type for useDailyFlow hook */
export interface UseDailyFlowReturn {
  data: Awaited<ReturnType<typeof import('@/app/actions/daily-flow').getDailyFlowData>> | null;
  meetings: Awaited<
    ReturnType<typeof import('@/app/actions/daily-flow').getDailyFlowData>
  >['meetings'];
  tasks: Awaited<ReturnType<typeof import('@/app/actions/daily-flow').getDailyFlowData>>['tasks'];
  focusProject: Awaited<
    ReturnType<typeof import('@/app/actions/daily-flow').getDailyFlowData>
  >['focusProject'];
  teamMembers: Awaited<
    ReturnType<typeof import('@/app/actions/daily-flow').getDailyFlowData>
  >['teamMembers'];
  currentUserId: string | null;
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  error: Error | undefined;
  revalidate: () => Promise<unknown>;
}

/** Return type for useActiveSession hook */
export interface UseActiveSessionReturn {
  session: Awaited<
    ReturnType<typeof import('@/app/actions/work-sessions').getActiveSession>
  > | null;
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  error: Error | undefined;
  revalidate: () => Promise<unknown>;
}

/** Return type for useNotifications hook */
export interface UseNotificationsReturn {
  notifications: Awaited<ReturnType<typeof getNotifications>>;
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  error: Error | undefined;
  revalidate: () => Promise<Awaited<ReturnType<typeof getNotifications>> | undefined>;
}

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
  const status = (error as Error & { status?: number }).status;
  if (typeof status === 'number' && status >= 400 && status < 500) return;

  // Only retry up to 3 times
  if (retryCount >= 3) return;

  // Exponential backoff: 1s, 2s, 4s
  const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
  setTimeout(() => revalidate({ retryCount }), delay);
};

// SWR config with auto-refresh for real-time task updates
// Stops refreshing when tab is hidden to save resources
// Optimized: 60s refresh (was 45s) to reduce API calls further
const autoRefreshConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: () => (isDocumentVisible() ? REFRESH_INTERVAL_DEFAULT : 0), // 60s refresh when visible, stop when hidden
  dedupingInterval: DEDUP_INTERVAL_TASKS, // 20s dedup for tasks (was 15s)
  onErrorRetry, // Use exponential backoff
};

// Less frequent refresh for semi-static data (projects, teams, profiles)
const slowRefreshConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: () => (isDocumentVisible() ? REFRESH_INTERVAL_SLOW : 0), // 90s refresh for less critical data
  dedupingInterval: DEDUP_INTERVAL_SLOW, // 45s dedup
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
export function useProjects(): UseProjectsReturn {
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
  has_github?: boolean;
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
export function useInboxTasks(): UseInboxTasksReturn {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    cacheKeys.inboxTasks,
    () => getTasks(null, { inboxOnly: true, status: ['Todo', 'In Progress'] }),
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

export type UseInboxPreviewReturn = {
  data: InboxPreviewResponse;
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  error: unknown;
  revalidate: KeyedMutator<InboxPreviewResponse>;
};

/**
 * H11 (OPTIMIZE.md): lightweight inbox preview hook for the dashboard widget.
 * Only fetches ~20 rows with a tiny projection + two head-only COUNT queries,
 * instead of the full inbox (hundreds of rows × 4 joins) that `useInboxTasks`
 * returns. ~95% bandwidth savings on the home route.
 */
export function useInboxPreview(limit = 5): UseInboxPreviewReturn {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(cacheKeys.inboxPreview(limit), () => getInboxPreview(limit), autoRefreshConfig);

  return {
    data: data || { tasks: [], overdueCount: 0, totalOpen: 0 },
    isLoading,
    isValidating,
    isError: !!error,
    error,
    revalidate,
  };
}

/**
 * Invalidate the inbox preview SWR cache. Pairs with `invalidateInboxTasks`
 * when mutations (complete, delete, hide) affect both the preview and the
 * full view.
 */
export function invalidateInboxPreview(immediate = true) {
  // Use a key-predicate wildcard so every limit variant is invalidated.
  if (immediate) {
    mutate((key) => Array.isArray(key) && key[0] === 'inbox-preview', undefined, {
      revalidate: true,
    });
  } else {
    mutate((key) => Array.isArray(key) && key[0] === 'inbox-preview');
  }
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
      const { getTodaysTasks } = await import('@/app/actions/inbox');
      return getTodaysTasks();
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
      const { getTodaysMeetings } = await import('@/app/actions/meetings');
      return getTodaysMeetings();
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
 * Admin-only hook — snapshot of team members with their open tasks + live
 * clock-in status. Powers the Today page "team on deck" container.
 */
export function useTeamTodaySnapshot() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    'team-today-snapshot',
    async () => {
      const { getTeamTodaySnapshot } = await import('@/app/actions/team-today');
      return getTeamTodaySnapshot();
    },
    slowRefreshConfig
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
export function useDailyFlow(): UseDailyFlowReturn {
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
  refreshInterval: () => (isDocumentVisible() ? REFRESH_INTERVAL_FAST : 0), // 2s refresh when visible
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

      // M21 (OPTIMIZE.md): moved from client-side Supabase queries to a server action.
      // Server action runs with proper auth context and avoids exposing raw DB queries to the client.
      const { getPortalProjectWithPhases } = await import('@/app/actions/phases');
      const result = await getPortalProjectWithPhases(projectId);
      if (!result.success || !result.data) return null;

      const { project, phases } = result.data as {
        project: { id: string; name: string; project_status: string; description: string | null };
        phases: Array<{
          id: string;
          name: string;
          status: string;
          description: string | null;
          sort_order: number;
          completed_at: string | null;
          order_index: number;
          start_date: string | null;
          target_date: string | null;
          items: Array<{
            id: string;
            title: string;
            description: string | null;
            display_order: number | null;
            is_completed: boolean;
            completed_at: string | null;
            status: string | null;
          }>;
        }>;
      };

      return { project, phases };
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

      // NOTE: uses the uncached server actions (not lib/cached-reads.ts wrappers).
      // cached-reads.ts imports createAdminClient which is server-only —
      // importing it into this client-side SWR hook leaks server code into the
      // browser bundle. The server-side initial render DOES use the cached
      // wrappers; SWR client-side revalidation uses the server actions.
      const { getClientDashboardData, getClientDashboardProjects } =
        await import('@/app/actions/client-portal/projects');

      const [statsResult, projectsResult] = await Promise.all([
        getClientDashboardData(clientId),
        getClientDashboardProjects(clientId),
      ]);

      return {
        stats: statsResult.success ? statsResult.data : null,
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
export function useActiveSession(workspaceId: string | null): UseActiveSessionReturn {
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
    {
      ...autoRefreshConfig,
      refreshInterval: () => (isDocumentVisible() ? REFRESH_INTERVAL_DEFAULT : 0),
    }
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
 * Hook to fetch work sessions for a specific employee (admin view).
 * Used by SessionHistoryPanel for drill-down view.
 * Polls every 30s when tab is visible.
 */
export function useSessionsAdmin(
  workspaceId: string | null,
  profileId: string | null,
  date: string | null
) {
  const key =
    workspaceId && profileId && date ? cacheKeys.sessionsAdmin(workspaceId, profileId, date) : null;

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(
    key,
    async () => {
      if (!workspaceId || !profileId || !date) return [];
      const { getSessionsAdmin } = await import('@/app/actions/work-sessions');
      return getSessionsAdmin(workspaceId, { profileId, date });
    },
    {
      ...autoRefreshConfig,
      refreshInterval: () => (isDocumentVisible() ? REFRESH_INTERVAL_SESSIONS : 0),
    }
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
    {
      ...autoRefreshConfig,
      refreshInterval: () => (isDocumentVisible() ? REFRESH_INTERVAL_DEFAULT : 0),
    }
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

// ============ PLANNED LOGOUT TIME ============

/**
 * Hook to fetch the current user's planned logout time.
 * Returns a TIME string like "16:00:00" or null if not set.
 */
export function usePlannedLogoutTime(workspaceId: string | null) {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(
    workspaceId ? cacheKeys.plannedLogout(workspaceId) : null,
    async () => {
      if (!workspaceId) return null;
      const { getPlannedLogoutTime } = await import('@/app/actions/work-sessions');
      return getPlannedLogoutTime(workspaceId);
    },
    swrConfig
  );

  return {
    plannedLogoutTime: data ?? null,
    isLoading,
    isError: !!error,
    revalidate,
  };
}

/**
 * Invalidate planned logout time cache
 */
export function invalidatePlannedLogoutTime(workspaceId: string, immediate = true) {
  const key = cacheKeys.plannedLogout(workspaceId);
  if (immediate) mutate(key, undefined, { revalidate: true });
  else mutate(key);
}

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

// ============================================================================
// PORTAL ADMIN — App Config & Branding
// ============================================================================

/**
 * Hook to fetch portal app config for a workspace, optionally merged with client overrides.
 * No auto-refresh — manually invalidate after updates.
 */
export function usePortalAppConfig(workspaceId: string | null, clientId?: string) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidateMutate,
  } = useSWR(
    workspaceId ? cacheKeys.portalAppConfig(workspaceId, clientId) : null,
    async () => {
      const { getPortalAppConfig } = await import('@/app/actions/portal-admin');
      const result = await getPortalAppConfig(workspaceId!, clientId);
      if (!result.success) throw new Error(result.error);
      return result.data as Record<string, boolean>;
    },
    {
      ...swrConfig,
      refreshInterval: 0,
      onErrorRetry,
    }
  );

  return {
    config: data ?? null,
    error,
    isLoading,
    isValidating,
    mutate: revalidateMutate,
  };
}

/**
 * Hook to fetch portal branding for a workspace.
 * No auto-refresh — manually invalidate after updates.
 */
export function usePortalBranding(workspaceId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidateMutate,
  } = useSWR(
    workspaceId ? cacheKeys.portalBranding(workspaceId) : null,
    async () => {
      const { getPortalBranding } = await import('@/app/actions/portal-admin');
      const result = await getPortalBranding(workspaceId!);
      if (!result.success) throw new Error(result.error);
      return result.data as {
        workspace_id: string;
        company_name: string | null;
        logo_url: string | null;
        accent_color: string | null;
      };
    },
    {
      ...swrConfig,
      refreshInterval: 0,
      onErrorRetry,
    }
  );

  return {
    branding: data ?? null,
    error,
    isLoading,
    isValidating,
    mutate: revalidateMutate,
  };
}

/**
 * Invalidate portal app config cache
 */
export function invalidatePortalAppConfig(
  workspaceId: string,
  clientId?: string,
  immediate = true
) {
  if (immediate) {
    mutate(cacheKeys.portalAppConfig(workspaceId, clientId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.portalAppConfig(workspaceId, clientId));
  }
}

/**
 * Invalidate portal branding cache
 */
export function invalidatePortalBranding(workspaceId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.portalBranding(workspaceId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.portalBranding(workspaceId));
  }
}

/**
 * Invalidate portal settings cache
 */
export function invalidatePortalSettings(workspaceId: string, immediate = true) {
  if (immediate) {
    mutate(cacheKeys.portalSettings(workspaceId), undefined, { revalidate: true });
  } else {
    mutate(cacheKeys.portalSettings(workspaceId));
  }
}

/**
 * Hook to fetch portal settings for a workspace.
 * No auto-refresh — manually invalidate after updates.
 */
export function usePortalSettings(workspaceId: string | null) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidateMutate,
  } = useSWR(
    workspaceId ? cacheKeys.portalSettings(workspaceId) : null,
    async () => {
      const { getPortalSettings } = await import('@/app/actions/portal-admin');
      const result = await getPortalSettings(workspaceId!);
      if (!result.success) throw new Error(result.error);
      return result.data as {
        workspace_id: string;
        require_2fa_for_clients: boolean;
        session_duration_hours: number;
        notification_defaults: {
          task_assigned: boolean;
          task_due_soon: boolean;
          project_update: boolean;
          meeting_reminder: boolean;
          client_activity: boolean;
        };
        custom_domain: string | null;
        cname_target: string;
        domain_verified: boolean;
      };
    },
    {
      ...swrConfig,
      refreshInterval: 0,
      onErrorRetry,
    }
  );

  return {
    settings: data ?? null,
    error,
    isLoading,
    isValidating,
    mutate: revalidateMutate,
  };
}

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
