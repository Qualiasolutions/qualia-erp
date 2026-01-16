'use client';

import { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createTask, updateTask, deleteTask } from '@/app/actions/inbox';
import { checkPhaseProgress } from '@/app/actions/phases';
import { AnimatePresence } from 'framer-motion';
import { TaskItem } from './task-item';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  sort_order: number;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface PhaseTasksProps {
  phaseId: string;
  phaseName: string;
  projectId: string;
  workspaceId: string;
  tasks: Task[];
  onTasksChange: () => void;
  compact?: boolean;
}

export function PhaseTasks({
  phaseId,
  phaseName,
  projectId,
  workspaceId,
  tasks,
  onTasksChange,
  compact = false,
}: PhaseTasksProps) {
  const [newTitle, setNewTitle] = useState('');
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!newTitle.trim()) return;

    const formData = new FormData();
    formData.set('title', newTitle.trim());
    formData.set('project_id', projectId);
    formData.set('workspace_id', workspaceId);
    formData.set('phase_id', phaseId);
    formData.set('phase_name', phaseName);
    formData.set('status', 'Todo');
    formData.set('priority', 'No Priority');

    startTransition(async () => {
      const result = await createTask(formData);
      if (result.success) {
        setNewTitle('');
        onTasksChange();
        // Keep focus on input for rapid entry
        inputRef.current?.focus();
      }
    });
  };

  const handleToggle = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Done' ? 'Todo' : 'Done';

    const formData = new FormData();
    formData.set('id', taskId);
    formData.set('status', newStatus);

    startTransition(async () => {
      await updateTask(formData);
      onTasksChange();

      // Check for auto-progression when marking task as Done
      if (newStatus === 'Done') {
        await checkPhaseProgress(phaseId);
      }
    });
  };

  const handleUpdate = async (taskId: string, title: string) => {
    const formData = new FormData();
    formData.set('id', taskId);
    formData.set('title', title);

    await updateTask(formData);
    onTasksChange();
  };

  const handleDelete = (taskId: string) => {
    startTransition(async () => {
      await deleteTask(taskId);
      onTasksChange();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  // Sort: incomplete first, then by sort_order
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'Done' && b.status !== 'Done') return 1;
    if (a.status !== 'Done' && b.status === 'Done') return -1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  // Compact mode for dashboard widgets
  if (compact && tasks.length === 0) {
    return (
      <button
        onClick={() => inputRef.current?.focus()}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        Add task
      </button>
    );
  }

  return (
    <div className="space-y-1">
      {/* Always-visible quick-add input */}
      <div className="mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
            <Plus
              className={cn(
                'h-4 w-4 transition-colors',
                newTitle.trim() ? 'text-primary' : 'text-muted-foreground/50'
              )}
            />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add task... (press Enter)"
            disabled={isPending}
            className={cn(
              'h-8 flex-1 rounded-md border-0 bg-transparent px-0 text-sm font-medium',
              'placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-0',
              'border-b border-transparent focus:border-border/50',
              'disabled:opacity-50'
            )}
            autoFocus={tasks.length === 0}
          />
          {newTitle.trim() && (
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={isPending}>
              {isPending ? '...' : 'Add'}
            </Button>
          )}
        </div>
      </div>

      {/* Task List */}
      <AnimatePresence mode="popLayout">
        {sortedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={handleToggle}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            disabled={isPending}
          />
        ))}
      </AnimatePresence>

      {/* Empty state */}
      {!compact && tasks.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No tasks yet. Type above to add your first task.
        </p>
      )}
    </div>
  );
}
