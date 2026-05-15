'use client';

import useSWR, { mutate } from 'swr';
import { getProjects } from '@/app/actions/projects';
import { getProjectPhases } from '@/app/actions/phases';
import {
  getProjectAssignments,
  getEmployeeAssignments,
  getAssignmentHistory,
} from '@/app/actions/project-assignments';
import { cacheKeys } from './cache-keys';
import {
  swrConfig,
  autoRefreshConfig,
  slowRefreshConfig,
  provisioningRefreshConfig,
} from './config';

// ============================================================================
// RETURN TYPE INTERFACES
// ============================================================================

/** Return type for useProjects hook */
export interface UseProjectsReturn {
  projects: Awaited<ReturnType<typeof getProjects>>;
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  error: Error | undefined;
  revalidate: () => Promise<Awaited<ReturnType<typeof getProjects>> | undefined>;
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

// ============================================================================
// HOOKS
// ============================================================================

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

// ============================================================================
// ASSIGNMENT HOOKS
// ============================================================================

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
