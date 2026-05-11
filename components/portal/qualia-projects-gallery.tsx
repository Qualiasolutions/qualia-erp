'use client';

import { memo, useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  LayoutGrid,
  List,
  AlertTriangle,
  Columns3,
  Beaker,
  Hammer,
  ClipboardCheck,
  Rocket,
  FolderOpen,
  CheckCircle2,
  Archive,
  Ban,
  MoreHorizontal,
  Check,
  ChevronDown,
  Trash2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { PROJECT_TYPE_CONFIG } from '@/lib/project-type-config';
import { AvatarStack, type AvatarStackPerson } from '@/components/ui/avatar-stack';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { hueFromId } from '@/lib/color-constants';
import {
  setProjectPipelineStage,
  updateProjectStatus,
  deleteProject,
} from '@/app/actions/projects';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ProjectType } from '@/types/database';

/* ======================================================================
   Types
   ====================================================================== */

export interface GalleryProject {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  target_date: string | null;
  project_type: ProjectType | string | null;
  client_id: string | null;
  client_name: string | null;
  logo_url: string | null;
  issue_stats: { total: number; done: number };
  roadmap_progress: number;
  is_pre_production: boolean;
  team?: { id: string; full_name: string | null; avatar_url: string | null }[];
}

type ViewMode = 'columns' | 'gallery' | 'list';
type FilterMode = 'all' | 'active' | 'attention' | 'launched';

type StageKey = 'demo' | 'building' | 'preProduction' | 'live';

interface StageStyle {
  title: string;
  icon: typeof Beaker;
  accent: string;
  bg: string;
  ring: string;
  /** Solid color for the card accent tape — one unified hue per column. */
  headerBg: string;
  /** Tailwind class for the progress bar fill — matches headerBg. */
  progressBg: string;
  /** Stroke color class for the SVG circular progress ring. */
  progressStroke: string;
}

const STAGE_CONFIG: Record<StageKey, StageStyle> = {
  demo: {
    title: 'Demos',
    icon: Beaker,
    accent: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10',
    ring: 'ring-sky-500/20',
    headerBg: 'bg-sky-500',
    progressBg: 'bg-sky-500',
    progressStroke: 'stroke-sky-500',
  },
  building: {
    title: 'Building',
    icon: Hammer,
    accent: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
    ring: 'ring-purple-500/20',
    headerBg: 'bg-purple-500',
    progressBg: 'bg-purple-500',
    progressStroke: 'stroke-purple-500',
  },
  preProduction: {
    title: 'Pre-Prod',
    icon: ClipboardCheck,
    accent: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
    headerBg: 'bg-amber-500',
    progressBg: 'bg-amber-500',
    progressStroke: 'stroke-amber-500',
  },
  live: {
    title: 'Live',
    icon: Rocket,
    accent: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
    headerBg: 'bg-emerald-500',
    progressBg: 'bg-emerald-500',
    progressStroke: 'stroke-emerald-500',
  },
};

/** Fallback style for projects with no active stage (Done / Archived / Canceled). */
const FALLBACK_STAGE_STYLE = {
  headerBg: 'bg-muted-foreground/40',
  progressBg: 'bg-muted-foreground/50',
  progressStroke: 'stroke-muted-foreground/50',
} as const;

function getStage(project: GalleryProject): StageKey | null {
  if (project.status === 'Demos') return 'demo';
  if (project.status === 'Launched') return 'live';
  if (project.status === 'Active' || project.status === 'Delayed') {
    return project.is_pre_production ? 'preProduction' : 'building';
  }
  return null; // Done, Archived, Canceled
}

/** Archived + Canceled live in their own container — separated from the
 *  Finished (Done) container so a healthy wrap-up doesn't mix with projects
 *  we shelved or dropped. */
function isArchived(project: GalleryProject): boolean {
  return project.status === 'Archived' || project.status === 'Canceled';
}

interface QualiaProjectsGalleryProps {
  projects: GalleryProject[];
  isAdmin?: boolean;
  expandTerminalGroups?: boolean;
  /** Client-portal view — fewer projects, so render larger, more spacious cards. */
  clientView?: boolean;
}

/* ======================================================================
   Pipeline stage menu items — shared between card and list views
   ====================================================================== */

type PipelineStage = 'Demos' | 'Building' | 'Pre-Production' | 'Live';

