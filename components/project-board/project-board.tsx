'use client';

import React, { useState, useMemo, useCallback, useTransition } from 'react';
import { ClipboardList, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectTasks, invalidateProjectTasks, invalidateInboxTasks } from '@/lib/swr';
import { updateTask } from '@/app/actions/inbox';
import { Skeleton } from '@/components/ui/skeleton';
import { KanbanBoard } from './kanban-board';
import { TableView } from './table-view';
import { ListView } from './list-view';
import { BoardViewSwitcher } from './board-view-switcher';
import type { BoardView, BoardTask, StatusColumnId } from './board-types';

// ---------------------------------------------------------------------------
// Helpers — map SWR task data to BoardTask shape
// ---------------------------------------------------------------------------

function toBoardTask(task: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignee?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  project_id: string | null;
  item_type: string;
  sort_order: number;
}): BoardTask {
  // Normalize FK array pattern (Supabase can return arrays for FK fields)
  const assignee = Array.isArray(task.assignee)
    ? (task.assignee[0] ?? null)
    : (task.assignee ?? null);

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as BoardTask['status'],
    priority: task.priority as BoardTask['priority'],
    due_date: task.due_date,
    assignee: assignee
      ? {
          id: assignee.id,
          full_name: assignee.full_name,
          email: assignee.email,
          avatar_url: assignee.avatar_url,
        }
      : null,
    project_id: task.project_id,
    item_type: task.item_type as BoardTask['item_type'],
    sort_order: task.sort_order,
  };
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex min-h-[200px] flex-1 flex-col rounded-lg border border-border bg-muted/20 p-4"
        >
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-5 w-5 rounded-full" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 + i }, (_, j) => (
              <Skeleton key={j} className="h-[72px] w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectBoard
// ---------------------------------------------------------------------------

interface ProjectBoardProps {
  projectId: string;
  userRole?: string;
}

export function ProjectBoard({ projectId }: ProjectBoardProps) {
  const { tasks: rawTasks, isLoading, isError, error, revalidate } = useProjectTasks(projectId);
  const [activeView, setActiveView] = useState<BoardView>('board');
  const [isPending, startTransition] = useTransition();

  // Filter out notes and resources; convert to BoardTask shape
  const boardTasks = useMemo(
    () =>
      rawTasks
        .filter((t: { item_type: string }) => t.item_type === 'task' || t.item_type === 'issue')
        .map(toBoardTask),
    [rawTasks]
  );

  const handleStatusChange = useCallback(
    (taskId: string, newStatus: StatusColumnId) => {
      startTransition(async () => {
        const formData = new FormData();
        formData.append('id', taskId);
        formData.append('status', newStatus);

        const result = await updateTask(formData);
        if (result.success) {
          invalidateProjectTasks(projectId, true);
          invalidateInboxTasks(true);
        } else {
          // Log error — the user will see the task snap back on revalidation
          console.error('Failed to update task status:', result.error);
        }
      });
    },
    [projectId]
  );

  // --- Error state ---
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/30" aria-hidden="true" />
        <p className="mt-3 text-base font-medium text-foreground">Failed to load tasks</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error?.message || 'Something went wrong. Please try again.'}
        </p>
        <button
          onClick={() => revalidate()}
          className={cn(
            'mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
            'cursor-pointer transition-colors duration-150 hover:bg-primary/90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
          )}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-[200px] rounded-lg" />
        </div>
        <BoardSkeleton />
      </div>
    );
  }

  // --- Empty state ---
  if (boardTasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <BoardViewSwitcher activeView={activeView} onViewChange={setActiveView} />
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30" aria-hidden="true" />
          <p className="mt-3 text-base font-medium text-foreground">No tasks yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tasks created for this project will appear here.
          </p>
        </div>
      </div>
    );
  }

  // --- Main render ---
  return (
    <div className={cn('space-y-4', isPending && 'pointer-events-none opacity-70')}>
      <div className="flex items-center justify-between">
        <BoardViewSwitcher activeView={activeView} onViewChange={setActiveView} />
      </div>

      {activeView === 'board' && (
        <KanbanBoard tasks={boardTasks} onStatusChange={handleStatusChange} />
      )}

      {activeView === 'table' && <TableView tasks={boardTasks} />}

      {activeView === 'list' && <ListView tasks={boardTasks} onStatusChange={handleStatusChange} />}
    </div>
  );
}
