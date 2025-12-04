'use client';

import { useState, useEffect, useCallback } from 'react';
import { getHubTasks, updateIssue, getWorkspaceMembers } from '@/app/actions';
import {
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
  Plus,
  XCircle,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { QuickTaskModal } from './quick-task-modal';
import { IssueDetailModal } from './issue-detail-modal';
import { KanbanBoard } from './kanban-board';
import { createPortal } from 'react-dom';

interface TasksPanelProps {
  workspaceId: string;
}

export type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  project: { id: string; name: string } | null;
  assignees: { id: string; full_name: string | null; avatar_url: string | null }[];
};

const STATUS_FILTERS = [
  { id: 'all', label: 'All', icon: ListTodo },
  { id: 'Todo', label: 'Todo', icon: Circle },
  { id: 'In Progress', label: 'Active', icon: Clock },
  { id: 'Done', label: 'Done', icon: CheckCircle2 },
] as const;

const STATUS_CONFIG: Record<string, { icon: typeof Circle; color: string }> = {
  'Yet to Start': { icon: Circle, color: 'text-muted-foreground' },
  Todo: { icon: Circle, color: 'text-blue-500' },
  'In Progress': { icon: Clock, color: 'text-amber-500' },
  Done: { icon: CheckCircle2, color: 'text-emerald-500' },
  Canceled: { icon: XCircle, color: 'text-red-500' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bgColor: string }> = {
  Urgent: { color: 'text-red-500', bgColor: 'bg-red-500/10' },
  High: { color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  Medium: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  Low: { color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  'No Priority': { color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

export function TasksPanel({ workspaceId }: TasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<
    { id: string; full_name: string | null; avatar_url: string | null }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    const statusFilter =
      activeFilter === 'all'
        ? undefined
        : activeFilter === 'Todo'
          ? ['Yet to Start', 'Todo']
          : [activeFilter];

    const [tasksData, membersData] = await Promise.all([
      getHubTasks(workspaceId, {
        status: statusFilter,
        limit: 50,
      }),
      getWorkspaceMembers(workspaceId),
    ]);

    setTasks(tasksData);
    setMembers(membersData);
    setIsLoading(false);
  }, [workspaceId, activeFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleTaskCreated = async () => {
    await loadTasks();
    setIsModalOpen(false);
  };

  const handleTaskMove = async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    const formData = new FormData();
    formData.append('id', taskId);
    formData.append('status', newStatus);

    const result = await updateIssue(formData);
    if (!result.success) {
      // Revert on failure
      await loadTasks();
      console.error('Failed to update task status:', result.error);
    }
  };

  const handleTaskAssign = async (taskId: string, assigneeId: string | null) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          if (assigneeId === null) {
            return { ...t, assignees: [] };
          }
          const member = members.find((m) => m.id === assigneeId);
          if (member) {
            return { ...t, assignees: [member] };
          }
        }
        return t;
      })
    );

    const formData = new FormData();
    formData.append('id', taskId);
    formData.append('assignee_id', assigneeId || '');

    const result = await updateIssue(formData);
    if (!result.success) {
      // Revert on failure
      await loadTasks();
      console.error('Failed to reassign task:', result.error);
    }
  };

  const content = (
    <div className={cn('flex h-full flex-col bg-card', isFullScreen ? 'fixed inset-0 z-50' : '')}>
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold">Tasks</h2>

          {/* View Toggles */}
          <div
            className="flex items-center rounded-lg bg-secondary p-0.5"
            role="group"
            aria-label="View options"
          >
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={cn(
                'rounded-md p-1.5 transition-all',
                viewMode === 'board'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="Board view"
              aria-pressed={viewMode === 'board'}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md p-1.5 transition-all',
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Filter Tabs (Only show in List view or if needed) */}
          {viewMode === 'list' && (
            <div className="ml-2 flex items-center gap-1">
              {STATUS_FILTERS.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    type="button"
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                      activeFilter === filter.id
                        ? 'bg-qualia-600/10 text-qualia-500'
                        : 'text-muted-foreground hover:bg-secondary/50'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 bg-qualia-600 text-xs hover:bg-qualia-500"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>
      </div>

      {/* Tasks List / Board */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 rounded-lg bg-secondary/50" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <ListTodo className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No tasks found</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => setIsModalOpen(true)}
            >
              Create your first task
            </Button>
          </div>
        ) : viewMode === 'board' ? (
          <KanbanBoard
            tasks={tasks}
            members={members}
            onTaskMove={handleTaskMove}
            onTaskAssign={handleTaskAssign}
            onTaskClick={(id) => {
              setSelectedTaskId(id);
              setIsDetailModalOpen(true);
            }}
          />
        ) : (
          <div className="h-full overflow-y-auto p-2">
            {tasks.map((task, index) => {
              const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG['Todo'];
              const priorityConfig =
                PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['No Priority'];
              const StatusIcon = statusConfig.icon;

              return (
                <button
                  type="button"
                  key={task.id}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setIsDetailModalOpen(true);
                  }}
                  className={cn(
                    'group flex w-full cursor-pointer items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-secondary/50',
                    'slide-in'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <StatusIcon className={cn('mt-0.5 h-4 w-4 flex-shrink-0', statusConfig.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium transition-colors group-hover:text-qualia-500">
                      {task.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {task.priority !== 'No Priority' && (
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-medium',
                            priorityConfig.bgColor,
                            priorityConfig.color
                          )}
                        >
                          {task.priority}
                        </span>
                      )}
                      {task.project && (
                        <span className="truncate text-[10px] text-muted-foreground">
                          {task.project.name}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(new Date(task.created_at))}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Task Modal */}
      <QuickTaskModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        workspaceId={workspaceId}
        onCreated={handleTaskCreated}
      />

      {/* Issue Detail Modal */}
      <IssueDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        issueId={selectedTaskId}
        workspaceId={workspaceId}
        onUpdate={handleTaskCreated}
      />
    </div>
  );

  if (isFullScreen) {
    if (typeof document === 'undefined') return null;
    return createPortal(content, document.body);
  }

  return content;
}
