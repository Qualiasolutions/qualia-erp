'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getProjectStatusColor } from '@/lib/portal-styles';
import { fadeInClasses, getStaggerDelay } from '@/lib/transitions';
import { Briefcase, ArrowRight } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  project_type: string;
  project_status: string;
  start_date: string | null;
  end_date: string | null;
}

interface ClientProject {
  id: string;
  project_id: string;
  access_level: string | null;
  invited_at: string | null;
  project: Project | Project[];
}

interface PortalProjectsListProps {
  projects: ClientProject[];
  progressMap?: Record<string, number>;
}

export function PortalProjectsList({ projects, progressMap = {} }: PortalProjectsListProps) {
  if (!projects || projects.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          {/* Icon Container */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-qualia-500/10 to-qualia-600/5 ring-1 ring-qualia-500/10">
            <Briefcase className="h-10 w-10 text-qualia-600/60" />
          </div>

          {/* Heading */}
          <h3 className="text-xl font-semibold tracking-tight text-foreground">No projects yet</h3>

          {/* Description */}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
            Your projects will appear here once you&apos;ve been granted access. Contact your
            project manager if you need assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${fadeInClasses}`}>
      {projects.map((clientProject, index) => {
        // Handle Supabase FK array normalization
        const project = Array.isArray(clientProject.project)
          ? clientProject.project[0]
          : clientProject.project;

        if (!project) return null;

        const progress = progressMap[project.id] ?? 0;

        return (
          <Link key={clientProject.id} href={`/portal/${project.id}`}>
            <Card
              style={index < 6 ? getStaggerDelay(index) : undefined}
              className={cn(
                'card-interactive group h-full cursor-pointer',
                'hover:shadow-qualia-600/10',
                index < 6 && 'animate-fade-in-up fill-mode-both'
              )}
            >
              <div className="h-0.5 w-full rounded-t-[inherit] bg-gradient-to-r from-qualia-500/40 via-qualia-600/60 to-qualia-500/20" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-qualia-700">
                    {project.name}
                  </h3>
                  <Badge className={cn('shrink-0', getProjectStatusColor(project.project_status))}>
                    {project.project_status}
                  </Badge>
                </div>
                {project.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground/80">Overall Progress</span>
                    <span className="text-xs font-semibold tabular-nums text-qualia-600">
                      {progress}%
                    </span>
                  </div>
                  <Progress
                    value={progress}
                    className="h-1.5 overflow-hidden rounded-full bg-muted/50"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-qualia-500 to-qualia-600 transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </Progress>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                  <span className="capitalize">
                    {project.project_type?.replace(/_/g, ' ') || 'Project'}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-qualia-600/70 transition-colors duration-200 group-hover:text-qualia-700">
                    View Details{' '}
                    <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
