'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import { RichText } from '@/components/ui/rich-text';
import { useInView } from 'framer-motion';
import { m } from '@/lib/lazy-motion';
import { PhaseCommentThread } from './phase-comment-thread';
import { getPhaseComments, getAllPhaseCommentCounts } from '@/app/actions/phase-comments';
import { getProjectStatusColor } from '@/lib/portal-styles';
import { fadeInClasses, getStaggerDelay } from '@/lib/transitions';
import {
  CheckCircle2,
  Circle,
  MessageSquare,
  ChevronDown,
  Package,
  Clock,
  Loader2,
  Gauge,
  Layers,
  Compass,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  project_status: string;
  description: string | null;
}

interface PhaseItem {
  id: string;
  title: string;
  description: string | null;
  display_order: number | null;
  is_completed: boolean;
  completed_at: string | null;
  status: string | null;
}

interface Phase {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  target_date: string | null;
  description: string | null;
  order_index: number;
  items?: PhaseItem[];
}

interface CommentWithProfile {
  id: string;
  project_id: string;
  phase_name: string;
  task_key: string | null;
  commented_by: string;
  comment_text: string;
  is_internal: boolean | null;
  created_at: string | null;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

interface PortalRoadmapProps {
  project: Project;
  phases: Phase[];
  userRole: 'client' | 'admin';
  currentUserId: string;
  isLoading?: boolean;
  isValidating?: boolean;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function getPhaseStatusConfig(status: string) {
  const s = status.toLowerCase();
  if (s.includes('complete') || s.includes('done')) {
    return {
      dot: 'bg-emerald-500',
      ring: 'ring-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
      border: 'border-emerald-500/20',
      label: 'Completed',
      icon: CheckCircle2,
    };
  }
  if (s.includes('progress') || s.includes('active')) {
    return {
      dot: 'bg-amber-500',
      ring: 'ring-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-500/5 dark:bg-amber-500/10',
      border: 'border-amber-500/20',
      label: 'In Progress',
      icon: Clock,
    };
  }
  if (s.includes('skip')) {
    return {
      dot: 'bg-muted-foreground/30',
      ring: 'ring-muted-foreground/10',
      text: 'text-muted-foreground',
      bg: 'bg-muted/50',
      border: 'border-border',
      label: 'Skipped',
      icon: Circle,
    };
  }
  return {
    dot: 'bg-muted-foreground/30',
    ring: 'ring-muted-foreground/10',
    text: 'text-muted-foreground',
    bg: 'bg-card',
    border: 'border-border',
    label: 'Upcoming',
    icon: Circle,
  };
}

// ─── Deliverable item row ─────────────────────────────────────────────────────

function DeliverableItem({ item }: { item: PhaseItem }) {
  const isDone = item.is_completed || item.status === 'completed' || item.status === 'done';

  return (
    <div
      className={cn(
        'group -mx-2 flex items-start gap-3 rounded-md px-2 py-2 transition-colors duration-150',
        isDone && 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07]'
      )}
    >
      <div className="mt-0.5 shrink-0">
        {isDone ? (
          <CheckCircle2 className="size-4 text-emerald-500" />
        ) : (
          <Circle className="size-4 text-muted-foreground/30" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-medium leading-tight',
            isDone
              ? 'text-muted-foreground line-through decoration-muted-foreground/30'
              : 'text-foreground'
          )}
        >
          {item.title}
        </p>
        {item.description && (
          <RichText className="mt-0.5 text-muted-foreground [&_li]:text-xs [&_p]:text-xs">
            {item.description}
          </RichText>
        )}
      </div>
      {isDone && item.completed_at && (
        <span className="shrink-0 text-[10px] tabular-nums text-emerald-600/60 dark:text-emerald-400/50">
          {formatDate(item.completed_at)}
        </span>
      )}
    </div>
  );
}

// ─── Phase card ───────────────────────────────────────────────────────────────

function PhaseWithComments({
  phase,
  isLast,
  project,
  userRole,
  currentUserId,
  initialCommentCount = 0,
}: {
  phase: Phase;
  isLast: boolean;
  project: Project;
  userRole: 'client' | 'admin';
  currentUserId: string;
  initialCommentCount?: number;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const phaseRef = useRef(null);
  const isInView = useInView(phaseRef, { once: true, margin: '-80px' });
  const config = getPhaseStatusConfig(phase.status);
  const StatusIcon = config.icon;

  const canSeeInternal = userRole === 'admin';

  const items = phase.items || [];
  const completedItems = items.filter(
    (i) => i.is_completed || i.status === 'completed' || i.status === 'done'
  );
  const hasItems = items.length > 0;
  const progress = hasItems ? Math.round((completedItems.length / items.length) * 100) : 0;

  // Load comments when expanded
  useEffect(() => {
    if (!commentsOpen) return;
    let cancelled = false;

    async function load() {
      setIsLoadingComments(true);
      const result = await getPhaseComments(project.id, phase.name, canSeeInternal);
      if (!cancelled && result.success && result.data) {
        setComments(result.data as CommentWithProfile[]);
        // Update count from loaded data
        setCommentCount((result.data as CommentWithProfile[]).length);
      }
      if (!cancelled) setIsLoadingComments(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [commentsOpen, project.id, phase.name, canSeeInternal]);

  return (
    <m.div
      ref={phaseRef}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex gap-4 sm:gap-5"
    >
      {/* Timeline spine */}
      <div className="relative z-10 flex shrink-0 flex-col items-center">
        {/* Dot */}
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-full shadow-sm ring-4',
            config.dot,
            config.ring
          )}
        >
          <StatusIcon className="size-4 text-primary-foreground" strokeWidth={2.5} />
        </div>
        {/* Connecting line */}
        {!isLast && (
          <div className="mt-1 w-0.5 flex-1 bg-gradient-to-b from-border/50 to-transparent" />
        )}
      </div>

      {/* Card */}
      <div className={cn('flex-1', !isLast && 'pb-6')}>
        <div
          className={cn(
            'rounded-xl border p-4 shadow-sm transition-all duration-200 sm:p-5',
            config.border,
            config.bg,
            'hover:shadow-md'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold leading-snug text-foreground">
                {phase.name}
              </h3>
              {phase.description && (
                <RichText className="mt-1.5 text-muted-foreground [&_li]:text-[13px] [&_p]:text-[13px]">
                  {phase.description}
                </RichText>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
                config.text,
                config.border
              )}
            >
              {config.label}
            </Badge>
          </div>

          {/* Progress bar + deliverables */}
          {hasItems && (
            <div className="mt-4">
              {/* Mini progress bar */}
              <div className="mb-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      progress === 100
                        ? 'bg-emerald-500'
                        : progress > 0
                          ? 'bg-amber-500'
                          : 'bg-muted-foreground/20'
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {completedItems.length}/{items.length}
                </span>
              </div>

              {/* Deliverable items */}
              <div className="divide-y divide-border/30">
                {items.map((item) => (
                  <DeliverableItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          {(phase.start_date || phase.target_date) && (
            <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
              {phase.start_date && (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3" />
                  Started: {formatDate(phase.start_date)}
                </span>
              )}
              {phase.target_date && (
                <span className="flex items-center gap-1.5">
                  <Package className="size-3" />
                  Target: {formatDate(phase.target_date)}
                </span>
              )}
            </div>
          )}

          {/* Comments toggle */}
          <div className="mt-3 border-t border-border pt-3">
            <button
              onClick={() => setCommentsOpen(!commentsOpen)}
              className="flex w-full items-center justify-between rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="size-3.5" />
                <span className="text-xs font-medium">Comments</span>
                {commentCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {commentCount}
                  </Badge>
                )}
              </span>
              <ChevronDown
                className={cn(
                  'size-3.5 transition-transform duration-200',
                  commentsOpen && 'rotate-180'
                )}
              />
            </button>

            {commentsOpen && (
              <div className="mt-3">
                {isLoadingComments ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <PhaseCommentThread
                    projectId={project.id}
                    phaseName={phase.name}
                    initialComments={comments}
                    userRole={userRole}
                    currentUserId={currentUserId}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </m.div>
  );
}

// ─── Overall progress summary ─────────────────────────────────────────────────

function ProgressSummary({ phases }: { phases: Phase[] }) {
  const totalItems = phases.reduce((sum, p) => sum + (p.items?.length || 0), 0);
  const completedItems = phases.reduce(
    (sum, p) =>
      sum +
      (p.items || []).filter(
        (i) => i.is_completed || i.status === 'completed' || i.status === 'done'
      ).length,
    0
  );
  const completedPhases = phases.filter((p) => {
    const s = p.status.toLowerCase();
    return s.includes('complete') || s.includes('done');
  }).length;
  const activePhase = phases.find((p) => {
    const s = p.status.toLowerCase();
    return s.includes('progress') || s.includes('active');
  });

  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Overall progress */}
      <div className="col-span-2 rounded-xl border border-border bg-card p-4 sm:col-span-1">
        <div className="flex items-center gap-1.5">
          <Gauge className="size-3 text-muted-foreground/50" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Overall
          </p>
        </div>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {overallProgress}%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              overallProgress === 100
                ? 'bg-emerald-500'
                : overallProgress > 0
                  ? 'bg-gradient-to-r from-qualia-600 to-qualia-400'
                  : 'bg-muted-foreground/20'
            )}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Phases */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-1.5">
          <Layers className="size-3 text-muted-foreground/50" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Phases
          </p>
        </div>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-2xl font-bold tabular-nums text-foreground">{completedPhases}</span>
          <span className="mb-0.5 text-sm text-muted-foreground">/ {phases.length}</span>
        </div>
      </div>

      {/* Deliverables */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-1.5">
          <Package className="size-3 text-muted-foreground/50" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Deliverables
          </p>
        </div>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-2xl font-bold tabular-nums text-foreground">{completedItems}</span>
          <span className="mb-0.5 text-sm text-muted-foreground">/ {totalItems}</span>
        </div>
      </div>

      {/* Current phase */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-1.5">
          <Compass className="size-3 text-muted-foreground/50" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Current
          </p>
        </div>
        <p className="mt-2 truncate text-sm font-semibold text-foreground">
          {activePhase?.name?.replace(/^(Phase \d+|Milestone \d+):\s*/, '') || 'Not started'}
        </p>
      </div>
    </div>
  );
}

// ─── Main roadmap ─────────────────────────────────────────────────────────────

export function PortalRoadmap({
  project,
  phases,
  userRole,
  currentUserId,
  isLoading = false,
  isValidating = false,
}: PortalRoadmapProps) {
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const hasPhases = phases && phases.length > 0;

  // Batch-fetch all comment counts in one query (avoids N+1)
  useEffect(() => {
    if (!hasPhases || isLoading) return;
    let cancelled = false;

    async function loadCounts() {
      const result = await getAllPhaseCommentCounts(project.id, userRole === 'admin');
      if (!cancelled && result.success && result.data) {
        setCommentCounts(result.data as Record<string, number>);
      }
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [project.id, hasPhases, isLoading, userRole]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4">
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="mt-3 h-7 w-12 rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-5">
              <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 animate-pulse rounded-xl border border-border bg-card p-5">
                <div className="h-5 w-48 rounded bg-muted" />
                <div className="mt-3 h-4 w-full rounded bg-muted" />
                <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
                <div className="mt-4 space-y-2">
                  <div className="h-3.5 w-64 rounded bg-muted" />
                  <div className="h-3.5 w-56 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project overview */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-qualia-500/[0.03] p-5 dark:to-qualia-500/[0.05] sm:p-6">
        {isValidating && (
          <div className="absolute right-4 top-4">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Project Overview</h2>
          <Badge
            variant="outline"
            className={cn('shrink-0', getProjectStatusColor(project.project_status))}
          >
            {project.project_status}
          </Badge>
        </div>
        {project.description && (
          <RichText className="mt-2 text-muted-foreground">{project.description}</RichText>
        )}
      </div>

      {/* Progress summary cards */}
      {hasPhases && <ProgressSummary phases={phases} />}

      {/* Roadmap timeline */}
      <div>
        <h2 className="mb-5 text-lg font-semibold text-foreground">Development Roadmap</h2>

        {!hasPhases ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card">
            <div className="text-center">
              <Package className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                No phases available yet. Your project manager will set up the roadmap soon.
              </p>
            </div>
          </div>
        ) : (
          <div className={`relative ${fadeInClasses}`}>
            {phases.map((phase, index) => (
              <div
                key={phase.id}
                style={index < 4 ? getStaggerDelay(index) : undefined}
                className={index < 4 ? 'animate-fade-in-up fill-mode-both' : ''}
              >
                <PhaseWithComments
                  phase={phase}
                  isLast={index === phases.length - 1}
                  project={project}
                  userRole={userRole}
                  currentUserId={currentUserId}
                  initialCommentCount={commentCounts[phase.name] || 0}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
