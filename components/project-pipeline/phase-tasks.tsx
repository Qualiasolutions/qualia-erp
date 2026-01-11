'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Trash2, Calendar, Pencil, Check, X } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { createTask, updateTask, deleteTask } from '@/app/actions/inbox';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isPending, startTransition] = useTransition();
  const editInputRef = useRef<HTMLInputElement>(null);

  const completedCount = tasks.filter((t) => t.status === 'Done').length;
  const totalCount = tasks.length;

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTaskId]);

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
        setIsAdding(false);
        onTasksChange();
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
    });
  };

  const handleDelete = (taskId: string) => {
    startTransition(async () => {
      await deleteTask(taskId);
      onTasksChange();
    });
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const handleSaveEdit = () => {
    if (!editingTaskId || !editingTitle.trim()) {
      setEditingTaskId(null);
      return;
    }

    const formData = new FormData();
    formData.set('id', editingTaskId);
    formData.set('title', editingTitle.trim());

    startTransition(async () => {
      await updateTask(formData);
      setEditingTaskId(null);
      setEditingTitle('');
      onTasksChange();
    });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTitle('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTitle('');
    }
  };

  // Sort: incomplete first, then by sort_order
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'Done' && b.status !== 'Done') return 1;
    if (a.status !== 'Done' && b.status === 'Done') return -1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  if (compact && tasks.length === 0 && !isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
        Add task
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Tasks ({completedCount}/{totalCount})
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
      )}

      {/* Task List */}
      <AnimatePresence mode="popLayout">
        {sortedTasks.map((task) => {
          const isDone = task.status === 'Done';
          const isEditing = editingTaskId === task.id;

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className={cn(
                'group flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors',
                isDone ? 'opacity-60' : 'hover:bg-muted/50'
              )}
            >
              <Checkbox
                checked={isDone}
                onCheckedChange={() => handleToggle(task.id, task.status)}
                className="mt-0.5 h-4 w-4 rounded"
                disabled={isEditing}
              />

              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <Input
                      ref={editInputRef}
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      className="h-6 flex-1 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-green-600"
                      onClick={handleSaveEdit}
                      disabled={isPending}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p
                      className={cn(
                        'cursor-pointer text-xs font-medium hover:text-primary',
                        isDone && 'text-muted-foreground line-through'
                      )}
                      onClick={() => !isDone && handleStartEdit(task)}
                      title="Click to edit"
                    >
                      {task.title}
                    </p>

                    {/* Meta row */}
                    {(task.due_date || task.assignee) && (
                      <div className="mt-0.5 flex items-center gap-2">
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Calendar className="h-2.5 w-2.5" />
                            {formatDate(task.due_date)}
                          </span>
                        )}
                        {task.assignee && (
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={task.assignee.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px]">
                              {task.assignee.full_name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {!isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 shrink-0 p-0 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleStartEdit(task)}>
                      <Pencil className="mr-2 h-3 w-3" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggle(task.id, task.status)}>
                      <Check className="mr-2 h-3 w-3" />
                      {isDone ? 'Mark as Todo' : 'Mark as Done'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(task.id)}
                      className="text-red-500"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <Checkbox disabled className="h-4 w-4 rounded opacity-50" />
              <Input
                placeholder="Task name"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-7 flex-1 text-xs"
                autoFocus
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleAdd}
                disabled={isPending || !newTitle.trim()}
              >
                {isPending ? '...' : 'Add'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!compact && tasks.length === 0 && !isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full rounded-lg border border-dashed border-border/50 py-3 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
        >
          <Plus className="mx-auto mb-1 h-4 w-4" />
          Add first task
        </button>
      )}
    </div>
  );
}
