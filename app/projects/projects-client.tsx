'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Globe,
  Phone,
  TrendingUp,
  Megaphone,
  Folder,
  Search,
  LayoutGrid,
  List,
  Filter,
  ChevronRight,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EntityAvatar } from '@/components/entity-avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { DemoSheet } from '@/components/demo-sheet';
import { useProjectStats, type ProjectStatsData } from '@/lib/swr';
import { USER_COLORS } from '@/lib/color-constants';
import type { ProjectData } from './page';
import type { ProjectType } from '@/types/database';

// Get user color key from email
function getUserColorKey(email: string | null): 'fawzi' | 'moayad' | null {
  if (!email) return null;
  const lowerEmail = email.toLowerCase();
  if (lowerEmail.includes('info@qualia') || lowerEmail.includes('fawzi')) return 'fawzi';
  if (lowerEmail.includes('moayad')) return 'moayad';
  return null;
}

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
    label: 'AI Agent',
  },
  voice_agent: {
    icon: Phone,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    label: 'Voice',
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

// Status badges
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  Demos: { label: 'Demo', className: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  Active: {
    label: 'Active',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  Launched: {
    label: 'Launched',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  Delayed: { label: 'Delayed', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
  Archived: { label: 'Archived', className: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  Canceled: { label: 'Canceled', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

// Project card for grid view
const ProjectCard = React.memo(function ProjectCard({
  project,
  onProjectClick,
}: {
  project: ProjectData;
  onProjectClick?: (project: ProjectData) => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (onProjectClick) {
      onProjectClick(project);
    } else {
      router.push(`/projects/${project.id}`);
    }
  };

  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const TypeIcon = typeConfig?.icon || Folder;
  const userColorKey = getUserColorKey(project.lead?.email || null);
  const userColors = userColorKey ? USER_COLORS[userColorKey] : null;
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.Active;

  const progress =
    project.issue_stats.total > 0
      ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
      : project.roadmap_progress;

  return (
    <div
      onClick={handleClick}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-qualia-500/30 hover:shadow-lg hover:shadow-qualia-500/5"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <EntityAvatar
          src={project.logo_url}
          fallbackIcon={<TypeIcon className="h-4 w-4" />}
          fallbackBgColor={typeConfig?.bgColor || 'bg-muted'}
          fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-qualia-500">
              {project.name}
            </h3>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline" className={cn('text-[10px]', statusConfig.className)}>
              {statusConfig.label}
            </Badge>
            {typeConfig && (
              <span className={cn('text-xs', typeConfig.color)}>{typeConfig.label}</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-qualia-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        {project.lead ? (
          <div className="flex items-center gap-1.5">
            {userColors && <span className={cn('h-2 w-2 rounded-full', userColors.dot)} />}
            <span className={cn('text-xs', userColors?.text || 'text-muted-foreground')}>
              {project.lead.full_name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No lead</span>
        )}
        {project.target_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Target className="h-3 w-3" />
            {new Date(project.target_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        )}
      </div>
    </div>
  );
});

// Project row for list view
const ProjectRow = React.memo(function ProjectRow({
  project,
  onProjectClick,
}: {
  project: ProjectData;
  onProjectClick?: (project: ProjectData) => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (onProjectClick) {
      onProjectClick(project);
    } else {
      router.push(`/projects/${project.id}`);
    }
  };

  const typeConfig = project.project_type ? PROJECT_TYPE_CONFIG[project.project_type] : null;
  const TypeIcon = typeConfig?.icon || Folder;
  const userColorKey = getUserColorKey(project.lead?.email || null);
  const userColors = userColorKey ? USER_COLORS[userColorKey] : null;
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.Active;

  const progress =
    project.issue_stats.total > 0
      ? Math.round((project.issue_stats.done / project.issue_stats.total) * 100)
      : project.roadmap_progress;

  return (
    <div
      onClick={handleClick}
      className="group flex cursor-pointer items-center gap-4 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-secondary/50"
    >
      <EntityAvatar
        src={project.logo_url}
        fallbackIcon={<TypeIcon className="h-3.5 w-3.5" />}
        fallbackBgColor={typeConfig?.bgColor || 'bg-muted'}
        fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
        size="md"
      />

      {/* Name & Type */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground transition-colors group-hover:text-qualia-500">
          {project.name}
        </p>
        {typeConfig && <span className={cn('text-xs', typeConfig.color)}>{typeConfig.label}</span>}
      </div>

      {/* Status */}
      <Badge
        variant="outline"
        className={cn('hidden text-[10px] sm:inline-flex', statusConfig.className)}
      >
        {statusConfig.label}
      </Badge>

      {/* Lead */}
      <div className="hidden w-28 items-center gap-1.5 md:flex">
        {project.lead ? (
          <>
            {userColors && (
              <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', userColors.dot)} />
            )}
            <span className={cn('truncate text-xs', userColors?.text || 'text-muted-foreground')}>
              {project.lead.full_name}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Progress */}
      <div className="hidden w-24 items-center gap-2 lg:flex">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-qualia-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="w-8 text-right text-xs text-muted-foreground">{progress}%</span>
      </div>

      {/* Target date */}
      <div className="hidden w-20 text-right text-xs text-muted-foreground xl:block">
        {project.target_date
          ? new Date(project.target_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : '—'}
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
});

interface ProjectsClientProps {
  projects: ProjectData[];
  demos: ProjectData[];
}

export function ProjectsClient({
  projects: initialProjects,
  demos: initialDemos,
}: ProjectsClientProps) {
  // Use SWR for real-time updates
  const { projects, demos } = useProjectStats({
    projects: initialProjects as ProjectStatsData[],
    demos: initialDemos as ProjectStatsData[],
  });

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'demos'>('all');
  const [typeFilters, setTypeFilters] = useState<ProjectType[]>([]);
  const [selectedDemo, setSelectedDemo] = useState<ProjectData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Combine all projects
  const allProjects = useMemo(() => {
    return [...(projects as ProjectData[]), ...(demos as ProjectData[])];
  }, [projects, demos]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    let result = allProjects;

    // Filter by status tab
    if (statusTab === 'active') {
      result = result.filter((p) => p.status !== 'Demos');
    } else if (statusTab === 'demos') {
      result = result.filter((p) => p.status === 'Demos');
    }

    // Filter by type
    if (typeFilters.length > 0) {
      result = result.filter((p) => p.project_type && typeFilters.includes(p.project_type));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.client_name?.toLowerCase().includes(query) ||
          p.lead?.full_name?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [allProjects, statusTab, typeFilters, searchQuery]);

  const handleProjectClick = (project: ProjectData) => {
    if (project.status === 'Demos') {
      setSelectedDemo(project);
      setSheetOpen(true);
    }
  };

  // Count for tabs
  const activeCount = allProjects.filter((p) => p.status !== 'Demos').length;
  const demoCount = allProjects.filter((p) => p.status === 'Demos').length;

  // Type filter toggle
  const toggleTypeFilter = (type: ProjectType) => {
    setTypeFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <>
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as typeof statusTab)}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              All
              <span className="rounded-full bg-secondary px-1.5 text-[10px] font-medium">
                {allProjects.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-1.5">
              Active
              <span className="rounded-full bg-secondary px-1.5 text-[10px] font-medium">
                {activeCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="demos" className="gap-1.5">
              Demos
              <span className="rounded-full bg-secondary px-1.5 text-[10px] font-medium">
                {demoCount}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full pl-9 sm:w-64"
            />
          </div>

          {/* Type filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Type</span>
                {typeFilters.length > 0 && (
                  <span className="rounded-full bg-qualia-500/20 px-1.5 text-[10px] font-medium text-qualia-400">
                    {typeFilters.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Project Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(PROJECT_TYPE_CONFIG) as ProjectType[]).map((type) => {
                const config = PROJECT_TYPE_CONFIG[type];
                const Icon = config.icon;
                return (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={typeFilters.includes(type)}
                    onCheckedChange={() => toggleTypeFilter(type)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', config.color)} />
                      <span>{config.label}</span>
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-7 w-7 p-0', viewMode === 'grid' && 'bg-background shadow-sm')}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-7 w-7 p-0', viewMode === 'list' && 'bg-background shadow-sm')}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Projects */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <div className="mb-3 rounded-xl bg-secondary/50 p-4">
            <Folder className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No projects found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {searchQuery || typeFilters.length > 0
              ? 'Try adjusting your filters'
              : 'Create a new project to get started'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onProjectClick={project.status === 'Demos' ? handleProjectClick : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* List header */}
          <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
            <div className="w-8" /> {/* Avatar space */}
            <div className="flex-1">Name</div>
            <div className="hidden w-20 sm:block">Status</div>
            <div className="hidden w-28 md:block">Lead</div>
            <div className="hidden w-24 lg:block">Progress</div>
            <div className="hidden w-20 text-right xl:block">Target</div>
            <div className="w-4" /> {/* Chevron space */}
          </div>
          {filteredProjects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              onProjectClick={project.status === 'Demos' ? handleProjectClick : undefined}
            />
          ))}
        </div>
      )}

      <DemoSheet demo={selectedDemo} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
