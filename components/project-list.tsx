'use client';

import Link from 'next/link';
import { useTransition, useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Folder,
  Inbox,
  MoreVertical,
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
  ChevronDown,
  ChevronRight,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminContext } from '@/components/admin-provider';
import { getClients, deleteProject } from '@/app/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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

function ProjectCard({
  project,
  isCollapsed,
  onToggleCollapse,
}: {
  project: Project;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { isSuperAdmin } = useAdminContext();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Get type config
  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const platformConfig = project.deployment_platform
    ? PLATFORM_CONFIG[project.deployment_platform]
    : null;

  const progress =
    project.roadmap_progress !== undefined && project.roadmap_progress > 0
      ? project.roadmap_progress
      : project.issue_stats?.total
        ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
        : 0;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !confirm(
        'Are you sure you want to delete this project? This will also delete all issues in this project. This action cannot be undone.'
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

  const showAdminActions = isSuperAdmin;
  const TypeIcon = typeConfig?.icon || Folder;
  const PlatformIcon = platformConfig?.icon;
  const isComplete = progress === 100;
  const isPartnership = project.metadata?.is_partnership;
  const partnerName = project.metadata?.partner_name;

  // Collapsed view - compact single line with premium touch
  if (isCollapsed) {
    return (
      <div
        className={cn(
          'group relative flex items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 transition-all duration-200',
          'shadow-sm shadow-black/5 dark:shadow-black/20',
          'hover:shadow-md hover:shadow-black/10 dark:hover:shadow-black/30',
          isPartnership
            ? 'border-orange-500/50'
            : typeConfig
              ? typeConfig.borderColor
              : 'border-border',
          isComplete ? 'opacity-50' : 'opacity-100',
          'hover:scale-[1.01] hover:bg-secondary/20'
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleCollapse();
          }}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
            'shadow-sm ring-1 ring-white/5',
            typeConfig ? typeConfig.bgColor : 'bg-muted'
          )}
        >
          <TypeIcon
            className={cn('h-4 w-4', typeConfig ? typeConfig.color : 'text-muted-foreground')}
          />
        </div>
        <Link
          href={`/projects/${project.id}`}
          className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          {project.name}
        </Link>
        {isPartnership && <span className="text-xs">🤝</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border-2 transition-all duration-300',
        isPartnership
          ? 'border-orange-500/60 ring-2 ring-orange-500/20'
          : typeConfig
            ? typeConfig.borderColor
            : 'border-border',
        isComplete ? 'opacity-50' : 'opacity-100',
        'shadow-lg shadow-black/5 dark:shadow-black/20',
        'hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30',
        'hover:-translate-y-1 hover:scale-[1.01]'
      )}
    >
      {/* Gradient background overlay - enhanced */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-40',
          typeConfig
            ? `${typeConfig.gradientFrom} ${typeConfig.gradientTo}`
            : 'from-muted/50 to-transparent'
        )}
      />

      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.03] to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* Card content */}
      <div className="relative bg-card/90 backdrop-blur-sm">
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleCollapse();
          }}
          className="absolute left-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all duration-200 hover:bg-secondary hover:text-foreground group-hover:opacity-100"
          title="Collapse"
        >
          <ChevronDown className="h-4 w-4" />
        </button>

        <Link href={`/projects/${project.id}`} className="block p-5">
          {/* Header: Icon + Name + External link hint */}
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300',
                'shadow-md shadow-black/10 dark:shadow-black/30',
                'ring-2 ring-white/5',
                'group-hover:scale-110 group-hover:shadow-lg',
                typeConfig ? typeConfig.bgColor : 'bg-muted'
              )}
            >
              <TypeIcon
                className={cn('h-6 w-6', typeConfig ? typeConfig.color : 'text-muted-foreground')}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {project.name}
                </h3>
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/60" />
              </div>

              {/* Meta info - enhanced */}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">
                {project.client_name && (
                  <span className="flex items-center gap-1.5 rounded-md bg-secondary/30 px-2 py-0.5">
                    <Building className="h-3 w-3" />
                    <span className="max-w-[120px] truncate font-medium">
                      {project.client_name}
                    </span>
                  </span>
                )}
                {PlatformIcon && (
                  <span className="flex items-center gap-1.5 rounded-md bg-secondary/30 px-2 py-0.5">
                    <PlatformIcon className="h-3 w-3" />
                    <span className="font-medium">{platformConfig?.label}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Completion badge - premium */}
          {isComplete && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-500">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-semibold tracking-wide">Completed</span>
            </div>
          )}

          {/* Partnership badge - enhanced */}
          {isPartnership && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs text-orange-500">
              <span className="font-semibold tracking-wide">🤝 Partnership with {partnerName}</span>
            </div>
          )}
        </Link>

        {/* Admin actions */}
        {showAdminActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all duration-200 hover:bg-secondary hover:text-foreground group-hover:opacity-100',
                  isPending && 'animate-pulse opacity-100'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}`} className="flex w-full items-center">
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit project
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
    </div>
  );
}

interface Client {
  id: string;
  display_name: string | null;
}

const COLLAPSED_PROJECTS_KEY = 'qualia-collapsed-projects';

export function ProjectList({
  projects,
  filterType = 'all',
  viewMode = 'columns',
}: ProjectListProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardDefaultType, setWizardDefaultType] = useState<ProjectType | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const { currentWorkspace } = useWorkspace();

  // Load collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_PROJECTS_KEY);
      if (stored) {
        setCollapsedProjects(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = useCallback((projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      try {
        localStorage.setItem(COLLAPSED_PROJECTS_KEY, JSON.stringify([...next]));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  }, []);

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

  // Group projects by type for columns view (only showing AI, Voice, and Web)
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
    };
  }, [projects, getProgress]);

  if (sortedProjects.length === 0) {
    return (
      <div className="flex h-80 flex-col items-center justify-center text-center">
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-secondary/50 to-secondary/20 p-6 shadow-xl shadow-black/10 ring-2 ring-white/5 dark:shadow-black/30">
          <Inbox className="h-10 w-10 text-muted-foreground" />
        </div>
        <p className="text-xl font-bold tracking-tight text-foreground">No projects found</p>
        <p className="mt-2 text-sm text-muted-foreground/80">
          {filterType === 'all'
            ? 'Create your first project to get started'
            : `No ${PROJECT_TYPE_CONFIG[filterType]?.label || filterType} projects yet`}
        </p>
      </div>
    );
  }

  const renderColumns = () => {
    const columns: { type: ProjectType; projects: Project[] }[] = [
      { type: 'ai_agent', projects: groupedByType.ai_agent },
      { type: 'voice_agent', projects: groupedByType.voice_agent },
      { type: 'web_design', projects: groupedByType.web_design },
    ];

    return (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {columns.map(({ type, projects: typeProjects }, columnIndex) => {
          const config = PROJECT_TYPE_CONFIG[type];
          const TypeIcon = config.icon;

          return (
            <div
              key={type}
              className="slide-up space-y-4"
              style={{ animationDelay: `${columnIndex * 75}ms` }}
            >
              {/* Column Header - Premium Design */}
              <div
                className={cn(
                  'group/header relative overflow-hidden rounded-2xl border-2 p-5',
                  config.borderColor,
                  'bg-gradient-to-br backdrop-blur-sm',
                  config.gradientFrom,
                  config.gradientTo,
                  'shadow-lg shadow-black/5 dark:shadow-black/20',
                  'transition-all duration-300 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30',
                  'hover:scale-[1.02]'
                )}
              >
                {/* Decorative background pattern - more premium */}
                <div className="absolute inset-0 opacity-[0.03]">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-current blur-xl" />
                  <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-current blur-lg" />
                  <div className="absolute right-1/4 top-1/2 h-16 w-16 rounded-full bg-current blur-md" />
                </div>

                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 transition-opacity duration-500 group-hover/header:opacity-100" />

                <div className="relative flex items-center gap-4">
                  <div
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl',
                      'shadow-lg shadow-black/10 dark:shadow-black/30',
                      'ring-2 ring-white/10',
                      config.bgColor,
                      'transition-transform duration-300 group-hover/header:scale-110'
                    )}
                  >
                    <TypeIcon className={cn('h-7 w-7', config.color)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold tracking-tight text-foreground">
                      {config.label}
                    </h3>
                    <p className="text-sm text-muted-foreground/80">{config.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenWizard(type)}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300',
                        'opacity-0 group-hover/header:opacity-100',
                        'hover:scale-110 active:scale-95',
                        'shadow-md shadow-black/10',
                        config.bgColor,
                        config.color
                      )}
                      title={`Create new ${config.label.toLowerCase().replace(/s$/, '')}`}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <div className="text-right">
                      <div
                        className={cn(
                          'text-3xl font-black tabular-nums tracking-tighter',
                          config.color
                        )}
                      >
                        {typeProjects.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Projects List */}
              <div className="space-y-4">
                {typeProjects.length === 0 ? (
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center',
                      'bg-gradient-to-br from-secondary/20 to-transparent',
                      'transition-all duration-300 hover:border-solid hover:shadow-lg',
                      config.borderColor
                    )}
                  >
                    <div
                      className={cn(
                        'mb-4 rounded-2xl p-4',
                        'shadow-lg shadow-black/10 dark:shadow-black/30',
                        'ring-2 ring-white/5',
                        config.bgColor
                      )}
                    >
                      <TypeIcon className={cn('h-7 w-7', config.color)} />
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      No {config.label.toLowerCase()}
                    </p>
                    <p className="mt-1.5 text-sm text-muted-foreground/70">
                      Projects will appear here
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenWizard(type)}
                      className={cn(
                        'mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
                        'hover:scale-105 active:scale-95',
                        config.bgColor,
                        config.color
                      )}
                    >
                      <Plus className="h-4 w-4" />
                      Create first
                    </button>
                  </div>
                ) : (
                  typeProjects.map((project, index) => (
                    <div
                      key={project.id}
                      className="slide-up"
                      style={{ animationDelay: `${columnIndex * 75 + index * 50}ms` }}
                    >
                      <ProjectCard
                        project={project}
                        isCollapsed={collapsedProjects.has(project.id)}
                        onToggleCollapse={() => toggleCollapsed(project.id)}
                      />
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
