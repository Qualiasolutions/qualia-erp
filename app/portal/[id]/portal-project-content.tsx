'use client';

import { usePortalProjectWithPhases } from '@/lib/swr';
import { PortalRoadmap } from '@/components/portal/portal-roadmap';
import { PortalTabs } from '@/components/portal/portal-tabs';
import { PortalPageHeader } from '@/components/portal/portal-page-header';
import { fadeInClasses } from '@/lib/transitions';

interface PortalProjectContentProps {
  projectId: string;
  userRole: 'client' | 'admin' | 'manager' | 'employee';
  currentUserId: string;
}

export function PortalProjectContent({
  projectId,
  userRole,
  currentUserId,
}: PortalProjectContentProps) {
  const { project, phases, isLoading, isValidating, isError } =
    usePortalProjectWithPhases(projectId);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="h-4 w-96 rounded bg-muted" />
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded bg-muted" />
          <div className="h-9 w-24 animate-pulse rounded bg-muted" />
        </div>

        {/* Roadmap skeleton */}
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !project) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-6 w-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">Failed to load project</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Unable to fetch project details. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${fadeInClasses}`}>
      <PortalPageHeader title={project.name} description={project.description} />

      <PortalTabs projectId={projectId} />

      <PortalRoadmap
        project={project}
        phases={phases}
        userRole={userRole}
        currentUserId={currentUserId}
        isLoading={isLoading}
        isValidating={isValidating}
      />
    </div>
  );
}
