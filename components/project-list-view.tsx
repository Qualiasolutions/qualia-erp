'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Folder,
  Building,
  Sparkles,
  ExternalLink,
  MoreVertical,
  Trash2,
  Inbox,
  Beaker,
  Hammer,
  Rocket,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Github,
} from 'lucide-react';
import { PROJECT_TYPE_CONFIG } from '@/lib/project-type-config';
import { cn } from '@/lib/utils';
import { useAdminContext } from '@/components/admin-provider';
import { deleteProject, updateProjectStatus, toggleProjectPreProduction } from '@/app/actions';
import { invalidateProjectStats } from '@/lib/swr';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EntityAvatar } from '@/components/entity-avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ProjectData } from '@/app/projects/page';

// Project type configuration — imported from shared module

// Stage move options
const STAGE_MOVES = [
  { label: 'Move to Demo', status: 'Demos', icon: Beaker, color: 'text-violet-500' },
  { label: 'Move to Building', status: 'Active', icon: Hammer, color: 'text-emerald-500' },
  { label: 'Mark as Live', status: 'Launched', icon: Rocket, color: 'text-sky-500' },
  { label: 'Mark as Done', status: 'Done', icon: CheckCircle2, color: 'text-teal-500' },
  { label: 'Archive', status: 'Archived', icon: Archive, color: 'text-muted-foreground' },
] as const;

