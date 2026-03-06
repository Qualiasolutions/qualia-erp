'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProjectStatusColor } from '@/lib/portal-styles';

interface ProjectWithPhases {
  id: string;
  name: string;
  status: string;
  project_type: string | null;
  description: string | null;
  progress: number;
  totalPhases: number;
  completedPhases: number;
  currentPhase: { name: string; status: string } | null;
  nextPhase: { name: string } | null;
}

interface PortalRecentActivityProps {
  projects: ProjectWithPhases[];
  isLoading: boolean;
  isValidating: boolean;
}

export function PortalRecentActivity({
  projects,
  isLoading,
  isValidating,
}: PortalRecentActivityProps) {
  if (isLoading) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Project Roadmaps</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-4 h-2 w-full rounded-full" />
                <Skeleton className="mt-3 h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-qualia-600/10">
            <Folder className="h-8 w-8 text-qualia-600/60" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Welcome to your portal</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Your projects and activity will appear here once your team gets started. In the
            meantime, feel free to submit requests or reach out to us.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      {/* Subtle validating indicator */}
      {isValidating && (
        <div className="absolute -top-1 right-0 h-1 w-16 animate-pulse rounded-full bg-qualia-500/50" />
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Project Roadmaps</h2>
        <Link
          href="/portal/projects"
          className="flex items-center gap-1 text-xs font-medium text-qualia-600 hover:text-qualia-700"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/portal/projects/${project.id}`}>
            <Card className="card-interactive h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-foreground">{project.name}</h3>
                  <Badge
                    className={cn('shrink-0 text-[10px]', getProjectStatusColor(project.status))}
                  >
                    {project.status}
                  </Badge>
                </div>

                {/* Progress bar */}
                {project.totalPhases > 0 && (
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {project.completedPhases}/{project.totalPhases} phases
                      </span>
                      <span className="font-medium text-foreground">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-qualia-600 transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Current phase */}
                {project.currentPhase && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-medium text-foreground">{project.currentPhase.name}</span>
                  </div>
                )}
                {project.nextPhase && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Next:</span>
                    <span className="text-muted-foreground">{project.nextPhase.name}</span>
                  </div>
                )}

                {/* No phases */}
                {project.totalPhases === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">Roadmap not yet available</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