const PIPELINE_STAGES: { label: string; value: PipelineStage; icon: typeof Beaker }[] = [
  { label: 'Demos', value: 'Demos', icon: Beaker },
  { label: 'Building', value: 'Building', icon: Hammer },
  { label: 'Pre-Production', value: 'Pre-Production', icon: ClipboardCheck },
  { label: 'Live', value: 'Live', icon: Rocket },
];

/** Derive the current pipeline stage label from project data. */
function getCurrentStage(project: GalleryProject): PipelineStage | null {
  if (project.status === 'Demos') return 'Demos';
  if (project.status === 'Launched') return 'Live';
  if (project.status === 'Active' || project.status === 'Delayed') {
    return project.is_pre_production ? 'Pre-Production' : 'Building';
  }
  return null;
}

/* ======================================================================
   Helpers
   ====================================================================== */

/** Get the column-based style for a project — one unified accent per pipeline stage. */
function getProjectStyle(project: GalleryProject): {
  headerBg: string;
  progressBg: string;
  progressStroke: string;
} {
  const stage = getStage(project);
  if (!stage) return FALLBACK_STAGE_STYLE;
  const config = STAGE_CONFIG[stage];
  return {
    headerBg: config.headerBg,
    progressBg: config.progressBg,
    progressStroke: config.progressStroke,
  };
}

/** Get type label from PROJECT_TYPE_CONFIG. */
function getTypeLabel(projectType: ProjectType | string | null): string {
  if (!projectType) return 'Project';
  const config = PROJECT_TYPE_CONFIG[projectType as ProjectType];
  return config?.label ?? 'Project';
}