function ProjectRow({
  project,
  compact = false,
  onProjectClick,
}: {
  project: ProjectData;
  compact?: boolean;
  onProjectClick?: (project: ProjectData) => void;
}) {
  const { isSuperAdmin } = useAdminContext();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
  const isDone = project.status === 'Done';
  const isPartnership = project.metadata?.is_partnership;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (result.success) {
        invalidateProjectStats(true);
        router.refresh();
      } else {
        alert(result.error || 'Failed to delete project');
      }
    });
  };

  const handleStageMove = (e: React.MouseEvent, newStatus: string) => {
    e.preventDefault();
    e.stopPropagation();

    startTransition(async () => {
      const result = await updateProjectStatus(project.id, newStatus);
      if (result.success) {
        invalidateProjectStats(true);
      } else {
        alert(result.error || 'Failed to move project');
      }
    });
  };

  const handlePreProductionToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    startTransition(async () => {
      const result = await toggleProjectPreProduction(project.id);
      if (result.success) {
        invalidateProjectStats(true);
      } else {
        alert(result.error || 'Failed to toggle pre-production');
      }
    });
  };

  const handleClick = () => {
    if (onProjectClick) {
      onProjectClick(project);
    } else {
      router.push(`/projects/${project.id}`);
    }
  };

  // Filter out the current stage from move options
  const currentStatusMap: Record<string, string> = {
    Demos: 'Demos',
    Active: 'Active',
    Delayed: 'Active',
    Launched: 'Launched',
    Done: 'Done',
    Archived: 'Archived',
    Canceled: 'Archived',
  };
  const currentMapped = currentStatusMap[project.status] || project.status;
  const availableMoves = STAGE_MOVES.filter((m) => m.status !== currentMapped);
  const isActiveOrDelayed = ['Active', 'Delayed'].includes(project.status);

  // Compact row for dense display
  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={cn(
          'group relative flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-2.5 transition-all duration-200',
          isDone
            ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10'
            : 'bg-card/40 hover:border-primary/20 hover:bg-card hover:shadow-sm',
          !isDone && (isPartnership ? 'border-orange-500/30' : 'border-border'),
          isComplete && !isDone && 'opacity-40',
          isPending && 'pointer-events-none opacity-50'
        )}
      >
        {/* Project Logo/Avatar */}
        <EntityAvatar
          src={project.logo_url}
          fallbackIcon={<TypeIcon className="h-3.5 w-3.5" />}
          fallbackBgColor={typeConfig?.bg || 'bg-muted'}
          fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
          size="md"
          className="transition-transform duration-200 group-hover:scale-105"
        />

        {/* Name + client */}
        <div className="min-w-0 flex-1">
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium leading-snug text-foreground">
                {project.name}
              </span>
              {isPartnership && <span className="text-xs">🤝</span>}
              {project.has_github && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Github className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    GitHub linked
                  </TooltipContent>
                </Tooltip>
              )}
              {project.has_github && ['Active', 'Delayed'].includes(project.status) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Auto-assignment active
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
          {project.client_name && (
            <span className="block truncate text-xs text-muted-foreground">
              {project.client_name}
            </span>
          )}
        </div>

        {/* Team avatars */}
        {project.team && project.team.length > 0 && (
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-shrink-0 -space-x-1.5">
              {project.team.slice(0, 3).map((member) => (
                <Tooltip key={member.id}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5 ring-1 ring-card">
                      <AvatarImage src={member.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-[8px] font-medium text-primary">
                        {member.full_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {member.full_name || 'Unknown'}
                  </TooltipContent>
                </Tooltip>
              ))}
              {project.team.length > 3 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[8px] font-medium text-muted-foreground ring-1 ring-card">
                  +{project.team.length - 3}
                </div>
              )}
            </div>
          </TooltipProvider>
        )}

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
                className={isComplete ? 'text-emerald-500' : 'text-primary'}
              />
            </svg>
          </div>
        )}

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-all hover:bg-secondary hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isActiveOrDelayed && (
              <DropdownMenuItem className="text-amber-500" onClick={handlePreProductionToggle}>
                <ClipboardCheck className="mr-2 h-3.5 w-3.5" />
                {project.is_pre_production ? 'Move to Building' : 'Move to Pre-Production'}
              </DropdownMenuItem>
            )}
            {availableMoves.map((move) => {
              const MoveIcon = move.icon;
              return (
                <DropdownMenuItem
                  key={move.status}
                  className={move.color}
                  onClick={(e) => handleStageMove(e, move.status)}
                >
                  <MoveIcon className="mr-2 h-3.5 w-3.5" />
                  {move.label}
                </DropdownMenuItem>
              );
            })}
            {isSuperAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete project?"
          description="This will also delete all tasks. This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={confirmDelete}
        />
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all duration-200',
        isDone
          ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/5'
          : 'bg-card hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20',
        !isDone &&
          (isPartnership ? 'border-orange-500/40' : 'border-border hover:border-primary/30'),
        isComplete && !isDone && 'opacity-60',
        isPending && 'pointer-events-none opacity-50'
      )}
    >
      {/* Project Logo/Avatar */}
      <EntityAvatar
        src={project.logo_url}
        fallbackIcon={<TypeIcon className="h-4 w-4" />}
        fallbackBgColor={typeConfig?.bg || 'bg-muted'}
        fallbackIconColor={typeConfig?.color || 'text-muted-foreground'}
        size="md"
        className="flex-shrink-0"
      />

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${project.id}`}
            className="truncate text-base font-semibold text-foreground transition-colors hover:text-primary"
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-secondary hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isActiveOrDelayed && (
            <DropdownMenuItem className="text-amber-500" onClick={handlePreProductionToggle}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              {project.is_pre_production ? 'Move to Building' : 'Move to Pre-Production'}
            </DropdownMenuItem>
          )}
          {availableMoves.map((move) => {
            const MoveIcon = move.icon;
            return (
              <DropdownMenuItem
                key={move.status}
                className={move.color}
                onClick={(e) => handleStageMove(e, move.status)}
              >
                <MoveIcon className="mr-2 h-4 w-4" />
                {move.label}
              </DropdownMenuItem>
            );
          })}
          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete project
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete project?"
        description="This will also delete all tasks. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

interface ProjectListViewProps {
  projects: ProjectData[];
  horizontal?: boolean;
  compact?: boolean;
  onProjectClick?: (project: ProjectData) => void;
}

export function ProjectListView({
  projects,
  horizontal = false,
  compact = false,
  onProjectClick,
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
            <ProjectRow project={project} compact onProjectClick={onProjectClick} />
          </div>
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="grid grid-cols-1 gap-2">
        {sortedProjects.map((project) => (
          <ProjectRow key={project.id} project={project} compact onProjectClick={onProjectClick} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {sortedProjects.map((project) => (
        <ProjectRow key={project.id} project={project} compact onProjectClick={onProjectClick} />
      ))}
    </div>
  );
}
