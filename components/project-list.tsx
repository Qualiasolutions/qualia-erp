'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  Folder,
  LayoutGrid,
  List,
  Inbox,
  MoreVertical,
  MoveRight,
  Trash2,
  Bot,
  Globe,
  Search,
  Megaphone,
  Triangle,
  Square,
  Train,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminContext } from '@/components/admin-provider';
import { moveProjectToGroup } from '@/app/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ProjectType, DeploymentPlatform } from '@/types/database';

export interface Project {
  id: string;
  name: string;
  status: string;
  target_date: string | null;
  project_group?: string | null;
  project_type?: ProjectType | null;
  deployment_platform?: DeploymentPlatform | null;
  client_id?: string | null;
  client_name?: string | null;
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
  filterType?: ProjectType | 'all';
}

type ViewMode = 'grid' | 'list';

// Project type configuration
const PROJECT_TYPE_CONFIG: Record<
  ProjectType,
  { icon: typeof Globe; color: string; bgColor: string; label: string }
> = {
  web_design: {
    icon: Globe,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'Website',
  },
  ai_agent: {
    icon: Bot,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    label: 'AI Agent',
  },
  seo: {
    icon: Search,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'SEO',
  },
  ads: {
    icon: Megaphone,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    label: 'Ads',
  },
};

// Platform configuration
const PLATFORM_CONFIG: Record<DeploymentPlatform, { icon: typeof Triangle; label: string }> = {
  vercel: { icon: Triangle, label: 'Vercel' },
  squarespace: { icon: Square, label: 'Squarespace' },
  railway: { icon: Train, label: 'Railway' },
};

// Legacy group config for backward compatibility
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

const PROJECT_GROUP_LABELS: Record<string, string> = {
  active: 'Active',
  salman_kuwait: 'Salman - Kuwait',
  tasos_kyriakides: 'Tasos Kyriakides',
  other: 'Other',
  demos: 'Demos',
  inactive: 'Inactive',
};

const ALL_GROUPS = ['active', 'salman_kuwait', 'tasos_kyriakides', 'other', 'demos', 'inactive'];

