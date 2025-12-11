'use client';

import Link from 'next/link';
import { useState, useTransition, useMemo } from 'react';
import {
  Folder,
  LayoutGrid,
  List,
  Columns3,
  Inbox,
  MoreVertical,
  MoveRight,
  Trash2,
  Bot,
  Globe,
  Megaphone,
  Triangle,
  Square,
  Train,
  Building,
  GanttChart,
  Sparkles,
  TrendingUp,
  ExternalLink,
  Phone,
  Facebook,
  Instagram,
  Linkedin,
  CircleDot,
  Ban,
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
  start_date?: string | null;
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

import { ProjectTimeline } from '@/components/project-timeline';

type ViewMode = 'columns' | 'grid' | 'list' | 'timeline';

// Project type configuration with enhanced styling
const PROJECT_TYPE_CONFIG: Record<
  ProjectType,
  {
    icon: typeof Globe;
    color: string;
    bgColor: string;
    borderColor: string;
    gradientFrom: string;
    gradientTo: string;
    label: string;
    description: string;
  }
> = {
  ai_agent: {
    icon: Bot,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    gradientFrom: 'from-violet-500/20',
    gradientTo: 'to-violet-500/5',
    label: 'AI Agents',
    description: 'Intelligent automation',
  },
  voice_agent: {
    icon: Phone,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    gradientFrom: 'from-pink-500/20',
    gradientTo: 'to-pink-500/5',
    label: 'Voice Agents',
    description: 'Phone bots & voice AI',
  },
  web_design: {
    icon: Globe,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20',
    gradientFrom: 'from-sky-500/20',
    gradientTo: 'to-sky-500/5',
    label: 'Websites',
    description: 'Digital experiences',
  },
  seo: {
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    gradientFrom: 'from-emerald-500/20',
    gradientTo: 'to-emerald-500/5',
    label: 'SEO',
    description: 'Search optimization',
  },
  ads: {
    icon: Megaphone,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-amber-500/5',
    label: 'Ads',
    description: 'Paid campaigns',
  },
};

// Platform configuration
const PLATFORM_CONFIG: Record<DeploymentPlatform, { icon: typeof Triangle; label: string }> = {
  vercel: { icon: Triangle, label: 'Vercel' },
  squarespace: { icon: Square, label: 'Squarespace' },
  railway: { icon: Train, label: 'Railway' },
  meta: { icon: Facebook, label: 'Meta' },
  instagram: { icon: Instagram, label: 'Instagram' },
  google_ads: { icon: CircleDot, label: 'Google Ads' },
  tiktok: { icon: CircleDot, label: 'TikTok' },
  linkedin: { icon: Linkedin, label: 'LinkedIn' },
  none: { icon: Ban, label: 'N/A' },
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
  const isComplete = progress === 100;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border transition-all duration-300',
        typeConfig ? typeConfig.borderColor : 'border-border',
        isComplete ? 'opacity-60' : 'opacity-100',
        'hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20',
        'hover:-translate-y-0.5'
      )}
    >
      {/* Gradient background overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-50',
          typeConfig
            ? `${typeConfig.gradientFrom} ${typeConfig.gradientTo}`
            : 'from-muted/50 to-transparent'
        )}
      />

      {/* Card content */}
      <div className="relative bg-card/80 backdrop-blur-sm">
        <Link href={`/projects/${project.id}`} className="block p-4">
          {/* Header: Icon + Name + External link hint */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110',
                typeConfig ? typeConfig.bgColor : groupConfig.bgColor
              )}
            >
              <TypeIcon
                className={cn('h-5 w-5', typeConfig ? typeConfig.color : groupConfig.color)}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                  {project.name}
                </h3>
                <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/60" />
              </div>

              {/* Meta info */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {project.client_name && (
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    <span className="max-w-[100px] truncate">{project.client_name}</span>
                  </span>
                )}
                {PlatformIcon && (
                  <span className="flex items-center gap-1 rounded bg-secondary/50 px-1.5 py-0.5">
                    <PlatformIcon className="h-3 w-3" />
                    <span>{platformConfig?.label}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress section */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  isComplete
                    ? 'text-emerald-500'
                    : progress >= 50
                      ? 'text-amber-500'
                      : typeConfig?.color || 'text-primary'
                )}
              >
                {progress}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary/50">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  isComplete
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : progress >= 50
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                      : typeConfig
                        ? `bg-gradient-to-r ${typeConfig.gradientFrom.replace('/20', '')} ${typeConfig.gradientTo.replace('/5', '')}`
                        : 'bg-primary'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Completion badge */}
          {isComplete && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-500">
              <Sparkles className="h-3 w-3" />
              <span className="font-medium">Completed</span>
            </div>
          )}
        </Link>

        {/* Admin actions */}
        {showAdminActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100',
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
    </div>
  );
}

