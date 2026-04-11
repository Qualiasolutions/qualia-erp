'use client';

import Link from 'next/link';
import { usePortalProjectWithPhases } from '@/lib/swr';
import { PortalProjectTabs } from '@/components/portal/portal-project-tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getProjectStatusColor } from '@/lib/portal-styles';
import { fadeInClasses } from '@/lib/transitions';
import { ChevronLeft, AlertCircle } from 'lucide-react';

interface PortalProjectContentProps {
  projectId: string;
  userRole: 'client' | 'admin';
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
          <div className="h-5 w-20 rounded-lg bg-primary/[0.04]" />
          <div className="h-8 w-64 rounded-xl bg-primary/[0.04]" />
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-6 border-b border-border pb-3">
          <div className="h-5 w-20 animate-pulse rounded bg-primary/[0.04]" />
          <div className="h-5 w-20 animate-pulse rounded bg-primary/[0.04]" />
          <div className="h-5 w-16 animate-pulse rounded bg-primary/[0.04]" />
          <div className="h-5 w-20 animate-pulse rounded bg-primary/[0.04]" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-xl bg-primary/[0.04]" />
          <div className="h-48 animate-pulse rounded-xl bg-primary/[0.04]" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !project) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/30" aria-hidden="true" />
          <h3 className="mt-4 text-base font-medium text-foreground">Failed to load project</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Unable to fetch project details. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${fadeInClasses}`}>
      {/* Header with back link, name, status */}
      <header>
        <Link
          href="/portal/projects"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{project.name}</h1>
          <Badge
            className={cn(
              'shrink-0 border px-2 py-0.5 text-xs',
              getProjectStatusColor(project.project_status)
            )}
          >
            {project.project_status}
          </Badge>
        </div>
        {project.description && (
          <p className="mt-1.5 text-sm text-muted-foreground/70">{project.description}</p>
        )}
      </header>

      {/* Tabbed interface */}
      <PortalProjectTabs
        project={project}
        phases={phases}
        userRole={userRole}
        currentUserId={currentUserId}
        isLoading={isLoading}
        isValidating={isValidating}
        projectId={projectId}
      />
    </div>
  );
}
