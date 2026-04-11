'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getProjectStatusColor } from '@/lib/portal-styles';
import { getStaggerDelay } from '@/lib/transitions';
import {
  Search,
  Globe,
  Bot,
  Phone,
  Megaphone,
  Brain,
  Smartphone,
  Folder,
  FolderOpen,
  Beaker,
  Hammer,
  Rocket,
  AlertTriangle,
  CheckCircle2,
  Archive,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const SearchIcon = Search;

interface ProjectShape {
  id: string;
  name: string;
  description?: string | null;
  project_type?: string | null;
  project_status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

interface PortalProjectsGridProps {
  projects: Array<{
    id: string;
    project_id?: string;
    project?: ProjectShape | ProjectShape[] | null;
    project_type?: string | null;
    name?: string;
  }>;
  progressMap: Record<string, number>;
  groupByStatus?: boolean;
}

/** Primary statuses shown as columns */
const PRIMARY_STATUSES = ['Demos', 'Active', 'Launched', 'Delayed'] as const;

/** Secondary statuses shown collapsed below */
const SECONDARY_STATUSES = ['Done', 'Archived', 'Canceled'] as const;

/** Column styling per status */
const STATUS_COLUMN_CONFIG: Record<
  string,
  {
    icon: typeof Beaker;
    color: string;
    bgColor: string;
    badgeColor: string;
    borderColor: string;
  }
> = {
  Demos: {
    icon: Beaker,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    badgeColor: 'bg-violet-500/10 text-violet-500',
    borderColor: 'border-violet-500/20',
  },
  Active: {
    icon: Hammer,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    badgeColor: 'bg-emerald-500/10 text-emerald-500',
    borderColor: 'border-emerald-500/20',
  },
  Launched: {
    icon: Rocket,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    badgeColor: 'bg-sky-500/10 text-sky-500',
    borderColor: 'border-sky-500/20',
  },
  Delayed: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    badgeColor: 'bg-amber-500/10 text-amber-500',
    borderColor: 'border-amber-500/20',
  },
  Done: {
    icon: CheckCircle2,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    badgeColor: 'bg-primary/10 text-primary',
    borderColor: 'border-primary/20',
  },
  Archived: {
    icon: Archive,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    badgeColor: 'bg-muted text-muted-foreground',
    borderColor: 'border-border',
  },
  Canceled: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    badgeColor: 'bg-red-500/10 text-red-500',
    borderColor: 'border-red-500/20',
  },
};

function getProjectTypeIcon(type: string | null | undefined) {
  switch (type) {
    case 'web_design':
      return Globe;
    case 'ai_agent':
      return Bot;
    case 'voice_agent':
      return Phone;
    case 'seo':
      return Search;
    case 'ads':
      return Megaphone;
    case 'ai_platform':
      return Brain;
    case 'app':
      return Smartphone;
    default:
      return Folder;
  }
}

type NormalizedProject = {
  clientProjectId: string;
  projectId: string;
  project: ProjectShape;
};

