'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PhaseCommentThread } from './phase-comment-thread';
import { getPhaseComments } from '@/app/actions/phase-comments';

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
      text: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
    };
  }
  if (normalized.includes('progress') || normalized.includes('active')) {
    return {
      dot: 'bg-yellow-500',
      text: 'text-yellow-700',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
    };
  }
  if (normalized.includes('skip')) {
    return {
      dot: 'bg-neutral-300',
      text: 'text-neutral-600',
      bg: 'bg-neutral-50',
      border: 'border-neutral-200',
    };
  }
  // Default: not_started or pending
  return {
    dot: 'bg-neutral-400',
    text: 'text-neutral-600',
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
  };
}

function getProjectStatusColor(status: string) {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Launched':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Demos':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Delayed':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Archived':
      return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    case 'Canceled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-neutral-100 text-neutral-800 border-neutral-200';
  }
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

  // Load comment count on mount
  useEffect(() => {
    async function loadCommentCount() {
      const result = await getPhaseComments(
        project.id,
        phase.name,
        canSeeInternal
      );

      if (result.success && result.data) {
        setCommentCount((result.data as CommentWithProfile[]).length);
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
              <h3 className="text-base font-semibold text-neutral-900">
                {phase.name}
              </h3>
              {phase.description && (
                <p className="mt-2 text-sm text-neutral-600">{phase.description}</p>
              )}
            </div>
            <Badge className={cn('shrink-0', statusConfig.text)}>
              {phase.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          {/* Dates */}
          {(phase.start_date || phase.target_date) && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-600">
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
          <div className="mt-4 border-t border-neutral-200 pt-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex w-full items-center justify-between text-sm font-medium text-neutral-900 hover:text-neutral-700"
            >
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-neutral-500"
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
                className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded && 'rotate-180'
                )}
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
                  <div className="py-4 text-center text-sm text-neutral-500">
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
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-neutral-900">Project Overview</h2>
          <Badge className={cn('shrink-0', getProjectStatusColor(project.project_status))}>
            {project.project_status}
          </Badge>
        </div>
        {project.description && (
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">{project.description}</p>
        )}
      </div>

      {/* Roadmap Timeline */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-6 text-xl font-semibold text-neutral-900">Project Roadmap</h2>

        {!hasPhases ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <svg
                  className="h-6 w-6 text-neutral-400"
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
              <p className="mt-4 text-sm text-neutral-600">
                No phases available yet. Your project manager will set up the roadmap soon.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative space-y-8">
            {/* Vertical connecting line */}
            <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-neutral-200" />

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