/** Map team members to AvatarStackPerson. */
function teamToAvatars(
  team: { id: string; full_name: string | null; avatar_url: string | null }[] | undefined
): AvatarStackPerson[] {
  if (!team || team.length === 0) return [];
  return team.map((m) => {
    const initials =
      (m.full_name ?? '??')
        .split(/\s+/)
        .map((s) => s.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('') || '??';
    return { id: m.id, initials, hue: hueFromId(m.id) };
  });
}

/** Compute progress percentage (0-100) from issue_stats or roadmap_progress. */
function getProgress(project: GalleryProject): number {
  if (project.roadmap_progress > 0) return Math.round(project.roadmap_progress * 100);
  if (project.issue_stats.total > 0) {
    return Math.round((project.issue_stats.done / project.issue_stats.total) * 100);
  }
  return 0;
}

/** Check if project needs attention. */
function needsAttention(project: GalleryProject): boolean {
  if (project.status === 'Delayed') return true;
  if (project.target_date) {
    const target = new Date(project.target_date);
    const now = new Date();
    if (target < now) return true;
  }
  return false;
}

/** Count unique clients. */
function countClients(projects: GalleryProject[]): number {
  const ids = new Set(projects.map((p) => p.client_id).filter(Boolean));
  return ids.size;
}

/** Generate summary text. */
function generateSummary(projects: GalleryProject[]): string {
  const clientCount = countClients(projects);
  const inFlight = projects.length;
  const attentionProjects = projects.filter(needsAttention);

  let text = `${inFlight} in flight across ${clientCount} client${clientCount !== 1 ? 's' : ''}.`;

  if (attentionProjects.length > 0) {
    const firstName = attentionProjects[0].name;
    text += ` ${firstName} needs attention`;
    if (attentionProjects.length > 1) {
      text += ` (+${attentionProjects.length - 1} more)`;
    }
    text += '.';
  } else {
    // Find nearest due date
    const withDue = projects
      .filter((p) => p.target_date)
      .sort((a, b) => new Date(a.target_date!).getTime() - new Date(b.target_date!).getTime());
    if (withDue.length > 0) {
      const nearest = withDue[0];
      text += ` ${nearest.name} ships next.`;
    }
  }

  return text;
}

/* ======================================================================
   Stage Dropdown (admin only)
   ====================================================================== */

type TerminalStatus = 'Done' | 'Archived' | 'Canceled';

const TERMINAL_STATUSES: { label: string; value: TerminalStatus; icon: typeof Beaker }[] = [
  { label: 'Finished', value: 'Done', icon: CheckCircle2 },
  { label: 'Archived', value: 'Archived', icon: Archive },
  { label: 'Canceled', value: 'Canceled', icon: Ban },
];

function StageDropdown({
  project,
  trigger,
}: {
  project: GalleryProject;
  /** Optional custom trigger. Defaults to the floating "..." button used on
   *  pipeline cards. The Finished/Archived rows pass their own inline trigger. */
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currentStage = getCurrentStage(project);
  const currentStatus = project.status;

  function handleStageChange(stage: PipelineStage) {
    if (stage === currentStage) return;
    startTransition(async () => {
      const result = await setProjectPipelineStage(project.id, stage);
      if (result.success) {
        toast.success(`Moved "${project.name}" to ${stage}`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update stage');
      }
    });
  }

  function handleTerminalChange(status: TerminalStatus, label: string) {
    if (status === currentStatus) return;
    startTransition(async () => {
      const result = await updateProjectStatus(project.id, status);
      if (result.success) {
        toast.success(`Moved "${project.name}" to ${label}`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (result.success) {
        toast.success(`Deleted "${project.name}"`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete project');
      }
    });
  }

  const defaultTrigger = (
    <button
      type="button"
      className={cn(
        'absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md',
        'bg-card/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-all duration-150',
        'hover:bg-muted hover:text-foreground',
        'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        'group-hover:opacity-100',
        'cursor-pointer',
        isPending && 'pointer-events-none opacity-50'
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      aria-label={`Move ${project.name} to another stage`}
    >
      <MoreHorizontal className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger ?? defaultTrigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Move to stage
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PIPELINE_STAGES.map((s) => {
            const isCurrent = s.value === currentStage;
            const Icon = s.icon;
            return (
              <DropdownMenuItem
                key={s.value}
                disabled={isCurrent}
                className={cn('cursor-pointer gap-2 text-xs', isCurrent && 'opacity-50')}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleStageChange(s.value);
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
                {isCurrent && <Check className="ml-auto h-3 w-3 text-primary" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Close out
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {TERMINAL_STATUSES.map((s) => {
            const isCurrent = s.value === currentStatus;
            const Icon = s.icon;
            return (
              <DropdownMenuItem
                key={s.value}
                disabled={isCurrent}
                className={cn('cursor-pointer gap-2 text-xs', isCurrent && 'opacity-50')}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTerminalChange(s.value, s.label);
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
                {isCurrent && <Check className="ml-auto h-3 w-3 text-primary" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirmDelete(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(false)}
        title={`Delete "${project.name}"?`}
        description="This permanently deletes the project, its phases, tasks, and uploads. This cannot be undone."
        confirmLabel="Delete project"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}

/* ======================================================================
   Gallery Card
   ====================================================================== */

/** Compact circular progress ring — used at the left of every pipeline card.
 *  Inner content: project/client logo if present, otherwise the project's
 *  initial as a fallback glyph. The progress percentage shows on hover via
 *  title-attribute tooltip — keeps the visual lean while preserving info. */
function ProgressRing({
  value,
  size = 36,
  strokeWidth = 2.5,
  strokeClass,
  logoUrl,
  fallbackInitial,
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  strokeClass: string;
  logoUrl: string | null;
  fallbackInitial: string;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const innerSize = size - strokeWidth * 2 - 4;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      title={`${value}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-border/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('fill-none transition-all duration-500', strokeClass)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" aria-label={label}>
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt=""
            aria-hidden
            width={innerSize}
            height={innerSize}
            className="rounded-full object-cover"
            style={{ width: innerSize, height: innerSize }}
            unoptimized
          />
        ) : (
          <span
            className="flex items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-muted-foreground"
            style={{ width: innerSize, height: innerSize }}
            aria-hidden
          >
            {fallbackInitial}
          </span>
        )}
      </div>
    </div>
  );
}

const ProjectCardTile = memo(function ProjectCardTile({
  project,
  isAdmin,
  clientView,
}: {
  project: GalleryProject;
  isAdmin?: boolean;
  clientView?: boolean;
}) {
  const { progressStroke } = getProjectStyle(project);
  const progress = getProgress(project);
  const typeLabel = getTypeLabel(project.project_type);
  const typeStyle = project.project_type
    ? PROJECT_TYPE_CONFIG[project.project_type as ProjectType]
    : null;
  const typeColor = typeStyle?.color ?? 'text-muted-foreground';
  const avatars = useMemo(() => teamToAvatars(project.team), [project.team]);
  const attention = needsAttention(project);

  return (
    <div className="group relative">
      <Link
        href={`/projects/${project.id}`}
        className={cn(
          'relative flex items-center border border-border bg-card/60',
          'transition-all duration-200 ease-premium',
          'hover:border-primary/30 hover:bg-card hover:shadow-[var(--elevation-resting)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'cursor-pointer',
          clientView
            ? 'gap-4 rounded-2xl px-5 py-4 shadow-[0_1px_2px_0_hsl(var(--border)/0.5)]'
            : 'gap-3 rounded-lg px-3 py-2.5'
        )}
      >
        {/* Left: circular progress ring with project/client logo inside */}
        <ProgressRing
          value={progress}
          size={clientView ? 56 : 36}
          strokeWidth={clientView ? 3 : 2.5}
          strokeClass={progressStroke}
          logoUrl={project.logo_url}
          fallbackInitial={(project.name?.charAt(0) ?? '?').toUpperCase()}
          label={`${project.name} — ${progress}% complete`}
        />

        {/* Center: name (top) + type label (bottom) */}
        <div className={cn('flex min-w-0 flex-1 flex-col', clientView ? 'gap-1.5' : 'gap-0.5')}>
          <div className="flex items-center gap-1.5">
            <h3
              className={cn(
                'truncate font-semibold leading-tight text-foreground',
                clientView ? 'text-[16px]' : 'text-sm'
              )}
            >
              {project.name}
            </h3>
            {attention && (
              <AlertTriangle
                className={cn('shrink-0 text-amber-500', clientView ? 'h-4 w-4' : 'h-3 w-3')}
                aria-label="Needs attention"
              />
            )}
          </div>
          <span
            className={cn(
              'font-mono font-semibold uppercase tracking-wider',
              typeColor,
              clientView ? 'text-[10.5px]' : 'text-[9px]'
            )}
          >
            {typeLabel}
          </span>
          {clientView && (
            <span className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground/80">
              {progress}% complete
            </span>
          )}
        </div>

        {/* Right: avatars (admin dropdown overlaps via absolute positioning on the wrapper) */}
        {avatars.length > 0 && (
          <div className={cn('shrink-0', clientView ? 'pr-2' : 'pr-6')}>
            <AvatarStack people={avatars} size={clientView ? 26 : 20} max={3} />
          </div>
        )}
      </Link>

      {/* Admin stage dropdown — lives outside the <Link> so the trigger
          button isn't nested inside an <a>, which broke Radix click handling
          in some browsers and caused the status menu to never open. */}
      {isAdmin && <StageDropdown project={project} />}
    </div>
  );
});

/* ======================================================================
   List Row
   ====================================================================== */

const ProjectListRow = memo(function ProjectListRow({ project }: { project: GalleryProject }) {
  const { headerBg } = getProjectStyle(project);
  const progress = getProgress(project);
  const typeLabel = getTypeLabel(project.project_type);
  const avatars = useMemo(() => teamToAvatars(project.team), [project.team]);
  const attention = needsAttention(project);

  const dueStr = project.target_date ? format(new Date(project.target_date), 'dd MMM') : '\u2014';

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group grid min-w-[600px] items-center gap-3 rounded-lg px-4 py-3',
        'border border-transparent transition-all duration-150',
        'hover:border-border hover:bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'cursor-pointer'
      )}
      style={{
        gridTemplateColumns: '24px 1.5fr 1fr 120px 100px 80px',
      }}
    >
      {/* Accent dot — stage color */}
      <span className={cn('h-2.5 w-2.5 rounded-full', headerBg)} aria-hidden />

      {/* Name + kind */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{project.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">
              {typeLabel}
            </span>
            {attention && <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />}
          </div>
        </div>
      </div>

      {/* Phase/status */}
      <div className="truncate text-xs text-muted-foreground">
        {project.is_pre_production ? 'Pre-Production' : project.status}
      </div>

      {/* Avatar stack */}
      <div className="flex justify-center">
        <AvatarStack people={avatars} size={20} max={3} />
      </div>

      {/* Due date */}
      <div className="q-tabular text-center font-mono text-[11px] text-muted-foreground">
        {dueStr}
      </div>

      {/* Percentage */}
      <div className="text-right">
        <span className="q-tabular font-mono text-[12px] font-medium text-foreground">
          {progress}%
        </span>
      </div>
    </Link>
  );
});

/* ======================================================================
   Main Gallery Export
   ====================================================================== */

export function QualiaProjectsGallery({
  projects,
  isAdmin,
  expandTerminalGroups,
  clientView,
}: QualiaProjectsGalleryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('columns');
  const [filter, setFilter] = useState<FilterMode>('all');

  // Filter projects based on current filter mode
  const filteredProjects = useMemo(() => {
    switch (filter) {
      case 'active':
        return projects.filter(
          (p) => (p.status === 'Active' || p.status === 'Delayed') && !p.is_pre_production
        );
      case 'attention':
        return projects.filter(needsAttention);
      case 'launched':
        return projects.filter((p) => p.status === 'Launched');
      case 'all':
      default:
        return projects;
    }
  }, [projects, filter]);

  // Group filteredProjects into the 4 pipeline stages for the columns view
  const stages = useMemo(() => {
    const groups: Record<StageKey, GalleryProject[]> = {
      demo: [],
      building: [],
      preProduction: [],
      live: [],
    };
    for (const p of filteredProjects) {
      const stage = getStage(p);
      if (stage) groups[stage].push(p);
    }
    return groups;
  }, [filteredProjects]);

  // Two separate archive containers under the pipeline columns:
  // - "Finished"  → Done projects
  // - "Archived"  → Archived + Canceled projects
  // Both sorted most-recent-first (target_date desc, nulls last) since the
  // schema doesn't track an explicit completed_at timestamp.
  const sortRecent = (a: GalleryProject, b: GalleryProject) => {
    const at = a.target_date ? new Date(a.target_date).getTime() : 0;
    const bt = b.target_date ? new Date(b.target_date).getTime() : 0;
    return bt - at;
  };

  const finishedProjects = useMemo(() => {
    return filteredProjects
      .filter((p) => !getStage(p) && !isArchived(p))
      .slice()
      .sort(sortRecent);
  }, [filteredProjects]);

  const archivedProjects = useMemo(() => {
    return filteredProjects.filter(isArchived).slice().sort(sortRecent);
  }, [filteredProjects]);

  const summary = useMemo(() => generateSummary(projects), [projects]);

  return (
    <div className="q-page-enter flex h-full min-h-0 w-full flex-col">
      {/* Compact toolbar — page title is already in PageHeader */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-5 py-3 lg:px-6">
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{summary}</span>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-0.5 rounded-xl border border-border bg-card/40 p-1">
          {(['all', 'active', 'attention', 'launched'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'h-8 cursor-pointer rounded-lg px-2.5 text-[11px] font-medium capitalize transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                filter === f
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
              aria-pressed={filter === f}
            >
              {f}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card/40 p-1">
          {(['columns', 'gallery', 'list'] as const).map((v) => {
            const Icon = v === 'columns' ? Columns3 : v === 'gallery' ? LayoutGrid : List;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setViewMode(v)}
                title={v === 'columns' ? 'Columns' : v === 'gallery' ? 'Gallery' : 'List'}
                className={cn(
                  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                  viewMode === v
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-pressed={viewMode === v}
                aria-label={`${v} view`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Content — fills remaining viewport */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-3 lg:px-6">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <EmptyState
              icon={FolderOpen}
              title="No projects found"
              description="No projects match the current filter."
              minimal
            />
          </div>
        ) : viewMode === 'columns' ? (
          <div className={cn('flex min-h-0 flex-1 flex-col', clientView ? 'gap-5' : 'gap-3')}>
            <StageColumns stages={stages} isAdmin={isAdmin} clientView={clientView} />
            {finishedProjects.length > 0 && (
              <FinishedRow
                projects={finishedProjects}
                isAdmin={isAdmin}
                defaultOpen={expandTerminalGroups}
                clientView={clientView}
              />
            )}
            {archivedProjects.length > 0 && (
              <ArchivedRow
                projects={archivedProjects}
                isAdmin={isAdmin}
                defaultOpen={expandTerminalGroups}
                clientView={clientView}
              />
            )}
          </div>
        ) : viewMode === 'gallery' ? (
          <div
            className="q-stagger grid gap-3 overflow-auto"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
          >
            {filteredProjects.map((project) => (
              <ProjectCardTile key={project.id} project={project} isAdmin={isAdmin} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <div
              className="sticky top-0 grid min-w-[600px] items-center gap-3 border-b border-border bg-muted/20 px-4 py-2.5"
              style={{ gridTemplateColumns: '24px 1.5fr 1fr 120px 100px 80px' }}
            >
              <span />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Project
              </span>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Status
              </span>
              <span className="text-center font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Team
              </span>
              <span className="text-center font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Due
              </span>
              <span className="text-right font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Progress
              </span>
            </div>
            <div className="divide-y divide-border/50">
              {filteredProjects.map((project) => (
                <ProjectListRow key={project.id} project={project} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ======================================================================
   StageColumns — 4-column pipeline
   ====================================================================== */

function StageColumns({
  stages,
  isAdmin,
  clientView,
}: {
  stages: Record<StageKey, GalleryProject[]>;
  isAdmin?: boolean;
  clientView?: boolean;
}) {
  const order: StageKey[] = ['demo', 'building', 'preProduction', 'live'];
  return (
    <div
      className={cn(
        'grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
        clientView ? 'gap-5' : 'gap-3'
      )}
    >
      {order.map((key) => (
        <StageColumn
          key={key}
          stage={key}
          projects={stages[key]}
          isAdmin={isAdmin}
          clientView={clientView}
        />
      ))}
    </div>
  );
}

function StageColumn({
  stage,
  projects,
  isAdmin,
  clientView,
}: {
  stage: StageKey;
  projects: GalleryProject[];
  isAdmin?: boolean;
  clientView?: boolean;
}) {
  const config = STAGE_CONFIG[stage];
  const Icon = config.icon;

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden border border-border/60 bg-muted/10',
        clientView
          ? 'rounded-2xl bg-card/50 shadow-[0_1px_0_0_hsl(var(--border)/0.4)]'
          : 'rounded-xl'
      )}
    >
      <header
        className={cn(
          'flex shrink-0 items-center gap-2',
          clientView ? 'border-b border-border/40 bg-muted/20 px-5 py-4' : 'px-3 py-2.5'
        )}
      >
        <Icon className={cn(clientView ? 'h-5 w-5' : 'h-3.5 w-3.5', config.accent)} aria-hidden />
        <h2
          className={cn(
            'font-semibold tracking-tight text-foreground',
            clientView ? 'text-[15px]' : 'text-xs'
          )}
        >
          {config.title}
        </h2>
        {projects.length > 0 && (
          <span
            className={cn(
              'ml-auto font-mono tabular-nums text-muted-foreground',
              clientView ? 'text-[12px]' : 'text-[10px]'
            )}
          >
            {projects.length}
          </span>
        )}
      </header>

      <div
        className={cn(
          'flex flex-1 flex-col overflow-y-auto',
          clientView ? 'gap-3 px-3 pb-3 pt-3' : 'gap-2 px-2 pb-2'
        )}
      >
        {projects.length === 0 ? (
          <div
            className={cn(
              'flex flex-1 flex-col items-center justify-center text-center',
              clientView ? 'py-12' : 'py-8'
            )}
          >
            <CheckCircle2
              className={cn('mb-2 text-muted-foreground/40', clientView ? 'h-7 w-7' : 'h-5 w-5')}
              aria-hidden
              strokeWidth={1.5}
            />
            <p
              className={cn('text-muted-foreground/70', clientView ? 'text-[13px]' : 'text-[11px]')}
            >
              No projects
            </p>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCardTile
              key={project.id}
              project={project}
              isAdmin={isAdmin}
              clientView={clientView}
            />
          ))
        )}
      </div>
    </section>
  );
}

/* ======================================================================
   FinishedRow — Done projects (teal primary accent)
   ArchivedRow — Archived / Canceled projects (muted/gray accent)
   Both share the same compact item layout.
   ====================================================================== */

function FinishedRow({
  projects,
  isAdmin,
  defaultOpen = false,
}: {
  projects: GalleryProject[];
  isAdmin?: boolean;
  defaultOpen?: boolean;
  clientView?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="shrink-0 overflow-hidden rounded-xl border border-border bg-card ring-1 ring-inset ring-primary/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="finished-projects-list"
        className="flex w-full cursor-pointer items-center gap-2 border-b border-border bg-primary/5 px-3 py-1.5 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10"
          aria-hidden
        >
          <CheckCircle2 className="h-3 w-3 text-primary" />
        </span>
        <h2 className="text-xs font-semibold tracking-tight text-foreground">Finished</h2>
        <span className="ml-auto inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
          {projects.length}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-primary/70 transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          id="finished-projects-list"
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
        >
          {projects.map((p) => (
            <FinishedRowItem key={p.id} project={p} isAdmin={isAdmin} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Inline trigger used on Finished + Archived rows. Opens the same
 *  StageDropdown that pipeline cards use, so admins can move terminated
 *  projects to ANY state (or delete) instead of being stuck with a single
 *  "back to Building" hammer. */
function ProjectMenuTrigger({ project }: { project: GalleryProject }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      title={`Manage "${project.name}"`}
      aria-label={`Manage ${project.name}`}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md',
        'bg-muted/60 text-muted-foreground opacity-0 transition-all duration-150',
        'hover:bg-primary/15 hover:text-primary focus-visible:opacity-100',
        'group-hover/projrow:opacity-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
      )}
    >
      <MoreHorizontal className="h-3 w-3" />
    </button>
  );
}

function FinishedRowItem({ project, isAdmin }: { project: GalleryProject; isAdmin?: boolean }) {
  const typeLabel = getTypeLabel(project.project_type);
  return (
    <li className="group/projrow relative">
      <Link
        href={`/projects/${project.id}`}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 transition-colors duration-150',
          'hover:bg-primary/5 focus-visible:bg-primary/5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0',
          isAdmin && 'pr-9'
        )}
        title={`${project.name} · ${project.status}`}
      >
        {project.logo_url ? (
          <Image
            src={project.logo_url}
            alt=""
            aria-hidden
            width={16}
            height={16}
            className="h-4 w-4 shrink-0 rounded-full object-cover ring-1 ring-border"
            unoptimized
          />
        ) : (
          <span
            className="h-4 w-4 shrink-0 rounded-full bg-muted-foreground/20 ring-1 ring-border"
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
          {project.name}
        </span>
        <span className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          {typeLabel}
        </span>
      </Link>
      {isAdmin && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <StageDropdown project={project} trigger={<ProjectMenuTrigger project={project} />} />
        </div>
      )}
    </li>
  );
}

function ArchivedRow({
  projects,
  isAdmin,
  defaultOpen = false,
}: {
  projects: GalleryProject[];
  isAdmin?: boolean;
  defaultOpen?: boolean;
  clientView?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="shrink-0 overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="archived-projects-list"
        className="flex w-full cursor-pointer items-center gap-2 border-b border-border bg-muted/30 px-3 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md bg-muted-foreground/10"
          aria-hidden
        >
          <Archive className="h-3 w-3 text-muted-foreground" />
        </span>
        <h2 className="text-xs font-semibold tracking-tight text-muted-foreground">Archived</h2>
        <span className="ml-auto inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-muted-foreground/10 px-1.5 text-[10px] font-semibold text-muted-foreground">
          {projects.length}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          id="archived-projects-list"
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
        >
          {projects.map((p) => (
            <ArchivedRowItem key={p.id} project={p} isAdmin={isAdmin} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ArchivedRowItem({ project, isAdmin }: { project: GalleryProject; isAdmin?: boolean }) {
  const typeLabel = getTypeLabel(project.project_type);
  return (
    <li className="group/projrow relative">
      <Link
        href={`/projects/${project.id}`}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 transition-colors duration-150',
          'text-muted-foreground opacity-80 hover:opacity-100',
          'hover:bg-muted/30 focus-visible:bg-muted/30',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0',
          isAdmin && 'pr-9'
        )}
        title={`${project.name} · ${project.status}`}
      >
        {project.logo_url ? (
          <Image
            src={project.logo_url}
            alt=""
            aria-hidden
            width={16}
            height={16}
            className="h-4 w-4 shrink-0 rounded-full object-cover opacity-70 ring-1 ring-border grayscale"
            unoptimized
          />
        ) : (
          <span
            className="h-4 w-4 shrink-0 rounded-full bg-muted-foreground/15 ring-1 ring-border"
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{project.name}</span>
        <span className="shrink-0 rounded bg-muted/60 px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider">
          {typeLabel}
        </span>
      </Link>
      {isAdmin && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <StageDropdown project={project} trigger={<ProjectMenuTrigger project={project} />} />
        </div>
      )}
    </li>
  );
}
