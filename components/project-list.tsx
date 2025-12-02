'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Folder, LayoutGrid, List, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Project {
  id: string;
  name: string;
  status: string;
  target_date: string | null;
  project_group?: string | null;
  lead?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  issue_stats?: {
    total: number;
    done: number;
  };
  roadmap_progress?: number;
}

interface ProjectListProps {
  projects: Project[];
}

type ViewMode = 'grid' | 'list';

const GROUP_CONFIG: Record<string, { color: string; bgColor: string }> = {
  salman_kuwait: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  tasos_kyriakides: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  other: {
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500/10',
  },
  active: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  demos: {
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-500/10',
  },
  inactive: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  default: {
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500/10',
  },
};

function ProjectCard({ project }: { project: Project }) {
  const groupConfig = GROUP_CONFIG[project.project_group || 'default'] || GROUP_CONFIG['default'];
  const progress =
    project.project_group === 'finished'
      ? 100
      : project.roadmap_progress !== undefined && project.roadmap_progress > 0
        ? project.roadmap_progress
        : project.issue_stats?.total
          ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
          : 0;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="surface group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-secondary/50"
    >
      <div className={cn('flex-shrink-0 rounded-md p-1.5', groupConfig.bgColor)}>
        <Folder className={cn('h-3.5 w-3.5', groupConfig.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
          {project.name}
        </h3>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <div className="h-1 w-16 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              'h-full rounded-full',
              progress >= 70 ? 'bg-emerald-500' : progress >= 30 ? 'bg-amber-500' : 'bg-blue-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span
          className={cn(
            'w-8 text-xs font-medium tabular-nums',
            progress >= 70
              ? 'text-emerald-600 dark:text-emerald-400'
              : progress >= 30
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-blue-600 dark:text-blue-400'
          )}
        >
          {progress}%
        </span>
      </div>
    </Link>
  );
}

export function ProjectList({ projects }: ProjectListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Check if we're showing mixed active groups
  const hasMultipleGroups =
    projects.some((p) => p.project_group === 'salman_kuwait') ||
    projects.some((p) => p.project_group === 'tasos_kyriakides');

  // Sort projects: 100% complete projects go to bottom within each group
  const getProgress = (p: Project) => {
    if (p.project_group === 'finished') return 100;
    if (p.roadmap_progress !== undefined && p.roadmap_progress > 0) return p.roadmap_progress;
    if (p.issue_stats?.total) return Math.round((p.issue_stats.done / p.issue_stats.total) * 100);
    return 0;
  };

  const sortProjects = (projectList: Project[]) => {
    return [...projectList].sort((a, b) => {
      const progressA = getProgress(a);
      const progressB = getProgress(b);
      if (progressA === 100 && progressB !== 100) return 1;
      if (progressB === 100 && progressA !== 100) return -1;
      return progressB - progressA;
    });
  };

  if (projects.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-xl bg-muted p-4">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">No projects found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first project to get started
        </p>
      </div>
    );
  }

  // Group projects by owner for active view
  const salmanProjects = sortProjects(projects.filter((p) => p.project_group === 'salman_kuwait'));
  const tasosProjects = sortProjects(
    projects.filter((p) => p.project_group === 'tasos_kyriakides')
  );
  const otherProjects = sortProjects(
    projects.filter((p) => p.project_group === 'active' || p.project_group === 'other')
  );

  // For non-grouped views (demos, inactive)
  const sortedProjects = sortProjects(projects);

  const totalProjects = projects.length;

  const renderGrid = (projectList: Project[]) => (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
      {projectList.map((project, index) => (
        <div key={project.id} className="slide-in" style={{ animationDelay: `${index * 30}ms` }}>
          <ProjectCard project={project} />
        </div>
      ))}
    </div>
  );

  const renderList = (projectList: Project[]) => (
    <div className="space-y-1.5">
      {projectList.map((project, index) => (
        <div key={project.id} className="slide-in" style={{ animationDelay: `${index * 25}ms` }}>
          <ProjectCard project={project} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Stats Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold tabular-nums text-foreground">
              {totalProjects}
            </span>
            <span className="text-sm text-muted-foreground">projects</span>
          </div>
          {hasMultipleGroups && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-4 text-xs">
                {otherProjects.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    <span className="text-muted-foreground">{otherProjects.length} Active</span>
                  </div>
                )}
                {salmanProjects.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">{salmanProjects.length} Salman</span>
                  </div>
                )}
                {tasosProjects.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">{tasosProjects.length} Tasos</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'rounded-md p-1.5 transition-all duration-200',
              viewMode === 'grid'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'rounded-md p-1.5 transition-all duration-200',
              viewMode === 'list'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content - Grouped in Columns or Flat */}
      {hasMultipleGroups ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Active/Other Projects Column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              <h3 className="text-sm font-medium text-foreground">Active</h3>
              <span className="text-xs text-muted-foreground">({otherProjects.length})</span>
            </div>
            <div className="space-y-1.5">
              {otherProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="slide-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <ProjectCard project={project} />
                </div>
              ))}
              {otherProjects.length === 0 && (
                <div className="surface rounded-lg p-4 text-center text-sm text-muted-foreground">
                  No projects
                </div>
              )}
            </div>
          </div>

          {/* Salman's Projects Column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <h3 className="text-sm font-medium text-foreground">Salman</h3>
              <span className="text-xs text-muted-foreground">({salmanProjects.length})</span>
            </div>
            <div className="space-y-1.5">
              {salmanProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="slide-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <ProjectCard project={project} />
                </div>
              ))}
              {salmanProjects.length === 0 && (
                <div className="surface rounded-lg p-4 text-center text-sm text-muted-foreground">
                  No projects
                </div>
              )}
            </div>
          </div>

          {/* Tasos's Projects Column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <h3 className="text-sm font-medium text-foreground">Tasos</h3>
              <span className="text-xs text-muted-foreground">({tasosProjects.length})</span>
            </div>
            <div className="space-y-1.5">
              {tasosProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="slide-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <ProjectCard project={project} />
                </div>
              ))}
              {tasosProjects.length === 0 && (
                <div className="surface rounded-lg p-4 text-center text-sm text-muted-foreground">
                  No projects
                </div>
              )}
            </div>
          </div>
        </div>
      ) : // Flat list for demos, inactive, etc.
      viewMode === 'grid' ? (
        renderGrid(sortedProjects)
      ) : (
        renderList(sortedProjects)
      )}
    </div>
  );
}
