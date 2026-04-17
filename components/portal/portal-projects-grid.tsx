'use client';

import { memo, useState } from 'react';
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
} from 'lucide-react';

// Use a looser shape for the Search icon to avoid TS issues
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
    // Support the FK array pattern from Supabase
    project_type?: string | null;
    name?: string;
  }>;
  progressMap: Record<string, number>;
}

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

interface ProjectGridCardProps {
  clientProjectId: string;
  project: ProjectShape;
  progress: number;
  index: number;
}

const ProjectGridCard = memo(function ProjectGridCard({
  clientProjectId,
  project,
  progress,
  index,
}: ProjectGridCardProps) {
  const TypeIcon = getProjectTypeIcon(project.project_type);
  const status = project.project_status || 'Active';

  return (
    <Link
      key={clientProjectId}
      href={`/projects/${project.id}`}
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
});

export function PortalProjectsGrid({ projects, progressMap }: PortalProjectsGridProps) {
  const [search, setSearch] = useState('');

  // Normalize projects — handle Supabase FK array pattern
  const normalizedProjects = projects
    .map((cp) => {
      const project = Array.isArray(cp.project) ? cp.project[0] : cp.project;
      if (!project) return null;
      return { clientProjectId: cp.id, projectId: cp.project_id || project.id, project };
    })
    .filter(
      (
        p
      ): p is {
        clientProjectId: string;
        projectId: string;
        project: ProjectShape;
      } => p !== null
    );

  const filtered = search.trim()
    ? normalizedProjects.filter((p) => p.project.name?.toLowerCase().includes(search.toLowerCase()))
    : normalizedProjects;

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
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ clientProjectId, projectId, project }, index) => (
            <ProjectGridCard
              key={clientProjectId}
              clientProjectId={clientProjectId}
              project={project}
              progress={progressMap[projectId] ?? 0}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
