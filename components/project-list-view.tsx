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

function ProjectRow({ project }: { project: ProjectData }) {
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

  return (
    <div
      className={cn(
        'group relative flex items-center gap-4 rounded-xl border-2 bg-card p-4 transition-all duration-200',
        'hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20',
        isPartnership ? 'border-orange-500/40' : 'border-border hover:border-qualia-500/30',
        isComplete && 'opacity-60',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      {/* Type icon */}
      <div
        className={cn(
          'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
          typeConfig ? typeConfig.bgColor : 'bg-muted'
        )}
      >
        <TypeIcon
          className={cn('h-5 w-5', typeConfig ? typeConfig.color : 'text-muted-foreground')}
        />
      </div>

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
          <DropdownMenuContent align="end" className="w-44">
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
}

export function ProjectListView({ projects }: ProjectListViewProps) {
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

  return (
    <div className="space-y-8">
      {groupedProjects.map((group) => {
        const config = group.type !== 'other' ? PROJECT_TYPE_CONFIG[group.type] : null;
        const GroupIcon = config?.icon || Folder;

        return (
          <div key={group.type}>
            {/* Group header */}
            <div className="mb-3 flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg',
                  config ? config.bgColor : 'bg-muted'
                )}
              >
                <GroupIcon
                  className={cn('h-4 w-4', config ? config.color : 'text-muted-foreground')}
                />
              </div>
              <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
              <span className="text-sm text-muted-foreground">({group.projects.length})</span>
            </div>

            {/* Projects list */}
            <div className="space-y-2">
              {group.projects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
