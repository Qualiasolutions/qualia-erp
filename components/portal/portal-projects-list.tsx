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
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Launched':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Demos':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Delayed':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Archived':
      return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    case 'Canceled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-neutral-100 text-neutral-800 border-neutral-200';
  }
}

export function PortalProjectsList({ projects, progressMap = {} }: PortalProjectsListProps) {
  if (!projects || projects.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
            <svg
              className="h-6 w-6 text-neutral-400"
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
          <h3 className="mt-4 text-sm font-semibold text-neutral-900">No projects assigned</h3>
          <p className="mt-1 text-sm text-neutral-500">Contact your project manager for access.</p>
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
                  <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-qualia-700">
                    {project.name}
                  </h3>
                  <Badge className={cn('shrink-0', getStatusColor(project.project_status))}>
                    {project.project_status}
                  </Badge>
                </div>
                {project.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-600">
                    {project.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Overall Progress</span>
                    <span className="font-medium text-neutral-700">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-qualia-100">
                    <div
                      className="h-full bg-qualia-600 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </Progress>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500">
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