function ProjectCard({ project }: { project: Project }) {
  const { isAdmin, isSuperAdmin } = useAdminContext();
  const [isPending, startTransition] = useTransition();

  // Get type config
  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const platformConfig = project.deployment_platform
    ? PLATFORM_CONFIG[project.deployment_platform]
    : null;
  const groupConfig = GROUP_CONFIG[project.project_group || 'default'] || GROUP_CONFIG['default'];

  const progress =
    project.project_group === 'finished'
      ? 100
      : project.roadmap_progress !== undefined && project.roadmap_progress > 0
        ? project.roadmap_progress
        : project.issue_stats?.total
          ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
          : 0;

  const handleMoveToGroup = (newGroup: string) => {
    startTransition(async () => {
      await moveProjectToGroup(project.id, newGroup);
    });
  };

  const showAdminActions = isAdmin || isSuperAdmin;
  const TypeIcon = typeConfig?.icon || Folder;
  const PlatformIcon = platformConfig?.icon;

  return (
    <div className="surface group relative flex flex-col gap-2 rounded-lg p-3 transition-all duration-200 hover:bg-secondary/50">
      <Link href={`/projects/${project.id}`} className="flex flex-col gap-2">
        {/* Top row: Type icon + Name + Progress */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex-shrink-0 rounded-md p-1.5',
              typeConfig ? typeConfig.bgColor : groupConfig.bgColor
            )}
          >
            <TypeIcon
              className={cn('h-4 w-4', typeConfig ? typeConfig.color : groupConfig.color)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
              {project.name}
            </h3>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <div className="h-1 w-12 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  'h-full rounded-full',
                  progress >= 70
                    ? 'bg-emerald-500'
                    : progress >= 30
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span
              className={cn(
                'w-7 text-xs font-medium tabular-nums',
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
        </div>

        {/* Bottom row: Client + Platform */}
        <div className="flex items-center gap-3 pl-9">
          {project.client_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{project.client_name}</span>
            </div>
          )}
          {PlatformIcon && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <PlatformIcon className="h-3 w-3" />
              <span>{platformConfig?.label}</span>
            </div>
          )}
          {!project.client_name && !platformConfig && typeConfig && (
            <span className="text-xs text-muted-foreground">{typeConfig.label}</span>
          )}
        </div>
      </Link>

      {showAdminActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'absolute right-2 top-2 flex-shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100',
                isPending && 'animate-pulse opacity-100'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <MoveRight className="mr-2 h-4 w-4" />
                Move to group
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {ALL_GROUPS.filter((g) => g !== project.project_group).map((group) => (
                  <DropdownMenuItem key={group} onClick={() => handleMoveToGroup(group)}>
                    <span
                      className={cn(
                        'mr-2 h-2 w-2 rounded-full',
                        group === 'salman_kuwait' && 'bg-amber-500',
                        group === 'tasos_kyriakides' && 'bg-blue-500',
                        group === 'active' && 'bg-emerald-500',
                        group === 'other' && 'bg-violet-500',
                        group === 'demos' && 'bg-pink-500',
                        group === 'inactive' && 'bg-gray-500'
                      )}
                    />
                    {PROJECT_GROUP_LABELS[group]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {isSuperAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                  onClick={() => {
                    window.location.href = `/projects/${project.id}`;
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete project
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function ProjectList({ projects, filterType = 'all' }: ProjectListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filter by project type if specified
  const filteredProjects =
    filterType === 'all' ? projects : projects.filter((p) => p.project_type === filterType);

  // Sort projects: 100% complete projects go to bottom
  const getProgress = (p: Project) => {
    if (p.project_group === 'finished') return 100;
    if (p.roadmap_progress !== undefined && p.roadmap_progress > 0) return p.roadmap_progress;
    if (p.issue_stats?.total) return Math.round((p.issue_stats.done / p.issue_stats.total) * 100);
    return 0;
  };

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const progressA = getProgress(a);
    const progressB = getProgress(b);
    if (progressA === 100 && progressB !== 100) return 1;
    if (progressB === 100 && progressA !== 100) return -1;
    return progressB - progressA;
  });

  // Count projects by type
  const typeCounts = {
    web_design: projects.filter((p) => p.project_type === 'web_design').length,
    ai_agent: projects.filter((p) => p.project_type === 'ai_agent').length,
    seo: projects.filter((p) => p.project_type === 'seo').length,
    ads: projects.filter((p) => p.project_type === 'ads').length,
    untyped: projects.filter((p) => !p.project_type).length,
  };

  if (filteredProjects.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-xl bg-muted p-4">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">No projects found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {filterType === 'all'
            ? 'Create your first project to get started'
            : `No ${PROJECT_TYPE_CONFIG[filterType]?.label || filterType} projects yet`}
        </p>
      </div>
    );
  }

  const renderGrid = () => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {sortedProjects.map((project, index) => (
        <div key={project.id} className="slide-in" style={{ animationDelay: `${index * 30}ms` }}>
          <ProjectCard project={project} />
        </div>
      ))}
    </div>
  );

  const renderList = () => (
    <div className="space-y-2">
      {sortedProjects.map((project, index) => (
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
              {filteredProjects.length}
            </span>
            <span className="text-sm text-muted-foreground">
              project{filteredProjects.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Type breakdown */}
          {filterType === 'all' && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-4 text-xs">
                {typeCounts.web_design > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-blue-500" />
                    <span className="text-muted-foreground">{typeCounts.web_design}</span>
                  </div>
                )}
                {typeCounts.ai_agent > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Bot className="h-3 w-3 text-purple-500" />
                    <span className="text-muted-foreground">{typeCounts.ai_agent}</span>
                  </div>
                )}
                {typeCounts.seo > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Search className="h-3 w-3 text-green-500" />
                    <span className="text-muted-foreground">{typeCounts.seo}</span>
                  </div>
                )}
                {typeCounts.ads > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Megaphone className="h-3 w-3 text-orange-500" />
                    <span className="text-muted-foreground">{typeCounts.ads}</span>
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

      {/* Content */}
      {viewMode === 'grid' ? renderGrid() : renderList()}
    </div>
  );
}
