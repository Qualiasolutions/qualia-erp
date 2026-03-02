'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

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

function getStatusColor(status: string) {
  switch (status) {
    case 'Active':
      return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20';
    case 'Launched':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20';
    case 'Demos':
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20';
    case 'Delayed':
      return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    case 'Archived':
      return 'bg-muted text-muted-foreground border-border';
    case 'Canceled':
      return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function PortalProjectsList({ projects, progressMap = {} }: PortalProjectsListProps) {
  if (!projects || projects.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-6 w-6 text-muted-foreground/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-foreground">No projects assigned</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact your project manager for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((clientProject) => {
        // Handle Supabase FK array normalization
        const project = Array.isArray(clientProject.project)
          ? clientProject.project[0]
          : clientProject.project;

        if (!project) return null;

        const progress = progressMap[project.id] ?? 0;

        return (
          <Link key={clientProject.id} href={`/portal/${project.id}`}>
            <Card
              className={cn(
                'group h-full transition-all duration-200',
                'hover:-translate-y-1 hover:shadow-lg hover:shadow-qualia-600/10',
                'cursor-pointer'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-qualia-700">
                    {project.name}
                  </h3>
                  <Badge className={cn('shrink-0', getStatusColor(project.project_status))}>
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
