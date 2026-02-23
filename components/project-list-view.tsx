'use client';

import Link from 'next/link';
import { useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Folder,
  Bot,
  Globe,
  Phone,
  TrendingUp,
  Megaphone,
  Building,
  ExternalLink,
  MoreVertical,
  Trash2,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminContext } from '@/components/admin-provider';
import { deleteProject } from '@/app/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EntityAvatar } from '@/components/entity-avatar';
import type { ProjectData } from '@/app/projects/page';
import type { ProjectType } from '@/types/database';

// Project type configuration
const PROJECT_TYPE_CONFIG: Record<
  ProjectType,
  {
    icon: typeof Globe;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  ai_agent: {
    icon: Bot,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    label: 'AI',
  },
  voice_agent: {
    icon: Phone,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    label: 'Voice',
  },
  ai_platform: {
    icon: Sparkles,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    label: 'Platform',
  },
  web_design: {
    icon: Globe,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    label: 'Web',
  },
  seo: {
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    label: 'SEO',
  },
  ads: {
    icon: Megaphone,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    label: 'Ads',
  },
};

function ProjectRow({ project, compact = false }: { project: ProjectData; compact?: boolean }) {
  const { isSuperAdmin } = useAdminContext();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const TypeIcon = typeConfig?.icon || Folder;

  const progress =
    project.roadmap_progress > 0
      ? project.roadmap_progress
      : project.issue_stats?.total
        ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
        : 0;

  const isComplete = progress === 100;
  const isPartnership = project.metadata?.is_partnership;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !confirm(
        'Are you sure you want to delete this project? This will also delete all tasks. This action cannot be undone.'
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || 'Failed to delete project');
      }
    });
  };

  const handleClick = () => {
    router.push(`/projects/${project.id}`);
  };

  // Compact row for dense display
  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={cn(
          'group relative flex cursor-pointer items-center gap-3 rounded-lg border bg-card/40 px-3.5 py-2.5 transition-all duration-200',
          'hover:border-primary/20 hover:bg-card hover:shadow-sm',
          isPartnership ? 'border-orange-500/30' : 'border-border/40',
          isComplete && 'opacity-40',
          isPending && 'pointer-events-none opacity-50'
        )}
      >
        {/* Type icon */}
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105',
            typeConfig?.bgColor || 'bg-muted'
          )}
        >
          <TypeIcon className={cn('h-3.5 w-3.5', typeConfig?.color || 'text-muted-foreground')} />
        </div>

        {/* Name + client */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{project.name}</span>
            {isPartnership && <span className="text-xs">🤝</span>}
          </div>
          {project.client_name && (
            <span className="block truncate text-xs text-muted-foreground">
              {project.client_name}
            </span>
          )}
        </div>

        {/* Progress indicator */}
        {progress > 0 && (
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
            <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20">
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-border/50"
              />
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${progress * 0.5} 50`}
                className={isComplete ? 'text-emerald-500' : 'text-qualia-500'}
              />
            </svg>
          </div>
        )}

        {/* Admin delete */}
        {isSuperAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative flex cursor-pointer items-center gap-4 rounded-xl border-2 bg-card p-4 transition-all duration-200',
        'hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20',
        isPartnership ? 'border-orange-500/40' : 'border-border hover:border-qualia-500/30',
        isComplete && 'opacity-60',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      {/* Project Logo/Avatar */}
      <EntityAvatar
        src={project.logo_url}
        fallbackIcon={<TypeIcon className="h-4 w-4" />}
        fallbackBgColor={typeConfig?.bgColor || 'bg-muted'}
        fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
        size="md"
        className="flex-shrink-0"
      />

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${project.id}`}
            className="truncate text-base font-semibold text-foreground transition-colors hover:text-qualia-500"
          >
            {project.name}
          </Link>
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/50" />
          {isComplete && (
            <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-500">
              <Sparkles className="h-3 w-3" />
              Done
            </span>
          )}
          {isPartnership && (
            <span className="rounded-md bg-orange-500/10 px-1.5 py-0.5 text-xs font-medium text-orange-500">
              🤝 Partner
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {typeConfig && (
            <span className={cn('font-medium', typeConfig.color)}>{typeConfig.label}</span>
          )}
          {project.client_name && (
            <span className="flex items-center gap-1">
              <Building className="h-3.5 w-3.5" />
              <span className="max-w-[150px] truncate">{project.client_name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {isSuperAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface ProjectListViewProps {
  projects: ProjectData[];
  horizontal?: boolean;
  compact?: boolean;
}

export function ProjectListView({
  projects,
  horizontal = false,
  compact = false,
}: ProjectListViewProps) {
  // Sort projects: in-progress first (by progress desc), then completed
  const sortedProjects = useMemo(() => {
    const getProgress = (p: ProjectData) => {
      if (p.project_group === 'finished') return 100;
      if (p.roadmap_progress > 0) return p.roadmap_progress;
      if (p.issue_stats?.total) return Math.round((p.issue_stats.done / p.issue_stats.total) * 100);
      return 0;
    };

    return [...projects].sort((a, b) => {
      const progressA = getProgress(a);
      const progressB = getProgress(b);
      // Completed projects go to bottom
      if (progressA === 100 && progressB !== 100) return 1;
      if (progressB === 100 && progressA !== 100) return -1;
      // Sort by progress descending
      return progressB - progressA;
    });
  }, [projects]);

  // Group projects by type
  const groupedProjects = useMemo(() => {
    const groups: { type: ProjectType | 'other'; label: string; projects: ProjectData[] }[] = [
      { type: 'ai_agent', label: 'AI Agents', projects: [] },
      { type: 'voice_agent', label: 'Voice Agents', projects: [] },
      { type: 'ai_platform', label: 'AI Platforms', projects: [] },
      { type: 'web_design', label: 'Websites', projects: [] },
      { type: 'seo', label: 'SEO', projects: [] },
      { type: 'ads', label: 'Ads', projects: [] },
      { type: 'other', label: 'Other', projects: [] },
    ];

    sortedProjects.forEach((project) => {
      const group = groups.find((g) => g.type === project.project_type);
      if (group) {
        group.projects.push(project);
      } else {
        groups.find((g) => g.type === 'other')?.projects.push(project);
      }
    });

    // Filter out empty groups
    return groups.filter((g) => g.projects.length > 0);
  }, [sortedProjects]);

  if (projects.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-2xl bg-secondary/50 p-5">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold text-foreground">No projects yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first project to get started
        </p>
      </div>
    );
  }

  if (horizontal) {
    return (
      <div className="flex flex-row gap-2 overflow-x-auto pb-2">
        {sortedProjects.map((project) => (
          <div key={project.id} className="w-[200px] flex-shrink-0">
            <ProjectRow project={project} compact />
          </div>
        ))}
      </div>
    );
  }

  // Compact mode: Split into AI (left) vs Web & Marketing (right)
  if (compact) {
    const aiTypes: (ProjectType | null)[] = ['ai_agent', 'voice_agent', 'ai_platform'];
    const aiProjects = sortedProjects.filter(
      (p) => p.project_type && aiTypes.includes(p.project_type)
    );
    const otherProjects = sortedProjects.filter(
      (p) => !p.project_type || !aiTypes.includes(p.project_type)
    );

    // If all projects are one category, show single column
    if (aiProjects.length === 0 || otherProjects.length === 0) {
      return (
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          {sortedProjects.map((project) => (
            <ProjectRow key={project.id} project={project} compact />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* AI Projects - Left Column */}
        <div className="space-y-2">
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/10">
              <Bot className="h-3 w-3 text-violet-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              AI & Voice
            </span>
            <span className="text-xs text-muted-foreground/50">({aiProjects.length})</span>
          </div>
          {aiProjects.map((project) => (
            <ProjectRow key={project.id} project={project} compact />
          ))}
        </div>

        {/* Web & Marketing - Right Column */}
        <div className="space-y-2">
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/10">
              <Globe className="h-3 w-3 text-sky-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Web & Marketing
            </span>
            <span className="text-xs text-muted-foreground/50">({otherProjects.length})</span>
          </div>
          {otherProjects.map((project) => (
            <ProjectRow key={project.id} project={project} compact />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedProjects.map((group) => {
        const config = group.type !== 'other' ? PROJECT_TYPE_CONFIG[group.type] : null;
        const GroupIcon = config?.icon || Folder;

        return (
          <div key={group.type}>
            {/* Group header */}
            <div className="mb-2 flex items-center gap-2">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-md',
                  config ? config.bgColor : 'bg-muted'
                )}
              >
                <GroupIcon
                  className={cn('h-3.5 w-3.5', config ? config.color : 'text-muted-foreground')}
                />
              </div>
              <h2 className="text-sm font-medium text-foreground">{group.label}</h2>
              <span className="text-xs text-muted-foreground">({group.projects.length})</span>
            </div>

            {/* Projects grid - 2 columns on wider screens */}
            <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-2">
              {group.projects.map((project) => (
                <ProjectRow key={project.id} project={project} compact />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
