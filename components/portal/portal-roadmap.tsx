'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PhaseCommentThread } from './phase-comment-thread';
import { getPhaseComments, getPhaseCommentCount } from '@/app/actions/phase-comments';
import { getProjectStatusColor } from '@/lib/portal-styles';

interface Project {
  id: string;
  name: string;
  project_status: string;
  description: string | null;
}

interface Phase {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  target_date: string | null;
  description: string | null;
  order_index: number;
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
  userRole: 'client' | 'admin' | 'employee';
  currentUserId: string;
}

function getStatusColor(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('complete') || normalized.includes('done')) {
    return {
      dot: 'bg-green-500',
      text: 'text-green-700 dark:text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
    };
  }
  if (normalized.includes('progress') || normalized.includes('active')) {
    return {
      dot: 'bg-yellow-500',
      text: 'text-yellow-700 dark:text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
    };
  }
  if (normalized.includes('skip')) {
    return {
      dot: 'bg-muted-foreground/30',
      text: 'text-muted-foreground',
      bg: 'bg-muted',
      border: 'border-border',
    };
  }
  // Default: not_started or pending
  return {
    dot: 'bg-muted-foreground/40',
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    border: 'border-border',
  };
}

function PhaseWithComments({
  phase,
  index,
  isLast,
  project,
  userRole,
  currentUserId,
}: {
  phase: Phase;
  index: number;
  isLast: boolean;
  project: Project;
  userRole: 'client' | 'admin' | 'employee';
  currentUserId: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const statusConfig = getStatusColor(phase.status);

  const canSeeInternal = userRole === 'admin' || userRole === 'employee';

  // Load comments when expanded
  useEffect(() => {
    async function loadComments() {
      if (!isExpanded) return;

      setIsLoading(true);
      const result = await getPhaseComments(
        project.id,
        phase.name,
        canSeeInternal // includeInternal
      );

      if (result.success && result.data) {
        setComments(result.data as CommentWithProfile[]);
      }
      setIsLoading(false);
    }

    loadComments();
  }, [isExpanded, project.id, phase.name, canSeeInternal]);

  // Load comment count on mount (uses head: true — no data transfer)
  useEffect(() => {
    async function loadCommentCount() {
      const result = await getPhaseCommentCount(project.id, phase.name, canSeeInternal);

      if (result.success && typeof result.data === 'number') {
        setCommentCount(result.data);
      }
    }

    loadCommentCount();
  }, [project.id, phase.name, canSeeInternal]);

  return (
    <div key={phase.id} className="relative flex gap-6">
      {/* Status Indicator */}
      <div className="relative z-10 flex shrink-0 flex-col items-center">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border-2 border-white',
            statusConfig.dot
          )}
        >
          <span className="text-xs font-semibold text-white">{index + 1}</span>
        </div>
      </div>

      {/* Phase Content */}
      <div className={cn('flex-1 pb-8', isLast && 'pb-0')}>
        <div
          className={cn(
            'rounded-lg border p-4 transition-shadow hover:shadow-md',
            statusConfig.border,
            statusConfig.bg
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground">{phase.name}</h3>
              {phase.description && (
                <p className="mt-2 text-sm text-muted-foreground">{phase.description}</p>
              )}
            </div>
            <Badge className={cn('shrink-0', statusConfig.text)}>
              {phase.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          {/* Dates */}
          {(phase.start_date || phase.target_date) && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              {phase.start_date && (
                <div className="flex items-center gap-1.5">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Started: {format(new Date(phase.start_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              {phase.target_date && (
                <div className="flex items-center gap-1.5">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <span>Target: {format(new Date(phase.target_date), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          )}

          {/* Comments Section */}
          <div className="mt-4 border-t border-border pt-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex w-full items-center justify-between text-sm font-medium text-foreground hover:text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-muted-foreground/80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Comments
                {commentCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {commentCount}
                  </Badge>
                )}
              </span>
              <svg
                className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isExpanded && (
              <div className="mt-4">
                {isLoading ? (
                  <div className="py-4 text-center text-sm text-muted-foreground/80">
                    Loading comments...
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
    </div>
  );
}

export function PortalRoadmap({ project, phases, userRole, currentUserId }: PortalRoadmapProps) {
  const hasPhases = phases && phases.length > 0;

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">Project Overview</h2>
          <Badge className={cn('shrink-0', getProjectStatusColor(project.project_status))}>
            {project.project_status}
          </Badge>
        </div>
        {project.description && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        )}
      </div>

      {/* Roadmap Timeline */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-6 text-xl font-semibold text-foreground">Project Roadmap</h2>

        {!hasPhases ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg
                  className="h-6 w-6 text-muted-foreground/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                No phases available yet. Your project manager will set up the roadmap soon.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative space-y-8">
            {/* Vertical connecting line */}
            <div className="absolute bottom-6 left-4 top-6 w-0.5 bg-muted" />

            {phases.map((phase, index) => {
              const isLast = index === phases.length - 1;

              return (
                <PhaseWithComments
                  key={phase.id}
                  phase={phase}
                  index={index}
                  isLast={isLast}
                  project={project}
                  userRole={userRole}
                  currentUserId={currentUserId}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
