'use client';

import useSWR, { mutate } from 'swr';
import { cacheKeys } from './cache-keys';
import { swrConfig, autoRefreshConfig, onErrorRetry } from './config';

// ============================================================================
// PORTAL PROJECT & DASHBOARD HOOKS
// ============================================================================

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
      const { getClientDashboardData, getClientDashboardProjects, getClientUpcomingMeetings } =
        await import('@/app/actions/client-portal/projects');

      const [statsResult, projectsResult, meetingsResult] = await Promise.all([
        getClientDashboardData(clientId),
        getClientDashboardProjects(clientId),
        getClientUpcomingMeetings(clientId),
      ]);

      return {
        stats: statsResult.success ? statsResult.data : null,
        projects: projectsResult.success ? projectsResult.data : [],
        upcomingMeetings: meetingsResult.success ? meetingsResult.data : [],
      };
    },
    {
      ...autoRefreshConfig,
      revalidateOnMount: true,
    }
  );

  return {
    data: data || { stats: null, projects: [], upcomingMeetings: [] },
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
