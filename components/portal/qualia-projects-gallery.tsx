'use client';

import { memo, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  LayoutGrid,
  List,
  AlertTriangle,
  Columns3,
  Beaker,
  Hammer,
  ClipboardCheck,
  Rocket,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { PROJECT_TYPE_CONFIG, type ProjectTypeStyle } from '@/lib/project-type-config';
import { AvatarStack, type AvatarStackPerson } from '@/components/ui/avatar-stack';
import { hueFromId, clientAccent, clientAccentGradient } from '@/lib/color-constants';
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

const STAGE_CONFIG: Record<
  StageKey,
  { title: string; icon: typeof Beaker; accent: string; bg: string; ring: string }
> = {
  demo: {
    title: 'Demos',
    icon: Beaker,
    accent: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
    ring: 'ring-violet-500/20',
  },
  building: {
    title: 'Building',
    icon: Hammer,
    accent: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
  },
  preProduction: {
    title: 'Pre-Production',
    icon: ClipboardCheck,
    accent: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
  },
  live: {
    title: 'Live',
    icon: Rocket,
    accent: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10',
    ring: 'ring-sky-500/20',
  },
};

function getStage(project: GalleryProject): StageKey | null {
  if (project.status === 'Demos') return 'demo';
  if (project.status === 'Launched') return 'live';
  if (project.status === 'Active' || project.status === 'Delayed') {
    return project.is_pre_production ? 'preProduction' : 'building';
  }
  return null; // Done, Archived, Canceled
}

interface QualiaProjectsGalleryProps {
  projects: GalleryProject[];
}

/* ======================================================================
   Helpers
   ====================================================================== */

/** Get the accent color for a project (uses project_type config, fallback to client-id hue). */
function getProjectAccent(project: GalleryProject): { hue: number; gradient: string } {
  const typeConfig = project.project_type
    ? (PROJECT_TYPE_CONFIG[project.project_type as ProjectType] as ProjectTypeStyle | undefined)
    : null;

  // Build a hue: prefer client-based deterministic hue for variety
  const hue = project.client_id ? hueFromId(project.client_id) : hueFromId(project.id);

  // Typed projects get a slightly higher-chroma gradient; untyped fall back to a softer one.
  const gradient = typeConfig
    ? clientAccentGradient(hue)
    : `linear-gradient(135deg, oklch(55% 0.14 ${hue}) 0%, oklch(42% 0.11 ${hue}) 100%)`;

  return { hue, gradient };
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
   Editorial Header
   ====================================================================== */

function ProjectsEditorialHeader({
  projects,
  viewMode,
  setViewMode,
  filter,
  setFilter,
}: {
  projects: GalleryProject[];
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  filter: FilterMode;
  setFilter: (f: FilterMode) => void;
}) {
  const now = new Date();
  const monthYear = format(now, 'MMMM yyyy');
  const issueNo = String(now.getMonth() + 1).padStart(2, '0');
  const summary = useMemo(() => generateSummary(projects), [projects]);

  return (
    <header className="mb-7 border-b border-border pb-8 pt-6">
      <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-[2fr_1fr]">
        {/* LEFT: editorial text */}
        <div>
          <div className="q-eyebrow mb-3">
            Issue No. {issueNo} &middot; {monthYear}
          </div>
          <h1 className="q-display text-[clamp(3rem,8vw,5.5rem)] leading-[0.92] tracking-[-0.04em]">
            Projects<span className="text-primary">.</span>
          </h1>
          <p
            className="mt-4 max-w-[520px] text-[15px] leading-[1.5]"
            style={{ color: 'var(--text-soft, hsl(var(--muted-foreground)))' }}
          >
            {summary}
          </p>
        </div>

        {/* RIGHT: toggles + filters */}
        <div className="flex flex-col items-start gap-3 lg:items-end">
          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode('columns')}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
                viewMode === 'columns'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-pressed={viewMode === 'columns'}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Columns
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gallery')}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
                viewMode === 'gallery'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-pressed={viewMode === 'gallery'}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Gallery
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 'active', 'attention', 'launched'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'cursor-pointer rounded-full px-3 py-1 text-xs font-medium capitalize transition-all duration-150',
                  filter === f
                    ? 'border border-primary/20 bg-primary/10 text-primary'
                    : 'border border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                )}
                aria-pressed={filter === f}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ======================================================================
   Gallery Card
   ====================================================================== */

const ProjectCardTile = memo(function ProjectCardTile({ project }: { project: GalleryProject }) {
  const { gradient, hue } = getProjectAccent(project);
  const progress = getProgress(project);
  const typeLabel = getTypeLabel(project.project_type);
  const avatars = useMemo(() => teamToAvatars(project.team), [project.team]);
  const clientFirstWord = (project.client_name ?? 'Project').split(/\s+/)[0];
  const attention = needsAttention(project);

  const dueStr = project.target_date ? format(new Date(project.target_date), 'dd MMM') : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group relative block overflow-hidden rounded-xl border border-border bg-card',
        'ease-[cubic-bezier(0.16,1,0.3,1)] transition-all duration-200',
        'hover:border-primary/20 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]',
        'motion-safe:hover:-translate-y-[3px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'cursor-pointer'
      )}
    >
      {/* Accent tape */}
      <div className="relative h-[72px] overflow-hidden" style={{ background: gradient }}>
        {/* Logo overlay (when present) */}
        {project.logo_url && (
          <Image
            src={project.logo_url}
            alt=""
            aria-hidden
            width={48}
            height={48}
            className="absolute right-3 top-3 h-10 w-10 rounded object-contain opacity-80 mix-blend-luminosity"
            unoptimized
          />
        )}
        {/* Watermark — client first word */}
        <span
          className="absolute bottom-2 left-4 select-none text-[42px] font-semibold italic leading-none"
          style={{ color: 'rgba(255,255,255,0.2)' }}
          aria-hidden
        >
          {clientFirstWord}
        </span>
        {/* Bottom row: kind + progress */}
        <div className="absolute bottom-2 right-4 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/80">
            {typeLabel}
          </span>
          <span className="font-mono text-[12px] font-semibold tabular-nums text-white">
            {progress}%
          </span>
        </div>
        {/* Attention indicator */}
        {attention && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            <AlertTriangle className="h-3 w-3" />
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-[18px_20px_20px]">
        <h3 className="q-display truncate text-[18px] leading-[1.3] text-foreground">
          {project.name}
        </h3>
        <p className="mb-4 mt-1 truncate text-xs text-muted-foreground">
          {project.client_name ?? 'No client'}
          {project.is_pre_production ? ' \u00B7 Pre-Production' : ''}
        </p>

        {/* Progress bar */}
        <div className="mb-4 h-[3px] overflow-hidden rounded-full bg-border/30">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: clientAccent(hue, 52, 0.14),
            }}
          />
        </div>

        {/* Footer: avatars + due date */}
        <div className="flex items-center justify-between">
          <AvatarStack people={avatars} size={22} max={4} />
          {dueStr ? (
            <span className="q-tabular font-mono text-[11px] text-muted-foreground">{dueStr}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
});

/* ======================================================================
   List Row
   ====================================================================== */

const ProjectListRow = memo(function ProjectListRow({ project }: { project: GalleryProject }) {
  const { hue } = getProjectAccent(project);
  const progress = getProgress(project);
  const typeLabel = getTypeLabel(project.project_type);
  const avatars = useMemo(() => teamToAvatars(project.team), [project.team]);
  const attention = needsAttention(project);

  const dueStr = project.target_date ? format(new Date(project.target_date), 'dd MMM') : '\u2014';

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group grid items-center gap-3 rounded-lg px-4 py-3',
        'border border-transparent transition-all duration-150',
        'hover:border-border hover:bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'cursor-pointer'
      )}
      style={{
        gridTemplateColumns: '24px 1.5fr 1fr 120px 100px 80px',
      }}
    >
      {/* Accent dot */}
      <span
        className="h-2.5 w-2.5 rounded-full"
        aria-hidden
        style={{ background: clientAccent(hue, 55, 0.14) }}
      />

      {/* Name + client + kind */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{project.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">{project.client_name ?? 'No client'}</span>
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
        <span
          className="q-tabular font-mono text-[12px] font-medium"
          style={{ color: clientAccent(hue, 45, 0.12) }}
        >
          {progress}%
        </span>
      </div>
    </Link>
  );
});

/* ======================================================================
   Main Gallery Export
   ====================================================================== */

export function QualiaProjectsGallery({ projects }: QualiaProjectsGalleryProps) {
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

  return (
    <div className="q-page-enter w-full p-6 lg:p-8">
      <ProjectsEditorialHeader
        projects={projects}
        viewMode={viewMode}
        setViewMode={setViewMode}
        filter={filter}
        setFilter={setFilter}
      />

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 rounded-xl bg-muted/50 p-5">
            <LayoutGrid className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No projects match the current filter.</p>
        </div>
      ) : viewMode === 'columns' ? (
        <StageColumns stages={stages} />
      ) : viewMode === 'gallery' ? (
        <div
          className="q-stagger grid gap-[14px]"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}
        >
          {filteredProjects.map((project) => (
            <ProjectCardTile key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          {/* List header */}
          <div
            className="grid items-center gap-3 border-b border-border px-4 py-2.5"
            style={{ gridTemplateColumns: '24px 1.5fr 1fr 120px 100px 80px' }}
          >
            <span />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Project
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </span>
            <span className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Team
            </span>
            <span className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Due
            </span>
            <span className="text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Progress
            </span>
          </div>
          {/* List rows */}
          <div className="divide-y divide-border/50">
            {filteredProjects.map((project) => (
              <ProjectListRow key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================================================================
   StageColumns — 4-column pipeline
   ====================================================================== */

function StageColumns({ stages }: { stages: Record<StageKey, GalleryProject[]> }) {
  const order: StageKey[] = ['demo', 'building', 'preProduction', 'live'];
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {order.map((key) => (
        <StageColumn key={key} stage={key} projects={stages[key]} />
      ))}
    </div>
  );
}

function StageColumn({ stage, projects }: { stage: StageKey; projects: GalleryProject[] }) {
  const config = STAGE_CONFIG[stage];
  const Icon = config.icon;

  return (
    <section className="flex min-h-[200px] flex-col rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Column header */}
      <header
        className={cn(
          'flex items-center gap-2.5 rounded-t-xl border-b border-border bg-muted/20 px-4 py-3',
          `ring-1 ring-inset ${config.ring}`
        )}
      >
        <span
          className={cn('flex h-8 w-8 items-center justify-center rounded-lg', config.bg)}
          aria-hidden
        >
          <Icon className={cn('h-4 w-4', config.accent)} />
        </span>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{config.title}</h2>
        <span
          className={cn(
            'ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
            config.bg,
            config.accent
          )}
        >
          {projects.length}
        </span>
      </header>

      {/* Column body */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {projects.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <span className={cn('mb-2 rounded-xl p-3', config.bg)} aria-hidden>
              <Icon className={cn('h-5 w-5', config.accent)} />
            </span>
            <p className="text-xs text-muted-foreground">
              No {config.title.toLowerCase()} projects
            </p>
          </div>
        ) : (
          projects.map((project) => <ProjectCardTile key={project.id} project={project} />)
        )}
      </div>
    </section>
  );
}