function ProjectCard({
  clientProjectId,
  project,
  progress,
  index,
}: NormalizedProject & { progress: number; index: number }) {
  const TypeIcon = getProjectTypeIcon(project.project_type);
  const status = project.project_status || 'Active';

  return (
    <Link
      key={clientProjectId}
      href={`/portal/${project.id}`}
      style={index < 12 ? getStaggerDelay(index) : undefined}
      className={cn(
        'group rounded-xl border border-border bg-card p-6',
        'hover:border-primary/20 hover:shadow-md',
        'cursor-pointer transition-all duration-200',
        index < 12 && 'animate-fade-in-up fill-mode-both'
      )}
    >
      {/* Top row: icon + status */}
      <div className="flex items-start justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.08]">
          <TypeIcon className="h-4 w-4 text-primary" />
        </div>
        <Badge
          className={cn(
            'shrink-0 border px-1.5 py-0 text-[10px] leading-4',
            getProjectStatusColor(status)
          )}
        >
          {status}
        </Badge>
      </div>

      {/* Name */}
      <h3 className="mt-3 text-base font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
        {project.name}
      </h3>

      {/* Description */}
      {project.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
      )}

      {/* Progress */}
      <div className="mt-4 border-t border-border/50 pt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-border/30">
          {progress > 0 && (
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {progress > 0 ? `${progress}% complete` : 'Not started'}
        </p>
      </div>
    </Link>
  );
}

/** Compact card used inside kanban columns */
function ColumnProjectCard({ project, progress }: { project: ProjectShape; progress: number }) {
  const TypeIcon = getProjectTypeIcon(project.project_type);

  return (
    <Link
      href={`/portal/${project.id}`}
      className={cn(
        'group block rounded-lg border border-border bg-card/80 p-3.5',
        'hover:border-primary/20 hover:shadow-sm',
        'cursor-pointer transition-all duration-150'
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08]">
          <TypeIcon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground transition-colors duration-150 group-hover:text-primary">
            {project.name}
          </p>
          {project.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="h-1 overflow-hidden rounded-full bg-border/30">
          {progress > 0 && (
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {progress > 0 ? `${progress}%` : 'Not started'}
        </p>
      </div>
    </Link>
  );
}

/** A single kanban-style status column */
function StatusColumn({
  status,
  projects,
  progressMap,
}: {
  status: string;
  projects: NormalizedProject[];
  progressMap: Record<string, number>;
}) {
  const config = STATUS_COLUMN_CONFIG[status] || STATUS_COLUMN_CONFIG['Archived'];
  const Icon = config.icon;

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Column header */}
      <div
        className={cn(
          'flex flex-shrink-0 items-center gap-2.5 border-b bg-muted/20 px-4 py-3',
          config.borderColor
        )}
      >
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', config.bgColor)}>
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{status}</h2>
        <span
          className={cn(
            'ml-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
            config.badgeColor
          )}
        >
          {projects.length}
        </span>
      </div>

      {/* Scrollable project list */}
      <div className="flex-1 overflow-y-auto p-3">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className={cn('mb-3 rounded-xl p-4', config.bgColor)}>
              <Icon className={cn('h-6 w-6', config.color)} />
            </div>
            <p className="text-sm text-muted-foreground">No {status.toLowerCase()} projects</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <ColumnProjectCard
                key={p.clientProjectId}
                project={p.project}
                progress={progressMap[p.projectId] ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PortalProjectsGrid({
  projects,
  progressMap,
  groupByStatus = false,
}: PortalProjectsGridProps) {
  const [search, setSearch] = useState('');
  const [doneOpen, setDoneOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  // Normalize projects — handle Supabase FK array pattern
  const normalizedProjects = projects
    .map((cp) => {
      const project = Array.isArray(cp.project) ? cp.project[0] : cp.project;
      if (!project) return null;
      return { clientProjectId: cp.id, projectId: cp.project_id || project.id, project };
    })
    .filter((p): p is NormalizedProject => p !== null);

  const filtered = search.trim()
    ? normalizedProjects.filter((p) => p.project.name?.toLowerCase().includes(search.toLowerCase()))
    : normalizedProjects;

  // Build column data for kanban view
  const columnData = groupByStatus
    ? PRIMARY_STATUSES.map((status) => ({
        status,
        projects: filtered.filter((p) => (p.project.project_status || 'Active') === status),
      }))
    : null;

  const secondaryGroups = groupByStatus
    ? SECONDARY_STATUSES.map((status) => ({
        status,
        projects: filtered.filter((p) => (p.project.project_status || 'Active') === status),
      })).filter((g) => g.projects.length > 0)
    : null;

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
        <Input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center px-4">
          <FolderOpen className="h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
            No projects found
          </h3>
          <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground/60">
            {search.trim()
              ? 'Try adjusting your search term.'
              : 'Your active projects will appear here once they are set up.'}
          </p>
        </div>
      ) : columnData ? (
        /* Kanban column layout (staff view) */
        <div className="space-y-4">
          <div className="grid min-h-[500px] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {columnData.map(({ status, projects: colProjects }) => (
              <StatusColumn
                key={status}
                status={status}
                projects={colProjects}
                progressMap={progressMap}
              />
            ))}
          </div>

          {/* Secondary statuses — collapsible */}
          {secondaryGroups &&
            secondaryGroups.map(({ status, projects: groupProjects }) => {
              const config = STATUS_COLUMN_CONFIG[status] || STATUS_COLUMN_CONFIG['Archived'];
              const Icon = config.icon;
              const isOpen = status === 'Done' ? doneOpen : archivedOpen;
              const setIsOpen = status === 'Done' ? setDoneOpen : setArchivedOpen;

              return (
                <Collapsible key={status} open={isOpen} onOpenChange={setIsOpen}>
                  <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 transition-transform duration-200',
                        isOpen && 'rotate-90'
                      )}
                    />
                    <Icon className={cn('h-3.5 w-3.5', config.color)} />
                    <span className="font-medium">{status}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs', config.badgeColor)}>
                      {groupProjects.length}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {groupProjects.map((p, index) => (
                        <ProjectCard
                          key={p.clientProjectId}
                          {...p}
                          progress={progressMap[p.projectId] ?? 0}
                          index={index}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
        </div>
      ) : (
        /* Flat grid view (clients) */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p, index) => (
            <ProjectCard
              key={p.clientProjectId}
              {...p}
              progress={progressMap[p.projectId] ?? 0}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
