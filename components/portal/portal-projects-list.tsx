'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getProjectStatusColor } from '@/lib/portal-styles';
import { fadeInClasses, getStaggerDelay } from '@/lib/transitions';
import { Briefcase } from 'lucide-react';

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
                'group h-full transition-all duration-200',
                'hover:-translate-y-1 hover:shadow-lg hover:shadow-qualia-600/10',
                'cursor-pointer',
                index < 6 && 'animate-fade-in-up fill-mode-both'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-qualia-700">
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
                    <span className="font-medium text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-qualia-100">
                    <div
                      className="h-full bg-qualia-600 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </Progress>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                  <span className="capitalize">
                    {project.project_type?.replace(/_/g, ' ') || 'Project'}
                  </span>
                  <span className="font-medium text-qualia-600 group-hover:text-qualia-700">
                    View Details →
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
