'use client';

import Link from 'next/link';
import { useTransition, useMemo, useState, useEffect } from 'react';
import {
  Folder,
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
  Sparkles,
  TrendingUp,
  ExternalLink,
  Phone,
  Facebook,
  Instagram,
  Linkedin,
  CircleDot,
  Ban,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminContext } from '@/components/admin-provider';
import { moveProjectToGroup, getClients } from '@/app/actions';
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
import { ProjectWizard } from '@/components/project-wizard';
import { useWorkspace } from '@/components/workspace-provider';
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
  metadata?: {
    is_partnership?: boolean;
    partner_name?: string;
  } | null;
}

type ViewMode = 'columns' | 'grid' | 'list' | 'timeline';

interface ProjectListProps {
  projects: Project[];
  filterType?: ProjectType | 'all';
  viewMode?: ViewMode;
}

import { ProjectTimeline } from '@/components/project-timeline';

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
  const isPartnership = project.metadata?.is_partnership;
  const partnerName = project.metadata?.partner_name;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border-2 transition-all duration-300',
        isPartnership
          ? 'border-orange-500 ring-2 ring-orange-500/20'
          : typeConfig
            ? typeConfig.borderColor
            : 'border-border',
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

          {/* Partnership badge */}
          {isPartnership && (
            <div className="mt-3 flex items-center gap-1.5 rounded-md bg-orange-500/10 px-2 py-1 text-xs text-orange-500">
              <span className="font-medium">🤝 Partnership with {partnerName}</span>
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

interface Client {
  id: string;
  display_name: string | null;
}

export function ProjectList({
  projects,
  filterType = 'all',
  viewMode = 'columns',
}: ProjectListProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardDefaultType, setWizardDefaultType] = useState<ProjectType | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (wizardOpen && currentWorkspace) {
      getClients(currentWorkspace.id).then((result) => {
        if (Array.isArray(result)) {
          setClients(result);
        }
      });
    }
  }, [wizardOpen, currentWorkspace]);

  const handleOpenWizard = (type: ProjectType) => {
    setWizardDefaultType(type);
    setWizardOpen(true);
  };

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
                  'group/header relative overflow-hidden rounded-xl border p-4',
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenWizard(type)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
                        'opacity-0 group-hover/header:opacity-100',
                        'hover:scale-110',
                        config.bgColor,
                        config.color
                      )}
                      title={`Create new ${config.label.toLowerCase().replace(/s$/, '')}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
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
    <>
      <div>
        {/* Content */}
        {viewMode === 'columns' && renderColumns()}
        {viewMode === 'grid' && renderGrid()}
        {viewMode === 'list' && renderList()}
        {viewMode === 'timeline' && <ProjectTimeline projects={sortedProjects} />}
      </div>

      {/* Project Creation Wizard */}
      <ProjectWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        clients={clients}
        defaultType={wizardDefaultType}
      />
    </>
  );
}