export function ProjectList({ projects, filterType = 'all' }: ProjectListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('columns');

  // Helper function for progress calculation - memoized
  const getProgress = useMemo(
    () => (p: Project) => {
      if (p.project_group === 'finished') return 100;
      if (p.roadmap_progress !== undefined && p.roadmap_progress > 0) return p.roadmap_progress;
      if (p.issue_stats?.total) return Math.round((p.issue_stats.done / p.issue_stats.total) * 100);
      return 0;
    },
    []
  );

  // Memoize filtered and sorted projects
  const sortedProjects = useMemo(() => {
    const filtered =
      filterType === 'all' ? projects : projects.filter((p) => p.project_type === filterType);

    return [...filtered].sort((a, b) => {
      const progressA = getProgress(a);
      const progressB = getProgress(b);
      if (progressA === 100 && progressB !== 100) return 1;
      if (progressB === 100 && progressA !== 100) return -1;
      return progressB - progressA;
    });
  }, [projects, filterType, getProgress]);

  // Memoize type counts
  const typeCounts = useMemo(
    () => ({
      ai_agent: projects.filter((p) => p.project_type === 'ai_agent').length,
      voice_agent: projects.filter((p) => p.project_type === 'voice_agent').length,
      web_design: projects.filter((p) => p.project_type === 'web_design').length,
      seo: projects.filter((p) => p.project_type === 'seo').length,
      ads: projects.filter((p) => p.project_type === 'ads').length,
      untyped: projects.filter((p) => !p.project_type).length,
    }),
    [projects]
  );

  // Group projects by type for columns view
  const groupedByType = useMemo(() => {
    const sortByProgress = (list: Project[]) =>
      [...list].sort((a, b) => {
        const progressA = getProgress(a);
        const progressB = getProgress(b);
        // Completed projects go to bottom
        if (progressA === 100 && progressB !== 100) return 1;
        if (progressB === 100 && progressA !== 100) return -1;
        // Sort by progress descending
        return progressB - progressA;
      });

    return {
      ai_agent: sortByProgress(projects.filter((p) => p.project_type === 'ai_agent')),
      voice_agent: sortByProgress(projects.filter((p) => p.project_type === 'voice_agent')),
      web_design: sortByProgress(projects.filter((p) => p.project_type === 'web_design')),
      seo: sortByProgress(projects.filter((p) => p.project_type === 'seo')),
      ads: sortByProgress(projects.filter((p) => p.project_type === 'ads')),
    };
  }, [projects, getProgress]);

  if (sortedProjects.length === 0) {
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

  const renderColumns = () => {
    const columns: { type: ProjectType; projects: Project[] }[] = [
      { type: 'ai_agent', projects: groupedByType.ai_agent },
      { type: 'voice_agent', projects: groupedByType.voice_agent },
      { type: 'web_design', projects: groupedByType.web_design },
      { type: 'seo', projects: groupedByType.seo },
      { type: 'ads', projects: groupedByType.ads },
    ];

    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {columns.map(({ type, projects: typeProjects }, columnIndex) => {
          const config = PROJECT_TYPE_CONFIG[type];
          const TypeIcon = config.icon;
          const activeCount = typeProjects.filter((p) => {
            const prog = getProgress(p);
            return prog < 100;
          }).length;

          return (
            <div
              key={type}
              className="slide-up space-y-4"
              style={{ animationDelay: `${columnIndex * 75}ms` }}
            >
              {/* Column Header - Enhanced */}
              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border p-4',
                  config.borderColor,
                  'bg-gradient-to-br',
                  config.gradientFrom,
                  config.gradientTo
                )}
              >
                {/* Decorative background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-current" />
                  <div className="absolute -bottom-2 -left-2 h-16 w-16 rounded-full bg-current" />
                </div>

                <div className="relative flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl',
                      config.bgColor
                    )}
                  >
                    <TypeIcon className={cn('h-6 w-6', config.color)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-foreground">{config.label}</h3>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                  <div className="text-right">
                    <div className={cn('text-2xl font-bold tabular-nums', config.color)}>
                      {typeProjects.length}
                    </div>
                    {activeCount > 0 && activeCount !== typeProjects.length && (
                      <div className="text-xs text-muted-foreground">{activeCount} active</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Projects List */}
              <div className="space-y-3">
                {typeProjects.length === 0 ? (
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center',
                      config.borderColor
                    )}
                  >
                    <div className={cn('mb-3 rounded-xl p-3', config.bgColor)}>
                      <TypeIcon className={cn('h-6 w-6', config.color)} />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      No {config.label.toLowerCase()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Projects will appear here</p>
                  </div>
                ) : (
                  typeProjects.map((project, index) => (
                    <div
                      key={project.id}
                      className="slide-up"
                      style={{ animationDelay: `${columnIndex * 75 + index * 50}ms` }}
                    >
                      <ProjectCard project={project} />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar - Enhanced */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {/* Total count */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {sortedProjects.length}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              project{sortedProjects.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Type breakdown - compact pills */}
          {filterType === 'all' && (
            <>
              <div className="hidden h-8 w-px bg-border sm:block" />
              <div className="hidden flex-wrap items-center gap-2 sm:flex">
                {typeCounts.ai_agent > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1">
                    <Bot className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs font-semibold tabular-nums text-violet-400">
                      {typeCounts.ai_agent}
                    </span>
                  </div>
                )}
                {typeCounts.voice_agent > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-pink-500/10 px-2.5 py-1">
                    <Phone className="h-3.5 w-3.5 text-pink-400" />
                    <span className="text-xs font-semibold tabular-nums text-pink-400">
                      {typeCounts.voice_agent}
                    </span>
                  </div>
                )}
                {typeCounts.web_design > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1">
                    <Globe className="h-3.5 w-3.5 text-sky-400" />
                    <span className="text-xs font-semibold tabular-nums text-sky-400">
                      {typeCounts.web_design}
                    </span>
                  </div>
                )}
                {typeCounts.seo > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold tabular-nums text-emerald-400">
                      {typeCounts.seo}
                    </span>
                  </div>
                )}
                {typeCounts.ads > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1">
                    <Megaphone className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-semibold tabular-nums text-amber-400">
                      {typeCounts.ads}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* View Toggle - Enhanced */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1">
          <button
            onClick={() => setViewMode('columns')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
              viewMode === 'columns'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Columns view"
          >
            <Columns3 className="h-4 w-4" />
            <span className="hidden sm:inline">Columns</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
              viewMode === 'grid'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
              viewMode === 'list'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="List view"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
              viewMode === 'timeline'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Timeline view"
          >
            <GanttChart className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'columns' && renderColumns()}
      {viewMode === 'grid' && renderGrid()}
      {viewMode === 'list' && renderList()}
      {viewMode === 'timeline' && <ProjectTimeline projects={sortedProjects} />}
    </div>
  );
}
