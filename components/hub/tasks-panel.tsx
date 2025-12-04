'use client';

import { useState, useEffect } from 'react';
import { getHubTasks } from '@/app/actions';
import { CheckCircle2, Circle, Clock, ListTodo, Plus, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { QuickTaskModal } from './quick-task-modal';
import Link from 'next/link';

interface TasksPanelProps {
  workspaceId: string;
}

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  project: { id: string; name: string } | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadTasks() {
      setIsLoading(true);
      const statusFilter =
        activeFilter === 'all'
          ? undefined
          : activeFilter === 'Todo'
            ? ['Yet to Start', 'Todo']
            : [activeFilter];

      const data = await getHubTasks(workspaceId, {
        status: statusFilter,
        limit: 50,
      });
      setTasks(data);
      setIsLoading(false);
    }
    loadTasks();
  }, [workspaceId, activeFilter]);

  const handleTaskCreated = async () => {
    // Reload tasks after creation
    const statusFilter =
      activeFilter === 'all'
        ? undefined
        : activeFilter === 'Todo'
          ? ['Yet to Start', 'Todo']
          : [activeFilter];

    const data = await getHubTasks(workspaceId, {
      status: statusFilter,
      limit: 50,
    });
    setTasks(data);
    setIsModalOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Panel Header */}
      <div className="border-b border-border p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Tasks</h2>
          <Button
            size="sm"
            className="h-7 bg-qualia-600 text-xs hover:bg-qualia-500"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
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
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 rounded-lg bg-secondary/50" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
            <ListTodo className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No tasks found</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => setIsModalOpen(true)}
            >
              Create your first task
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {tasks.map((task, index) => {
              const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG['Todo'];
              const priorityConfig =
                PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['No Priority'];
              const StatusIcon = statusConfig.icon;

              return (
                <Link
                  key={task.id}
                  href={`/issues/${task.id}`}
                  className={cn(
                    'group flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-secondary/50',
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
                </Link>
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
    </div>
  );
}
