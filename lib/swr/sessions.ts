'use client';

import useSWR, { mutate } from 'swr';
import type { TeamMemberStatus } from '@/app/actions/work-sessions';
import { cacheKeys } from './cache-keys';
import {
  autoRefreshConfig,
  isDocumentVisible,
  swrConfig,
  REFRESH_INTERVAL_DEFAULT,
  REFRESH_INTERVAL_SESSIONS,
} from './config';

export type { TeamMemberStatus };

// ============================================================================
// RETURN TYPE INTERFACES
// ============================================================================

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

// ============================================================================
// PLANNED LOGOUT TIME
// ============================================================================

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
// INVALIDATION
// ============================================================================

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
 * Invalidate planned logout time cache
 */
export function invalidatePlannedLogoutTime(workspaceId: string, immediate = true) {
  const key = cacheKeys.plannedLogout(workspaceId);
  if (immediate) mutate(key, undefined, { revalidate: true });
  else mutate(key);
}
